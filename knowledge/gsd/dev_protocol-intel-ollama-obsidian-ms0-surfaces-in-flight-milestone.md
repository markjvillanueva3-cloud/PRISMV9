---
source: dev_protocol
section: INTEL-OLLAMA-OBSIDIAN-MS0 Surfaces (in-flight milestone)
slug: intel-ollama-obsidian-ms0-surfaces-in-flight-milestone
indexed_at: 2026-04-28T02:41:58.317Z
---

## INTEL-OLLAMA-OBSIDIAN-MS0 Surfaces (in-flight milestone)

These are auto-wired and require no manual invocation:

### Vault Re-Chunk on Edit
- `claudemd-section-update.mjs` (PostToolUse) — re-chunks
  `H:/prism/CLAUDE.md` and global `~/.claude/CLAUDE.md` whenever they
  change. Idempotent; re-embeds only deltas.
- `gsd-section-update.mjs` (PostToolUse) — same for the three GSD
  source files (`GSD_QUICK.md`, `DEV_PROTOCOL.md`, `GSD_MICRO.md`).

### Semantic Routing Auto-Inject (UserPromptSubmit)
- `claudemd-ollama-enforcer` — top-3 CLAUDE.md sections per prompt.
- `gsd-section-retrieve` — top-3 GSD sections on GSD keywords.
- `ollama-skill-suggester` — top-5 skills via semantic_search.
- `ollama-route-recommender` — top-3 dispatcher actions.
- `ollama-obsidian-rag` — vault top-5 hits + Ollama summary on
  memory keywords.

### Error Capture & Recall Loop
- 4 PostToolUse capture hooks (`error-block-capture`,
  `error-pattern-memory`, `error-recovery-memory`, `error-learner-hook`)
  mirror to `UNIFIED_ERROR_LEDGER.jsonl` via
  `unified-ledger-mirror.mjs` helper → `prism_guard:error_ledger_append`.
- `error-block-prewarn` (PreToolUse) queries
  `prism_guard:error_ledger_recall_similar` for top-3 past errors and
  injects them into the prompt — 100% capture coverage (was ~25%).

### Session-End Consolidation
- `session-consolidate-graph` (Stop) increments
  `consolidation-counter.json` and runs
  `MemoryConsolidationEngine.consolidate()` at N=5 sessions.
- Patterns mirror to `knowledge/tribal/pattern-<id>.md`.

### One-Shot Embed / Mirror Scripts (re-runnable, idempotent)
- `scripts/populate-tribal-vault.mjs` — 4245 tips
- `scripts/chunk-claudemd-vault.mjs` — ~30 CLAUDE.md sections
- `scripts/chunk-gsd-vault.mjs` — 28 GSD sections
- `scripts/embed-all-skills.mjs` — 503 skills
- `scripts/embed-all-engines.mjs` — 3013 engines
- `scripts/embed-all-actions.mjs` — 6346 actions
- `scripts/mirror-memories-bootstrap.mjs` — MEMORY.md mirror
- `scripts/summarize-all-scripts-via-ollama.mjs` — 364 scripts
- `scripts/migrate-error-ledgers.mjs` — legacy → unified ledger
