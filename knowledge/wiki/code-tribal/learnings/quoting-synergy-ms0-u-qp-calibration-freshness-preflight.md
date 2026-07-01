# QUOTING-SYNERGY-MS0/U-QP-CALIBRATION-FRESHNESS-PREFLIGHT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CALIBRATION-FRESHNESS-PREFLIGHT (slot:charlie): act on stale calibration at quote time -- warn (soft) + opt-in hard cutoff to raw FMV

**Commit:** `bf10035ec096` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T18:42:37-05:00
**Tags:** quoting-synergy-ms0, u-qp-calibration-freshness-preflight, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CALIBRATION-FRESHNESS-PREFLIGHT (slot:charlie): act on stale calibration at quote time -- warn (soft) + opt-in hard cutoff to raw FMV

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CALIBRATION-FRESHNESS-PREFLIGHT (slot:charlie): act on stale calibration at quote time -- warn (soft) + opt-in hard cutoff to raw FMV

estimateCalibrated() now ACTS on the loader's isStale flag instead of ignoring
it. Before: a calibration factor older than the loader's 24h staleness
threshold was applied SILENTLY to a live customer quote -- the quote-time
analog of charlie soul-refuse #4 (no freshness preflight). A stale
over-prediction correction mis-prices once JM's real costs shift.

- Soft path (default): the factor is still applied (we do NOT silently drop a
  stale factor), but calibration.is_stale=true, factor_age_minutes is carried,
  and a "re-derive before relying on this quote" dfm_warning is emitted so the
  operator sees it before sending.
- Hard path (opt-in opts.maxFactorAgeHours): a factor older than the cutoff is
  REFUSED -- the quote emits raw FMV (uncalibrated), applied:false,
  reason factor-too-stale-Nh, with an UNCALIBRATED warning. Emitting the
  defined raw FMV is safer than applying a known-too-stale correction.

CalibrationResult gains optional is_stale + factor_age_minutes (purely
additive; no external consumer of this engine's CalibrationResult exists). The
calibrated-path margin-floor re-evaluation is preserved; the hard-refuse path
emits base FMV (which already carries its own floor flag). No inlined
margin/shop-rate/physics constants -- the gate reads only the factor age.

Builds on the now-PROVEN-CLOSED loop: traced QuoteEstimatorEngine:1092 ->
quotingActiveFactorLoaderEngine.applyToQuote(), so calibration factors reach
the live quote producer (loop closure validated, not the gap).

Tests: 9 pass (5 existing + 4 new freshness, all fail-on-revert + hermetic
tmpdir fixtures). 3-of-3 scrutiny PASS 0 P0/P1 (A logic / B test-integrity /
C regression+additive-safety). tsc: 0 new errors in the 2 changed files.
NOTE: the mcp-server carries a large PRE-EXISTING full-heap tsc baseline
revealed only when tsc gets its 16GB heap -- prior bare-tsc "clean" claims
came from OOM-aborted partial runs (exit 134 before completion). Out of
charlie scope; recorded separately.

Files:
- engines/QuoteEstimatorEngine.ts: estimateCalibrated freshness preflight + CalibrationResult is_stale/factor_age_minutes + maxFactorAgeHours opt
- __tests__/QuoteEstimatorEngine.calibrated.test.ts: +4 freshness tests (soft-warn / fresh-no-regression / hard-cutoff-refuse / cutoff-boundary)
```

## Files touched (3)
- mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts | 77 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/QuoteEstimatorEngine.ts                   | 53 +++++++++++++++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 128 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till applied (we do NOT silently drop a
- NOTE: the mcp-server carries a large PRE-EXISTING full-heap tsc baseline

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bf10035ec096`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._