// scripts/lib/cad-approach-knowledge.mjs
//
// CAD auto-firing "approach knowledge" -- slot:zulu 2026-06-29 (for delta).
//
// The sixth (final) clone of the proven task x machine x tooling auto-firing pattern
// (lathe / mill / post / wedm / cam siblings). When the CAD wizard reads a print and
// decides HOW to approach geometry generation, this surfaces the SPECIFIC verified
// gate(s) for the CAD operation(s) named -- conditioned on the unit system (the
// 25.4x-scale axis).
//
// SOURCING (R12 -- no fabrication): every gate is cloned VERBATIM from delta's OWN
// verified source -- the 5 cited KNOWN FAILURES in .claude/hooks/delta-cad-awareness-inject.mjs
// (each backed by a delta reference memory) + the CollisionDetectionEngine SAFETY
// engine + the canonical UNITS-FIRST rail. No physics/ISO286 constant is inlined --
// the gates NAME the rule + point at the reference memory / engine.
//
// Karpathy 5-step: CLASSIFY pure data+select lib; TECHNIQUE frozen maps + set
// membership; EDGE null/empty/non-array ctx; FAILURE never throws; WRITE from line 1.

// ---- operation taxonomy (the CAD operations the wizard encounters) ----
export const CAD_OPERATIONS = Object.freeze([
  "step_parse",          // read/parse a STEP/IGES source
  "archetype_replicate", // match an archetype + replicate at target dims
  "electrode_gen",       // sinker-EDM electrode generation
  "feature_recognize",   // feature recognition
  "tolerance_apply",     // apply GD&T / fits
  "bspline_emit",        // emit B-spline / surface geometry to STEP
  "assembly_analyze",    // assembly / collision analysis
]);

// ---- CAD seats (light conditioning axis; mostly documentary) ----
export const CAD_SEATS = Object.freeze([
  Object.freeze({ id: "fusion",    aliases: ["fusion", "fusion 360", "f360"] }),
  Object.freeze({ id: "hypercad",  aliases: ["hypercad", "hypermill", "open mind"] }),
  Object.freeze({ id: "mastercam", aliases: ["mastercam", "mcam"] }),
  Object.freeze({ id: "freecad",   aliases: ["freecad"] }),
  Object.freeze({ id: "cadquery",  aliases: ["cadquery", "cqask"] }),
]);

const SEAT_IDS = Object.freeze(CAD_SEATS.map((c) => c.id));

