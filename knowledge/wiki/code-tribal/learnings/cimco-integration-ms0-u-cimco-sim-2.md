# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-2 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-2 (slot:echo): cimco-sim-driver.mjs Node orchestrator — lifecycle + pre-flight env probe + mock E2E

**Commit:** `e483a92dd131` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T12:28:48-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-2, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-2 (slot:echo): cimco-sim-driver.mjs Node orchestrator — lifecycle + pre-flight env probe + mock E2E

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-2 (slot:echo): cimco-sim-driver.mjs Node orchestrator — lifecycle + pre-flight env probe + mock E2E

The connective tissue between the shipped C# MSAA helper (PrismCimcoUI.exe @
mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/) and the shipped verdict
core (cimco-control-map.mjs#parseSimulationReport + CimcoVerificationBridgeEngine.ts).
Clones winmax-driver.mjs structure (parseArgs->probeEnv->mode-dispatch->exit 0/1/2/3).

SAFETY (spec CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04 §C/§E):
- MOCK-BY-DEFAULT: live transport needs BOTH --no-mock AND env PRISM_CIMCO_MOCK=0
  (isMockRun, scripts/cimco-sim-driver.mjs) — one switch can never drive metal.
- A blocked/timeout/empty/unparseable result is NEVER `cleared` (fail-closed).
- runUiDriver adds the 2nd-backstop spawnSync timeout-kill the spec §A7 mandates;
  status===null -> {blocked:true, UI_DRIVER_TIMEOUT}, never a clearance.
- parseTailJson is line-based (immune to nested braces in controls[]).
- EDM short-circuits (verdictArm===DISCHARGE_PHYSICS) — CIMCO models mill/lathe only.
- machine-clearance DEFERRED to the TS engine (assessLiveRunClearance @ dispatcher
  U-CIMCO-SIM-7); never duplicated in JS (single-source, R7).

modes: launch (mock: would-run plan, no spawn) / verify (mock: planNavigation step
plan + resolved .mcfg/controller/units, zero CIMCO contact) / drive (mock: feeds a
SimReportRow[] through real parseSimulationReport so the fail-open verdict is
exercised E2E; live: fail-loud blockedBy live-drive-needs-ui-map-fsm).

31/31 real-behavior tests (node --test): parseArgs, the mock-by-default AND-gate,
7 probeEnv fatal codes, parseTailJson nested-brace + last-wins, runUiDriver
timeout/spawn-fail/bad-output/good-JSON, fail-OPEN guard (null + empty-array report
NEVER cleared, collisionCheckConfirmed pinned), 3 adversarial.

Per-file 2-reviewer scrutiny: code-analyzer PASS + reviewer PASS; closed P1
schema-read (plan.note not plan.summary) + P1 exit-code (env faults exit 2 not 3) +
P2 parseTailJson line-based + P2 modeVerify args thread + 2 reviewer-B P1 test
hardenings (empty-report collisionCheckConfirmed pin, positive-form clearance asserts).

Scope: U-CIMCO-SIM-2 (lifecycle). NOT the cimco-ui-map FSM (SIM-3), --op read-report
(SIM-6), or live VMC-01 E2E (SIM-5+) — those wire onto this lifecycle as they land.
```

## Files touched (3)
- scripts/cimco-sim-driver.mjs      | 409 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cimco-sim-driver.test.mjs | 271 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 680 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e483a92dd131`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._