#!/usr/bin/env node
/**
 * generate-pdf-course-bridge-features.mjs
 *
 * Bridge layer: emits system-viz edges from the resource-pdf + college-course
 * ghost-children to their LOGICAL CONNECTED engine/dispatcher nodes.
 *
 * Closes the "wire and bridge to logical connected nodes" leg of
 * U-RESOURCE-PDF-AUTOGEN-SPECS / U-COLLEGE-AUTOGEN-WIDEN.
 *
 * Mapping table (per source kind → target engine node ids):
 *   PDF kind:
 *     machining-handbook   → KienzleForceModelEngine, CuttingForceEngine,
 *                            UltimateSpeedFeedEngine, AutoSpeedFeedEngine
 *     resource-catalog     → ShopToolingRegistryEngine, ToolCatalogEngine
 *     manual-pdf           → PostProcessorPipelineEngine, MachineControllerEngine
 *     blueprint-pdf        → PdfBlueprintDimensionExtractorEngine,
 *                            CADGeometryEngine
 *     other-pdf            → PdfGenericExtractorEngine (catch-all)
 *
 *   College course kind/category:
 *     mit-ocw academic     → MITCourseKnowledgeEngine, MitOcwResourceResolverEngine
 *     basic-training       → ShopFloorTrainingEngine, OperatorOnboardingEngine
 *     knowledge-pack       → KnowledgeConversionEngine, FormulaExtractorEngine
 *     handbook-pdfs        → PdfMachiningHandbookExtractorEngine
 *     prism-training       → PrismTrainingModuleEngine
 *     prism-personal       → PersonalNotesExtractorEngine
 *
 * Output: `state/shared/system-viz/pdf-course-bridge-augmentation.json`
 *   - newNodes: [] (no new nodes — pure edges)
 *   - newEdges: [{ source, target, type: "bridge-to-engine" }]
 *
 * Edges are advisory + must_human_verify. Where the target engine doesn't yet
 * exist on disk, the edge surfaces the gap in /system-viz wiring overlay.
 *
 * @milestone MIT-COURSE-INTEGRATION/U-PDF-COURSE-BRIDGE
 * @slot india
 * @date 2026-05-24
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { mcpToolToDispNodeId } from "./lib/viz-dispatcher-node-id.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";

const PDF_SPECS_DIR = path.join(ROOT, "state/shared/resource-pdf-specs");
const COURSE_SPECS_DIR = path.join(ROOT, "state/shared/college-course-specs");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "pdf-course-bridge-augmentation.json");

const PDF_SPEC_RE = /^AUTOGEN-EXTRACT-SPEC-(.+)\.md$/;
const COURSE_SPEC_RE = /^AUTOGEN-SPEC-(.+)\.md$/;
const KIND_FIELD_RE = /^\|\s*Kind\s*\|\s*`?([^`|\n]+?)`?\s*\|$/m;

/** PDF kind → engine node ids (system-graph schema: engine.<className>). */
export const PDF_KIND_TO_ENGINES = {
  "machining-handbook": [
    "engine.KienzleForceModelEngine",
    "engine.CuttingForceEngine",
    "engine.UltimateSpeedFeedEngine",
    "engine.AutoSpeedFeedEngine",
  ],
  "resource-catalog": [
    "engine.ShopToolingRegistryEngine",
    "engine.ToolCatalogEngine",
  ],
  "manual-pdf": [
    "engine.PostProcessorPipelineEngine",
    "engine.MachineControllerEngine",
  ],
  "blueprint-pdf": [
    "engine.PdfBlueprintDimensionExtractorEngine",
    "engine.CADGeometryEngine",
  ],
  "other-pdf": [
    "engine.PdfGenericExtractorEngine",
  ],
};

