---
title: JM Die lathe finishing allowances — carbide press-fit (OD grind / ID hone / counterbore relief)
type: code-tribal
domain: lathe
tags: [lathe, turning, jm-die, press-fit, carbide, od-grinding, id-honing, counterbore, relief, finishing-allowance, closed-loop]
created: 2026-06-01
by: claude-57dfea65 (slot:whiskey)
source: operator directive (JM Die shop-floor practice)
---

# JM Die lathe finishing allowances — carbide press-fit

> Operator-stated JM Die shop-floor practice (2026-06-01). This is how JM actually makes a press-fit carbide seat — it is load-bearing for print→lathe-program accuracy, not optional polish.

JM Die turns die/punch components whose critical mating surfaces are **finished off the lathe** (ground or honed). The lathe program deliberately leaves finish stock and adds reliefs so the downstream grind/hone and the carbide press-fit come out true. A generated program that cuts these features to the bare print dimension is **incorrect**, even though the number matches the print.

## 1. OD grinding allowance — leave the OD oversize
ODs that press-fit into a mating bore, or that need roundness / size / finish beyond what turning holds, are turned **oversize** and finished by **OD grinding** (cylindrical or centerless) to final size.
- Generator action: on a grind/press-fit OD, finish turning **oversize by the OD-grind allowance** (stock left on diameter) and tag the diameter "to grind".
- Why: turning cannot hold the roundness / size tol / Ra a ground press-fit needs.

## 2. ID honing allowance — leave the bore undersize for the carbide press-fit
Bores that receive a **press-fit carbide insert** are bored **undersize** and finished by **ID honing**. The hone sets the exact bore size + finish for the interference fit.
- Generator action: on a press-fit-carbide bore, finish boring **undersize by the ID-hone allowance** (stock left in bore) and tag "to hone".
- Why: the press-fit interference is set by the hone, not the boring bar.

## 3. Counterbore corner relief — so the carbide insert sits true
When a counterbore seats a carbide insert that must sit flat on the counterbore floor, add a **relief / undercut at the bottom corner** of the counterbore.
- Generator action: program a bottom-corner relief groove/undercut; never leave a sharp tool-corner-radius fillet at the wall-to-floor junction.
- Why: a boring/counterbore tool leaves an uncut radius (fillet) where the wall meets the floor. A square-cornered carbide insert would ride up on that fillet and sit cocked/proud. The relief clears the corner so the insert **bottoms out flush and true**.

## Closed-loop / generator implications
- **Detect the trigger features from the print first** — press-fit callouts, GRIND/HONE notes, tight bore tolerance / GD&T on a carbide-insert bore, counterbores dimensioned to seat an insert. When present, do NOT cut to nominal.
- **Extract the numeric allowances from real JM programs, do not hardcode** (R12). On a ground/honed feature, `JM_program_cut_dimension − print_dimension` *is* the finish allowance. The amounts are shop- and likely material/size-specific; surface as a verified JM-fleet default, never a magic number.
- **Score accuracy against as-machined intent.** A generated program that cuts a press-fit bore/OD to the print nominal is WRONG. The closed-loop comparison must measure against what the existing JM program actually cuts (which carries the grind/hone stock and the counterbore relief), not the bare print value.

## Related
- Memory: `reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01`
- Program-assessment substrate: `WHISKEY-JM-ENHANCED-FLEET-ASSESSMENT-2026-06-01`
- Safety reflex unchanged: pre-emit `lathe_safety_predicate_evaluate` + `lathe_partoff_safety_gate` + `lathe_workholding_select_jaw`; G96⇒G50 cap; constants from `physics/constants.ts`.
