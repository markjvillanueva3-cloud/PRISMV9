---
name: reference-delta-step-inch-unit-convention
description: "STEP files for JM Die parts MUST emit CONVERSION_BASED_UNIT('INCH')=25.4mm. STEP defaults to mm; JM convention is inch. Unit drift produces a part 25.4x wrong. Fixed in delta toolchain iter122."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:09.086Z
aliases: reference_delta_step_inch_unit_convention
---


# STEP inch-unit convention (delta)

Always emit `CONVERSION_BASED_UNIT('INCH')` = 25.4 mm in STEP output for JM Die parts.

STEP's default length unit is millimetres, but JM Die's print convention is inch. A STEP file emitted in mm but interpreted as inch (or vice-versa) yields a part 25.4× wrong — and Fusion/Mastercam won't flag it. Fixed in delta's `cad-step-ap242-emitter.mjs` at iter122.

Verify: `node scripts/cad-analyze-step.mjs <f.step>` reports the unit. See [[reference_delta_cad_toolchain_session_2026_05_27]] · wiki [[cad-step-toolchain]].
