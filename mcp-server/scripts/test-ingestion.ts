/**
 * Test Extraction Ingestion Hook
 */
import { detectNewExtractions, runIngestion, getIngestionState } from "../src/hooks/extractionIngestionHook.js";

async function main() {
  console.log("=== Extraction Ingestion Test ===\n");

  const state = getIngestionState();
  console.log("Current State:");
  console.log("  Last run:", state.last_run || "never");
  console.log("  Files processed:", state.files_processed.length);
  console.log("  Total items ingested:", state.total_items_ingested);

  const pending = detectNewExtractions();
  console.log("\nPending Files:", pending.length);
  for (const f of pending.slice(0, 10)) {
    const filename = f.path.split(/[\\/]/).pop();
    console.log(`  - ${f.type}: ${filename}`);
  }

  if (pending.length > 0) {
    console.log("\nRunning ingestion...");
    const result = await runIngestion();
    console.log("\nIngestion Result:");
    console.log("  Files processed:", result.files_processed);
    console.log("  Total items:", result.total_items);
    for (const r of result.results) {
      console.log(`  - ${r.extraction_type}: ${r.items_ingested} items`);
      if (r.tips_created) console.log(`    Tips: ${r.tips_created}`);
      if (r.templates_created) console.log(`    Templates: ${r.templates_created}`);
      if (r.errors.length) console.log(`    Errors: ${r.errors.join(", ")}`);
    }
  }
}

main().catch(console.error);
