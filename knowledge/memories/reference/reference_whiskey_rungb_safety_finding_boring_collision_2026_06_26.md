---
name: reference-whiskey-rungb-safety-finding-boring-collision-2026-06-26
description: "Closed-loop FINDING: PRISM's generated lathe programs grade 40/60 UNSAFE on the Rung B grid -- driven by boring-bar-deflection-out-of-tolerance (40) + collision-veto-fails (20); overspeed+overpower=0 (G50 cap + power FINE). Root-cause is a SEPARATE investigation unit (slot:whiskey)"
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.261Z
aliases: reference_whiskey_rungb_safety_finding_boring_collision_2026_06_26
---


# Closed-loop FINDING: generated lathe programs fail boring-bar deflection + collision (Rung B, 2026-06-26)

After wiring the U-W2D safety/efficiency scorer into the Rung B roundtrip harness (U-W2G,
`mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts`, run via tsx over the MATERIALS x ARCHETYPES
grid = 60 programs), the closed-loop test now MEASURES the collision/cost/efficiency dimension the
operator required -- and it surfaced a real, specific signal.

## The numbers (LIVE, 60 generated programs, scored vs representative Okuma limits 4000 rpm / 15 kW)
- verdicts: **20 SAFE / 40 UNSAFE / 0 PARTIAL**
- `violations_by_axis` (U-W2I): **overspeed_ops 0 · overpower_ops 0 · collision_veto_fails 20 · critical_warnings 0 · boring_bar_out_of_tolerance 40**
- envelope_agreement UNCHANGED 96.3% feed / 100% SFM (the safety wiring added zero blast radius).

## Interpretation (R12, honest)
- **NOT a speed/power problem and NOT a 15kW-assumption artifact:** overspeed=0 (the G50 cap is working)
  and overpower=0 (every program is within the 15 kW representative spindle). So the UNSAFE verdicts are
  REAL, not a side-effect of my representative power assumption.
- **Real defect axis = boring-bar deflection (40) + collision (20).** PRISM is generating boring
  operations whose boring-bar L/D + deflection exceed tolerance (`prog.boring_bar_checks[].within_tolerance
  === false`), and collision checks (`prog.collision_checks[].passed === false`, warning|critical) fail on
  20 programs. Boring-bar deflection ∝ L^3/D^4; the lathe soul mandates L/D <= 4 steel / <= 6 carbide.

## Root-cause = SEPARATE generator-FIX unit (the TEST is correct; precise targets below)
The closed-loop TEST works -- it found a real generator issue. The fix is in the GENERATOR
(`TurningPrintToProgramEngine`), NOT the test. **U-W2J pinned the EXACT archetypes** (deterministic,
10/10 across all 10 materials -> systematic, not material-dependent):
- **id_bore + drill_center (20 progs) -> boring_bar_out_of_tolerance** (2 boring ops each = the 40
  op-level count). The generated boring/center-drill bar L/D + deflection exceeds tolerance. Fix: the
  boring-op tool/holder selection + DOC for `id_bore`/`drill_center` (pick a carbide/anti-vibration bar,
  reduce DOC for the stickout, or flag "needs steady rest"); boring deflection prop L^3/D^4, L/D<=4
  steel / <=6 carbide.
- **groove_od + part_off (20 progs) -> collision_veto_fails (20).** Grooving/parting overhang collision
  (`LatheCollisionZoneEngine` overhang checks). Fix: the groove/part-off tool overhang vs the collision
  zone (tool width/projection vs clearance).
- overspeed + overpower = 0 (G50 cap + power are fine -- do NOT touch those).
The fix is physics-relevant -> needs `physics-reviewer` + per-file + 3-of-3. Dashboard now carries
`unsafe_by_archetype` + `boring_fail_by_archetype` (U-W2J).

