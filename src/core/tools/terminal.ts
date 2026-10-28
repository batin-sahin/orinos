import { spawn } from "node:child_process";
import type { Tool } from "../types.js";
import { middleTruncate, num, resolvePath, str } from "./common.js";

const MAX_OUTPUT = 30_000;
const DEFAULT_TIMEOUT = 120_000;

export const terminalTool: Tool = {
  risky: true,
  schema: {
    name: "terminal",
    description:
      "Run a shell command on the user's machine. Use it for builds, tests, git, package managers, and inspecting the environment. Prefer dedicated file tools for reading and editing files. Commands run in the workspace by default.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute." },
        cwd: {
          type: "string",
          description: "Working directory (absolute, or relative to the workspace). Defaults to the workspace.",
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds (default 120, max 900).",
        },
      },
      required: ["command"],
      additionalProperties: false,
    },
  },
  describe(args) {
    return `$ ${str(args, "command")}`;
  },
  async run(args, ctx) {
    const command = str(args, "command").trim();
    if (!command) return { ok: false, output: "Error: empty command." };
    const cwd = resolvePath(str(args, "cwd", "."), ctx.workspace);
    const timeoutSec = Math.max(1, Math.min(900, num(args, "timeout", DEFAULT_TIMEOUT / 1000)));
    const isWin = process.platform === "win32";

    return new Promise((resolve) => {
      const child = spawn(isWin ? process.env.COMSPEC || "cmd.exe" : process.env.SHELL || "/bin/sh", isWin ? ["/d", "/s", "/c", command] : ["-lc", command], {
        cwd,
        env: { ...process.env, TERM: "dumb", CI: process.env.CI || "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let settled = false;

      const finish = (code: number | null, signal: NodeJS.Signals | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const parts: string[] = [];
        if (stdout.trim()) parts.push(stdout.trimEnd());
        if (stderr.trim()) parts.push(`[stderr]\n${stderr.trimEnd()}`);
        if (timedOut) parts.push(`[timeout after ${timeoutSec}s]`);
        if (code != null && code !== 0) parts.push(`[exit code ${code}]`);
        if (signal) parts.push(`[signal ${signal}]`);
        let output = parts.join("\n\n") || "(no output)";
        output = middleTruncate(output, MAX_OUTPUT);
        resolve({ ok: (code === 0 || code == null) && !timedOut, output, meta: { cwd, code } });
      };

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutSec * 1000);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
        if (stdout.length > MAX_OUTPUT * 4) stdout = stdout.slice(-MAX_OUTPUT * 2);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
        if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(-MAX_OUTPUT / 2);
      });
      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, output: `Failed to start command: ${err.message}` });
      });
      child.on("close", finish);

      if (ctx.signal) {
        const abort = () => child.kill("SIGTERM");
        if (ctx.signal.aborted) abort();
        else ctx.signal.addEventListener("abort", abort, { once: true });
      }
    });
  },
};
