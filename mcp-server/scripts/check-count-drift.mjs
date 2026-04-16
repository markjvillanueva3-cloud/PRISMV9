#!/usr/bin/env node
/**
 * check-count-drift.mjs — SYS-MS3-U04
 * Compares live system counts against CLAUDE.md documented values.
 * Returns drift report for integration with audit flows.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const CLAUDE_MD = "CLAUDE.md";

// Extract counts from CLAUDE.md
function extractDocumentedCounts() {
  const content = readFileSync(CLAUDE_MD, "utf8");
  const counts = {};

  // Parse header line: "82 dispatchers, 4,296 actions, 1,559 engines"
  const headerMatch = content.match(/(\d[\d,]*)\s*dispatchers.*?(\d[\d,]*)\s*actions.*?(\d[\d,]*)\s*engines/i);
  if (headerMatch) {
    counts.dispatchers = parseInt(headerMatch[1].replace(/,/g, ""), 10);
    counts.actions = parseInt(headerMatch[2].replace(/,/g, ""), 10);
    counts.engines = parseInt(headerMatch[3].replace(/,/g, ""), 10);
  }

  // Parse structure section for registries and algorithms
  const regMatch = content.match(/(\d+)\s*registries/i);
  if (regMatch) counts.registries = parseInt(regMatch[1], 10);

  const algoMatch = content.match(/(\d+)\s*algorithms/i);
  if (algoMatch) counts.algorithms = parseInt(algoMatch[1], 10);

  return counts;
}

// Count actual values from code
function countLiveSystems() {
  const counts = {};

  // Count dispatchers
  const dispatcherDir = "src/tools/dispatchers";
  counts.dispatchers = readdirSync(dispatcherDir)
    .filter(f => f.endsWith(".ts") && !f.startsWith("index")).length;

  // Count actions (case statements)
  let totalActions = 0;
  for (const file of readdirSync(dispatcherDir).filter(f => f.endsWith(".ts"))) {
    const content = readFileSync(path.join(dispatcherDir, file), "utf8");
    const cases = content.match(/case\s+["'][a-z_0-9]+["']/g) || [];
    totalActions += new Set(cases.map(c => c.match(/["']([a-z_0-9]+)["']/)[1])).size;
  }
  counts.actions = totalActions;

  // Count engines
  function countTsFiles(dir) {
    let count = 0;
    for (const item of readdirSync(dir)) {
      const fullPath = path.join(dir, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith(".") && item !== "__tests__") {
        count += countTsFiles(fullPath);
      } else if (item.endsWith(".ts") && !item.includes(".test.")) {
        count++;
      }
    }
    return count;
  }
  counts.engines = countTsFiles("src/engines");

  // Count registries
  counts.registries = readdirSync("src/registries")
    .filter(f => f.endsWith(".ts") && !f.includes(".test.")).length;

  // Count algorithms
  counts.algorithms = readdirSync("src/algorithms")
    .filter(f => f.endsWith(".ts") && !f.includes(".test.")).length;

  return counts;
}

// Main
const documented = extractDocumentedCounts();
const live = countLiveSystems();

console.log("=== Count Drift Check ===");
console.log("");
console.log("| Field | Documented | Live | Drift |");
console.log("|-------|-----------|------|-------|");

let hasDrift = false;
for (const key of ["dispatchers", "actions", "engines", "registries", "algorithms"]) {
  const doc = documented[key] || "N/A";
  const actual = live[key] || "N/A";
  const drift = typeof doc === "number" && typeof actual === "number"
    ? actual - doc
    : "?";
  const driftStr = drift === 0 ? "OK" : (drift > 0 ? `+${drift}` : `${drift}`);
  if (drift !== 0 && drift !== "?") hasDrift = true;
  console.log(`| ${key} | ${doc} | ${actual} | ${driftStr} |`);
}

console.log("");
if (hasDrift) {
  console.log("WARNING: Count drift detected! Update CLAUDE.md to match live values.");
  process.exit(1);
} else {
  console.log("OK: All counts match.");
  process.exit(0);
}
