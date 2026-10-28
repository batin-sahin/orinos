import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../types.js";
import { displayPath, middleTruncate, num, resolvePath, str } from "./common.js";

const MAX_READ = 400_000;

function lineCount(text: string): number {
  if (!text) return 0;
  return text.split("\n").length;
}

export const readFileTool: Tool = {
  schema: {
    name: "read_file",
    description:
      "Read a text file. Returns the file contents with line numbers. Use offset/limit for large files. Paths may be absolute or relative to the workspace.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path." },
        offset: { type: "number", description: "1-based line to start at." },
        limit: { type: "number", description: "Maximum number of lines (default 2000)." },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
  describe(args) {
    return str(args, "path");
  },
  async run(args, ctx) {
    const target = resolvePath(str(args, "path"), ctx.workspace);
    try {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        return { ok: false, output: `Error: ${target} is a directory. Use list_dir.` };
      }
      if (stat.size > 4_000_000) {
        return { ok: false, output: `Error: file is ${stat.size} bytes; too large to read.` };
      }
      let text = fs.readFileSync(target, "utf8");
      if (text.includes("\u0000")) {
        return { ok: false, output: "Error: binary file. Use the terminal tool (e.g. file, xxd) if needed." };
      }
      const offset = Math.max(1, Math.floor(num(args, "offset", 1)));
      const limit = Math.max(1, Math.min(10_000, Math.floor(num(args, "limit", 2000))));
      const lines = text.split("\n");
      const selected = lines.slice(offset - 1, offset - 1 + limit);
      const numbered = selected
        .map((line, i) => `${String(offset + i).padStart(6)}  ${line}`)
        .join("\n");
      const header = `[${displayPath(target, ctx.workspace)} · ${lineCount(text)} lines · ${stat.size} bytes]`;
      const footer =
        offset - 1 + limit < lines.length
          ? `\n… ${lines.length - (offset - 1 + limit)} more lines (use offset=${offset + limit})`
          : "";
      return { ok: true, output: middleTruncate(`${header}\n${numbered}${footer}`, MAX_READ) };
    } catch (err: any) {
      return { ok: false, output: `Error reading ${target}: ${err.message}` };
    }
  },
};

export const writeFileTool: Tool = {
  risky: true,
  schema: {
    name: "write_file",
    description:
      "Create or overwrite a file with the given contents. Parent directories are created automatically. Prefer edit_file for small changes to existing files.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path." },
        content: { type: "string", description: "Full file content." },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
  },
  describe(args) {
    const content = str(args, "content");
    return `${str(args, "path")} (${content.length} chars)`;
  },
  async run(args, ctx) {
    const target = resolvePath(str(args, "path"), ctx.workspace);
    const content = str(args, "content");
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
      return {
        ok: true,
        output: `Wrote ${content.length} chars to ${displayPath(target, ctx.workspace)}.`,
      };
    } catch (err: any) {
      return { ok: false, output: `Error writing ${target}: ${err.message}` };
    }
  },
};

export const editFileTool: Tool = {
  risky: true,
  schema: {
    name: "edit_file",
    description:
      "Replace an exact string in a file. oldString must match exactly (including whitespace) and must be unique unless replaceAll is true. Include enough surrounding context to make the match unique.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path." },
        oldString: { type: "string", description: "Exact text to replace." },
        newString: { type: "string", description: "Replacement text." },
        replaceAll: { type: "boolean", description: "Replace every occurrence (default false)." },
      },
      required: ["path", "oldString", "newString"],
      additionalProperties: false,
    },
  },
  describe(args) {
    return str(args, "path");
  },
  async run(args, ctx) {
    const target = resolvePath(str(args, "path"), ctx.workspace);
    const oldString = str(args, "oldString");
    const newString = str(args, "newString");
    const replaceAll = args.replaceAll === true;
    if (!oldString) return { ok: false, output: "Error: oldString is empty." };
    try {
      const text = fs.readFileSync(target, "utf8");
      const count = text.split(oldString).length - 1;
      if (count === 0) {
        return { ok: false, output: `Error: oldString not found in ${displayPath(target, ctx.workspace)}.` };
      }
      if (count > 1 && !replaceAll) {
        return {
          ok: false,
          output: `Error: oldString occurs ${count} times. Add more context or set replaceAll=true.`,
        };
      }
      const next = replaceAll ? text.split(oldString).join(newString) : text.replace(oldString, newString);
      fs.writeFileSync(target, next);
      return {
        ok: true,
        output: `Edited ${displayPath(target, ctx.workspace)} (${count} replacement${count === 1 ? "" : "s"}).`,
      };
    } catch (err: any) {
      return { ok: false, output: `Error editing ${target}: ${err.message}` };
    }
  },
};

export const listDirTool: Tool = {
  schema: {
    name: "list_dir",
    description: "List files and directories in a folder. Use this to understand a project layout.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path (default: workspace)." },
        depth: { type: "number", description: "Recursion depth, 1-3 (default 1)." },
        limit: { type: "number", description: "Maximum entries (default 200)." },
      },
      additionalProperties: false,
    },
  },
  describe(args) {
    return str(args, "path", ".");
  },
  async run(args, ctx) {
    const target = resolvePath(str(args, "path", "."), ctx.workspace);
    const depth = Math.max(1, Math.min(3, Math.floor(num(args, "depth", 1))));
    const limit = Math.max(1, Math.min(1000, Math.floor(num(args, "limit", 200))));
    const lines: string[] = [];
    let count = 0;

    const walk = (dir: string, prefix: string, level: number) => {
      if (count >= limit) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (err: any) {
        lines.push(`${prefix}[error: ${err.message}]`);
        return;
      }
      entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (count >= limit) {
          lines.push(`${prefix}… (truncated)`);
          return;
        }
        if (entry.name === "node_modules" || entry.name === ".git") {
          lines.push(`${prefix}${entry.name}/ (skipped)`);
          continue;
        }
        const full = path.join(dir, entry.name);
        count++;
        if (entry.isDirectory()) {
          lines.push(`${prefix}${entry.name}/`);
          if (level < depth) walk(full, `${prefix}  `, level + 1);
        } else {
          let size = 0;
          try {
            size = fs.statSync(full).size;
          } catch {
            /* ignore */
          }
          lines.push(`${prefix}${entry.name}${size ? ` (${size}b)` : ""}`);
        }
      }
    };

    walk(target, "", 1);
    return {
      ok: true,
      output: `[${displayPath(target, ctx.workspace)}]\n${lines.join("\n") || "(empty)"}`,
    };
  },
};
