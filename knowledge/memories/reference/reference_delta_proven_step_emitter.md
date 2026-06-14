---
name: reference-delta-proven-step-emitter
description: "emitMultiPrismStep (polygon-prism, polyline lateral edges) is the PROVEN Fusion-openable AP242 emitter in delta's cad-step-ap242-emitter.mjs. 6 emitter functions; emitMultiSmoothPrismStep is the known-bad one."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:09.086Z
aliases: reference_delta_proven_step_emitter
---


# Proven STEP emitter (delta)

`scripts/lib/cad-step-ap242-emitter.mjs` exposes 6 emitters; the PROVEN Fusion-openable one is **`emitMultiPrismStep(solidSpecs)`** (polygon-prism solids with polyline lateral edges). Also proven: `emitValidPrismStep`, `emitValidCylinderStep`, `emitValidSteppedCylinderStep` (stacked cylinders w/ planar annular transitions — mimics JM trilobe-example style). `StepAp242Builder` class + `AP242_CONSTANTS`.

**Do NOT use** `emitMultiSmoothPrismStep` — malformed periodic B-spline, silent Fusion blank doc (see [[reference_delta_bspline_periodic_regression]]).

Tested: 8 round-trip identity + emitter validity suites. See [[reference_delta_cad_toolchain_session_2026_05_27]].
