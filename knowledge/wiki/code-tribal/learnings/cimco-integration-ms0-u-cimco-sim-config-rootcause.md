# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-CONFIG-ROOTCAUSE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-CONFIG-ROOTCAUSE (slot:echo): --pre config-control + root-cause of the header-only reads

**Commit:** `e276f1321674` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:24:21-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-config-rootcause, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-CONFIG-ROOTCAUSE (slot:echo): --pre config-control + root-cause of the header-only reads

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-CONFIG-ROOTCAUSE (slot:echo): --pre config-control + root-cause of the header-only reads

Operator: 'make sure the sim add-on is activated + all CIMCO settings tailored'. Root-caused the universal header-only sim reads (R12, evidence-based):
- The sim RUNS (collision-check fires, sim executes, Report realizes) but reports 0 rows because no MACHINE envelope + no STOCK geometry are loaded -- the checker has nothing to flag. NOT a reader bug.
- Proven: invoke-read --pre 'Check collision and limit errors' -> still header-only (pre=fired;open=fired;run=fired, 0 rows). Enabling the check is necessary but NOT sufficient.
- Mapped the full sim-config control surface (Configure Machine Type / Add Stock / Add Workpiece / Add Fixture / Stop Conditions / Tool Setup / About) -- the tailoring sequence.

Shipped: --pre <cfg-ctl> on invoke-read (fires a config control before open+run; same FireControl/MotionDeny safety). Spec: state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md.

Cross-slot: romeo OWNS the .mcfg machine-config supply (f1e4ade66e); .mcfg map in jm-fleet-sim-map.json. Next: read romeo's machine-bind answer -> wire machine-load -> add stock -> re-run a known-bad NC to prove the loop CATCHES collisions.
```

## Files touched (4)
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe | Bin 24576 -> 25088 bytes
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/Program.cs       |  19 +++++++++++++------
- state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md              |  62 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 75 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till header-only (pre=fired;open=fired;run=fired, 0 rows). Enabling the check is necessary but NOT sufficient.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e276f1321674`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._