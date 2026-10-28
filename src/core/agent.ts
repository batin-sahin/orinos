import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  AgentEvent,
  AppConfig,
  ApprovalRequest,
  ChatMessage,
  ProviderInfo,
  Session,
  Skill,
  ToolCall,
} from "./types.js";
import { resolveModelRef } from "./catalog.js";
import { prepareRequest, streamProvider } from "./providers/index.js";
import { executeTool, getTool, toolSchemas } from "./tools/index.js";
import { loadSkills } from "./skills/index.js";
import { saveSession, titleFromMessage } from "./sessions.js";
import { estimateCost, formatTokens, truncate, uid } from "./util.js";

export interface AgentOptions {
  config: AppConfig;
  session: Session;
  providerId?: string;
  modelId?: string;
  skills?: Skill[];
  onEvent: (event: AgentEvent) => void;
  onApproval?: (request: ApprovalRequest) => Promise<boolean>;
}

function projectInstructions(workspace: string): string {
  const names = ["AGENTS.md", "ORINOS.md", ".orinos/instructions.md", ".orinos/AGENTS.md"];
  const chunks: string[] = [];
  for (const name of names) {
    const file = path.join(workspace, name);
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 200_000) continue;
      chunks.push(`--- ${name} ---\n${truncate(fs.readFileSync(file, "utf8").trim(), 8000)}`);
    } catch {
      /* missing */
    }
  }
  return chunks.join("\n\n");
}

export function buildSystemPrompt(opts: {
  config: AppConfig;
  provider: ProviderInfo;
  modelId: string;
  workspace: string;
  skills: Skill[];
}): string {
  const { config, provider, modelId, workspace, skills } = opts;
  const tools = toolSchemas();
  const today = new Date().toISOString().slice(0, 10);
  const instructions = projectInstructions(workspace);

  const toolLines = tools.map((t) => `- ${t.name}: ${t.description.split(". ")[0]}.`).join("\n");
  const skillLines = skills.length
    ? skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")
    : "- (none)";

  return `You are Orinos, an AI agent harness running locally on the user's computer. You are direct, competent, and you finish work instead of describing it.

## Environment
- Date: ${today}
- Platform: ${process.platform} ${os.release()} (${process.arch})
- Workspace: ${workspace}
- Shell: ${process.env.SHELL || (process.platform === "win32" ? "cmd.exe" : "/bin/sh")}
- Model: ${provider.name} / ${modelId}
- Approval mode: ${config.autoApprove ? "auto (tools run without asking)" : "ask before risky tools"}

## How to work
- Act. Use tools to inspect and change the real environment; never pretend you ran something.
- Read a file before editing it. Use edit_file for targeted changes and write_file for new files.
- When a task is non-trivial, keep a short plan and verify each step with commands or tests.
- Match existing code style and project conventions. Keep changes scoped; never overwrite unrelated work.
- If a command fails, diagnose from the actual output instead of retrying blindly.
- Never fabricate file contents, APIs, URLs, versions, or test results.
- Ask the user only when a decision is genuinely blocking; otherwise choose a sensible default and state it.
- Never run destructive commands (deleting user data, force-push, sudo) without a clear reason and approval.
- Do not commit or push unless explicitly asked.

## Response style
- Be concise. Lead with the answer or result, then the detail that matters.
- Use Markdown for structure. Reference files as \`path:line\`.
- Report what changed, what was verified, and what remains. No process narration.

## Tools
${toolLines}

## Skills
Skills are instruction packs for specific workflows. When a task matches a skill, call \`skill_view\` and follow it.
${skillLines}
${instructions ? `\n## Project instructions\n${instructions}\n` : ""}`;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof Error && (err.name === "AbortError" || /aborted|abort/i.test(err.message))) ||
    (typeof err === "object" && err !== null && (err as any).name === "AbortError")
  );
}

