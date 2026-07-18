# QUEBEC-FRONTEND-WIRING/U-KIENZLE-TOOLCRIB-FOUNDATION — [MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-KIENZLE-TOOLCRIB-FOUNDATION (slot:quebec): port the Kienzle Tool Crib design's data + geometry core (verifiable foundation, R13)

**Commit:** `694449679cb4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T13:54:43-05:00
**Tags:** quebec-frontend-wiring, u-kienzle-toolcrib-foundation, auto-distilled

## Subject
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-KIENZLE-TOOLCRIB-FOUNDATION (slot:quebec): port the Kienzle Tool Crib design's data + geometry core (verifiable foundation, R13)

## Body
```
[MAIN-FORCE] [QUEBEC-FRONTEND-WIRING]/U-KIENZLE-TOOLCRIB-FOUNDATION (slot:quebec): port the Kienzle Tool Crib design's data + geometry core (verifiable foundation, R13)

START of migrating the existing build to the new Claude-Design Kienzle build, page 1 = Tool Crib. Path A (faithful 1:1 port): the design is a per-machine setup/offsets/collision PLANNER (client-side), NOT the inventory ToolCribEngine -- they overlap in name only (spec finding). So the design's data + geometry ARE the model; this unit ports that verifiable core before the UI.

- src/data/toolCribMachines.ts (357L): typed 1:1 port of the design data -- MACH (12 machines) + TURRET/CONN/GANG types + HOLDERS/TOOLING/INSERTS + seedCrib/defaultWork/defaultWP/typeTableFor/defaultTypeId/defaultCount. Byte-faithful values (2-arm review confirmed all 12 machines + seeds match design).
- src/lib/toolCribGeometry.ts (529L): pure computeCribVals(state) -- faithful port of renderVals() collision/triage (mill travel+Z-clearance, lathe maxTurn band, turret swing-gap, magazine adjacency), status, SVG geometry, assembly chain, 3D props.
- src/__tests__/toolCribGeometry.test.ts: 90 real reference-value tests (no stubs), all pass.

CAUGHT + FIXED 2 issues the builder agent missed: (1) 9 tsc errors --  narrowed to literal 0 via closure-only mutation in push() (builder conflated vitest-pass with tsc-clean); fixed via Math.max read at the comparison sites. (2) P2 fidelity: REACH partR dropped the design's  0-dia fallback; restored. tsc clean, 90/90, 2-arm scrutiny PASS.

NEXT: ToolCribPage.tsx + components + App.tsx route (UI consuming this core); ember->amber token map; SVG kinematics in v1 (3D deferred -- needs  dep). Visual 1:1 verification needs the dev server/browser. Deferred P2: ASCII separator robustness (the load-bearing design-faithful ).
```

## Files touched (4)
- mcp-server/web/src/__tests__/toolCribGeometry.test.ts | 730 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/data/toolCribMachines.ts           | 356 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/lib/toolCribGeometry.ts            | 531 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 1617 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 694449679cb4`
- Milestone envelope: `mcp-server/data/milestones/QUEBEC-FRONTEND-WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._