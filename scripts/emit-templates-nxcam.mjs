#!/usr/bin/env node
/**
 * scripts/emit-templates-nxcam.mjs — CAM-AI-TRAINING-MS0/U-CAMT-NXCAM-EXTEND
 *
 * Extend the 4-system template corpus with a 5th system: NX CAM.
 * Source catalog: mcp-server/data/cam-functions/nxcam/{milling,turning,fbm}.json
 *
 * NX CAM operations are stored as a flat object keyed by op-id with
 * nested parameters grouped by dialog tab. We flatten parameter
 * paths (tab.paramName) and map op-ids to PRISM CamOperation enum.
 *
 * Outputs:
 *   - state/shared/corpus/cam-templates-nxcam.jsonl
 *   - state/shared/corpus/cam-coverage-nxcam.json
 *   - state/shared/corpus/cam-templates-nxcam-summary.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CATALOG = join(REPO_ROOT, "mcp-server", "data", "cam-functions", "nxcam");
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

// NX CAM op-id -> PRISM CamOperation enum
const NXCAM_TO_PRISM = {
  // milling
  face_milling: "face",
  planar_mill: "contour_2d",
  planar_profile: "contour_2d",
  cavity_mill: "pocket_2d",
  zlevel_profile: "contour_3d",
  adaptive_milling: "pocket_2d",
  fixed_contour: "parallel_finish",
  surface_contour: "parallel_finish",
  variable_contour: "parallel_finish",
  swarf_drive: "swarf_5axis",
  variable_streamline: "morph_5axis",
  sequential_mill: "trace",
  // turning
  rough_turn_od: "turn_rough",
  finish_turn_od: "turn_finish",
  rough_face: "turn_rough",
  finish_face: "turn_finish",
  rough_bore_id: "bore",
  finish_bore_id: "bore",
  groove_od: "groove_turn",
  thread_od: "tap",
  thread_id: "tap",
  centerline_drill: "drill_peck",
  manual_bore: "bore",
  teach_mode: "trace",
  // fbm — feature recognition; map to closest machining intent
  hole_feature_recognition: "drill_spot",
  pocket_feature_recognition: "pocket_2d",
  auto_feature_recognition: "combined_cycle",
  feature_cad_sync: "combined_cycle",
  feature_group_operation: "combined_cycle",
  feature_painting: "combined_cycle",
  machining_knowledge_library: "combined_cycle",
  machining_knowledge_rule: "combined_cycle",
  manual_feature_create: "combined_cycle",
  template_auto_3d: "combined_cycle",
  template_hole_making: "drill_peck",
  template_planar_milling: "contour_2d",
};

function loadSection(name) {
  const f = join(CATALOG, `${name}.json`);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, "utf8"));
}

function flattenParams(params, prefix = "") {
  const flat = {};
  if (!params || typeof params !== "object") return flat;
  for (const [k, v] of Object.entries(params)) {
    if (v && typeof v === "object" && !("type" in v) && !("default" in v) && !("required" in v) && !("values" in v)) {
      // nested tab/group
      Object.assign(flat, flattenParams(v, prefix ? `${prefix}.${k}` : k));
    } else {
      const key = prefix ? `${prefix}.${k}` : k;
      flat[key] = v;
    }
  }
  return flat;
}

const PROVENANCE = {
  realDataOnly: true,
  sourceMilestone: "CAM-AI-TRAINING-MS0",
  sourceSlot: "kilo",
  sourceCatalog: "mcp-server/data/cam-functions/nxcam/",
  sourceCatalogVersion: "NX CAM 2306",
  operatorConstraint: OPERATOR_CONSTRAINT,
};

const sections = ["milling", "turning", "fbm"];
const templates = [];
const coverageRows = [];
let totalParams = 0;
let mapped = 0;
let unmapped = 0;

for (const sec of sections) {
  const cat = loadSection(sec);
  if (!cat) continue;
  for (const [nxOpId, op] of Object.entries(cat.operations ?? {})) {
    const prismOp = NXCAM_TO_PRISM[nxOpId];
    if (!prismOp) {
      unmapped++;
      coverageRows.push({ section: sec, nxOpId, nativeName: op.display_name, prismOp: null, mapped: false });
      continue;
    }
    mapped++;
    const flat = flattenParams(op.parameters);
    totalParams += Object.keys(flat).length;
    const tplId = `${prismOp}__nxcam__${nxOpId}`;
    templates.push({
      id: tplId,
      op: prismOp,
      system: "nxcam",
      section: sec,
      nativeKey: nxOpId,
      nativeName: op.display_name,
      description: op.description,
      category: op.category,
      dialogTabs: op.dialog_tabs ?? [],
      parameters: flat,
      paramCount: Object.keys(flat).length,
      provenance: PROVENANCE,
    });
    coverageRows.push({ section: sec, nxOpId, nativeName: op.display_name, prismOp, mapped: true, paramCount: Object.keys(flat).length });
  }
}

writeFileSync(
  join(CORPUS, "cam-templates-nxcam.jsonl"),
  templates.map((r) => JSON.stringify(r)).join("\n") + "\n"
);

const coverage = {
  schemaVersion: "1.0.0",
  system: "nxcam",
  catalogVersion: "NX CAM 2306",
  sectionsScanned: sections,
  totalCatalogOps: coverageRows.length,
  mappedOps: mapped,
  unmappedOps: unmapped,
  coveragePct: Math.round((mapped / coverageRows.length) * 100),
  totalFlattenedParams: totalParams,
  rows: coverageRows,
  provenance: PROVENANCE,
  generatedAt: new Date().toISOString(),
};

writeFileSync(join(CORPUS, "cam-coverage-nxcam.json"), JSON.stringify(coverage, null, 2));

writeFileSync(
  join(CORPUS, "cam-templates-nxcam-summary.json"),
  JSON.stringify({
    totalTemplates: templates.length,
    totalCatalogOps: coverageRows.length,
    coveragePct: coverage.coveragePct,
    totalFlattenedParams: totalParams,
    perSection: sections.reduce((acc, s) => { acc[s] = templates.filter((t) => t.section === s).length; return acc; }, {}),
    generatedAt: coverage.generatedAt,
  }, null, 2)
);

console.log(`NX CAM: ${mapped} mapped / ${coverageRows.length} total (${coverage.coveragePct}%) | ${totalParams} flattened params`);
console.log(`per-section: ${JSON.stringify(sections.reduce((acc, s) => { acc[s] = templates.filter((t) => t.section === s).length; return acc; }, {}))}`);
