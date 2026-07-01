# SFC-WIRING-MS0/U-SFC-STALE-TEST-FIX — [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-STALE-TEST-FIX (slot:oscar): correct 2 stale SFC test expectations to canonical/actual values (red -> green)

**Commit:** `f360eb7fd5b0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T22:59:41-05:00
**Tags:** sfc-wiring-ms0, u-sfc-stale-test-fix, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-STALE-TEST-FIX (slot:oscar): correct 2 stale SFC test expectations to canonical/actual values (red -> green)

## Body
```
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-STALE-TEST-FIX (slot:oscar): correct 2 stale SFC test expectations to canonical/actual values (red -> green)

Two pre-existing SFC test failures were STALE EXPECTATIONS, not engine bugs (surfaced during the Tier-1
wiring re-verify). Corrected the tests to the canonical/actual engine values -- this is fixing stale
intent, NOT weakening assertions:
- ultimate-speed-feed.test.ts getMaterialProfile: S-group (Inconel) kc1_1 3000 -> 2800. 2800 is the
  canonical CANONICAL_KIENZLE.S value (constants.ts:39, also CLAUDE.md physics anchor); the engine
  returns 2800; 3000 was a pre-canonical leftover. File now 76/76 green.
- ultimate-speed-feed-gauntlet-r2.test.ts units-consistency: spindle_rpm.unit "RPM" -> "rev/min". The
  engine canonically emits the dimensional unit "rev/min" (UltimateSpeedFeedEngine:2844, sole occurrence);
  "RPM" was a stale outlier expectation.

Remaining gauntlet-r2 failure (cryo+Inconel: cryo interface_temp 4756 > flood*1.1=4338) is a GENUINE
physics question (does cryo lifting S-group Vc cross the flood thermal threshold?), NOT a stale test --
deliberately left for a dedicated physics unit, not force-passed here.
```

## Files touched (3)
- mcp-server/src/__tests__/ultimate-speed-feed-gauntlet-r2.test.ts | 2 +-
- mcp-server/src/__tests__/ultimate-speed-feed.test.ts             | 2 +-
- 2 files changed, 2 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f360eb7fd5b0`
- Milestone envelope: `mcp-server/data/milestones/SFC-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._