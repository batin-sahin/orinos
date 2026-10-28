# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The shipped surfaces are a macOS `.app` and a Windows `.exe` (Electron rendering this web surface) plus a terminal CLI. There is no mobile surface.

## Users

Developers and technical operators who delegate multi-step work to an AI agent on their own machine: reading a repository, editing files, running commands, checking failures, and researching a decision. They work in short, frequent sessions from a desktop app or a terminal, often switching between projects and models. Their job is to move a real software task from intent to verified result without losing visibility into what the agent did.

## Product Purpose

Orinos is a cross-platform AI agent harness that connects hundreds of providers to a local workspace through a shared tool loop. It exists so a user can choose a model, describe a job, watch the agent work, approve risky actions, and leave with the task actually done. Success is a verified result and a legible record of how it was reached.

## Positioning

One harness across desktop and terminal: the same provider catalog, skill packs, tools, approvals, and session history serve both surfaces, with the full execution trace visible in the product rather than hidden behind a chat transcript.

## Operating Context

- Runs locally on macOS and Windows; terminal CLI ships from the same TypeScript core.
- Works against a chosen local workspace; file and shell tools act there.
- Sessions and configuration live under `~/.orinos`; API keys stay on the machine and are sent only to the selected provider.
- Provider and model choice is live and frequent; the catalog is large, so search and recent models matter.
- Tool calls that write files or run commands may require approval; trust can be granted per session.
- Users often keep a terminal, editor, browser, and Orinos open together, and need to read status at a glance.

## Capabilities and Constraints

- 233 providers and 8,936 models from models.dev, plus user-defined OpenAI-compatible, Anthropic, and Google endpoints.
- Streaming assistant responses with reasoning, native tool calls, usage and cost accounting.
- Built-in tools: terminal, read/write/edit files, list directory, grep/glob, web search and fetch, skill inspection.
- Skills load from built-ins, `~/.orinos/skills`, and project `.orinos/skills`.
- Sessions are JSON records under `~/.orinos/sessions`; config is `~/.orinos/config.json` with `0600` permissions.
- Risky tool calls require approval unless auto-approve is on; CLI supports `--yes`.
- Desktop shell: Electron; renderer: React; custom CSS; no remote UI dependency at runtime.
- Windows packaging cannot be verified on the current macOS host; CI packaging is still required.
- A working visual redesign must preserve all behavior, provider compatibility, tools, sessions, approvals, CLI, and packaging.

## Brand Commitments

- Name: Orinos.
- Must feel like a serious working instrument, not a generic AI chatbot.
- Cross-platform desktop and terminal parity are part of the identity.
- The user explicitly rejected purple/cyan gradients, glowing orbs, glass panels, generic centered heroes, and rounded card grids.
- The user delegated palette and visual direction to research findings.
- The interface must remain legible under sustained technical use, not just in a marketing screenshot.

## Evidence on Hand

- Working core, CLI, Electron shell, provider catalog, and renderer exist in this repository.
- A real CLI task was completed end-to-end through Orca Router with `deepseek/deepseek-v4.1-flash-free`, writing and verifying `hello.txt`.
- Legacy smoke screenshots and a legacy orb icon exist; they document the rejected visual system, not a brand asset to preserve.
- No customer testimonials, benchmarks, pricing, or third-party endorsements exist. Future work must not invent them.

## Product Principles

1. Show the work. The execution trace is a first-class part of the product, not debug output.
2. Keep the operator in control. Approval, model choice, workspace, and stop are always reachable.
3. One harness, two surfaces. Desktop and terminal share behavior and language.
4. Density with clarity. Technical users benefit from compact information when hierarchy is decisive.
5. Verify, don't perform. The interface should report real state and real results.

## Accessibility & Inclusion

- Desktop keyboard operation is required: command palette, settings, send, stop, and overlay dismissal must work without a pointer.
- Motion must respect `prefers-reduced-motion`.
- Text contrast must meet WCAG AA at body sizes; status must never rely on color alone.
- The app must remain operable at narrow desktop widths and with the sidebar hidden.
