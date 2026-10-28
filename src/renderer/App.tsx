import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Plus,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import type {
  AppConfig,
  ApprovalRequest,
  Bootstrap,
  ChatMessage,
  ProviderInfo,
  Session,
  SessionSummary,
  SkillSummary,
  Usage,
} from "../core/types";
import { ChatHeader, ChatView } from "./components/Chat";
import { Composer } from "./components/Composer";
import {
  ApprovalModal,
  CommandPalette,
  SkillsPanel,
  TerminalDrawer,
  Toast,
} from "./components/Overlays";
import { Settings } from "./components/Settings";
import { Sidebar } from "./components/Sidebar";
import type { LiveTurn, Selection, ToolState } from "./ui-types";

const EMPTY_USAGE: Usage = { input: 0, output: 0 };

export default function App() {
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [keyed, setKeyed] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [selection, setSelection] = useState<Selection>({ provider: "", model: "" });
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [live, setLive] = useState<LiveTurn | null>(null);
  const [turnMessages, setTurnMessages] = useState<ChatMessage[]>([]);
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({});
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage>(EMPTY_USAGE);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const selectionRef = useRef<Selection>({ provider: "", model: "" });
  const configRef = useRef<AppConfig | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const refreshSessions = useCallback(async () => {
    const list = await window.orinos.listSessions();
    setSessions(list);
  }, []);

  const applyBootstrap = useCallback((b: Bootstrap) => {
    setBoot(b);
    setConfig(b.config);
    setProviders(b.providers);
    setKeyed(new Set(b.keyedProviders));
    setSessions(b.sessions);
    setSkills(b.skills);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const b = await window.orinos.bootstrap();
        if (!mounted) return;
        applyBootstrap(b);
        let active: Session | null = null;
        if (b.sessions.length) {
          active = await window.orinos.loadSession(b.sessions[0].id);
        }
        if (!active) {
          active = await window.orinos.newSession({
            provider: b.config.provider,
            model: b.config.model,
            workspace: b.config.workspace,
          });
        }
        if (!mounted || !active) return;
        setSession(active);
        setUsage(active.usage || EMPTY_USAGE);
        setSelection({ provider: active.provider, model: active.model });
      } catch (err: any) {
        if (mounted) setFatal(err?.message || String(err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applyBootstrap]);

  useEffect(() => {
    if (config?.theme) document.documentElement.dataset.theme = config.theme;
  }, [config?.theme]);

  useEffect(() => {
    if (boot?.platform) document.documentElement.dataset.platform = boot.platform;
  }, [boot?.platform]);

  // Live agent events
  useEffect(() => {
    const unsubscribe = window.orinos.onAgentEvent(({ sessionId, event }) => {
      if (sessionRef.current?.id !== sessionId) return;
      switch (event.type) {
        case "status":
          setStatus(event.text);
          break;
        case "assistant_start":
          setLive({ id: event.id, text: "", reasoning: "", startedAt: Date.now() });
          setStatus("Thinking…");
          break;
        case "text":
          setLive((prev) =>
            prev
              ? { ...prev, text: prev.text + event.text }
              : { id: "live", text: event.text, reasoning: "", startedAt: Date.now() },
          );
          break;
        case "reasoning":
          setLive((prev) =>
            prev
              ? { ...prev, reasoning: prev.reasoning + event.text }
              : { id: "live", text: "", reasoning: event.text, startedAt: Date.now() },
          );
          break;
        case "tool_start":
          setToolStates((prev) => ({
            ...prev,
            [event.id]: {
              id: event.id,
              name: event.name,
              summary: event.summary,
              status: "running",
            },
          }));
          setStatus(`${event.name}…`);
          break;
        case "tool_end":
          setToolStates((prev) => ({
            ...prev,
            [event.id]: {
              id: event.id,
              name: event.name,
              summary: prev[event.id]?.summary || "",
              status: event.ok ? "ok" : "error",
              output: event.output,
              durationMs: event.durationMs,
            },
          }));
          setStatus("Thinking…");
          break;
        case "assistant":
          setTurnMessages((prev) => [...prev, event.message]);
          setLive(null);
          setStatus("");
          break;
        case "usage":
          setUsage(event.usage);
          break;
        case "error":
          setError(event.message);
          setStatus("");
          break;
        case "done":
          setRunning(false);
          setStatus("");
          setLive(null);
          setTurnMessages([]);
          setToolStates({});
          if (event.session) {
            setSession(event.session);
            setUsage(event.session.usage || EMPTY_USAGE);
            setSelection({ provider: event.session.provider, model: event.session.model });
          }
          void refreshSessions();
          break;
      }
    });
    return unsubscribe;
  }, [refreshSessions]);

  useEffect(() => {
    const unsubscribe = window.orinos.onApproval(({ request }) => setApproval(request));
    return unsubscribe;
  }, []);

  const newChat = useCallback(async () => {
    if (running) return;
    const cfg = configRef.current;
    if (!cfg) return;
    const sel = selectionRef.current;
    const created = await window.orinos.newSession({
      provider: sel.provider || cfg.provider,
      model: sel.model || cfg.model,
      workspace: cfg.workspace,
    });
    setSession(created);
    setUsage(EMPTY_USAGE);
    setSelection({ provider: created.provider, model: created.model });
    setDraft("");
    setAttachments([]);
    setLive(null);
    setTurnMessages([]);
    setToolStates({});
    setError(null);
    setStatus("");
    await refreshSessions();
  }, [running, refreshSessions]);

  const openSession = useCallback(
    async (id: string) => {
      if (running || id === sessionRef.current?.id) return;
      const loaded = await window.orinos.loadSession(id);
      if (!loaded) {
        setToast("Could not load that chat.");
        return;
      }
      setSession(loaded);
      setUsage(loaded.usage || EMPTY_USAGE);
      setSelection({ provider: loaded.provider, model: loaded.model });
      setDraft("");
      setAttachments([]);
      setLive(null);
      setTurnMessages([]);
      setToolStates({});
      setError(null);
      setStatus("");
    },
    [running],
  );

  useEffect(() => {
    const unsubscribe = window.orinos.onMenu(({ action }) => {
      if (action === "new-chat") void newChat();
      if (action === "settings") setSettingsOpen(true);
      if (action === "command-palette") setPaletteOpen(true);
      if (action === "toggle-sidebar") setSidebarOpen((v) => !v);
    });
    return unsubscribe;
  }, [newChat]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (mod && event.key === ",") {
        event.preventDefault();
        setSettingsOpen(true);
      } else if (event.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (skillsOpen) setSkillsOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, skillsOpen, settingsOpen]);

  const updateConfig = useCallback(async (patch: Partial<AppConfig>) => {
    const next = await window.orinos.setConfig(patch);
    setConfig(next);
    if (patch.provider && patch.model) {
      setSelection({ provider: next.provider, model: next.model });
    }
  }, []);

  const selectModel = useCallback(async (provider: string, model: string) => {
    setSelection({ provider, model });
    const cfg = configRef.current;
    const recent = [`${provider}/${model}`, ...(cfg?.recentModels || []).filter((r) => r !== `${provider}/${model}`)].slice(0, 16);
    const next = await window.orinos.setConfig({ provider, model, recentModels: recent });
    setConfig(next);
    setToast(`Model → ${model.split("/").pop()}`);
  }, []);

  const send = useCallback(async () => {
    const active = sessionRef.current;
    const cfg = configRef.current;
    if (!active || !cfg || running) return;
    const content = draft.trim();
    if (!content) return;
    const sel = selectionRef.current;
    const userMessage: ChatMessage = {
      id: `local_${Date.now()}`,
      role: "user",
      content,
      createdAt: Date.now(),
    };
    setSession((prev) => (prev ? { ...prev, messages: [...prev.messages, userMessage] } : prev));
    setDraft("");
    const files = attachments;
    setAttachments([]);
    setRunning(true);
    setError(null);
    setLive(null);
    setTurnMessages([]);
    setToolStates({});
    setStatus("Thinking…");

    const result = await window.orinos.sendMessage({
      sessionId: active.id,
      text: content,
      provider: sel.provider,
      model: sel.model,
      attachments: files,
    });
    if (!result.ok) {
      setRunning(false);
      setStatus("");
      setError(result.error || "Could not send the message.");
      setSession((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== userMessage.id) } : prev,
      );
      setDraft(content);
      setAttachments(files);
    }
  }, [draft, attachments, running]);

  const stop = useCallback(() => {
    const active = sessionRef.current;
    if (!active) return;
    setStatus("Stopping…");
    void window.orinos.abort(active.id);
  }, []);

  const deleteChat = useCallback(
    async (id: string) => {
      const ok = window.confirm("Delete this chat? This cannot be undone.");
      if (!ok) return;
      await window.orinos.deleteSession(id);
      await refreshSessions();
      if (sessionRef.current?.id === id) {
        const cfg = configRef.current;
        if (cfg) {
          const created = await window.orinos.newSession({
            provider: selectionRef.current.provider || cfg.provider,
            model: selectionRef.current.model || cfg.model,
            workspace: cfg.workspace,
          });
          setSession(created);
          setSelection({ provider: created.provider, model: created.model });
          setUsage(EMPTY_USAGE);
          setLive(null);
          setTurnMessages([]);
          setToolStates({});
          setError(null);
        }
      }
    },
    [refreshSessions],
  );

  const renameChat = useCallback(
    async (id: string, title: string) => {
      const updated = await window.orinos.renameSession(id, title);
      if (updated) {
        setSession((prev) => (prev && prev.id === id ? { ...prev, title: updated.title } : prev));
        await refreshSessions();
      }
    },
    [refreshSessions],
  );

  const chooseFiles = useCallback(async () => {
    const files = await window.orinos.chooseFiles();
    if (files.length) setAttachments((prev) => [...new Set([...prev, ...files])]);
  }, []);

  const saveKey = useCallback(async (providerId: string, key: string) => {
    const status = await window.orinos.setApiKey(providerId, key);
    setKeyed(new Set(status.keyed));
    setToast("API key saved.");
  }, []);

  const removeKey = useCallback(async (providerId: string) => {
    const status = await window.orinos.removeApiKey(providerId);
    setKeyed(new Set(status.keyed));
    setToast("API key removed.");
  }, []);

  const addCustomProvider = useCallback(
    async (input: { name: string; api: string; kind?: string; keyEnv?: string; models?: string[] }) => {
      const b = await window.orinos.addCustomProvider(input);
      applyBootstrap(b);
      setToast("Custom provider added.");
    },
    [applyBootstrap],
  );

  const removeCustomProvider = useCallback(
    async (id: string) => {
      const b = await window.orinos.removeCustomProvider(id);
      applyBootstrap(b);
      setToast("Custom provider removed.");
    },
    [applyBootstrap],
  );

  const currentProvider = providers.find((p) => p.id === selection.provider);
  const local = /localhost|127\.0\.0\.1/.test(currentProvider?.api || "");
  const missingKeyProvider =
    currentProvider && !keyed.has(currentProvider.id) && !local ? currentProvider.name : null;

  const providerNames = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, p.name])),
    [providers],
  );

  const paletteActions = useMemo(
    () => [
      {
        id: "new",
        label: "New chat",
        hint: "⌘N",
        icon: <Plus size={14} />,
        run: () => void newChat(),
      },
      {
        id: "settings",
        label: "Open settings",
        hint: "⌘,",
        icon: <SettingsIcon size={14} />,
        run: () => setSettingsOpen(true),
      },
      {
        id: "skills",
        label: "Browse skills",
        hint: `${skills.length} installed`,
        icon: <BookOpen size={14} />,
        run: () => setSkillsOpen(true),
      },
      {
        id: "terminal",
        label: "Open terminal",
        icon: <Terminal size={14} />,
        run: () => setTerminalOpen(true),
      },
      {
        id: "auto",
        label: `Auto-approve tools: ${config?.autoApprove ? "on" : "off"}`,
        hint: "toggle",
        icon: config?.autoApprove ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />,
        run: () => {
          if (config) void updateConfig({ autoApprove: !config.autoApprove });
        },
      },
      {
        id: "sidebar",
        label: sidebarOpen ? "Hide sidebar" : "Show sidebar",
        icon: <Sparkles size={14} />,
        run: () => setSidebarOpen((v) => !v),
      },
    ],
    [newChat, skills.length, config, sidebarOpen, updateConfig],
  );

  const respondApproval = useCallback((approved: boolean) => {
    if (!approval) return;
    void window.orinos.respondApproval(approval.id, approved);
    setApproval(null);
  }, [approval]);

  if (fatal) {
    return (
      <div className="splash">
        <div className="splash-card">
          <h1>Orinos could not start</h1>
          <p>{fatal}</p>
        </div>
      </div>
    );
  }

  if (!boot || !config || !session) {
    return (
      <div className="splash">
        <div className="splash-orb" />
        <div className="splash-text">Starting Orinos…</div>
      </div>
    );
  }

  return (
    <div className={`app ${sidebarOpen ? "" : "sidebar-hidden"}`}>
      {sidebarOpen && (
        <Sidebar
          sessions={sessions}
          currentId={session.id}
          keyedCount={keyed.size}
          skillCount={skills.length}
          version={boot.version}
          onSelect={(id) => void openSession(id)}
          onNew={() => void newChat()}
          onDelete={(id) => void deleteChat(id)}
          onRename={(id, title) => void renameChat(id, title)}
          onSkills={() => setSkillsOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          onCollapse={() => setSidebarOpen(false)}
        />
      )}

      <main className="main">
        <ChatHeader
          title={session.title}
          providerName={currentProvider?.name || selection.provider}
          model={selection.model}
          workspace={session.workspace}
          running={running}
          sidebarHidden={!sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(true)}
          onRename={(title) => void renameChat(session.id, title)}
          onOpenTerminal={() => setTerminalOpen(true)}
          onOpenSkills={() => setSkillsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <ChatView
          messages={session.messages}
          turnMessages={turnMessages}
          live={live}
          toolStates={toolStates}
          running={running}
          status={status}
          error={error}
          onDismissError={() => setError(null)}
          providerNames={providerNames}
          workspace={session.workspace}
          usage={usage}
          onSuggestion={(text) => setDraft(text)}
        />

        <Composer
          value={draft}
          setValue={setDraft}
          onSend={() => void send()}
          running={running}
          onStop={stop}
          selection={selection}
          providers={providers}
          keyed={keyed}
          onSelectModel={(provider, model) => void selectModel(provider, model)}
          attachments={attachments}
          onAttach={() => void chooseFiles()}
          onRemoveAttachment={(file) => setAttachments((prev) => prev.filter((f) => f !== file))}
          workspace={session.workspace}
          autoApprove={config.autoApprove}
          onToggleAuto={() => void updateConfig({ autoApprove: !config.autoApprove })}
          missingKeyProvider={missingKeyProvider}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenTerminal={() => setTerminalOpen(true)}
          contextMax={currentProvider?.models.find((m) => m.id === selection.model)?.context}
        />
      </main>

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        providers={providers}
        keyed={keyed}
        stats={{ providers: boot.providerCount, models: boot.modelCount, generatedAt: boot.catalogGeneratedAt }}
        version={boot.version}
        home={boot.home}
        onUpdateConfig={updateConfig}
        onSaveKey={saveKey}
        onRemoveKey={removeKey}
        onAddCustomProvider={addCustomProvider}
        onRemoveCustomProvider={removeCustomProvider}
      />

      <SkillsPanel open={skillsOpen} skills={skills} onClose={() => setSkillsOpen(false)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        sessions={sessions}
        providers={providers}
        keyed={keyed}
        actions={paletteActions}
        onOpenSession={(id) => void openSession(id)}
        onSelectModel={(provider, model) => void selectModel(provider, model)}
      />

      <TerminalDrawer open={terminalOpen} onClose={() => setTerminalOpen(false)} workspace={session.workspace} />

      <ApprovalModal request={approval} onRespond={respondApproval} />

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
