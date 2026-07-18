# OSCAR-SFC-9AXIS-MS0/U-OSC-WORKHOLDING-FORCE-CAP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-WORKHOLDING-FORCE-CAP (slot:oscar): wire the inert workholding axis live -- part-retention feed derate

**Commit:** `2070c472a41b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T12:14:01-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-workholding-force-cap, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-WORKHOLDING-FORCE-CAP (slot:oscar): wire the inert workholding axis live -- part-retention feed derate

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-WORKHOLDING-FORCE-CAP (slot:oscar): wire the inert workholding axis live -- part-retention feed derate

Makes the previously-INERT `workholding` axis move the SFC recommendation (8 live axes -> 9). An inadequate hold derates feed/fz/MRR for part-retention safety; form-closure-capable holds (vise/chuck/tombstone) are NOT regressed. SAFE direction only (never raises feed); speed/RPM untouched.

PHYSICS (physics-reviewed 2026-06-09, agent design + 2-agent per-file PASS):
- in-plane drive force F_drive = hypot(tangential, radial) from sfc.forces; axial EXCLUDED (reacted by part seating on parallels -- including it over-derates routine setups)
- effective hold C_eff = clamp_N x mu x FORM_CLOSURE_FACTOR[type] (vise/chuck/tombstone 3.0, collet 3.5, vacuum/magnetic 1.0 SAFETY FLOOR -- the non-regression mechanism; Hoffman J&F + ASME B11.8)
- SF per cut_type (roughing 3.0 / finishing 2.0 / general 2.5, ASME B11.8 via ClampingForceEngine convention)
- if R = F_drive*SF/C_eff > 1: fz *= (1/R)^(1/(1-mc)), mc from CANONICAL_KIENZLE (imported, NEVER inlined); feed/mrr scale with fz (mode-agnostic, preserves controller-smoothing in aggressive_rush)
- derated fz < 0.01mm chip-load floor -> FAIL LOUD (R12), no silent un-cuttable chip load

VALIDATED LIVE (R15): axis-liveness probe now shows workholding LIVE 3.10x (aluminum) / 29.21x (steel heavy roughing) on feed/MRR, 1.00x on Vc/RPM (correct -- caps chip load not speed). 10 new tests (regression guard + positive derate + monotonic vacuum<magnetic<vise + SF wiring + fail-loud + 2 adversarial NaN/0 + form-closure differentiator) all PASS; 18/18 existing SFC tests no-regression.

Per-file scrutiny: physics-reviewer PASS (no inlined constants, safe-direction, guards live-verified, regression guard R=0.575<1) + independent reviewer PASS (3-mode integration, feed=fz*flutes*rpm invariant preserved, no reachable throw). P2 deferrals: WORKHOLDING_RETENTION_SF -> Record<CutType,number>; reconcile vs pre-existing checkWorkholding (resultant/SF2.0/friction-only) force-basis divergence (R7).
```

## Files touched (3)
- mcp-server/src/__tests__/workholdingForceCap.test.ts          | 129 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts |  98 +++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 227 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2070c472a41b`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._