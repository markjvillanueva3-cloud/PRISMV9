---
source: project
section: BRIDGING ACCESS — Gemini / Codex / Ollama tap-in (added 2026-05-04)
slug: bridging-access-gemini-codex-ollama-tap-in-added-2026-05-04
indexed_at: 2026-05-04T20:05:40.086Z
---

## BRIDGING ACCESS — Gemini / Codex / Ollama tap-in (added 2026-05-04)

Each non-Claude CLI has different surfaces for accessing PRISM awareness, memory, GSD, master index, AI/neural, and Obsidian 2nd-brain. This section is the single reference for how each one taps in.

### Awareness bundle (single CLI-agnostic aggregator)
`H:/PRISM/.claude/helpers/prism-awareness-bundle.mjs` produces injectable text in 3 modes:
- `--brief` (~18KB) — CLAUDE-BRIEF only · process priorities · paths · scale
- `--standard` (~22KB) — brief + memory index + active file claims + current position
- `--full` (~26KB) — standard + master-index excerpt + GSD-quick header

All modes always include AI/neural/obsidian/handoff access tables (≈4KB).

```bash
# Gemini — append bundle as context to a non-interactive prompt:
gemini -p "$(node H:/PRISM/.claude/helpers/prism-awareness-bundle.mjs --standard)
Now: <real prompt>"

# Codex — feed bundle as system instruction:
codex exec --append-system-prompt \
  "$(node H:/PRISM/.claude/helpers/prism-awareness-bundle.mjs --full)" \
  "<real prompt>"

# Ollama (raw API) — system prompt:
curl http://127.0.0.1:11434/api/generate -d "$(jq -n \
  --arg sys "$(node H:/PRISM/.claude/helpers/prism-awareness-bundle.mjs --brief)" \
  --arg p "<real prompt>" \
  '{model:"deepseek-r1:14b", system:$sys, prompt:$p, stream:false}')"

# OR via MCP dispatcher (any CLI with prism MCP wired):
prism_context:ollama_context_wrap { prompt: "...", mode: "standard" }
# returns { system, prompt } — ready for direct /api/generate
```

### Per-CLI auto-inject mechanism
| CLI | Static context (session-start) | Live awareness inject | Memory parity |
|---|---|---|---|
| **Claude Code** | `CLAUDE.md` (project + global) | UserPromptSubmit hooks | `~/.claude/projects/H--PRISM/memory/MEMORY.md` |
| **Gemini CLI** | `GEMINI.md` (project + global, mirror) | `SessionStart` hook → runs bundle (wired in `.gemini/settings.json`) | `~/.gemini/MEMORY.md` (mirror) |
| **Codex CLI** | `AGENTS.md` (project + global, mirror) | No native hook → manual `--append-system-prompt` with bundle | `~/.codex/MEMORY.md` (mirror) |
| **Ollama** (deepseek/qwen) | None — stateless API | `OllamaContextFloorEngine.wrap()` per-call (cached) | n/a — caller passes via `system` |

### MCP dispatcher access (callable from any CLI)
- **Awareness query:** `prism_intelligence:ai_feature_route` · `prism_session:dispatcher_map_compact` · `prism_dev:capability_census`
- **Memory:** `prism_memory:remember` · `prism_memory:semantic_search` · `prism_memory:agent_memory_query`
- **GSD:** `prism_gsd:core` · `prism_gsd:quick` · `prism_gsd:get`
- **Master index:** `prism_session:action_search` · `prism_session:tool_route_best`
- **Handoffs:** `prism_session:handoff_prepare` · `prism_session:resume_session`
- **AI/reasoning:** `prism_ai:cot_reason` · `prism_ai:creative_solve` · `prism_intelligence:ai_orchestrate_autonomous`
- **Neural / XPROC:** `prism_intelligence:xproc_agi_orchestrate` · `prism_intelligence:xproc_agi_episodic` · `prism_ai:neural_route`
- **Obsidian 2nd brain:** `prism_knowledge:obsidian_sync_pull` · `prism_knowledge:obsidian_sync_push` · `prism_knowledge:wiki_query`

### Mirror sync — keeping CLI context files aligned
`H:/PRISM/.claude/helpers/sync-cli-context-files.mjs` propagates **6 mirrors** in one run:
- `CLAUDE.md` (project) → `GEMINI.md`, `AGENTS.md`
- `~/.claude/CLAUDE.md` (global) → `~/.gemini/GEMINI.md`, `~/.codex/AGENTS.md`
- `~/.claude/projects/H--PRISM/memory/MEMORY.md` → `~/.gemini/MEMORY.md`, `~/.codex/MEMORY.md`

**Edit `CLAUDE.md` only** — sync helper propagates to the others. Run after major edits, or wire to a Stop hook for auto-sync.
