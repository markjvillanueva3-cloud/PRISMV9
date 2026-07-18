# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-DRIVE-PROBE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-DRIVE-PROBE (slot:echo): live-drive empirical findings — UIA drive flow + sim engage RETIRED; report-grid read needs FlaUI

**Commit:** `c2ce9096f4a6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T11:17:26-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-drive-probe, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-DRIVE-PROBE (slot:echo): live-drive empirical findings — UIA drive flow + sim engage RETIRED; report-grid read needs FlaUI

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-DRIVE-PROBE (slot:echo): live-drive empirical findings — UIA drive flow + sim engage RETIRED; report-grid read needs FlaUI

scripts/cimco-sim-drive-probe.ps1 drives the LIVE CIMCO Machine Simulation via raw UIA. Findings:
- DRIVE FLOW WORKS: Backplot tab -> Machine Simulation button -> Backplot run all invoke via
  InvokePattern; CIMCO grows to ~388MB (3D sim engine loads). UIA-viability RETIRED.
- Sim is IN-PROCESS (no separate CIMCOSimulation.exe spawned); report lives in the CIMCOEdit tree.
- FindAll(Descendants) over the rendered sim tree is ~2min -> driver MUST use bounded/cached/
  screen-scoped UIA queries (FlaUI), never blanket descendant searches.
- Report toggles (Report errors / Stop Conditions / Check collision and limit errors) are NOT
  top-level ribbon buttons -> they live in a Backplot Setup dialog/dropdown (resolve via CHM + live dump).
- Fixed-sleep PowerShell is too brittle for the multi-step report sequence (tab-invoke intermittently
  fails pre-ribbon-build) -> empirically CONFIRMS the FlaUI helper + per-step-verify FSM (winmax-ui-map
  clone) is required, not ad-hoc scripting. Raw SWA stays the no-NuGet fallback runtime.

NET: UIA-viability + drive flow RETIRED; report-grid READ is NOT (R12) -> that is U-CIMCO-SIM-1
proper (FlaUI PrismCimcoUI.exe + FSM). Spec A2 updated with these findings.
```

## Files touched (4)
- scripts/cimco-sim-drive-probe.ps1                            | 164 +++++++++++++++++++++++++++++++++
- state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.html |   8 +-
- state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md   |  11 +++
- 3 files changed, 181 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c2ce9096f4a6`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._