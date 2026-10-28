# Orinos

A local AI agent harness for the desktop and the terminal. One TypeScript core connects 233 providers and 8,900+ models to a real workspace, streams every tool call it makes, and asks before it touches anything risky.

![Orinos icon](resources/icon.png)

## What it does

- **One agent loop, two surfaces.** The Electron app and the `orinos` CLI share providers, tools, skills, sessions, and approval rules.
- **Real tools.** Run commands, read/write/edit files, list directories, grep/glob, search the web, fetch pages, and inspect skills — all inside the workspace you choose.
- **Visible work.** Assistant turns group into runs with a continuous execution spine: numbered tool steps, durations, outputs, usage, and cost.
- **Provider choice.** 233 providers and 8,936 models from [models.dev](https://models.dev), plus custom OpenAI-compatible, Anthropic, and Google endpoints.
- **Local state.** Sessions and configuration live under `~/.orinos`; keys are stored with `0600` permissions and go only to the provider you select.
- **Approvals.** File writes and shell commands pause for approval unless you turn on auto-approve or pass `--yes` in the CLI.

## Requirements

- Node.js 22 or newer (developed on Node 26)
- macOS 13+ or Windows 10+
- An API key for at least one provider, or a local endpoint that needs none

## Quick start

```bash
npm install
npm run build

npm start          # desktop app
npm run cli        # terminal REPL
```

For a global `orinos` command during development:

```bash
npm link
orinos
```

On first run, add a key:

```bash
orinos auth set openai sk-...
orinos providers --keyed   # see what is configured
orinos doctor              # check config, catalog, workspace, and credentials
```

Environment variables declared by a provider (for example `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or a custom provider's `keyEnv`) are detected automatically. Keys entered in the app or CLI are written to `~/.orinos/config.json` with owner-only permissions.

## Terminal usage

Start the interactive REPL:

```bash
orinos
```

Inside the REPL: `/help`, `/model`, `/provider`, `/new`, `/sessions`, `/skills`, `/workspace`, `/auto`, `/config`, `/exit`.

Run one prompt non-interactively:

```bash
orinos run "summarize the failing tests" --workspace .
orinos run -p anthropic -m claude-sonnet-4-6 "review src/core/agent.ts"
orinos run -y --json "create hello.txt and verify it" > result.json
```

Browse the catalog and manage state:

```bash
orinos providers postgres
orinos models -p openai --limit 20
orinos auth list
orinos sessions
orinos skills --view code-review
orinos config --set autoApprove=true
orinos config --path
```

`orinos run` exits non-zero on failure. `--json` emits machine-readable events and a final result.

## Desktop app

`npm start` opens the Electron app. It adds:

- Session log and search in the orange rail
- Streaming chat with reasoning, tool cards, and per-run accounting
- Model picker with catalog search and key status
- Command palette (`⌘K` / `Ctrl+K`)
- Settings for providers, keys, workspace, approvals, temperature, steps, web search, and theme
- Inline terminal drawer, skills browser, approval dialog, and toast status
- `Enamel` (light) and `Carbon` (dark) themes
- Keyboard operation and `prefers-reduced-motion` support

Sessions are JSON files under `~/.orinos/sessions`. Set `ORINOS_HOME` to isolate a test profile:

```bash
ORINOS_HOME=/tmp/orinos-test npm start
```

## Skills

Skills are Markdown instruction packs with optional YAML frontmatter:

```markdown
---
name: release-check
description: Verify a release candidate before publishing.
tags: [release, verification]
---

# Release check

1. Run the full test suite.
2. Build the packaged app.
3. Verify the artifact runs on a clean profile.
```

They load from three places, later sources taking precedence:

1. Built-in packs in `src/core/skills/builtin.ts`
2. `~/.orinos/skills`
3. `.orinos/skills` in the current workspace

The agent sees skill names and descriptions; it reads the full pack with the `skill_view` tool when a task matches.

## Data and privacy

- `~/.orinos/config.json` — provider, model, workspace, preferences, custom providers, and stored keys (`0600`)
- `~/.orinos/sessions/*.json` — full transcript, tool calls, and usage
- `~/.orinos/skills/*.md` — user skill packs

No telemetry is sent by Orinos. Prompts and tool results go only to the provider you choose; web search goes to the configured search provider (DuckDuckGo by default, or Brave/SearXNG).

## Build and package

```bash
npm run typecheck
npm run build          # catalog + CLI + Electron main/preload + renderer
npm run pack:mac       # release/Orinos-*.dmg and .zip (arm64)
npm run pack:win       # release/Orinos-Setup-*.exe and Portable .exe (x64)
npm run icon           # regenerate resources/icon.png and .icns from icon.svg
```

macOS packaging is verified on this machine. Windows packaging is configured in `electron-builder.yml` for `windows-latest` CI, but that build has not been run or verified yet; it cannot be produced on macOS without Wine.

The GitHub Actions workflow in `.github/workflows/build.yml` typechecks, builds, and uploads desktop artifacts for both platforms when a remote runs it. No remote is configured in this working copy, so the Windows artifacts remain unverified. Signing and notarization are not configured; local macOS builds are unsigned.

### Smoke capture

The Electron main process has a test-only capture mode:

```bash
ORINOS_HOME=/tmp/orinos-smoke-home npx electron . --smoke
```

It writes `orinos-smoke.png` to the system temp directory. `ORINOS_SMOKE_JS` and `ORINOS_SMOKE_JS_AFTER` run scripts before capture, `ORINOS_SMOKE_APPROVAL=1` injects a sample approval request, `ORINOS_SMOKE_REDUCED=1` emulates `prefers-reduced-motion: reduce`, and `ORINOS_SMOKE_DEBUG=1` logs script results.

## Project layout

```
src/
  core/          agent loop, providers, tools, skills, sessions, config, catalog
  cli/           terminal REPL, commands, and rendering
  main/          Electron main process, IPC, menu, smoke harness
  preload/       typed bridge
  renderer/      React UI, Overprint styles, motion primitives
  shared/        IPC contract
scripts/         catalog fetch, esbuild bundling, icon generation
resources/       app icon source and packaged icons
```

The renderer is code-led: system font stack fallbacks, self-hosted Barlow / Barlow Condensed / Spline Sans Mono, custom CSS, no UI framework or runtime CDN.

## Design

Orinos uses **Overprint**, a field-manual visual system: an International Orange rail, cool pale enamel stock, graphite ink, square geometry, 1px rules, and a continuous execution spine. The palette and direction were chosen from research into durable workplace tools rather than generic AI gradients. See `DESIGN.md` for the system, motion rules, and accessibility decisions.

Interface motion is adapted from [React Bits](https://reactbits.dev) by David Haz, used under its MIT + Commons Clause license and re-implemented for this surface. Typefaces are Barlow, Barlow Condensed, and Spline Sans Mono under the SIL Open Font License. Provider data comes from models.dev.

## License

MIT. See `LICENSE`.