// ---- the verified gate map (each gate cites its delta-hook / engine source) ----
const GATES = Object.freeze({
  units_inch_step: {
    id: "units_inch_step",
    rule: "STEP units are INCH (CONVERSION_BASED_UNIT 25.4mm) at JM, NOT mm -- resolve from the source before any geometry; a mismatch is a 25.4x scale error (verify per part)",
    enforcedBy: "scripts/lib/units-guard.mjs (requireUnits/assertUnitsMatch)",
    cite: "delta-cad-awareness-inject KNOWN FAILURE 2 + reference_delta_step_inch_unit_convention",
    ops: ["step_parse", "archetype_replicate", "electrode_gen", "bspline_emit", "tolerance_apply", "feature_recognize", "assembly_analyze"],
    confidence: "verified",
  },
  archetype_match_before_scale: {
    id: "archetype_match_before_scale",
    rule: "MATCH the archetype topology BEFORE scaling -- scaling a single-section reference to a two-section target is wrong topology (match first, then scale)",
    enforcedBy: "CAD archetype replication path",
    cite: "delta-cad-awareness-inject KNOWN FAILURE 1 + reference_delta_archetype_match_before_scale",
    ops: ["archetype_replicate"],
    confidence: "verified",
  },
  no_malformed_periodic_bspline: {
    id: "no_malformed_periodic_bspline",
    rule: "NEVER emit a malformed periodic B-spline (it produces a silent Fusion blank doc) -- use the proven multi-prism STEP emitter",
    enforcedBy: "proven multi-prism STEP emitter",
    cite: "delta-cad-awareness-inject KNOWN FAILURE 3 + reference_delta_bspline_periodic_regression + reference_delta_proven_step_emitter",
    ops: ["bspline_emit", "electrode_gen"],
    confidence: "verified",
  },
  topology_before_tolerance: {
    id: "topology_before_tolerance",
    rule: "Resolve TOPOLOGY before TOLERANCE; NEVER inline ISO286 fits (pull the fit from the canonical source)",
    enforcedBy: "delta tolerance path",
    cite: "delta-cad-awareness-inject KNOWN FAILURE 4 + feedback_delta_topology_before_tolerance + feedback_delta_no_inline_iso286",
    ops: ["tolerance_apply", "feature_recognize"],
    confidence: "verified",
  },
  sinker_edm_spark_gap: {
    id: "sinker_edm_spark_gap",
    rule: "Sinker-EDM electrode spark gap = -.003in total (-.0015/side) -- bake it INTO the geometry (only for a true sinker-EDM electrode, not a plain part)",
    enforcedBy: "CAD electrode-gen path",
    cite: "delta-cad-awareness-inject KNOWN FAILURE 5 + reference_delta_jm_spark_gap_convention",
    ops: ["electrode_gen"],
    confidence: "verified",
  },
  collision_safety_assembly: {
    id: "collision_safety_assembly",
    rule: "Assembly clearance is SAFETY-gated -- run CollisionDetectionEngine before relying on an assembly fit",
    enforcedBy: "CollisionDetectionEngine (SAFETY)",
    cite: "delta-cad-awareness-inject TOP CAD ENGINES (CollisionDetectionEngine SAFETY)",
    ops: ["assembly_analyze"],
    confidence: "verified",
  },
  // ---- delta corpus-mined geometry gates (slot:zulu 2026-07-01, cited+spot-verified) ----
  trilobe_polar_profile: {
    id: "trilobe_polar_profile",
    rule: "A trilobe/taptite section is the polar curve r(theta)=R_base+A*cos(3*theta) with R_base=(C+E)/4 (base radius) and A=(C-E)/4 (lobe amplitude), C=major/crest dia, E=minor/valley dia; require C>E; helical leads rotate the section theta_offset(z)=2*pi*z/lead -- generate the form from this law, do NOT hand-approximate lobes",
    enforcedBy: "TrilobeElectrodeGeometryEngine (calculateTrilobeProfile/getProfile; inch-native at JM)",
    cite: "TrilobeElectrodeGeometryEngine.ts:17-19,193-207 (reverse-engineered from JM Automated Program_Corrected 5-25.xlsm)",
    ops: ["bspline_emit", "electrode_gen"],
    confidence: "verified",
  },
  electrode_stage_stock_handoff: {
    id: "electrode_stage_stock_handoff",
    rule: "In a multi-electrode sinker set, each stage leaves the next exactly stock_for_next = gap[i]-gap[i+1] radially (final stage leaves 0); a rougher WIDER-gap electrode cuts a wider cavity so the finer stage has metal to remove -- do NOT size every stage to the same nominal (finish stage would have nothing to cut / rough would overcut the wall)",
    enforcedBy: "SinkerEDMElectrodeGeometryEngine (plan -> stock_for_next_stage_mm)",
    cite: "SinkerEDMElectrodeGeometryEngine.ts:196,243 (rests on EDM_PHYSICS.sinker_spark_gap gap ordering, constants.ts:724)",
    ops: ["electrode_gen"],
    confidence: "verified",
  },
  electrode_finish_orbit_closed_cavity: {
    id: "electrode_finish_orbit_closed_cavity",
    rule: "On a CLOSED (non-through) cavity a semi/finish electrode must walk a small planetary orbit to sweep the corners the wider-gap rough electrode left short; a straight single die-sink plunge cannot reach them. Disable orbit for through/open features (straight plunge). Orbit magnitude scales with the pass spark gap",
    enforcedBy: "SinkerEDMElectrodeGeometryEngine (plan -> orbit_radius_mm)",
    cite: "SinkerEDMElectrodeGeometryEngine.ts:23,205,242 (orbit_radius = max(undersize_per_side, floor) for semi/finish)",
    ops: ["electrode_gen"],
    confidence: "verified",
  },
  // ---- delta pass-2 corpus-mined comparison-verification gates (slot:zulu 2026-07-01, cited+spot-verified) ----
  regen_volume_is_bbox_proxy: {
    id: "regen_volume_is_bbox_proxy",
    rule: "When VERIFYING a regenerated part vs its reference, the STEP/IGES volume is the BOUNDING-BOX volume, NOT true solid B-rep volume (a solid fills only a fraction of its bbox) -- the metric is volumeMethod-tagged (bbox-proxy STEP/IGES, mesh STL, none 2D); a proxy-vs-mesh volume delta is apples-to-oranges and is ADVISORY (never gates). Accept/reject on bbox-delta + topology-Jaccard, do NOT fail a part on a raw or method-mismatched volume delta",
    enforcedBy: "CADGeometryComparisonEngine (extractMetrics volumeMethod tag; compare() method-mismatch ADVISORY branch)",
    cite: "CADGeometryComparisonEngine.ts:69-71,514-517,538,1090-1108 (+ test CADGeometryComparisonEngine.test.ts:49-54)",
    ops: ["step_parse", "archetype_replicate"],
    confidence: "verified",
  },
  shape_fidelity_hausdorff_not_jaccard: {
    id: "shape_fidelity_hausdorff_not_jaccard",
    rule: "Topology count-Jaccard (min/max over entity-type counts) proves entity-COUNT parity, NOT SHAPE match -- identical CARTESIAN_POINT counts can be different shapes. The meaningful shape gate is the bidirectional control-point-cloud Hausdorff = max(directed(A,B),directed(B,A)), reported in mm and as % of file-A bbox diagonal (size-normalized); it APPROXIMATES surface Hausdorff (walks the B-rep control net, tessellate for exact). Run the Hausdorff shape gate to verify a replicated archetype -- do NOT rely on Jaccard alone",
    enforcedBy: "CADGeometryComparisonEngine (computeSurfaceHausdorff / hausdorffPointClouds; deterministic, no RNG)",
    cite: "CADGeometryComparisonEngine.ts:116-121,143-182,626-669 (Jaccard-is-count-only at 1192-1210)",
    ops: ["archetype_replicate", "step_parse"],
    confidence: "verified",
  },
  compare_unit_normalize_both_files: {
    id: "compare_unit_normalize_both_files",
    rule: "A regen-vs-reference comparison is unit-blind by default -> a 25.4x-confounded delta if one file is inch-authored and the other mm. Resolve each file's length unit to an mm scale and normalize ALL coords (bbox, point-cloud, Hausdorff) before comparing. An inch model STILL carries SI_UNIT(.MILLI.,.METRE.) (the BASE of its inch CONVERSION_BASED_UNIT) -- so test the length-conversion NAME (INCH/FOOT, not DEGREE/RADIAN) BEFORE the SI prefix or the inch file is mis-read as mm (comparison-layer sibling of units_inch_step)",
    enforcedBy: "CADGeometryComparisonEngine (detectStepLengthScaleToMm; normalizes bbox/point-cloud/Hausdorff to mm)",
    cite: "CADGeometryComparisonEngine.ts:501-510,672-690 (+ test CADGeometryComparisonEngine.test.ts:58-62)",
    ops: ["step_parse", "archetype_replicate"],
    confidence: "verified",
  },
  // ---- delta pass-3 corpus-mined primitive/diff gates (slot:zulu 2026-07-01, cited+verify-arm PASS) ----
  primitive_form_recognition_signature: {
    id: "primitive_form_recognition_signature",
    rule: "Recognize a B-Rep body's primitive FORM from Euler-topology counts + closed-form volume/area, never a guessed name: box iff faces=6,edges=12,verts=8 AND vol=Lx*Ly*Lz; cylinder iff faces=3 AND two bbox dims equal=D AND vol=pi*(D/2)^2*L; sphere iff faces=1 AND all bbox dims equal=D AND vol=(4/3)*pi*(D/2)^3; on signature mismatch return form=unknown/revolved_noncylindrical/single_face_solid -- NEVER fall back to a guessed functional name (enforces delta's refuse-silent-feature-recognition-fallback)",
    enforcedBy: "cad-fusion-primitive-recognize.mjs (recognizePrimitive)",
    cite: "H:/prism-slot-delta/scripts/lib/cad-fusion-primitive-recognize.mjs:11-14,69-94 (+ test cad-fusion-primitive-recognize.test.mjs:46-48,61,66,77-79,85-86)",
    ops: ["feature_recognize", "step_parse"],
    confidence: "verified",
  },
  multibody_diff_never_fake_full_match: {
    id: "multibody_diff_never_fake_full_match",
    rule: "Comparing two independently-generated multi-body models (order not guaranteed): pair bodies by nearest geometric-signature distance (topology-count delta + normalized volume) BEFORE comparing, and declare verdict=match ONLY when every check is available AND passed; a body-count/topology miss => diverged; any unavailable metric caps the result at converging even if all available checks pass -- coverage<100% must NEVER be reported as a full match",
    enforcedBy: "cad-fusion-geom-diff.mjs (diffModels/matchBodies/bodySignatureDistance)",
    cite: "H:/prism-slot-delta/scripts/lib/cad-fusion-geom-diff.mjs:59-65,69-86,150-168",
    ops: ["assembly_analyze", "archetype_replicate"],
    confidence: "verified",
  },
});

