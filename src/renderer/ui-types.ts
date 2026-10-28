import type { ChatMessage, ToolCall } from "../core/types";

export interface ToolState {
  id: string;
  name: string;
  summary: string;
  status: "running" | "ok" | "error";
  output?: string;
  durationMs?: number;
}

export interface LiveTurn {
  id: string;
  text: string;
  reasoning: string;
  startedAt: number;
}

export interface Selection {
  provider: string;
  model: string;
}

export interface ToolResultInfo {
  ok: boolean;
  output: string;
}

export function toolResultsFromMessages(messages: ChatMessage[]): Map<string, ToolResultInfo> {
  const map = new Map<string, ToolResultInfo>();
  for (const m of messages) {
    if (m.role === "tool" && m.toolCallId) {
      map.set(m.toolCallId, { ok: !/^Error|denied|failed/i.test(m.content), output: m.content });
    }
  }
  return map;
}

export function toolCallResult(
  call: ToolCall,
  results: Map<string, ToolResultInfo>,
  toolState: Record<string, ToolState>,
): ToolState | null {
  const live = toolState[call.id];
  if (live) return live;
  const result = results.get(call.id);
  if (!result) return null;
  return {
    id: call.id,
    name: call.name,
    summary: "",
    status: result.ok ? "ok" : "error",
    output: result.output,
  };
}
