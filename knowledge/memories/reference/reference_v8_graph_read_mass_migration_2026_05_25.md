---
name: reference-v8-graph-read-mass-migration-2026-05-25
description: "46 V8 ERR_STRING_TOO_LONG callsites mass-migrated to streaming reader. Root-cause-corrected the 2026-05-17 spec (NOT heap-OOM as it assumed). New idempotent tool scripts/migrate-legacy-graph-reads.mjs. system-viz regen 42 failures → ~1."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.249Z
aliases: reference_v8_graph_read_mass_migration_2026_05_25
---


# V8 graph-read mass-migration — papa 2026-05-25

User directive: *"get everything working"* + *"continue"*.

## Root cause correction

The 2026-05-17 spec `U-REGEN-VIZ-MERGE-FAILLOUD-FIX-PLAN` diagnosed the regen-viz fail-silent class as **heap-OOM** and proposed `--max-old-space-size=8192` + stderr capture + fail-loud. That fix landed for `merge-augmentations.mjs` (streaming write at line 2139, papa /loop 2026-05-23). But the ACTUAL crash class — `RangeError: Invalid string length` / `Cannot create a string longer than 0x1fffffe8 characters` / `code: 'ERR_STRING_TOO_LONG'` — is **V8's ~512MB max-string-length ceiling**, NOT heap exhaustion. Heap-bump doesn't fix it; strings are capped at ~512MB regardless of heap.

The 546MB graph crosses that ceiling. Every `JSON.parse(fs.readFileSync(GRAPH, "utf8"))` callsite throws — and 42 generators failed silently in the 2026-05-24 regen because of this.

## What shipped this session

### 3 manual fixes
- `scripts/generate-hooks-atomic.mjs`
- `scripts/generate-scripts-atomic.mjs`
- `scripts/generate-scripts-lib-atomic.mjs`

Each: add `readGraphStreaming` import + `loadGraph()` helper + replace the callsite.

### Mass-migration tool
**`scripts/migrate-legacy-graph-reads.mjs`** — idempotent migrator:
- `--dry-run` mode (reports without writing)
- Walks `scripts/*.mjs` (non-recursive)
- Regex matches `JSON.parse(fs.readFileSync(GRAPH, "utf8"))` exactly
- Skips files that already import `readGraphStreaming`
- Injects `import { readGraphStreaming } from "./lib/graph-io.mjs";` after the last `import` line
- Replaces the callsite with `(fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")))`
- Non-destructive: only matches the EXACT legacy pattern; custom variable names left for hand-fix

**Result: 43 files patched.** Tallies: `{ patched: 43, 'already-migrated': 0, 'callsites-only': 0, 'no-pattern': 694, 'no-imports-found': 0 }`.

### Empirical proof
- **Before fix**: regen-viz 22:52:38 run — 42 generators failed (`generate-engine-domain-inventory`, `generate-staleness-overlay`, `generate-wiring-overlay`, ... 42 entries in `.err` log). Exit 0 with `failed=42 driftFail=false` (fail-silent).
- **After fix**: regen-viz 03:42 run — **0 generator failures**. `generate-wiring-overlay.mjs` succeeded in 14.9s (was 1.2s crash). `generate-hooks-atomic.mjs` succeeded in 9.6s (was 1.0s crash). Master-index queries now report 110K nodes available (was emitting `system-graph.json unavailable` fallback).

## Remaining V8 callsite (1 missed by regex)

`scripts/validate-ghost-wires.mjs:264` — uses different variable name than `GRAPH`. Hand-fix required (or extend regex). Tracked as candidate unit `U-VIZ-V8-VALIDATE-GHOST-WIRES`.

## Why the 2026-05-17 spec misdiagnosed

The earlier session saw `[regen-viz] ✗ merge failed` with truncated stderr ("(no stderr)") — the parent's spawnSync didn't capture child stderr, so the operator couldn't see the actual `RangeError`. They (correctly) inferred it was a resource problem and (incorrectly) assumed heap rather than string-length. The fix-loud-spawn part of the spec was the right design; the heap-bump was the wrong root-cause attribution.

## How to apply

- New `generate-*.mjs` scripts that read `system-graph.json`: use the helper pattern. Reference: `scripts/generate-hooks-atomic.mjs` loadGraph().
- Mass-migration tool is idempotent — safe to re-run after future additions.
- Future graph size growth past 1GB: increase the 256MB threshold or just always use `readGraphStreaming`.

## Related

- [[reference_engine_wiki_embedder_2026_05_24]] — sister fix (NN tier-5 data-side)
- [[reference_bridge_expand_basename_resolver_2026_05_24]] — sister fix (bridge Path-2)
- [[reference_nn_predictor_embed_wire_followup_2026_05_24]] — sister fix (predictor embedding source forward)
- `state/shared/specs/U-REGEN-VIZ-MERGE-FAILLOUD-FIX-PLAN-2026-05-17.md` — the misdiagnosed spec (heap-OOM hypothesis)
- `scripts/lib/graph-io.mjs` — the streaming reader/writer helpers (papa /loop 2026-05-23)
