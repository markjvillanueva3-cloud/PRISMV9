---
name: reference-delta-live-fusion-nurbs-emit-proven-2026-06-10
description: "BREAKS the #3 'faceted-vs-NURBS' blocker: PRISM CAN emit B_SPLINE_SURFACE STEP geometry via the LIVE Fusion kernel bridge (localhost:18361 PRISMBridge add-in). Proven end-to-end this session: POST /new (fresh parametric design doc) -> POST /execute (raw Python: loft 2 distinct lobed closed fitted-splines -> solid) -> POST /export (STEP) -> verified. In-kernel surfaceType counts {Plane:2, Nurbs(7):1}; exported STEP grep B_SPLINE_SURFACE=1/B_SPLINE_CURVE=6; PRISM's OWN cadGeometryComparisonEngine.extractMetrics reads entityTypes.B_SPLINE_SURFACE=1, CLOSED_SHELL=1, MANIFOLD_SOLID_BREP=1 (valid watertight B-rep). The headless faceted emitter (cad-step-ap242-emitter emitMultiPrismStep) is PLANE-only/0-B-spline and CANNOT do this; the live kernel generates NURBS natively from a loft (NO hand-rolled knot vectors -> sidesteps the malformed-periodic-B-spline silent-blank-doc failure). Artifacts: state/shared/cad-generated/nurbs_loft_proof2.py + nurbs-proof.step."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.549Z
aliases: reference_delta_live_fusion_nurbs_emit_proven_2026_06_10
---


# Live Fusion kernel emits B_SPLINE_SURFACE STEP -- #3 NURBS blocker broken (2026-06-10, slot:delta)

The last-session frontier ([[reference_delta_real_blisk_reference_characterized_2026_06_10]]) was: real refs (blisk.stp = 328 B_SPLINE_SURFACE, Impeller turbine.stp = 405) are NURBS-smooth, but PRISM's HEADLESS emit (`scripts/lib/cad-step-ap242-emitter.mjs` `emitMultiPrismStep`) is FACETED -- PLANE faces only, ZERO B-spline. So "generate 100% accurate to a NURBS reference" needed a NURBS-capable generation path. Found + PROVEN this session.

## The live path (operator opened Fusion + loaded PRISMBridge add-in)
PRISMBridge add-in runs an HTTP server IN Fusion on `localhost:18361` (NOTE: bind is IPv4 127.0.0.1 -- node `localhost` resolves to ::1 -> ECONNREFUSED; use 127.0.0.1). Real add-in path: `C:/Users/wompu/AppData/Roaming/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridge/PRISMBridge.py` (3397 lines). Confirmed endpoints (do_GET dispatch ~L201, do_POST dispatch ~L252):
- GET `/health` `/status` `/geometry` `/tool-library` `/cam/*`
- POST `/execute`(raw Python, AST-screened: blocks subprocess/eval/open/file-removal/time.sleep) `/sketch` `/extrude` `/revolve` `/export` `/new` `/batch`
- `/execute` injects `adsk`,`app`,`math`,`json`; returns `local_ns["result"]` -> set a `result` dict.
- Robust design accessor: `adsk.fusion.Design.cast(app.activeDocument.products.itemByProductType("DesignProductType"))` -- `app.activeProduct` alone returns None when active workspace isn't Design.

## The proof (R9 real numbers, verified 3 ways)
loft of TWO distinct lobed closed fitted-splines (r=2.0+0.5cos3θ @ z=0; r=2.5+0.6cos5θ @ z=3cm) -- different lobe counts so the kernel CANNOT fit analytic faces:
1. **In-kernel** (`f.geometry.surfaceType`): body faces `{Plane(0):2, Nurbs(7):1}` -- the lofted side wall IS a NURBS surface (the 2 planes are end caps). 1 body, vol 49.2 cm3 (sane).
2. **Exported STEP** (POST /export -> nurbs-proof.step, 84736 B): `grep B_SPLINE_SURFACE`=1, `B_SPLINE_CURVE`=6, `ADVANCED_FACE`=3, `PLANE`=2.
3. **PRISM's own validate engine** (`cadGeometryComparisonEngine.extractMetrics`, the SAME one that read blisk.stp's 328 B-splines): entityTypes `B_SPLINE_SURFACE:1, ADVANCED_FACE:3, CLOSED_SHELL:1, MANIFOLD_SOLID_BREP:1, solidCount:1, shellCount:1` -- valid watertight B-rep with a real NURBS face. STEP units = INCH (sizeZ 1.181 in = 30 mm = the 3 cm span; matches JM inch convention).

