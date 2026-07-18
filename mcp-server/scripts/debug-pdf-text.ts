/**
 * Debug PDF text extraction — see what patterns we're actually getting
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

async function main() {
  const testFile = "H:/prism/Resources/MANUFACTURER_CATALOGS/uploaded/GC_2023-2024_US_Turning-Grooving.pdf";

  console.log("=== PDF Text Debug ===\n");

  const buffer = readFileSync(testFile);
  console.log(`File size: ${(buffer.length / 1024 / 1024).toFixed(1)}MB\n`);

  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy?.();

  const text = typeof result === "string" ? result : (result?.text || "");

  console.log(`Total text length: ${text.length} chars\n`);

  // Find lines with cutting speed indicators
  const lines = text.split("\n");
  console.log(`Total lines: ${lines.length}\n`);

  console.log("=== Sample lines with 'm/min' ===");
  const mminLines = lines.filter(l => l.toLowerCase().includes("m/min")).slice(0, 20);
  for (const line of mminLines) {
    console.log(`> ${line.slice(0, 200)}`);
  }

  console.log("\n=== Sample lines with 'vc' or 'speed' ===");
  const vcLines = lines.filter(l => /\bvc\b|cutting speed/i.test(l)).slice(0, 20);
  for (const line of vcLines) {
    console.log(`> ${line.slice(0, 200)}`);
  }

  console.log("\n=== Sample lines with numeric patterns ===");
  const numericLines = lines.filter(l => /\d{2,3}\s+[\d.,]+\s+[\d.,]+/.test(l)).slice(0, 20);
  for (const line of numericLines) {
    console.log(`> ${line.slice(0, 200)}`);
  }

  console.log("\n=== Sample lines with 'GC' grade ===");
  const gcLines = lines.filter(l => /GC\s*\d{4}/i.test(l)).slice(0, 20);
  for (const line of gcLines) {
    console.log(`> ${line.slice(0, 200)}`);
  }

  console.log("\n=== Sample lines with material groups ===");
  const matLines = lines.filter(l => /\b[PMKNSH]\d{2}|\bISO [PMKNSH]/i.test(l)).slice(0, 20);
  for (const line of matLines) {
    console.log(`> ${line.slice(0, 200)}`);
  }

  // Save a larger sample for manual inspection
  mkdirSync("H:/prism/mcp-server/data/extracted-knowledge/debug", { recursive: true });
  const sample = text.slice(0, 50000);
  writeFileSync("H:/prism/mcp-server/data/extracted-knowledge/debug/sandvik-sample.txt", sample);
  console.log("\n=== Saved 50KB sample to debug/sandvik-sample.txt ===");

  // Also save a sample with cutting-related sections
  const cuttingSection = lines.filter(l =>
    /speed|feed|vc|fn|ap|mm\/min|m\/min|mm\/rev/i.test(l)
  ).join("\n");
  writeFileSync("H:/prism/mcp-server/data/extracted-knowledge/debug/sandvik-cutting-lines.txt", cuttingSection.slice(0, 100000));
  console.log("=== Saved cutting-related lines to debug/sandvik-cutting-lines.txt ===");
}

main().catch(console.error);
