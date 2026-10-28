import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Skill } from "../types.js";
import { ensureHome, orinosHome } from "../config.js";
import { BUILTIN_SKILLS } from "./builtin.js";

interface Frontmatter {
  name?: string;
  description?: string;
  tags?: string[];
  metadata?: {
    orinos?: { tags?: string[] };
    hermes?: { tags?: string[] };
  };
}

function parseSkillFile(file: string, source: Skill["source"]): Skill | null {
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  let front: Frontmatter = {};
  let body = raw;
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end !== -1) {
      const yamlText = raw.slice(3, end).trim();
      body = raw.slice(end + 4).replace(/^\s*\n/, "");
      try {
        front = (YAML.parse(yamlText) || {}) as Frontmatter;
      } catch {
        front = {};
      }
    }
  }
  const fallbackName = path.basename(path.dirname(file)) || path.basename(file, ".md");
  const name = (front.name || fallbackName).trim();
  if (!name) return null;
  const tags =
    front.tags ||
    front.metadata?.orinos?.tags ||
    front.metadata?.hermes?.tags ||
    [];
  const description =
    front.description ||
    body
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#")) ||
    "No description.";
  return {
    id: name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-"),
    name,
    description: description.replace(/^["']|["']$/g, "").slice(0, 300),
    path: file,
    tags: tags.filter((t) => typeof t === "string"),
    content: body.trim(),
    source,
  };
}

function findSkillFiles(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string, depth: number) => {
    if (depth > 4) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) found.push(full);
    }
  };
  walk(dir, 0);
  return found;
}

export function loadSkills(workspace: string): Skill[] {
  ensureHome();
  const byName = new Map<string, Skill>();

  for (const s of BUILTIN_SKILLS) {
    byName.set(s.name.toLowerCase(), {
      id: s.id,
      name: s.name,
      description: s.description,
      tags: s.tags,
      content: s.content,
      source: "builtin",
      path: `builtin:${s.id}`,
    });
  }

  const roots: Array<{ dir: string; source: Skill["source"] }> = [
    { dir: path.join(orinosHome(), "skills"), source: "user" },
    { dir: path.join(workspace, ".orinos", "skills"), source: "project" },
  ];

  for (const { dir, source } of roots) {
    for (const file of findSkillFiles(dir)) {
      const skill = parseSkillFile(file, source);
      if (skill) byName.set(skill.name.toLowerCase(), skill);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function skillSummaries(skills: Skill[]) {
  return skills.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    tags: s.tags,
    source: s.source,
  }));
}