function estimateUsage(messages: ChatMessage[], output: string): { input: number; output: number } {
  const chars = messages.reduce((sum, m) => sum + m.content.length + (m.toolCalls ? 60 : 0), 0);
  return { input: Math.ceil(chars / 4), output: Math.ceil(output.length / 4) };
}

export class Agent {
  readonly session: Session;
  provider: ProviderInfo;
  modelId: string;
  private config: AppConfig;
  private skills: Skill[];
  private onEvent: (event: AgentEvent) => void;
  private onApproval?: (request: ApprovalRequest) => Promise<boolean>;
  private controller: AbortController | null = null;
  private running = false;

  constructor(opts: AgentOptions) {
    this.config = opts.config;
    this.session = opts.session;
    this.skills = opts.skills || loadSkills(opts.session.workspace);
    const resolved = resolveModelRef(
      opts.config,
      opts.providerId || opts.session.provider,
      opts.modelId || opts.session.model,
    );
    this.provider = resolved.provider;
    this.modelId = resolved.modelId;
    this.session.provider = resolved.providerId;
    this.session.model = resolved.modelId;
    this.onEvent = opts.onEvent;
    this.onApproval = opts.onApproval;
  }

  get isRunning(): boolean {
    return this.running;
  }

  abort(): void {
    this.controller?.abort();
  }

  private emit(event: AgentEvent): void {
    try {
      this.onEvent(event);
    } catch {
      /* renderer may have closed */
    }
  }

