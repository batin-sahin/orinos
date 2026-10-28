# Orinos — AI Agent Harness

## Vision
A cross-platform AI agent harness (like Hermes Agent / Claude Code / Grok) with:
- **macOS .app** (Electron)
- **Windows .exe** (Electron)
- **Terminal CLI** (Node.js)
- **100s of LLM providers** (OpenAI-compatible + models.dev registry)
- **Skill system** (pluggable markdown skills)
- **Sleek, modern UI** (React + Tailwind, dark theme)

## Tech Stack
| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js 26 + TypeScript | Available, cross-platform |
| Desktop | Electron 33+ | macOS .app + Windows .exe from one codebase |
| UI | React 19 + Tailwind CSS 4 | Sleek, fast to build |
| State | Zustand | Lightweight |
| Providers | OpenAI-compatible SDK + models.dev catalog | 233 providers, 8936 models |
| CLI | Commander.js | Terminal interface |
| Build | electron-builder | .app / .exe packaging |
| Bundler | Vite | Fast dev/build |

## Architecture

```
Orinos/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # App entry, window creation
│   │   ├── ipc.ts             # IPC handlers (renderer <-> main)
│   │   └── menu.ts            # Native menu
│   ├── preload/
│   │   └── index.ts           # Context bridge
│   ├── renderer/              # React UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatView.tsx       # Main chat interface
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── Sidebar.tsx        # Sessions, skills, settings
│   │   │   ├── ModelPicker.tsx    # Provider/model selector
│   │   │   ├── SkillPanel.tsx
│   │   │   └── Terminal.tsx       # Embedded terminal
│   │   ├── stores/
│   │   │   ├── chat.ts
│   │   │   ├── providers.ts
│   │   │   └── settings.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── core/                  # Agent harness (shared)
│   │   ├── agent.ts           # Main agent loop
│   │   ├── conversation.ts    # Message history, context window
│   │   ├── harness.ts         # Tool execution harness
│   │   ├── streaming.ts       # SSE/streaming response handler
│   │   └── types.ts           # Shared types
│   ├── providers/             # LLM provider layer
│   │   ├── registry.ts        # Provider registry (models.dev)
│   │   ├── base.ts            # Abstract provider interface
│   │   ├── openai-compat.ts   # OpenAI-compatible (covers 90%)
│   │   ├── anthropic.ts       # Native Anthropic
│   │   ├── google.ts          # Gemini
│   │   └── catalog.ts         # models.dev data (233 providers)
│   ├── skills/                # Skill system
│   │   ├── loader.ts          # Parse SKILL.md frontmatter
│   │   ├── registry.ts        # Skill discovery + loading
│   │   ├── executor.ts        # Skill-guided execution
│   │   └── built-in/          # Default skills
│   │       ├── terminal/SKILL.md
│   │       ├── read-file/SKILL.md
│   │       ├── write-file/SKILL.md
│   │       └── web-search/SKILL.md
│   ├── tools/                 # Built-in tools
│   │   ├── index.ts           # Tool registry
│   │   ├── terminal.ts
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── search-files.ts
│   │   ├── web-search.ts
│   │   └── types.ts
│   └── cli/                   # Terminal CLI
│       ├── index.ts           # CLI entry (commander)
│       ├── commands/
│       │   ├── chat.ts        # Interactive chat
│       │   ├── run.ts         # One-shot execution
│       │   ├── skills.ts      # List/manage skills
│       │   └── providers.ts   # List/configure providers
│       └── repl.ts            # Interactive REPL
├── skills/                    # User skill directory (~/.orinos/skills)
├── resources/                 # App icons, assets
│   ├── icon.icns              # macOS
│   ├── icon.ico               # Windows
│   └── icon.png               # Linux/generic
└── scripts/
    ├── download-catalog.ts    # Fetch models.dev catalog
    └── build.ts               # Build orchestration
```

## Provider System

### Catalog (models.dev)
- 233 providers, 8936 models
- Each provider: `{ id, name, api, env, npm, models: { [id]: ModelInfo } }`
- Downloaded at build time, cached locally
- 194/233 are OpenAI-compatible → one adapter covers most

### Provider Resolution
1. Check env vars (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
2. Check user config (~/.orinos/config.yaml)
3. Check custom providers (user-defined base_url + key)

### Streaming
- All providers stream via SSE or chunked transfer
- Unified `StreamEvent` type: `{ type: 'text'|'tool_call'|'done'|'error', ... }`

## Skill System

### Format (SKILL.md)
```markdown
---
name: skill-name
version: 1.0.0
description: "What this skill does."
metadata:
  orinos:
    tags: [tag1, tag2]
    required_commands: [curl, jq]
    required_environment_variables: [API_KEY]
---

# Skill Name

Instructions for the agent...
```

### Discovery
- Built-in: `src/skills/built-in/`
- User: `~/.orinos/skills/`
- Project: `.orinos/skills/` (per-repo)

### Execution
- Skills are injected into system prompt when relevant
- Agent decides when to use a skill based on task
- Skills can reference tools, other skills, external commands

## Tool System

### Built-in Tools
| Tool | Description |
|------|-------------|
| terminal | Execute shell commands |
| read_file | Read file contents |
| write_file | Write/create files |
| patch | Find-and-replace edits |
| search_files | Grep/find files |
| web_search | Search the web |
| web_extract | Extract page content |

### Tool Call Protocol
```
@@CALL_TOOL name=ToolName