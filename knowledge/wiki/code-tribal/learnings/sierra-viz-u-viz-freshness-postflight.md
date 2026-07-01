# SIERRA-VIZ/U-VIZ-FRESHNESS-POSTFLIGHT — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FRESHNESS-POSTFLIGHT (slot:sierra): regen self-reports stale-orphan folds + reconcile SLOW_CADENCE with HEAVY[] (fix a latent false-alarm I introduced) + un-fragile the drift-guard parser

**Commit:** `b18c821af95e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:57:26-05:00
**Tags:** sierra-viz, u-viz-freshness-postflight, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FRESHNESS-POSTFLIGHT (slot:sierra): regen self-reports stale-orphan folds + reconcile SLOW_CADENCE with HEAVY[] (fix a latent false-alarm I introduced) + un-fragile the drift-guard parser

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FRESHNESS-POSTFLIGHT (slot:sierra): regen self-reports stale-orphan folds + reconcile SLOW_CADENCE with HEAVY[] (fix a latent false-alarm I introduced) + un-fragile the drift-guard parser

R16 fit-the-whole for the stale-orphan class (iters 11-12 fixed 6 of 8 instances; this makes the
WHOLE class self-reporting + closes 2 gaps my own HEAVY[] additions opened).

1. FRESHNESS POSTFLIGHT (regen-viz.mjs, after the merge guard -- symmetric to the dual-reg PREflight):
   reuses the augmentation-freshness lib (parseMergedAugmentations/classify/summarize -- the SAME calls
   audit-augmentation-freshness.mjs makes) so the REGEN ITSELF warns loud when it just folded a
   stale-orphan augmentation. Until now staleness only surfaced via the per-prompt sierra-graph-health
   hook, which misses cron / other-slot / manual regens. Advisory (warn only, never aborts).
   Disable: PRISM_VIZ_FRESHNESS_POSTFLIGHT=0. Validated end-to-end: emits "2 STALE-ORPHAN just folded:
   engine-spotlight.json, h-drive-exhaustive-audit.json".

2. SLOW_CADENCE RECONCILE (augmentation-freshness.mjs) -- R12 honesty: my iters 11-12 added 3 generators
   to regen-viz HEAVY[] (h-drive-skipped-census, awareness, business-value) but did NOT add their outputs
   to SLOW_CADENCE, which the file's own comment demands ("KEEP IN SYNC with regen-viz HEAVY[]"). Latent
   bug: each would have FALSE-ALARMED as stale-orphan after 7d (staleHr) between --full runs (non-slow +
   age>=168h). Added all 3 outputs; SLOW_CADENCE now matches HEAVY[] (5 entries).

3. DRIFT-GUARD PARSER FIX (augmentation-freshness.test.mjs) -- the "SLOW_CADENCE stays aligned with
   HEAVY[]" guard (built 2026-06-21 for exactly this drift) used /const HEAVY = \[([\s\S]*?)\]/, which is
   DEFEATED by a "FAST[]"/"HEAVY[]" token inside a HEAVY entry's // comment (stops at the first ] ->
   silently truncates the array to 3 of 5). Same bug class as the zulu parseShipped prose-miscount.
   Replaced with parseGeneratorArray (the dual-reg auditor's comment-stripping parser) + updated the
   HEAVY_OUTPUT map (+3). This guard was RED since iter-11 (I missed running it -- validation gap now closed).

Tests: augmentation-freshness 15/15 (was 14/15 red), regen-viz-fast-order 4/4, dual-reg auditor 12/12.
Combined arc (iters 11-13): STALE-ORPHAN 8->2 + the class is now self-reporting at the regen source.
```

## Files touched (4)
- scripts/lib/augmentation-freshness.mjs      | 15 ++++++++++++---
- scripts/lib/augmentation-freshness.test.mjs | 14 +++++++++++---
- scripts/regen-viz.mjs                       | 26 ++++++++++++++++++++++++++
- 3 files changed, 49 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- til now staleness only surfaced via the per-prompt sierra-graph-health

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b18c821af95e`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._