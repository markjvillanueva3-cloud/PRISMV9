/**
 * CI gate for CAM catalog enrichment — U-CAM-ENRICH-04.
 *
 * Exits 0 on pass, 1 on regression. Writes validator output to
 * data/state/PHASE_0.6_ENRICHMENT_VALIDATION.json.
 *
 * First run: captures baseline into PHASE_0.6_ENRICHMENT_BASELINE.json
 * if one does not exist. Subsequent runs compare against it.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { camCatalogEnrichmentValidator } from "../src/engines/CAMCatalogEnrichmentValidator.js";

const BASELINE_PATH = "H:/PRISM/mcp-server/data/state/PHASE_0.6_ENRICHMENT_BASELINE.json";
const RESULT_PATH   = "H:/PRISM/mcp-server/data/state/PHASE_0.6_ENRICHMENT_VALIDATION.json";
const DRIFT_TOL     = Number(process.env.CAM_ENRICH_DRIFT_TOL ?? "0.10");
const MIN_SCORE     = Number(process.env.CAM_ENRICH_MIN_SCORE ?? "0");

const haveBaseline = fs.existsSync(BASELINE_PATH);
if (!haveBaseline) {
  console.log("[U-CAM-ENRICH-04] No baseline — capturing now.");
  camCatalogEnrichmentValidator.captureBaseline({ baselinePath: BASELINE_PATH });
}

const r = camCatalogEnrichmentValidator.validate({
  baselinePath: BASELINE_PATH,
  driftTolerance: DRIFT_TOL,
  minOverallScore: MIN_SCORE,
  writeBaselineIfMissing: false,
});

fs.mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
fs.writeFileSync(RESULT_PATH, JSON.stringify(r, null, 2));

console.log(`[U-CAM-ENRICH-04] Global score: ${r.global_score.toFixed(2)} | baseline_compared: ${r.baseline_compared}`);
for (const rep of r.reports) {
  console.log(`  ${rep.cam_slug.padEnd(14)} phys=${rep.physics_coverage_pct.toFixed(1)}%  actions=${rep.actions_coverage_pct.toFixed(1)}%  tips=${rep.tips_linked_pct.toFixed(1)}%  overall=${rep.overall_score.toFixed(2)}`);
}
if (r.regressions.length > 0) {
  console.log(`\n[U-CAM-ENRICH-04] REGRESSIONS (${r.regressions.length}):`);
  for (const reg of r.regressions) {
    console.log(`  ${reg.cam_slug} ${reg.metric}: baseline=${reg.baseline} → current=${reg.current} (${reg.delta_pct.toFixed(1)}%)`);
  }
}
if (!r.passed) {
  console.error("[U-CAM-ENRICH-04] FAIL — enrichment validation did not pass.");
  process.exit(1);
}
console.log("[U-CAM-ENRICH-04] PASS.");
