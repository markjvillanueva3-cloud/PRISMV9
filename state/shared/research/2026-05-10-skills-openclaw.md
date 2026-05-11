---
title: Claude Code Skills System + Open-Source Claude Tooling Ecosystem
date: 2026-05-10
author: claude-85cedf09 (researcher agent)
topic: skills-openclaw
sources:
  - https://code.claude.com/docs/en/skills
  - https://code.claude.com/docs/en/slash-commands
  - https://code.claude.com/docs/en/sub-agents
  - https://code.claude.com/docs/en/plugins
  - https://github.com/anthropics/skills
  - https://github.com/anthropics/claude-code
  - https://github.com/anthropics/anthropic-cookbook
  - https://github.com/anthropics/claude-agent-sdk-python
  - https://github.com/modelcontextprotocol/servers
  - https://github.com/ruvnet/claude-flow
  - https://github.com/wshobson/agents
  - https://github.com/obra/superpowers
  - https://www.anthropic.com/engineering/building-effective-agents
  - https://blog.buildbetter.ai/best-open-source-skills-for-claude-code-in-2026-complete-guide/
status: complete
---

# Skills + OpenClaw Research Card

PRISM cross-ref baseline (live counts, 2026-05-10): 3180 engines, 97 dispatchers, 7341 actions, 247 project skills, 390 user skills, 457 Claude hooks, 54 source hooks, 26 registries, 53 algorithms.

---

## §1 Skill Anatomy

A skill is a **directory** with a required `SKILL.md` entrypoint. The directory name becomes the slash-command (`mkdir summarize-changes` → `/summarize-changes`). Custom commands have been merged into skills as of late-2025 — `.claude/commands/foo.md` (flat) and `.claude/skills/foo/SKILL.md` (directory) both produce `/foo` and parse identical frontmatter; skill takes precedence on collision.

### Required + Recommended fields

- **`name`** (optional, defaults to dir name) — lowercase + hyphens, max 64 chars.
- **`description`** (recommended) — what the skill does AND when to use it; written third-person; max 1024 chars (combined `description` + `when_to_use` truncated at 1536 chars in the listing). This is the discovery key — Claude reads only descriptions to decide whether to load the body.

### Behavior fields (the load-bearing ones)

- **`disable-model-invocation: true`** — only the user can invoke; description is NOT loaded into context (token saver). Use for side-effect actions (`/deploy`, `/commit`).
- **`user-invocable: false`** — only Claude can invoke; hidden from `/` menu. Use for background reference like `legacy-system-context`.
- **`allowed-tools`** — space-separated or YAML list; pre-approves listed tools while skill is active (e.g. `Bash(git add *) Bash(git commit *)`). Does NOT restrict — every tool stays callable, this just skips the prompt.
- **`model`** — `sonnet | opus | haiku | inherit | <full-id>`; override applies for the rest of the turn only, then session model resumes.
- **`effort`** — `low | medium | high | xhigh | max`; overrides session effort while skill is active.
- **`context: fork`** — runs the skill as a forked subagent; SKILL.md becomes the prompt, no conversation history.
- **`agent`** — when `context: fork`, picks subagent type (`Explore`, `Plan`, `general-purpose`, or any `.claude/agents/<name>.md`).
- **`hooks`** — lifecycle hooks scoped to this skill only (PreToolUse / PostToolUse / Stop).
- **`paths`** — glob patterns; auto-load only when active file matches (e.g. `paths: "src/**/*.tsx"`).
- **`shell`** — `bash | powershell` for `` !`cmd` `` injection.
- **`argument-hint` / `arguments`** — autocomplete hints + named positional args for `$name` substitution.

### String substitutions inside the body

`$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, `$<named>`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}` (resolves whether installed at user/project/plugin level).

### Companion files

`SKILL.md` is the only required file. Sibling files load on-demand:

```
my-skill/
├── SKILL.md           (required, entry)
├── reference.md       (loaded when SKILL.md says "see reference.md")
├── examples.md        (loaded on demand)
├── template.md
└── scripts/
    └── helper.py      (executed via Bash, never loaded into context)
```

**Discipline**: keep `SKILL.md` under 500 lines. Move detail into siblings and link from SKILL.md.

### Composability — skills calling skills

