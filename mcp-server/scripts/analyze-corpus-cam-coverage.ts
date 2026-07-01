/**
 * analyze-corpus-cam-coverage.ts -- enumerate the FULL CAM-library population (slot:romeo 2026-06-14).
 *
 * The operator directive: account for ALL tools + tool holders in the databases, for all materials,
 * with cutting parameters per toolpath in each material -- driven by crons/loops until complete.
 * This is the ANALYSIS pass: enumerate the true population (all-means-all -- state the count FIRST),
 * verify the shared condition-matrix produces per-material x per-toolpath cutting data from an
 * arbitrary corpus tool (geometry + iso_group), and report current coverage vs total.
 */
import { toolCatalogEngine } from "../src/engines/ToolCatalogEngine.js";
import { catalogCorpusLoaderEngine } from "../src/engines/CatalogCorpusLoaderEngine.js";
import { conditionMatrix, classifyToolType, GRADES, TOOLPATHS } from "./lib/jm-tool-condition-matrix.js";

catalogCorpusLoaderEngine.load();
const stats = toolCatalogEngine.stats();
const all = toolCatalogEngine.search({ max_results: 200000 }) as Array<Record<string, any>>;

console.log("=== FULL CAM-LIBRARY POPULATION (all-means-all) ===");
console.log("unified corpus tools:", stats.total_tools);
console.log("returned by search:", all.length);
console.log("holders:", stats.holders);
console.log("materials (grades):", GRADES.length, "->", GRADES.map((g: any) => g.name ?? g.key).join(", "));

// by type
const byType: Record<string, number> = {};
for (const t of all) byType[t.type] = (byType[t.type] ?? 0) + 1;
console.log("\nby tool type:", JSON.stringify(byType));

// by manufacturer (brand)
const byMfr: Record<string, number> = {};
for (const t of all) byMfr[t.manufacturer] = (byMfr[t.manufacturer] ?? 0) + 1;
console.log("manufacturers:", Object.keys(byMfr).length);

// toolpath coverage per type (how many toolpaths apply)
const tpByType: Record<string, number> = {};
for (const ty of Object.keys(byType)) {
  const cls = classifyToolType(ty);
  tpByType[ty] = (TOOLPATHS as any)[cls]?.length ?? (TOOLPATHS as any).end_mill?.length ?? 0;
}
console.log("\ntoolpaths-per-type (sample):", JSON.stringify(Object.fromEntries(Object.entries(tpByType).slice(0, 8))));

// total preset population estimate
let totalPresets = 0;
for (const t of all) {
  const cls = classifyToolType(t.type);
  const tps = (TOOLPATHS as any)[cls]?.length ?? (TOOLPATHS as any).end_mill?.length ?? 1;
  totalPresets += GRADES.length * tps;
}
console.log("\nESTIMATED total presets (tool x material x toolpath):", totalPresets.toLocaleString());

// VERIFY: condition matrix works on an arbitrary corpus tool
const sample = all.find((t) => t.id?.startsWith("corpus:") && t.physical?.cutting_diameter_mm > 0) ?? all[0];
console.log("\n=== condition-matrix verification on a corpus tool ===");
console.log("sample tool:", sample.id, "| type:", sample.type, "| dia:", sample.physical?.cutting_diameter_mm);
try {
  const presets = conditionMatrix(sample as any);
  console.log("conditionMatrix produced", presets.length, "presets (grade x toolpath)");
  const p0 = presets[0];
  console.log("sample preset:", JSON.stringify({
    grade: p0?.material_label ?? p0?.grade, toolpath: p0?.toolpath,
    vc: p0?.vc_mpm, fz: p0?.fz_mm, ap: p0?.ap_mm, ae: p0?.ae_mm, rpm: p0?.rpm, feed: p0?.feed_mmpm,
  }));
  const anyEmpty = presets.some((p: any) => !Number.isFinite(p.vc_mpm) || !Number.isFinite(p.feed_mmpm));
  console.log("any preset with non-finite cutting data?", anyEmpty);
} catch (e) {
  console.log("conditionMatrix FAILED on corpus tool:", (e as Error).message);
}
