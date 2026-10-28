import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  FileCode2,
  FilePenLine,
  FileText,
  FolderTree,
  Globe,
  Loader2,
  Search,
  Sparkles,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import type { ChatMessage, ToolCall, Usage } from "../../core/types";
import {
  escapeHtml,
  formatCost,
  formatTokens,
  oneLineSafe,
  parseArgs,
  renderMarkdown,
  shortPath,
  toolSummary,
} from "../lib";
import type { LiveTurn, ToolState, ToolResultInfo } from "../ui-types";
import { toolCallResult, toolResultsFromMessages } from "../ui-types";
import { Orb } from "./Sidebar";

function Markdown({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = renderMarkdown(text);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".code-copy")) return;
      const button = document.createElement("button");
      button.className = "code-copy";
      button.textContent = "Copy";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const code = pre.querySelector("code")?.textContent || pre.textContent || "";
        void navigator.clipboard.writeText(code).then(() => {
          button.textContent = "Copied";
          setTimeout(() => (button.textContent = "Copy"), 1200);
        });
      });
      pre.appendChild(button);
    });
    root.querySelectorAll("a[href]").forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        const href = (anchor as HTMLAnchorElement).href;
        if (/^https?:\/\//i.test(href)) void window.orinos.openExternal(href);
      });
    });
  }, [html]);

  return <div ref={ref} className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Reasoning({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`reasoning ${open ? "open" : ""}`}>
      <button className="reasoning-head" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Sparkles size={12} />
        <span>Reasoning</span>
        <span className="reasoning-size">{formatTokens(Math.ceil(text.length / 4))} tokens</span>
      </button>
      {open && <div className="reasoning-body">{text}</div>}
    </div>
  );
}

function toolIcon(name: string) {
  switch (name) {
    case "terminal":
      return <Terminal size={13} />;
    case "read_file":
      return <FileText size={13} />;
    case "write_file":
      return <FilePenLine size={13} />;
    case "edit_file":
      return <FileCode2 size={13} />;
    case "list_dir":
      return <FolderTree size={13} />;
    case "grep":
    case "glob":
      return <Search size={13} />;
    case "web_search":
    case "web_fetch":
      return <Globe size={13} />;
    case "skill_view":
    case "skills_list":
      return <BookOpen size={13} />;
    default:
      return <Wrench size={13} />;
  }
}

function toolTitle(name: string): string {
  return (
    {
      terminal: "Terminal",
      read_file: "Read file",
      write_file: "Write file",
      edit_file: "Edit file",
      list_dir: "List directory",
      grep: "Grep",
      glob: "Glob",
      web_search: "Web search",
      web_fetch: "Web fetch",
      skill_view: "Skill",
      skills_list: "Skills",
    }[name] || name
  );
}

function argsPreview(call: ToolCall): { label: string; body: string } | null {
  const args = parseArgs(call.arguments);
  if (call.name === "terminal") {
    return { label: "Command", body: String(args.command || "") };
  }
  if (call.name === "write_file") {
    const content = String(args.content || "");
    return { label: "File", body: `${args.path || ""}\n\n${content.length} characters` };
  }
  if (call.name === "edit_file") {
    return {
      label: "Edit",
      body: `${args.path || ""}\n\n- ${String(args.oldString || "").slice(0, 800)}\n+ ${String(args.newString || "").slice(0, 800)}`,
    };
  }
  if (call.name === "read_file" || call.name === "list_dir") {
    return { label: "Path", body: String(args.path || ".") };
  }
  if (call.name === "grep" || call.name === "glob") {
    return { label: "Pattern", body: String(args.pattern || "") };
  }
  if (call.name === "web_search") return { label: "Query", body: String(args.query || "") };
  if (call.name === "web_fetch") return { label: "URL", body: String(args.url || "") };
  if (call.name === "skill_view") return { label: "Skill", body: String(args.name || "") };
  const json = JSON.stringify(args, null, 2);
  return json && json !== "{}" ? { label: "Arguments", body: json } : null;
}

