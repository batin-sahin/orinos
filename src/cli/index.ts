#!/usr/bin/env node
import { Command } from "commander";
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Agent, formatUsage } from "../core/agent.js";
import {
  allProviders,
  catalogStats,
  defaultModelFor,
  getProvider,
  resolveModelRef,
} from "../core/catalog.js";
import {
  VERSION,
  configPath,
  hasApiKey,
  loadConfig,
  orinosHome,
  resolveApiKey,
  saveConfig,
} from "../core/config.js";
import { keyedProviderIds } from "../core/providers/index.js";
import { createSession, deleteSession, listSessions, loadSession, renameSession, saveSession } from "../core/sessions.js";
import { loadSkills } from "../core/skills/index.js";
import type { AgentEvent, AppConfig, ApprovalRequest, ProviderInfo, Session } from "../core/types.js";
import { formatTokens, oneLine, uid } from "../core/util.js";
import { banner, c, NO_COLOR, UI, ask } from "./ui.js";

const ui = new UI();
let activeAgent: Agent | null = null;
let exitRequested = false;

function fail(message: string): never {
  ui.error(message);
  process.exit(1);
}

function parseModelRef(config: AppConfig, ref: string): { providerId: string; modelId: string } {
  const providers = allProviders(config);
  const match = providers
    .filter((p) => ref.startsWith(`${p.id}/`))
    .sort((a, b) => b.id.length - a.id.length)[0];
  if (match) return { providerId: match.id, modelId: ref.slice(match.id.length + 1) };
  return { providerId: config.provider, modelId: ref };
}

