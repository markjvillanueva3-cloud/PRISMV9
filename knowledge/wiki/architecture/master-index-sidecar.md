---
title: Master-Index Sidecar
type: architecture
status: built
created: 2026-05-19
unit: U-MASTER-INDEX-SIDECAR
milestone: DEV-TOOL-CONFLICT-AUDIT-2026-05-17
tags: [master-index, system-viz, search, performance, hooks]
---

# Master-Index Sidecar

A pre-built inverted-index sidecar that restores **full-coverage** master-index
search without the catastrophic cost of parsing the 372 MB merged graph inline.

## Problem

`scripts/lib/master-index-search-lib.mjs` `loadGraph()` caps graph loads at
**200 MB** (`PRISM_GRAPH_MAX_BYTES`). The merged
`state/shared/system-viz/system-graph.json` is **372 MB / 243,687 nodes**, so the
JULIETT F1 fallback silently routed every master-index search to the **28 MB
architecture-graph.json (~24,940 nodes)** — degraded coverage (no L11/L12
filesystem-coverage leaves), though not blind.

Raising the cap is non-viable: `loadGraph()` on the full 372 MB graph was
**measured at 138 s / 1.6 GB RSS** per call. The master-index hook
(`master-index-precheck-inject.mjs`) fires on every UserPromptSubmit with a
2-5 s timeout; 12 concurrent chats × 1.6 GB ≈ fleet OOM.

## Design

The 138 s parse is fine **offline** (once, at regen time) and fatal **online**
(every prompt). The sidecar moves the cost offline.

- **`scripts/build-graph-index.mjs`** — offline generator. Reads the full graph,
  builds a compact inverted-index sidecar `system-graph-index.json` using the
  EXACT `tokenize` + blob construction from `loadGraph` (parity-critical).
  Postings are integer indices into a compact `nodes[]` (searchGraphHits-shaped:
  `{id,label?,layer?,status?,info?,knowledge?:{wikiEntries?,memoryEntries?}}`).
  Self-re-execs with an 8 GB heap; atomic temp+rename write; mass-skip floor
  (`PRISM_BUILD_GRAPH_INDEX_MIN_RATIO`, default 0.5); fail-loud.
- **`loadGraph` sidecar fast-path** (`tryLoadSidecar`) — when a fresh
  `system-graph-index.json` exists, matches the loader's `SIDECAR_SCHEMA_VERSION`,
  and was built from the current-or-newer graph, `loadGraph` reconstructs the
  `{nodes, inverted: Map}` wrapper from it. Stale / absent / schema-mismatch /
  knob-disabled → byte-identical legacy behavior (parse-or-architecture-fallback).
- **`regen-viz.mjs` post-merge stage** — refreshes the sidecar each regen, after
  the last graph writer, inside the U-VIZ-F11 graph-write lock. Non-fatal.

## Measured (production graph, 2026-05-19)

| Metric | Value |
|--------|-------|
| Sidecar size | **105.6 MB** (243,687/243,687 nodes, 0 skipped, 119,707 tokens) |
| `build-graph-index.mjs` build | **70.8 s** |
| `loadGraph()` cold on the sidecar | **1.45 s** (vs 138 s direct / 380 ms degraded-arch) |
| Coverage | full 243,687 nodes (vs ~24,940 architecture-only) |

The earlier "~10-20 MB" spec estimate was wrong — the real sidecar is 105 MB —
but it still loads in <1.5 s, so the master-index hook stays well inside budget.

## Knobs

- `PRISM_GRAPH_SIDECAR_DISABLE=1` — skip the sidecar fast-path, use the legacy
  path (immediate rollback, no code change).
- `PRISM_BUILD_GRAPH_INDEX_MIN_RATIO` — mass-skip floor (default 0.5).
- `PRISM_BUILD_GRAPH_INDEX_NO_REEXEC=1` — disable the generator's heap re-exec.

## Rollback

Set `PRISM_GRAPH_SIDECAR_DISABLE=1`, or delete `system-graph-index.json` — the
sidecar is strictly additive; the legacy path resumes with zero code change.

## Files

- `scripts/build-graph-index.mjs` (+ `.test.mjs`, 22 tests)
- `scripts/lib/master-index-search-lib.mjs` `loadGraph` / `tryLoadSidecar`
  (+ `.test.mjs`, 9 sidecar tests)
- `scripts/regen-viz.mjs` post-merge stage
- `state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md` (spec)

## See also

- `[[U-VIZ-F11-CROSS-LOCK]]` — the system-graph write-lock the regen stage runs under.
- `[[master-index-surface]]` — the master-index search/awareness stack.
