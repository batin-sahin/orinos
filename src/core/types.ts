export type ProviderKind = "openai" | "anthropic" | "google";

export interface ModelCost {
  input: number;
  output: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  family?: string;
  reasoning?: boolean;
  toolCall?: boolean;
  attachment?: boolean;
  context?: number;
  output?: number;
  cost?: ModelCost;
  input?: string[];
  released?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  api?: string;
  doc?: string;
  npm?: string;
  env: string[];
  models: ModelInfo[];
  kind: ProviderKind;
  custom?: boolean;
  keyEnv?: string;
}

export interface CustomProvider {
  id: string;
  name: string;
  api: string;
  kind?: ProviderKind;
  keyEnv?: string;
  models?: string[];
}

export interface AppConfig {
  provider: string;
  model: string;
  apiKeys: Record<string, string>;
  workspace: string;
  autoApprove: boolean;
  maxSteps: number;
  temperature: number;
  theme: string;
  customProviders: CustomProvider[];
  recentModels: string[];
  webSearch?: { provider: "duckduckgo" | "brave" | "searxng"; url?: string; apiKey?: string };
}

export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface Usage {
  input: number;
  output: number;
  reasoning?: number;
  cacheRead?: number;
  cost?: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
  reasoning?: string;
  createdAt: number;
  usage?: Usage;
  model?: string;
  provider?: string;
  durationMs?: number;
  error?: boolean;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  provider: string;
  model: string;
  workspace: string;
  messages: ChatMessage[];
  usage: Usage;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  path: string;
  tags: string[];
  content: string;
  source: "builtin" | "user" | "project";
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  output: string;
  meta?: Record<string, unknown>;
}

export interface ToolContext {
  workspace: string;
  config: AppConfig;
  sessionId: string;
  skills: Skill[];
  signal?: AbortSignal;
  approve?: (tool: string, args: Record<string, unknown>) => Promise<boolean>;
}

export interface Tool {
  schema: ToolSchema;
  /** Tools that modify the machine or execute commands ask for approval. */
  risky?: boolean;
  describe(args: Record<string, unknown>): string;
  run(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

export interface ProviderStreamRequest {
  provider: ProviderInfo;
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  messages: ChatMessage[];
  tools: ToolSchema[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface ProviderStreamHandlers {
  onText(text: string): void;
  onReasoning(text: string): void;
}

export interface ProviderStreamResult {
  text: string;
  reasoning: string;
  toolCalls: ToolCall[];
  usage: Usage;
  finishReason: string;
}

export type AgentEvent =
  | { type: "status"; text: string }
  | { type: "assistant_start"; id: string; model: string }
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool_start"; id: string; name: string; args: string; summary: string }
  | { type: "tool_end"; id: string; name: string; ok: boolean; output: string; durationMs: number }
  | { type: "assistant"; message: ChatMessage }
  | { type: "usage"; usage: Usage }
  | { type: "done"; message: ChatMessage | null; session: Session }
  | { type: "error"; message: string };

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

export interface Bootstrap {
  config: AppConfig;
  providers: ProviderInfo[];
  providerCount: number;
  modelCount: number;
  keyedProviders: string[];
  sessions: SessionSummary[];
  skills: SkillSummary[];
  version: string;
  platform: string;
  home: string;
  catalogGeneratedAt: string;
  catalogSource: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  provider: string;
  model: string;
  messageCount: number;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  tags: string[];
  source: Skill["source"];
}

export interface CommandOutput {
  runId: string;
  stream: "stdout" | "stderr" | "exit";
  data: string;
  code?: number;
}
