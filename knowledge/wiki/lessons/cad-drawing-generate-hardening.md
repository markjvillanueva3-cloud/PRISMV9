# cad_drawing_generate hardening — 4 silent-wrong defect classes in view layout

**Date:** 2026-07-01 · **Slot:** delta · **Unit:** U-DELTA-DRAWGEN-HARDEN · **Surface:** `mcp-server/src/engines/CAD2DDrawingEngine.ts` + `cadActionSchemas.ts` (cad_drawing_generate, shipped `adabdcf5cc` with 22 tests)

## What was found (audit of the newest CAD-file-generation surface)

1. **Silent view overlap (P1).** Layout used a fixed 100 mm default spacing and ignored part geometry entirely — any part with extents larger than the spacing produced overlapping orthographic views with no warning (a 1000:1 plate guaranteed collision). A drawing that *renders* but overlaps is silent-wrong: it looks like a layout, it isn't one.
2. **No units guard (P1).** Engine was mm-only by JSDoc comment. JM callers are inch-derived (STEP `CONVERSION_BASED_UNIT` 25.4 — [[reference_delta_step_inch_unit_convention]]); nothing labeled or converted. The classic 25.4× class, at the drawing layer.
3. **PMI silently dropped (P1).** The `.passthrough()` schema accepted `pmi`/`gdt`/`dimensions`/`callouts`/`tolerances`/`datums` params and `apply()` discarded them without a trace — the exact delta refuse-list violation (dropping-pmi-data-on-import).
4. **Degenerate-extent NaN (P1).** Once part geometry becomes an input (fix #1), zero/negative/NaN extents had no guard — NaN coordinates would flow into the emitted view layout.

**Verified NOT a defect:** projection-angle math. `sign=+1` third_angle puts top at +y (above front, ASME Y14.3); `sign=-1` first_angle puts top at −y (below, ISO 128). Checked against the layout math, not the names.

## The fixes (all raised-loud, never heuristic-filled)

- Optional `part_size_mm {x,y,z}`: per-axis minimum center spacing from adjacent half-extents + gap (front↔right: X/2+Y/2+gap; front↔top: Z/2+Y/2+gap). Insufficient spacing → loud note + `spacing_adjusted: true`, never a silent overlap. Gap default 25 mm is an engine-local house layout default, explicitly commented as NOT an ISO value, overridable via `min_gap_mm`.
- `units: mm|in|inch|inches` with conversion via canonical `INCH_TO_MM` from `src/physics/unit-conversions.ts` (NIST SP 811 — no inline 25.4). Fail-loud on unknown units, on mixed `units:'inch'` + `*_mm` params, and on ambiguous suffixed+unsuffixed twins. Default-mm path regression-pinned byte-identical.
- Degenerate guard: every extent finite and > 0 or structured failure naming the axis, `views: []`.
- `surfacePmi()`: `unplaced_pmi_keys` + loud note on success AND failure paths.

Tests 22 → 50 (28 engine incl. pairwise AABB no-overlap invariant at 1000:1; 9 NEW dispatcher round-trips parsing `content[0].text`; 13 coverage-meter regression unchanged). All green; tsc clean.

## Lessons

- **A layout engine without part geometry is a silent-overlap generator.** Spacing defaults only work until the first real part exceeds them; clearance must derive from the geometry it is laying out.
- **The 25.4× units class recurs at every NEW layer** (gen kernel 06-30, drawing layer 07-01). Any new mm-parameterized surface on a JM-facing path needs the units guard at birth, not after the first inch part.
- **`.passthrough()` schemas + selective `apply()` = built-in silent-drop.** Anything accepted-but-unused must be surfaced by name in the response.

Related: [[cad-step-failure-modes]] · [[feedback_check_units_first]] · [[reference_delta_jm_spark_gap_convention]]
