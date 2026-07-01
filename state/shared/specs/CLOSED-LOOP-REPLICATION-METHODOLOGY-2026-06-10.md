# PRISM Closed-Loop Replication Methodology (canonical doctrine)

> Training-session deliverable, 2026-06-10, slot:delta. The repeatable process to
> replicate ANY H-drive artifact (CAD STEP, blueprint print, CNC program) and
> validate the replica against the original with quantitative, honestly-bounded
> metrics. Worked example: `H:/PRISM/resources/CAD FILES/blisk.stp`.
> Produced via the `blisk-replication-training` multi-agent workflow (4 agents).

## CORE PRINCIPLE -- what "100% accurate" means honestly
"100% accurate" = **metric convergence within tolerance + topological parity**,
NOT byte identity. A parametric/feature generator reconstructs the *engineering
intent* (dims, features, ops, tolerances) and converges every defined metric
below threshold. It does NOT byte-clone proprietary NURBS surfaces, scanner-noise
raster pixels, or vendor post formatting. **If byte-exact reproduction is the
requirement, the correct operation is re-import / file-copy, NOT regenerate.**
Always report: (a) which metrics converged, (b) the residual on each, (c) what is
structurally unrecoverable. Claiming "exact" without re-import is a fabrication.

## THE 6-STAGE GENERIC LOOP
1. **INGEST** -- read source authoritatively; resolve UNITS FIRST from the source
   (STEP CONVERSION_BASED_UNIT / SI_UNIT; NC G20/G21; print title block; unknown -> STOP).
   Normalize to an internal representation; record provenance (path, SHA-256, bytes, units).
   Fail loud on dropped data (multi-page PDF -> read ALL pages, not page 0).
2. **PARAMETERIZE** -- reverse-engineer the smallest named-variable spec that
   regenerates the artifact. Tag each param confidence (measured | inferred | defaulted).
   This spec is the convergence search space.
3. **GENERATE** -- produce a candidate from the spec with a DETERMINISTIC generator
   (same spec -> same candidate, so deltas are attributable to the spec).
4. **COMPARE** -- measure candidate vs original; emit a delta vector (one residual
   per metric) + pass/fail per threshold. Numbers only, never "looks fine". The
   metric must be discriminating (R9).
5. **CORRECT** -- adjust spec params to reduce the largest deltas. Lightest method:
   proportional (monotone single-var ratio) -> secant/Newton (smooth single-var) ->
   bounded coordinate descent (coupled multi-var, mutate largest-delta param). Mutate
   the SPEC only, never the candidate output (preserves reproducibility).
6. **CONVERGE** -- loop 3->4->5 until all deltas < threshold (SUCCESS) or max-delta
   improvement < epsilon for N iters (PLATEAU -- stop). Cap iterations. Record honestly:
   converged metrics, residuals, iteration count, classified ceiling for plateaued metrics.

Cross-cutting: RESUMABLE (durable per-iteration cursor; a reaper kill must not restart
at iter 1) - DETERMINISTIC generators - SINGLE-SOURCE the spec - FAIL LOUD on dropped data.

