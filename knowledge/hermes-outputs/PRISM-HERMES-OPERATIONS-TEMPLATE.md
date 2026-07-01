# PRISM-HERMES OPERATIONS TEMPLATE (Parity with Claude Code CLI)

**Date**: 2026-06-12
**Source**: Deep research via session_search (recent TUI/cron sessions + AGENTS.md protocol), hermes-agent skill, CLAUDE.md, CODEX.md, GSD files, hook manifests, slash command manifest, and PRISM dev protocol.

## 1. Core Philosophy (Identical for Hermes & Claude Code CLI)
- **No stubs/partials/placeholders** — HARD BLOCK. Every deliverable is a working artifact backed by real tool output or execution.
- **Comprehensive route only** — no "good enough". Exhaustive analysis of paths, edge cases, failure modes, second-order effects.
- **3-of-3 Scrutiny** on Stop for any file changes (Codex arm + 2 Claude reviewers). Ledger at mcp-server/data/state/SCRUTINY_LEDGER.json.
- **Authority gates** — zulu_authority_check for directives; workers keep their own S(x)≥0.70 and gates.
- **Fail loud** — "I don't know" > confident guess. Report blockers honestly.
- **Token thrift** — route mechanical work to local Ollama; reserve paid models for judgment/safety.

## 2. Hook Activation & Lifecycle (Same as Claude)
- **SessionStart** (auto on every chat):
  - inventory-check-guard (injects PRISM-INVENTORY-LATEST.md counts)
  - master-index-search-gate (fuzzy duplicate check)
  - dedup-auto-invoke + duplication-hard-block (exact duplicates BLOCK)
  - ai-feature-recommend
  - build-create-detector
  - build-state-inject (BUILD_STATE.md snapshot)
  - prism-vault-loop skill for Obsidian self-learning
- **UserPromptSubmit** (keyword-gated or always for certain):
  - stop hooks (scrutiny-before-stop blocks on uncommitted changes without 3-of-3 PASS)
  - enforce-handoff-topic (renames HANDOFF-*.md to include topic)
  - commit-ownership-guard / git-anti-clobber
  - stop_on_unwired_assets (blocks zero-dispatcher orphans)
  - ollama-offload (if rate allows)
- **Stop** (before any completion):
  - scrutiny-3way (Codex + 2 reviewers)
  - per-agent-handoff write (auto on /compact or manual)
  - topic enforcement
- **Nightly/Weekly** (cron):
  - dream synth, weekly reflection into memories/dreams/
  - ollama-offload-dashboard
  - curator (skill lifecycle: pin/unpin/archive stale skills)
