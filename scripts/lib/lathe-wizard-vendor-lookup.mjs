// Lathe wizard vendor-lookup — implements U-LATHE-WIZARD-VENDOR-LOOKUP
// Design memo: reference_lathe_wizard_vendor_lookup_design_2026_05_27
// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
//
// selectInsert(spec) — given (iso_group, operation, material, customer, ...),
// pull candidates from queryEngine, score them per the 7-component rubric,
// return primary + alternates + rationale + confidence.

const REQUIRED_SPEC_FIELDS = ["iso_group", "operation"];
const MIN_ACCEPT_SCORE = 50;
const TARGET_CONFIDENCE = 70;

const GEOMETRY_FIT_BY_OPERATION = {
  roughing: { C: 20, W: 20, S: 18, D: 12, T: 14, V: 8, R: 16, K: 12 },
  finishing: { D: 20, V: 20, C: 16, S: 8, T: 14, W: 8, R: 8, K: 10 },
  grooving: { K: 20, R: 18, S: 12, C: 8 },
  threading: { V: 20, D: 16, T: 14, C: 8 },
  parting: { K: 18, R: 16, S: 14 },
  boring: { C: 16, D: 16, S: 14, V: 14 },
  drilling: { R: 14 },
  facing: { C: 18, D: 14, S: 16, T: 12 }
};

function scoreIsoGroupFit(grade, spec) {
  const letter = String(spec.iso_group).trim()[0].toUpperCase();
  const subGroup = String(spec.iso_group).toUpperCase();
  for (const fit of grade.iso_group_fit || []) {
    if (fit === subGroup) return 30; // exact P-30 → P-30
    if (fit.startsWith(letter)) return 22; // P-25 vs P-30 (cross-grade same letter)
  }
  // cross-letter (e.g. P-grade for an M job) — partial
  return 0;
}

function scoreGeometryOperationFit(grade, spec) {
  const table = GEOMETRY_FIT_BY_OPERATION[spec.operation];
  if (!table) return 5; // unknown operation; small floor
  return table[grade.geometry] ?? 0;
}

function scoreVendorInventoryBias(grade, customer, bridge) {
  if (!bridge || !customer) return 0;
  try {
    // Look up any T-number for this customer; if vendor matches, +15
    const sample = bridge.resolve({ customer, toolNumber: "T0101", controller: "fanuc" });
    if (sample.vendor === grade.vendor) return 15;
  } catch {
    // no inventory entry; neutral
  }
  return 0;
}

function scoreCoatingMaterialFit(grade, spec) {
  const isoLetter = String(spec.iso_group).trim()[0].toUpperCase();
  if (grade.coating === "PVD-TiAlN" && (isoLetter === "P" || isoLetter === "M")) return 10;
  if (grade.coating === null && isoLetter === "N") return 10; // uncoated for aluminum
  if (grade.coating === null && isoLetter === "H") return 8; // uncoated CBN for hard turning
  if (grade.coating === "CVD-Al2O3") return 7;
  return 5;
}

function scoreCostLifeRatio(grade) {
  // Cost data not in current corpus; proxy via life-per-min ceiling (longer life = better ratio)
  const life = grade.lifeMinutesAtTargetVc || 0;
  if (life >= 25) return 10;
  if (life >= 18) return 8;
  if (life >= 12) return 5;
  return 2;
}

function scoreSurfaceFinishMatch(grade, spec) {
  // Spec may carry surface_finish_target (Ra µm); not present in test spec yet.
  // Default: finishing geometry (V/D + wiper) wins; roughing gets baseline.
  if (spec.operation === "finishing") {
    if (grade.best_application && /finish/i.test(grade.best_application)) return 10;
    if (grade.geometry === "V" || grade.geometry === "D") return 7;
    return 3;
  }
  return 5;
}

function scoreRecencyInCorpus(grade, queryEngine) {
  // Probe: query corpus for the grade's name; if it surfaces, +5
  try {
    const r = queryEngine.query({ topic: grade.grade, top_k: 3 });
    if (r.hits.some(h => h.vendor_grade_payload?.grade === grade.grade)) return 5;
  } catch {
    // engine failure → neutral
  }
  return 0;
}