The Skill tool lets a skill body call another skill: `Skill({ skill: "dedup", args: "engine MyEngine" })`. Plugin skills require namespace (`Skill({ skill: "linear:create-issue" })`). Skills called via Skill tool execute in the **same** context (not a fork unless target skill has `context: fork`).

### Dynamic context injection

Inline: `` !`git diff HEAD` `` — runs on the host before Claude sees content; output replaces the placeholder. Multi-line: a fenced ` ```! ` block. This is preprocessing, not a Claude tool call. Disabled per-policy via `"disableSkillShellExecution": true`.

### Lifecycle

When invoked, `SKILL.md` enters the conversation as a single message and **stays for the rest of the session**. Auto-compaction re-attaches the most recent invocation of each skill (first 5,000 tokens each, 25,000 total budget). If a skill stops influencing behavior, the content is usually still there — re-invoke to push it to top of recency stack.

---

## §2 Skill Design Patterns

### Skill vs MCP action vs bash script — decision matrix

| Form | Use when | Cost | Discovery |
|------|----------|------|-----------|
| **Skill** (`SKILL.md`) | Repeating a multi-step procedure that needs the model to reason between steps; checklist; standing instructions per file-pattern | ~description tokens always-on; body loads on invoke | `description` keyword match OR explicit `/name` |
| **MCP action** (dispatcher) | Deterministic compute, lookup, or remote call where the model just needs the answer; cross-session/cross-agent consistency | Tool-schema bytes always-on per server; runs in dedicated process | Listed in tool descriptions |
| **Plain bash script** | Single-shot, deterministic, no model judgement needed; can be wrapped in a 1-line skill if discoverability matters | Zero context cost until invoked via Bash | Only if user remembers the path |
| **Hook** (PreToolUse / PostToolUse / Stop) | Enforce policy deterministically — block, audit, inject context — without model in the loop | Settings overhead + per-fire latency | Auto-fires on event |

### Rigid vs flexible skills

- **Rigid** (`/deploy`, `/commit`) — numbered steps, exact commands, `disable-model-invocation: true` so the model can't trigger it on a hunch. Body reads like a runbook.
- **Flexible** (`/code-review`, `/api-conventions`) — principles, examples, escape hatches. The model adapts to the situation. Often paired with `context: fork` + an `Explore` agent so the body becomes a prompt.

### What goes in a skill body (Anthropic guidance + observed practice)

1. **Imperative, terse, third-person** — "Summarize the diff. List risks." not "I will help you summarize..."
2. **Standing instructions, not one-time steps** — content stays in context; treat it like a system-prompt fragment.
3. **Reference siblings, don't inline** — link `reference.md` instead of dumping API docs. Progressive disclosure cuts context cost ~60-80% per buildbetter analysis.
4. **Embed `ultrathink` keyword** when deep reasoning matters — triggers extended thinking.
5. **Pre-load context with `` !`cmd` ``** instead of asking Claude to gather it — the diff/PR/branch lands in the prompt, fewer turns.

---

## §3 Skill Discovery

Skills are discovered by location, in priority order:

| Tier | Path | Scope |
|------|------|-------|
| 1 (highest) | Enterprise managed settings | Org-wide |
| 2 | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| 3 | `.claude/skills/<name>/SKILL.md` | This project |
| 4 (lowest) | `<plugin>/skills/<name>/SKILL.md` | Where plugin is enabled — namespaced `plugin:skill` |

Higher tiers override same-name lower tiers; plugins cannot collide because of the namespace prefix. `.claude/commands/foo.md` (legacy flat) still works but loses to `.claude/skills/foo/SKILL.md` if both exist.

### How Claude finds them

At session start, Claude Code reads every `SKILL.md` and loads only `name` + `description` + `when_to_use` into the system prompt as a registry (~100 tokens per skill). Body loads only when invoked. The character budget for descriptions scales at 1% of context window with 8000-char fallback; tunable via `SLASH_COMMAND_TOOL_CHAR_BUDGET`. When over budget, all names stay but descriptions are truncated.

### When skills auto-fire vs require user trigger

- **Auto-fire** (model invocation): Claude matches the user's prompt against descriptions and decides whether to call the Skill tool. Default behavior unless `disable-model-invocation: true`.
- **Path-gated auto-fire**: `paths: "src/**/*.test.ts"` restricts auto-load to matching files.
- **User-only**: `disable-model-invocation: true` removes from Claude's listing entirely.
- **Always**: invoke via `/skill-name [args]`.

### Live-change watch

`~/.claude/skills/`, project `.claude/skills/`, and `--add-dir` `.claude/skills/` are watched. Edit-and-save takes effect mid-session. Creating the **top-level** skills directory mid-session requires a restart.

### Visibility overrides

`skillOverrides` in `settings.local.json` lets you collapse a skill to `name-only`, `user-invocable-only`, or `off` without editing its `SKILL.md`. Cycle states with Space in the `/skills` menu.

---

## §4 Skill Ecosystem (Wild)

Most-cited / highest-leverage skill collections in 2026:

| Repo | Focus | Notes |
|------|-------|-------|
| **anthropics/skills** (~132k stars) | Reference, education | Includes the docx/pdf/pptx/xlsx skills that power Claude.ai's document creation in production. Source-available, not OSS. |
| **wshobson/agents** (~18k stars) | Engineering plugins | 185 agents across 80 plugins, 153 skills. Plugin-first, marketplace-distributed (`/plugin marketplace add wshobson/agents`). Tiered model strategy (Opus for crit-arch, Haiku for ops). |
| **obra/superpowers** | Methodology | TDD, systematic-debugging, verification-before-completion, brainstorming, writing-plans, executing-plans, subagent-driven-dev. Cross-platform (Claude Code, Codex, Gemini, Cursor, OpenCode). |
| **agent-skills** (~35k) | Production engineering skills | Agent-CLI agnostic. |
| **abubakarsiddik31/claude-skills-collection** | Curated mix of official + community | |
| **mukul975/Anthropic-Cybersecurity-Skills** | 754 cybersec skills mapped to MITRE ATT&CK, NIST CSF 2.0, ATLAS, D3FEND, NIST AI RMF | Cross-CLI portable (Claude Code, Copilot, Codex, Cursor, Gemini). Apache 2.0. |
| **travisvn/awesome-claude-skills** | Curated link-list | |

### Patterns that emerge across the ecosystem

1. **Plugin-first distribution**: individual skills are giving way to plugin bundles with manifest + marketplace install. Atomic units control token cost.
2. **Cross-CLI portability**: skills target the [agentskills.io](https://agentskills.io) open standard so they run in Claude Code, Cursor, Codex, Aider, Cline, Continue, Roo. Lock-in is dead.
3. **Tiered model assignment** baked into frontmatter: critical work → Opus, exploration → Haiku.
4. **Methodology skills** (TDD, debugging, brainstorming) outperform task skills in compounding leverage — they shape every subsequent task.
5. **Memory-enabled subagents** (`memory: project | user | local` on a subagent) are eating "build a custom RAG over the project" — the agent curates its own `MEMORY.md` over sessions.
6. **Trigger phrases in `description`**: best skills front-load 3-5 verbatim phrases the user would say (`"Use when the user asks what changed, wants a commit message, or asks to review their diff"`).

---

## §5 Open-Source Claude Tooling Landscape

Comparison of the major OSS Claude-Code-class CLIs / agents:

| Tool | Stars | Orchestration | Agent spawn | Memory | LLM support | Sweet spot |
|------|-------|---------------|-------------|--------|-------------|-----------|
| **Claude Code** | 122k | CLI + plugin + MCP | Subagents (Explore/Plan/general/custom) + agent teams | CLAUDE.md, agent-memory dirs, persistent skill context | Anthropic only | First-party, deepest hook + skill + plugin integration |
| **Cline** | 61k | VS Code extension | Single-loop with approval gates | VSC workspace | BYOK any provider | IDE-native diff/approve workflow |
| **Aider** | 44k | Terminal + git as state | Pair-programming model, no subagents | Git history is the memory | BYOK any | Git-as-control-plane, every change is a commit |
| **Continue.dev** | (Apache-2.0) | VS Code + JetBrains | Mostly autocomplete + chat, less autonomous | Context provider plugins | BYOK + local (Ollama, LM Studio) | Offline-first, fully customizable context |
| **OpenCode (sst)** | 151k | Multi-platform CLI | Multi-agent | Project + session | Multi-LLM | Largest mindshare in 2026 |
| **Crush (charmbracelet)** | (Go) | Terminal TUI | Single agent, fast | In-memory | Multi | Fast TUI, May 2025 launch |
| **claude-engineer (Doriandarko)** | (Python) | CLI agent loop | Tool-use loop, no formal subagents | File-based | Anthropic | Earlier-gen agent loop, simpler model |
| **claude-flow / ruvnet** | (alpha) | Hierarchical swarm (queen-led) + 100+ specialised agents | swarm_init → agent_spawn with role; consensus via Raft/Byzantine/gossip | AgentDB w/ HNSW vector indexing, sub-ms semantic search, ReasoningBank | Multi via ruvLLM | Massive multi-agent + neural-pattern training (SONA) — 27 hooks, ~210 MCP tools across 5 server groups |
| **AutoGen (Microsoft)** | (Python) | Conversation-driven multi-agent | GroupChat with manager | Conversation history | Multi | Research-style multi-agent dialogues |
| **pydantic-ai** | (Python) | Typed agents w/ Pydantic | Agent-as-tool, structured outputs | App-defined | Multi | Type safety + structured outputs |

### Cross-cutting observations

- **Claude Code's moat is the integration depth** (skills + hooks + plugins + MCP + agent-teams + memory + LSP + monitors all first-class), not the agent loop quality.
- **Cline and Aider** are the credible OSS alternatives for IDE and terminal respectively; both BYOK make them attractive for teams locked into other models.
- **claude-flow** is the closest analog to PRISM's architecture: hooks + dispatchers + memory + multi-agent + neural patterns. Worth studying for the queen-led consensus model and HNSW memory backend.
- **OpenCode by sst** has eclipsed most alternatives by star count in 2026.

---

## §6 MCP Server Ecosystem

Official Anthropic / MCP steering-group servers (`modelcontextprotocol/servers`):

| Server | Purpose | Lang | Transport |
|--------|---------|------|-----------|
| **everything** | Reference / test server (prompts + resources + tools) | TS | stdio/http/sse |
| **fetch** | Web content fetch + LLM-friendly conversion | TS | stdio |
| **filesystem** | File ops with configurable access controls | TS | stdio |
| **git** | Repo read/search/manipulate | Python | stdio |
| **memory** | Knowledge-graph persistent memory | TS | stdio |
| **sequential-thinking** | Structured reasoning chains | TS | stdio |
| **time** | Timezone conversions | TS | stdio |

Archived (moved to `servers-archived`): GitHub, GitLab, PostgreSQL, SQLite, Redis. Replaced by community / vendor-maintained variants.

### MCP server design best practices (from Anthropic docs + cookbook)

1. **Tool descriptions are prompts** — invest the same care as in system prompts. Include examples and edge cases.
2. **Natural-format schemas** — match training data conventions (avoid baroque XML for things that read better as JSON).
3. **Reasoning headroom** — leave token room for the model to think; don't over-cram.
4. **Few, well-named tools** beat many micro-tools. Each tool's schema is always-on context.
5. **Stdio default** — http/sse only when remote.
6. **Resources for read-only browsing** (URI-based listing), tools for actions.
7. **Prompts for multi-step playbooks** the user invokes by name.

### Community MCP server patterns

- Domain-specific (Linear, GitHub, Stripe, Slack, Notion, Postgres, Redis...)
- Vector / RAG (Pinecone, Qdrant, Chroma, Weaviate)
- Browser automation (Playwright, Puppeteer)
- Cloud (AWS, GCP, Azure)
- IDE/editor (VSCode, Neovim, JetBrains)
- Specialty (HuggingFace models, blender, figma, canva — see PRISM's installed plugins: claude-flow, context7, linear, playwright, canva, autodesk)

---

## §7 Claude Agent SDK (Python + TypeScript)

Two interaction modes:

```python
# 1. One-shot stateless
async for msg in query(prompt="What is 2+2?"):
    print(msg)

