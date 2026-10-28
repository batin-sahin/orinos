import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppConfig, CustomProvider } from "./types.js";

export const VERSION = "0.1.0";

export function orinosHome(): string {
  const custom = process.env.ORINOS_HOME;
  if (custom) return path.resolve(custom.replace(/^~(?=$|\/)/, os.homedir()));
  return path.join(os.homedir(), ".orinos");
}

export function ensureHome(): string {
  const home = orinosHome();
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(path.join(home, "sessions"), { recursive: true });
  fs.mkdirSync(path.join(home, "skills"), { recursive: true });
  return home;
}

export function configPath(): string {
  return path.join(orinosHome(), "config.json");
}

export function defaultConfig(): AppConfig {
  const cwd = process.cwd();
  return {
    provider: "openai",
    model: "gpt-4.1-mini",
    apiKeys: {},
    workspace: cwd === "/" ? os.homedir() : cwd,
    autoApprove: false,
    maxSteps: 40,
    temperature: 0.7,
    theme: "paper",
    customProviders: [],
    recentModels: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function sanitizeConfig(raw: unknown): AppConfig {
  const base = defaultConfig();
  if (!isRecord(raw)) return base;
  const merged = { ...base, ...raw } as AppConfig;
  merged.apiKeys = isRecord(raw.apiKeys) ? (raw.apiKeys as Record<string, string>) : {};
  merged.customProviders = Array.isArray(raw.customProviders)
    ? (raw.customProviders as CustomProvider[]).filter(
        (p) => p && typeof p.id === "string" && typeof p.api === "string",
      )
    : [];
  merged.recentModels = Array.isArray(raw.recentModels) ? raw.recentModels.slice(0, 24) : [];
  merged.maxSteps = Math.max(1, Math.min(200, Number(merged.maxSteps) || 40));
  merged.temperature = Math.max(0, Math.min(2, Number(merged.temperature) || 0));
  merged.autoApprove = Boolean(merged.autoApprove);
  if (typeof merged.workspace !== "string" || !merged.workspace) merged.workspace = base.workspace;
  if (typeof merged.provider !== "string" || !merged.provider) merged.provider = base.provider;
  if (typeof merged.model !== "string" || !merged.model) merged.model = base.model;
  if (merged.theme !== "paper" && merged.theme !== "carbon") merged.theme = "paper";
  return merged;
}

export function loadConfig(): AppConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), "utf8"));
    return sanitizeConfig(raw);
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const home = ensureHome();
  const current = loadConfig();
  const next = sanitizeConfig({ ...current, ...patch });
  const file = path.join(home, "config.json");
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* best effort on Windows */
  }
  return next;
}

export function resolveApiKey(
  provider: { id: string; env?: string[]; keyEnv?: string },
  config: AppConfig,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = config.apiKeys[provider.id];
  if (configured && configured.trim()) return configured.trim();
  const names = [...(provider.keyEnv ? [provider.keyEnv] : []), ...(provider.env || [])];
  for (const name of names) {
    const value = env[name];
    if (value && value.trim()) return value.trim();
  }
  return "";
}

export function hasApiKey(provider: { id: string; env?: string[]; keyEnv?: string }, config: AppConfig): boolean {
  return resolveApiKey(provider, config).length > 0;
}

export function isLocalEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";
  } catch {
    return false;
  }
}
