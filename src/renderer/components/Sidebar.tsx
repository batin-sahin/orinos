import { useRef, useState } from "react";
import {
  BookOpen,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import type { SessionSummary } from "../../core/types";
import { formatRelative, groupSessions } from "../lib";

interface SidebarProps {
  sessions: SessionSummary[];
  currentId: string | null;
  keyedCount: number;
  skillCount: number;
  version: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onSkills: () => void;
  onSettings: () => void;
  onCollapse: () => void;
}

export function Orb({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="orb" aria-hidden>
      <defs>
        <linearGradient id="orb-ring" x1="6" y1="6" x2="58" y2="58">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="orb-core" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ede9fe" />
          <stop offset="0.45" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#312e81" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="27" fill="none" stroke="url(#orb-ring)" strokeWidth="1.6" opacity="0.55" />
      <ellipse cx="32" cy="32" rx="29" ry="12" fill="none" stroke="url(#orb-ring)" strokeWidth="1.1" opacity="0.4" transform="rotate(-28 32 32)" />
      <circle cx="32" cy="32" r="13" fill="url(#orb-core)" />
      <circle cx="27" cy="27" r="3.2" fill="#f5f3ff" opacity="0.8" />
      <circle cx="47" cy="23" r="2.1" fill="#22d3ee" />
    </svg>
  );
}

export function Sidebar(props: SidebarProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = props.sessions.filter(
    (s) =>
      !query.trim() ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.model.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = groupSessions(filtered);

  const startRename = (session: SessionSummary) => {
    setEditingId(session.id);
    setEditingTitle(session.title);
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const commitRename = () => {
    if (editingId && editingTitle.trim()) props.onRename(editingId, editingTitle.trim());
    setEditingId(null);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-drag" />
      <div className="brand">
        <Orb size={30} />
        <div className="brand-text">
          <span className="brand-name">Orinos</span>
          <span className="brand-tag">agent harness</span>
        </div>
        <button className="icon-btn sidebar-collapse" onClick={props.onCollapse} title="Hide sidebar">
          <PanelLeftClose size={16} />
        </button>
      </div>

      <button className="new-chat" onClick={props.onNew}>
        <Plus size={16} />
        <span>New chat</span>
        <kbd>⌘N</kbd>
      </button>

      <div className="sidebar-search">
        <Search size={14} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          spellCheck={false}
        />
      </div>

      <div className="session-scroll">
        {groups.length === 0 && (
          <div className="session-empty">
            <MessageSquare size={18} />
            <span>{query ? "No matching chats" : "No chats yet"}</span>
          </div>
        )}
        {groups.map((group) => (
          <div key={group.label} className="session-group">
            <div className="session-group-label">{group.label}</div>
            {group.items.map((session) => (
              <div
                key={session.id}
                className={`session-item ${session.id === props.currentId ? "active" : ""}`}
                onClick={() => props.onSelect(session.id)}
                onDoubleClick={() => startRename(session)}
                title={session.title}
              >
                <div className="session-item-main">
                  {editingId === session.id ? (
                    <input
                      ref={inputRef}
                      className="session-rename"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingId(null);
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="session-title">{session.title}</span>
                      <span className="session-meta">
                        {formatRelative(session.updatedAt)} · {session.model.split("/").pop()}
                      </span>
                    </>
                  )}
                </div>
                {editingId !== session.id && (
                  <button
                    className="session-delete"
                    title="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onDelete(session.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="footer-btn" onClick={props.onSkills}>
          <BookOpen size={15} />
          <span>Skills</span>
          <span className="footer-count">{props.skillCount}</span>
        </button>
        <button className="footer-btn" onClick={props.onSettings}>
          <Settings size={15} />
          <span>Settings</span>
          <kbd>⌘,</kbd>
        </button>
        <div className="sidebar-status">
          <span className={`status-dot ${props.keyedCount ? "ok" : "warn"}`} />
          <span>{props.keyedCount ? `${props.keyedCount} provider${props.keyedCount === 1 ? "" : "s"} ready` : "No API key yet"}</span>
          <span className="sidebar-version">v{props.version}</span>
        </div>
      </div>
    </aside>
  );
}