# 2. Stateful interactive
async with ClaudeSDKClient(options=ClaudeAgentOptions(...)) as client:
    await client.query("First")
    async for m in client.receive_response(): ...
    await client.query("Follow-up")  # maintains history
```

`ClaudeAgentOptions` knobs: `system_prompt`, `max_turns`, `cwd`, `allowed_tools`, `disallowed_tools`, `permission_mode` (`acceptEdits`/`auto`/`dontAsk`/`bypassPermissions`/`plan`/`default`), `mcp_servers`, `hooks`, `cli_path`.

### In-process MCP servers (the headline feature)

```python
@tool("greet", "Greet a user", {"name": str})
async def greet_user(args):
    return {"content": [{"type": "text", "text": f"Hello, {args['name']}"}]}

server = create_sdk_mcp_server(name="my-tools", version="1.0.0", tools=[greet_user])
options = ClaudeAgentOptions(
    mcp_servers={"tools": server},
    allowed_tools=["mcp__tools__greet"]
)
```

No subprocess, no IPC overhead, type-safe. Mix in-process and external (`{"internal": sdk_server, "external": {"type":"stdio", "command":"..."}}`).

### Hooks in Python

`HookMatcher(matcher="Bash", hooks=[check_bash_command])` returning `{"hookSpecificOutput": {"hookEventName":"PreToolUse", "permissionDecision":"deny", "permissionDecisionReason":"..."}}`.

### When to use SDK vs CLI vs MCP

| Need | Use |
|------|-----|
| One-off query in a script | `query()` |
| Multi-turn interactive | `ClaudeSDKClient` |
| Custom business-logic tools embedded in your app | In-process SDK MCP server |
| External services / shareable across teams | External MCP server (stdio) |
| Manual ad-hoc work | Claude Code CLI |
| Deterministic gates around an agent | SDK + hooks |
| Production agent product | SDK + tools + hooks |

Errors: `ClaudeSDKError`, `CLINotFoundError`, `CLIConnectionError`, `ProcessError`, `CLIJSONDecodeError`.

---

## §8 Plugins

A plugin is a directory with `.claude-plugin/plugin.json`:

```json
{ "name": "my-plugin", "description": "...", "version": "1.0.0", "author": {"name":"..."} }
```

Skills become `/my-plugin:skill-name` (always namespaced — collision-free). Without `version`, the git SHA is used and every commit counts as new version.

### Plugin layout (everything is at the plugin root, NOT inside `.claude-plugin/`)

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json            (manifest only)
├── skills/<name>/SKILL.md     (skills as directories)
├── commands/<name>.md         (legacy flat skills — use skills/ for new)
├── agents/<name>.md           (custom subagents)
├── hooks/hooks.json           (event handlers — same schema as settings.json hooks)
├── .mcp.json                  (MCP servers shipped with the plugin)
├── .lsp.json                  (LSP servers — language intelligence)
├── monitors/monitors.json     (background watchers — tail logs, files, status)
├── bin/                       (executables added to Bash PATH while plugin enabled)
└── settings.json              (plugin defaults — only `agent` + `subagentStatusLine` keys)
```

