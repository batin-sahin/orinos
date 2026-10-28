import DOMPurify from "dompurify";
import { marked } from "marked";
import type { SessionSummary, ToolCall } from "../core/types";

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(text: string): string {
  const html = marked.parse(text || "", { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
    FORBID_TAGS: ["style", "form", "input", "button", "iframe"],
  });
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTokens(n: number): string {
  if (!n) return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function formatCost(cost?: number): string {
  if (!cost) return "";
  return cost < 0.01 ? `$${cost.toFixed(5)}` : `$${cost.toFixed(4)}`;
}

export function shortPath(p: string, max = 34): string {
  if (!p) return "";
  const parts = p.replace(/\\/g, "/").split("/");
  if (p.length <= max) return p;
  return `…/${parts.slice(-2).join("/")}`;
}

export interface SessionGroup {
  label: string;
  items: SessionSummary[];
}

export function groupSessions(sessions: SessionSummary[]): SessionGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups: SessionGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const s of sessions) {
    if (s.updatedAt >= startOfToday) groups[0].items.push(s);
    else if (s.updatedAt >= startOfToday - 86_400_000) groups[1].items.push(s);
    else if (s.updatedAt >= startOfToday - 7 * 86_400_000) groups[2].items.push(s);
    else groups[3].items.push(s);
  }
  return groups.filter((g) => g.items.length);
}

export function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function toolSummary(tool: ToolCall): string {
  const args = parseArgs(tool.arguments);
  if (tool.name === "terminal") return String(args.command || "");
  if (tool.name === "read_file" || tool.name === "write_file" || tool.name === "edit_file") {
    return String(args.path || "");
  }
  if (tool.name === "grep") return String(args.pattern || "");
  if (tool.name === "glob") return String(args.pattern || "");
  if (tool.name === "web_search") return String(args.query || "");
  if (tool.name === "web_fetch") return String(args.url || "");
  if (tool.name === "list_dir") return String(args.path || ".");
  if (tool.name === "skill_view") return String(args.name || "");
  return JSON.stringify(args).slice(0, 120);
}

export function providerLabel(id: string, names: Record<string, string>): string {
  return names[id] || id;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fileStem(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || p;
}

export function oneLineSafe(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