// Pre-index ops -> gate ids (cheap lookup, frozen).
const OPS_TO_GATES = (() => {
  const m = {};
  for (const op of CAD_OPERATIONS) m[op] = [];
  for (const g of Object.values(GATES)) {
    for (const op of g.ops) if (m[op]) m[op].push(g.id);
  }
  return Object.freeze(m);
})();

// ---- helpers ----
function isStr(s) { return typeof s === "string" && s.length > 0; }

export function resolveCaps(seats) {
  const caps = new Set();
  if (!Array.isArray(seats)) return caps;
  for (const raw of seats) {
    if (!isStr(raw)) continue;
    const s = raw.toLowerCase();
    for (const c of CAD_SEATS) {
      if (c.aliases.some((a) => s.includes(a))) caps.add(c.id);
    }
  }
  return caps;
}

// ---- the firing entry point ----
// ctx: { operations: string[], seats?: string[] }
// Returns { operations:[{operation, gates:[...]}], seats:[...], summary }.
// Defensive: never throws on null/non-object/garbage ctx (lathe-sibling lesson).
export function fireForApproach(ctx) {
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const rawOps = Array.isArray(c.operations) ? c.operations : [];
  const caps = resolveCaps(c.seats);
  const seats = SEAT_IDS.filter((id) => caps.has(id));

  const ops = [];
  for (const op of rawOps) {
    if (!isStr(op) || !OPS_TO_GATES[op]) continue;
    const gates = OPS_TO_GATES[op]
      .map((id) => GATES[id])
      .map((g) => ({ id: g.id, rule: g.rule, enforcedBy: g.enforcedBy, cite: g.cite }));
    ops.push({ operation: op, gates });
  }

  const summary = `${ops.length} CAD operation(s); seats: ${seats.join("/") || "unspecified"}`;
  return { operations: ops, seats, caps: [...caps], summary };
}

