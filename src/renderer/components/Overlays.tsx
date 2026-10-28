import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Command,
  Cpu,
  MessageSquare,
  ShieldAlert,
  Square,
  Terminal,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import type { ApprovalRequest, ProviderInfo, SessionSummary, SkillSummary } from "../../core/types";
import { formatRelative, parseArgs, renderMarkdown, shortPath } from "../lib";
import { useFocusTrap } from "../useFocusTrap";
import { LatticeLoader, StatusMark } from "./Motion";

export function SkillsPanel({
  open,
  skills,
  onClose,
}: {
  open: boolean;
  skills: SkillSummary[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<SkillSummary | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, modalRef, ".skill-item");

  useEffect(() => {
    if (!open) return;
    const first = selected && skills.find((s) => s.name === selected.name) ? selected : skills[0];
    if (first) void load(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, skills.length]);

  async function load(skill: SkillSummary) {
    setSelected(skill);
    setLoading(true);
    try {
      const full = await window.orinos.getSkill(skill.name);
      setContent(full?.content || "Skill not found.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  return (
    <div className="modal-shade" onMouseDown={onClose}>
      <div
        ref={modalRef}
        className="modal skills-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Skills"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h2>Skills</h2>
            <p>Instruction packs Orinos loads when a task matches. Drop your own into ~/.orinos/skills.</p>
          </div>
          <div className="modal-head-side">
            <span className="modal-count mono">{String(skills.length).padStart(2, "0")} PACKS</span>
            <button className="icon-btn" onClick={onClose} title="Close skills" aria-label="Close skills">
              <X size={16} />
            </button>
          </div>
        </header>
        <div className="skills-layout">
          <div className="skills-list" role="list">
            {skills.map((skill) => (
              <button
                key={skill.name}
                className={`skill-item ${selected?.name === skill.name ? "active" : ""}`}
                onClick={() => load(skill)}
                aria-current={selected?.name === skill.name ? "true" : undefined}
              >
                <BookOpen size={14} />
                <span className="skill-item-main">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-desc">{skill.description}</span>
                </span>
                <span className={`skill-source ${skill.source}`}>{skill.source}</span>
              </button>
            ))}
            {!skills.length && <div className="model-empty">No skills installed.</div>}
          </div>
          <div className="skill-detail">
            {selected ? (
              <>
                <div className="skill-detail-head">
                  <div>
                    <h3>{selected.name}</h3>
                    <div className="skill-tags">
                      {selected.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                      <span className={`skill-source ${selected.source}`}>{selected.source}</span>
                    </div>
                  </div>
                </div>
                {loading ? (
                  <div className="model-empty loading-row">
                    <LatticeLoader />
                    <span>Loading pack</span>
                  </div>
                ) : (
                  <div
                    className="skill-content markdown"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                )}
              </>
            ) : (
              <div className="model-empty">Select a skill.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
}

interface PaletteProps {
  open: boolean;
  onClose: () => void;
  sessions: SessionSummary[];
  providers: ProviderInfo[];
  keyed: Set<string>;
  actions: PaletteAction[];
  onOpenSession: (id: string) => void;
  onSelectModel: (provider: string, model: string) => void;
}

type PaletteItem =
  | { type: "action"; id: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void }
  | { type: "session"; id: string; label: string; hint: string }
  | { type: "model"; id: string; label: string; hint: string; provider: string; model: string };

export function CommandPalette(props: PaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(props.open, modalRef, "input");

  useEffect(() => {
    if (props.open) {
      setQuery("");
      setActive(0);
    }
  }, [props.open]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const out: PaletteItem[] = [];

    for (const action of props.actions) {
      if (q && !action.label.toLowerCase().includes(q) && !(action.hint || "").toLowerCase().includes(q)) continue;
      out.push({ type: "action", ...action });
      if (out.length >= 6) break;
    }

    let models = 0;
    for (const provider of props.providers) {
      for (const model of provider.models) {
        if (models >= 10) break;
        if (
          q &&
          !provider.name.toLowerCase().includes(q) &&
          !provider.id.toLowerCase().includes(q) &&
          !model.id.toLowerCase().includes(q) &&
          !model.name.toLowerCase().includes(q)
        ) {
          continue;
        }
        out.push({
          type: "model",
          id: `model:${provider.id}/${model.id}`,
          label: model.name,
          hint: `${provider.name}${props.keyed.has(provider.id) ? " · key" : ""}`,
          provider: provider.id,
          model: model.id,
        });
        models++;
      }
      if (models >= 10) break;
    }

    const sessions = props.sessions.filter((s) => !q || s.title.toLowerCase().includes(q)).slice(0, 7);
    for (const session of sessions) {
      out.push({
        type: "session",
        id: `session:${session.id}`,
        label: session.title,
        hint: `${session.model.split("/").pop()} · ${formatRelative(session.updatedAt)}`,
      });
    }

    return out;
  }, [query, props.actions, props.providers, props.sessions, props.keyed]);

  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [items.length, active]);

  if (!props.open) return null;

  const run = (item: PaletteItem) => {
    if (item.type === "action") item.run();
    else if (item.type === "session") props.onOpenSession(item.id.replace("session:", ""));
    else props.onSelectModel(item.provider, item.model);
    props.onClose();
  };

  let lastType = "";

  return (
    <div className="modal-shade palette-shade" onMouseDown={props.onClose}>
      <div
        ref={modalRef}
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="palette-search">
          <Command size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Jump to a chat, model, or command…"
            aria-label="Search commands, chats, and models"
            onKeyDown={(e) => {
              if (e.key === "Escape") props.onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((v) => Math.min(v + 1, items.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((v) => Math.max(v - 1, 0));
              }
              if (e.key === "Enter" && items[active]) {
                e.preventDefault();
                run(items[active]);
              }
            }}
          />
          <kbd>esc</kbd>
        </div>
        <div className="palette-results">
          {items.map((item, index) => {
            const showLabel = item.type !== lastType;
            lastType = item.type;
            return (
              <div key={item.id}>
                {showLabel && (
                  <div className="palette-group">
                    {item.type === "action" ? "Actions" : item.type === "model" ? "Models" : "Chats"}
                  </div>
                )}
                <button
                  className={`palette-row ${index === active ? "active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(item)}
                >
                  <span className="palette-icon">
                    {item.type === "action" ? (
                      item.icon || <Wrench size={14} />
                    ) : item.type === "model" ? (
                      <Cpu size={14} />
                    ) : (
                      <MessageSquare size={14} />
                    )}
                  </span>
                  <span className="palette-label">{item.label}</span>
                  {item.hint && <span className="palette-hint">{item.hint}</span>}
                  {index === active && <ArrowRight size={12} />}
                </button>
              </div>
            );
          })}
          {!items.length && <div className="model-empty">Nothing matches “{query}”.</div>}
        </div>
        <div className="palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
          <span className="palette-footer-mark">ORINOS / INDEX</span>
        </div>
      </div>
    </div>
  );
}

export function ApprovalModal({
  request,
  onRespond,
}: {
  request: ApprovalRequest | null;
  onRespond: (approved: boolean) => void;
}) {
  const denyRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(!!request, modalRef, ".approval-actions .btn");

  useEffect(() => {
    if (!request) return;
    denyRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onRespond(false);
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onRespond(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [request, onRespond]);

  if (!request) return null;
  const args = parseArgs(JSON.stringify(request.args));
  return (
    <div className="modal-shade approval-shade">
      <div
        ref={modalRef}
        className="modal approval-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label="Approve tool call"
      >
        <div className="approval-flag">
          <ShieldAlert size={15} />
          <span>Approval required</span>
          <span className="approval-flag-rule" aria-hidden="true" />
          <span className="mono">HOLD</span>
        </div>
        <h2>Approve tool call?</h2>
        <p className="approval-sub">
          Orinos wants to run <strong>{request.tool}</strong> in this session.
        </p>
        <div className="approval-summary">
          <span className="field-label">Command</span>
          <code>{request.summary}</code>
        </div>
        <details className="approval-details">
          <summary>Arguments</summary>
          <pre>{JSON.stringify(args, null, 2).slice(0, 4000)}</pre>
        </details>
        <div className="approval-actions">
          <button ref={denyRef} className="btn" onClick={() => onRespond(false)}>
            Deny <kbd>esc</kbd>
          </button>
          <button className="btn primary" onClick={() => onRespond(true)}>
            Allow once <kbd>⌘↵</kbd>
          </button>
        </div>
        <div className="field-note">
          Tip: turn on auto-approve in Settings if you trust this workspace.
        </div>
      </div>
    </div>
  );
}

export function TerminalDrawer({
  open,
  onClose,
  workspace,
}: {
  open: boolean;
  onClose: () => void;
  workspace: string;
}) {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    const unsubscribe = window.orinos.onCommandOutput((payload) => {
      if (payload.runId !== runId) return;
      if (payload.stream === "exit") {
        setRunning(false);
        setOutput((prev) => `${prev}${prev.endsWith("\n") || !prev ? "" : "\n"}[exit ${payload.code}]\n`);
      } else {
        setOutput((prev) => prev + payload.data);
      }
    });
    return unsubscribe;
  }, [runId]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  if (!open) return null;

  const start = async () => {
    const cmd = command.trim();
    if (!cmd || running) return;
    const id = `run_${Date.now()}`;
    setRunId(id);
    setRunning(true);
    setOutput((prev) => `${prev}${prev ? "\n" : ""}❯ ${cmd}\n`);
    setHistory((prev) => [cmd, ...prev].slice(0, 50));
    setHistoryIndex(-1);
    setCommand("");
    const res = await window.orinos.runCommand({ runId: id, command: cmd, cwd: workspace });
    if (!res.ok) {
      setRunning(false);
      setOutput((prev) => `${prev}[failed to start]\n`);
    }
  };

  return (
    <div className="terminal-drawer" role="region" aria-label="Terminal">
      <div className="terminal-head">
        <div className="terminal-title">
          <Terminal size={14} />
          <span>Terminal</span>
          <span className="terminal-rule" aria-hidden="true" />
          <span className="mono">{shortPath(workspace, 50)}</span>
        </div>
        <div className="terminal-actions">
          <button className="icon-btn" onClick={() => setOutput("")} title="Clear output" aria-label="Clear output">
            <Trash2 size={14} />
          </button>
          {running && (
            <button
              className="icon-btn"
              onClick={() => runId && window.orinos.killCommand(runId)}
              title="Stop command"
              aria-label="Stop command"
            >
              <Square size={13} />
            </button>
          )}
          <button className="icon-btn" onClick={onClose} title="Close terminal" aria-label="Close terminal">
            <X size={15} />
          </button>
        </div>
      </div>
      <pre className="terminal-output" ref={outputRef}>
        {output || "Run a command in your workspace. Output appears here."}
      </pre>
      <div className="terminal-input-row">
        <span className="terminal-prompt" aria-hidden="true">❯</span>
        <input
          ref={inputRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void start();
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const next = Math.min(historyIndex + 1, history.length - 1);
              if (next >= 0 && history[next]) {
                setHistoryIndex(next);
                setCommand(history[next]);
              }
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = historyIndex - 1;
              setHistoryIndex(next);
              setCommand(next >= 0 ? history[next] || "" : "");
            }
            if (e.key === "Escape") onClose();
          }}
          placeholder="npm test"
          spellCheck={false}
          aria-label="Terminal command"
          disabled={running}
        />
        <button className="btn primary small" onClick={start} disabled={running || !command.trim()}>
          {running ? <LatticeLoader /> : "Run"}
        </button>
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 4200);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-mark">
        <StatusMark state="ok" />
      </span>
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification">
        <X size={12} />
      </button>
    </div>
  );
}
