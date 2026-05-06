# Memory — Unified Memory-Operations Dispatcher

Single entry point for PRISM long-term memory operations. Routes by sub-command to search, list, prune, sync, or export operations against the Qdrant vector store + JSONL ledgers.

## Args: $ARGUMENTS
- `<op>`: required — one of `search | list | prune | sync | export | stats | recall | remember | forget`
- `[remainder]`: passed straight through to the routed handler

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - keyword:"memory"
    - keyword:"remember"
    - keyword:"recall"
    - keyword:"forget"
    - keyword:"long-term memory"
```

## Routing table

| `<op>` | Routes to | Purpose |
|--------|-----------|---------|
| `search`   | `/qdrant-semantic-search`    | Semantic lookup across collections (replaces /memory-search) |
| `list`     | `prism_memory:list_collections` | Show collection names, vector counts, dimensions |
| `prune`    | `/memory-prune`              | Dedup + drop low-confidence rows older than threshold |
| `sync`     | `/memory-sync`               | Reconcile Qdrant ↔ JSONL ledger, flush pending embeds |
| `export`   | `/memory-export`             | Dump a collection to portable .jsonl for backup |
| `stats`    | `prism_memory:stats`         | Per-collection size, last-update, embed-model versions |
| `recall`   | `prism_memory:recall`        | Single-shot kNN with current session context as query |
| `remember` | `prism_memory:remember`      | Persist a string + payload into a kind-collection |
| `forget`   | `/memory-forget`             | Delete a specific record by id (provenance preserved in ledger) |

## Sub-command guides

### search
Aliased to `/qdrant-semantic-search`. Same flags: `--kind=<kind>`, `--limit=<n>`, `--score-min=<f>`, `--filter='<json>'`, `--explain`.

### list
```
$ /memory list
prism_memory_program     1,247 vectors  768-dim  last_update: 2026-05-01T14:33Z
prism_memory_outcome       882 vectors  768-dim  last_update: 2026-05-06T09:12Z
prism_memory_tip         3,712 vectors  768-dim  last_update: 2026-04-27T20:00Z
prism_memory_formula       499 vectors  768-dim  last_update: 2026-04-15T11:08Z
prism_memory_rule          296 vectors  768-dim  last_update: 2026-04-15T11:09Z
prism_memory_playbook        8 vectors  768-dim  last_update: 2026-04-15T11:10Z
prism_memory_note        1,053 vectors  768-dim  last_update: 2026-05-06T16:00Z
prism_memory_wiki          727 vectors  768-dim  last_update: 2026-05-06T13:44Z
TOTAL                    8,424 vectors
```

### prune
- Default policy: drop rows with `confidence<0.4` AND `last_seen` older than 90 days
- Override via `--confidence=<f>` and `--older-than=<duration>`
- `--dry-run` to preview deletions

### sync
- Re-runs `embed-wiki-index.mjs` (P4-U04 cache refresh)
- Walks JSONL ledgers (UNIFIED_ERROR_LEDGER, session-learning-log, etc.) and embeds any rows missing a `vector_id`
- Reports drift between ledger row count and Qdrant point count per collection

### export
```
/memory export --kind=tip --out=H:/prism/state/backups/tip-2026-05-06.jsonl
```
Produces a self-contained jsonl: each line is `{id, payload, vector?}`. `--include-vectors` makes the export full-fidelity (~15× larger).

### remember
```
/memory remember --kind=tip "Always probe Z before first cut after tool change on Okuma" --payload='{"machine":"okuma-lt-3","material":"4140"}'
```

### forget
- Requires `--id=<vector-id>` plus `--reason=<string>` (audit trail)
- Records the deletion in `mcp-server/data/state/memory-forget.jsonl` so the same id can't be silently re-added

## Behaviour
- Unknown op: list valid ops + one-line summary each
- `memory` alone: print routing table + collection stats (combines `list` + `stats`)
- All ops use the same Ollama embedder (nomic-embed-text 768-dim) so dimensions stay consistent across collections

## MCP wiring
Most ops thin-wrap existing `prism_memory:*` actions. New actions added via this dispatcher:
- `prism_memory:list_collections`
- `prism_memory:stats`
- `prism_memory:export` (planned — writes a backup file)

## Related
- `/qdrant-semantic-search` — same as `memory search`
- `/learned-patterns-apply` — read-side that operates on `prism_memory_error` (UNIFIED_ERROR_LEDGER)
- `/vault-ingest` — write-side analog for human-curated knowledge