### Plugin extension surface

- **Skills** — `skills/<name>/SKILL.md`
- **Subagents** — `agents/<name>.md` (no `hooks`, `mcpServers`, `permissionMode` for security)
- **Hooks** — `hooks/hooks.json` matching settings.json schema; receives JSON on stdin (`jq -r '.tool_input.file_path'`)
- **MCP servers** — `.mcp.json` with stdio/http/sse entries
- **LSP servers** — `.lsp.json` for language intelligence (Go, Rust, etc.)
- **Background monitors** — emit notifications from log tails, file watches, polling
- **PATH executables** — `bin/` adds binaries during enablement
- **Default agent** — `settings.json` `"agent": "security-reviewer"` activates a packaged agent as the main thread

### Distribution

- **Local dev**: `claude --plugin-dir ./my-plugin` (multiple `--plugin-dir` flags load multiple)
- **Remote**: `--plugin-url https://example.com/my-plugin.zip` for CI build artifacts
- **Marketplace**: `/plugin marketplace add user/repo` then `/plugin install <name>`
- **Official**: submit at claude.ai/settings/plugins/submit or platform.claude.com/plugins/submit
- **Private**: marketplace in a private GitHub repo

### Reload during development

`/reload-plugins` picks up edits to skills, agents, hooks, MCP servers, LSP servers without a restart.

