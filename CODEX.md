# CODEX.md — PRISM Doctrine for Codex CLI

> **This is the Codex-native doctrine entry point.** It mirrors what `CLAUDE.md` is to Claude Code.
> Codex auto-loads `AGENTS.md` (repo root + parent dirs) and `~/.codex/AGENTS.md` — those carry the
> full doctrine (auto-mirrored from `CLAUDE.md` / `~/.claude/CLAUDE.md` by
> `.claude/helpers/sync-cli-context-files.mjs`). This file adds the **Codex-specific addenda** on top.

## Read these (Codex auto-loads the first two; you read the rest as needed)
- `H:/PRISM/AGENTS.md` — repo-root doctrine (auto-mirror of `H:/PRISM/CLAUDE.md`): the broad PRISM operating rules, manufacturing reasoning, engine-selection, token economy, RTK, quality gates, safety, scrutiny, handoff, lane discipline, MCP dispatchers.
- `~/.codex/AGENTS.md` — global doctrine (auto-mirror of `~/.claude/CLAUDE.md`) + a Codex-addenda footer (the `CLAUDE-CODEX-MCP-DIRECTIVE.md` pointer + Codex pointers).
- `H:/PRISM/.codex/AGENTS.md` — the compact rule bundle to **prepend when spawning Codex agents** (the `prism-spawn-awareness` bundle first, then this).
- `H:/PRISM/state/shared/CLAUDE-CODEX-MCP-DIRECTIVE.md` — canonical MCP-usage doctrine (the only non-retired MCP doc).
- `H:/PRISM/state/shared/CLAUDE-CODEX-*.md` — the shared bridges: coordination, 6-chat protocol, command-bridge, command-awareness, SVI, task-queue, RGS-sync, spawned-agent, search-token, roadmap-execution.
- `~/.codex/MEMORY.md` — auto-mirror of the PRISM project memory index (`~/.claude/projects/H--PRISM/memory/MEMORY.md`): user profile, feedback rules, project memories.
- `H:/PRISM/PRISM-INVENTORY-LATEST.md` — live counts (never hardcode counts; read this).
- `H:/PRISM/mcp-server/data/docs/{ENGINE_DIGEST,DISPATCHER_DIGEST,DIRECTORY_DIGEST}.md` — pre-computed indexes; check ENGINE_DIGEST before creating engines.

## Codex-specific operating notes
- **No per-prompt hooks.** Claude Code injects prism-awareness / tribal-knowledge / wiki / build-state / chat-bus on every prompt via UserPromptSubmit hooks. Codex has none of that. Compensate by *proactively*:
  - calling the `prism` MCP server (wired in `~/.codex/config.toml` as `[mcp_servers.prism]` stdio + `[mcp_servers.prism_safe]` fallback) — its `prism_session`, `prism_self_awareness` / `prism_intelligence`, `prism_calc`, `prism_cam`, `prism_safety`, `prism_memory`, `prism_dev`, … dispatchers are the same execution surface Claude uses;
  - running `node H:/PRISM/.claude/helpers/codex-self-awareness.mjs` for the prism-awareness bundle and `node H:/PRISM/.claude/helpers/codex-command-awareness.mjs` for the live slash-command list;
  - reading `BUILD_STATE.md`, `MILESTONE_PROGRESS.md`, the chat bus (`agent-coordination.mjs`), and the wiki (`knowledge/wiki/index.md`) at session start.
- **Tribal knowledge / shop floor:** `prismSelfAwarenessEngine.searchTribalKnowledge(q)` via the `prism` MCP, or the `/shop-knowledge` skill spec; ~3,700 tips, 18 CAM systems. JM Die is the test shop (`mcp-server/src/data/jm-die-profile.ts`, `H:/PRISM/JM DIE/`).
- **System-viz:** the live 3D system map — directive `H:/PRISM/state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md`, query adapter `H:/PRISM/scripts/system-viz-query.mjs`, slash command `/system-viz`. Use for roadmap planning, refactor blast-radius, multi-chat conflict avoidance.
- **Obsidian / personal-knowledge:** the OBSIDIAN-* milestones + `knowledge/claude-md/project-bridging-access-gemini-codex-ollama-tap-in*.md`; HMAC webhook intake (`U-CAPTURE-WEBHOOK`).
- **Pipelines:** PrintToProgram, Turning, MultiAxis, MillTurn, EDM, Grinding, Laser, Waterjet, QuoteToShip — exposed as engines + the `/quote-to-ship`, `/print-to-program`, `/full-job` skills; orchestration via `prism_orchestrate` / `prism_autopilot_d` / `prism_atcs`.
- **Slash commands:** the PRISM skill set (`H:/PRISM/.claude/commands/*.md` + `~/.claude/commands/*.md`) is mirrored into `~/.codex/prompts/*.md` as thin shims (each points at the canonical `H:/PRISM/.claude/commands/<name>.md` spec). Regenerate via `node H:/PRISM/.claude/helpers/sync-codex-prompts.mjs`. The doc-form catalog is `state/shared/CLAUDE-CODEX-COMMAND-BRIDGE.md`.
- **Scrutiny gate:** the strict 3-of-3 (Codex CLI + 2 Claude reviewer agents) — `scrutiny-3way.mjs` runs the Codex arm; see `scrutinize-before-stop.mjs` + `scrutiny-ledger.mjs`. When invoked by the gate via `npx codex exec`, you ARE the Codex arm — give an honest `VERDICT: PASS|FAIL` on the first line.
- **Codex config:** `~/.codex/config.toml` (model `gpt-5.5`, sandbox `danger-full-access`, H:\ trusted, MCP servers prism/prism_safe/linear/figma/playwright). Project overlay: `H:/PRISM/.codex/config.toml`. Repair: `scripts/repair_codex_shell_and_mcp.ps1`. Parity self-check: `node H:/PRISM/.claude/helpers/codex-parity-audit.mjs`.

## Discipline (same as Claude — see AGENTS.md for the full text)
- Karpathy 4 (think-before-coding, simplicity-first, surgical changes, goal-driven) + Rules 5–12 (model-for-judgment-only, token budgets, surface-conflicts, read-before-write, tests-verify-intent, checkpoint-each-step, match-conventions, fail-loud).
- Token economy: RTK prefix on shell, Ollama offload for mechanical code ops, dispatcher actions over inlined logic.
- Safety: never inline Kienzle/Taylor/material constants (import from `mcp-server/src/physics/constants.ts`); no stub engines; run affected tests after engine edits; `/dedup` before creating any asset.
- Lane discipline (six concurrent chats): own a milestone scope, commit to the matching `work/<scope>` worktree, post to the chat bus before editing shared files, conflict-fork if blocked, write a per-agent handoff before ending a slice.
