import path from "node:path";
import os from "node:os";
import type { Tool } from "../types.js";

export function resolvePath(input: string, workspace: string): string {
  if (!input || typeof input !== "string") return workspace;
  let value = input.trim();
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) value = path.join(os.homedir(), value.slice(2));
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(workspace, value);
}

export function displayPath(target: string, workspace: string): string {
  const rel = path.relative(workspace, target);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return rel;
  const home = os.homedir();
  if (target.startsWith(home)) return `~${target.slice(home.length)}`;
  return target;
}

export function middleTruncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = Math.floor(max * 0.4);
  const tail = max - head - 40;
  return `${text.slice(0, head)}\n… [${text.length - max} chars truncated] …\n${text.slice(-tail)}`;
}

export function str(args: Record<string, unknown>, key: string, fallback = ""): string {
  const value = args[key];
  return typeof value === "string" ? value : fallback;
}

export function num(args: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(args[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function bool(args: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = args[key];
  return typeof value === "boolean" ? value : fallback;
}
