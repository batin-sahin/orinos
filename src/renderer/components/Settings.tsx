import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Folder,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type { AppConfig, ProviderInfo } from "../../core/types";
import { formatTokens } from "../lib";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  config: AppConfig;
  providers: ProviderInfo[];
  keyed: Set<string>;
  stats: { providers: number; models: number; generatedAt: string };
  version: string;
  home: string;
  onUpdateConfig: (patch: Partial<AppConfig>) => Promise<void>;
  onSaveKey: (providerId: string, key: string) => Promise<void>;
  onRemoveKey: (providerId: string) => Promise<void>;
  onAddCustomProvider: (input: {
    name: string;
    api: string;
    kind?: string;
    keyEnv?: string;
    models?: string[];
  }) => Promise<void>;
  onRemoveCustomProvider: (id: string) => Promise<void>;
}

type Tab = "general" | "providers" | "about";

const THEMES = [
  { id: "midnight", label: "Midnight", colors: ["#8b5cf6", "#22d3ee"] },
  { id: "ocean", label: "Ocean", colors: ["#0ea5e9", "#2dd4bf"] },
  { id: "ember", label: "Ember", colors: ["#f97316", "#f43f5e"] },
  { id: "forest", label: "Forest", colors: ["#22c55e", "#a3e635"] },
];

