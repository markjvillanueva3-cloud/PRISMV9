---
name: feedback_draw_set_cad_units_to_print
description: "When drawing/modeling from a print, set the CAD/CAM document unit setting to whatever the print uses (inch or mm) FIRST, then author in the print's native units — never hand-convert each dimension. Operator rule 2026-06-18."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.423Z
aliases: feedback_draw_set_cad_units_to_print
---


**Rule (operator 2026-06-18, FLEET-WIDE for CAD + CAM drawing):** When we draw a part from a print, the FIRST step is to set the CAD/CAM document's unit setting to match the print (inch or mm), then author every dimension in the print's native units. Do **not** hand-convert each value to the tool's internal units.

**Why:** Hand-converting inch↔mm on every dimension is slow and a 25.4× scale-error waiting to happen (one fat-fingered ×25.4 ruins the part — sibling of [[feedback_check_units_first]]). Switching the document setting once is faster, makes the file read in the print's units (what the operator inspects), and lets the CAD system own the conversion.

**How to apply:**
- **Resolve the print's units from the title block BEFORE drawing** (JM / PrecisionForm convention = INCH — title-block tolerances `.X ±.1 / .XX ±.01 / .XXX ±.002`; still verify per print). [[feedback_check_units_first]]
- **Fusion live bridge (:18362, [[reference_delta_cad_drawing_port_18362]]):** in the build script set `design.unitsManager.distanceDisplayUnits = adsk.fusion.DistanceUnits.InchDistanceUnits` (or `MillimeterDistanceUnits`) to match the print, and author each coordinate via `unitsManager.convert(value, 'in', 'cm')` (or `evaluateExpression("<v> in")`) so **Fusion** does the unit math — you type the print's verbatim values.
- **Caveat (R12, do not state the rule as more than it is):** Fusion's geometry API is internally **cm regardless of display units**. So "set the file to inch" governs display + parameters + inspection; the no-hand-convert guarantee comes from pairing it with the `unitsManager` converter. Never multiply by 25.4 yourself.
- **Other seats (SolidWorks / Inventor / Mastercam / hyperMILL):** same first move — set document/part units to the print's units before modeling or programming.

**Proven:** verified live 2026-06-18 building C-033626 R01 Item-4 CENTER POST — height 2.25 in / OD 1.5005 in exact, file units = inch. → [[reference_delta_cad_drawing_port_18362]] · [[reference_delta_step_inch_unit_convention]] · [[feedback_check_units_first]]
