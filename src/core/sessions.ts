import fs from "node:fs";
import path from "node:path";
import type { ChatMessage, Session, SessionSummary, Usage } from "./types.js";
import { ensureHome, orinosHome } from "./config.js";
import { uid } from "./util.js";

const MAX_SESSIONS = 500;

export function sessionDir(): string {
  return path.join(orinosHome(), "sessions");
}

function sessionFile(id: string): string {
  return path.join(sessionDir(), `${id.replace(/[^a-zA-Z0-9._-]/g, "")}.json`);
}

export function emptyUsage(): Usage {
  return { input: 0, output: 0 };
}

export function createSession(opts: {
  provider: string;
  model: string;
  workspace: string;
  title?: string;
}): Session {
  ensureHome();
  const now = Date.now();
  return {
    id: uid("s_"),
    title: opts.title || "New chat",
    createdAt: now,
    updatedAt: now,
    provider: opts.provider,
    model: opts.model,
    workspace: opts.workspace,
    messages: [],
    usage: emptyUsage(),
  };
}

export function titleFromMessage(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 52 ? `${clean.slice(0, 51)}…` : clean;
}

export function saveSession(session: Session): void {
  ensureHome();
  session.updatedAt = Date.now();
  if (!session.title || session.title === "New chat") {
    const firstUser = session.messages.find((m) => m.role === "user");
    if (firstUser) session.title = titleFromMessage(firstUser.content);
  }
  const file = sessionFile(session.id);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(session));
  fs.renameSync(tmp, file);
}

export function loadSession(id: string): Session | null {
  try {
    const data = JSON.parse(fs.readFileSync(sessionFile(id), "utf8")) as Session;
    if (!data || typeof data.id !== "string" || !Array.isArray(data.messages)) return null;
    data.usage = data.usage || emptyUsage();
    return data;
  } catch {
    return null;
  }
}

export function listSessions(): SessionSummary[] {
  ensureHome();
  const dir = sessionDir();
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const summaries: SessionSummary[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Session;
      if (!data?.id || !Array.isArray(data.messages)) continue;
      summaries.push({
        id: data.id,
        title: data.title || "New chat",
        createdAt: data.createdAt || 0,
        updatedAt: data.updatedAt || 0,
        provider: data.provider,
        model: data.model,
        messageCount: data.messages.length,
      });
    } catch {
      /* skip corrupt session */
    }
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS);
}

export function deleteSession(id: string): boolean {
  try {
    fs.unlinkSync(sessionFile(id));
    return true;
  } catch {
    return false;
  }
}

export function renameSession(id: string, title: string): Session | null {
  const session = loadSession(id);
  if (!session) return null;
  session.title = title.trim().slice(0, 120) || "New chat";
  saveSession(session);
  return session;
}
