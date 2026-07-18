---
name: reference-india-post-gaps-viz-roost-2026-05-22
description: india /loop 2026-05-22 iter1 — U-JMDIE-POST-GAPS-VIZ-ROOST shipped (a09052da6a). /system-viz `ghost.post_gap_surface` roost surfaces JM Die enhanced post-processor gap analysis (engine gapReport() + jmdie_post_gaps action) as 18 ghost nodes (1 roost + 5 corpus gaps + 12 per-post). Pattern mirrors priority-queue augmentation; pure visualization extension, does NOT modify shop-floor .cps source.
aliases: reference_india_post_gaps_viz_roost_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.619Z
---


# INDIA-POST-GAPS-VIZ-ROOST — /system-viz surface for JM Die gap analysis (2026-05-22 india /loop iter1)

Session `bde6fa1d`, slot india, NEW /loop iter 1/20 after the prior /goal /loop ended cleanly at iter 4. The user's `/startup-india /loop` (no /goal) engaged autonomous mode; the picker returned ACP-MS5 P0-U01 which I verified consolidated into PSAU-MASTER (meta-container, superseded). Pivoted to the documented non-safety-critical follow-up (c) from [[reference_india_post_gaps_2026_05_22]].

## Shipped

**Commit `a09052da6a`** — `[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-JMDIE-POST-GAPS-VIZ-ROOST (slot:india iter1)`.

Six files, 1205 LOC inserted:

- **`scripts/lib/jmdie-post-gap-detect.mjs`** (NEW, 221 LOC) — pure detection lib. Mirrors `ENHANCEMENT_MARKERS` (15 entries) + `CORPUS_THRESHOLD` (0.5) from the engine VERBATIM. API: `detectMarkers` / `inferFamily` / `buildProfile` / `computeCorpusGaps` / `computePostGaps` / `buildGapReport`. All pure, no I/O. `Object.freeze` on the marker list + drift-guard tests (length 15, frozen, threshold 0.5).
- **`scripts/lib/jmdie-post-gap-detect.test.mjs`** (NEW, 344 LOC, 36 cases) — concrete assertions throughout (no `toBeDefined` weak-asserts). Edge cases: empty/null/non-array inputs, single-profile corpus, boundary values. Determinism: calling twice yields equal JSON.
- **`scripts/generate-post-gap-features.mjs`** (NEW, 311 LOC) — viz-augmentation generator following the [[priority-queue-ms0-2026-05-16]] pattern. Emits `ghost.post_gap_surface` roost (L8) + corpus-gap children (L9, severity-colored red/amber/blue by coverage) + per-post children (L9, lag-count-colored green/amber/red). Severity thresholds: `SEVERITY_SEVERE_MAX=0.20` / `SEVERITY_MODERATE_MAX=0.40`. Fail-soft on missing corpus (writes empty augmentation, exit 1). `safeId` rejects `..` path-traversal BEFORE strip (the post-strip check in the template is dead — R12 fail-loud fix).
- **`scripts/generate-post-gap-features.test.mjs`** (NEW, 297 LOC, 38 cases) — constants invariants, severity-color boundaries (at exactly SEVERE_MAX / MODERATE_MAX), safeId path-traversal rejection, tempfile-driven `readCorpusProfiles` I/O, pure `generate()` determinism.
- **`scripts/regen-viz.mjs`** (+1 line) — FAST[] line 109 registers `generate-post-gap-features.mjs` after `generate-priority-queue-features.mjs`.
- **`scripts/merge-augmentations.mjs`** (+31 lines) — `loadOptional("post-gap-augmentation.json")` at line 92 + splice block at lines 1064-1092 (mirrors priority-queue pattern with `postGap`/`postGapNodes`/`postGapEdges`/`G.meta.postGap` rename).

**First run on real corpus**: 12 .cps profiles (haas 1 + hurco 5 + okuma 5 + roku-roku 1), 18 ghost nodes total (1 roost + 5 corpus gaps + 12 per-post). Corpus gap severity:

