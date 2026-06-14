---
name: reference-delta-bspline-periodic-regression
description: "emitMultiSmoothPrismStep emits a malformed closed-periodic B_SPLINE_CURVE_WITH_KNOTS (N+1 uniform knots, all mult-1) that Fusion silently rejects -> blank document. Use emitMultiPrismStep. Correct smooth path: 6 RATIONAL_B_SPLINE patches (deg-2, weight (1,sqrt3/2,1))."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:09.076Z
aliases: reference_delta_bspline_periodic_regression
---


# B-spline periodic-knot regression (delta, DO NOT REPEAT)

`emitMultiSmoothPrismStep` (delta toolchain iter132) emitted a closed-periodic `B_SPLINE_CURVE_WITH_KNOTS` with N+1 uniform knots, all multiplicity 1. Fusion's STEP loader **silently rejects** malformed periodic curves → blank document, **no error message**. Reverted iter137; the EJOT generator uses the proven `emitMultiPrismStep` (polyline edges).

Valid degree-3 periodic needs either N+p+1 knots with periodic wrap-around, OR clamped-open form with degree+1 multiplicity at both ends + wrap-around control points. For genuine visible smoothness the right path is 6 `RATIONAL_B_SPLINE` arc patches matching JM's pattern (degree-2, weight (1, √3/2, 1)).

Class: silent-downstream-reject (R12). See wiki [[cad-electrode-generation]] · [[reference_delta_cad_toolchain_session_2026_05_27]].
