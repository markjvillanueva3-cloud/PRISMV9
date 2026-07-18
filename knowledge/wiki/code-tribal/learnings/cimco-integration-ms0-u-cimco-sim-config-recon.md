# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-CONFIG-RECON — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-CONFIG-RECON (slot:echo): pin --load-machine needs TWO new driver caps (set-edit-field + read-arbitrary-window)

**Commit:** `1672656ada9b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:46:09-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-config-recon, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-CONFIG-RECON (slot:echo): pin --load-machine needs TWO new driver caps (set-edit-field + read-arbitrary-window)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-CONFIG-RECON (slot:echo): pin --load-machine needs TWO new driver caps (set-edit-field + read-arbitrary-window)

Recon: invoke-read --name 'Configure Machine Type' returns found:true container:Report (read-report ALWAYS resolves the report pane, never the config dialog). So --load-machine needs (1) set MSAA edit-field value (type the .mcfg path) AND (2) a generic read-window op to SEE the config dialog. Substantial unit, fresh-budget build.
```

## Files touched (2)
- state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md | 14 +++++++++++---
- 1 file changed, 11 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1672656ada9b`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._