function ToolCard({
  call,
  state,
}: {
  call: ToolCall;
  state: ToolState | null;
}) {
  const [open, setOpen] = useState(false);
  const summary = state?.summary || toolSummary(call);
  const preview = argsPreview(call);
  const status = state?.status || "ok";
  const output = state?.output || "";
  const duration = state?.durationMs;

  return (
    <div className={`tool-card ${status}`}>
      <button className="tool-head" onClick={() => setOpen((v) => !v)}>
        <span className="tool-icon">{toolIcon(call.name)}</span>
        <span className="tool-name">{toolTitle(call.name)}</span>
        {summary && <span className="tool-summary">{oneLineSafe(summary, 110)}</span>}
        <span className="tool-status">
          {status === "running" ? (
            <Loader2 size={13} className="spin" />
          ) : status === "error" ? (
            <X size={13} />
          ) : (
            <Check size={13} />
          )}
          {duration != null && <span className="tool-duration">{(duration / 1000).toFixed(duration < 1000 ? 2 : 1)}s</span>}
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>
      {open && (
        <div className="tool-body">
          {preview && (
            <div className="tool-section">
              <div className="tool-label">{preview.label}</div>
              <pre className="tool-pre">{preview.body.slice(0, 4000)}</pre>
            </div>
          )}
          {output && (
            <div className="tool-section">
              <div className="tool-label">
                Output
                <button
                  className="tool-copy"
                  onClick={() => navigator.clipboard.writeText(output)}
                  title="Copy output"
                >
                  <Copy size={11} />
                </button>
              </div>
              <pre className="tool-pre output">{output.slice(0, 6000)}{output.length > 6000 ? "\n… (truncated)" : ""}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AssistantMessage({
  message,
  toolStates,
  results,
  providerName,
}: {
  message: ChatMessage;
  toolStates: Record<string, ToolState>;
  results: Map<string, ToolResultInfo>;
  providerName: string;
}) {
  return (
    <div className="msg assistant">
      <div className="msg-avatar">
        <Orb size={24} />
      </div>
      <div className="msg-body">
        {message.reasoning && <Reasoning text={message.reasoning} />}
        {message.content && <Markdown text={message.content} />}
        {message.toolCalls?.map((call) => (
          <ToolCard key={call.id} call={call} state={toolCallResult(call, results, toolStates)} />
        ))}
        {(message.usage || message.durationMs) && (
          <div className="msg-meta">
            {providerName && <span>{providerName}</span>}
            {message.durationMs != null && <span>{(message.durationMs / 1000).toFixed(1)}s</span>}
            {message.usage && (
              <span>
                {formatTokens(message.usage.input)} in / {formatTokens(message.usage.output)} out
              </span>
            )}
            {message.usage?.cost ? <span>{formatCost(message.usage.cost)}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  {
    icon: <Sparkles size={16} />,
    title: "Build a feature",
    prompt: "Look at this workspace and build the most useful missing feature end-to-end. Verify it with real commands.",
  },
  {
    icon: <CircleAlert size={16} />,
    title: "Debug a failure",
    prompt: "Investigate what is currently broken in this workspace. Reproduce it, find the root cause, and fix it.",
  },
  {
    icon: <FileCode2 size={16} />,
    title: "Review the code",
    prompt: "Review the current changes in this workspace for bugs, security issues, and missing tests.",
  },
  {
    icon: <Globe size={16} />,
    title: "Research a topic",
    prompt: "Research the current best practices for this project's stack and give me a concise, cited summary.",
  },
];

interface ChatViewProps {
  messages: ChatMessage[];
  turnMessages: ChatMessage[];
  live: LiveTurn | null;
  toolStates: Record<string, ToolState>;
  running: boolean;
  status: string;
  error: string | null;
  onDismissError: () => void;
  providerNames: Record<string, string>;
  workspace: string;
  usage: Usage;
  onSuggestion: (text: string) => void;
}

export function ChatView(props: ChatViewProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const all = [...props.messages, ...props.turnMessages];
  const results = toolResultsFromMessages(all);

  useEffect(() => {
    if (stick.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [all.length, props.live?.text.length, props.live?.reasoning.length, props.toolStates, props.status]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  const empty = all.length === 0 && !props.live;

  return (
    <div className="chat-scroll" ref={scroller} onScroll={onScroll}>
      {empty ? (
        <div className="empty-state">
          <div className="empty-orb">
            <Orb size={84} />
          </div>
          <h1>Where should we start?</h1>
          <p>
            Orinos can read, write, run and research on your machine. Working in{" "}
            <span className="mono">{shortPath(props.workspace, 48)}</span>
          </p>
          <div className="suggestion-grid">
            {SUGGESTIONS.map((s) => (
              <button key={s.title} className="suggestion" onClick={() => props.onSuggestion(s.prompt)}>
                <span className="suggestion-icon">{s.icon}</span>
                <span className="suggestion-title">{s.title}</span>
                <span className="suggestion-text">{s.prompt}</span>
              </button>
            ))}
          </div>
          <div className="empty-hint">
            <kbd>⌘K</kbd> command palette <span>·</span> <kbd>/</kbd> commands in terminal
          </div>
        </div>
      ) : (
        <div className="messages">
          {all.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="msg user">
                  <div className="user-bubble">
                    <Markdown text={message.content} />
                  </div>
                </div>
              );
            }
            if (message.role === "assistant") {
              return (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  toolStates={props.toolStates}
                  results={results}
                  providerName={props.providerNames[message.provider || ""] || ""}
                />
              );
            }
            return null;
          })}

          {props.live && (
            <div className="msg assistant streaming">
              <div className="msg-avatar">
                <Orb size={24} />
              </div>
              <div className="msg-body">
                {props.live.reasoning && <Reasoning text={props.live.reasoning} />}
                {props.live.text ? (
                  <>
                    <Markdown text={props.live.text} />
                    <span className="stream-cursor" />
                  </>
                ) : (
                  <div className="thinking-line">
                    <Loader2 size={14} className="spin" />
                    <span>{props.status || "Thinking"}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {props.running && !props.live && (
            <div className="working-line">
              <Loader2 size={14} className="spin" />
              <span>{props.status || "Working…"}</span>
            </div>
          )}

          {props.error && (
            <div className="error-banner">
              <CircleAlert size={15} />
              <span>{props.error}</span>
              <button onClick={props.onDismissError} title="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}

          {!props.running && all.length > 0 && (
            <div className="turn-usage">
              {formatTokens(props.usage.input)} in / {formatTokens(props.usage.output)} out
              {props.usage.cost ? ` · ${formatCost(props.usage.cost)}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatHeader({
  title,
  providerName,
  model,
  workspace,
  running,
  sidebarHidden,
  onToggleSidebar,
  onRename,
  onOpenTerminal,
  onOpenSkills,
  onOpenSettings,
  onOpenPalette,
}: {
  title: string;
  providerName: string;
  model: string;
  workspace: string;
  running: boolean;
  sidebarHidden: boolean;
  onToggleSidebar: () => void;
  onRename: (title: string) => void;
  onOpenTerminal: () => void;
  onOpenSkills: () => void;
  onOpenSettings: () => void;
  onOpenPalette: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  useEffect(() => setValue(title), [title]);

  return (
    <header className="chat-header drag-region">
      <div className="chat-header-left no-drag">
        {sidebarHidden && (
          <button className="icon-btn" onClick={onToggleSidebar} title="Show sidebar">
            <ChevronRight size={16} />
          </button>
        )}
        {editing ? (
          <input
            className="title-input"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (value.trim() && value.trim() !== title) onRename(value.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setValue(title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button className="chat-title" onClick={() => setEditing(true)} title="Rename chat">
            {title}
            {running && <span className="title-running" />}
          </button>
        )}
        <div className="chat-subtitle">
          <span className={`status-dot ${running ? "busy" : "ok"}`} />
          <span>{providerName}</span>
          <span className="sep">/</span>
          <span className="mono">{model.split("/").pop()}</span>
          <span className="sep">·</span>
          <span className="mono">{shortPath(workspace, 34)}</span>
        </div>
      </div>
      <div className="chat-header-actions no-drag">
        <button className="header-btn" onClick={onOpenPalette} title="Command palette (⌘K)">
          <span className="header-key">⌘K</span>
        </button>
        <button className="icon-btn" onClick={onOpenTerminal} title="Terminal">
          <Terminal size={16} />
        </button>
        <button className="icon-btn" onClick={onOpenSkills} title="Skills">
          <BookOpen size={16} />
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings">
          <Wrench size={16} />
        </button>
      </div>
    </header>
  );
}
