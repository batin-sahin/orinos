# Competitive Research — Hermes Agent, OpenCode, OpenClaw

Collected 2026-10-28 from GitHub issues and comments, Hacker News threads, Trustpilot reviews,
independent writeups, and Reddit search snippets (Reddit blocks direct reads from this network;
those items are cited as search snippets). Primary benchmarks: **Hermes Agent** and **OpenCode**.
OpenClaw is tracked for context only.

Every claim below is sourced. Where Orinos has no answer yet, the matrix says so.
When we cite an issue we keep the number, and where useful a short direct quote — no cherry-picking.

## 1. Position snapshot (verified 2026-10-28, GitHub REST API)

| Project | Repo | Stars | Forks | Open issues |
| --- | --- | --- | --- | --- |
| OpenClaw | `openclaw/openclaw` | 393,258 | — | 7,736 |
| Hermes Agent | `NousResearch/hermes-agent` | 257,975 | 56,589 | 51,665 |
| OpenCode | `anomalyco/opencode` | 222,637 | 29,808 | 3,916 |
| Orinos | `batin-sahin/orinos` | — | — | — |

The gap is distribution, not only features. Orinos's opening is to be measurably calmer, more
honest, and safer on exactly the two axes both leaders get criticized on.

## 2. Hermes Agent — what users actually complain about

