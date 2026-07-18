---
title: master-index hit counter — per-query telemetry
type: architecture
status: built
shipped: 2026-05-18
unit: U-MASTER-INDEX-HIT-COUNTER
slot: charlie
milestone: HIGH-ROI-USAGE-AUDIT-2026-05-18
sister:
  - master-index-surface
  - master-index-filter-contract-fix
  - wiki-recall-counts
---

# master-index hit counter

Per-query + per-node telemetry for `master-index-precheck-inject.mjs`. Closes action #2 of the [[high-roi-usage-audit-2026-05-18]]:

> SYSTEM-VIZ has 154 wiki recalls in 9 days over 23,981 entries (0.6% recall coverage). Instrument the injector with a per-query hit counter to surface the high-value subset.

## What it answers

- Which graph-node labels are the master-index injector actually surfacing? (top-K by count)
- Which prompt tokens are firing the most search activity? (top-K by count)
- What's the lifetime injection rate vs the live cardinality? (totalInjections / totalHits vs queryCount / nodeCount)

## Architecture

```
.claude/hooks/master-index-precheck-inject.mjs   (UserPromptSubmit, T2)
        │
        ├── runMasterIndexSearch(prompt, {topK})         ← unchanged
        ├── emit(additionalContext)                      ← unchanged (must precede counter)
        └── trackHits(tokens, hits, nowIso)              ← NEW
                │
                ├── loadCounterState(filePath)           ← R12 honest recovery
                │       └── ENOENT  → fresh empty state
                │       └── parse-fail → rename aside `.corrupt-<ts>` + stderr
                ├── applyHitDelta(state, tokens, hits, nowIso)     (pure, scripts/lib/)
                ├── pruneOverflow(state, maxQ, maxN)               (pure, LRU by lastSeenIso)
                └── persistCounterState(filePath, state)
                        └── writeFileSync(tmp) → renameSync(tmp, file)   (atomic)
```

Pure core: `scripts/lib/master-index-hit-counter.mjs`. Hook glue + I/O in `.claude/hooks/master-index-precheck-inject.mjs`.

## Counter file

Path: `mcp-server/data/state/master-index-hit-counts.json` (sibling to `wiki-recall-counts.json`).

```jsonc
{
  "schemaVersion": "1.0.0",
  "totalInjections": 0,        // prompts that emitted ≥1 hit (lifetime)
  "totalHits": 0,              // sum of node hits emitted (lifetime)
  "queryCount": 0,             // live cardinality of queries map
  "nodeCount": 0,              // live cardinality of nodes map
  "updatedAtIso": "...",
  "queries": {
    "<token>": {
      "token": "<token>",
      "count": <n>,
      "firstSeenIso": "...",
      "lastSeenIso": "..."
    }
  },
  "nodes": {
    "<label>": {
      "label": "<label>",
      "layer": "L7",
      "status": "built",
      "count": <n>,
      "firstSeenIso": "...",
      "lastSeenIso": "..."
    }
  }
}
```

`totalInjections` / `totalHits` are LIFETIME counters — they keep counting evicted entries (LRU drops the row but not the lifetime aggregate). `queryCount` / `nodeCount` are live cardinality of the maps post-prune. Surfaced explicitly via `summarizeState()`.

## Knobs

| Env var | Default | Purpose |
|---|---|---|
| `PRISM_MASTER_INDEX_HIT_COUNTER` | on (`!= "0"`) | Master off-switch. Set to `0` to skip all counter writes. |
| `PRISM_MASTER_INDEX_HIT_COUNTER_FILE` | (default path) | Override the counter file path. **Critical-surface-guarded** — basenames `settings.json`, `settings.local.json`, `CLAUDE.md`, `MEMORY.md`, `chat-slots.json`, `roadmap-index.json`, `package.json`, `tsconfig.json` are rejected (stderr breadcrumb, fallback to default path). |
| `PRISM_MASTER_INDEX_HIT_COUNTER_MAX_QUERIES` | 2000 | LRU cap on `queries` map; oldest-`lastSeenIso` evicted first. |
| `PRISM_MASTER_INDEX_HIT_COUNTER_MAX_NODES` | 5000 | LRU cap on `nodes` map. |

## Safety invariants

- **R12 fail-loud:** corrupt counter JSON is renamed aside as `.corrupt-<base36-ts>` with a stderr breadcrumb — NEVER silently overwritten (would erase `firstSeenIso` history). The hook continues to emit hits.
- **Path-injection guarded:** the env override path is rejected if its basename matches a critical-surface file. Same surface-class as the [[harness-security-audit]] doctrine.
- **Atomic write:** tmp + rename means concurrent reads from peer chats never see torn JSON. Under simultaneous writers, the last-rename-wins (small undercount drift, acceptable for telemetry — same precedent as `recall-counter-track.mjs`).
- **Emit-then-track ordering:** the hook calls `emit(block)` BEFORE `trackHits(...)` so a slow disk write never delays `additionalContext` to the model. Regression-guarded via a source-grep test.
- **Fail-soft I/O:** every catch in the counter path falls through to the fresh-state default + stderr breadcrumb. The hook ALWAYS exits 0.

## Tests

- 22 unit cases — `scripts/lib/master-index-hit-counter.test.mjs` (pure-fn lib).
- 8 hook integration cases — `.claude/hooks/__tests__/master-index-precheck-inject.test.mjs` (subprocess + real graph + per-test tmpdir).
- 3 P1-fix regression guards: comparator-NaN-coerce, critical-surface-path-reject, corrupt-JSON-aside.

## Sister files

- `scripts/lib/master-index-hit-counter.mjs` — pure-core lib (this entry's subject)
- `.claude/hooks/master-index-precheck-inject.mjs` — UserPromptSubmit T2 hook (consumer)
- `scripts/lib/master-index-search-lib.mjs` — search backend (unchanged)
- `.claude/hooks/recall-counter-track.mjs` — sibling counter for wiki recalls (different attribution unit; complementary, not duplicative)
- `mcp-server/data/state/wiki-recall-counts.json` — sibling counter file
- `mcp-server/data/state/master-index-hit-counts.json` — THIS counter file

## Followups (deferred punchlist from Reviewer A + B)

- **P2** — `pruneOverflow` could also refresh `totalInjections` / `totalHits` to live values; current behavior keeps them as lifetime aggregates (documented above).
- **P2** — hook integration tests gracefully degrade to no-op when the live graph has 0 hits for `HOT_PROMPT`; not load-bearing but reduces drift coverage.
- **P3** — vocabulary divergence with `wiki-recall-counts.json` (`entries` / `totalRecalls` vs `queries`+`nodes` / `totalInjections`); a future shared counter primitive could unify both.
- **P3** — read-modify-write race acknowledged (same precedent as `recall-counter-track.mjs`); JSONL-append migration is the long-term fix.

## Doctrine

R12 (fail-loud), R5 (hooks-enforce-not-model-instruct — telemetry is hook-driven), R8 (read sibling first — `wiki-recall-counts` pattern), R11 (match conventions — same atomic-write idiom as `recall-counter-track`).
