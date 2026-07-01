# AI-SYNERGY-CAG/U-CAG-WARM-RATE-LEGACY-QUARANTINE — [MAIN-FORCE] [AI-SYNERGY-CAG]/U-CAG-WARM-RATE-LEGACY-QUARANTINE (slot:alpha): make CAG warm-hit-rate COMPUTE (was permanently n/a) by quarantining the pre-instrumentation legacy-untagged baseline

**Commit:** `da15e5c59fe8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T16:18:04-05:00
**Tags:** ai-synergy-cag, u-cag-warm-rate-legacy-quarantine, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYNERGY-CAG]/U-CAG-WARM-RATE-LEGACY-QUARANTINE (slot:alpha): make CAG warm-hit-rate COMPUTE (was permanently n/a) by quarantining the pre-instrumentation legacy-untagged baseline

## Body
```
[MAIN-FORCE] [AI-SYNERGY-CAG]/U-CAG-WARM-RATE-LEGACY-QUARANTINE (slot:alpha): make CAG warm-hit-rate COMPUTE (was permanently n/a) by quarantining the pre-instrumentation legacy-untagged baseline

CAG (a goal-named AI subsystem, alpha's lane) warm-hit-rate was stuck at n/a fleet-wide because legacy misses predating reason-tagging can never be classified -> the unclassified null-guard never cleared. Fix: snapshotLegacyBaseline freezes each scope's untagged count ONCE (bumpCagStat, before increment); warmRateFields subtracts it so warm-rate computes over the post-instrumentation window; a NEW untagged miss beyond the baseline still nulls (un-instrumented caller never masked, R12). Mirrored into the live sessionDispatcher cag_stats action (KEEP-IN-SYNC, exact guard form) + cag-cache-stats CLI (legacy-quarantined display). LIVE: migrated 34 galaxies, warm-rate 100% (was n/a), 38 quarantined. 53 tests (40 lib + 13 dispatcher e2e incl. adversarial leaky-galaxy null); both 2-arm scrutiny PASS (1 P2 coercion-form tightened to match lib). tsc adds 0 new sessionDispatcher errors.
```

## Files touched (6)
- mcp-server/src/__tests__/sessionDispatcher.cagStats.e2e.test.ts | 22 ++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts           | 89 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------
- scripts/cag-cache-stats.mjs                                     |  4 ++--
- scripts/lib/galaxy-cag-cache-stats.test.mjs                     | 54 +++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/lib/galaxy-cag-cache.mjs                                | 52 +++++++++++++++++++++++++++++++++++++++++++++++-----
- 5 files changed, 205 insertions(+), 16 deletions(-)

## Lessons surfaced in commit body
- till nulls (un-instrumented caller never masked, R12). Mirrored into the live sessionDispatcher cag_stats action (KEEP-IN-SYNC, exact guard form) + cag-cache-stats CLI (legacy-quarantined display). LIVE: migrated 34 galaxies, warm-rate 100% (was n/a), 38 quarantined. 53 tests (40 lib + 13 dispatcher e2e incl. adversarial leaky-galaxy null); both 2-arm scrutiny PASS (1 P2 coercion-form tightened to ma

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show da15e5c59fe8`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-CAG.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._