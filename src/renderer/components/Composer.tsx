import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Cpu,
  FileText,
  Folder,
  KeyRound,
  Paperclip,
  Search,
  ShieldAlert,
  ShieldCheck,
  Square,
  Terminal,
  X,
} from "lucide-react";
import type { ProviderInfo } from "../../core/types";
import { formatTokens, shortPath } from "../lib";
import type { Selection } from "../ui-types";

interface ComposerProps {
  value: string;
  setValue: (value: string) => void;
  onSend: () => void;
  running: boolean;
  onStop: () => void;
  selection: Selection;
  providers: ProviderInfo[];
  keyed: Set<string>;
  onSelectModel: (provider: string, model: string) => void;
  attachments: string[];
  onAttach: () => void;
  onRemoveAttachment: (path: string) => void;
  workspace: string;
  autoApprove: boolean;
  onToggleAuto: () => void;
  missingKeyProvider: string | null;
  onOpenSettings: () => void;
  onOpenTerminal: () => void;
  contextMax?: number;
}

export function Composer(props: ComposerProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const provider = props.providers.find((p) => p.id === props.selection.provider);
  const model = provider?.models.find((m) => m.id === props.selection.model);
  const context = model?.context;
  const local = /localhost|127\.0\.0\.1/.test(provider?.api || "");

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [props.value]);

  useEffect(() => {
    if (pickerOpen) setTimeout(() => searchRef.current?.focus(), 30);
    else setQuery("");
  }, [pickerOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: Array<{ provider: ProviderInfo; modelId: string; modelName: string; context?: number }> = [];
    const providers = [...props.providers].sort((a, b) => {
      const ak = props.keyed.has(a.id) ? 0 : 1;
      const bk = props.keyed.has(b.id) ? 0 : 1;
      if (ak !== bk) return ak - bk;
      return a.name.localeCompare(b.name);
    });
    for (const p of providers) {
      if (
        q &&
        !p.id.toLowerCase().includes(q) &&
        !p.name.toLowerCase().includes(q) &&
        !p.models.some((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      ) {
        continue;
      }
      for (const m of p.models) {
        if (q && !p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) {
          if (!m.id.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q)) continue;
        }
        list.push({ provider: p, modelId: m.id, modelName: m.name, context: m.context });
        if (list.length >= 120) break;
      }
      if (list.length >= 120) break;
    }
    return list;
  }, [props.providers, props.keyed, query]);

  const grouped = useMemo(() => {
    const groups: Array<{ provider: ProviderInfo; items: typeof results }> = [];
    for (const row of results) {
      let group = groups.find((g) => g.provider.id === row.provider.id);
      if (!group) {
        group = { provider: row.provider, items: [] };
        groups.push(group);
      }
      group.items.push(row);
    }
    return groups;
  }, [results]);

  const canSend = Boolean(props.value.trim()) && !props.running;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) props.onSend();
    }
  };

  return (
    <div className="composer-wrap">
      {props.missingKeyProvider && (
        <button className="key-warning" onClick={props.onOpenSettings}>
          <KeyRound size={14} />
          <span>
            No API key for <strong>{props.missingKeyProvider}</strong>. Add one to start chatting.
          </span>
          <span className="key-warning-cta">Open settings</span>
        </button>
      )}

      <div className={`composer ${props.running ? "busy" : ""}`}>
        {props.attachments.length > 0 && (
          <div className="attachments">
            {props.attachments.map((path) => (
              <span key={path} className="attachment-chip">
                <FileText size={12} />
                <span>{path.split("/").pop()}</span>
                <button onClick={() => props.onRemoveAttachment(path)} title="Remove">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={textarea}
          value={props.value}
          onChange={(e) => props.setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={props.running ? "Orinos is working…" : "Ask Orinos to build, debug, or research anything…"}
          rows={1}
          spellCheck={false}
          disabled={props.running}
        />
        <div className="composer-bar">
          <div className="composer-left">
            <button
              className="model-chip"
              onClick={() => setPickerOpen((v) => !v)}
              title="Change model"
            >
              <span className={`status-dot ${props.keyed.has(props.selection.provider) || local ? "ok" : "warn"}`} />
              <span className="model-chip-name">{props.selection.model.split("/").pop()}</span>
              <span className="model-chip-provider">{provider?.name || props.selection.provider}</span>
              <ChevronDown size={12} />
            </button>

            {pickerOpen && (
              <>
                <div className="popover-shade" onClick={() => setPickerOpen(false)} />
                <div className="model-popover">
                  <div className="model-search">
                    <Search size={14} />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search 200+ providers and 8,900+ models…"
                      onKeyDown={(e) => e.key === "Escape" && setPickerOpen(false)}
                    />
                    <kbd>esc</kbd>
                  </div>
                  <div className="model-results">
                    {grouped.length === 0 && <div className="model-empty">No models match “{query}”.</div>}
                    {grouped.map((group) => (
                      <div key={group.provider.id}>
                        <div className="model-group">
                          <span>{group.provider.name}</span>
                          {props.keyed.has(group.provider.id) ? (
                            <span className="model-key ok">key</span>
                          ) : (
                            <span className="model-key">no key</span>
                          )}
                          {!group.provider.api && <span className="model-key warn">no endpoint</span>}
                        </div>
                        {group.items.map((row) => {
                          const active =
                            row.provider.id === props.selection.provider && row.modelId === props.selection.model;
                          return (
                            <button
                              key={`${row.provider.id}/${row.modelId}`}
                              className={`model-row ${active ? "active" : ""}`}
                              onClick={() => {
                                props.onSelectModel(row.provider.id, row.modelId);
                                setPickerOpen(false);
                              }}
                            >
                              <span className="model-row-name">{row.modelName}</span>
                              {row.context ? (
                                <span className="model-row-ctx">{formatTokens(row.context)}</span>
                              ) : null}
                              {active && <Check size={13} />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="model-footer">
                    <span>{props.providers.length} providers · {props.providers.reduce((n, p) => n + p.models.length, 0).toLocaleString()} models</span>
                    <span>via models.dev</span>
                  </div>
                </div>
              </>
            )}

            <button className="composer-icon" onClick={props.onAttach} title="Attach files">
              <Paperclip size={15} />
            </button>
            <span className="composer-workspace" title={props.workspace}>
              <Folder size={12} />
              {shortPath(props.workspace, 26)}
            </span>
            <button className="composer-icon" onClick={props.onOpenTerminal} title="Terminal">
              <Terminal size={15} />
            </button>
            <button
              className={`auto-chip ${props.autoApprove ? "on" : ""}`}
              onClick={props.onToggleAuto}
              title={props.autoApprove ? "Tools run without asking" : "Risky tools ask for approval"}
            >
              {props.autoApprove ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              <span>{props.autoApprove ? "auto" : "ask"}</span>
            </button>
          </div>
          <div className="composer-right">
            {context ? <span className="composer-context">{formatTokens(context)} ctx</span> : null}
            {props.running ? (
              <button className="send-btn stop" onClick={props.onStop} title="Stop">
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button className={`send-btn ${canSend ? "ready" : ""}`} onClick={props.onSend} disabled={!canSend} title="Send">
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="composer-hint">
        <span><kbd>↵</kbd> send</span>
        <span><kbd>⇧↵</kbd> newline</span>
        <span><kbd>⌘K</kbd> commands</span>
        <span className="composer-hint-right">
          <Cpu size={12} /> {provider?.kind === "anthropic" ? "Anthropic API" : provider?.kind === "google" ? "Google API" : "OpenAI-compatible"}
        </span>
      </div>
    </div>
  );
}
