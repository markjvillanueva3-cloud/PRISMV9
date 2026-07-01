# SIERRA-VIZ/U-VIZ-AUG-STALE-SKIP-LEVER — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-STALE-SKIP-LEVER (slot:sierra): opt-in merge stale-skip -- the operator-controlled remediation for orphan augmentations

**Commit:** `157e4898b066` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:56:59-05:00
**Tags:** sierra-viz, u-viz-aug-stale-skip-lever, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-STALE-SKIP-LEVER (slot:sierra): opt-in merge stale-skip -- the operator-controlled remediation for orphan augmentations

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-AUG-STALE-SKIP-LEVER (slot:sierra): opt-in merge stale-skip -- the operator-controlled remediation for orphan augmentations

The freshness GUARD (U-VIZ-AUG-FRESHNESS-GUARD) is the SIGNAL -- it surfaces that 10
augmentations fold ~44d-stale data into the canonical graph via dead/retired producers.
This is the LEVER: merge-augmentations loadOptional() can now SKIP folding an augmentation
older than a generous threshold when an operator sets PRISM_MERGE_STALE_SKIP=1.

DEFAULT-OFF by design: a data-dropping merge policy must never flip on by surprise (R12 --
dropping graph annotations every slot reads is consequential + the per-file retire-vs-rewire
call needs operator intent). The operator sees the guard's report, then opts in. Knobs:
PRISM_MERGE_STALE_SKIP=1 (enable), PRISM_MERGE_STALE_SKIP_HR (threshold, default 720h/30d --
chosen > the HEAVY/--full cadence so legit HEAVY augmentations still fold).

- scripts/lib/augmentation-freshness.mjs: pure shouldSkipStaleMerge(ageMs,{enabled,thresholdHr})
  -- fail-safe (unknown/negative/non-finite age never skips; bad threshold -> 30d default).
  Reuses the freshness lib (no fork).
- merge-augmentations.mjs: loadOptional() stale-skip (after existsSync, fail-safe try/catch:
  a stat failure falls through to normal load, never drops) + STALE_SKIPPED merge-summary
  report (parity with OVERSIZE_DROPPED).
- tests: +3 (default-disabled never-skips, enabled skips IFF age>=threshold w/ exact boundary
  + custom threshold, fail-safe adversarial). 15/15.

VERIFIED SAFE: all 10 orphan consumers are null-guarded (if(var?.X) -- awareness:241,
business:381, spotlight:384, novelty:348, fileCoverageV2:476, heuristicCov:487,
skippedCensus:521, exhaustiveAudit:535, coreInventory:646, fsInventory:661) -- AND null-safety
is the SAME contract the existing absent-file path already enforces (a non-guarded consumer
would already crash when its augmentation goes absent). LIVE composition: flag-ON skips
EXACTLY the 10 orphans (43-44d), 0 collateral (the 2 HEAVY at 12d + all fresh untouched).

Per-file retire-vs-rewire of the 10 (7 have a dropped generator on disk, 3 are dead) remains
the operator's call -- the audit is the worklist.
```

## Files touched (4)
- scripts/lib/augmentation-freshness.mjs      | 25 +++++++++++++++++++++++++
- scripts/lib/augmentation-freshness.test.mjs | 33 +++++++++++++++++++++++++++++++++
- scripts/merge-augmentations.mjs             | 25 +++++++++++++++++++++++++
- 3 files changed, 83 insertions(+)

## Lessons surfaced in commit body
- till fold).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 157e4898b066`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._