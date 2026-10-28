import rawCatalog from "./catalog.json" with { type: "json" };
import type { AppConfig, ModelInfo, ProviderInfo, ProviderKind } from "./types.js";

interface CatalogModel {
  id: string;
  name: string;
  description?: string;
  family?: string;
  reasoning?: boolean;
  toolCall?: boolean;
  attachment?: boolean;
  context?: number;
  output?: number;
  cost?: { input: number; output: number };
  input?: string[];
  released?: string;
}

interface CatalogProvider {
  id: string;
  name: string;
  api?: string;
  doc?: string;
  npm?: string;
  env: string[];
  models: CatalogModel[];
}

interface CatalogFile {
  generatedAt: string;
  source: string;
  providerCount: number;
  modelCount: number;
  providers: CatalogProvider[];
}

const CATALOG = rawCatalog as unknown as CatalogFile;

/** Well-known endpoints for providers whose catalog entry omits `api`. */
const BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com/v1",
  xai: "https://api.x.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  mistral: "https://api.mistral.ai/v1",
  groq: "https://api.groq.com/openai/v1",
  cerebras: "https://api.cerebras.ai/v1",
  togetherai: "https://api.together.xyz/v1",
  "fireworks-ai": "https://api.fireworks.ai/inference/v1",
  deepinfra: "https://api.deepinfra.com/v1/openai",
  nvidia: "https://integrate.api.nvidia.com/v1",
  perplexity: "https://api.perplexity.ai",
  cohere: "https://api.cohere.ai/compatibility/v1",
  ollama: "http://127.0.0.1:11434/v1",
  lmstudio: "http://127.0.0.1:1234/v1",
  opencode: "https://opencode.ai/zen/v1",
  moonshotai: "https://api.moonshot.ai/v1",
  zai: "https://api.z.ai/api/paas/v4",
  minimax: "https://api.minimax.io/v1",
  alibaba: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  "github-copilot": "https://api.githubcopilot.com",
  "vercel-ai-gateway": "https://ai-gateway.vercel.sh/v1",
  kilo: "https://api.kilo.ai/api/gateway",
  "kilo-code": "https://api.kilo.ai/api/gateway",
  "ai-gateway": "https://ai-gateway.vercel.sh/v1",
};

function kindFor(provider: CatalogProvider): ProviderKind {
  if (provider.id === "google" || provider.id.startsWith("google-") || provider.npm === "@ai-sdk/google") {
    return "google";
  }
  if (provider.npm === "@ai-sdk/anthropic" || provider.id === "anthropic") return "anthropic";
  return "openai";
}

function modelFrom(m: CatalogModel): ModelInfo {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    family: m.family,
    reasoning: m.reasoning,
    toolCall: m.toolCall,
    attachment: m.attachment,
    context: m.context,
    output: m.output,
    cost: m.cost,
    input: m.input,
    released: m.released,
  };
}

let cachedProviders: ProviderInfo[] | null = null;

function buildProviders(): ProviderInfo[] {
  return CATALOG.providers.map((p) => {
    const kind = kindFor(p);
    const api = p.api || BASE_URLS[p.id];
    return {
      id: p.id,
      name: p.name,
      api,
      doc: p.doc,
      npm: p.npm,
      env: p.env,
      models: p.models.map(modelFrom),
      kind,
    } satisfies ProviderInfo;
  });
}

export function catalogStats(): { providers: number; models: number; generatedAt: string; source: string } {
  return {
    providers: CATALOG.providerCount,
    models: CATALOG.modelCount,
    generatedAt: CATALOG.generatedAt,
    source: CATALOG.source,
  };
}

export function allProviders(config: AppConfig): ProviderInfo[] {
  const base = new Map<string, ProviderInfo>();
  if (!cachedProviders) cachedProviders = buildProviders();
  for (const p of cachedProviders) base.set(p.id, p);

  for (const custom of config.customProviders || []) {
    const models: ModelInfo[] = (custom.models || []).map((id) => ({ id, name: id }));
    const existing = base.get(custom.id);
    base.set(custom.id, {
      id: custom.id,
      name: custom.name || custom.id,
      api: custom.api,
      env: existing?.env || [],
      models: models.length ? models : existing?.models || [],
      kind: custom.kind || "openai",
      custom: true,
      keyEnv: custom.keyEnv,
    });
  }

  return [...base.values()].sort((a, b) => {
    if (a.custom !== b.custom) return a.custom ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function getProvider(config: AppConfig, id: string): ProviderInfo | undefined {
  return allProviders(config).find((p) => p.id === id);
}

export function getModel(provider: ProviderInfo, modelId: string): ModelInfo | undefined {
  return provider.models.find((m) => m.id === modelId);
}

export function defaultModelFor(provider: ProviderInfo): string {
  const toolModel = provider.models.find((m) => m.toolCall);
  return (toolModel || provider.models[0])?.id || "";
}

export function resolveModelRef(
  config: AppConfig,
  providerId?: string,
  modelId?: string,
): { provider: ProviderInfo; model: ModelInfo; providerId: string; modelId: string } {
  const pid = providerId || config.provider;
  const provider = getProvider(config, pid);
  if (!provider) {
    throw new Error(`Unknown provider "${pid}". Run \`orinos providers\` to browse.`);
  }
  const mid = modelId || (pid === config.provider ? config.model : defaultModelFor(provider));
  const model = getModel(provider, mid) || { id: mid, name: mid };
  if (!mid) {
    throw new Error(
      `No model selected for ${provider.name}. Pick one with \`orinos models --provider ${pid}\`.`,
    );
  }
  return { provider, model, providerId: pid, modelId: mid };
}

export function modelRef(providerId: string, modelId: string): string {
  return `${providerId}/${modelId}`;
}