### Installed PRISM plugins (current session)

- **claude-flow** (ruvnet) — multi-agent swarm
- **context7** — live docs lookup
- **linear** — Linear issue ops (OAuth-gated)
- **playwright** — browser automation
- **canva** (claude.ai) — design ops
- **autodesk** (claude.ai) — Autodesk product help
- **superpowers** — methodology skills (TDD, brainstorming, etc.)
- **hookify** — hook authoring helpers
- **commit-commands**, **pr-review-toolkit**, **frontend-design**, **skill-creator**, **claude-md-management**, **agent-sdk-dev**, **code-review**, **feature-dev**, **qodo-skills**, **claude-code-setup** — community plugins each adding a focused slash-command set

---

## §9 Composing Skills + Hooks + MCP + Agents (Best Practice)

How the layers interact in a max-leverage architecture:

| Layer | When it fires | What it owns | Cost |
|-------|---------------|--------------|------|
| **CLAUDE.md** | Always (session start) | Standing constitution: role, sources of truth, hard rules | Always-on tokens |
| **Hooks** (settings.json) | Deterministic events (PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, Stop) | Block / audit / inject context. No model in the loop. | Per-fire latency only |
| **Skills (`description`)** | Always loaded as descriptions; body on invoke | Procedural knowledge, runbooks, reusable workflows | ~100 tok/skill always; body on demand |
| **MCP server tools** | Listed in tool descriptions | Deterministic compute / remote calls / state | Tool-schema bytes always-on per server |
| **Subagents** (`.claude/agents/`) | Delegated by main thread | Side-tasks that would flood main context (search, exploration, parallel work) | Own context window — main only sees summary |
| **Agent teams** | Cross-session multi-agent runs | Long-running coordinated work | Per-agent process |
| **SDK in-process tools** | Embedded in your application | App-specific business logic | Single-process, no IPC |