// UNVERIFIED gaps -- the cad verify-backlog: real, CITED items the delta specialist must
// confirm before any becomes a fired gate. Sourced from reference_cad_vault_enrichment_2026_06_29
// (its cited gap list + UNVERIFIED tips 14/15 + the "Delta MUST verify" queue). NOT fired;
// surfaced by the six-domain autofire coverage worklist (parity with CAM/WEDM/MILL_UNVERIFIED_GAPS).
// Safety rail: nothing here drives a gate until the specialist verifies vs the cited source.
export const CAD_UNVERIFIED_GAPS = Object.freeze([
  "Tolerance stack-up closed-form (MMC bonus-tolerance math, DOF-per-datum, worst-case/statistical formulas) absent from confirmed surfaces (reference_cad_vault_enrichment_2026_06_29 gap#2; cad-foundations.md sec7) -- source ASME Y14.5-2018 normative text",
  "Electrode design geometry (overburn/spark-gap offset, corner radius, taper, graphite-vs-copper) on NO confirmed surface -- electrode nominal != cavity nominal (reference_cad_vault_enrichment_2026_06_29 gap#3/tip14; EDM vendor docs + JM DIE)",
  "Trilobe form MEASUREMENT + gauging still uncovered (the GENERATION law is now the fired trilobe_polar_profile gate: r=R_base+A*cos(3*theta), TrilobeElectrodeGeometryEngine.ts:193-207): form-tolerance measurement + gauging of a non-round lobe profile has no confirmed coverage (reference_cad_vault_enrichment_2026_06_29 gap#4/tip15; JM DIE die programs + form-gauging standards)",
  "Feature-recognition -> DFM concrete rule tables (min wall, undercut, EDM accessibility) absent; DFMAwareGenerationEngine is a concept node only (reference_cad_vault_enrichment_2026_06_29 gap#9; Boothroyd-Knight DFMA + BRepGAT)",
  "CATIA/Creo/AutoCAD add-in bridges exist (CATIACAAV5/CreoToolkit/AutoCADDotNet) but NO confirmed integration test results (reference_cad_vault_enrichment_2026_06_29 gap#10)",
  "AP242 numeric specifics (AIM/Domain-Model schema, ISO GPS vs ASME zone values) structurally confirmed but numerically owner-gated (reference_cad_vault_enrichment_2026_06_29 gap#1; _staging/deep-domain-research-2026-06-09.md; ISO 10303-242)",
  "Live closed-loop CAD corrections are NOT persisted to training data -- the loop does not 'learn' until the persistence thread closes (reference_cad_vault_enrichment_2026_06_29 gap#5/tip12; cad_synthesis.md)",
  "cad artifact gate flips PENDING->SHIPPED on file EXISTENCE not validation (R12) (reference_cad_vault_enrichment_2026_06_29 gap#7/tip11; cad_synthesis.md)",
  "EDM electrode undersize = spark gap + overcut + WEAR allowance (~0.05-0.25mm/side, param-dependent) -- the wear term is commonly omitted -> undersized cavities; orbit from the FINAL compensated geometry (extends sinker_edm_spark_gap); verify wear magnitude vs JM EDM data before firing (external-source candidate: HERMES-EXTERNAL-KNOWLEDGE-INGESTION-ROADMAP-2026-06-29 sec CAD; Benedict Nontraditional Mfg Processes Ch6)",
  "Sinker spark-gap FIRED gate (GATES.sinker_edm_spark_gap) inlines a flat JM shop figure (-.003in total / -.0015in per side) that is regime- and material-blind: the canonical EDM_PHYSICS.sinker_spark_gap table (constants.ts:724) keys the lateral gap by {electrode-material, pass-regime} (finish<semi<rough; CuW<Cu<graphite) and a flat figure near rough/semi is ~50% too wide for a graphite FINISH pass; delta must reconcile the JM -.003in shop convention (reference_delta_jm_spark_gap_convention) vs the table and repoint the fired rule at the canonical constant before flipping it (SAFETY: electrode undersize = cavity size)",
  "Slot-vs-pocket feature classification uses planform aspect ratio (slot IFF bbox_length/bbox_width > threshold, else pocket) -- live heuristic in CADFeatureRecognitionEngine.ts:14,87 (POCKET_ASPECT_THRESHOLD=4) with NO external DFM/standards citation, and the label feeds CAM strategy; delta must verify the cutoff vs a source or the corpus prevalence learner before firing (extends the DFM-rule-table gap#4)",
  "EDM end-wear oversize dZ = (wear_ratio_pct/100)*cavity_depth*safety_factor with a per-material tip-wear-rate table + strategy thresholds (wear>40%/AR>5 -> 3-electrode stack; >20%/tol<0.02 -> rough+finish) is IMPLEMENTED (SinkerEDMWearCompensationEngine.ts:86-95,126-190) but every numeric lives INLINE in the engine, NOT constants.ts, and it sets electrode-oversize = cavity-accuracy (SAFETY: electrode length = cavity depth). Cited Klocke Mfg Processes 3 sec6.4 + GF Form 20/30 but not reconciled to constants.ts; delta moves the wear-rate table + safety_factor to a canonical constant + verifies magnitudes before firing. This is the concrete-formula half of the existing electrode-WEAR gap",
  "CADFeatureRecognitionEngine SILENTLY skips any hole/pocket/fillet/chamfer whose diameter/radius/offset/depth is non-finite or <= 0 (CADFeatureRecognitionEngine.ts:71,85,102,113 -- bare return, no diagnostic), so a malformed feature vanishes from the count with no warning and empty input degrades to confidence=0.4 (line 17,127). A degenerate feature that should FAIL LOUD instead disappears (R12); delta decides whether a dropped-feature diagnostic belongs in the result contract before any gate rests on the feature counts. Extends the slot-vs-pocket gap (same engine)",
  "STEP parse surfaces topology COUNTS (CLOSED_SHELL/OPEN_SHELL/MANIFOLD_SOLID_BREP/BREP_WITH_VOIDS at CADGeometryComparisonEngine.ts:224-239,498-499; face/solid=0 -> warning only at 529-534) + STEPGeometryParserEngine counts surface/edge/vertex (STEPGeometryParserEngine.ts:89-99), but NOTHING asserts a watertight manifold (closed_shell>0, no open_shell, non-degenerate) as a PASS/FAIL gate -- an open-shell/non-manifold/zero-face STEP emits a soft warning and still 'parses OK'. A CAD-kernel manifold check (Euler-Poincare V-E+F, shell orientation) has NO confirmed enforcing engine; delta sources/builds the manifold validity criterion before firing (candidate ISO 10303-42 topology schema; parse-side, distinct from the emit-side malformed-periodic-bspline gate)",
  "dim-fidelity bbox-measurability class: dimFidelity's orientation-invariant sorted-triple comparison (sort intended/measured dim arrays ascending, compare element-wise) is a distinct invariant from the fired shape_fidelity_hausdorff_not_jaccard gate, but correctness is conditioned on a per-archetype bboxMeasurable flag (planar solids=true; cylinder/plate=false because a circular extent is a CIRCLE entity extractMetrics under-measures) -- this classification is a heuristic per-archetype table, not a general law; delta confirms it generalizes before promoting to a GATE. cite=H:/prism/scripts/lib/cad-regen-fidelity-lib.mjs:92-109,120-130 (slot:zulu pass-3 2026-07-01, verify-arm PASS)",
  "GT triangulation confidence ladder: triangulateGT's 2-source program+CAD dimensional corroboration (greedy 1:1 intersection within relTol=>high; both-present-zero-overlap=>uncorroborated; single-source=>program-only/cad-only) is a real statistical-corroboration ladder, but the underlying CAD_CALLOUT_FLOOR_MM=1.0 fillet-exclusion + CAD_CLUSTER_REL_TOL/CAD_MATCH_REL_TOL=0.03/0.02 bands are numeric thresholds a specialist confirms vs real JM print/CAD pairs before any auto-fire (threshold-setting, safety carveout). cite=H:/prism/scripts/lib/cad-dimension-gt-lib.mjs:49-64,254-297 (slot:zulu pass-3 2026-07-01, verify-arm PASS)",
  "Datum Reference Frame precedence PRIMARY->SECONDARY->TERTIARY constrains the 6 DOF sequentially (primary arrests 3, secondary 2, tertiary 1), uniquely fixing the DRF for a position/profile callout -- distinct from the MMC bonus-tolerance stack-up gap (the tolerance VALUE, not the DOF-arrest hierarchy). external-source candidate: ASME Y14.5-2018 sec4.4 + sec7.3; class=categorical (DRF DOF-arrest sequence); delta confirms the DRF consumer before firing (slot:zulu phase-2-2B 2026-07-01)",
  "NURBS curve/surface lies within the CONVEX HULL of its control points + the basis functions satisfy partition-of-unity (sum=1), invariant under knot insertion + degree elevation -- an approximation-quality certification invariant distinct from the Hausdorff shape-fidelity gate (a metric, not a bounding guarantee). external-source candidate: Piegl & Tiller The NURBS Book 2e Ch2.2 + Ch5.2; class=numeric-threshold (hull-deviation <= tol); delta confirms the convex-hull check consumer before firing (slot:zulu phase-2-2B 2026-07-01)",
  "Parametric continuity class: G0 = positional (shared endpoint), G1 = tangent (colinear 1st derivatives), G2 = curvature (matched 2nd-derivative magnitude+direction) -- a surface-smoothness check distinct from the watertight/Euler-Poincare topology gate (which certifies CLOSURE, not smoothness); Class-A / flow surfaces require G2. external-source candidate: Mortenson Geometric Modeling 3e Ch5.3-5.4; class=categorical (continuity class); delta confirms the continuity consumer before firing (slot:zulu phase-2-2B 2026-07-01)",
  "ISO 2768-1 general-tolerance default: when a print's title block invokes ISO 2768-1:2019 general tolerances WITHOUT an explicit class letter, class 'm' (medium) is the common shop-default fallback per Table 1 -- but the applicable class must be RESOLVED FROM THE TITLE BLOCK first; 'm' is a shop convention, NOT a universal fallback the standard mandates, so never hardcode it. Distinct from topology_before_tolerance (fit/limit selection) and from the MMC stack-up gap (tolerance MATH). cite=ISO 2768-1:2019 Table 1; class=numeric-threshold (default class policy); delta confirms JM title-block convention before firing (soul-verified delta-cad wf_fab1690e-410, 2026-07-01)",
]);