export function Settings(props: SettingsProps) {
  const [tab, setTab] = useState<Tab>("general");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [workspaceDraft, setWorkspaceDraft] = useState(props.config.workspace);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customApi, setCustomApi] = useState("");
  const [customKind, setCustomKind] = useState("openai");
  const [customKeyEnv, setCustomKeyEnv] = useState("");
  const [customModels, setCustomModels] = useState("");

  useEffect(() => {
    if (props.open) setWorkspaceDraft(props.config.workspace);
  }, [props.open, props.config.workspace]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(null), 1600);
    return () => clearTimeout(timer);
  }, [saved]);

  const currentProvider = props.providers.find((p) => p.id === props.config.provider);
  const providerModels = currentProvider?.models || [];

  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...props.providers]
      .filter((p) => !q || p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const ak = props.keyed.has(a.id) ? 0 : 1;
        const bk = props.keyed.has(b.id) ? 0 : 1;
        if (ak !== bk) return ak - bk;
        if (a.custom !== b.custom) return a.custom ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [props.providers, props.keyed, query]);

  const flash = (label: string) => setSaved(label);

  const saveKey = async (providerId: string) => {
    const value = (keyInputs[providerId] || "").trim();
    if (!value) return;
    await props.onSaveKey(providerId, value);
    setKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
    flash("Key saved");
  };

  const addCustom = async () => {
    if (!customName.trim() || !customApi.trim()) return;
    await props.onAddCustomProvider({
      name: customName.trim(),
      api: customApi.trim(),
      kind: customKind,
      keyEnv: customKeyEnv.trim() || undefined,
      models: customModels
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setCustomName("");
    setCustomApi("");
    setCustomKeyEnv("");
    setCustomModels("");
    setCustomOpen(false);
    flash("Provider added");
  };

  if (!props.open) return null;

  return (
    <div className="modal-shade" onMouseDown={props.onClose}>
      <div className="modal settings-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>Settings</h2>
            <p>Configuration lives in <span className="mono">{props.home}</span></p>
          </div>
          <button className="icon-btn" onClick={props.onClose} title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="settings-layout">
          <nav className="settings-tabs">
            <button className={tab === "general" ? "active" : ""} onClick={() => setTab("general")}>
              General
            </button>
            <button className={tab === "providers" ? "active" : ""} onClick={() => setTab("providers")}>
              Providers
              <span className="tab-count">{props.providers.length}</span>
            </button>
            <button className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}>
              About
            </button>
            {saved && <span className="settings-saved"><Check size={12} /> {saved}</span>}
          </nav>

          <div className="settings-body">
            {tab === "general" && (
              <div className="settings-section">
                <div className="section-title">Model</div>
                <div className="field-row">
                  <label>Default provider</label>
                  <select
                    value={props.config.provider}
                    onChange={async (e) => {
                      const provider = props.providers.find((p) => p.id === e.target.value);
                      const model = provider?.models.find((m) => m.toolCall)?.id || provider?.models[0]?.id || "";
                      await props.onUpdateConfig({ provider: e.target.value, model });
                      flash("Model updated");
                    }}
                  >
                    {props.providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {props.keyed.has(p.id) ? "●" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-row">
                  <label>Default model</label>
                  <select
                    value={props.config.model}
                    onChange={async (e) => {
                      await props.onUpdateConfig({ model: e.target.value });
                      flash("Model updated");
                    }}
                  >
                    {providerModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                {currentProvider && (
                  <div className="field-note">
                    {currentProvider.api || "No endpoint in catalog"} · {providerModels.length} models ·{" "}
                    {props.keyed.has(currentProvider.id) ? "key configured" : "no key"}
                  </div>
                )}

                <div className="section-title">Workspace</div>
                <div className="field-row">
                  <label>Working directory</label>
                  <div className="input-group">
                    <input
                      value={workspaceDraft}
                      onChange={(e) => setWorkspaceDraft(e.target.value)}
                      spellCheck={false}
                    />
                    <button
                      className="btn small"
                      onClick={async () => {
                        const dir = await window.orinos.chooseDirectory();
                        if (dir) {
                          setWorkspaceDraft(dir);
                          await props.onUpdateConfig({ workspace: dir });
                          flash("Workspace updated");
                        }
                      }}
                    >
                      <Folder size={13} /> Browse
                    </button>
                  </div>
                </div>
                <div className="field-actions">
                  <button
                    className="btn primary small"
                    disabled={!workspaceDraft.trim() || workspaceDraft === props.config.workspace}
                    onClick={async () => {
                      await props.onUpdateConfig({ workspace: workspaceDraft.trim() });
                      flash("Workspace updated");
                    }}
                  >
                    Save workspace
                  </button>
                  <span className="field-note">New chats use this directory. Existing chats keep theirs.</span>
                </div>

                <div className="section-title">Agent</div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Auto-approve tools</div>
                    <div className="toggle-note">
                      When off, terminal commands and file writes ask for approval first.
                    </div>
                  </div>
                  <button
                    className={`switch ${props.config.autoApprove ? "on" : ""}`}
                    onClick={async () => {
                      await props.onUpdateConfig({ autoApprove: !props.config.autoApprove });
                      flash("Saved");
                    }}
                  >
                    <span />
                  </button>
                </div>
                <div className="field-row">
                  <label>Temperature</label>
                  <div className="input-group">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={props.config.temperature}
                      style={{ "--range-progress": `${(props.config.temperature / 2) * 100}%` } as React.CSSProperties}
                      onChange={(e) => props.onUpdateConfig({ temperature: Number(e.target.value) })}
                    />
                    <span className="range-value">{props.config.temperature.toFixed(1)}</span>
                  </div>
                </div>
                <div className="field-row">
                  <label>Max steps per turn</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={props.config.maxSteps}
                    onChange={(e) => props.onUpdateConfig({ maxSteps: Number(e.target.value) })}
                  />
                </div>

                <div className="section-title">Web search</div>
                <div className="field-row">
                  <label>Provider</label>
                  <select
                    value={props.config.webSearch?.provider || "duckduckgo"}
                    onChange={(e) =>
                      props.onUpdateConfig({
                        webSearch: { ...(props.config.webSearch || {}), provider: e.target.value as any },
                      })
                    }
                  >
                    <option value="duckduckgo">DuckDuckGo (no key)</option>
                    <option value="brave">Brave Search</option>
                    <option value="searxng">SearXNG (self-hosted)</option>
                  </select>
                </div>
                {props.config.webSearch?.provider === "brave" && (
                  <div className="field-row">
                    <label>Brave API key</label>
                    <input
                      type="password"
                      value={props.config.webSearch?.apiKey || ""}
                      onChange={(e) =>
                        props.onUpdateConfig({
                          webSearch: { ...(props.config.webSearch || { provider: "brave" }), provider: "brave", apiKey: e.target.value },
                        })
                      }
                      placeholder="BSA…"
                    />
                  </div>
                )}
                {props.config.webSearch?.provider === "searxng" && (
                  <div className="field-row">
                    <label>SearXNG URL</label>
                    <input
                      value={props.config.webSearch?.url || ""}
                      onChange={(e) =>
                        props.onUpdateConfig({
                          webSearch: { ...(props.config.webSearch || { provider: "searxng" }), provider: "searxng", url: e.target.value },
                        })
                      }
                      placeholder="https://searx.example.com"
                    />
                  </div>
                )}

                <div className="section-title">Theme</div>
                <div className="theme-grid">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      className={`theme-swatch ${props.config.theme === theme.id ? "active" : ""}`}
                      onClick={async () => {
                        await props.onUpdateConfig({ theme: theme.id });
                        flash("Theme updated");
                      }}
                    >
                      <span
                        className="theme-dot"
                        style={{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` }}
                      />
                      {theme.label}
                      {props.config.theme === theme.id && <Check size={12} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "providers" && (
              <div className="settings-section">
                <div className="providers-toolbar">
                  <div className="settings-search">
                    <Search size={14} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Search ${props.providers.length} providers…`}
                      spellCheck={false}
                    />
                  </div>
                  <button className="btn small" onClick={() => setCustomOpen((v) => !v)}>
                    <Plus size={13} /> Custom provider
                  </button>
                </div>

                {customOpen && (
                  <div className="custom-form">
                    <div className="custom-form-grid">
                      <label>
                        Name
                        <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="My gateway" />
                      </label>
                      <label>
                        Base URL
                        <input
                          value={customApi}
                          onChange={(e) => setCustomApi(e.target.value)}
                          placeholder="https://api.example.com/v1"
                          spellCheck={false}
                        />
                      </label>
                      <label>
                        API format
                        <select value={customKind} onChange={(e) => setCustomKind(e.target.value)}>
                          <option value="openai">OpenAI-compatible</option>
                          <option value="anthropic">Anthropic Messages</option>
                          <option value="google">Google Gemini</option>
                        </select>
                      </label>
                      <label>
                        Key env var (optional)
                        <input
                          value={customKeyEnv}
                          onChange={(e) => setCustomKeyEnv(e.target.value)}
                          placeholder="MY_GATEWAY_API_KEY"
                          spellCheck={false}
                        />
                      </label>
                    </div>
                    <label className="custom-models">
                      Models (comma or newline separated)
                      <textarea
                        value={customModels}
                        onChange={(e) => setCustomModels(e.target.value)}
                        rows={2}
                        placeholder="model-id-a, model-id-b"
                        spellCheck={false}
                      />
                    </label>
                    <div className="field-actions">
                      <button className="btn primary small" onClick={addCustom} disabled={!customName.trim() || !customApi.trim()}>
                        Add provider
                      </button>
                      <button className="btn small" onClick={() => setCustomOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="provider-list">
                  {filteredProviders.map((provider) => {
                    const isOpen = expanded === provider.id;
                    const keyed = props.keyed.has(provider.id);
                    return (
                      <div key={provider.id} className={`provider-row ${isOpen ? "open" : ""}`}>
                        <button className="provider-head" onClick={() => setExpanded(isOpen ? null : provider.id)}>
                          <span className={`status-dot ${keyed ? "ok" : "warn"}`} />
                          <span className="provider-name">{provider.name}</span>
                          <span className="provider-id">{provider.id}</span>
                          {provider.custom && <span className="badge">custom</span>}
                          <span className="provider-count">{provider.models.length} models</span>
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {isOpen && (
                          <div className="provider-body">
                            <div className="provider-meta">
                              <span>Endpoint</span>
                              <code>{provider.api || "not in catalog — use a custom provider"}</code>
                            </div>
                            <div className="provider-meta">
                              <span>Expected env</span>
                              <code>{provider.keyEnv || provider.env.join(", ") || "—"}</code>
                            </div>
                            {provider.doc && (
                              <button
                                className="link-btn"
                                onClick={() => window.orinos.openExternal(provider.doc!)}
                              >
                                Provider docs <ExternalLink size={11} />
                              </button>
                            )}
                            <div className="provider-key-row">
                              <input
                                type="password"
                                value={keyInputs[provider.id] || ""}
                                onChange={(e) =>
                                  setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))
                                }
                                placeholder={keyed ? "Key configured — enter a new one to replace" : "Paste API key"}
                                spellCheck={false}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void saveKey(provider.id);
                                }}
                              />
                              <button
                                className="btn primary small"
                                onClick={() => saveKey(provider.id)}
                                disabled={!keyInputs[provider.id]?.trim()}
                              >
                                <KeyRound size={12} /> Save key
                              </button>
                              {keyed && (
                                <button
                                  className="btn small danger"
                                  onClick={async () => {
                                    await props.onRemoveKey(provider.id);
                                    flash("Key removed");
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                              {provider.custom && (
                                <button
                                  className="btn small danger"
                                  onClick={async () => {
                                    await props.onRemoveCustomProvider(provider.id);
                                    flash("Provider removed");
                                  }}
                                >
                                  <Trash2 size={12} /> Remove provider
                                </button>
                              )}
                            </div>
                            <div className="field-note">
                              Keys are stored in <span className="mono">~/.orinos/config.json</span> with 0600
                              permissions. Environment variables are used automatically when no stored key exists.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredProviders.length === 0 && (
                    <div className="model-empty">No providers match “{query}”.</div>
                  )}
                </div>
              </div>
            )}

            {tab === "about" && (
              <div className="settings-section about">
                <div className="about-head">
                  <div className="about-orb">
                    <span />
                  </div>
                  <div>
                    <h3>Orinos</h3>
                    <p>v{props.version} · AI agent harness</p>
                  </div>
                </div>
                <div className="about-grid">
                  <div>
                    <span>Providers</span>
                    <strong>{statsText(props.stats.providers)}</strong>
                  </div>
                  <div>
                    <span>Models</span>
                    <strong>{statsText(props.stats.models)}</strong>
                  </div>
                  <div>
                    <span>Catalog</span>
                    <strong>{props.stats.generatedAt.slice(0, 10)}</strong>
                  </div>
                  <div>
                    <span>Config</span>
                    <strong className="mono">{props.home}</strong>
                  </div>
                </div>
                <div className="section-title">Shortcuts</div>
                <div className="shortcut-list">
                  <div><kbd>⌘N</kbd> New chat</div>
                  <div><kbd>⌘K</kbd> Command palette</div>
                  <div><kbd>⌘,</kbd> Settings</div>
                  <div><kbd>↵</kbd> Send message</div>
                  <div><kbd>⇧↵</kbd> New line</div>
                  <div><kbd>Esc</kbd> Close overlay</div>
                </div>
                <div className="section-title">Under the hood</div>
                <p className="about-text">
                  TypeScript core shared by the terminal CLI and the Electron app. Streaming adapters for
                  OpenAI-compatible, Anthropic and Google APIs. Native tool calling, a markdown skill system, and
                  SQLite-free JSON session storage. Provider catalog from{" "}
                  <button className="link-btn" onClick={() => window.orinos.openExternal("https://models.dev")}>
                    models.dev <ExternalLink size={11} />
                  </button>
                  .
                </p>
                <div className="about-footer">
                  <ShieldCheck size={13} /> Everything runs locally. Keys never leave your machine except to the
                  provider you choose.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function statsText(n: number): string {
  return n ? formatTokens(n) : "0";
}
