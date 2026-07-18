# PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT35-WIRE-BREAK-RETHREAD — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT35-WIRE-BREAK-RETHREAD (slot:foxtrot /loop iter35): WireBreakAutoRethreadEngine — WEDM wire-break recovery (7th P1 closure)

**Commit:** `4fe36bf54c6b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T16:58:19-05:00
**Tags:** print-to-cnc-first-part-perfect, u-it35-wire-break-rethread, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT35-WIRE-BREAK-RETHREAD (slot:foxtrot /loop iter35): WireBreakAutoRethreadEngine — WEDM wire-break recovery (7th P1 closure)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT35-WIRE-BREAK-RETHREAD (slot:foxtrot /loop iter35): WireBreakAutoRethreadEngine — WEDM wire-break recovery (7th P1 closure)

Closes iter20 P1 "wire-break auto-rethread" gap. When the wire breaks mid-cut, decision tree
picks recovery strategy: auto_rethread / burnback_restart / manual_rethread / scrap_part.

Decision drivers:
  - break_position inside workholding → scrap (cannot recover)
  - prior_breaks ≥ 3 → scrap (accumulated joint quality unacceptable)
  - manual_only threading capability → manual_rethread
  - workpiece thickness > 100mm → manual_rethread + master operator (pickup window too narrow)
  - corner_in / corner_out → burnback 1.5mm (joint lands in straight section)
  - rough cut → auto_rethread with 0.3mm overlap
  - skim cuts → burnback 0.5mm (skim_1) or 1.0mm (skim_2+) for joint cleanup

Outputs joint Ra estimate (base × (1 + phase-bump + 5%/prior-break)), recast factor (rough 2.5×
/ skim 2.0× surrounding per Fanuc §8.4 tables), recovery time (auto 2min / burnback 4min /
manual 10min / scrap 30min), operator skill (entry/intermediate/master), scrap risk %,
joint_meets_spec verdict against drawing Ra spec.

Side warnings: dielectric > 30°C flushing degraded, brass wire on >60mm workpiece (recommend
zinc-coated), joint Ra > spec (recommend additional skim pass at joint).

Reference: Fanuc Robocut Operator Manual §8.4; Sodick AP Series Troubleshooting §3.2;
Charmilles RoboFil 4000 Application Notes §C-5; Mitsubishi MV1200R Programming Manual §6;
EDM Today 2019 "Wire Break Causes + Cures" series.

Files:
  + src/engines/WireBreakAutoRethreadEngine.ts (167 lines: 7-branch decision tree + joint
    quality model + scrap risk forward-look)
  + src/__tests__/WireBreakAutoRethreadEngine.test.ts (25 tests: 6 throws + 7 strategy
    branches + restart-offset math + Ra-by-phase monotonicity + prior-break penalty
    monotonicity + recast factor by phase + scrap-risk compound + 3 side warnings +
    restart-clamp + source cite; all 25 PASS)
  + src/tools/dispatchers/safetyDispatcher.ts — wire_break_recover action routable

Tests: 25/25 PASS (9ms). Variability: 5 cut phases × 5 feature positions × 4 wire materials
× 3 threading capabilities. Adversarial: break>cut_path, break in workholding, 4-break
exhaustion, thick workpiece master-required path.

7th P1 closure (iter29-35): burr+coolant+threading+tool-cost+scrap-risk+capability-target+
wire-break. Pathspec-staged per BOOTSTRAP-SLOT-ENFORCE.
```

## Files touched (4)
- .../__tests__/WireBreakAutoRethreadEngine.test.ts  | 167 +++++++++++++++
- .../src/engines/WireBreakAutoRethreadEngine.ts     | 223 +++++++++++++++++++++
- .../src/tools/dispatchers/safetyDispatcher.ts      |   8 +-
- 3 files changed, 397 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4fe36bf54c6b`
- Milestone envelope: `mcp-server/data/milestones/PRINT-TO-CNC-FIRST-PART-PERFECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._