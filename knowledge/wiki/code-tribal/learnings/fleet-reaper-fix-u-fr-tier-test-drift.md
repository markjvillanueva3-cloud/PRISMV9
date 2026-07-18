# FLEET-REAPER-FIX/U-FR-TIER-TEST-DRIFT — [MAIN] [FLEET-REAPER-FIX]/U-FR-TIER-TEST-DRIFT: realign tier test to OPT-2 crit=88

**Commit:** `813974b15b36` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T22:01:57-05:00
**Tags:** fleet-reaper-fix, u-fr-tier-test-drift, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-FIX]/U-FR-TIER-TEST-DRIFT: realign tier test to OPT-2 crit=88

## Body
```
[MAIN] [FLEET-REAPER-FIX]/U-FR-TIER-TEST-DRIFT: realign tier test to OPT-2 crit=88

fleet-reaper-tier.test.mjs hard-coded DEFAULT_MEM_CRITICAL_PCT=95 and went stale silently when OPT-2 (2026-05-17) lowered the constant to 88 — 7 assertions failed at HEAD (pre-existing, unrelated to this session). At the production defaults crit(88) < warn(90), so tierFromPressure collapses the warn band (documented "collapse, never invert" behavior). Fix: production-default assertions use the real imported constants; generic warn-band logic assertions use an explicit non-degenerate 90/95 banding (mirrors the already-passing custom-80/95 test); added a test pinning the production-default empty-warn-band behavior. 76/76 tier cases green.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- scripts/__tests__/fleet-reaper-tier.test.mjs | 73 +++++++++++++++++++---------
- 1 file changed, 50 insertions(+), 23 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 813974b15b36`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._