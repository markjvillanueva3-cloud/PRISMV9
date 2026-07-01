---
name: reference_oscar_engagement_arc_doubled_bug_2026_06_23
description: "BUG FOUND not yet fixed (slot:oscar 2026-06-23, validating the codex SFC page panels): ToolpathCalculations.calculateEngagementAngle DOUBLES the engagement arc. half_angle_rad = acos(1-2ae/D) is ALREADY the full engagement angle phi, but arc_of_engagement = half_angle_rad*2 (capped 180). So 25% immersion returns 120deg (should be 60), 50% returns 180 (should be 90); slot=100% is right ONLY because the *2 hits the 180 cap. average_chip_thickness also uses 2*phi -> ~half the correct value; max_chip_thickness is accidentally correct. Survived because toolpath-calculations.test.ts only value-checks the slot case + a toBeDefined() stub (R9). FIX is chip-thinning geometry -> soul-DEFERRED to physics-reviewer + shared CAM fn (ProductEngine + HyperMill + calcDispatcher consume it) -> coordinate kilo. NOT yet fixed."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.689Z
aliases: reference_oscar_engagement_arc_doubled_bug_2026_06_23
---



**Engagement-arc DOUBLING bug -- FOUND + FIXED (slot:oscar, 2026-06-23, commit `247c5856f2`; found validating the codex SFC page's standalone panels).**

> STATUS: FIXED in `247c5856f2`. Physics-reviewer adjudicated the coherent geometry (Altintas 2e Sec 2.4/Eq 2.21): arc = min(phi,180) (no *2), max_chip = fz*sin(min(phi,90)) (decoupled), avg_chip uses phi, climb/conventional entry/exit now differ. 4 bug-encoding test oracles corrected + an anti-doubling reference-value lock added; toolpath 58/58 + route-contract + forge-debug all green; 2-arm scrutiny PASS (the independent arm caught a 3rd stale oracle in route-contract-sfc-speedfeed.test.ts, fixed same commit). CAM (kilo) coordinated via chat bus.

## The bug (`mcp-server/src/engines/ToolpathCalculations.ts:326-328`, `calculateEngagementAngle`)
```
const cos_half_angle = 1 - (radial_depth / radius);          // = 1 - 2ae/D
const half_angle_rad = Math.acos(clamp(cos_half_angle));     // = acos(1-2ae/D) = the FULL engagement angle phi
const arc_of_engagement = Math.min((half_angle_rad*180/PI)*2, 180);  // <-- DOUBLED (bug)
```
`half_angle_rad` is MISNAMED -- `acos(1 - 2ae/D)` is the textbook FULL engagement angle phi, not a half-angle. Doubling it makes `arc_of_engagement = 2*phi`.

## Numeric evidence (live probe `scripts/sfc-panel-validate-probe.mjs`, D=12)
| ae | immersion | textbook arc = acos(1-2ae/D) | engine returns | verdict |
|---|---|---|---|---|
| 3 | 25% | 60 deg | **120** | 2x too big |
| 6 | 50% | 90 deg | **180** | 2x, capped at 180 |
| 12 | 100% (slot) | 180 deg | 180 | right ONLY by the cap |

## The internal inconsistency (why a naive one-line fix is wrong -- physics-reviewer needed)
- `arc_of_engagement = 2*phi` -- WRONG (2x).
- `entry_angle/exit_angle` derive from `arc_of_engagement/2 = phi` -- so their SPAN is 2*phi (wrong: half-immersion spans 180 not 90).
- `average_chip_thickness` uses `engagement_rad = half_angle_rad*2 = 2*phi` in the Altintas denominator `fz*ae/(R*phi)` -> returns ~HALF the correct h_avg (WRONG).
- `max_chip_thickness = fz*sin(arc/2) = fz*sin(half_angle_rad) = fz*sin(phi)` -> for half immersion fz*sin(90)=fz, CORRECT -- accidentally right because arc/2 cancels the doubling.
So a correct fix must re-derive arc + entry/exit + avg_chip COHERENTLY (max_chip already right). This is chip-thinning/immersion geometry -> oscar soul `defer-chip-thinning-and-sld-to-physics-reviewer`.

## Blast radius (shared CAM fn)
Consumers of `calculateEngagementAngle` / `arc_of_engagement`: `ProductEngine.ts:43` (the codex SFC page imports it), `calcDispatcher.ts:1486` (`prism_calc:engagement` -> the page's engagement panel), `ToolpathCalculations.ts:856` (`engagementAngle` export), `HyperMillDeflectionThermalMappingEngine.ts:1637` (ae/D -> arc_of_engagement -> thermal pulse). So the fix is CROSS-GALAXY (toolpath/CAM = kilo) and must not silently break HyperMill thermal mapping.

## Why it survived (R9 -- tests verify behavior not intent)
`toolpath-calculations.test.ts:33` only: `expect(arc_of_engagement).toBeDefined()` (a stub) + `>0 && <=180` + the SLOT case `toBeCloseTo(180,0)` (correct by the cap). It NEVER asserts a non-slot value (25%->60, 50%->90), so the doubling is invisible to the suite.

## The other 3 page panels are CORRECT (validated live, same probe)
- `power_torque` (calculateSpindlePower 500,150,12,0.80): power_cutting 1.25 kW, spindle 1.563, torque 3.75 Nm, rpm 3979 -- matches Fc*Vc/60000 + P/eta + 9549*P/rpm.
- `deflection` (calculateToolDeflection 500,12,50,600,0.005): static 0.034 mm (ref F*L^3/3EI = 0.0341), dynamic 0.051 >= static, L=100 -> 0.273 = 8x (L^3 scaling confirmed).
- `cycle_time` (estimateCycleTime 1000,500,200): total 2.0 min (cut 1000/500).

## Next (physics-gated, NOT done): dispatch physics-reviewer to adjudicate the corrected engagement/chip-thinning geometry, coordinate kilo (CAM owns ToolpathCalculations), fix arc+entry/exit+avg_chip coherently, REPLACE the weak engagement tests with reference-value asserts (25%->60, 50%->90, 75%->~150), re-verify HyperMill thermal mapping. Sibling SFC page accuracy work: [[reference_oscar_sfc_page_material_aware_fix_2026_06_23]].