function scoreCandidate(grade, spec, customer, bridge, queryEngine) {
  const breakdown = {
    iso_group_fit: scoreIsoGroupFit(grade, spec),
    geometry_operation_fit: scoreGeometryOperationFit(grade, spec),
    vendor_inventory_bias: scoreVendorInventoryBias(grade, customer, bridge),
    coating_material_fit: scoreCoatingMaterialFit(grade, spec),
    cost_life_ratio: scoreCostLifeRatio(grade),
    surface_finish_match: scoreSurfaceFinishMatch(grade, spec),
    recency_in_corpus: scoreRecencyInCorpus(grade, queryEngine)
  };
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { breakdown, total };
}

function explainScore(grade, scored, spec) {
  const parts = [];
  const b = scored.breakdown;
  parts.push(`Selected ${grade.vendor} ${grade.grade} (${grade.insertAnsi || grade.geometry}) for ${spec.operation} on ISO ${spec.iso_group}.`);
  if (b.iso_group_fit >= 22) parts.push(`Strong ISO fit (${b.iso_group_fit}/30).`);
  if (b.geometry_operation_fit >= 14) parts.push(`Geometry ${grade.geometry} matches ${spec.operation} (${b.geometry_operation_fit}/20).`);
  if (b.vendor_inventory_bias === 15) parts.push("In customer's existing tool inventory (+15).");
  if (b.coating_material_fit >= 8) parts.push(`Coating ${grade.coating || "uncoated"} fits material (${b.coating_material_fit}/10).`);
  if (b.cost_life_ratio >= 8) parts.push(`High life-per-cycle (${grade.lifeMinutesAtTargetVc} min).`);
  return parts.join(" ");
}

export function createInsertSelector({ queryEngine, bridge } = {}) {
  if (!queryEngine || typeof queryEngine.query !== "function") {
    throw new Error("createInsertSelector: queryEngine with .query() required");
  }

  function selectInsert(spec) {
    if (!spec || typeof spec !== "object") {
      throw new Error("selectInsert: spec must be an object");
    }
    for (const k of REQUIRED_SPEC_FIELDS) {
      if (!spec[k]) throw new Error(`selectInsert: missing required spec field '${k}'`);
    }

    // Pull all candidates matching hard constraints
    const candidateHits = queryEngine.query({
      iso_group: spec.iso_group,
      operation: spec.operation,
      top_k: 50  // get broad candidate set; score function decides
    });

    // Map hits → vendor_grade objects with full payload
    const candidates = candidateHits.hits
      .filter(h => h.kind === "vendor_grade")
      .map(h => h.vendor_grade_payload);

    if (candidates.length === 0) {
      throw new Error(`selectInsert: no candidate scored — no grades in corpus match ISO ${spec.iso_group} + operation ${spec.operation}. operator confirmation needed.`);
    }

    // Score every candidate
    const scored = candidates
      .map(g => ({
        grade: { ...g, geometry: g.geometry, lifeMinutesAtTargetVc: g.life_minutes_at_target_vc, suggestedVcSfm: g.suggested_vc_sfm, suggestedFzIpr: g.suggested_fz_ipr, iso_group_fit: g.iso_group_fit, best_application: g.best_application, insertAnsi: g.ansi },
        scored: scoreCandidate(
          { ...g, geometry: g.geometry, lifeMinutesAtTargetVc: g.life_minutes_at_target_vc, iso_group_fit: g.iso_group_fit, best_application: g.best_application },
          spec, spec.customer, bridge, queryEngine
        )
      }))
      .sort((a, b) => b.scored.total - a.scored.total);

    const primary = scored[0];

    if (primary.scored.total < MIN_ACCEPT_SCORE) {
      throw new Error(
        `selectInsert: no candidate scored ≥ ${MIN_ACCEPT_SCORE}/100 — operator confirmation needed. ` +
        `Top candidate: ${primary.grade.vendor} ${primary.grade.grade} at ${primary.scored.total}/100.`
      );
    }

    const alternates = scored.slice(1, 4).map(s => ({
      vendor: s.grade.vendor,
      grade: s.grade.grade,
      score: s.scored.total,
      breakdown: s.scored.breakdown
    }));

    return {
      primary: primary.grade,
      alternates,
      rationale: explainScore(primary.grade, primary.scored, spec),
      confidence: primary.scored.total / 100,
      score_breakdown: primary.scored.breakdown,
      low_confidence: primary.scored.total < TARGET_CONFIDENCE
    };
  }

  return { selectInsert };
}
