import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../types.js";
import { displayPath, num, resolvePath, str } from "./common.js";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  ".next",
  ".cache",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".turbo",
]);

function globToRegex(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i++;
      } else out += "[^/]*";
    } else if (ch === "?") out += "[^/]";
    else if (ch === "{") {
      const end = glob.indexOf("}", i);
      if (end > i) {
        out += `(?:${glob
          .slice(i + 1, end)
          .split(",")
          .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")})`;
        i = end;
      } else out += "\\{";
    } else out += ch.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

export const globTool: Tool = {
  schema: {
    name: "glob",
    description:
      "Find files by glob pattern (e.g. \"**/*.ts\", \"src/**/*.{tsx,css}\"). Excludes node_modules, .git and build output.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Glob pattern." },
        path: { type: "string", description: "Directory to search (default: workspace)." },
        limit: { type: "number", description: "Maximum results (default 200)." },
      },
      required: ["pattern"],
      additionalProperties: false,
    },
  },
  describe(args) {
    return str(args, "pattern");
  },
  async run(args, ctx) {
    const pattern = str(args, "pattern").trim();
    const root = resolvePath(str(args, "path", "."), ctx.workspace);
    const limit = Math.max(1, Math.min(2000, Math.floor(num(args, "limit", 200))));
    if (!pattern) return { ok: false, output: "Error: empty pattern." };

    try {
      const globSync = (fs as any).globSync as
        | ((p: string, opts: Record<string, unknown>) => string[])
        | undefined;
      if (globSync) {
        const results = globSync(pattern, { cwd: root })
          .filter((p) => {
            if (SKIP_DIRS.has(p.split(path.sep)[0] || "")) return false;
            try {
              return fs.statSync(path.join(root, p)).isFile();
            } catch {
              return false;
            }
          })
          .slice(0, limit);
        return {
          ok: true,
          output: results.length ? results.join("\n") : `No files match ${pattern} in ${displayPath(root, ctx.workspace)}.`,
        };
      }
    } catch (err: any) {
      return { ok: false, output: `Glob error: ${err.message}` };
    }

    // Fallback: walk the tree.
    const regex = globToRegex(pattern.replace(/^\*\*\//, ""));
    const results: string[] = [];
    const walk = (dir: string) => {
      if (results.length >= limit) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (results.length >= limit) return;
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
        } else {
          const rel = path.relative(root, path.join(dir, entry.name));
          if (regex.test(rel) || regex.test(entry.name)) results.push(rel);
        }
      }
    };
    walk(root);
    return { ok: true, output: results.length ? results.join("\n") : "No matches." };
  },
};

export const grepTool: Tool = {
  schema: {
    name: "grep",
    description:
      "Search file contents with a regular expression. Returns matching lines as path:line: text. Skips node_modules, .git and binary files.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regular expression (or literal text)." },
        path: { type: "string", description: "Directory or file to search (default: workspace)." },
        include: { type: "string", description: "Only search files matching this glob (e.g. \"*.ts\")." },
        ignoreCase: { type: "boolean", description: "Case-insensitive search." },
        literal: { type: "boolean", description: "Treat pattern as literal text." },
        limit: { type: "number", description: "Maximum matching lines (default 80)." },
      },
      required: ["pattern"],
      additionalProperties: false,
    },
  },
  describe(args) {
    return str(args, "pattern");
  },
  async run(args, ctx) {
    const pattern = str(args, "pattern");
    const root = resolvePath(str(args, "path", "."), ctx.workspace);
    const include = str(args, "include");
    const ignoreCase = args.ignoreCase === true;
    const limit = Math.max(1, Math.min(500, Math.floor(num(args, "limit", 80))));
    if (!pattern) return { ok: false, output: "Error: empty pattern." };

    let regex: RegExp;
    try {
      const source = args.literal === true ? pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : pattern;
      regex = new RegExp(source, ignoreCase ? "i" : "");
    } catch (err: any) {
      return { ok: false, output: `Invalid regex: ${err.message}` };
    }

    const includeRegex = include ? globToRegex(include) : null;
    const matches: string[] = [];
    let scanned = 0;

    const searchFile = (file: string) => {
      if (matches.length >= limit) return;
      let stat: fs.Stats;
      try {
        stat = fs.statSync(file);
      } catch {
        return;
      }
      if (!stat.isFile() || stat.size > 1_500_000) return;
      let text: string;
      try {
        text = fs.readFileSync(file, "utf8");
      } catch {
        return;
      }
      if (text.includes("\u0000")) return;
      scanned++;
      const lines = text.split("\n");
      for (let i = 0; i < lines.length && matches.length < limit; i++) {
        if (regex.test(lines[i])) {
          matches.push(`${displayPath(file, ctx.workspace)}:${i + 1}: ${lines[i].slice(0, 400)}`);
        }
      }
    };

    const walk = (dir: string) => {
      if (matches.length >= limit) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (matches.length >= limit) return;
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
        } else {
          const rel = path.relative(root, path.join(dir, entry.name));
          if (!includeRegex || includeRegex.test(rel) || includeRegex.test(entry.name)) {
            searchFile(path.join(dir, entry.name));
          }
        }
      }
    };

    try {
      const stat = fs.statSync(root);
      if (stat.isFile()) searchFile(root);
      else walk(root);
    } catch (err: any) {
      return { ok: false, output: `Error: ${err.message}` };
    }

    if (!matches.length) {
      return { ok: true, output: `No matches for /${pattern}/ (${scanned} files scanned).` };
    }
    const header = `${matches.length} match${matches.length === 1 ? "" : "es"} in ${scanned} files:`;
    return { ok: true, output: `${header}\n${matches.join("\n")}` };
  },
};
