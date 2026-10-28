import type { ProviderStreamHandlers, ProviderStreamRequest, ProviderStreamResult } from "../types.js";
import { isLocalEndpoint, resolveApiKey } from "../config.js";
import { allProviders, getProvider } from "../catalog.js";
import type { AppConfig } from "../types.js";
import { streamOpenAi } from "./openai.js";
import { streamAnthropic } from "./anthropic.js";
import { streamGoogle } from "./google.js";

export function baseUrlFor(config: AppConfig, providerId: string): string {
  const provider = getProvider(config, providerId);
  return provider?.api || "";
}

export function requireProvider(config: AppConfig, providerId: string) {
  const provider = getProvider(config, providerId);
  if (!provider) throw new Error(`Unknown provider "${providerId}".`);
  return provider;
}

export function prepareRequest(
  config: AppConfig,
  providerId: string,
  model: string,
  extra: Partial<ProviderStreamRequest> = {},
): { provider: ReturnType<typeof requireProvider>; apiKey: string; baseUrl: string } {
  const provider = requireProvider(config, providerId);
  const baseUrl = provider.api || "";
  if (!baseUrl) {
    throw new Error(
      `${provider.name} has no API endpoint in the catalog. Add it as a custom provider with a base URL.`,
    );
  }
  const apiKey = resolveApiKey(provider, config);
  if (!apiKey && !isLocalEndpoint(baseUrl)) {
    const envHint = provider.keyEnv || provider.env[0] || "API_KEY";
    throw new Error(
      `No API key for ${provider.name}. Set ${envHint}, or add it in Settings → Providers.`,
    );
  }
  return { provider, apiKey, baseUrl };
}

export async function streamProvider(
  req: ProviderStreamRequest,
  handlers: ProviderStreamHandlers,
): Promise<ProviderStreamResult> {
  switch (req.provider.kind) {
    case "anthropic":
      return streamAnthropic(req, handlers);
    case "google":
      return streamGoogle(req, handlers);
    default:
      return streamOpenAi(req, handlers);
  }
}

/** Provider ids that have credentials available (env or config). Never returns the keys. */
export function keyedProviderIds(config: AppConfig): string[] {
  const ids: string[] = [];
  for (const provider of allProviders(config)) {
    if (resolveApiKey(provider, config).length > 0) ids.push(provider.id);
  }
  return ids;
}
