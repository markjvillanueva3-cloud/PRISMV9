# ZULU-ACCOUNT-CYCLE/U-ACCT-PREFLIGHT-CLI-TEST — [MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-ACCT-PREFLIGHT-CLI-TEST (slot:zulu): regression-lock the arm wiring seam (arm B 3-of-3 P2)

**Commit:** `4d81edc95a64` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T21:05:36-05:00
**Tags:** zulu-account-cycle, u-acct-preflight-cli-test, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-ACCT-PREFLIGHT-CLI-TEST (slot:zulu): regression-lock the arm wiring seam (arm B 3-of-3 P2)

## Body
```
[MAIN-FORCE] [ZULU-ACCOUNT-CYCLE]/U-ACCT-PREFLIGHT-CLI-TEST (slot:zulu): regression-lock the arm wiring seam (arm B 3-of-3 P2)

Arm B flagged: the CLI arming wiring (gate-before-defaultSetUserEnv ordering + the
disarm exemption) was not regression-locked -- a future edit reordering the gate after
env-set, or dropping the manual-arm gate, would arm AUTO_APPLY=1 with no test going red.

FIX: extract exported pure orchestrator armPlan(action,args,{runPreflightFn,readCeilingFn,
ceilingPath,nowMs}) that runs the gate + builds the env plan but writes NO env. The CLI is
now a thin wrapper that loops setUserEnv over the RETURNED plan -- so a RED gate THROWS
inside armPlan and the env-set loop is structurally UNREACHABLE on a block (no partial arm
possible). Output is byte-identical.

+8 armPlan tests with injected fakes lock the seam: auto+RED throws (no plan), ordering
proof (ceiling NOT read past a RED block), auto+GREEN arms from observed ceiling, manual
--budget+RED throws (manual path gated), disarm does NOT call the preflight + returns
preflight:null, --accept-unsafe-accounts override arms, fail-closed on a throwing preflight.
40/40 arm + 24/24 preflight. LIVE re-validated: --auto real exit=1 (refused, no env set),
--status exit=0 DRY-RUN unchanged. Closes the last open finding on U-ACCT-PREFLIGHT-GATE.
```

## Files touched (3)
- scripts/arm-account-switch.mjs      | 91 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------------------------------
- scripts/arm-account-switch.test.mjs | 69 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 127 insertions(+), 33 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4d81edc95a64`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ACCOUNT-CYCLE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._