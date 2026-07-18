---
name: reference_delta_nurbs_emit_capability_2026_06_10
description: CORRECTED picture of slot/delta's headless NURBS (B_SPLINE_SURFACE) STEP-emit capability — it's MORE complete than the context-ledger claimed; the real gap is narrow.
type: reference
slot: delta
galaxy: cad
source: prism-memory
synced: 2026-06-27T20:30:46.550Z
aliases: reference_delta_nurbs_emit_capability_2026_06_10
---


**R8/R12 correction (2026-06-10, session 0e708167 loop iter):** the `DELTA-CONTEXT-LEDGER` claimed "headless-NURBS-STEP-emit is the one genuinely net-new piece (today's headless emit is faceted PLANE-only)." A dedup investigation (Ollama-offloaded) of the `slot/delta` branch proves that is **imprecise** — headless `B_SPLINE_SURFACE` emit ALREADY exists in two forms:

1. **Replicate-from-reference (parse → scale → emit) = TRUE NURBS, already built.** `scripts/lib/cad-step-emit-lib.mjs` (`serializeAst`/`scaleAst`/`emitScaledStep`/`scaleAstAxes`) parses a STEP to an AST, scales the control points (B_SPLINE_SURFACE control points are CARTESIAN_POINT refs, so scaling covers them), and re-serializes — **preserving the B_SPLINE_SURFACE_WITH_KNOTS entities**. Roundtrip-test-verified: `cad-step-roundtrip.test.mjs:33` asserts 6 B_SPLINE_SURFACE_WITH_KNOTS survive a scale. This IS the closed-loop "replicate a reference at new dims" path → for any part that HAS a reference STEP (the 93 JM trilobe STEPs, etc.), 100%-accurate-NURBS output is achievable headlessly by transforming the reference's own surfaces.

  **LIVE-VERIFIED on the REAL blisk.stp (2026-06-10, R15 numeric proof):** parse → `emitScaledStep(ast, 1.5)` → re-parse preserved **192 B_SPLINE_SURFACE_WITH_KNOTS (192→192)** + **48,956 CARTESIAN_POINT (exact)**, and the bbox scaled EXACTLY 1.5× (x-range 1206.90098 mm → 1810.35148 mm = 1206.90098 × 1.5). True NURBS geometry retained + exact dimensional scaling, fully headless (no Fusion). (Count nuance: 192 is the `_WITH_KNOTS` subtype; the earlier "328 B_SPLINE_SURFACE" headline counted the broader `B_SPLINE_SURFACE` type — both consistent, different granularity.) → the north-star "100%-accurate-to-print via NURBS" is PROVEN-achieved for the reference-available case.

2. **Generate-from-scratch (parametric) = minimal, exists.** `scripts/cad-emit-impeller-fusion-step.mjs:376` ("iter+11") emits `B_SPLINE_SURFACE_WITH_KNOTS` at **bilinear 2×2 control net** (degree-1, the smallest Fusion-importable manifold). NOT free-form curvature.

**The TRUE residual gap (narrow):** generate FREE-FORM NURBS from PARAMETERS with NO reference, at higher degree (bicubic 4×4+). This is the hardest + LEAST-common case — most JM parts have a reference STEP and use path #1. It also carries the documented **failure mode #3** ([[reference_delta_bspline_periodic_regression]]: malformed periodic B-spline → silent Fusion blank doc), so it demands non-periodic/clamped knots + a parse-back + Fusion-load validation gate, NOT a rushed build.

**Implication for ROI:** "100%-accurate-to-print via NURBS" is NOT blocked for the common (reference-available) case — it's built (path #1). Don't rebuild it. The parametric-free-form-gen unit is real but low-frequency + HARD; schedule it on a fresh full-budget window with the failure-mode-#3 guards. Companion: [[reference_delta_context_ledger_2026_06_10]] (ledger §3 B2 should be amended to this corrected picture at next reconcile). Other CAD emit primitives live in `scripts/lib/cad-step-ap242-emitter.mjs` (PLANE/CYLINDRICAL/ADVANCED_FACE analytic — `emitValidPrismStep`/`emitMultiSmoothPrismStep`/`emitValidCylinderStep`).
