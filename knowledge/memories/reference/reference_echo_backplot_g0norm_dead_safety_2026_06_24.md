---
name: reference_echo_backplot_g0norm_dead_safety_2026_06_24
description: PostValidationSuiteEngine backplot gouge + rapid-into-material detection were STRUCTURALLY DEAD (always false) due to a G0-normalization parse bug; fixed + 72-test companion
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.558Z
aliases: reference_echo_backplot_g0norm_dead_safety_2026_06_24
---


**U-PP-BACKPLOT-G0NORM (slot:echo, 2026-06-24, commit `8f47872237`)** — writing the `PostValidationSuiteEngine` companion test surfaced that its **backplot safety detectors were both dead**.

**Root cause:** `parseGCode` normalized the motion word with `modal_motion.replace(/^G0*/, "G")`. That regex strips a leading `G` followed by *any* run of `0`s, so `"G0"`/`"G00"` collapse to `"G"` (not `"G0"`). Therefore:
- `is_rapid = (norm === "G0")` was **ALWAYS FALSE** (nothing normalizes to exactly `"G0"`).
- `is_cutting = !is_rapid` was **ALWAYS TRUE** for every move.

**Consequence (both safety checks dead in `runBackplot`):**
- `min_cutting_z = min(cutting moves' z, 0)` included EVERY move, so no move could be below it by >0.05mm → `gouge_detected` was structurally unreachable (always false).
- `rapid_into_material` requires `is_rapid` → also unreachable. And `BP-001` (the backplot gouge error in `runFullValidation`) could never fire.
- A gouging / rapid-into-stock optimised program wrongly "passed" backplot. Move counts also mis-classified (all moves counted as cutting, rapid_moves always 0).

**Fix:** normalize by numeric value — `const motionNum = parseInt(modal_motion.slice(1),10); norm = Number.isNaN(motionNum) ? modal_motion : "G"+motionNum` → `"G0"`/`"G00"`→`"G0"` (rapid), `"G01"`→`"G1"` (cutting), `"G2"`→`"G2"` (arc). Restores both detectors. 72/72 companion tests green, incl. 3 that PROVE the detectors fire (G0 rapid below the G1 cutting floor → gouge + BP-001; G0 to Z<0 in the cut XY zone → rapid-into-material). Blast radius fully contained (no external importer; U05/consistency/regression unaffected — the G0 time cancels in orig-vs-opt diffs).

**Lessons:**
1. A "normalize leading zeros" regex `(/^G0*/, "G")` over-strips the bare `G0` rapid code into `G`, silently killing rapid detection — parse motion codes by NUMERIC value, not string-prefix stripping.
2. The test author's own comments had *documented* the dead behavior (`is_rapid always false`) and written tests that ASSERTED it — a characterization-of-a-bug masquerading as passing coverage. Writing a real R9 test that expects the INTENDED behavior (gouge SHOULD fire) is what surfaced it.
3. No 3-of-3 this pass (5h session ceiling); the fix is a parse-correctness change proven by the now-passing safety tests. Re-run a full 3-of-3 + `npx vitest run` suite refresh next session.

Part of **U-PP-MISSING-ENGINE-TESTS** (this session: 515 new tests across 10 post-processor engines + this fix). Related: [[reference_echo_post_processor_domain_map_2026_05_27]] · galaxy `PostValidationSuiteEngine`.