/** PDF kind → engines that can be IMPROVED with this corpus (tribal tips). */
export const PDF_KIND_ENRICHES = {
  "machining-handbook": [
    "engine.MaterialRegistryEngine",
    "engine.SurfaceFinishPredictorEngine",
    "engine.ToolLifeEngine",
    "engine.ChatterStabilityLobeEngine",
  ],
  "resource-catalog": [
    "engine.ToolWearProgressionEngine",
    "engine.SpeedFeedOrchestratorEngine",
  ],
  "manual-pdf": [
    "engine.OkumaMacroEngine",
    "engine.HaasMacroEngine",
    "engine.FanucMacroEngine",
  ],
  "blueprint-pdf": [
    "engine.GDTValidationEngine",
    "engine.ToleranceStackEngine",
  ],
  "other-pdf": [],
};

/** PDF kind → dispatchers that will consume the extracted artifacts.
 *  Values are MCP tool names — resolved to canonical `disp.<file-id>` node ids
 *  by mcpToolToDispNodeId() at edge-emit (U-VIZ-G4-DEAD-EDGE, 2026-05-30 sierra:
 *  the previous `dispatcher.prism_*` literals were dead targets in the merged
 *  graph — wrong prefix + wrong name; see scripts/lib/viz-dispatcher-node-id.mjs). */
export const PDF_KIND_TO_DISPATCHERS = {
  "machining-handbook": ["prism_calc", "prism_intelligence"],
  "resource-catalog": ["prism_cam"],
  "manual-pdf": ["prism_calc"],
  "blueprint-pdf": ["prism_cad"],
  "other-pdf": ["prism_ai"],
};

/** PDF kind → AI training-data targets (always wired). */
export const PDF_KIND_FEEDS_TRAINING = [
  "engine.AIResourceLearningEngine",
  "engine.MasterAITrainingLedgerEngine",
];

/** Course kind → engine node ids. */
export const COURSE_KIND_TO_ENGINES = {
  "mit-ocw": [
    "engine.MITCourseKnowledgeEngine",
    "engine.MitOcwResourceResolverEngine",
  ],
  "basic-training": [
    "engine.ShopFloorTrainingEngine",
    "engine.OperatorOnboardingEngine",
  ],
  "knowledge-pack": [
    "engine.KnowledgeConversionEngine",
    "engine.FormulaExtractorEngine",
  ],
  "handbook-pdfs": [
    "engine.PdfMachiningHandbookExtractorEngine",
  ],
  "prism-training": [
    "engine.PrismTrainingModuleEngine",
  ],
  "prism-personal": [
    "engine.PersonalNotesExtractorEngine",
  ],
};

/** Course kind → engines that can be IMPROVED with extracted content. */
export const COURSE_KIND_ENRICHES = {
  "mit-ocw": [
    "engine.CrossDisciplinaryDeepLearningEngine",
    "engine.PRISMCreativeReasoningEngine",
  ],
  "basic-training": [
    "engine.ShopSafetyValidationEngine",
    "engine.OperatorSkillProgressionEngine",
  ],
  "knowledge-pack": [
    "engine.MaterialRegistryEngine",
    "engine.KienzleForceModelEngine",
  ],
  "handbook-pdfs": [
    "engine.ToolLifeEngine",
    "engine.SurfaceFinishPredictorEngine",
  ],
  "prism-training": [
    "engine.ShopConfigurationEngine",
    "engine.JMDieCustomerEngine",
  ],
  "prism-personal": [],
};

/** Course kind → dispatchers that will consume the extracted artifacts.
 *  MCP tool names — resolved to canonical `disp.<file-id>` node ids at edge-emit
 *  (U-VIZ-G4-DEAD-EDGE). Note: `prism_shop` has no dispatcher node yet, so it
 *  resolves to the R12-honest `disp.prism_shop` fallback (a single surfaced dead
 *  pixel = "this dispatcher does not exist", not a malformed prefix). */
export const COURSE_KIND_TO_DISPATCHERS = {
  "mit-ocw": ["prism_ai", "prism_intelligence"],
  "basic-training": ["prism_shop"],
  "knowledge-pack": ["prism_calc"],
  "handbook-pdfs": ["prism_calc"],
  "prism-training": ["prism_cam"],
  "prism-personal": ["prism_memory"],
};

