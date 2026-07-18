---
name: reference-system-viz-type-backfill-2026-05-20
description: "2026-05-20 sierra G1 — pure id-prefix → canonical-type backfill closes 100%-untyped `node.type` gap. 250497 nodes 0%→100% typed; PREFIX_TO_TYPE table SSOT, R12 fail-loud on unknown."
aliases: reference_system_viz_type_backfill_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.216Z
---


## SYSTEM-VIZ-HIGH-ROI-MS0 / U-VIZ-G1-TYPE-BACKFILL — node-type backfill

**Shipped:** 2026-05-20 (slot sierra, /loop iter-2)

**Problem:** `state/shared/system-viz/system-graph.json` (250,497 nodes) had **0% canonical `node.type` population** under the documented schema, even though some nodes carried alternative `node.kind`. Every downstream consumer that reads `node.type` (master-index BM25 type-weight, viewer per-type coloring, blast-radius type-filter, NN-GRAPH features) degraded to `?` — the **84.6%** figure surfaced in the iter-1 audit was based on a generous fallback (`n.type || n.kind || '?'`); the real `node.type` coverage was zero.

**Fix:** Pure-core + injected-deps shape (the design [[reference_fleet_reaper_ms1]] codified):

- `scripts/lib/system-viz-type-backfill.mjs` exports `PREFIX_TO_TYPE` (SSOT table of ~50 known id-prefixes → canonical snake_case types), `inferType(node)`, `applyTypeBackfill(graph, opts)`, `countTypeCoverage(graph)`.
- `scripts/lib/system-viz-type-backfill.test.mjs` — 24 `node:test` cases pinning happy path + R12 fail-loud + idempotency + real-world distribution simulation.
- `scripts/system-viz-type-backfill.mjs` — CLI runner with atomic write + `PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF` honor + `--dry-run` / `--allow-unknown` / `--skip-unknown` / `--json` flags.

**R12 (fail-loud) policy:** default `onUnknown="throw"` surfaces novel prefixes instead of silently typing them. `allow` types unknown prefixes as `"unknown"` and accumulates them in `report.unknownPrefixes` for follow-up mapping. `skip` leaves them untyped.

**Live result:** First run on 399.3MB graph: 0% → 100% typed. 249,106 mapped via canonical table + 1,391 (0.6%) typed as `unknown` after `--allow-unknown` surfaced 8 legitimate novel prefixes (`fe`, `wt`, `tr`, `boxextract`, `untracked`, `memory_*`) which were added to `PREFIX_TO_TYPE` and re-deployed.

**Discoverable lift:** the lib unlocks the iter-1 audit's G1 dependency chain — once `node.type` is populated, G3 (ghost-wire validation) can stratify by type, G6 (per-slot heat map) can color by type, G10 (NN-GRAPH model gate) gets a free 1-hot feature dim that addresses the heterophily anti-correlation, master-index can weight by type-confidence.

**Wire-into-regen pending:** `U-VIZ-G1-REGEN-WIRE` will add type-backfill as a post-merge stage in `scripts/regen-viz.mjs` (between dedup and parent-edges, ~10 LOC). Today's run is one-shot CLI; until the regen wire lands, every regen overwrites the typed graph and the runner must be re-invoked.

**Idempotent** + non-destructive — running twice yields zero additional mutations on the second pass (already-typed nodes are preserved).

**Doctrine:** the prior 2026-05-18 system-viz-find-cache fix lesson — hermetic backup/restore must be SUITE-LIFETIME — is honored here: tests use disjoint per-test fixture graphs; no shared mutable state.

**Audit + ranked roadmap:** [`state/shared/specs/SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20.md`](../../state/shared/specs/SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20.md) — iter-1 deliverable; ranks 10 high-ROI uses for /system-viz, G1 was top of stack, iter-3+ continues exhausting the list until diminishing returns.

Wiki: [[system-viz-type-backfill]]. Related: [[reference_fleet_reaper_ms1]] · [[reference_session_continuity_stack_2026_05_15]] · [[reference_nn_graph_ms0_2026_05_16]].
