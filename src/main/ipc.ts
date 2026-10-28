import { ipcMain, dialog, shell, type BrowserWindow } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Agent } from "../core/agent.js";
import { allProviders, catalogStats, defaultModelFor, getProvider, resolveModelRef } from "../core/catalog.js";
import { VERSION, hasApiKey, loadConfig, orinosHome, resolveApiKey, saveConfig } from "../core/config.js";
import { keyedProviderIds } from "../core/providers/index.js";
import {
  createSession,
  deleteSession,
  listSessions,
  loadSession,
  renameSession,
  saveSession,
} from "../core/sessions.js";
import { loadSkills, skillSummaries } from "../core/skills/index.js";
import type {
  AgentEvent,
  ApprovalRequest,
  AppConfig,
  Bootstrap,
  CommandOutput,
  ProviderInfo,
  Session,
} from "../core/types.js";
import type { SendMessageInput } from "../shared/ipc.js";
import { uid } from "../core/util.js";

interface State {
  win: BrowserWindow | null;
  agents: Map<string, Agent>;
  approvals: Map<string, { resolve: (approved: boolean) => void; timer: NodeJS.Timeout }>;
  commands: Map<string, ChildProcess>;
}

const state: State = {
  win: null,
  agents: new Map(),
  approvals: new Map(),
  commands: new Map(),
};

export function setWindow(win: BrowserWindow): void {
  state.win = win;
}

function send(channel: string, payload: unknown): void {
  if (state.win && !state.win.isDestroyed()) state.win.webContents.send(channel, payload);
}

/** Keep the bootstrap payload light: the picker does not need descriptions. */
function providersForUi(config: AppConfig): ProviderInfo[] {
  return allProviders(config).map((p) => ({
    ...p,
    models: p.models.map((m) => ({
      id: m.id,
      name: m.name,
      context: m.context,
      output: m.output,
      reasoning: m.reasoning,
      toolCall: m.toolCall,
      attachment: m.attachment,
      cost: m.cost,
      input: m.input,
    })),
  }));
}

function buildBootstrap(): Bootstrap {
  const config = loadConfig();
  const providers = providersForUi(config);
  const skills = loadSkills(config.workspace);
  const catalog = catalogStats();
  return {
    config,
    providers,
    providerCount: providers.length,
    modelCount: providers.reduce((sum, p) => sum + p.models.length, 0),
    keyedProviders: keyedProviderIds(config),
    sessions: listSessions(),
    skills: skillSummaries(skills),
    version: VERSION,
    platform: process.platform,
    home: orinosHome(),
    catalogGeneratedAt: catalog.generatedAt,
    catalogSource: catalog.source,
  };
}

function cleanConfigPatch(patch: Partial<AppConfig>): Partial<AppConfig> {
  const next: Partial<AppConfig> = { ...patch };
  delete (next as any).apiKeys;
  return next;
}

function addCustomProvider(input: {
  id?: string;
  name: string;
  api: string;
  kind?: string;
  keyEnv?: string;
  models?: string[];
}): Bootstrap {
  const config = loadConfig();
  const base = (input.id || input.name || "custom").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  let id = base || "custom";
  let counter = 2;
  while (config.customProviders.some((p) => p.id === id) && !input.id) {
    id = `${base}-${counter++}`;
  }
  const entry = {
    id,
    name: input.name.trim(),
    api: input.api.trim().replace(/\/+$/, ""),
    kind: (input.kind as any) || "openai",
    keyEnv: input.keyEnv?.trim() || undefined,
    models: (input.models || []).map((m) => m.trim()).filter(Boolean),
  };
  config.customProviders = [...config.customProviders.filter((p) => p.id !== id), entry];
  saveConfig({ customProviders: config.customProviders });
  return buildBootstrap();
}