## What this PROVES + what remains (R13 logical order)
- PROVEN (capability, foundation): the live Fusion kernel generates NURBS natively from a loft and PRISM can drive it end-to-end (generate->export->validate). The malformed-hand-emitted-B-spline failure ([[reference_delta_bspline_periodic_regression]]) is sidestepped entirely -- the KERNEL builds the knots, not us. This is the NURBS-capable generation path #3 needed.
- REMAINS (the literal full-part proof, next increment on this proven foundation): drive the ACTUAL `BliskCADEngine` blade sections (its 53-op recipe / `bladeControlPoints` 5 hub->tip sections) through this SAME /new->/execute(loft)->/export pipeline -> a real blisk solid with B_SPLINE_SURFACE blades -> full-geometry `cadGeometryComparisonEngine.compare()` vs `H:/PRISM/resources/CAD FILES/blisk.stp` (volume/bbox/topology deltas). Scalar-volume convergence already proven headless ([[reference_delta_blisk_closed_loop_converged_2026_06_10]]); this adds the shape/NURBS dimension.
- Scratch Fusion doc "PRISM_NURBS_PROOF" left open with the lobed proof body (operator can close it; the DIE CASE doc was untouched -- /new adds a tab).

Artifacts (reproducible): `state/shared/cad-generated/nurbs_loft_proof2.py` (the driver) + `nurbs-proof.step` (the output).

## UPGRADE: PRISM's REAL airfoil engine geometry -> NURBS blade (same session)
Beyond the lobe test, drove PRISM's ACTUAL `bladeProfileLibraryEngine.getProfile("NACA 0010", 30)` sections through the proven pipeline: 5 hub->tip closed airfoil contours (upper+lower reconstructed -- NOTE bladeControlPoints exports UPPER-only, so reconstruct the closed contour from getProfile), tapered chord 18->14 mm + twist 0->15 deg (the section CLASS BliskCADEngine lofts), mm->cm. Result: 1 body, faces `{Plane:2 caps, Nurbs(7):1}`, vol 0.5287 cm3 (528.7 mm3, sane for a 10% airfoil blade). Exported `nurbs-blade-real.step` (634 KB): grep B_SPLINE_SURFACE=1, B_SPLINE_CURVE=7, ADVANCED_FACE=3, MANIFOLD_SOLID_BREP=1. So PRISM's real airfoil geometry -> live kernel -> NURBS blade STEP is proven, not just a synthetic lobe.

## The LITERAL full-blisk-vs-blisk.stp remaining (honest)
Still needs the engine-translation build (NOT one call): disk revolve + the blade positioned at the disk rim radius (Rhub) + 30-blade circular pattern + root fillets, driven live -> a full NURBS blisk -> `cadGeometryComparisonEngine.compare()` vs blisk.stp. Two honest caveats: (1) bladeControlPoints is upper-surface-only -> reconstruct closed sections from getProfile (done for the single blade here); (2) "100% accurate vs an ARBITRARY external industrial STEP" is not literally what a PARAMETRIC generator produces -- the defensible proof is NURBS-topology parity + measurable-metric convergence (volume/bbox, proven 0.0000% headless in [[reference_delta_blisk_closed_loop_converged_2026_06_10]]), not byte/shape identity. Artifact: `state/shared/cad-generated/nurbs-blade-real.step`.

## FULL NURBS BLISK BUILT LIVE + COMPARED vs blisk.stp (same session, EXECUTED)
Drove the FULL blisk live (first try): disk hub (circle R=8cm extruded sym 3cm) + 5-section radial airfoil blade lofted on offset-YZ planes (root r=80mm rim -> tip 120mm, NACA 0010, chord 18->14mm, twist 0->15deg) + 30x circularPatternFeature about Z. Stages all ok: disk(1 body)->blade loft(2)->pattern(31 bodies = 1 disk + 30 blades). In-kernel: 93 faces, surface_type_counts {Plane:62, Cyl:1, **Nurbs(7):30**} = 30 NURBS blade surfaces. Exported `nurbs-blisk-full.step` (4.49 MB): grep **B_SPLINE_SURFACE=30, MANIFOLD_SOLID_BREP=30**, ADVANCED_FACE=90. `cadGeometryComparisonEngine.compare(blisk.stp, generated)`: **Topology Jaccard 0.792** (thresh 0.8 -- 79% similar to the real 1.2m blisk!), Volume/BBox ~99% delta. overallPassed=false.
**Honest read:** generation capability fully proven (a real NURBS blisk, 30 B-spline blade surfaces, disk hub, correct radial topology). NOT "100% accurate" -- and not achievable vs this arbitrary external part: my blisk is 240mm vs reference 1207mm (scale), AND a REAL compare() BUG surfaced -- generated STEP exported in INCH (vol 63.4 in3) but blisk.stp is MM (451.5M mm3), and `compare()` does NOT unit-normalize -> the volume/bbox deltas are inch-vs-mm-confounded, not pure shape. Topology Jaccard (0.792) is the only unit-independent signal. **Follow-up units:** U-CAD-COMPARE-UNIT-NORMALIZE (compare() must resolve+normalize STEP units before delta -- ties to UNITS-FIRST safety rail / 25.4x error class) + scale-convergence (closed-loop scale generated blisk to blisk.stp bbox, then re-compare) + single-solid join. Artifacts: `state/shared/cad-generated/nurbs-blisk-full.step` (driver was .blisk-full-drive.mts, rm'd).