| Complaint | Evidence | Type |
| --- | --- | --- |
| Desktop renders one reply twice; fix attempts reopen the bug on new platforms | [issue #127665](https://github.com/NousResearch/hermes-agent/issues/127665) (58 comments; independent Windows/WSL2 reproduction with byte-identical adjacent bubbles) | Reliability |
| Startup plugin warnings leak to the terminal before/at launch ("bundled 'solstice' provider fails in stripped PM runtime") | [issue #134107](https://github.com/NousResearch/hermes-agent/issues/134107) (39 comments) | Polish |
| Passwords exposed through the Telegram gateway | [issue #72298](https://github.com/NousResearch/hermes-agent/issues/72298) | Security |
| Shift+Enter broken (newline vs send) | [issue #22908](https://github.com/NousResearch/hermes-agent/issues/22908) | Input |
| Switching models loses session context | [issue #17013](https://github.com/NousResearch/hermes-agent/issues/17013) | State |
| Context truncated silently — the agent stops recalling early turns with no visible event | [issue #3694](https://github.com/NousResearch/hermes-agent/issues/3694) | Honesty |
| Session/memory contamination between chats | [issue #6320](https://github.com/NousResearch/hermes-agent/issues/6320) | Isolation |
| Memory injected as user content (fake "user" rows in the archive) | [issue #31584](https://github.com/NousResearch/hermes-agent/issues/31584) | Honesty |
| Agent ignores injected memory and reaches for `session_search` first | [issue #46955](https://github.com/NousResearch/hermes-agent/issues/46955) | Memory |
| Setup/config confusion; users wire extra tools (Todoist, Discord) just to see what the agent is doing | Reddit r/hermesagent: "My Hermes setup was getting out of hand, so I built this…" — *"It is confusing for my agent and myself"* | Onboarding |
| UI described as ugly and sluggish in public threads; the community builds third-party dashboards because built-in state is inconsistent | r/hermesagent threads; r/AISEOInsider writeup ("a UI layer is exactly what most agent setups are missing") | Interface |
| Dashboard state contradicts the running session; context-isolation test fails in real use; configuration should fail closed but doesn't | Piotr Bednarski, ["Don't trust Hermes Agent with anything that matters"](https://bednars.me/blog/why-i-advise-against-using-hermes-agent) (2026-07-12), tested on a $20 Nous Portal plan | Trust |
| Uninstall leaves files behind and the documented uninstall command doesn't exist; billing questions unanswered (tickets T-4167, T-6537) | [Trustpilot 2.9/5](https://www.trustpilot.com/review/hermes-agent.nousresearch.com) | Lifecycle/billing |

## 3. OpenCode — what users actually complain about

| Complaint | Evidence | Type |
| --- | --- | --- |
| Permission dialogs pushed off-screen by long commands — Allow/Deny unreachable | [issues #30132](https://github.com/anomalyco/opencode/issues/30132), [#57209](https://github.com/anomalyco/opencode/issues/57209) | Approvals |
| Composer loses focus after a turn finishes | [issue #57176](https://github.com/anomalyco/opencode/issues/57176) | Input |
| Tool metadata dropped in the web/desktop timeline | [issue #57180](https://github.com/anomalyco/opencode/issues/57180) | Trace |
| Unbounded local database growth — users report 13 GB, 50 GB (45 GB tool artifacts + 5.7 GB SQLite), 64 GB; no cap or pruning | [issue #33356](https://github.com/anomalyco/opencode/issues/33356) with related #32005/#31526 (bot cross-links them; user `joaomj`, 2026-07-06, details the 50 GB case) | Storage |
| No native sandboxing; cwd restriction bypassed via bash | [issue #2242](https://github.com/anomalyco/opencode/issues/2242) — 103 comments, 87 reactions; maintainer: *"yeah we need better sandboxing, we try to restrict to cwd but agent can use bash to get around it"*; users resort to Docker | Security |
| No search inside the session buffer | [issue #4714](https://github.com/anomalyco/opencode/issues/4714) | Retrieval |
| Archived sessions not viewable on desktop | [issue #6680](https://github.com/anomalyco/opencode/issues/6680) — 43 comments, 58 reactions | History |
| Revert/fork only from the user's message, not from an AI message | [issue #8689](https://github.com/anomalyco/opencode/issues/8689) | History |
| Session cost excludes subagent cost in TUI sidebar, `opencode stats`, `/export` | [issue #45417](https://github.com/anomalyco/opencode/issues/45417) | Cost honesty |
| Heavy git churn by the agent | [issue #3176](https://github.com/anomalyco/opencode/issues/3176) — *"Why is OpenCode massively abusing git?"* | Workspace |
| Security-posture writeup: TUI RAM spikes, Shift+Enter and Ctrl-C behavior, text selection, prompt-cache invalidation, compaction, subagent issues; conclusion *"fundamentally `llm \| bash`"* | Alec Matuszek, ["Stop Using OpenCode"](https://wren.wtf/shower-thoughts/stop-using-opencode/), against git `baef5cd4` | Ensemble |
| Backlog hygiene: 3,916 open issues; HN: *"60 days ago there were 73 pages of open issues. Now there are over 150 pages. Nobody is reading the issues; nobody is accepting PRs"* ("polski-g", [HN item 48978112](https://news.ycombinator.com/item?id=48978112)); *"a ton of super serious issues there. They are not getting fixed"* (Tepix) | Hacker News | Maintenance |
| CVE-2026-22812 and the October 2026 credential-leak incident | CVE record; October 2026 incident reports | Security |
| Desktop app "a bit sluggish… frequently stuck at thinking or reading or writing" (Copilot provider) | Reddit r/opencodeCLI: "OpenCode desktop app" | Interface |

## 4. OpenClaw — context only (secondary)

393,258 stars beside 7,736 open issues signals strong adoption and a real support load. We do not
chase its feature breadth (messaging gateways, voice, plugins). It is a different category; it only
sets our floor for "must be easy to trust, easy to leave, easy to uninstall".

## 5. Feature coverage matrix

Legend: **shipped** = in main today; **planned** = on the ROADMAP P0/P1 with a landing note.

| Capability | Orinos | Hermes | OpenCode |
| --- | --- | --- | --- |
| Desktop + CLI from one core | shipped | shipped (gateway-heavy) | shipped |
| Provider breadth (233 providers, 8,936 models via models.dev + custom OpenAI/Anthropic/Google endpoints) | shipped | smaller bundled set | shipped |
| Per-step execution trace (numbered steps, durations, args, output, usage, cost) | shipped | partial (dup/missing rows: #127665, #57180) | partial |
| Approvals that never scroll away; command wrapped, readable, keyboard reachable at any length | shipped | mixed | broken for long commands (#30132, #57209) |
| Visible auto-approval state in the composer register | shipped | buried in config | buried in config |
| Composer regains focus; Enter/Shift+Enter documented and correct | shipped | broken (#22908) | broken (#57176) |
| Session history stays listed and searchable; nothing disappears into archive | shipped (local JSON sessions, searchable sidebar) | partial | archived hidden (#6680), no buffer search (#4714) |
| Bounded storage; deleting a chat deletes its bytes | shipped (JSON per session) | partial | 13–64 GB reports (#33356) |
| Cost transparency on every turn | shipped | partial | subagent cost omitted (#45417) |
| Subagents | planned (ROADMAP P1) | shipped | shipped |
| Native sandbox beyond the approval gate | planned (ROADMAP P0 research) | partial (gateway permission tiers, #527) | absent (#2242) |
| Persistent memory | planned (ROADMAP P0 research) | shipped but criticized (#6320, #31584, #46955) | none |
| Teams/multi-agent | not now | wanted (#34352) | shipped |

We claim parity honestly: today Orinos matches the single-user local-harness core; competition
continues on subagents, memory, and sandboxing — and that competition is named on the ROADMAP,
not hidden.

## 6. Differentiators we choose (complaint → answer)

1. **Approvals are pinned, never clipped** (OpenCode #30132/#57209) — approval actions are sticky
   at the modal bottom behind a rule; the command wraps inside its own box, so a 300-character
   line can never push Allow off the screen or break the keyboard path.
2. **Honest usage, every turn** (OpenCode #45417, Hermes Trustpilot billing reports) —
   input/output/cost is printed per turn in both desktop and CLI, with no subagent blind spot.
3. **Visible safety state** (Hermes confusion threads) — the composer register always reads
   `AUTO ON` / `AUTO OFF`; the toggle lives in Tools, the palette, and Settings.
4. **No silent context truncation** (Hermes #3694) — when a turn approaches the window limit the
   surface prints an explicit notice; nothing disappears without a row on screen. Model-switch
   carryover rules stay on the ROADMAP P0 until tested.
5. **Storage you can delete** (OpenCode #33356) — one JSON file per session under `~/.orinos`;
   deleting a chat removes its bytes; `du -sh ~/.orinos` tells the truth.
6. **Archive is first-class** (OpenCode #6680) — every session stays listed and searchable in the
   sidebar; there is no shadow archive you cannot open.
7. **Calm chrome** (Hermes UI threads, OpenCode desktop sluggishness) — square geometry with far
   fewer, quieter controls: the header is Commands plus one More menu; the composer is model plus
   Tools plus Send; secondary actions live behind hover/focus disclosure. Rules are normative in
   `DESIGN.md` ("Quiet controls, loud process").
8. **Repeatable release testing** — the smoke harness boots the real app and captures the
   screenshot matrix (shared surface, approval, terminal, narrow window, reduced motion) so claims
   about the interface are backed by images, not adjectives.

## 7. What NOT to copy from the playbook

- No "stop using X" tone. The writeup that trashed a leader drew attention while users stayed put,
  because migration cost beats a rant. Orinos talks about its own record and lets the trace speak.
- No gateway/kanban breadth for launch; those are upgrades, not the floor.
- No unverifiable numbers anywhere; every count in this file is API-verified or linked prose.
- No copying messaging, kanban views, or subscription positioning — features win on difference,
  not on echo.