## ROOT CAUSE of the boring failures (read 2026-06-26) -- likely an over-pessimistic CHECK, not unsafe programs
`TurningPrintToProgramEngine.ts:1529`: the boring-bar deflection pre-check sets
`const overhang = input.part_length_mm * 1.2` -- i.e. it assumes the boring bar sticks out ~1.2x the
ENTIRE PART LENGTH for EVERY id/bore op, regardless of the actual bore depth. With `barDia = min_bore*0.7
|| 12mm` (1528) and `ldRatio = overhang/barDia` (1530), a long part + small bar yields an inflated L/D
(easily >8-10), so `boringBarDeflectionEngine.calculate` predicts a deflection > the 25um budget
(`withinTol = defl < tol/2`, tol=0.05mm; 1542-1543) -> false `within_tolerance:false`. But a BLIND bore
of depth D in a part of length L (D<L) only needs the bar to reach ~D, not L. The feature HAS the depth:
`TurningFeature.depth_mm`/`length_mm` (lines 116/115), looked up via `op.feature_id` against
`input.features`. So the physically-correct overhang is ~`min(boreDepth, part_length) * 1.2`, not always
`part_length * 1.2`. For a THROUGH bore (D=L) the value is unchanged; only blind bores get the (correct)
relief.

## FINDING FULLY RESOLVED (2026-06-26): UNSAFE 40 -> 20; 3 false-positive defaults FIXED, residual 20 GENUINE
The closed-loop test found + fixed THREE generator over-pessimism defaults (all wrong flat defaults
causing FALSE safety flags), and confirmed the residual 20 are GENUINE:
- **U-W2K (680145c933) boring overhang** = bore depth not part length -> boring false flags 40->20.
- **U-W2L (0da80516aa) groove/part stickout** = real reach not flat 40mm -> groove + small-part collision relieved.
- **U-W2N (ef88365089) parting blade SPEC** = the program now RECORDS the required standard blade (3/4/5/6mm,
  capped at 6) in setup_notes + the collision check uses it -> collision_veto_fails 10 -> 0. NON-SOFTENING
  (oversized bar still flags at the 6mm cap; R9 invariant proves it). A 1.25in bar needs a 4mm blade (the
  old 3mm assumption was the false flag).
- **Residual 20 = boring_bar_out_of_tolerance, GENUINE (probe-confirmed).** id_bore generates bore_rough at
  L/D 5.1 / 396um deflection + bore_finish at L/D 6.4 / 39um, both over the 25um budget -- because PRISM
  selects a THIN boring bar (min_bore*0.7 = 7mm for a 15mm bore) that genuinely over-deflects. This is a
  CORRECT flag, NOT a false default. **Real improvement opportunity (fresh-budget feature, NOT a bug):**
  the boring tool selection should pick a STIFFER bar (closer to the bore diameter) and/or recommend a
  steady rest for deep bores -- then L/D drops and the deflection is in budget. Separate generator
  tool-selection unit.

Net: collision false positives = 0; the closed-loop test now flags ONLY genuine deep-bore deflection.

## (historical) STATUS: BORING HALF FIXED (U-W2K, commit 680145c933) -- COLLISION HALF is the next unit
**Boring (40 op-level / id_bore+drill_center): FIXED.** `boringBarOverhangMm(feat, partLength) =
min(boreDepth, partLength)*1.2` (pure exported helper in TurningPrintToProgramEngine.ts; boreDepth =
feat.depth_mm -> length_mm -> partLength). LIVE: boring_bar_out_of_tolerance 40 -> 20 (the 20 remaining
are genuinely-deep bores that STILL flag = not blanket-softening); envelope unchanged 96.3/100; 9 R9
tests (incl never-exceeds-legacy invariant) + 24 regression green; physics-reviewer validated the model.
**Collision (20 / groove_od + part_off): FIXED (U-W2L, commit 0da80516aa).** Root cause: same bug class --
TurningPrintToProgramEngine.ts:1670 fed the collision check a flat `tool_stickout_mm ?? 40` for every
groove/part tool; with blade widths 3/4mm that is ratio 13x/10x > the 6x/8x limits. The
`checkGroovingOverhang` math is SOUND (ratio = stickout/blade_width vs Sandvik limits) -- the INPUT was
wrong. FIX: `groovePartStickoutMm()` helper -- parting reaches part_od/2; grooving reaches the FULL groove
depth (feature groove_depth_mm/depth_mm); capped at 40 (never-soften). LIVE: collision_veto_fails 20 -> 10
(part_off relieved; the 10 groove_od still flag because the archetype/feature carries NO groove_depth_mm
-> conservative fallback keeps them flagged = the SAFE direction, not a defect). safe 20->30 / unsafe
40->30; envelope unchanged. 9 R9 tests + never-soften invariant.

