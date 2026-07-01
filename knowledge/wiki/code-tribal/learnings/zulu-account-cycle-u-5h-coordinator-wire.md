# ZULU-ACCOUNT-CYCLE/U-5H-COORDINATOR-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ACCOUNT-CYCLE]/U-5H-COORDINATOR-WIRE (slot:bravo): wire denominator-free 5h-switch gate into account-switch coordinator + fix readFiveHourPct null-pct trap

**Commit:** `a5b65b871126` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T09:28:37-05:00
**Tags:** zulu-account-cycle, u-5h-coordinator-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ACCOUNT-CYCLE]/U-5H-COORDINATOR-WIRE (slot:bravo): wire denominator-free 5h-switch gate into account-switch coordinator + fix readFiveHourPct null-pct trap

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ACCOUNT-CYCLE]/U-5H-COORDINATOR-WIRE (slot:bravo): wire denominator-free 5h-switch gate into account-switch coordinator + fix readFiveHourPct null-pct trap

Wires keystone #3 decideSwitch into runCoordinator: pct gate when a budget is set, ELSE absolute weighted-token trigger (PRISM_5H_WEIGHTED_TOKEN_TRIGGER, denominator-free), ELSE undecidable->fail-loud (same FIVE_HOUR_SOURCE_UNAVAILABLE code, R12 contract preserved). readFiveHourPct now also surfaces max weightedTokens across slots. BUG FIX (E2E-caught): readFiveHourPct read an explicit quota.fiveHour.pct=null as 0% (Number(null)===0 trap) -- latent until the new populator started writing explicit null; now skips null as unknown so the absolute path can fire. 55/55 coordinator tests (51 original zero-regression + 4 new absolute-path). LIVE E2E (real transcripts, temp sidecar): Path A pct=null+weighted=95.98M+trigger -> switch via absolute gate; Path B weighted-budget -> pct=1.25 -> switch via pct gate. Live libs (#1 sum, #2 populate, #3 gate) bypass-cp'd here for integration; sources committed to slot/bravo. Keystone now FUNCTIONAL end-to-end -- the operator account-switch they just did manually is what this automates.
```

## Files touched (7)
- scripts/account-switch-restart-coordinator.mjs      |  30 ++++++---
- scripts/account-switch-restart-coordinator.test.mjs |  57 ++++++++++++++++
- scripts/lib/five-hour-switch-gate.mjs               |  81 ++++++++++++++++++++++
- scripts/lib/five-hour-switch-gate.test.mjs          |  81 ++++++++++++++++++++++
- scripts/lib/five-hour-token-sum.mjs                 | 287 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/populate-five-hour-sidecar.mjs              | 205 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 6 files changed, 732 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- til the new populator started writing explicit null; now skips null as unknown so the absolute path can fire. 55/55 coordinator tests (51 original zero-regression + 4 new absolute-path). LIVE E2E (real transcripts, temp sidecar): Path A pct=null+weighted=95.98M+trigger -> switch via absolute gate; Path B weighted-budget -> pct=1.25 -> switch via pct gate. Live libs (#1 sum, #2 populate, #3 gate) bypa

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a5b65b871126`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ACCOUNT-CYCLE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._