  async send(userText: string): Promise<void> {
    if (this.running) throw new Error("The agent is already running.");
    this.running = true;
    this.controller = new AbortController();
    const startedAt = Date.now();

    const userMessage: ChatMessage = {
      id: uid("m_"),
      role: "user",
      content: userText,
      createdAt: Date.now(),
    };
    this.session.messages.push(userMessage);
    if (this.session.title === "New chat") this.session.title = titleFromMessage(userText);
    saveSession(this.session);

    let active: ChatMessage | null = null;
    try {
      const prepared = prepareRequest(this.config, this.provider.id, this.modelId);
      const system = buildSystemPrompt({
        config: this.config,
        provider: this.provider,
        modelId: this.modelId,
        workspace: this.session.workspace,
        skills: this.skills,
      });

      let steps = 0;
      let finished = false;

      while (steps < this.config.maxSteps) {
        steps++;
        if (this.controller.signal.aborted) break;

        const assistantId = uid("m_");
        const turnStarted = Date.now();
        active = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          provider: this.provider.id,
          model: this.modelId,
        };
        this.emit({ type: "assistant_start", id: assistantId, model: this.modelId });
        this.emit({
          type: "status",
          text: steps === 1 ? "Thinking…" : `Continuing (step ${steps})…`,
        });

        const result = await streamProvider(
          {
            ...prepared,
            model: this.modelId,
            system,
            messages: this.session.messages,
            tools: toolSchemas(),
            temperature: this.config.temperature,
            signal: this.controller.signal,
          },
          {
            onText: (piece) => {
              if (active) active.content += piece;
              this.emit({ type: "text", text: piece });
            },
            onReasoning: (piece) => {
              if (active) active.reasoning = (active.reasoning || "") + piece;
              this.emit({ type: "reasoning", text: piece });
            },
          },
        );

        active.content = result.text || active.content;
        active.reasoning = result.reasoning || active.reasoning;
        active.toolCalls = result.toolCalls.length ? result.toolCalls : undefined;
        active.durationMs = Date.now() - turnStarted;

        let usage = result.usage;
        if (!usage.input && !usage.output) usage = estimateUsage(this.session.messages, result.text);
        usage.cost = estimateCost(
          this.provider.models.find((m) => m.id === this.modelId),
          usage,
        );
        active.usage = usage;

        this.session.usage.input += usage.input;
        this.session.usage.output += usage.output;
        this.session.usage.cost = (this.session.usage.cost || 0) + (usage.cost || 0);
        this.session.messages.push(active);
        const finishedMessage = active;
        active = null;

        this.emit({ type: "assistant", message: finishedMessage });
        this.emit({ type: "usage", usage: this.session.usage });
        saveSession(this.session);

        if (!result.toolCalls.length) {
          finished = true;
          this.emit({ type: "status", text: "" });
          this.emit({ type: "done", message: finishedMessage, session: this.session });
          break;
        }

        for (const call of result.toolCalls) {
          if (this.controller.signal.aborted) break;
          await this.runTool(call);
        }

        if (this.controller.signal.aborted) break;
      }

      if (!finished) {
        if (this.controller.signal.aborted) {
          this.emit({ type: "status", text: "" });
          this.emit({ type: "done", message: null, session: this.session });
        } else {
          this.emit({
            type: "error",
            message: `Stopped after ${this.config.maxSteps} steps. Send another message to continue.`,
          });
          this.emit({ type: "done", message: null, session: this.session });
        }
      }
    } catch (err) {
      if (active && (active.content || active.reasoning)) {
        this.session.messages.push(active);
        this.emit({ type: "assistant", message: active });
        active = null;
      }
      if (isAbortError(err)) {
        this.emit({ type: "status", text: "" });
        this.emit({ type: "done", message: null, session: this.session });
      } else {
        const message = err instanceof Error ? err.message : String(err);
        this.emit({ type: "error", message: truncate(message, 2000) });
        this.emit({ type: "done", message: null, session: this.session });
      }
    } finally {
      this.running = false;
      this.controller = null;
      saveSession(this.session);
      const total = Date.now() - startedAt;
      if (process.env.ORINOS_DEBUG) {
        console.error(`[orinos] turn finished in ${total}ms`);
      }
    }
  }

  private async runTool(call: ToolCall): Promise<void> {
    const tool = getTool(call.name);
    let args: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(call.arguments || "{}");
      if (parsed && typeof parsed === "object") args = parsed;
    } catch {
      args = {};
    }
    const summary = tool ? tool.describe(args) : call.arguments;
    this.emit({ type: "tool_start", id: call.id, name: call.name, args: call.arguments, summary });

    let approved = true;
    if (tool?.risky && !this.config.autoApprove && this.onApproval) {
      try {
        approved = await this.onApproval({
          id: uid("a_"),
          sessionId: this.session.id,
          tool: call.name,
          args,
          summary,
        });
      } catch {
        approved = false;
      }
    }

    const started = Date.now();
    let result;
    if (!approved) {
      result = {
        ok: false,
        output:
          "The user denied this tool call. Do not retry the same action without asking; explain why it is needed or choose another approach.",
      };
      this.emit({ type: "status", text: "" });
    } else {
      this.emit({ type: "status", text: `${tool ? tool.schema.name : call.name}…` });
      result = await executeTool(call.name, args, {
        workspace: this.session.workspace,
        config: this.config,
        sessionId: this.session.id,
        skills: this.skills,
        signal: this.controller?.signal,
      });
      this.emit({ type: "status", text: "Thinking…" });
    }

    const toolMessage: ChatMessage = {
      id: uid("m_"),
      role: "tool",
      content: result.output,
      toolCallId: call.id,
      name: call.name,
      createdAt: Date.now(),
    };
    this.session.messages.push(toolMessage);
    this.emit({
      type: "tool_end",
      id: call.id,
      name: call.name,
      ok: result.ok,
      output: result.output,
      durationMs: Date.now() - started,
    });
    saveSession(this.session);
  }
}

export function formatUsage(usage: { input: number; output: number; cost?: number }): string {
  const cost = usage.cost ? ` · $${usage.cost.toFixed(usage.cost < 0.01 ? 5 : 4)}` : "";
  return `${formatTokens(usage.input)} in / ${formatTokens(usage.output)} out${cost}`;
}
