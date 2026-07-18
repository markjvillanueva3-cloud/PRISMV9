---
name: reference_cad_analyze_step_nurbs_overflow_2026_06_26
description: cad-analyze-step.mjs inspect overflowed the call stack on large NURBS parts (Math.min(...coords) spread) -- FIXED 2026-06-26 (commit 88c20606bd, single-pass min/max); blisk/impeller now inspect clean. Unblocks T3 dim-fidelity on the JM NURBS corpus.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.492Z
aliases: reference_cad_analyze_step_nurbs_overflow_2026_06_26
---


# cad-analyze-step NURBS stack-overflow (2026-06-26, slot:delta)

Found while attempting the autonomous T3 (`U-CAD-PRINTGEN-E2E`) regen-fidelity run on real
reference parts.

**Symptom:** `node scripts/cad-analyze-step.mjs "resources/CAD FILES/blisk.stp" --json` returns
`{valid:true, solids:1, faces:223, inspect:{error:"read failed: Maximum call stack size exceeded"}}`.
The VALIDITY gate (valid/solids/faces) succeeds; the detailed `inspect` (schema/unit/coordRange/
radii/manifold) **overflows the stack** on large NURBS STEP files (blisk.stp 3.0MB / Impeller
turbine.stp 4.9MB, deep `B_SPLINE_SURFACE` reference graphs). On the SMALLER synthesized parts
(`state/shared/cad-generated/*.step`, e.g. `_cli-smoke-test.step` 18 solids / 1332 faces / 43115
entities) the inspect succeeds cleanly -- so it is a DEPTH/recursion problem, not a size-of-file problem.

**Impact:** blocks scaling the dim-by-dim fidelity measurement (which produced the proven blisk
0.00%/1.55% closed-loop result) to the real JM/NURBS corpus headlessly -- the inspect that yields the
measured dims can't run on the large NURBS references. This is one of the two real blockers to the
autonomous T3 print-callout run (the other being the absence of a print->OCR->CAD->regen pipeline runner).

**Root cause (verified):** NOT a deep recursion -- it was `Math.min(...coords)`/`Math.max(...coords)`
in `parseStepText` (line 49), a SPREAD of the full coord set. blisk's NURBS control points exceed V8's
spread-arg limit -> stack overflow. Small synthesized parts stayed under the limit (latent).

**Fix SHIPPED (commit 88c20606bd, U-CAD-ANALYZE-OVERFLOW-FIX):** track min/max in a single pass during
the CARTESIAN_POINT scan -- no spread, no huge coords array (memory win). +1 regression test (60000
points). LIVE: blisk inspects clean (coordRange {-603.45,603.45} mm), impeller too; 14/14 tests.

**Next unit (still open):** with the analyzer unblocked, build the regen-fidelity-over-corpus runner
(replicate ref -> analyze both -> compare) to record a real `CAD-TRAIN-TEST-RESULT` across the JM/NURBS
corpus -- the geometry half of T3. The full T3 also needs the print->OCR->CAD->regen pipeline runner.

**What WAS produced this session (bounded, overflow-safe):** a generation-validity aggregate over 12
synthesized parts -- `state/shared/specs/CAD-GEN-VALIDITY-2026-06-26.json`: 100% valid solids, 91.7%
manifold (1/12 non-manifold -- a real generation-quality signal worth chasing). Honestly NOT the full
T3 print-callout fidelity. See [[reference_pa3_hermes_cad_builder_2026_06_26]].
