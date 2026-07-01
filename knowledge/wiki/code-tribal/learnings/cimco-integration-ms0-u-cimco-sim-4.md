# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-4 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-4 (slot:echo): machine+controller+units bind gate

**Commit:** `7fc028fc1e93` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T08:57:14-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-4, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-4 (slot:echo): machine+controller+units bind gate

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-4 (slot:echo): machine+controller+units bind gate

cimco-bind-gate.mjs — pure load-time gate asserting the LOADED CIMCO machine
binds the EXPECTED JM machine before a sim run counts toward a verdict. Closes
three fail-CLOSED traps:
 1. kinematic-mismatch — loaded .mcfg != resolved machine (MACHINE_MISMATCH)
 2. wrong-post — NGC RPost on a Haas PRE-NGC machine VMC-03/04 (WRONG_POST_NGC);
    classifyHaasPostGeneration tests classic BEFORE ngc so the 'pre-NGC'
    substring trap can't invert; unclassifiable post fails CLOSED (POST_UNVERIFIED)
 3. 25.4x units — every .mcfg is mm, JM is inch; units must be DECLARED+matching
    on NC and .mcfg, never inferred (UNITS_MISMATCH/UNITS_UNRESOLVED);
    unitsResolved:false machines (VMC-03/04) require an explicit double-check
EDM short-circuits to discharge-physics (cimcoMatch=null); a null read-back is
NEVER a pass (NO_READBACK, same doctrine as an empty report). controllerVerified
is the irreducible structural false (spec E). Distinct from the TS
assessLiveRunClearance final gate (R7 single-source) — this is the upstream
read-back precondition.

Wired into cimco-sim-driver.mjs modeVerify (bind + bindReady fields; --nc-units
+ --units-double-checked flags); mock synthesizes a correct read-back, live
read-back source defers to U-CIMCO-SIM-5 (honest NO_READBACK until then).

Tests: 19 bind-gate (all-15 fleet machines + every trap + adversarial
mismatch-beats-units) + 31 driver (no SIM-2/3 regression) + 31 ui-map = 81 green.
Live mock-verify validated end-to-end vs real VMC-03 entry (bindReady=true,
postGen=classic).
```

## Files touched (4)
- scripts/cimco-bind-gate.mjs      | 222 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cimco-bind-gate.test.mjs | 195 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cimco-sim-driver.mjs     |  26 ++++++++++++
- 3 files changed, 443 insertions(+)

## Lessons surfaced in commit body
- wrong-post — NGC RPost on a Haas PRE-NGC machine VMC-03/04 (WRONG_POST_NGC);
- til then).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7fc028fc1e93`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._