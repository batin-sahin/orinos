import type { Tool, ToolContext, ToolResult, ToolSchema } from "../types.js";
import { terminalTool } from "./terminal.js";
import { editFileTool, listDirTool, readFileTool, writeFileTool } from "./files.js";
import { globTool, grepTool } from "./search.js";
import { webFetchTool, webSearchTool } from "./web.js";
import { skillViewTool, skillsListTool } from "./skills.js";

export const TOOLS: Tool[] = [
  terminalTool,
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirTool,
  globTool,
  grepTool,
  webSearchTool,
  webFetchTool,
  skillsListTool,
  skillViewTool,
];

export function toolSchemas(): ToolSchema[] {
  return TOOLS.map((t) => t.schema);
}

export function getTool(name: string): Tool | undefined {
  return TOOLS.find((t) => t.schema.name === name);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) {
    return { ok: false, output: `Unknown tool "${name}". Available: ${TOOLS.map((t) => t.schema.name).join(", ")}` };
  }
  try {
    return await tool.run(args, ctx);
  } catch (err: any) {
    return { ok: false, output: `Tool ${name} failed: ${err?.message || String(err)}` };
  }
}

export { terminalTool } from "./terminal.js";
