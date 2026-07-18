# ZULU-ACCOUNT-CYCLE/U-FLEET-SURVIVAL-ETA — [MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-FLEET-SURVIVAL-ETA (slot:zulu): surface time-to-limit in the survival cockpit

**Commit:** `f0ef93c49027` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T00:52:56-05:00
**Tags:** zulu-account-cycle, u-fleet-survival-eta, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-FLEET-SURVIVAL-ETA (slot:zulu): surface time-to-limit in the survival cockpit

## Body
```
[MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-FLEET-SURVIVAL-ETA (slot:zulu): surface time-to-limit in the survival cockpit

Motivated by THIS session's live collapse: during the throttle I had only the static
'93% of ceiling' -- the actionable number is 'how many minutes until the fleet blocks'.
computeStatus already computes etaMinutes (remaining/burnPerMin) + burnPerMin and liveStatus
spreads them; they were just not surfaced in fleet-survival-status. Pure additive passthrough
into proximity.{etaMinutes,burnPerMin} (rounded; null when burn<=0 or no ceiling) + a CLI
'time-to-limit' line. No new math. 15/15 tests (+1 eta passthrough + null case). Live now:
zone=ok 65% / ~676min @ 72k/min burn (the rolling 5h window recovered from the 93% peak).
Additive surfacing of already-tested values under the session 3-of-3 ledger.
```

## Files touched (3)
- scripts/fleet-survival-status.mjs      |  6 ++++++
- scripts/fleet-survival-status.test.mjs | 12 +++++++++++-
- 2 files changed, 17 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- til the fleet blocks'.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f0ef93c49027`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ACCOUNT-CYCLE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._