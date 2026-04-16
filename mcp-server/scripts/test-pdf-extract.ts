/**
 * Test PDF Extraction — Verify pdf-parse works
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");
const pdfParse = PDFParse;

async function main() {
  // Test with a hyperMILL manual
  const testPath = "H:/prism/Resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf";

  console.log("=== PDF Extraction Test ===");
  console.log(`Testing: ${testPath}\n`);

  try {
    // v2 API: use data buffer for local files
    const buffer = readFileSync(testPath);
    console.log(`File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    const parser = new pdfParse({ data: buffer });
    const data = await parser.getText();

    console.log(`\nResult type: ${typeof data}`);
    console.log(`Result keys: ${Object.keys(data || {})}`);

    // Handle both old and new API structures
    const text = typeof data === 'string' ? data : (data?.text || JSON.stringify(data).slice(0, 2000));
    console.log(`\nText length: ${text.length} characters`);

    // Show first 1000 chars of extracted text
    console.log(`\n--- First 1000 characters ---`);
    console.log(text.slice(0, 1000));
    console.log(`\n--- End preview ---`);

    // Look for cutting-related keywords
    const keywords = ["feed", "speed", "cutting", "rpm", "mm/min", "m/min"];
    console.log(`\n=== Keyword Analysis ===`);
    for (const kw of keywords) {
      const count = (text.toLowerCase().match(new RegExp(kw, "g")) || [])
        .length;
      console.log(`  "${kw}": ${count} occurrences`);
    }

    console.log(`\n=== Test Complete ===`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