- **Per-Chat Handoff** (6 concurrent chats):
  - Write at /handoff or /compact via per-agent-handoff.mjs
  - Read at /startup
  - Topic derived from commit [SCOPE-MS#] or CURRENT_POSITION.md or branch
- **Engine Wiring** (2026-04-28 rule):
  - New engine → wire to ALL natural dispatchers in same commit (not just singleton)
  - stop-auto-wire.mjs audits; stop_on_unwired_assets HARD BLOCKS

## 3. Slash Commands (Triggers & Usage — Identical)
- **Before any new asset** (/dedup, /forge-triple):
  - /dedup — duplication guard before engine/hook/skill/script
  - /forge-triple — new engine + skill + hook together
- **Document/Video/Tribal**:
  - /pdf-learn, /video-learn, /shop-knowledge
- **Machine/Optimization**:
  - /wire-edm-studio, /lathe-studio, /machine-harden, /auto-speed-feed, /program-optimize, /scrutinize, /quote-to-ship, /smart
- **PRISM Specific** (from manifest):
  - /pdf-learn for PDFs/manuals
  - /video-learn for tutorials
  - /shop-knowledge for tribal
  - /dedup before create
  - /forge-triple after dedup
- **Hermes Equivalent** (map to same triggers):
  - Use `/skill prism-vault-loop` or load via skill_view for Obsidian
  - `/cron` for scheduled (morning vault brief, inbox sweep)
  - `/help` or `/commands` to list
  - Enforce same "use /dedup before new engine" rule in Hermes sessions

## 4. Skills (When & How — Identical)
- **Load before task** if matches (mandatory per prompt):
  - autonomous-ai-agents (claude-code, codex, hermes-agent, kanban-codex-lane, opencode)
  - creative (architecture-diagram, ascii-art, baoyu-*, claude-design, comfyui, design-md, excalidraw, humanizer, ideation, manim-video, p5js, pixel-art, popular-web-designs, pretext, sketch, songwriting-and-ai-music, touchdesigner-mcp)
  - data-science (jupyter-live-kernel)
  - devops (webhook-subscriptions)
  - dogfood
  - email (himalaya)
  - gaming (pokemon-player)
  - github (codebase-inspection, github-auth, github-code-review, github-issues, github-pr-workflow, github-repo-management)
  - mcp (native-mcp)
  - media (gif-search, heartmula, songsee, spotify, youtube-content)
  - mlops (huggingface-hub, weights-and-biases, llama-cpp, segment-anything-model, dspy)
  - note-taking (obsidian)
  - prism (prism-vault-loop — ZULU's Obsidian self-learning loop)
  - productivity (airtable, google-workspace, linear, maps, nano-pdf, notion, ocr-and-documents, powerpoint, teams-meeting-pipeline)
  - red-teaming (godmode)
  - research (arxiv, blogwatcher, llm-wiki, polymarket)
  - smart-home (openhue)
  - software-development (debugging-hermes-tui-commands, hermes-agent-skill-authoring, hermes-s6-container-supervision, node-inspect-debugger, plan, requesting-code-review, simplify-code, spike, subagent-driven-development, systematic-debugging, test-driven-development, writing-plans)
  - yuanbao
- **After difficult/iterative tasks** — offer to save as skill with skill_manage (action='create' or 'patch')
- **Patch immediately** if skill outdated/incomplete/wrong
- **Hermes Mapping**:
  - Use `skill_view(name='hermes-agent')` first for any Hermes config/setup
  - Load `prism-vault-loop` for Obsidian
  - Use `hermes skills install` or `/skill` to load PRISM-specific
  - Curator runs nightly for skill lifecycle (same as PRISM curator)

## 5. Scripts, Tools, Commands (Workflow — Identical)
- **Build/Create Flow**:
  1. /dedup or duplicationGuardEngine.checkBeforeCreating
  2. Read inventory, BUILD_STATE.md, MILESTONE_PROGRESS.md, wiki/index.md
  3. Wire to all dispatchers
  4. Full working code + tests + scrutiny
  5. Commit with [SCOPE-MS#]
  6. Handoff per-chat
- **Research**:
  - session_search for past sessions
  - prism_memory brain_recall/semantic_search
  - prism_knowledge tribal_search
  - web_search / web_extract
- **Hermes CLI Parity**:
  - `hermes chat -q "..."` for single query (like Claude one-shot)
  - `hermes --yolo` for bypass (same as PRISM yolo)
  - `hermes config set` for settings (same as PRISM config)
  - `hermes skills list/install` (map to PRISM /skill or load)
  - `hermes cron create` (map to PRISM cron for vault brief)
  - `hermes delegate_task` (map to PRISM subagent or slot_brief)
  - Enforce same "no stubs" by rejecting any partial in Hermes output

## 6. Enforcement & Parity Rules for Hermes
- **No exemption** — same as Claude: no gate weakening, no stub shipping, no inline constants, 3-of-3 where applicable.
- **Stub Prevention** — same stop hooks: if Hermes session produces stub, block like Claude.
- **Handoff & Multi-Chat** — same per-agent-handoff.mjs, topic enforcement, conflict-fork rule.
- **Ollama Max** — same as PRISM (route to local gpt-oss:20b/120b, nomic-embed-text for embeddings).
- **Qdrant/Memory Graph** — same (when operational).
- **Scrutiny** — apply 3-of-3 on Hermes changes if wired.
- **Write Lane** — Hermes outputs only to knowledge/hermes-outputs/ (same as ZULU rule).

## 7. Recommended Hermes Config for PRISM Parity
- Load `hermes-agent` skill on any Hermes config task.
- Preload `prism-vault-loop` + `obsidian` + relevant PRISM skills on startup.
- Use `--skills prism-vault-loop,hermes-agent` flag.
- Set `approvals.mode: smart` or `off` (yolo) same as PRISM.
- Enable `memory.memory_enabled: true`, `curator.enabled: true`.
- Map `/help` to show PRISM slash commands + Hermes equivalents.
- Enforce "use /dedup or equivalent before new engine/hook/skill" in all Hermes sessions.

This template ensures Hermes sessions follow the exact same PRISM build workflow, hook timing, slash/skill usage, no-stub enforcement, and scrutiny as Claude Code CLI. All future Hermes runs in PRISM context must adhere.

**Next Step**: Save as skill `prism-hermes-parity` or patch hermes-agent skill with this parity section.