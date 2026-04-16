/**
 * PDF Discovery Script — Run PDF classification on Resources folder
 */

import { pdfProcessingPipelineEngine } from "../src/engines/PDFProcessingPipelineEngine.js";

async function main() {
  console.log("=== Starting PDF Discovery ===");
  console.log("Scanning H:/prism for PDFs...\n");

  try {
    const status = await pdfProcessingPipelineEngine.classify(1500);

    console.log("=== PDF Classification Results ===");
    console.log(`Total PDFs found: ${status.total_pdfs}`);
    console.log("\nBy Category:");
    for (const [category, count] of Object.entries(status.by_category)) {
      console.log(`  ${category}: ${count}`);
    }
    console.log("\nBy Status:");
    for (const [statusKey, count] of Object.entries(status.by_status)) {
      console.log(`  ${statusKey}: ${count}`);
    }
    if (status.warnings.length > 0) {
      console.log("\nWarnings:");
      for (const warning of status.warnings) {
        console.log(`  - ${warning}`);
      }
    }
    console.log("\n=== Discovery Complete ===");
  } catch (error) {
    console.error("Error during classification:", error);
    process.exit(1);
  }
}

main();