function masked(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function providerLine(p: ProviderInfo, config: AppConfig): string {
  const keyed = hasApiKey(p, config);
  const dot = keyed ? `${c.green}●${c.reset}` : `${c.faint}○${c.reset}`;
  const endpoint = p.api ? new URL(p.api).host : `${c.red}no endpoint${c.reset}`;
  const env = p.keyEnv || p.env[0] || "—";
  return `${dot} ${p.id.padEnd(24)} ${c.gray}${p.name.slice(0, 26).padEnd(28)}${c.reset}${c.faint}${String(p.models.length).padStart(5)} models  ${env}${c.reset}${keyed ? "" : `  ${c.faint}${endpoint}${c.reset}`}`;
}

function printProviders(config: AppConfig, query: string | undefined, keyedOnly: boolean): void {
  const q = (query || "").toLowerCase();
  let providers = allProviders(config).filter(
    (p) => !q || p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
  );
  if (keyedOnly) providers = providers.filter((p) => hasApiKey(p, config));
  const keyed = providers.filter((p) => hasApiKey(p, config));
  const rest = providers.filter((p) => !hasApiKey(p, config));
  const ordered = [...keyed, ...rest];

  ui.write(
    `\n${c.bold}Providers${c.reset} ${c.faint}${ordered.length} shown · ${keyed.length} with credentials${c.reset}\n`,
  );
  ui.write(`${c.faint}${"  id".padEnd(26)}${"name".padEnd(28)}${"models".padStart(10)}  key env${c.reset}\n`);
  for (const p of ordered.slice(0, 300)) ui.write(`${providerLine(p, config)}\n`);
  ui.write(
    `\n${c.faint}Add a key:${c.reset} orinos auth set <provider> <key>  ${c.faint}·  env vars are detected automatically${c.reset}\n`,
  );
}

function printModels(
  config: AppConfig,
  providerId: string | undefined,
  query: string | undefined,
  limit = 40,
): void {
  const q = (query || "").toLowerCase();
  const pid = providerId || config.provider;
  const provider = getProvider(config, pid);
  if (!provider && pid !== "all") return fail(`Unknown provider "${pid}".`);
  const providers = pid === "all" ? allProviders(config) : [provider!];
  let total = 0;
  ui.write(`\n${c.bold}Models${c.reset} ${c.faint}${q ? `matching “${q}”` : ""}${c.reset}\n`);
  for (const p of providers) {
    const models = p.models
      .filter((m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      .slice(0, limit);
    if (!models.length) continue;
    total += models.length;
    ui.write(
      `\n  ${c.violet}${p.name}${c.reset} ${c.faint}${p.id}${hasApiKey(p, config) ? ` ${c.green}●${c.reset}` : ""}${c.reset}\n`,
    );
    for (const m of models) {
      const ctx = m.context ? formatTokens(m.context).padStart(6) : "     —";
      const caps = [m.toolCall ? "tools" : "", m.reasoning ? "reason" : "", m.attachment ? "files" : ""]
        .filter(Boolean)
        .join(",");
      ui.write(
        `  ${c.gray}${m.id.padEnd(38)}${c.reset}${c.faint}${ctx}  ${caps.padEnd(22)}${c.reset}${c.faint}${m.name}${c.reset}\n`,
      );
    }
    if (p.models.length > models.length) {
      ui.write(`  ${c.faint}… ${p.models.length - models.length} more (use --limit)${c.reset}\n`);
    }
  }
  ui.write(`\n${c.faint}${total} models shown. Use provider/model: orinos run -p openai -m gpt-4.1-mini "…"${c.reset}\n`);
}

function parseKeyValue(patch: Record<string, unknown>, key: string, value: string): void {
  if (key === "autoApprove") patch.autoApprove = value === "true" || value === "on" || value === "1";
  else if (key === "temperature") patch.temperature = Number(value);
  else if (key === "maxSteps") patch.maxSteps = Number(value);
  else patch[key] = value;
}

function splitModelTarget(config: AppConfig, ref: string): { providerId: string; modelId: string } {
  return parseModelRef(config, ref);
}

function makeAgent(
  config: AppConfig,
  session: Session,
  onEvent: (event: AgentEvent) => void,
  onApproval?: (request: ApprovalRequest) => Promise<boolean>,
): Agent {
  return new Agent({ config, session, onEvent, onApproval });
}

function installAbort(): void {
  process.on("SIGINT", () => {
    if (activeAgent?.isRunning) {
      activeAgent.abort();
      ui.info("Stopping…");
    } else if (process.stdin.isTTY) {
      process.stdout.write("\n");
      process.exit(0);
    }
  });
}

async function runOneShot(prompt: string, opts: Record<string, any>): Promise<void> {
  const config = loadConfig();
  if (opts.workspace) config.workspace = path.resolve(opts.workspace);
  const providerId = opts.provider || config.provider;
  const provider = getProvider(config, providerId);
  if (!provider) fail(`Unknown provider "${providerId}".`);
  const modelId =
    opts.model ||
    (providerId === config.provider ? config.model : defaultModelFor(provider!));
  if (opts.yes) config.autoApprove = true;

  let session: Session;
  if (opts.session) {
    const existing = loadSession(opts.session);
    if (!existing) fail(`Session "${opts.session}" not found.`);
    session = existing!;
  } else {
    session = createSession({ provider: providerId, model: modelId, workspace: config.workspace });
  }

  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  let streamedText = false;

  const agent = makeAgent(
    config,
    session,
    (event) => {
      if (event.type === "text" && !opts.json) {
        streamedText = true;
        ui.stream(event.text);
      } else if (event.type === "tool_start" && !opts.json) {
        ui.toolStart(event.name, event.summary);
      } else if (event.type === "tool_end" && !opts.json) {
        ui.toolEnd(event.name, event.ok, event.output, event.durationMs);
      } else if (event.type === "assistant" && !opts.json) {
        if (!streamedText && event.message.content) ui.stream(event.message.content);
        streamedText = false;
        ui.newline();
      } else if (event.type === "error") {
        if (opts.json) process.stderr.write(`${event.message}\n`);
        else ui.error(event.message);
      } else if (event.type === "status" && !opts.json) {
        ui.status(event.text);
      }
    },
    async (request) => {
      if (!interactive) return false;
      ui.status("");
      ui.newline();
      const answer = await new Promise<string>((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(
          `${c.yellow}?${c.reset} Allow ${c.bold}${request.tool}${c.reset} ${c.gray}${oneLine(request.summary, 120)}${c.reset} ${c.faint}[y/N]${c.reset} `,
          (value) => {
            rl.close();
            resolve(value);
          },
        );
      });
      return /^y(es)?$/i.test(answer.trim());
    },
  );

  activeAgent = agent;
  try {
    await agent.send(prompt);
  } finally {
    activeAgent = null;
  }

  if (opts.json) {
    const lastAssistant = [...session.messages].reverse().find((m) => m.role === "assistant" && m.content);
    process.stdout.write(
      `${JSON.stringify(
        {
          sessionId: session.id,
          text: lastAssistant?.content || "",
          provider: session.provider,
          model: session.model,
          usage: session.usage,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    ui.newline();
    ui.usage(formatUsage(session.usage));
  }
}

async function repl(): Promise<void> {
  let config = loadConfig();
  let workspace = config.workspace;
  if (!fs.existsSync(workspace)) workspace = process.cwd();
  let session = createSession({ provider: config.provider, model: config.model, workspace });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 300,
    terminal: true,
  });

  const queue: string[] = [];
  let resolveLine: ((line: string | null) => void) | null = null;
  rl.on("line", (line) => {
    const waiter = resolveLine;
    resolveLine = null;
    if (waiter) waiter(line);
    else queue.push(line);
  });
  rl.on("close", () => {
    exitRequested = true;
    const waiter = resolveLine;
    resolveLine = null;
    if (waiter) waiter(null);
  });
  rl.on("SIGINT", () => {
    if (activeAgent?.isRunning) {
      activeAgent.abort();
      ui.info("Stopping…");
    } else {
      rl.close();
    }
  });

  function pump(): Promise<string | null> {
    if (queue.length) return Promise.resolve(queue.shift()!);
    return new Promise((resolve) => {
      resolveLine = resolve;
    });
  }

  function readLine(prompt: string | null): Promise<string | null> {
    if (prompt !== null) {
      rl.setPrompt(prompt);
      rl.prompt();
    }
    return pump();
  }

  installAbort();

  const provider = getProvider(config, session.provider);
  if (!NO_COLOR) console.clear();
  ui.write(banner());
  ui.write(
    `  ${c.violet}${provider?.name || session.provider}${c.reset} ${c.faint}/${c.reset} ${c.white}${session.model}${c.reset}   ${c.faint}${workspace}${c.reset}\n`,
  );
  if (!provider || !hasApiKey(provider, config)) {
    ui.write(
      `  ${c.yellow}No API key detected.${c.reset} ${c.gray}Add one with${c.reset} ${c.cyan}orinos auth set ${session.provider}${c.reset}${c.gray}, or set ${provider?.env[0] || "an API key env var"}.${c.reset}\n`,
    );
  }
  ui.write(
    `  ${c.faint}/help${c.reset} ${c.faint}commands ·${c.reset} ${c.faint}/model${c.reset} ${c.faint}switch model ·${c.reset} ${c.faint}/exit${c.reset} ${c.faint}quit${c.reset}\n`,
  );

  async function askApproval(request: ApprovalRequest): Promise<boolean> {
    ui.status("");
    ui.newline();
    const answer = await readLine(
      `${c.yellow}?${c.reset} Allow ${c.bold}${request.tool}${c.reset} ${c.gray}${oneLine(request.summary, 110)}${c.reset} ${c.faint}[y/N]${c.reset} `,
    );
    return /^y(es)?$/i.test((answer || "").trim());
  }

  async function handleTurn(text: string): Promise<void> {
    const currentProvider = getProvider(config, session.provider);
    if (!currentProvider) {
      ui.error(`Unknown provider "${session.provider}".`);
      return;
    }
    if (!hasApiKey(currentProvider, config) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(currentProvider.api || "")) {
      ui.error(
        `No API key for ${currentProvider.name}. Run: orinos auth set ${currentProvider.id}   (or export ${currentProvider.env[0] || "API_KEY"})`,
      );
      return;
    }

    let streamed = false;
    let lastUsage = session.usage;
    const agent = makeAgent(
      config,
      session,
      (event) => {
        if (event.type === "status") {
          if (event.text) ui.status(event.text);
          else ui.status("");
        } else if (event.type === "assistant_start") {
          ui.status("");
          streamed = false;
        } else if (event.type === "text") {
          streamed = true;
          ui.stream(event.text);
        } else if (event.type === "tool_start") {
          ui.toolStart(event.name, event.summary);
          streamed = false;
        } else if (event.type === "tool_end") {
          ui.toolEnd(event.name, event.ok, event.output, event.durationMs);
          streamed = false;
        } else if (event.type === "assistant") {
          if (!streamed && event.message.content) ui.stream(event.message.content);
          streamed = false;
          ui.newline();
        } else if (event.type === "usage") {
          lastUsage = event.usage;
        } else if (event.type === "error") {
          ui.error(event.message);
        }
      },
      askApproval,
    );
    activeAgent = agent;
    try {
      await agent.send(text);
    } catch (err: any) {
      ui.error(err?.message || String(err));
    } finally {
      activeAgent = null;
      ui.status("");
      ui.newline();
      ui.usage(formatUsage(lastUsage));
      session = loadSession(session.id) || session;
    }
  }

  async function handleSlash(input: string): Promise<boolean> {
    const [command, ...rest] = input.slice(1).trim().split(/\s+/);
    const arg = rest.join(" ");
    switch ((command || "").toLowerCase()) {
      case "help":
      case "?": {
        ui.write(`
${c.bold}Commands${c.reset}
  ${c.cyan}/model${c.reset} [provider/model]   show or switch model
  ${c.cyan}/models${c.reset} [query]           browse models for this provider
  ${c.cyan}/provider${c.reset} <id>            switch provider
  ${c.cyan}/providers${c.reset} [query]        browse providers
  ${c.cyan}/new${c.reset}                      start a new chat
  ${c.cyan}/sessions${c.reset}                 recent sessions
  ${c.cyan}/resume${c.reset} <index|id>        load a session
  ${c.cyan}/title${c.reset} <text>             rename this session
  ${c.cyan}/skills${c.reset}                   list skills
  ${c.cyan}/skill${c.reset} <name>             read a skill
  ${c.cyan}/workspace${c.reset} [path]         show or change workspace
  ${c.cyan}/auto${c.reset} [on|off]            auto-approve risky tools
  ${c.cyan}/config${c.reset}                   show config
  ${c.cyan}/clear${c.reset}                    clear the screen
  ${c.cyan}/exit${c.reset}                     quit
`);
        return false;
      }
      case "exit":
      case "quit":
        return true;
      case "clear":
        console.clear();
        return false;
      case "model": {
        if (!arg) {
          const p = getProvider(config, session.provider);
          if (!p) return false;
          printModels(config, p.id, undefined, 25);
          ui.write(`${c.faint}Current:${c.reset} ${c.cyan}${session.provider}/${session.model}${c.reset}\n`);
          return false;
        }
        try {
          const target = splitModelTarget(config, arg);
          const provider = getProvider(config, target.providerId);
          if (!provider) {
            ui.error(`Unknown provider "${target.providerId}".`);
            return false;
          }
          session.provider = target.providerId;
          session.model = target.modelId;
          saveSession(session);
          config = saveConfig({ provider: target.providerId, model: target.modelId });
          ui.info(`Model → ${target.providerId}/${target.modelId}`);
        } catch (err: any) {
          ui.error(err.message);
        }
        return false;
      }
      case "models":
        printModels(config, session.provider, arg || undefined);
        return false;
      case "provider": {
        if (!arg) {
          printProviders(config, undefined, false);
          return false;
        }
        const p = getProvider(config, arg.trim());
        if (!p) {
          ui.error(`Unknown provider "${arg.trim()}".`);
          return false;
        }
        session.provider = p.id;
        session.model = defaultModelFor(p);
        saveSession(session);
        config = saveConfig({ provider: p.id, model: session.model });
        ui.info(`Provider → ${p.name} (${session.model})`);
        return false;
      }
      case "providers":
        printProviders(config, arg || undefined, false);
        return false;
      case "new": {
        session = createSession({ provider: session.provider, model: session.model, workspace });
        ui.info("New chat.");
        return false;
      }
      case "sessions": {
        const sessions = listSessions().slice(0, 15);
        if (!sessions.length) {
          ui.info("No saved sessions.");
          return false;
        }
        ui.write(`\n${c.bold}Sessions${c.reset}\n`);
        sessions.forEach((s, i) => {
          const when = new Date(s.updatedAt).toLocaleString();
          ui.write(
            `  ${c.violet}${String(i + 1).padStart(2)}${c.reset} ${s.title.slice(0, 56).padEnd(58)} ${c.faint}${s.provider}/${s.model} · ${when}${c.reset}\n`,
          );
        });
        ui.write(`\n${c.faint}Resume: /resume <index|id>${c.reset}\n`);
        return false;
      }
      case "resume": {
        if (!arg) {
          ui.error("Usage: /resume <index|id>");
          return false;
        }
        const sessions = listSessions();
        const index = Number(arg) - 1;
        const target = Number.isInteger(index) && index >= 0 ? sessions[index] : sessions.find((s) => s.id === arg);
        if (!target) {
          ui.error("Session not found.");
          return false;
        }
        const loaded = loadSession(target.id);
        if (!loaded) {
          ui.error("Session file is corrupt.");
          return false;
        }
        session = loaded;
        config = saveConfig({ provider: session.provider, model: session.model });
        ui.info(`Resumed “${session.title}” (${session.messages.length} messages).`);
        return false;
      }
      case "title": {
        if (!arg) {
          ui.error("Usage: /title <text>");
          return false;
        }
        session.title = arg.slice(0, 120);
        saveSession(session);
        ui.info("Renamed.");
        return false;
      }
      case "skills": {
        const skills = loadSkills(workspace);
        ui.write(`\n${c.bold}Skills${c.reset} ${c.faint}${skills.length}${c.reset}\n`);
        for (const s of skills) {
          ui.write(
            `  ${c.violet}${s.name.padEnd(20)}${c.reset}${c.gray}${s.description}${c.reset} ${c.faint}[${s.source}]${c.reset}\n`,
          );
        }
        ui.write(`\n${c.faint}Read one: /skill <name>${c.reset}\n`);
        return false;
      }
      case "skill": {
        if (!arg) return false;
        const skills = loadSkills(workspace);
        const skill = skills.find((s) => s.name.toLowerCase() === arg.toLowerCase());
        if (!skill) {
          ui.error(`Skill "${arg}" not found.`);
          return false;
        }
        ui.write(`\n${c.bold}${skill.name}${c.reset} ${c.faint}[${skill.source}]${c.reset}\n\n${skill.content}\n`);
        return false;
      }
      case "workspace": {
        if (!arg) {
          ui.info(session.workspace);
          return false;
        }
        const target = path.resolve(arg.replace(/^~(?=$|\/)/, os.homedir()));
        if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
          ui.error(`Not a directory: ${target}`);
          return false;
        }
        workspace = target;
        session.workspace = target;
        saveSession(session);
        config = saveConfig({ workspace: target });
        ui.info(`Workspace → ${target}`);
        return false;
      }
      case "auto": {
        const value = !arg ? !config.autoApprove : /^(on|true|yes|1)$/i.test(arg);
        config = saveConfig({ autoApprove: value });
        ui.info(`Auto-approve → ${value ? "on" : "off"}`);
        return false;
      }
      case "config": {
        const safe = { ...config, apiKeys: Object.fromEntries(Object.keys(config.apiKeys).map((k) => [k, "•••"])) };
        ui.write(`\n${c.faint}${configPath()}${c.reset}\n${JSON.stringify(safe, null, 2)}\n`);
        return false;
      }
      case "auth":
        ui.info("Run from the shell: orinos auth set <provider> <key>");
        return false;
      default:
        ui.error(`Unknown command /${command}. Try /help.`);
        return false;
    }
  }

  const prompt = (): string => `\n${c.violet}❯${c.reset} `;

  while (!exitRequested) {
    const line = await readLine(prompt());
    if (line === null) break;
    const text = line.trim();
    if (!text) continue;
    if (text.startsWith("/")) {
      const shouldExit = await handleSlash(text);
      if (shouldExit) break;
    } else {
      await handleTurn(text);
    }
  }

  rl.close();
  ui.info("Bye.");
}

function authCommand(program: Command): void {
  const auth = program.command("auth").description("manage provider API keys");
  auth
    .command("list")
    .description("show which providers have credentials")
    .action(() => {
      const config = loadConfig();
      const keyed = allProviders(config).filter((p) => hasApiKey(p, config));
      if (!keyed.length) {
        ui.info("No credentials configured. Add one with: orinos auth set <provider>");
        return;
      }
      ui.write(`\n${c.bold}Configured providers${c.reset}\n`);
      for (const p of keyed) {
        const key = resolveApiKey(p, config);
        const source = config.apiKeys[p.id] ? "config" : p.env.find((e) => process.env[e]) || "env";
        ui.write(`  ${c.green}●${c.reset} ${p.id.padEnd(24)} ${c.faint}${masked(key)}  (${source})${c.reset}\n`);
      }
    });

  auth
    .command("set <provider> [key]")
    .description("store an API key for a provider")
    .action(async (providerId: string, key?: string) => {
      const config = loadConfig();
      const provider = allProviders(config).find((p) => p.id === providerId);
      if (!provider) fail(`Unknown provider "${providerId}".`);
      let value = key;
      if (!value) {
        if (!process.stdin.isTTY) fail("No key provided.");
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        (rl as any)._writeToOutput = () => {};
        process.stdout.write(`API key for ${provider!.name}: `);
        value = await ask(rl, "");
        rl.close();
        process.stdout.write("\n");
      }
      if (!value || !value.trim()) fail("Empty key.");
      config.apiKeys[providerId] = value.trim();
      saveConfig({ apiKeys: config.apiKeys });
      ui.info(`Stored key for ${provider!.name} (${masked(value.trim())}).`);
      if (!provider!.api) {
        ui.warn("This provider has no API endpoint in the catalog; add it as a custom provider with a base URL.");
      }
    });

  auth
    .command("remove <provider>")
    .description("remove a stored API key")
    .action((providerId: string) => {
      const config = loadConfig();
      delete config.apiKeys[providerId];
      saveConfig({ apiKeys: config.apiKeys });
      ui.info(`Removed stored key for ${providerId}. Env vars are unaffected.`);
    });
}

function main(): void {
  const program = new Command();
  program
    .name("orinos")
    .description("Orinos — AI agent harness with tools, skills and 200+ providers")
    .version(VERSION, "-v, --version", "print version")
    .helpOption("-h, --help", "print help");

  program
    .command("run [prompt...]")
    .description("run one prompt non-interactively")
    .option("-p, --provider <id>", "provider id")
    .option("-m, --model <id>", "model id")
    .option("-w, --workspace <dir>", "workspace directory")
    .option("-s, --session <id>", "continue a session")
    .option("-y, --yes", "auto-approve risky tools")
    .option("--json", "machine-readable output")
    .action(async (promptParts: string[], opts: Record<string, any>) => {
      let prompt = (promptParts || []).join(" ").trim();
      if (!prompt && !process.stdin.isTTY) {
        prompt = await new Promise<string>((resolve) => {
          let data = "";
          process.stdin.setEncoding("utf8");
          process.stdin.on("data", (chunk) => (data += chunk));
          process.stdin.on("end", () => resolve(data.trim()));
        });
      }
      if (!prompt) fail("No prompt. Usage: orinos run \"your prompt\"");
      await runOneShot(prompt, opts);
    });

  program
    .command("models [query]")
    .description("browse models")
    .option("-p, --provider <id>", "provider id (use \"all\" for every provider)")
    .option("--limit <n>", "models per provider", "40")
    .option("--json", "machine-readable output")
    .action((query: string | undefined, opts: Record<string, any>) => {
      const config = loadConfig();
      if (opts.json) {
        const pid = opts.provider || config.provider;
        const providers = pid === "all" ? allProviders(config) : [getProvider(config, pid)!];
        const out = providers
          .filter(Boolean)
          .map((p) => ({
            id: p.id,
            name: p.name,
            keyed: hasApiKey(p, config),
            models: p.models.filter(
              (m) =>
                !query ||
                m.id.toLowerCase().includes(query.toLowerCase()) ||
                m.name.toLowerCase().includes(query.toLowerCase()),
            ),
          }));
        process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
        return;
      }
      printModels(config, opts.provider, query, Number(opts.limit) || 40);
    });

  program
    .command("providers [query]")
    .description("browse providers")
    .option("--keyed", "only providers with credentials")
    .option("--json", "machine-readable output")
    .action((query: string | undefined, opts: Record<string, any>) => {
      const config = loadConfig();
      if (opts.json) {
        let list = allProviders(config).filter(
          (p) => !query || p.id.includes(query) || p.name.toLowerCase().includes(query.toLowerCase()),
        );
        if (opts.keyed) list = list.filter((p) => hasApiKey(p, config));
        process.stdout.write(
          `${JSON.stringify(
            list.map((p) => ({
              id: p.id,
              name: p.name,
              api: p.api,
              kind: p.kind,
              env: p.env,
              keyed: hasApiKey(p, config),
              models: p.models.length,
            })),
            null,
            2,
          )}\n`,
        );
        return;
      }
      printProviders(config, query, Boolean(opts.keyed));
    });

  authCommand(program);

  program
    .command("skills")
    .description("list skills")
    .option("--view <name>", "print a skill")
    .action((opts: Record<string, any>) => {
      const config = loadConfig();
      const skills = loadSkills(config.workspace);
      if (opts.view) {
        const skill = skills.find((s) => s.name.toLowerCase() === String(opts.view).toLowerCase());
        if (!skill) fail(`Skill "${opts.view}" not found.`);
        process.stdout.write(`${skill!.content}\n`);
        return;
      }
      ui.write(`\n${c.bold}Skills${c.reset} ${c.faint}${skills.length} · user: ${path.join(orinosHome(), "skills")}${c.reset}\n`);
      for (const s of skills) {
        ui.write(`  ${c.violet}${s.name.padEnd(20)}${c.reset}${c.gray}${s.description}${c.reset} ${c.faint}[${s.source}]${c.reset}\n`);
      }
    });

  program
    .command("sessions")
    .description("list or manage sessions")
    .option("--delete <id>", "delete a session")
    .option("--rename <id>", "rename a session")
    .option("--title <text>", "new title (with --rename)")
    .option("--json", "machine-readable output")
    .action((opts: Record<string, any>) => {
      if (opts.delete) {
        ui.info(deleteSession(opts.delete) ? `Deleted ${opts.delete}.` : "Session not found.");
        return;
      }
      if (opts.rename) {
        const session = renameSession(opts.rename, opts.title || "New chat");
        ui.info(session ? "Renamed." : "Session not found.");
        return;
      }
      const sessions = listSessions();
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(sessions, null, 2)}\n`);
        return;
      }
      if (!sessions.length) {
        ui.info("No sessions yet.");
        return;
      }
      ui.write(`\n${c.bold}Sessions${c.reset} ${c.faint}${sessions.length}${c.reset}\n`);
      for (const s of sessions) {
        ui.write(
          `  ${c.gray}${s.id.padEnd(22)}${c.reset}${s.title.slice(0, 44).padEnd(46)}${c.faint}${s.provider}/${s.model} · ${new Date(s.updatedAt).toLocaleString()}${c.reset}\n`,
        );
      }
    });

  program
    .command("config")
    .description("show or update configuration")
    .option("--set <pair>", "key=value")
    .option("--path", "print the config path")
    .action((opts: Record<string, any>) => {
      if (opts.path) {
        process.stdout.write(`${configPath()}\n`);
        return;
      }
      if (opts.set) {
        const raw = String(opts.set);
        const index = raw.indexOf("=");
        if (index === -1) fail("Usage: orinos config --set key=value");
        const key = raw.slice(0, index).trim();
        const value = raw.slice(index + 1).trim();
        const patch: Record<string, unknown> = {};
        parseKeyValue(patch, key, value);
        const config = saveConfig(patch);
        ui.info(`Saved. ${key} = ${String((config as any)[key])}`);
        return;
      }
      const config = loadConfig();
      const safe = { ...config, apiKeys: Object.fromEntries(Object.keys(config.apiKeys).map((k) => [k, "•••"])) };
      process.stdout.write(`${configPath()}\n${JSON.stringify(safe, null, 2)}\n`);
    });

  program
    .command("doctor")
    .description("check the local installation")
    .action(() => {
      const config = loadConfig();
      const stats = catalogStats();
      const skills = loadSkills(config.workspace);
      let writable = false;
      try {
        const probe = path.join(config.workspace, `.orinos-probe-${process.pid}`);
        fs.writeFileSync(probe, "ok");
        fs.unlinkSync(probe);
        writable = true;
      } catch {
        writable = false;
      }
      const keyed = keyedProviderIds(config);
      const checks: Array<[boolean, string]> = [
        [Number(process.versions.node.split(".")[0]) >= 20, `Node ${process.versions.node}`],
        [true, `Catalog: ${stats.providers} providers / ${stats.models} models (${stats.generatedAt.slice(0, 10)})`],
        [fs.existsSync(configPath()), `Config: ${configPath()}`],
        [fs.existsSync(config.workspace), `Workspace: ${config.workspace}`],
        [writable, "Workspace is writable"],
        [keyed.length > 0, keyed.length ? `Credentials: ${keyed.join(", ")}` : "No provider credentials found"],
        [skills.length > 0, `Skills: ${skills.length} available`],
        [listSessions().length >= 0, `Sessions: ${listSessions().length} saved`],
        [Boolean(getProvider(config, config.provider)?.api), `Default model: ${config.provider}/${config.model}`],
      ];
      ui.write(`\n${c.bold}Orinos doctor${c.reset} ${c.faint}v${VERSION}${c.reset}\n\n`);
      for (const [ok, label] of checks) {
        ui.write(`  ${ok ? `${c.green}✓${c.reset}` : `${c.red}✕${c.reset}`} ${label}\n`);
      }
      ui.write("\n");
    });

  program.action(async () => {
    await repl();
  });

  program.parseAsync(process.argv).catch((err) => {
    fail(err?.message || String(err));
  });
}

main();
