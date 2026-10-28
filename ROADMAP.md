# Orinos Roadmap

**Status:** Proposal, October 2026. Nothing here is committed to a release yet.

This is a prioritized enhancement plan for Orinos after studying
[hermes-agent](https://github.com/NousResearch/hermes-agent) and its documentation.
The goal is not to copy Hermes feature-for-feature. Orinos should stay a focused
desktop and terminal harness for **delegated software work**: one operator, one
workspace, visible evidence, and a clear approval boundary.

Hermes is strongest where it turns an agent from a chat wrapper into a durable
working system: bounded memory, context-file discovery, checkpoints, session
search, subagents, and progressive tool disclosure. Those are the ideas worth
adapting. Its messaging gateways, voice mode, image generation, kanban board,
and training-data batch mode are breadth that would dilute Orinos.

## What Orinos already has

- One agent loop shared by the Electron app and the `orinos` CLI.
- 233 providers and 8,900+ models from models.dev, plus custom endpoints.
- Streaming text, reasoning, tool calls, usage, and cost.
- Terminal, file read/write/edit, directory listing, glob, grep, web search,
  web fetch, and skill tools.
- Workspace-scoped execution and approval gates for risky tools, with pinned
  approval actions that survive long commands.
- JSON sessions under `~/.orinos`, project instructions from a small set of
  root-level files, and three-tier skills.
- The Overprint interface: a continuous execution spine, measured tool steps,
  keyboard operation (`⌘K`, `⌘J`, `⌘B`), light and dark themes, reduced-motion
  behavior, and a quiet-control pass that keeps at most three sibling controls
  per region with menus for the rest.

The gaps below are the ones that most affect long-running, trustworthy work.

---

## Research recap

This roadmap is the engineering plan. The user-side evidence — complaints with
issue numbers, HN and Reddit citations, and the feature-coverage matrix — is
consolidated and cited in [COMPETITIVE_RESEARCH.md](COMPETITIVE_RESEARCH.md).
Read that first for the "why", then continue here for the "what" and "when".

| Hermes capability | Mechanism worth learning from | Orinos implication |
| --- | --- | --- |
| Persistent memory | Bounded `MEMORY.md` (2,200 chars) and `USER.md` (1,375 chars), injected as a frozen session-start snapshot; one `memory` tool with add/patch/remove and injection scanning | Add small, legible, user-reviewable memory instead of unbounded vector recall |
| Context files | Priority chain (`.hermes.md` → `AGENTS.override.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`), git-root-to-cwd merge, progressive subdirectory discovery, injection scan | Extend the current root-only loader into a hierarchy without bloating every prompt |
| Checkpoints | Shadow git store under the agent home; snapshot before file edits and destructive commands; `/rollback` preserves hand edits by default | Give Orinos a real undo boundary before asking people to trust auto-approve |
| Session search | SQLite FTS5 over every session; search returns actual messages, not summaries | Add content search and resume without abandoning portable JSON sessions |
| Context compaction | Rolling summaries and tool-output limits at a token budget | The current loop sends the entire transcript until it fails; fix before adding more tools |
| Subagent delegation | `delegate_task` with fresh context, inherited tools, isolated terminal sessions, parallel batches, summaries only | Parallel research and review without flooding the parent transcript |
| MCP | Stdio and HTTP servers, per-server tool filtering, approval integration | Open Orinos to real integrations without hard-coding every service |
| Tool search | Deferred MCP/plugin schemas discovered through search/describe/call bridge tools | Only needed once integrations make the tool list large |
| Provider fallback | Ordered backups on errors, separate routes for auxiliary tasks | Reliability and cheaper titles/compaction without changing the primary model |
| Persistent goals | Standing objective, continuation judge, deterministic quality gates | A measured extension of the existing step budget, not an autonomous loop with no stop |
| Context references | `@` expansion for files, folders, diffs, and URLs | Faster, more precise prompts than describing paths in prose |

Sources are listed at the end.

---

## Prioritization rules

1. **Trust before autonomy.** Reversibility, evidence, and approval matter more
   than another tool.
2. **Context integrity before context size.** A smaller truthful context beats a
   million-token dump.
3. **Local and portable before hosted.** Sessions, memory, and checkpoints stay
   inspectable on disk.
4. **One visible spine.** New work must render as numbered steps, ledger rows, or
   labeled states, never as a second animation system.
5. **No new accent hues.** Action and selection use Ink Blue; pine, brick, and
   amber remain outcome colors only.
6. **Ship only what can be verified.** Windows packaging and live-provider chat
   remain open verification items regardless of roadmap priority.

---

## P0 — Trust and continuity

These five items turn Orinos from a capable demo into a harness that can be left
alone with a real repository. Build them first.

### 1. Context budget and compaction

**Why.** The agent loop currently sends **all** session messages on every step.
There is no token estimate, no output cap per tool, and no recovery when a long
run reaches the model's context window. This is the largest reliability gap.

**Shape.**
- Estimate tokens per message with a conservative character-based heuristic,
  then compare against the model's catalog `context` and `output` values.
- Reserve room for the system prompt, tool schemas, and the next response.
- At ~70% of the usable budget, compact: summarize older turns, keep the last
  few turns verbatim, keep the current goal, approvals, and file paths exact.
- Truncate oversized tool output with a head/tail marker and a path to the full
  result under `~/.orinos/sessions/<id>/outputs/`.
- Never mutate the stored transcript. Compaction is a request-only projection
  with a visible `Compacted N turns` marker in the transcript.
- Add `/compact` in the CLI and a manual "Compact context" action in the app.

**Done when.** A two-hour run with large tool outputs reaches a summary boundary
without a provider context error; the original session file still contains every
message; the UI labels what was summarized.

**Effort.** 2–3 engineer-days.

### 2. Checkpoints and rollback

**Why.** Approval protects before an action, but there is no recovery after a
bad edit or command. For a coding harness, undo is a core trust feature.

**Shape.**
- Use a shadow git repository at `~/.orinos/checkpoints/store`, never the
  project's `.git`. Share objects across projects by path hash.
- Snapshot before `write_file`, `edit_file`, and destructive terminal commands
  (`rm`, `mv`, `cp`, `sed -i`, truncation, output redirects, `git reset/clean`).
- At most one snapshot per directory per turn; skip unchanged trees; cap at 20
  snapshots per project and 500 MB total.
- Record the content hash of every file the agent writes. On restore, skip files
  the user edited afterward unless `--all` is passed.
- Add `/rollback`, `/rollback diff`, `/rollback <n> <file>` in the CLI, and a
  checkpoint ledger in the desktop app with restore and diff actions.
- If git is unavailable, degrade to copying only the files the agent touched.
- Add a pre-rollback snapshot so the undo can itself be undone.

**Done when.** A deliberately bad multi-file edit can be restored in both
surfaces; hand edits survive by default; the ledger shows time, trigger, files,
and change counts.

**Effort.** 4–6 engineer-days.

### 3. Persistent memory

**Why.** Orinos forgets every preference, convention, and correction between
sessions. Users end up repeating the same setup instructions.

**Shape.**
- Two bounded plain-text stores: `~/.orinos/memory/MEMORY.md` (agent notes,
  ~2,000 chars) and `USER.md` (preferences, ~1,250 chars).
- One `memory` tool with `add`, `patch`, and `remove`; no silent free-form write.
- Inject a frozen snapshot into the system prompt at session start, with usage
  counts. Persist writes immediately but show them in the next session.
- Scan entries for prompt-injection patterns and invisible Unicode before
  accepting them.
- Show a compact "Memory updated" line in chat. Settings → Memory provides edit,
  clear, and export; memory writes can require approval.
- Never store raw logs, credentials, or transient paths.

**Done when.** A stated preference survives a new session; the user can inspect
and delete it without editing JSON; a full store refuses the write and tells the
agent to consolidate first.

**Effort.** 3–4 engineer-days.

### 4. Project context hierarchy

**Why.** The current loader reads only a few root files. Monorepos need nested
conventions, and untrusted context files need a security boundary.

**Shape.**
- Load one project context type by priority: `.orinos.md` → `AGENTS.override.md`
  → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`.
- Inside a git repository, merge from the git root down to the workspace, with
  provenance headers and deduplication. Outside git, read only the workspace.
- Discover nested context files when a tool first touches their directory;
  inject the hint into that tool result, once per directory.
- Cap each file, head/tail truncate, and scan for instruction overrides, hidden
  HTML, credential exfiltration, and invisible characters.
- Show loaded files and any blocked file in Settings or a `/context` command.

**Done when.** A monorepo with root and package-level `AGENTS.md` follows both
sets of conventions; a nested hint appears only after the directory is touched;
a malicious context file is blocked with a visible reason.

**Effort.** 1–2 engineer-days.

### 5. Session content search and resume

**Why.** Sidebar search matches only titles and model IDs. The most useful
history is usually a command, error, or decision inside a transcript.

**Shape.**
- Build an incremental local index over session title, user/assistant text, and
  tool commands. Start with a compact JSON token index; move to SQLite FTS5 only
  if scale demands it.
- Search results show session, matched excerpt, timestamp, and workspace.
- Selecting a result loads the session at the matching turn.
- Add `orinos sessions search "query"` and keep the desktop sidebar search
  keyboard-driven.
- Index repair runs on startup if a session file changed or was deleted.

**Done when.** A phrase from a month-old tool output finds the right session in
under 100 ms on a 1,000-session profile, offline.

**Effort.** 2–3 engineer-days.

---

## P1 — Parallel work and integration

Build these after P0 is stable. Each one adds a new failure surface, so each needs
an explicit budget, cancellation path, and audit view.

### 6. Subagent delegation

**Why.** Some work is parallel by nature: research three libraries, review two
patches, test two hypotheses. Doing it in one context is slow and pollutes the
main transcript.

**Shape.**
- `delegate_task` accepts one task or a batch of up to 4, with a goal, context,
  and optional output schema.
- Each child gets a fresh conversation, the workspace's project context, the
  parent's enabled tools, and its own terminal session. It returns a summary,
  files touched, status, and usage — not its whole transcript.
- Children cannot spawn children by default, cannot write memory, and cannot
  ask for approval directly; risky actions bubble to the parent's approval flow.
- Show a nested, indented trace under the parent run, with per-child stop and
  duration. No floating avatars or separate "agent cards".
- Cap total child spend and concurrency; a stopped parent stops its children.

**Done when.** Three read-only research tasks run concurrently and return in one
consolidated step; stopping the parent ends all children within two seconds;
cost is attributed per child.

**Effort.** 6–8 engineer-days.

### 7. MCP client

**Why.** Orinos should not hard-code every integration. MCP is the emerging
common boundary for tools and data sources.

**Shape.**
- Support stdio and HTTP transports, configured under `mcpServers` in
  `~/.orinos/config.json`.
- Discover tools and namespaced schemas at startup; show server status, tool
  count, and last error in Settings.
- Per-server allow/deny lists; every risky tool goes through the same approval
  dialog with the server name visible.
- Timeouts, bounded output, and no automatic secret injection.
- Tool names are stable and visible in the execution spine.
- Do not add a marketplace or auto-install remote servers in this pass.

**Done when.** A local filesystem server and one HTTP server both expose tools;
a denied tool never reaches the model; a crashed server degrades to a labeled
error without taking down the session.

**Effort.** 5–7 engineer-days.

### 8. Provider fallback and auxiliary routes

**Why.** A single 429 or provider outage ends a run. Titles, compaction, and
memory review should not burn the frontier model's budget.

**Shape.**
- Configure an ordered fallback list per provider/model.
- Retry transient failures with jitter, then fail over before the first token.
  If failure happens mid-stream, keep the partial text and label the retry.
- Add an auxiliary model setting for titles, summaries, and memory review.
- Show the active route in the composer metadata only when fallback occurs.
- Never send a request to a provider that has no key.

**Done when.** A forced 429 on the primary completes on the backup with one
visible notice; a fallback never duplicates a completed tool call.

**Effort.** 3–4 engineer-days.

### 9. Context references and attachments

**Why.** Describing a file path in prose is slower and less precise than
referencing it. The composer currently has an attachment control but no full
reference workflow.

**Shape.**
- `@` opens a keyboardable file/folder menu; selecting inserts a compact chip.
- Resolve at send time into a bounded context block with path provenance.
- Support `@diff` for the current workspace diff and `@url` for a fetched page.
- Add image paste and file attachment only for models whose catalog entry
  supports the input type; otherwise explain the limitation before sending.
- Keep images out of the JSON transcript when possible; store them as sidecar
  files with content hashes.

**Done when.** A prompt can reference two files and a diff without pasting their
contents; oversized references are truncated with a path to the full file.

**Effort.** 3–5 engineer-days.

### 10. Persistent goals with quality gates

**Why.** "Keep going until the tests pass" is a real workflow. It should be
bounded and mechanically checkable, not an open-ended agent loop.

**Shape.**
- A goal is a standing objective with five fields: outcome, verification,
  constraints, boundaries, and stop condition.
- After each turn, a deterministic gate runs first (for example `npm test`).
  Only if it passes does a lightweight judge decide done / continue / blocked.
- Default budget: 12 continuation turns, then pause and ask.
- Manual pause, resume, and clear. Any user message preempts the loop.
- Render goal state in the run header, not as a modal.
- A goal is single-session; no background scheduling in this pass.

**Done when.** A failing test suite is fixed across several automatic turns and
stops only after the gate exits 0; a broken gate pauses with the actual output.

**Effort.** 4–6 engineer-days.

---

## P2 — Reach, only after the core is trusted

- **Tool search.** Defer MCP/plugin schemas behind search/describe/call once the
  visible tool list exceeds ~5% of the context budget. Keep core tools eager.
- **Scheduled tasks.** Cron or natural-language schedules, run by the desktop
  app or a headless process, with delivery to a local session only. Cross-platform
  autostart is the hard part; do not ship a daemon that cannot be stopped.
- **API server and ACP.** Expose the harness to editors and local frontends.
  This is more valuable than a messaging gateway for the target user.
- **Plugins.** Local JS/TS tool packages with a manifest, explicit permissions,
  and the same approval boundary. No remote auto-update.
- **LSP diagnostics.** Feed TypeScript/Python diagnostics into the agent after
  edits instead of relying on a final build.
- **Document extraction.** PDF, DOCX, and spreadsheet text for workspace
  research, with page-level provenance.
- **Browser automation.** Only if web research cannot be served by fetch plus
  search. Otherwise it is a large attack surface for little gain.
- **Usage insights.** A local, non-telemetry view of tokens, cost, tool failure
  rate, and run duration. A ledger table, not a dashboard of gauges.

## Explicitly not planned

These are deliberate omissions, not backlog items:

- Telegram/Discord/Slack gateways.
- Voice mode, wake word, and TTS.
- Image generation.
- Pets, kanban boards, and role-play personas.
- Batch trajectory generation for model training.
- Subscription proxying or credential sharing.
- Cloud sync or telemetry.
- Glow, gradient, glass, or animated-orb treatments for agent state.

If Orinos later needs one of these, it should be a separate surface or plugin,
not a new tab in the working document.

---

## Interface rules for every addition

- New state appears in the existing execution spine or as a ledger row with a
  label, timestamp, and outcome. No second card system.
- Ink Blue is for action and selection. Pine, brick, and amber are only for
  verified, failed, and attention states, always paired with text or shape.
- Memory, checkpoints, context files, and subagents each get a plain-text
  inspection surface. No hidden autonomy.
- Every new modal uses the shared focus trap, Escape dismissal, and focus
  restoration. Every action is reachable by keyboard.
- Destructive actions stay isolated, named, and confirmation-gated.
- New motion obeys `prefers-reduced-motion`. Loading still uses the lattice or a
  static state word, never a glowing orb.
- Dense panels may scroll, but the composer and approval controls never leave
  the viewport at the minimum window size.
- Long identifiers, paths, and diffs use Spline Sans Mono with tabular numerals
  and horizontal overflow, not wrapping that destroys alignment.

## Suggested release slices

**0.2 — Trust and continuity.** Context compaction, checkpoints, project context
hierarchy, memory, session search. This is the release that makes a long session
safe.

**0.3 — Parallel and connected.** Subagents, MCP, provider fallback. This is the
release that makes Orinos useful across more than one workspace task at a time.

**0.4 — Precision.** Context references, persistent goals, auxiliary models,
tool search. This is the release that reduces prompt babysitting.

**1.0 — Reach.** API server/ACP, plugins, scheduled tasks, LSP diagnostics, and a
verified Windows build. Do not call it 1.0 while Windows remains unverified.

## Verification and measures

Every P0/P1 item ships with tests and a manual proof:

- Compaction: no context-window errors in a two-hour synthetic run; original
  transcripts unchanged.
- Checkpoints: restore a known-bad tree; hand edits survive; `--all` restores
  everything; store stays under its cap.
- Memory: preference persists across sessions; malicious entry is rejected;
  clearing works without editing JSON.
- Context files: monorepo chain and nested hints behave; blocked file is visible.
- Session search: 100 ms p95 on 1,000 sessions; deleted files do not break index.
- Subagents: concurrency cap holds; cancel stops children; cost is attributed.
- MCP: server crash is contained; denied tool is not callable; approval names the
  server.
- Fallback: 429 recovers; no duplicated tool calls.

Baseline metrics to keep visible in development: time to first token, tokens per
completed task, tool failure rate, approval latency, context compactions per run,
checkpoint restores, and crash-free sessions. No telemetry; these are local
counters only.

Accessibility remains a release gate: every new surface is checked against the
contrast table in `DESIGN.md`, keyboard operation, and reduced motion at the
shipping 1.08 window scale.

## Open questions

1. Should memory writes require approval by default, or only show a receipt?
2. Should checkpoints be on by default for a new install, given the storage cost?
3. Is a shadow git store acceptable, or must rollback work without git?
4. Do subagents share the parent's approval dialog, or does each child get a
   scoped auto-approve manifest?
5. Does MCP tool discovery happen at startup or on demand, and how does either
   affect prompt-cache stability?
6. Should sessions stay JSON, or move to SQLite once content search, checkpoints,
   and message-level citations arrive? JSON is portable; SQLite is faster.

## Sources

- Hermes Agent repository: <https://github.com/NousResearch/hermes-agent>
- Features overview: <https://hermes-agent.nousresearch.com/docs/user-guide/features/overview>
- Persistent Memory: <https://hermes-agent.nousresearch.com/docs/user-guide/features/memory>
- Context Files: <https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files>
- Checkpoints and `/rollback`: <https://hermes-agent.nousresearch.com/docs/user-guide/checkpoints-and-rollback>
- Subagent Delegation: <https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation>
- Persistent Goals: <https://hermes-agent.nousresearch.com/docs/user-guide/features/goals>
- Tool Search: <https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-search>
