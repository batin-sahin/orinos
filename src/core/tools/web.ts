import type { Tool } from "../types.js";
import { htmlToText, oneLine, truncate } from "../util.js";
import { num, str } from "./common.js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Orinos/0.1";

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const webFetchTool: Tool = {
  schema: {
    name: "web_fetch",
    description:
      "Fetch a URL and return readable text. Use for documentation, articles, and API responses. HTML is converted to plain text.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Absolute http(s) URL." },
        maxChars: { type: "number", description: "Maximum characters to return (default 30000)." },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
  describe(args) {
    return str(args, "url");
  },
  async run(args) {
    const url = str(args, "url").trim();
    const maxChars = Math.max(1000, Math.min(120_000, Math.floor(num(args, "maxChars", 30_000))));
    if (!/^https?:\/\//i.test(url)) return { ok: false, output: "Error: url must start with http:// or https://." };
    try {
      const res = await fetchWithTimeout(url, 30_000);
      const type = res.headers.get("content-type") || "";
      const raw = await res.text();
      let text: string;
      if (type.includes("application/json")) {
        try {
          text = JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          text = raw;
        }
      } else if (type.includes("html") || raw.trimStart().startsWith("<")) {
        text = htmlToText(raw);
      } else {
        text = raw;
      }
      return {
        ok: res.ok,
        output: truncate(`HTTP ${res.status} ${res.url}\n\n${text}`, maxChars),
      };
    } catch (err: any) {
      return { ok: false, output: `Fetch failed: ${err.message}` };
    }
  },
};

function decodeDuckLink(href: string): string {
  try {
    const url = new URL(href, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : url.toString();
  } catch {
    return href;
  }
}

interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

function parseDuckDuckGo(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const linkRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRe = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippets: string[] = [];
  let sm;
  while ((sm = snippetRe.exec(html))) snippets.push(htmlToText(sm[1]));
  let m;
  let index = 0;
  while ((m = linkRe.exec(html)) && hits.length < 10) {
    const title = htmlToText(m[2]);
    const url = decodeDuckLink(m[1]);
    if (!title || !/^https?:/.test(url)) continue;
    hits.push({ title, url, snippet: oneLine(snippets[index++] || "", 300) });
  }
  return hits;
}

export const webSearchTool: Tool = {
  schema: {
    name: "web_search",
    description:
      "Search the web. Returns titles, URLs and snippets. Follow up with web_fetch to read a result. Uses DuckDuckGo by default; Brave or SearXNG can be configured.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
        limit: { type: "number", description: "Number of results (default 6, max 10)." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  describe(args) {
    return str(args, "query");
  },
  async run(args, ctx) {
    const query = str(args, "query").trim();
    const limit = Math.max(1, Math.min(10, Math.floor(num(args, "limit", 6))));
    if (!query) return { ok: false, output: "Error: empty query." };
    const cfg = ctx.config.webSearch;

    try {
      if (cfg?.provider === "brave" && cfg.apiKey) {
        const res = await fetchWithTimeout(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`,
          25_000,
        );
        const json: any = await res.json();
        const hits: SearchHit[] = (json.web?.results || []).slice(0, limit).map((r: any) => ({
          title: r.title || "",
          url: r.url || "",
          snippet: oneLine(htmlToText(r.description || ""), 300),
        }));
        return formatHits(query, hits);
      }

      if (cfg?.provider === "searxng" && cfg.url) {
        const base = cfg.url.replace(/\/+$/, "");
        const res = await fetchWithTimeout(
          `${base}/search?q=${encodeURIComponent(query)}&format=json`,
          25_000,
        );
        const json: any = await res.json();
        const hits: SearchHit[] = (json.results || []).slice(0, limit).map((r: any) => ({
          title: r.title || "",
          url: r.url || "",
          snippet: oneLine(r.content || "", 300),
        }));
        return formatHits(query, hits);
      }

      const res = await fetchWithTimeout(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        25_000,
      );
      const html = await res.text();
      const hits = parseDuckDuckGo(html).slice(0, limit);
      if (!hits.length) {
        return {
          ok: false,
          output: `No search results parsed for "${query}". Try web_fetch on a direct URL, or configure Brave/SearXNG in config.`,
        };
      }
      return formatHits(query, hits);
    } catch (err: any) {
      return { ok: false, output: `Search failed: ${err.message}` };
    }
  },
};

function formatHits(query: string, hits: SearchHit[]): { ok: boolean; output: string } {
  if (!hits.length) return { ok: true, output: `No results for "${query}".` };
  const lines = hits.map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}\n   ${h.snippet}`);
  return { ok: true, output: `Search results for "${query}":\n\n${lines.join("\n\n")}` };
}
