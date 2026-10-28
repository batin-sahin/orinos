import type { Tool } from "../types.js";
import { str } from "./common.js";

export const skillsListTool: Tool = {
  schema: {
    name: "skills_list",
    description:
      "List the skills available in this harness. Skills are instruction packs for specific workflows. Call skill_view to read one before using it.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  describe() {
    return "list skills";
  },
  async run(_args, ctx) {
    if (!ctx.skills.length) return { ok: true, output: "No skills installed." };
    const lines = ctx.skills.map(
      (s) => `- ${s.name} [${s.source}]${s.tags.length ? ` (${s.tags.join(", ")})` : ""}\n  ${s.description}`,
    );
    return { ok: true, output: `${ctx.skills.length} skills:\n\n${lines.join("\n")}` };
  },
};

export const skillViewTool: Tool = {
  schema: {
    name: "skill_view",
    description:
      "Load the full instructions for a skill by name. Use this when a task matches a skill's description; follow the instructions it returns.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Skill name (see skills_list)." },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  describe(args) {
    return str(args, "name");
  },
  async run(args, ctx) {
    const name = str(args, "name").trim().replace(/\.md$/, "");
    const skill =
      ctx.skills.find((s) => s.name.toLowerCase() === name.toLowerCase()) ||
      ctx.skills.find((s) => s.id.toLowerCase() === name.toLowerCase());
    if (!skill) {
      return {
        ok: false,
        output: `Skill "${name}" not found. Available: ${ctx.skills.map((s) => s.name).join(", ") || "(none)"}`,
      };
    }
    return { ok: true, output: `# Skill: ${skill.name}\n\n${skill.content}` };
  },
};