// ---- detect CAD operations from a print/CAD-planning prompt ----
export function detectOperations(text) {
  if (!isStr(text)) return [];
  const t = text.toLowerCase();
  const found = new Set();
  if (/\bstep\b|\biges\b|parse.*(?:cad|model)|read.*(?:step|model)|\.stp\b/.test(t)) found.add("step_parse");
  if (/archetype|replicate|reproduce.*(?:at|dim)|scale.*(?:to|reference)/.test(t)) found.add("archetype_replicate");
  if (/electrode|sinker|\bedm\b.*electrode|burn.*detail/.test(t)) found.add("electrode_gen");
  if (/feature[\s-]?recogni|recognize.*feature|\bfrm\b/.test(t)) found.add("feature_recognize");
  if (/toleranc|\bgd&?t\b|\bfit\b|iso[\s-]?286|press[\s-]?fit|clearance[\s-]?fit/.test(t)) found.add("tolerance_apply");
  if (/b[\s-]?spline|nurbs|surface[\s-]?(?:emit|gen)|emit.*(?:step|geometry)|trilobe/.test(t)) found.add("bspline_emit");
  if (/assembl|mating|interference|collision.*(?:check|detect)/.test(t)) found.add("assembly_analyze");
  return [...found];
}

// for tests
export const _internals = { GATES, OPS_TO_GATES, SEAT_IDS };
