---
name: reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01
description: "JM Die shop-floor lathe finishing practice (operator-stated 2026-06-01): turned ODs that press-fit or need tight roundness are left OVERSIZE for post-turn OD GRINDING; bores that receive press-fit carbide inserts are left UNDERSIZE for ID HONING (hone sets the interference-fit bore); counterbores that seat a carbide insert get a CORNER RELIEF/undercut at the bottom so the square-cornered insert bottoms flush (clears the tool corner-radius). The print->lathe-program generator MUST detect these features and leave the right finish stock / add the relief — turning alone cannot hold a ground/honed press-fit. Numeric allowances are SHOP-SPECIFIC: extract from real JM program-vs-print deltas, never hardcode."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.629Z
aliases: reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01
---


# JM Die lathe finishing-allowance practice — carbide press-fit (slot:whiskey, 2026-06-01)

Operator-stated tribal knowledge (the `/goal` directive: *"you should notice that we tend to leave material for od grinding and id honing for press fitting in the carbide inserts and we add reliefs to the counterbores so the carbide insert sits true to the bottom"*). This is JM Die's canonical finishing practice for the die/punch components they turn — it is **not** optional polish; it is how a press-fit carbide seat is actually made.

## The three practices

1. **OD grinding allowance (leave stock OVERSIZE).** ODs that press-fit into a mating bore, or that need tight roundness / size / surface finish, are turned **oversize** on the lathe and finished by **OD grinding** (cylindrical or centerless) to final size. Turning cannot hold the roundness, size tolerance, or Ra that a ground press-fit demands, so the lathe program deliberately leaves grind stock on those diameters.

2. **ID honing allowance (leave stock UNDERSIZE) — for press-fitting carbide inserts.** Bores that receive a **press-fit carbide insert** are bored **undersize** on the lathe and finished by **ID honing**. The hone sets the precise bore size + finish that produces the correct interference (press) fit for the carbide. The lathe leaves hone stock in the bore; it does not bore to final size.

3. **Counterbore corner relief (undercut) so the carbide seats TRUE.** When a counterbore receives a carbide insert that must sit flat against the counterbore bottom, add a **relief / undercut at the bottom corner** of the counterbore. The relief clears the boring/counterbore tool's corner radius (the uncut fillet a tool leaves where the wall meets the floor) so the **square-cornered carbide insert bottoms out flush** against the floor instead of riding up on the radius and sitting cocked/proud.

## How to apply (print -> lathe program generator)

- **Detect the trigger features from the print** before emitting stock-to-size moves: press-fit callouts, "GRIND"/"HONE" notes, tight bore tolerance classes / GD&T on a bore meant for a carbide insert, counterbores dimensioned to seat an insert. When detected, the generator must NOT cut to nominal.
- **OD with grind/press-fit feature** -> finish the turned OD oversize by the OD-grind allowance (leave stock on diameter); flag the diameter as "to grind".
- **ID for press-fit carbide** -> finish the bore undersize by the ID-hone allowance (leave stock in bore); flag as "to hone".
- **Counterbore seating carbide** -> program a bottom-corner relief groove/undercut; do not leave a sharp tool-radius fillet at the floor.
- **R12 — do NOT fabricate the numeric allowances.** The amount of OD-grind stock and ID-hone stock is shop-specific (and likely material/size dependent). EXTRACT the actual values from the JM program-vs-print deltas in the closed-loop assessment (compare the dimension on the print to the dimension the existing JM program actually cuts; the difference on a ground/honed feature IS the allowance). Surface as a configurable JM-fleet default, verified against real programs — never a hardcoded magic number.
- This is a **closed-loop accuracy requirement**: a generated program that cuts a press-fit bore/OD to nominal print size is WRONG even though it matches the print number, because the real JM program intentionally leaves finish stock. Accuracy must be scored against the *as-machined* JM intent, not the bare print dimension.

Companion wiki: `knowledge/wiki/code-tribal/jm-lathe-finishing-allowances.md`. Pairs with [[reference_whiskey_jm_enhanced_program_assessment_2026_06_01]] (the program-assessment substrate that measures these deltas) and the JM Die shop-floor facts in MEMORY.md.