export function registerIpc(): void {
  ipcMain.handle("orinos:bootstrap", () => buildBootstrap());

  ipcMain.handle("orinos:session:list", () => listSessions());

  ipcMain.handle("orinos:session:load", (_e, id: string) => loadSession(id));

  ipcMain.handle(
    "orinos:session:new",
    (_e, opts: { provider?: string; model?: string; workspace?: string } = {}) => {
      const config = loadConfig();
      const providerId = opts.provider || config.provider;
      const provider = getProvider(config, providerId);
      if (!provider) throw new Error(`Unknown provider "${providerId}"`);
      const model = opts.model || (providerId === config.provider ? config.model : defaultModelFor(provider));
      const session = createSession({
        provider: providerId,
        model,
        workspace: path.resolve(opts.workspace || config.workspace),
      });
      saveSession(session);
      return session;
    },
  );

  ipcMain.handle("orinos:session:delete", (_e, id: string) => {
    state.agents.get(id)?.abort();
    state.agents.delete(id);
    return deleteSession(id);
  });

  ipcMain.handle("orinos:session:rename", (_e, id: string, title: string) => renameSession(id, title));

  ipcMain.handle("orinos:chat:send", async (_e, input: SendMessageInput) => {
    const { sessionId } = input;
    let messageText = input.text;
    if (!messageText.trim()) return { ok: false, error: "Empty message." };
    if (state.agents.has(sessionId)) return { ok: false, error: "This session is already running." };

    let session = loadSession(sessionId);
    if (!session) return { ok: false, error: "Session not found." };
    const config = loadConfig();

    if (input.provider || input.model) {
      try {
        const resolved = resolveModelRef(config, input.provider || session.provider, input.model || session.model);
        session.provider = resolved.providerId;
        session.model = resolved.modelId;
        saveSession(session);
        saveConfig({ provider: resolved.providerId, model: resolved.modelId });
      } catch (err: any) {
        return { ok: false, error: err.message };
      }
    }

    if (input.attachments?.length) {
      const attachmentText = input.attachments
        .map((file) => {
          try {
            const stat = fs.statSync(file);
            if (!stat.isFile() || stat.size > 300_000) return `[attachment: ${file} — skipped]`;
            return `--- Attached file: ${file} ---\n${fs.readFileSync(file, "utf8")}`;
          } catch {
            return `[attachment: ${file} — could not read]`;
          }
        })
        .join("\n\n");
      messageText = `${messageText}\n\n${attachmentText}`;
    }

    const agent = new Agent({
      config,
      session,
      providerId: session.provider,
      modelId: session.model,
      onEvent: (event: AgentEvent) => {
        send("orinos:event", { sessionId, event });
      },
      onApproval: (request: ApprovalRequest) => {
        if (!state.win || state.win.isDestroyed()) return Promise.resolve(false);
        return new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => {
            state.approvals.delete(request.id);
            resolve(false);
          }, 120_000);
          state.approvals.set(request.id, { resolve, timer });
          send("orinos:approval", { request });
        });
      },
    });

    state.agents.set(sessionId, agent);
    void agent
      .send(messageText)
      .catch((err: any) => {
        send("orinos:event", {
          sessionId,
          event: { type: "error", message: err?.message || String(err) },
        });
        send("orinos:event", {
          sessionId,
          event: { type: "done", message: null, session },
        });
      })
      .finally(() => {
        state.agents.delete(sessionId);
      });

    return { ok: true };
  });

  ipcMain.handle("orinos:chat:abort", (_e, sessionId: string) => {
    state.agents.get(sessionId)?.abort();
  });

  ipcMain.handle("orinos:config:get", () => loadConfig());

  ipcMain.handle("orinos:config:set", (_e, patch: Partial<AppConfig>) => saveConfig(cleanConfigPatch(patch)));

  ipcMain.handle("orinos:auth:set", (_e, providerId: string, key: string) => {
    const config = loadConfig();
    if (!key.trim()) throw new Error("Empty key.");
    config.apiKeys[providerId] = key.trim();
    saveConfig({ apiKeys: config.apiKeys });
    return { keyed: keyedProviderIds(loadConfig()) };
  });

  ipcMain.handle("orinos:auth:remove", (_e, providerId: string) => {
    const config = loadConfig();
    delete config.apiKeys[providerId];
    saveConfig({ apiKeys: config.apiKeys });
    return { keyed: keyedProviderIds(loadConfig()) };
  });

  ipcMain.handle("orinos:provider:add", (_e, input: any) => addCustomProvider(input));

  ipcMain.handle("orinos:provider:remove", (_e, id: string) => {
    const config = loadConfig();
    config.customProviders = config.customProviders.filter((p) => p.id !== id);
    saveConfig({ customProviders: config.customProviders });
    return buildBootstrap();
  });

  ipcMain.handle("orinos:skills:list", () => {
    const config = loadConfig();
    return skillSummaries(loadSkills(config.workspace));
  });

  ipcMain.handle("orinos:skills:get", (_e, name: string) => {
    const config = loadConfig();
    return loadSkills(config.workspace).find((s) => s.name === name || s.id === name) || null;
  });

  ipcMain.handle("orinos:approval:respond", (_e, id: string, approved: boolean) => {
    const entry = state.approvals.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    state.approvals.delete(id);
    entry.resolve(Boolean(approved));
  });

  ipcMain.handle("orinos:command:run", (_e, input: { runId: string; command: string; cwd?: string }) => {
    const config = loadConfig();
    const cwd = input.cwd || config.workspace;
    const isWin = process.platform === "win32";
    const child = spawn(
      isWin ? process.env.COMSPEC || "cmd.exe" : process.env.SHELL || "/bin/sh",
      isWin ? ["/d", "/s", "/c", input.command] : ["-lc", input.command],
      { cwd, env: { ...process.env, TERM: "dumb" }, stdio: ["ignore", "pipe", "pipe"] },
    );
    state.commands.set(input.runId, child);
    const push = (payload: CommandOutput) => send("orinos:command", payload);
    child.stdout.on("data", (chunk: Buffer) =>
      push({ runId: input.runId, stream: "stdout", data: chunk.toString("utf8") }),
    );
    child.stderr.on("data", (chunk: Buffer) =>
      push({ runId: input.runId, stream: "stderr", data: chunk.toString("utf8") }),
    );
    child.on("error", (err) =>
      push({ runId: input.runId, stream: "stderr", data: `${err.message}\n` }),
    );
    child.on("close", (code) => {
      state.commands.delete(input.runId);
      push({ runId: input.runId, stream: "exit", data: "", code: code ?? -1 });
    });
    return { ok: true };
  });

  ipcMain.handle("orinos:command:kill", (_e, runId: string) => {
    const child = state.commands.get(runId);
    if (child) child.kill("SIGTERM");
  });

  ipcMain.handle("orinos:dialog:files", async () => {
    if (!state.win) return [];
    const result = await dialog.showOpenDialog(state.win, {
      properties: ["openFile", "multiSelections"],
      title: "Attach files",
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle("orinos:dialog:directory", async () => {
    if (!state.win) return null;
    const result = await dialog.showOpenDialog(state.win, {
      properties: ["openDirectory", "createDirectory"],
      title: "Choose workspace",
    });
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
  });

  ipcMain.handle("orinos:open-external", async (_e, url: string) => {
    if (/^https?:\/\//i.test(url)) await shell.openExternal(url);
  });
}

export function cleanupSessions(): void {
  for (const agent of state.agents.values()) agent.abort();
  for (const { resolve, timer } of state.approvals.values()) {
    clearTimeout(timer);
    resolve(false);
  }
  state.approvals.clear();
}

export function resolveHome(): string {
  return path.join(os.homedir(), ".orinos");
}
