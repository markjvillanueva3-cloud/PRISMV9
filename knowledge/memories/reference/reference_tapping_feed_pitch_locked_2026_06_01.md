---
name: reference_tapping_feed_pitch_locked_2026_06_01
description: "Tapping feed is rigidly pitch-locked (Vf = n × pitch), NOT a chip-load SFC output. UltimateSpeedFeed returns 0/unreliable feed_rate for tapping — derive it from rpm×pitch. Found 2026-06-01."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.221Z
aliases: reference_tapping_feed_pitch_locked_2026_06_01
---


# Tapping feed is pitch-locked, not chip-load (slot foxtrot, 2026-06-01)

**Finding:** When SFC-grounding cutting conditions (T2.5 / `mill_sfc_grounded_template_library`), `UltimateSpeedFeedEngine.calculate({operation:"tapping", ...})` returns a valid `spindle_rpm` but `feed_rate.value === 0` (or a chip-load value that is **physically wrong** for tapping). Tapping feed is **rigidly pitch-locked** — `Vf = n × pitch` (mm/min = rev/min × mm/rev) — by the definition of a thread; the cutter advances exactly one pitch per revolution. It is NOT a free chip-load parameter, so the chip-load SFC path either returns 0 (caught: `tapping/P` grounded rpm=1114, feed=0) or a nonsense value (the other 5 ISO groups "passed" with a wrong chip-load feed).

**Fix (this session):** In `generateSFCGroundedLibrary`, for `op === "tapping"` derive `grounded_feed = round(grounded_rpm × TAP_PITCH_MM)` (default pitch 1.5 mm, matches `buildParams`) for ALL materials, and tag `feed_basis: "pitch_locked"` (non-tapping = `"calculated"`). This fixed 1 zero-feed cell AND silently corrected 5 wrong chip-load tapping feeds — full 9×6 = 54/54 coverage. `Vf = n × pitch` is a kinematic relation (thread geometry), NOT a kc1.1/Taylor material constant, so computing it inline is fine.

**Caught by:** the full 9-op × 6-ISO matrix coverage test (`expect(grounded).toBe(54)`). A partial 3×3 probe missed it — full-matrix tests catch per-cell physics gaps that spot probes don't.

## How to apply
- Any SFC/speed-feed grounding of TAPPING must use `Vf = rpm × pitch`, never chip-load `fz`. Same for thread-milling pitch feeds where the lead is geometry-locked.
- Run the FULL parameter matrix in coverage tests — partial probes hide per-cell gaps (R12).
- Relates: [[reference_mill_program_enhance_contract_2026_06_01]] · [[reference_programcompare_modal_regex_bug_2026_06_01]] · [[feedback_verify_actual_contract_not_proxy]] · [[feedback_foxtrot_canonical_constants_import]]
