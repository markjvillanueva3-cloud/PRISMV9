# ZULU-ACCOUNT-CYCLE/U-FLEET-SURVIVAL — [MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-FLEET-SURVIVAL (slot:zulu): orchestrator GO/NO-GO -- will the fleet survive the next 5h limit?

**Commit:** `d6ac46fb6609` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T22:18:42-05:00
**Tags:** zulu-account-cycle, u-fleet-survival, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-FLEET-SURVIVAL (slot:zulu): orchestrator GO/NO-GO -- will the fleet survive the next 5h limit?

## Body
```
[MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-FLEET-SURVIVAL (slot:zulu): orchestrator GO/NO-GO -- will the fleet survive the next 5h limit?

The orchestrator cockpit for the operator's 'run as long as possible before session
limits hit again'. Composes 3 already-built+scrutinized signals into ONE verdict (no
new logic, no dup -- arm --status shows arm state, tracker --status shows proximity,
preflight shows account readiness; this fuses all three + the survival decision):
  survives === (account-switch ARMED) AND (account preflight not RED)

scripts/fleet-survival-status.mjs (NEW, read-only): gradeSurvival (PURE) + runSurvivalStatus
(fail-soft per leg -- a throwing liveStatus degrades proximity to unknown but the verdict
still prints; a throwing preflight becomes a blocker, never a crash). Proximity (zone/pct)
is informational and NEVER gates survival, so a false 'SURVIVABLE' is structurally
impossible (it is a pure AND of armed+safeToArm; every degraded path resolves to false +
a blocker). 14/14 reference-value tests.

LIVE (the answer): WILL BLOCK at the next 5h limit -- zone=warn, ~80% of the ~140M p90
ceiling, ALREADY past the 67.7M arm trigger (wouldFireNow=true), but armed=false +
preflight RED (current account UNIDENTIFIABLE). Surfaces the exact 2-step unblock:
re-capture the current login -> arm --auto.

Per-file 2-arm scrutiny: PASS. Closed arm B P2 (the __direct main-guard endsWith("")
import-side-effect -- now uses the proven pathToFileURL pattern from the sibling preflight;
import-purity verified) + rounded the CLI float display. Under the session 3-of-3 ledger.
Orchestrator session: re-enabled the Account Switch Monitor (5h detection) + 2 brain crons
+ set a 30-min zulu orchestration heartbeat cron.
```

## Files touched (3)
- scripts/fleet-survival-status.mjs      | 153 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/fleet-survival-status.test.mjs | 135 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 288 insertions(+)

## Lessons surfaced in commit body
- till prints; a throwing preflight becomes a blocker, never a crash). Proximity (zone/pct)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d6ac46fb6609`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ACCOUNT-CYCLE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._