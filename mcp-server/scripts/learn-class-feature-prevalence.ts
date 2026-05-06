/**
 * learn-class-feature-prevalence.ts — Run the corpus prevalence learner
 * against the real 11,695-file local index, compare to hand-tuned weights,
 * and persist the report.
 *
 * Run: npx tsx mcp-server/scripts/learn-class-feature-prevalence.ts
 */
import { cadCorpusIngestionEngine } from "../src/engines/CADCorpusIngestionEngine.js";
import {
  cadCorpusFeaturePrevalenceLearnerEngine,
  type LearningReport,
} from "../src/engines/CADCorpusFeaturePrevalenceLearnerEngine.js";
import { cadClassFeatureLibraryEngine } from "../src/engines/CADClassFeatureLibraryEngine.js";
import * as fs from "node:fs";

const MANIFEST_PATH = "H:/prism/mcp-server/data/state/cad-corpus-manifest-recovered.json";
const REPORT_PATH = "H:/prism/mcp-server/data/state/cad-corpus-prevalence-report.json";

async function main(): Promise<void> {
  const manifest = cadCorpusIngestionEngine.loadManifest(MANIFEST_PATH)
    ?? cadCorpusIngestionEngine.loadManifest("H:/prism/mcp-server/data/state/cad-corpus-manifest.json");
  if (!manifest) {
    console.error("No corpus manifest found. Run scripts/ingest-cad-corpus.ts first.");
    process.exit(1);
  }

  console.log(`── Learning class-feature prevalence from ${manifest.total_entries.toLocaleString("en-US")} CAD files ──\n`);

  const handTuned = cadClassFeatureLibraryEngine.classesCovered().map((cls) => {
    const tmpl = cadClassFeatureLibraryEngine.templateFor(cls);
    return { part_class: cls, features: tmpl?.features ?? [] };
  }).filter((t) => t.features.length > 0);

  const report: LearningReport = cadCorpusFeaturePrevalenceLearnerEngine.learnAll(manifest, handTuned, 0.2);

  console.log(`Classes examined: ${report.classes_examined.length}`);
  console.log(`(class, feature) pairs evaluated: ${report.results.length}`);
  console.log(`Confident pairs (≥5 corpus members): ${report.results.filter((r) => r.confident).length}`);
  console.log(`Divergences vs hand tune (|Δ| ≥ 0.2): ${report.divergences.length}`);

  console.log(`\n── Per-class summary ──`);
  for (const cls of report.classes_examined) {
    const classResults = report.results.filter((r) => r.part_class === cls);
    if (classResults.length === 0) continue;
    const size = classResults[0]!.class_size;
    const confident = classResults[0]!.confident ? "✓" : "✗";
    const tokensFiring = classResults.filter((r) => r.positive_hits > 0).length;
    console.log(`  ${cls.padEnd(22)} n=${size.toString().padStart(6)}  confident=${confident}  features-firing=${tokensFiring}/${classResults.length}`);
  }

  if (report.divergences.length > 0) {
    console.log(`\n── Significant divergences (corpus disagrees with hand tune) ──`);
    const sorted = [...report.divergences].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    for (const d of sorted.slice(0, 20)) {
      const direction = d.delta > 0 ? "↑" : "↓";
      console.log(`  ${d.part_class.padEnd(22)} ${d.feature_kind.padEnd(28)}  hand=${d.hand_tuned.toFixed(2)}  learned=${d.learned.toFixed(2)}  ${direction}${Math.abs(d.delta).toFixed(2)}`);
    }
  }

  console.log(`\n── Top features actually appearing in filenames per class ──`);
  for (const cls of report.classes_examined) {
    const classResults = report.results.filter((r) => r.part_class === cls && r.positive_hits > 0);
    if (classResults.length === 0) continue;
    classResults.sort((a, b) => b.learned_prevalence - a.learned_prevalence);
    const top = classResults.slice(0, 4);
    if (top.length > 0) {
      console.log(`  ${cls}:`);
      for (const r of top) {
        const tokens = r.matched_tokens.slice(0, 3).join(", ");
        console.log(`    ${r.feature_kind.padEnd(28)} prev=${r.learned_prevalence.toFixed(3)}  hits=${r.positive_hits}  tokens=[${tokens}]`);
      }
    }
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n✓ Learning report saved: ${REPORT_PATH}`);
  console.log(`  Size: ${(fs.statSync(REPORT_PATH).size / 1024).toFixed(0)} KB`);
}

main().catch((e: unknown) => {
  console.error("LEARN CRASHED:", e instanceof Error ? e.stack : e);
  process.exit(2);
});