### The compounding pattern (PRISM-aligned)

1. **CLAUDE.md** — constitution, paths, hard rules. ~200 lines max.
2. **Hooks** — enforce. duplicate-block, build-state-inject, scrutinize-before-stop.
3. **Skills (descriptions only)** — discoverable surface for procedural knowledge. ~100 token cost per skill always-on.
4. **Skills (bodies)** — load only when invoked.
5. **MCP dispatchers** — deterministic compute (physics, calc, registry lookup, memory, safety). Action enums keep tool count low while exposing many capabilities.
6. **Subagents** — parallel work, isolation, context preservation. Use `context: fork` skills to push tasks into Explore/Plan agents.
7. **Plugins** — versioned distribution of all of the above as a unit.

### Anti-patterns observed

- **Inlining what should be a skill**: pasting the same checklist into chat 3+ times is the signal to extract it.
- **Skill body that's actually reference docs**: move it to `reference.md`, link from SKILL.md.
- **Auto-firing skills with weak descriptions**: Claude triggers them on hunches; tighten the description or add `disable-model-invocation: true`.
- **MCP server with one tool that takes 100 args**: split into action enums (PRISM dispatcher pattern), or split into multiple narrow tools.
- **Hook that runs the model**: hooks are for deterministic logic. If you need reasoning, that's a skill or a subagent.
- **Subagent for a 1-shot task**: just inline; subagents pay context-setup cost.
- **Skill calling skill calling skill (3+ deep)**: each invocation is permanent context. Flatten.
- **Plugin shipping `commands/` instead of `skills/`**: the flat layout works but loses progressive disclosure.

### Anthropic's "Building Effective Agents" core principles (mapped to Claude Code)

1. **Maintain simplicity** — start with augmented-LLM (skill + tool + memory), only add complexity when it demonstrably helps.
2. **Transparency** — show the planning steps; the `Plan` subagent does this natively.
3. **Clear agent-computer interfaces** — invest in tool descriptions; this is `description` + `when_to_use` for skills, and tool schemas for MCP.

Workflow patterns (low complexity → high):