- 2 SEVERE (≤20% coverage): `sidecar_json_export` 1/12, `physics_data_integration` 1/12 — the same top gaps the engine surfaced in the prior /loop.
- 1 MODERATE (20–40%): `spindle_speed_variation` 4/12.
- 2 MILD (40–50%): `imachining_variable_feed` 5/12, `load_monitoring` 5/12.

The roost integrates into `ghost.planned_features` so the gap surface is part of the unified pickup-order view in /system-viz.

## Tests / scrutiny

- **74/74 tests PASS** (36 lib + 38 generator) via `node --test`.
- **Syntax**: `node --check` clean on both edited scripts (regen-viz.mjs + merge-augmentations.mjs).
- **Generator smoke**: produces 11.3K augmentation JSON at `state/shared/system-viz/post-gap-augmentation.json` (path correctly gitignored — augmentation outputs are derived artifacts).
- **3-of-3 scrutiny PASS** (arms A holistic + B test-integrity + C silent-breakage). Ledger marked. 0 P0/P1 blockers.

## P2/P3 follow-ups (deferred — non-blocking)

Reviewer-flagged advisory items captured for next iteration:

1. **P2 (Arm B) — sort comparator mismatch**: lib uses `presentIn.slice().sort()` (default UTF-16 sort) but test asserts `localeCompare`-sorted. For ASCII corpus (current state) the results coincide; for non-ASCII filenames they would diverge. Fix: change lib to `.sort((a,b) => a.localeCompare(b))`.
2. **P3 (Arms B+C) — unbounded file read**: `readCorpusProfiles` calls `fs.readFileSync(full, "utf8")` without size cap. Operator-owned corpus, 12 files measured — realistic-acceptable, but a `fs.statSync.size > 50MB → skip+warn` guard would harden the edge.
3. **P3 (Arms A+C) — CI-time engine↔lib regex divergence guard**: today's drift guard is length=15 + frozen + threshold==0.5. A regex-body divergence is silent (the engine `.ts` could rewrite a pattern and the .mjs wouldn't notice). Follow-up: a vitest case that reads both files and diffs the marker regex source strings.
4. **P3 (Arm C) — `loadOptional` JSON.parse silent swallow**: pre-existing pattern in merge-augmentations.mjs line 31; R12 fail-loud doctrine warrants a stderr warn on parse failure as a whole-file follow-up (not introduced here).

## Reusable findings

1. **Picker returned a superseded milestone** (ACP-MS5 → PSAU-MASTER consolidation 2026-04-21). Lesson: `priority-queue.mjs --pick` doesn't filter on `status==="consolidated"`. Future picker hardening: skip milestones whose envelope has `consolidated_into` set; surface the consolidation target instead. (Latent bug — operator-acceptable today via manual verification.)
2. **Self-contained viz augmentation pattern works for engine-derived data**. The .mjs/.ts two-file invariant (one for the MCP dispatcher, one for the augmentation pipeline) is acceptable when accompanied by a drift-guard test + a "MUST MATCH" comment pointing at the canonical TypeScript source. The cost is one extra file; the benefit is no need for a runtime MCP shell-out from the augmentation pipeline.
3. **safeId post-strip `..` check is dead in the template**. The priority-queue / misc-tasks / bridge-synergy generators all have the same dead check (regex strips dots first). Future hardening: PR template-wide to check `..` BEFORE strip. (Sufficient for THIS commit since the IDs are graph-node identifiers, not filesystem paths — but the doctrinally-correct check belongs pre-strip.)

See [[reference_india_post_gaps_2026_05_22]] · [[reference_india_queue_complete_2026_05_22]] · [[reference_india_post_wire_2026_05_22]] · [[reference_u_regen_viz_merge_faillod_2026_05_17]] · [[priority-queue-ms0-2026-05-16]] · [[feedback_autonomous_loop_drift_discipline]].