## PER-ARTIFACT SPECIALIZATION
| Artifact | INGEST | Metrics + pass threshold | Convergence vars | Honest ceiling |
|---|---|---|---|---|
| **CAD STEP** | STEP parse -> B-rep (Fusion live kernel / OpenCascade); units from CONVERSION_BASED_UNIT | bbox per-axis <=0.25%; topology Jaccard of {faces,edges,verts,shells} >=0.95; COM/inertia <=1%; volume <=0.5% **(SEE VOLUME CAVEAT)**; optional surface-Hausdorff | blade count, hub/tip radii, twist/sweep, fillet radii, thickness profile (BliskCADEngine / Fusion params) | approximates proprietary NURBS *form*; converges bbox/topology/mass; does NOT byte-clone control-point nets. Exact surface = re-import. |
| **Blueprint print** | OCR ALL pages (multi-VLM ensemble, >=2-agree) -> dims, GD&T, tolerances, title block | dimension-match rate >=95% (within print's tol band); tol-band recovery >=90%; GD&T recall >=90%; F1 >=0.9; ZERO fabricated dims | extracted dim set + feature model; CORRECT = re-OCR low-confidence regions, reconcile multi-view, repair parse defects before discarding | recovers stated dimensioned intent; cannot recover unstated/illegible info (inferred params flagged, never fabricated). 2D->3D is intent-reconstruction, not measurement. |
| **CNC program** | parse NC (G/M, modal, cycles, tools) -> op list + toolpath polyline; units from G20/G21 | toolpath Hausdorff <=0.01mm; cycle-time delta <=2%; MRR delta <=1%; op-sequence edit-distance =0; collision parity = 0-new; modal-state equivalence | tool sel, WCS/offsets, stepover/down, feeds/speeds, cycle params; re-post via matching dialect | reproduces machining intent (ops/geom/cycle-time/safety) as a functionally equivalent re-post; does NOT byte-reproduce vendor comments/formatting/hand-edits. Exact text = copy the file. |

## ACCEPTANCE GATES
- **CAD**: bbox all-axes <=0.25% AND topology Jaccard >=0.95 AND COM/inertia <=1% AND units equal. (Volume <=0.5% is a gate ONLY once the volume metric is fixed -- see caveat. Surface-Hausdorff advisory unless surface-critical aero/sealing -> then blocking, sub-threshold residual = honest ceiling.)
- **Print**: dim-match >=95% AND F1 >=0.9 AND GD&T recall >=90% AND zero fabricated dims. Missing-but-flagged dims do NOT fail; fabricated dims fail outright.
- **CNC**: op-edit-distance =0 AND toolpath Hausdorff <=tol AND cycle-time <=2% AND MRR <=1% AND collision 0-new AND units equal. Formatting/comment divergence never fails.
- **Universal rider**: every ACCEPT records the residual vector + classified ceiling. PASS with an unrecoverable-surface flag is honest; PASS claiming byte-identity is a lie. Validate on LIVE H-drive artifacts with numbers (R15: WIRE -> TEST -> VALIDATE).

## PRISM TOOLCHAIN (audited 2026-06-10 -- 100% built; Stage-6 closed this session)
| Stage | Tool (file / dispatcher action) | Status |
|---|---|---|
| 1 INGEST | STEPGeometryParserEngine (`cad_step_parse_file`); CADGeometryComparisonEngine.extractMetrics (`geometry_extract_metrics`); CADAssemblyGraphEngine (`assembly_analyze`); STEPAP242PMIExtractorEngine (`cad_pmi_extract`); live `GET /geometry` | BUILT |
| 2 FEATURE-RECOGNIZE | CADFeatureRecognitionEngine.extractFeatures + FeatureRecognitionEngine (`feature_recognize`) -- **R7 DUP, confirm canonical** | BUILT (dedup) |
| 3 PARAMETERIZE | CADReverseTemplateEngine.reverseEngineer (`cad_reverse_template`) -- operates on CADOperation[]; STEP->ops adapter unverified (soft gap) | BUILT |
| 4 GENERATE | CADToSTEPPipelineEngine.runPipeline; per-CAD code generators; BliskCADEngine.generate; live PRISMBridge.py (`/execute /sketch /extrude /revolve /export /new` -- **NO /loft**, use /execute) | BUILT |
| 5 COMPARE | CADGeometryComparisonEngine.compare (`geometry_compare_files`, 5% vol gate); CADRegenerationTestEngine **(extraction is MOCK -- real parity in .compare)** | BUILT |
| 6 CORRECT | CADRegenCorrectionEngine -- `correct()` + `runClosedLoop()` + `applyToTemplate()` + `paramsFromTemplate()`; wired `cad_regen_correct` / `cad_regen_apply_template` / `cad_regen_params_from_template` / `cad_regen_stats` (cadDispatcher + cadActionSchemas) | **BUILT 2026-06-10** (U-CAD-REGEN-CORRECT) |

### Stage-6 controller (CADRegenCorrectionEngine, shipped 2026-06-10)
Pure deterministic controller (R5 -- no kernel calls): reads a `ComparisonResult` delta vector + a `CorrectionParam[]` (each `{name, value, influences[], min?, max?, monotonicity?, opIndex?, argKey?}`), emits corrected params + a verdict (`converged | iterate | plateau | max-iterations | no-correctable-params`). Correction methods lightest-first: **proportional** (`new = old*(original/generated)^sign`), **secant** (two-sample slope), **coordinate-descent** (largest-delta param first, one metric per param per step), **auto** (secant when >=2 distinct history samples, else proportional). Trust-region (`maxStepFraction`) + hard `min/max` clamp; plateau patience guards a premature ceiling verdict. `runClosedLoop()` closes GENERATE->COMPARE->CORRECT with an **injected `evaluate()`** (the live Fusion-backed generate+compare); the loop is in-process only (a function cannot cross the MCP JSON boundary), so the MCP surface exposes the pure steps. `applyToTemplate()` writes corrections back into the reverse-template `opTemplate` via `opIndex+argKey`, closing CORRECT to GENERATE. A failing metric with NO influencing param is reported as structurally uncorrectable (the honest proprietary-surface ceiling, e.g. topology Jaccard). 27 tests (happy + proportional/inverse/secant + trust-region/bound clamps + plateau/max-iter/uncorrectable + div-by-zero/NaN/invalid adversarial + applyToTemplate round-trip + 5 runClosedLoop E2E with a deterministic injected evaluator that actually converges). 2-of-2 per-file scrutiny (arm-A FAIL caught a plateau off-by-one in the loop's stagnation threading -> fixed + pinned by an exact-iteration test; arm-B PASS flagged the missing Zod schemas -> added).

### LIVE closed-loop numeric convergence PROVEN (2026-06-10, real Fusion + real blisk.stp)
Drove `runClosedLoop` with a REAL Fusion-backed `evaluate()` (live kernel `127.0.0.1:18361`: /new -> /execute build a parametric body -> read IN-KERNEL bounding box -> compare vs the unit-normalized `blisk.stp` envelope). The loop CONVERGED the Bounding Box metric to **0.000%** in **3 iterations**, radius driven to the exact analytic target:
```
iter0 radius 400.00mm -> bbox 800.0x800.0x310.0 -> maxAxisDelta 33.71%
iter1 proportional    -> radius 570.43mm -> 1140.9x1140.9x310.0 -> 5.47%
iter2 secant          -> radius 603.45mm -> 1206.9x1206.9x310.0 -> 0.00%
iter3 status=converged (radius 603.450mm == refX/2 603.450mm; bbox delta 0.000% < 2%)
```
This is the live end-to-end proof: real generation -> measure -> COMPARE -> CORRECT (proportional then secant) -> CONVERGE, exact, on the real turbine blisk's envelope. LESSON: measure the IN-KERNEL bbox for the convergence variable -- the STEP export/extract/unit path is a separate (already-fixed) concern and conflating them produced a degenerate read in an earlier driver. Honest scope: this converges the parametrically-correctable ENVELOPE (bbox) to 0%; the 48-blade NURBS airfoil topology is a SEPARATE metric, quantified below.

### TOPOLOGY METRIC -- QUANTIFIED (corrects the earlier "0.795, add fillets -> 0.80" belief)
The `computeTopologyJaccard` is COUNT-WEIGHTED: `Sum(min(count_a,count_b)) / Sum(max(...))` over entity types. Measured composition of `blisk.stp`:
```
CARTESIAN_POINT 48956 (95% of all entities) | ORIENTED_EDGE 924 | EDGE_CURVE 462
B_SPLINE_SURFACE 328 | VERTEX_POINT 318 | ADVANCED_FACE 223 | CIRCLE 174
TOROIDAL_SURFACE 10 | PLANE 9 | CYLINDRICAL 7 | CONICAL 5 | total 51418
```
KEY FINDING: the Jaccard is ~95% driven by `CARTESIAN_POINT` count, NOT by blade count or fillets.
- BEST-CASE Jaccard if a parametric replica matches every type count exactly but caps B_SPLINE at 48 (1 loft/blade): **0.995** -- the 48-vs-328 B-spline gap is nearly irrelevant (328 << 48956).
- REALISTIC (replica ~50% of ref point counts): **0.498**.
- CORRECTION: the prior memory claim "add the 10 toroidal fillets -> Jaccard over 0.80" was WRONG; 10 tori vs 48,956 points is negligible. The real lever is CONTROL-POINT DENSITY (NURBS section resolution -> CARTESIAN_POINT count).
- IMPLICATION: Topology >=0.80 IS reachable parametrically (raise section/control-point density toward ~49K points) -- it is NOT an unmovable ceiling -- BUT count-weighted point-parity is a WEAK, gameable fidelity proxy (matching point counts != matching shape). The closed-loop param corrector cannot tune it (no continuous param maps to Jaccard; correctly `no-correctable-params`).
- METHODOLOGY REFINEMENT: do NOT treat raw entity-count Jaccard as the primary accuracy gate. The meaningful gates are bbox/dims (PROVEN exact live), feature presence, and -- for shape fidelity on a high-patch proprietary reference -- SURFACE-HAUSDORFF distance (advisory in the per-artifact table; promote to the topology gate for aero/sealing-critical surfaces). "100% accurate" = convergence of these engineering-intent metrics, never byte/point-count identity to a proprietary 49K-point CAD model (= re-import, not regenerate).

### SURFACE-HAUSDORFF metric SHIPPED + measured (U-CAD-HAUSDORFF, 2026-06-10)
Implemented `cadGeometryComparisonEngine.computeSurfaceHausdorff(fileA, fileB)` + pure `hausdorffPointClouds()` + wired `geometry_hausdorff` (cadDispatcher + Zod schema) + 8 tests (known-distance clouds: identity=0, 3-4-5=5, asymmetry, inch-vs-mm normalize, 50mm translate; all pinned). It is a control-point-cloud Hausdorff (approx of true surface Hausdorff -- uses the B-rep CARTESIAN_POINT net, not tessellated surface samples; for exact, tessellate via the kernel). Reports bidirectional Hausdorff (mm) + mean Chamfer (mm) + % of file-A bbox diagonal -- the MEANINGFUL shape gate the count-Jaccard is not.
LIVE-VALIDATED on real data (R15):
```
blisk.stp vs blisk.stp (self)        -> 0.000mm / 0.00%  (sanity: 48956 pts, sampled 3766)
blisk.stp vs blisk-replica.step      -> Hausdorff 152.00mm (8.76% of 1734.7mm diag),
                                        mean Chamfer 21.37mm (1.23% of diag)  [replica inch, auto-normalized]
```
HONEST READ of the replica accuracy: the parametric replica reconstructs the real turbine blisk's surface to **~1.2% mean / ~8.8% worst-case** shape deviation (worst-case localized at blade extremes where a parametric NACA section diverges from the proprietary NURBS airfoil). This is the quantified meaning of "accurate but not byte-identical": gross form + envelope match exactly (bbox 0.000%), average surface within ~1.2%, with bounded localized divergence on the proprietary aero surfaces -- NOT 0.000% surface identity (which is re-import). This is the closest honest, numeric "accuracy of a generated complex part" measurement the system can produce by regeneration.

## KNOWN COMPARE() DEFECTS (must fix before volume/bbox gate is trustworthy)
1. **VOLUME = bbox proxy -- RESOLVED (U-CAD-VOLUME-METRIC, 2026-06-10).** The "451.5M mm^3" was NOT impossible/over-summing: it is exactly the bounding-BOX volume (1206.9 x 1206.9 x 310), correctly computed but MISLABELED as solid volume (the disk+blades fill only a fraction of the box). FIX: `extractMetrics` now tags `volumeMethod` ("bbox-proxy" for STEP/IGES, "mesh" for STL signed-tet, "none" for 2D) + emits a proxy parseWarning; `compare()` annotates the Volume metric with its method and marks it ADVISORY (never false-fails) when the two files' methods differ (bbox-proxy vs mesh is apples-to-oranges). True solid volume still needs kernel tessellation (future `volumeMethod:"solid"`); until then gate on bbox + topology + surface-Hausdorff, with Volume advisory-aware. 5 tests + 33 regression green.
2. **No unit normalization** -- compare() compares raw numbers; a candidate exported in INCH vs a mm reference yields a 25.4x-confounded delta. Resolve+normalize STEP units before delta. Ties to UNITS-FIRST safety rail. (follow-up: U-CAD-COMPARE-UNIT-NORMALIZE)
3. ~~Live bridge port 18360 vs 18361~~ -- **NOT A DEFECT (investigated 2026-06-10, R8/R12 correction).** These are TWO distinct, intentionally-separate add-ins/ports, not a misconfiguration: `:18360` = `prism_api_server.py` add-in (consumed by `Fusion360LiveBridgeEngine` + `AutoProgramOrchestratorEngine`, 17 routes); `:18361` = `PRISMBridge.py` / CAM add-in (the one driven live for the blisk this session). Per `mcp-server/src/engines/cad-fusion-live/MEMORY.md`: ports are assigned per Fusion instance (`:18361` CAM, `:18362` CAD, `:18360` prism-api-server) to prevent conflicts. Changing 18360->18361 would BREAK the prism-api-server consumers. No reconcile needed; the earlier "reconcile" note was a misread of two coexisting bridges.

## WORKED EXAMPLE -- blisk.stp parametric spec (INGEST+PARAMETERIZE done)
units mm; bbox 1206.9 x 1206.9 x 310 (Z -182.5..+127.5, asymmetric hub boss);
**48 blades** (DFT k=48, pitch 7.5deg, conf 0.9); bore Ø300 (r150 exact cylinder);
disk-rim Ø~730 (root r~365); tip Ø~1209 (r604.7); blade radial span ~240mm;
disk/rim thickness ~120mm (Z -42.5..+77.5); 10 toroidal fillets (blade-root ~2.5-5mm).
Volume reported 451.5M mm^3 (UNRELIABLE, see defect 1). 328 B_SPLINE_SURFACE = blade aero
(NOT scalar-recoverable -> approximate airfoil with parametric NACA section; honest ceiling).

## WORKED EXAMPLE RESULT (GENERATE + COMPARE run, 2026-06-10)
Built a 48-blade replica live (fresh doc PRISM_BLISK_REPLICA): revolved hub (bore Ø300,
boss spanning Z310, rim flare to r365) + 5-section NACA-0010 airfoil blade lofted r355->603.45mm
+ 48x circular pattern + JOIN -> ONE watertight solid, 104 faces, **48 NURBS blade surfaces**,
1 MANIFOLD_SOLID_BREP. Exported blisk-replica.step (6.4 MB, B_SPLINE_SURFACE=48).
**Form match vs blisk.stp: EXACT bbox.** In-kernel bbox = 1206.9 x 1206.9 x 310 mm (= blisk.stp
exactly); blade count 48 = blisk.stp. CONFIRMED dimensionally faithful.
**compare() reported FALSE failure (overallPassed=false, passRate 0.25)** -- proves defects 1+2:
  - bbox metric showed 96% delta because the replica STEP exported in INCH (CONVERSION_BASED_UNIT
    'inch') while blisk.stp is mm; extractMetrics read replica bbox [47.52,47.52,12.2] (inch) vs
    ref [1206.9,1206.9,310] (mm). 47.52 in * 25.4 = 1206.9 mm EXACT -> the geometry matches; the
    COMPARATOR is unit-blind (defect 2, CONFIRMED with numbers). Fix = normalize units pre-delta
    OR force mm export -> then bbox PASSES.
  - volume metric meaningless (defect 1 + unit confound).
  - Topology delta 20.5% (Jaccard ~0.795); Feature-count PASSED.
LESSON: the replica is correct; the FAILURE was the comparator, not the geometry. This is why
the Stage-6 CORRECT loop cannot be trusted to auto-converge until defects 1+2 are fixed -- a
broken COMPARE would "correct" a already-correct part toward noise. FIX COMPARE FIRST.

See [[reference_delta_closed_loop_replication_methodology_2026_06_10]] · [[reference_delta_live_fusion_nurbs_emit_proven_2026_06_10]].

## GENERALIZATION -- second reference part (Impeller turbine.stp, 2026-06-10)
The methodology is not blisk-specific. `Impeller turbine.stp` (3.03 MB, mm) characterizes as the
SAME closed-loop class as blisk: an axisymmetric rotor (square in X/Z = Ø290.3 mm, axial Y = 762.9 mm
-> axis-of-revolution = Y, vs blisk's Z) whose curved geometry is **free-form-blade-dominated**
(485 faces; **405 B_SPLINE_SURFACE** vane surfaces; 25 cylindrical + 1 conical hub; 110 planar;
25,120 CARTESIAN_POINT; 1 MANIFOLD_SOLID_BREP). Measured via `extractMetrics` (engine, not estimate).

Comparison of the two proven turbine-class reference parts:

| metric            | blisk.stp            | Impeller turbine.stp |
|-------------------|----------------------|----------------------|
| bbox (mm)         | 1206.9 x 1206.9 x 310| 290.3 x 762.9 x 290.3|
| axis of revolution| Z                    | Y                    |
| faces             | 223                  | 485                  |
| B_SPLINE_SURFACE  | 328 (48 blades)      | 405 (vanes)          |
| CARTESIAN_POINT   | 48,956               | 25,120               |
| solids            | 1                    | 1                    |

**Finding:** both parts share the convergence profile proved on blisk -- the hub/dimensional
envelope is primitive-family tractable (revolve + pattern -> in-kernel bbox converges to 0.000%),
while the free-form blade/vane surfaces carry the same surface-fidelity ceiling (the ~1.23% mean /
8.76% worst Hausdorff class) and require data-fit section lofting (not generic NACA) to drive
surface Hausdorff below ~1%. A live primitive-family regen of the impeller would re-demonstrate the
blisk result at higher cost, not a new "100%". The closed-loop CAPABILITY is therefore proven to
generalize across the turbine-class corpus; literal byte/surface-100% on either part's proprietary
NURBS remains re-import (a copy), not regeneration -- held honestly.

VALIDATION: `CADGeometryComparisonEngine.reference-parts.test.ts` (3/3 green) pins both parts'
MEASURED fingerprints + cross-part anti-hardcode distinctness (a constant-returning extractor fails
the distinctness block). This is the INGEST-stage regression guard for the whole CAD-FILES corpus.

See [[reference_delta_impeller_second_reference_part_2026_06_10]].

## CANONICAL VALIDATED FIDELITY (real pair, committed engine, 2026-06-10) -- supersedes earlier estimates
End-to-end `computeSurfaceHausdorff(blisk.stp, blisk-replica.step)` through the COMMITTED engine
(unit-normalized: ref mm, replica INCH -> 25.4x rail engaged; sampleCap 2500; 48,956 vs 60,048
control points; bbox diagonal 1734.7 mm):

| accuracy axis            | value          | % of 1734.7 mm diagonal |
|--------------------------|----------------|-------------------------|
| dimensional (bbox)       | 0.000 mm       | **0.000%** (exact)      |
| surface mean (chamfer)   | 26.9 mm        | **1.551%**              |
| surface worst (Hausdorff)| 88.3 mm        | **5.087%**              |

These are the AUTHORITATIVE measured numbers (supersede the prior ~1.23%/8.76% session estimate --
that pre-dated the committed unit-normalization + the canonical sampleCap). The residual lives in
the free-form blade aero surfaces (generic NACA section vs the real B-splines); driving it lower
needs data-fit section lofting from the real B_SPLINE_SURFACE control net, not a tighter primitive.
Literal 0.000% surface = re-importing the real control net (a copy), NOT regeneration.

VALIDATION: `CADGeometryComparisonEngine.hausdorff.test.ts` -> "E2E on the real blisk regeneration
pair" (9/9 green) pins these bands + the mm-vs-inch normalization; a units regression (~25.4x) blows
past the <8% band and fails loud.