- **Augmented LLM** (single skill with tools + retrieval) → most cases
- **Prompt chaining** → compose skills with Skill tool calls
- **Routing** → main thread + `disable-model-invocation` skills the user picks
- **Parallelization** → agent teams or `context: fork` subagents
- **Orchestrator-workers** → main agent dispatches to subagents (Claude Code's default)
- **Evaluator-optimizer** → e.g. `prism-review` skill spawning physics + wiring + test reviewers
- **Autonomous agent** → unbounded loop with environmental feedback; needs guardrails (hooks, max-turns, isolation)

---

## §10 PRISM Cross-Reference

How PRISM's current architecture maps to the spec:

| Spec layer | PRISM equivalent | Health |
|------------|------------------|--------|
| Skills | 247 project (`.claude/commands/`) + 390 user (`~/.claude/commands/`) — flat-file layout | Should migrate hot ones to `skills/<name>/SKILL.md` for sibling-file pattern (`reference.md`, `scripts/`) |
| Hooks | 457 Claude hooks + 54 source hooks across H:/.claude/settings.json + project + local | Already exceeds typical OSS by ~50x; profile budget critical |
| MCP servers | 97 dispatchers, 7341 actions (action-enum pattern) | This IS the PRISM moat — one server, many actions, cheap discovery |
| Subagents | 8 named teams (forge-team, pipeline-team, test-team, code-reviewer, scout-explorer, etc.) | Underused vs available skill surface — many forge-* skills could `context: fork` into Explore |
| Plugins | 18 installed (claude-flow, context7, linear, playwright, canva, autodesk, superpowers, hookify, commit-commands, pr-review-toolkit, frontend-design, skill-creator, claude-md-management, agent-sdk-dev, code-review, feature-dev, qodo-skills, claude-code-setup) | Healthy spread; consider packaging PRISM's skill+hook+dispatcher bundle as a publishable plugin |

### High-leverage migrations PRISM should consider

1. **Convert hot `.claude/commands/*.md` → `.claude/skills/*/SKILL.md`** for: forge-*, lathe-*, wedm-*, hypermill-*, mill-*. Lets each carry `reference.md` + `scripts/` and use `${CLAUDE_SKILL_DIR}` for path-resilient invocations.
2. **Add `paths:` frontmatter** to domain skills (`paths: "JM DIE/**/*.MIN"` for lathe; `paths: "*.f3d,*.ipt"` for CAD) so they auto-load only when relevant — frees description budget.
3. **Adopt `context: fork` + `agent: Explore`** for read-heavy skills (audit, dedup, scrutinize) so they don't pollute main thread.
4. **Package PRISM as a publishable plugin** with `skills/`, `agents/`, `hooks/hooks.json`, `.mcp.json` — distributable to the JM Die test shop and beyond. Use `version` in plugin.json to control update cadence.
5. **Use `memory: project`** on the prism-review and forge-team subagents so they accumulate codebase patterns across sessions (replaces some of the wiki-recall load).
6. **Convert long CLAUDE.md sections to `user-invocable: false` skills** with `paths:` triggers — keeps reference material out of every-session context but available when relevant. (E.g. WEDM AGI Status block, Ollama Offload Dashboard block.)
7. **In-process SDK MCP server**: PRISM's dispatcher action surface could be exposed via `claude-agent-sdk-python`'s `create_sdk_mcp_server` for embed-in-app scenarios (Cowork, Discord/Slack bot).

---

## Sources

- [Claude Code: skills](https://code.claude.com/docs/en/skills)
- [Claude Code: slash-commands](https://code.claude.com/docs/en/slash-commands)
- [Claude Code: sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code: plugins](https://code.claude.com/docs/en/plugins)
- [anthropics/skills (GitHub)](https://github.com/anthropics/skills)
- [anthropics/claude-code (GitHub)](https://github.com/anthropics/claude-code)
- [anthropics/anthropic-cookbook (GitHub)](https://github.com/anthropics/anthropic-cookbook)
- [anthropics/claude-agent-sdk-python (GitHub)](https://github.com/anthropics/claude-agent-sdk-python)
- [modelcontextprotocol/servers (GitHub)](https://github.com/modelcontextprotocol/servers)
- [ruvnet/claude-flow (GitHub)](https://github.com/ruvnet/claude-flow)
- [wshobson/agents (GitHub)](https://github.com/wshobson/agents)
- [obra/superpowers (GitHub)](https://github.com/obra/superpowers)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [BuildBetter: Best OSS Claude Code Skills 2026](https://blog.buildbetter.ai/best-open-source-skills-for-claude-code-in-2026-complete-guide/)
- [Agent Skills open standard](https://agentskills.io)
- [@eng_khairallah1 — "How to Use Claude Skills to Automate Any Workflow (Full Course)"] — X post; HTTP 402 on direct fetch, body captured out-of-band to `H:/last.md` 2026-05-11

---

## §11 External validation — @eng_khairallah1 "How to Use Claude Skills to Automate Any Workflow (Full Course)" (added 2026-05-11)

A practitioner course on the skill *lifecycle*. Most of its mechanics (anatomy, frontmatter, discovery, ecosystem, the 500-line cap, "3-5 trigger phrases in the description") are already in §1-§4 above. What it ADDS — the **process discipline** the rest of this card was silent on — is folded into roadmap milestone **SKILLS-UTILIZATION-MS0** (`state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-SKILLS-UTILIZATION-MS0-ATOMIZED-2026-05-10.md`):

| # | Course concept | New vs this card? | PRISM home |
|---|---|---|---|
| 1 | "A Skill is a *trained employee*, not a *saved prompt*" — standardized vs one-off output quality | framing only | doc note (this section) |
| 2 | **Three-Question pre-build Test** — (a) brutally-specific purpose, (b) list ≥5 trigger phrases you'd actually type, (c) show an *actual* perfect-output example (worth more than 50 lines of instructions) | YES — not formalized as a gate before | U-SKU01 (PreToolUse hook on `**/SKILL.md` creation) |
| 3 | **Three-Scenario Test** — happy path (80% of cases) / edge case (weird/incomplete/conflicting input) / stress test (biggest, messiest version — reveals if it scales) = the production-grade bar | YES — no skill-testing protocol existed | U-SKU02 (`<skill>/scenarios/{happy,edge,stress}.md` + `prism_dev:skill_test` runner) |
| 4 | "Vague language is BANNED" — `format nicely`, `handle appropriately`; every instruction specific + testable | partial ("imperative terse" only) | U-SKU03 (skill linter rule, sibling of `/wiki-lint`) |
| 5 | <500-line SKILL.md cap | YES (§1) | folded into U-SKU03 |
| 6 | **Weekly Refinement Cycle** — update SKILL.md the moment output isn't right; Friday calendar reminder for the first month → after a month the skill is indistinguishable from a trained human | YES — no skill-maintenance cadence existed | U-SKU04 (telemetry-driven nudge + Friday cron) |
| 7 | "One Skill is a tool. Ten Skills is a workforce." — build 1 skill/week; within 1 month → 10 production-grade; within 3 months → complete library; maintain a master tracking doc (skill + status + last-refinement-date) | partial — ecosystem repos listed, methodology not | U-SKU05 (audit PRISM's ~637 skills against the bar) + U-SKU06 (registry schema: `production_grade`, `last_refined`, `scenario_tests`, `trigger_phrases`) |
| 8 | Browse skillsmp.com / github.com/anthropics/skills (80k+ community skills) and install relevant ones | partial — agentskills.io mentioned, skillsmp.com not | U-SKU07 (marketplace scan — a source on the AUTO-LEARNING-LOOP monitor, not a parallel poller) |
| 9 | "Share your best Skills publicly" | YES | U-SKU08 — **rescoped to INTERNAL-only.** Per the hard rule `feedback_no_public_h_drive.md` (set 2026-05-11): nothing from the H: drive may be shared/published publicly. This **supersedes §10 item 4's "and beyond"** — public distribution is hard-ruled out until the user clears each artifact explicitly. |
| 10 | ROI math — 1 skill saving 30 min/wk = 26 h/yr; 10 skills = 260 h/yr = 6.5 work weeks | YES | folded into U-SKU05's audit scorecard (replaces the estimate with the real number) |

**Net read:** PRISM is 64× past the course's "ten skills = workforce" headcount bar — but headcount is vanity. SKILLS-UTILIZATION-MS0 is the discipline that converts "we have 637 skills" into "we have N production-grade skills saving M hours/year, here's the prioritized gap list to grow N." The course's value is the *gate* (3Q), the *bar* (3-scenario), the *cadence* (weekly refine), and the *linter rule* (no vague verbs).
