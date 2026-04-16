/**
 * Run extraction maintenance check
 */
import { runMaintenanceCheck, saveMaintenanceReport } from "../src/hooks/extractionMaintenanceHook.js";

const report = runMaintenanceCheck();
const reportPath = saveMaintenanceReport(report);

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║       EXTRACTION MAINTENANCE REPORT                          ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("Health Score:", report.health_score + "%\n");

console.log("Extraction Scripts:");
console.log("  Total:", report.extraction_scripts.total);
console.log("  Recognized:", report.extraction_scripts.recognized.length);
if (report.extraction_scripts.unrecognized.length > 0) {
  console.log("  Unrecognized:", report.extraction_scripts.unrecognized.join(", "));
}

console.log("\nIngestion State:");
console.log("  Files processed:", report.ingestion.files_processed);
console.log("  Pending files:", report.ingestion.pending_files);
console.log("  Last run:", report.ingestion.last_run);

console.log("\nWiring:");
console.log("  Workflow templates:", report.wiring.workflow_templates_loaded);
console.log("  Tribal tips:", report.wiring.tribal_tips_loaded);
console.log("  Dispatchers:", report.wiring.dispatchers_with_workflow_actions.join(", ") || "none");
console.log("  Engines:", report.wiring.engines_with_workflow_integration.join(", ") || "none");

if (report.recommendations.length > 0) {
  console.log("\nRecommendations:");
  for (const rec of report.recommendations) {
    console.log("  -", rec);
  }
}

console.log("\nReport saved to:", reportPath);
