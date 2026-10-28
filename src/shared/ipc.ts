import type {
  AgentEvent,
  AppConfig,
  ApprovalRequest,
  Bootstrap,
  CommandOutput,
  Session,
  SessionSummary,
  Skill,
  SkillSummary,
} from "../core/types.js";

export interface SendMessageInput {
  sessionId: string;
  text: string;
  provider?: string;
  model?: string;
  attachments?: string[];
}

export interface ProviderKeyStatus {
  keyed: string[];
}

export interface CommandRunInput {
  runId: string;
  command: string;
  cwd?: string;
}

export interface AgentEventPayload {
  sessionId: string;
  event: AgentEvent;
}

export interface ApprovalPayload {
  request: ApprovalRequest;
}

export interface MenuPayload {
  action: "new-chat" | "settings" | "command-palette" | "toggle-sidebar";
}

export interface OrinosApi {
  bootstrap(): Promise<Bootstrap>;
  listSessions(): Promise<SessionSummary[]>;
  loadSession(id: string): Promise<Session | null>;
  newSession(opts: { provider?: string; model?: string; workspace?: string }): Promise<Session>;
  deleteSession(id: string): Promise<boolean>;
  renameSession(id: string, title: string): Promise<Session | null>;

  sendMessage(input: SendMessageInput): Promise<{ ok: boolean; error?: string }>;
  abort(sessionId: string): Promise<void>;
  onAgentEvent(cb: (payload: AgentEventPayload) => void): () => void;

  getConfig(): Promise<AppConfig>;
  setConfig(patch: Partial<AppConfig>): Promise<AppConfig>;
  setApiKey(providerId: string, key: string): Promise<ProviderKeyStatus>;
  removeApiKey(providerId: string): Promise<ProviderKeyStatus>;
  addCustomProvider(input: {
    id?: string;
    name: string;
    api: string;
    kind?: string;
    keyEnv?: string;
    models?: string[];
  }): Promise<Bootstrap>;
  removeCustomProvider(id: string): Promise<Bootstrap>;

  listSkills(): Promise<SkillSummary[]>;
  getSkill(name: string): Promise<Skill | null>;

  respondApproval(id: string, approved: boolean): Promise<void>;
  onApproval(cb: (payload: ApprovalPayload) => void): () => void;

  runCommand(input: CommandRunInput): Promise<{ ok: boolean }>;
  killCommand(runId: string): Promise<void>;
  onCommandOutput(cb: (payload: CommandOutput) => void): () => void;

  chooseFiles(): Promise<string[]>;
  chooseDirectory(): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  onMenu(cb: (payload: MenuPayload) => void): () => void;
}