/** Pure: parse the Kind field from a spec body. */
export function parseKind(body) {
  return (body.match(KIND_FIELD_RE) || [])[1]?.trim() || "other-pdf";
}

/** Pure: build bridge edges from PDF specs + course specs + kind→engine maps. */
export function generate({ pdfEntries, courseEntries, pdfMap = PDF_KIND_TO_ENGINES, courseMap = COURSE_KIND_TO_ENGINES }) {
  const edges = [];
  const seen = new Set();
  const edgeKey = (s, t, type) => s + "|" + t + "|" + type;
  const pushEdges = (source, targets, type) => {
    for (const t of targets || []) {
      const k = edgeKey(source, t, type);
      if (seen.has(k)) continue;
      seen.add(k);
      edges.push({ source, target: t, type });
    }
  };

  // NB: engine targets (`engine.<ClassName>`) are emitted as-is here and
  // canonicalized to `eng.<domain>.<name>` by merge-augmentations' edge-target
  // pass at assembly time (U-VIZ-G4-DEAD-EDGE) — the generator has no live node
  // set to resolve them. Dispatcher targets ARE resolved here (static table).
  for (const e of pdfEntries) {
    const source = "pdf-extract." + e.slug;
    pushEdges(source, pdfMap[e.kind] || pdfMap["other-pdf"] || [], "bridge-to-engine");
    pushEdges(source, PDF_KIND_ENRICHES[e.kind] || [], "enriches-engine");
    pushEdges(source, (PDF_KIND_TO_DISPATCHERS[e.kind] || []).map(mcpToolToDispNodeId), "feeds-dispatcher");
    pushEdges(source, PDF_KIND_FEEDS_TRAINING, "feeds-training");
  }

  for (const e of courseEntries) {
    const source = "college.course." + e.slug;
    pushEdges(source, courseMap[e.kind] || [], "bridge-to-engine");
    pushEdges(source, COURSE_KIND_ENRICHES[e.kind] || [], "enriches-engine");
    pushEdges(source, (COURSE_KIND_TO_DISPATCHERS[e.kind] || []).map(mcpToolToDispNodeId), "feeds-dispatcher");
    pushEdges(source, PDF_KIND_FEEDS_TRAINING, "feeds-training");
  }

  const byKind = {};
  for (const e of [...pdfEntries, ...courseEntries]) {
    byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  }
  const byType = {};
  for (const e of edges) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  return { newNodes: [], newEdges: edges, stats: { totalEdges: edges.length, pdfSources: pdfEntries.length, courseSources: courseEntries.length, byKind, byType } };
}

/** Read kind from every spec file in a directory. */
export function readSpecsDirKinds(dir, fileRe) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).sort()) {
    const m = f.match(fileRe);
    if (!m) continue;
    try {
      const body = fs.readFileSync(path.join(dir, f), "utf8");
      out.push({ slug: m[1], kind: parseKind(body) });
    } catch { /* skip */ }
  }
  return out;
}

export function main() {
  const pdfEntries = readSpecsDirKinds(PDF_SPECS_DIR, PDF_SPEC_RE);
  const courseEntries = readSpecsDirKinds(COURSE_SPECS_DIR, COURSE_SPEC_RE);

  if (pdfEntries.length === 0 && courseEntries.length === 0) {
    console.error("FATAL: both spec dirs empty — run auto-resource-pdf-spec-emit.mjs + auto-college-course-spec-emit.mjs first");
    return 1;
  }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate({ pdfEntries, courseEntries });
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/{resource-pdf-specs,college-course-specs}/AUTOGEN-*.md",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error("FATAL: generate failed — " + e.message); return 2; }

  fs.mkdirSync(VIZ_DIR, { recursive: true });
  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error("FATAL: write failed — " + e.message); return 2; }

  console.log("wrote " + OUT_PATH);
  console.log("  total edges:    " + result.stats.totalEdges);
  console.log("  pdf sources:    " + result.stats.pdfSources);
  console.log("  course sources: " + result.stats.courseSources);
  console.log("  by-kind:        " + JSON.stringify(result.stats.byKind));
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
