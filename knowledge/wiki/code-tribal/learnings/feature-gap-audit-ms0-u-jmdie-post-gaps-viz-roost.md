# FEATURE-GAP-AUDIT-MS0/U-JMDIE-POST-GAPS-VIZ-ROOST — [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-JMDIE-POST-GAPS-VIZ-ROOST (slot:india iter1): /system-viz roost for JM Die post-processor gap surface

**Commit:** `a09052da6aa7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T20:26:07-05:00
**Tags:** feature-gap-audit-ms0, u-jmdie-post-gaps-viz-roost, auto-distilled

## Subject
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-JMDIE-POST-GAPS-VIZ-ROOST (slot:india iter1): /system-viz roost for JM Die post-processor gap surface

## Body
```
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-JMDIE-POST-GAPS-VIZ-ROOST (slot:india iter1): /system-viz roost for JM Die post-processor gap surface

Closes documented follow-up (c) from [[reference_india_post_gaps_2026_05_22]]:
the prior /loop shipped `JMDiePostProcessorLearningEngine.gapReport()` + the
`jmdie_post_gaps` dispatcher action (commit 119c432034); this commit surfaces
the SAME analysis as a /system-viz `ghost.post_gap_surface` roost so the gap
data is visible across the fleet, not just queryable through prism_knowledge.

Pure visualization extension — does NOT modify shop-floor .cps source.
Non-safety-critical; standard build tier.

Files:
- scripts/lib/jmdie-post-gap-detect.mjs (NEW, 221 LOC) — pure detection lib
  mirroring `ENHANCEMENT_MARKERS` (15) + `CORPUS_THRESHOLD` (0.5) from the
  engine. detectMarkers / inferFamily / buildProfile / computeCorpusGaps /
  computePostGaps / buildGapReport — all pure, no I/O.
- scripts/lib/jmdie-post-gap-detect.test.mjs (NEW, 344 LOC, 36 cases) — drift
  guards (length 15, frozen, threshold 0.5), marker detection, family inference,
  per-post + corpus-wide gap analysis, determinism.
- scripts/generate-post-gap-features.mjs (NEW, 311 LOC) — viz-augmentation
  generator following the priority-queue pattern. Scans the JM Die corpus,
  emits `ghost.post_gap_surface` roost + 5 corpus-wide gap children (severity-
  colored: red/amber/blue) + 12 per-post children (lag-count-colored).
- scripts/generate-post-gap-features.test.mjs (NEW, 297 LOC, 38 cases) —
  constants invariants, severity coloring, safeId path-traversal rejection
  (R12 fail-loud — actual code fix not test weakening), tempfile-driven I/O,
  pure generate() determinism.
- scripts/regen-viz.mjs (+1 line) — FAST[] registers generate-post-gap-features.mjs
  after generate-priority-queue-features.mjs.
- scripts/merge-augmentations.mjs (+31 lines) — loadOptional("post-gap-
  augmentation.json") + splice block mirroring the priority-queue pattern.

First run on real corpus: 12 .cps profiles, 5 corpus-wide gaps (2 severe ≤20%
coverage: sidecar_json_export 1/12 + physics_data_integration 1/12; 1 moderate;
2 mild), 12 per-post nodes. Sidecar + physics rollouts (the safety-critical
.cps modifications) remain out of scope here — those require operator-approved
migration plans per shop_floor tier S(x)≥0.98.

Tests: 74/74 PASS (36 lib + 38 generator).
Syntax: node --check clean on both edited scripts.
First-run smoke: generator wrote 11.3K augmentation JSON; merge-augmentations
syntax-clean (full --regen-viz unrun this iter — heavy peer churn in tree).

See:
- [[reference_india_post_gaps_2026_05_22]] (prior /goal /loop iter1-4)
- [[reference_india_queue_complete_2026_05_22]]
- [[reference_india_post_wire_2026_05_22]]
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] (merge fail-loud doctrine)
```

## Files touched (7)
- scripts/generate-post-gap-features.mjs      | 311 +++++++++++++++++++++++++
- scripts/generate-post-gap-features.test.mjs | 297 ++++++++++++++++++++++++
- scripts/lib/jmdie-post-gap-detect.mjs       | 221 ++++++++++++++++++
- scripts/lib/jmdie-post-gap-detect.test.mjs  | 344 ++++++++++++++++++++++++++++
- scripts/merge-augmentations.mjs             |  31 +++
- scripts/regen-viz.mjs                       |   1 +
- 6 files changed, 1205 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a09052da6aa7`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._