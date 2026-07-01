# WIRE-UNWIRED-MS0/U-WIRE-WPI — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WPI: wire WedmProgramIndexEngine read-only into prism_dev (5 actions)

**Commit:** `385de27faac0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T04:14:03-05:00
**Tags:** wire-unwired-ms0, u-wire-wpi, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WPI: wire WedmProgramIndexEngine read-only into prism_dev (5 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WPI: wire WedmProgramIndexEngine read-only into prism_dev (5 actions)

Wires the Wire EDM + Electrode Milling program index (JM Die archive
WIRE EDM + ROKU-ROKU directories — .mcx-8/.MCX/.esp/.MIN/.NC files
classified by immediate-subfolder customer name) into prism_dev.

Actions (all read-only filesystem scans — no write methods exist):
  - wedm_programs_sources      → getSources() — config {wireEdmRoot,
                                  rokuRokuRoot, validExtensions[]}
  - wedm_programs_audit        → audit() — summary stats
  - wedm_programs_harvest      → harvest() — full program scan with
                                  byCustomer + byMachineType breakdowns
  - wedm_programs_by_customer  → composes harvest + getCustomerPrograms
  - wedm_programs_top_customers → composes harvest + getTopCustomers

Schema details:
  - by_customer.customer non-empty string (case-insensitive engine match)
  - top_customers.limit ≤ 100 (DoS guard, default 10)

Test suite: 19 cases (4 schema + 2 sources + 3 harvest + 1 audit +
3 by_customer + 4 top_customers + 2 error). Live scan during test run
worked against real JM Die archive (~2.8s test duration confirms FS
scan reached real disk).

ROUTING PROOFs:
  - wire source byte-equals engine-direct getSources()
  - wire totalPrograms matches engine-direct harvest()
  - wire by_customer.totalAvailable matches engine-direct totalPrograms
  - wire top_customers count parity with engine-direct getTopCustomers()
  - top_customers sorted descending by count (engine contract verified)

Test-fix lesson captured: initial draft assumed source had {path,
description} fields. Engine actually returns {wireEdmRoot, rokuRokuRoot,
validExtensions}. Re-read engine's getSources() before asserting field
shape — generic schema patterns mislead. Fix per-field, not weakening.

Pre-wire gate: existing WedmProgramIndexEngine test suite 34/34 PASS
unmodified.

Session running total: 20 backend-dev wires / 90 actions / 20 engines.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/dispatcher.wedmProgramIndex.test.ts  | 193 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  22 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  43 ++++-
- 3 files changed, 257 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- lesson captured: initial draft assumed source had {path,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 385de27faac0`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._