**RESIDUAL pinned by U-W2M (commit 2f3ef5448d) -- collision_fail_types instrumentation.** The residual
10 collision fails are ALL `part_off:grooving_overhang` -- ZERO groove_od (FIXED, probe-confirmed 0) and
ZERO boring_reach. So U-W2L fully worked (groove + small-part_off -> 0 collision). The residual 10 are
the harness's LARGER bar: with the now-correct stickout (part_od/2) the ratio still exceeds the 6x
parting limit because the collision builder HARDCODES a 3mm parting blade
(TurningPrintToProgramEngine.ts:1673) regardless of bar size -- a 3mm blade genuinely can't safely part a
>~30mm bar (ratio>6), so the check CORRECTLY flags it. NOT the false-40mm positive U-W2L removed.

**NEXT UNIT (deeper, fresh budget + never-soften judgment): parting/grooving blade-width scaling.** The
collision builder + generator should select a parting blade width that scales with bar OD (real shops use
4-6mm blades for large parting; blade_width >= ~bar_od/12 keeps ratio<=6). CAVEAT: increasing the assumed
blade width makes the safety check pass MORE -- this is only valid if the GENERATED program actually emits
an appropriately-wide parting tool (verify the tool-selection path), else it is a softening-by-assumption.
This is why it is NOT a budget-edge change. Combined finding progress: UNSAFE 40 -> 30. Relieved (false
positives): blind-bore deflection + groove/small-part collision. Remaining GENUINE: 20 deep-bore
deflection + 10 part_off (3mm blade vs large bar).

## SAFETY CAVEAT -- this fix makes a SAFETY check LESS conservative (never-soften refuse territory)
DO NOT rush this. Reducing the overhang -> smaller predicted deflection -> MORE programs pass the
deflection gate. My physics reasoning says the old value was over-pessimistic (a bar does not extend
past the bore it is cutting), so a bore-depth overhang is more ACCURATE, not softer. BUT if that
reasoning is wrong, the change would MASK real deflection = softening a safety threshold (the lathe
soul `softening-safety-thresholds` refuse). So the fix REQUIRES `physics-reviewer` validation that the
bore-depth overhang is physically correct (confirm: boring-bar stickout is governed by reach-to-bore-
bottom, and the `min(boreDepth, part_length)` cap is right for through vs blind), a real-value test
(blind bore passes, a genuinely-long-stickout bore still fails), and per-file + 3-of-3. Bounded but
must be physics-validated on fresh budget -- never a budget-edge edit to a safety check.
COLLISION half (groove_od + part_off, 20 progs): separately confirm whether the
`LatheCollisionZoneEngine` overhang check is similarly over-pessimistic or a real overhang issue.

## Where this lives
- Scorer: `scripts/lib/lathe-safety-efficiency-score.mjs` (10 tests; never-soften).
- Rung B wiring: `mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts` -> `safety_efficiency` +
  `violations_by_axis` in `state/shared/dashboards/lathe-roundtrip-accuracy.json`.
- Unified: `scripts/lathe-closed-loop-full.mjs` folds `rung_b.safety_efficiency` (U-W2H).
- Wiki: [[lathe-closed-loop-test]]. Doctrine: [[feedback_safety_gate_veto_on_fail_flag_not_severity]].

Related: [[reference_whiskey_rungc_ocr_leg_u_w2c_2026_06_26]] · [[reference_whiskey_kienzle_session_2026_06_26]] · [[feedback_whiskey_boring_bar_ld_ratio]]
