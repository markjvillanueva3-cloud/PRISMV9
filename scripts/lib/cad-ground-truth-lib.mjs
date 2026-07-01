// scripts/lib/cad-ground-truth-lib.mjs
//
// U-TDP05 - CAD-derived Ground Truth (pure core).
//
// Converts STEP-geometry parse results into BlueprintExtraction-shape GT
// records for the U-TDP04 benchmark. CAD files give presence (not nominals)
// so emitted GT entries use presence_only: true.
//
// User insight: "you can also compare to cad files and cnc programs to
// determine if you extracted the correct data". This is the CAD half;
// CNC half is U-TDP06.
//
// PURE: no fs, no engine calls. CLI shell does the corpus walk.

export const CAD_FILENAME_HEURISTICS = Object.freeze([
  { token: "punch",    part_class: "extrude_punch" },
  { token: "die",      part_class: "die" },
  { token: "shaft",    part_class: "shaft" },
  { token: "bushing",  part_class: "bushing" },
  { token: "bracket",  part_class: "bracket" },
  { token: "casing",   part_class: "casing" },
  { token: "plate",    part_class: "plate" },
  { token: "valve",    part_class: "valve_body" },
  { token: "blisk",    part_class: "blisk" },
  { token: "impeller", part_class: "impeller" },
]);

export function evidenceForFeatureKinds(geom) {
  if (!geom || typeof geom !== "object") return [];
  const kinds = new Set();
  if (geom.has_cylindrical_holes === true || Number(geom.cylindrical_feature_count) > 0) {
    kinds.add("stepped_revolved_axis");
    if (Number(geom.cylindrical_feature_count) >= 2) {
      kinds.add("central_oil_hole");
    }
    if (Number(geom.cylindrical_feature_count) >= 3) {
      kinds.add("cross_drilled_relief_holes");
    }
  }
  if (geom.has_taper_or_chamfer === true || Number(geom.taper_count) > 0) {
    kinds.add("bevel_face_chamfer");
    if (Number(geom.taper_count) >= 2) {
      kinds.add("working_tip_taper");
    }
  }
  if (geom.has_fillets === true || Number(geom.fillet_count) > 0) {
    kinds.add("shoulder_fillet");
    if (Number(geom.fillet_count) >= 2) {
      kinds.add("blade_root_fillet");
    }
  }
  if (geom.has_freeform_surfaces === true || Number(geom.freeform_count) > 0) {
    kinds.add("leading_edge_fillet");
    kinds.add("trailing_edge_fillet");
  }
  return [...kinds];
}

export function inferPartClassFromCadPath(filePath, opts = {}) {
  const fallback = typeof opts.default === "string" && opts.default ? opts.default : "general";
  if (typeof filePath !== "string" || !filePath) return fallback;
  const lower = filePath.toLowerCase();
  for (const h of CAD_FILENAME_HEURISTICS) {
    if (lower.includes(h.token)) return h.part_class;
  }
  return fallback;
}

export function buildGtRecordFromStep(stepResult, opts = {}) {
  if (!stepResult || typeof stepResult !== "object" || typeof stepResult.file_path !== "string") return null;
  if (stepResult.parse_ok !== true) return null;
  const partClass = typeof opts.part_class === "string" && opts.part_class
    ? opts.part_class
    : inferPartClassFromCadPath(stepResult.file_path, { default: opts.partClassDefault });
  const kinds = evidenceForFeatureKinds(stepResult.geometry);
  if (kinds.length === 0) return null;
  return {
    pdf_path: stepResult.file_path,
    cad_source: stepResult.file_path,
    part_class: partClass,
    dimensions: kinds.map((k) => ({ kind: k, presence_only: true })),
    derivation: {
      source: "STEPGeometryParserEngine",
      complexity: stepResult.geometry?.complexity ?? "unknown",
      cylindrical_count: Number(stepResult.geometry?.cylindrical_feature_count) || 0,
      taper_count: Number(stepResult.geometry?.taper_count) || 0,
      fillet_count: Number(stepResult.geometry?.fillet_count) || 0,
    },
  };
}

export function groupRecordsByPartClass(records) {
  const grouped = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    if (!r || typeof r.part_class !== "string") continue;
    if (!grouped.has(r.part_class)) grouped.set(r.part_class, []);
    grouped.get(r.part_class).push({
      pdf_path: r.pdf_path,
      cad_source: r.cad_source,
      dimensions: r.dimensions,
      derivation: r.derivation,
    });
  }
  const out = [];
  for (const [partClass, prints] of grouped.entries()) {
    out.push({
      schemaVersion: 1,
      part_class: partClass,
      prints,
      source: "cad-derived",
    });
  }
  return out;
}

export function summarizeBatch(stepResults) {
  const arr = Array.isArray(stepResults) ? stepResults : [];
  const out = {
    total: arr.length,
    parse_ok: 0,
    parse_failed: 0,
    no_features: 0,
    gt_produced: 0,
    byPartClass: {},
  };
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    if (r.parse_ok !== true) {
      out.parse_failed += 1;
      continue;
    }
    out.parse_ok += 1;
    const kinds = evidenceForFeatureKinds(r.geometry);
    if (kinds.length === 0) {
      out.no_features += 1;
      continue;
    }
    out.gt_produced += 1;
    const pc = inferPartClassFromCadPath(r.file_path);
    out.byPartClass[pc] = (out.byPartClass[pc] ?? 0) + 1;
  }
  return out;
}
