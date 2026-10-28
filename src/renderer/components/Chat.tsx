import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Command,
  Copy,
  FileCode2,
  FilePenLine,
  FileText,
  FolderTree,
  Globe,
  MoreHorizontal,
  PanelLeftOpen,
  Search,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import type { ChatMessage, ToolCall, Usage } from "../../core/types";
import {
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
import { Mark } from "./Brand";
import { StatusMark, ThoughtLine } from "./Motion";

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
      <button className="reasoning-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="reasoning-label">Reasoning</span>
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
  step,
}: {
  call: ToolCall;
  state: ToolState | null;
  step: number;
}) {
  const [open, setOpen] = useState(false);
  const summary = state?.summary || toolSummary(call);
  const preview = argsPreview(call);
  const status = state?.status || "ok";
  const output = state?.output || "";
  const duration = state?.durationMs;
  const durationText =
    duration != null ? `${(duration / 1000).toFixed(duration < 1000 ? 2 : 1)}s` : null;
  const tick = duration != null ? Math.max(6, Math.min(40, Math.round(Math.log10(duration + 10) * 12))) : 0;

  return (
    <div className={`trace-step ${status}`}>
      <span className="trace-index">{String(step).padStart(2, "0")}</span>
      <div className="trace-body">
        <button className="tool-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <span className="tool-icon">{toolIcon(call.name)}</span>
          <span className="tool-name">{toolTitle(call.name)}</span>
          {summary && <span className="tool-summary">{oneLineSafe(summary, 110)}</span>}
          <span className="tool-meta">
            {duration != null && (
              <span className="tool-duration" title={`${duration} ms`}>
                <span className="duration-tick" style={{ width: tick }} aria-hidden="true" />
                {durationText}
              </span>
            )}
            <span className={`tool-state ${status}`}>
              <StatusMark state={status} />
              <span>{status === "running" ? "RUN" : status === "error" ? "ERR" : "OK"}</span>
            </span>
          </span>
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {status === "running" && <span className="tool-pulse" aria-hidden="true" />}
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
                    aria-label="Copy output"
                  >
                    <Copy size={11} />
                  </button>
                </div>
                <pre className="tool-pre output">
                  {output.slice(0, 6000)}
                  {output.length > 6000 ? "\n… (truncated)" : ""}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AssistantRun({
  messages,
  toolStates,
  results,
  providerNames,
}: {
  messages: ChatMessage[];
  toolStates: Record<string, ToolState>;
  results: Map<string, ToolResultInfo>;
  providerNames: Record<string, string>;
}) {
  let step = 0;

  return (
    <div className="msg assistant run">
      <div className="msg-rail">
        <span className="msg-avatar">
          <Mark size={19} />
        </span>
        <span className="msg-author">Orinos</span>
      </div>
      <div className="msg-body run-body">
        {messages.map((message) => {
          const providerName = providerNames[message.provider || ""] || "";
          const steps = (message.toolCalls || []).map((call) => {
            step += 1;
            return (
              <ToolCard
                key={call.id}
                call={call}
                step={step}
                state={toolCallResult(call, results, toolStates)}
              />
            );
          });

          return (
            <div className="run-section" key={message.id}>
              {message.reasoning && <Reasoning text={message.reasoning} />}
              {message.content && <Markdown text={message.content} />}
              {steps.length ? <div className="trace">{steps}</div> : null}
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
          );
        })}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  {
    icon: <FileCode2 size={16} />,
    title: "Build a feature",
    prompt: "Look at this workspace and build the most useful missing feature end-to-end. Verify it with real commands.",
  },
  {
    icon: <CircleAlert size={16} />,
    title: "Debug a failure",
    prompt: "Investigate what is currently broken in this workspace. Reproduce it, find the root cause, and fix it.",
  },
  {
    icon: <Search size={16} />,
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

type MessageBlock =
  | { type: "user"; message: ChatMessage }
  | { type: "run"; messages: ChatMessage[] };

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

  const blocks: MessageBlock[] = [];
  let cursor = 0;
  while (cursor < all.length) {
    const message = all[cursor];
    if (message.role === "user") {
      blocks.push({ type: "user", message });
      cursor += 1;
      continue;
    }
    if (message.role === "assistant") {
      const group: ChatMessage[] = [];
      while (cursor < all.length && all[cursor].role !== "user") {
        const entry = all[cursor];
        if (entry.role === "assistant") group.push(entry);
        cursor += 1;
      }
      blocks.push({ type: "run", messages: group });
      continue;
    }
    cursor += 1;
  }

  return (
    <div className="chat-scroll" ref={scroller} onScroll={onScroll}>
      {empty ? (
        <div className="empty-state">
          <div className="empty-grid" aria-hidden="true" />
          <div className="empty-inner">
            <div className="empty-top">
              <span className="empty-mark">
                <Mark size={22} />
              </span>
              <span className="empty-workspace">
                <span className="field-label">Workspace</span>
                <span className="mono">{shortPath(props.workspace, 64)}</span>
              </span>
              <span className="empty-register" aria-hidden="true">
                +
              </span>
            </div>

            <h1>Put it to work.</h1>
            <p>
              Orinos can read, write, run, and verify work in this directory. Pick a starting point or
              state the job directly.
            </p>

            <div className="protocol-list">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={suggestion.title}
                  className="protocol-row"
                  onClick={() => props.onSuggestion(suggestion.prompt)}
                >
                  <span className="protocol-icon">{suggestion.icon}</span>
                  <span className="protocol-copy">
                    <span className="protocol-title">
                      <span className="protocol-index" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {suggestion.title}
                    </span>
                    <span className="protocol-text">{suggestion.prompt}</span>
                  </span>
                  <ArrowUpRight className="protocol-arrow" size={16} />
                </button>
              ))}
            </div>

            <div className="empty-hint">
              <span>
                <kbd>⌘K</kbd> command palette
              </span>
              <span>
                <kbd>/</kbd> commands in terminal
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="messages">
          {blocks.map((block) => {
            if (block.type === "user") {
              return (
                <div key={block.message.id} className="msg user">
                  <div className="msg-rail">
                    <span className="msg-author">You</span>
                  </div>
                  <div className="msg-body">
                    <div className="user-bubble">
                      <Markdown text={block.message.content} />
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <AssistantRun
                key={`run-${block.messages[0].id}`}
                messages={block.messages}
                toolStates={props.toolStates}
                results={results}
                providerNames={props.providerNames}
              />
            );
          })}

          {props.live && (
            <div className="msg assistant streaming">
              <div className="msg-rail">
                <span className="msg-avatar">
                  <Mark size={19} />
                </span>
                <span className="msg-author">Orinos</span>
              </div>
              <div className="msg-body">
                {props.live.reasoning && <Reasoning text={props.live.reasoning} />}
                {props.live.text ? (
                  <>
                    <Markdown text={props.live.text} />
                    <span className="stream-cursor" aria-hidden="true" />
                  </>
                ) : (
                  <ThoughtLine label={props.status || "Thinking"} />
                )}
              </div>
            </div>
          )}

          {props.running && !props.live && (
            <div className="working-line">
              <ThoughtLine label={props.status || "Working"} />
            </div>
          )}

          {props.error && (
            <div className="error-banner" role="alert">
              <CircleAlert size={15} />
              <span>{props.error}</span>
              <button onClick={props.onDismissError} title="Dismiss" aria-label="Dismiss error">
                <X size={14} />
              </button>
            </div>
          )}

          {!props.running && all.length > 0 && (
            <div className="turn-usage">
              {formatTokens(props.usage.input)} in / {formatTokens(props.usage.output)} out
              {props.usage.cost ? ` / ${formatCost(props.usage.cost)}` : ""}
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [value, setValue] = useState(title);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => setValue(title), [title]);

  return (
    <header className="chat-header drag-region">
      <div className="chat-header-left no-drag">
        {sidebarHidden && (
          <button className="icon-btn reveal-sidebar" onClick={onToggleSidebar} title="Show sidebar" aria-label="Show sidebar">
            <PanelLeftOpen size={16} />
          </button>
        )}
        <div className="title-stack">
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
              aria-label="Chat title"
            />
          ) : (
            <button className="chat-title" onClick={() => setEditing(true)} title="Rename chat">
              {title}
              {running && <span className="title-running" aria-label="Running" />}
            </button>
          )}
          <div className="chat-subtitle">
            <span className={`run-state ${running ? "busy" : "ready"}`}>
              <span className="status-dot" />
              {running ? "Running" : "Ready"}
            </span>
            <span className="sep">/</span>
            <span>{providerName}</span>
            <span className="sep">/</span>
            <span className="mono">{model.split("/").pop()}</span>
            <span className="sep">/</span>
            <span className="mono subtitle-workspace">{shortPath(workspace, 38)}</span>
          </div>
        </div>
      </div>
      <div className="chat-header-actions no-drag">
        <button className="header-btn" onClick={onOpenPalette} title="Command palette (⌘K)">
          <Command size={12} />
          <span>Commands</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="header-menu-anchor">
          <button
            className="icon-btn"
            onClick={() => setMenuOpen((v) => !v)}
            title="More actions"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <HeaderMenu
              onClose={closeMenu}
              onOpenTerminal={onOpenTerminal}
              onOpenSkills={onOpenSkills}
              onOpenSettings={onOpenSettings}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderMenu({
  onClose,
  onOpenTerminal,
  onOpenSkills,
  onOpenSettings,
}: {
  onClose: () => void;
  onOpenTerminal: () => void;
  onOpenSkills: () => void;
  onOpenSettings: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>(".menu-item")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = (next: () => void) => {
    next();
    onClose();
  };

  return (
    <>
      <div className="popover-shade" onClick={onClose} />
      <div ref={ref} className="menu header-menu" role="menu" aria-label="More actions">
        <button
          role="menuitem"
          className="menu-item"
          onClick={() => run(onOpenTerminal)}
          title="Toggle the terminal drawer"
        >
          <Terminal size={15} />
          <span>Terminal</span>
          <kbd>⌘J</kbd>
        </button>
        <button role="menuitem" className="menu-item" onClick={() => run(onOpenSkills)} title="Browse installed skills">
          <BookOpen size={15} />
          <span>Skills</span>
        </button>
        <button role="menuitem" className="menu-item" onClick={() => run(onOpenSettings)} title="Provider keys, approvals, theme">
          <Wrench size={15} />
          <span>Settings</span>
          <kbd>⌘,</kbd>
        </button>
      </div>
    </>
  );
}
