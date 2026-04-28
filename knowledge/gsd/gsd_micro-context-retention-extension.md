---
source: gsd_micro
section: Context Retention & Extension
slug: context-retention-extension
indexed_at: 2026-04-28T02:50:03.683Z
---

## Context Retention & Extension

Strategies that survive 200K context limits:

### Per-chat handoff (NEVER overwrite)
- Read at `/startup`: `node H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal "$(node H:/prism/.claude/helpers/stable-session-id.mjs)"`
- Write at `/handoff`: same helper, `write --terminal "$STABLE" --resume "<next>" --state "<body>"`.
- Topic suffix mandatory: `HANDOFF-<id>-<topic>.md`.

### Memory mirroring (P1-U04)
- `MEMORY.md` auto-mirrored to `knowledge/memories/{feedback,project,user,reference}/*.md`.
- Recall via `prism_memory:semantic_search kind=note`.

### Compaction recovery (3-layer automatic)
```
L1 _context           every MCP response carries task/resume/next
L2 _COMPACTION_RECOVERY  injected on 30s gap or session_boot mid-session
L3 Aggressive hijack  first call after detection → response REPLACED
                      with full recovery payload
```
If `_COMPACTION_DETECTED: true` → follow `_MANDATORY_RECOVERY` exactly.
Read `/mnt/transcripts/` latest + `state/RECENT_ACTIONS.json` →
continue.

### Working set awareness
- `working-set-awareness.mjs` tracks recently-touched files and
  scopes broad searches to that set.
- `pattern-frequency-tracker.mjs` learns which globs are productive.

### Skills load-on-demand
- 503 skills are NOT loaded into context. Semantic match via
  `ollama-skill-suggester` injects only top-5 names per prompt.

### Digests over live exploration
- `ENGINE_DIGEST.md` (3018 engines, 1-line each)
- `DISPATCHER_DIGEST.md` (95 dispatchers + counts)
- `DIRECTORY_DIGEST.md` (215 directories with purposes)
- `CODE_SYSTEM_INDEX.json` (1865 shortcode → path)

### Stable session id
- `helpers/stable-session-id.mjs` returns `claude-<8-char>` so
  per-chat artifacts persist across subprocess invocations.
