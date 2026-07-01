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
  "Trilobe / non-round lobe geometry + form-tolerance measurement + gauging: ZERO confirmed coverage -- any trilobe form rule cited today is fabrication risk (reference_cad_vault_enrichment_2026_06_29 gap#4/tip15; JM DIE die programs + form-gauging standards)",
  "Feature-recognition -> DFM concrete rule tables (min wall, undercut, EDM accessibility) absent; DFMAwareGenerationEngine is a concept node only (reference_cad_vault_enrichment_2026_06_29 gap#9; Boothroyd-Knight DFMA + BRepGAT)",
  "CATIA/Creo/AutoCAD add-in bridges exist (CATIACAAV5/CreoToolkit/AutoCADDotNet) but NO confirmed integration test results (reference_cad_vault_enrichment_2026_06_29 gap#10)",
  "AP242 numeric specifics (AIM/Domain-Model schema, ISO GPS vs ASME zone values) structurally confirmed but numerically owner-gated (reference_cad_vault_enrichment_2026_06_29 gap#1; _staging/deep-domain-research-2026-06-09.md; ISO 10303-242)",
  "Live closed-loop CAD corrections are NOT persisted to training data -- the loop does not 'learn' until the persistence thread closes (reference_cad_vault_enrichment_2026_06_29 gap#5/tip12; cad_synthesis.md)",
  "cad artifact gate flips PENDING->SHIPPED on file EXISTENCE not validation (R12) (reference_cad_vault_enrichment_2026_06_29 gap#7/tip11; cad_synthesis.md)",
  "EDM electrode undersize = spark gap + overcut + WEAR allowance (~0.05-0.25mm/side, param-dependent) -- the wear term is commonly omitted -> undersized cavities; orbit from the FINAL compensated geometry (extends sinker_edm_spark_gap); verify wear magnitude vs JM EDM data before firing (external-source candidate: HERMES-EXTERNAL-KNOWLEDGE-INGESTION-ROADMAP-2026-06-29 sec CAD; Benedict Nontraditional Mfg Processes Ch6)",
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
