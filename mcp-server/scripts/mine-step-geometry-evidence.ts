/**
 * mine-step-geometry-evidence.ts — Walk the corpus STEP files, parse each
 * one with STEPGeometryParserEngine, and aggregate per-class feature
 * evidence from real geometry (not filenames).
 *
 * Run: npx tsx mcp-server/scripts/mine-step-geometry-evidence.ts
 */
import { cadCorpusIngestionEngine } from "../src/engines/CADCorpusIngestionEngine.js";
import { stepGeometryParserEngine } from "../src/engines/STEPGeometryParserEngine.js";
import type { PartClass } from "../src/engines/BlueprintVisionOCREngine.js";
import * as fs from "node:fs";

const MANIFEST_PATH = "H:/prism/mcp-server/data/state/cad-corpus-manifest-recovered.json";
const REPORT_PATH = "H:/prism/mcp-server/data/state/cad-corpus-step-geometry-report.json";
const MAX_FILES_PER_CLASS = Number(process.env.PRISM_STEP_MINE_CAP) || 50; // sample cap (env-overridable: PRISM_STEP_MINE_CAP) — full corpus run is ~5GB read

interface PerClassEvidence {
  part_class: PartClass;
  files_examined: number;
  files_parse_ok: number;
  feature_evidence_counts: Record<string, number>;
  geometry_complexity: { simple: number; medium: number; complex: number };
  total_cylindrical: number;
  total_toroidal: number;
  total_conical: number;
  total_b_spline: number;
}

interface FullReport {
  generated_at: string;
  manifest_size: number;
  files_examined: number;
  files_parse_ok: number;
  per_class: PerClassEvidence[];
}

async function main(): Promise<void> {
  const manifest = cadCorpusIngestionEngine.loadManifest(MANIFEST_PATH);
  if (!manifest) {
    console.error(`No manifest at ${MANIFEST_PATH}. Run scripts/ingest-cad-corpus.ts first.`);
    process.exit(1);
  }

  console.log(`── Mining STEP geometry from ${manifest.total_entries.toLocaleString("en-US")} corpus files ──`);
  console.log(`    Sample cap per class: ${MAX_FILES_PER_CLASS}\n`);

  // Filter to STEP-family files only
  const stepEntries = manifest.entries.filter((e) => e.ext === ".step" || e.ext === ".stp");
  console.log(`Total STEP-family entries: ${stepEntries.length}`);

  // Group by class, cap per class
  const byClass = new Map<PartClass, typeof stepEntries>();
  for (const e of stepEntries) {
    const arr = byClass.get(e.part_class) ?? [];
    if (arr.length < MAX_FILES_PER_CLASS) arr.push(e);
    byClass.set(e.part_class, arr);
  }

  let filesExamined = 0;
  let filesOk = 0;
  const perClass: PerClassEvidence[] = [];

  for (const [partClass, entries] of byClass) {
    const evidence: PerClassEvidence = {
      part_class: partClass,
      files_examined: 0,
      files_parse_ok: 0,
      feature_evidence_counts: {},
      geometry_complexity: { simple: 0, medium: 0, complex: 0 },
      total_cylindrical: 0,
      total_toroidal: 0,
      total_conical: 0,
      total_b_spline: 0,
    };

    for (const entry of entries) {
      evidence.files_examined++;
      filesExamined++;
      const result = stepGeometryParserEngine.parseFile(entry.abs_path);
      if (!result.parse_ok) continue;
      evidence.files_parse_ok++;
      filesOk++;
      evidence.geometry_complexity[result.geometry.complexity]++;
      evidence.total_cylindrical += result.entity_counts.cylindrical_surface;
      evidence.total_conical += result.entity_counts.conical_surface;
      evidence.total_toroidal += result.entity_counts.toroidal_surface;
      evidence.total_b_spline += result.entity_counts.b_spline_surface;

      const fEvidence = stepGeometryParserEngine.evidenceForFeatureKinds(result.geometry);
      for (const kind of fEvidence) {
        evidence.feature_evidence_counts[kind] = (evidence.feature_evidence_counts[kind] ?? 0) + 1;
      }
    }

    perClass.push(evidence);
    console.log(`  ${partClass.padEnd(22)} examined=${evidence.files_examined.toString().padStart(3)} ok=${evidence.files_parse_ok.toString().padStart(3)} ` +
      `cyl=${evidence.total_cylindrical.toString().padStart(5)} conic=${evidence.total_conical.toString().padStart(4)} ` +
      `tor=${evidence.total_toroidal.toString().padStart(5)} b-spline=${evidence.total_b_spline.toString().padStart(5)}`);
  }

  console.log(`\n── Summary ──`);
  console.log(`Files examined: ${filesExamined}`);
  console.log(`Files parsed OK: ${filesOk}`);
  console.log(`Parse success rate: ${((filesOk / Math.max(1, filesExamined)) * 100).toFixed(1)}%\n`);

  console.log(`── Per-class feature evidence (count of files showing each evidence) ──`);
  for (const c of perClass.filter((c) => c.files_parse_ok > 0)) {
    const sorted = Object.entries(c.feature_evidence_counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
      console.log(`  ${c.part_class}: no feature evidence (parsed ${c.files_parse_ok} files)`);
      continue;
    }
    console.log(`  ${c.part_class} (${c.files_parse_ok} files):`);
    for (const [kind, count] of sorted.slice(0, 6)) {
      const prevalence = count / c.files_parse_ok;
      console.log(`    ${kind.padEnd(28)} ${count.toString().padStart(3)}/${c.files_parse_ok}  prev=${prevalence.toFixed(3)}`);
    }
  }

  console.log(`\n── Geometry complexity by class ──`);
  for (const c of perClass.filter((c) => c.files_parse_ok > 0)) {
    const total = c.geometry_complexity.simple + c.geometry_complexity.medium + c.geometry_complexity.complex;
    if (total === 0) continue;
    const s = c.geometry_complexity.simple, m = c.geometry_complexity.medium, x = c.geometry_complexity.complex;
    console.log(`  ${c.part_class.padEnd(22)} simple=${s} medium=${m} complex=${x}`);
  }

  const report: FullReport = {
    generated_at: new Date().toISOString(),
    manifest_size: manifest.total_entries,
    files_examined: filesExamined,
    files_parse_ok: filesOk,
    per_class: perClass,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n✓ STEP geometry report saved: ${REPORT_PATH}`);
}

main().catch((e: unknown) => {
  console.error("MINE CRASHED:", e instanceof Error ? e.stack : e);
  process.exit(2);
});
