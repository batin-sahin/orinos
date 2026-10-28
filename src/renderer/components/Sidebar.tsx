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
import { Mark } from "./Brand";

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
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar-drag" />
      <div className="brand">
        <span className="brand-mark">
          <Mark size={25} />
        </span>
        <div className="brand-text">
          <span className="brand-name">Orinos</span>
          <span className="brand-tag">agent harness</span>
        </div>
        <button className="icon-btn sidebar-collapse" onClick={props.onCollapse} title="Hide sidebar" aria-label="Hide sidebar">
          <PanelLeftClose size={16} />
        </button>
      </div>

      <button className="new-chat" onClick={props.onNew}>
        <Plus size={16} strokeWidth={2.2} />
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
          aria-label="Search chats"
        />
      </div>

      <div className="session-scroll">
        {groups.length === 0 && (
          <div className="session-empty">
            <MessageSquare size={16} />
            <span>{query ? "No matching chats" : "No chats yet"}</span>
          </div>
        )}
        {groups.map((group) => (
          <div key={group.label} className="session-group">
            <div className="session-group-label">{group.label}</div>
            {group.items.map((session) => {
              const active = session.id === props.currentId;
              return (
                <div key={session.id} className={`session-item ${active ? "active" : ""}`}>
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
                      aria-label="Rename chat"
                    />
                  ) : (
                    <button
                      className="session-open"
                      onClick={() => props.onSelect(session.id)}
                      onDoubleClick={() => startRename(session)}
                      title={session.title}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="session-item-main">
                        <span className="session-title">{session.title}</span>
                        <span className="session-meta">
                          {formatRelative(session.updatedAt)} <span aria-hidden="true">/</span>{" "}
                          {session.model.split("/").pop()}
                        </span>
                      </span>
                      {active && <span className="session-current" aria-label="Current chat" />}
                    </button>
                  )}
                  {editingId !== session.id && (
                    <button
                      className="session-delete"
                      title="Delete chat"
                      aria-label={`Delete ${session.title}`}
                      onClick={() => props.onDelete(session.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="footer-actions">
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
        </div>
        <div className="sidebar-status">
          <span className={`status-dot ${props.keyedCount ? "ok" : "warn"}`} />
          <span>
            {props.keyedCount
              ? `${props.keyedCount} provider${props.keyedCount === 1 ? "" : "s"} ready`
              : "No API key yet"}
          </span>
          <span className="sidebar-version">v{props.version}</span>
        </div>
      </div>
    </aside>
  );
}
