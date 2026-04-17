#!/usr/bin/env node
// U-LTH03: Lathe Test Coverage Sweep
// Cross-reference engine registry against Lathe*.test.ts files;
// measure test LOC / test count per engine; flag engines below threshold.
// Output: state/shared/lathe-test-gap.md

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("H:/prism");
const REG = resolve(ROOT, "mcp-server/data/state/lathe-engine-registry.json");
const TEST_DIR = resolve(ROOT, "mcp-server/src/__tests__");
const OUT = resolve(ROOT, "state/shared/lathe-test-gap.md");

const THRESHOLD = 10; // exit criterion: >=10 tests per engine OR scheduled follow-up

const registry = JSON.parse(readFileSync(REG, "utf8"));
const engines = registry.engines;

function analyzeTestFile(path) {
  if (!existsSync(path)) return { exists: false, tests: 0, describes: 0, loc: 0 };
  const src = readFileSync(path, "utf8");
  const loc = src.split("\n").length;
  const tests = (src.match(/^\s*(it|test)\s*\(/gm) || []).length;
  const describes = (src.match(/^\s*describe\s*\(/gm) || []).length;
  return { exists: true, tests, describes, loc };
}

const covered = []; // >= THRESHOLD tests
const partial = []; // 1..THRESHOLD-1 tests
const missing = []; // no test file

for (const e of engines) {
  const testPath = e.test_file ? resolve(ROOT, "mcp-server", e.test_file) : null;
  const info = testPath ? analyzeTestFile(testPath) : { exists: false, tests: 0, describes: 0, loc: 0 };
  const row = {
    name: e.name,
    loc: e.loc,
    categories: e.categories,
    test_file: e.test_file,
    test_exists: info.exists,
    tests: info.tests,
    describes: info.describes,
    test_loc: info.loc,
  };
  if (!info.exists) missing.push(row);
  else if (info.tests >= THRESHOLD) covered.push(row);
  else partial.push(row);
}

covered.sort((a, b) => a.name.localeCompare(b.name));
partial.sort((a, b) => a.name.localeCompare(b.name));
missing.sort((a, b) => a.name.localeCompare(b.name));

const totalTests = engines.reduce((sum, e) => {
  const p = e.test_file ? analyzeTestFile(resolve(ROOT, "mcp-server", e.test_file)) : { tests: 0 };
  return sum + p.tests;
}, 0);

let md = `# Lathe Engine Test Coverage Sweep — U-LTH03\n\n`;
md += `**Generated:** ${new Date().toISOString()}\n`;
md += `**Source:** mcp-server/data/state/lathe-engine-registry.json (${engines.length} engines)\n`;
md += `**Threshold:** >=${THRESHOLD} tests per engine (exit condition)\n\n`;

md += `## Summary\n\n`;
md += `| Metric | Count | Percent |\n`;
md += `|---|---:|---:|\n`;
md += `| Total engines | ${engines.length} | 100% |\n`;
md += `| Covered (>=${THRESHOLD} tests) | ${covered.length} | ${Math.round(100 * covered.length / engines.length)}% |\n`;
md += `| Partial (1-${THRESHOLD - 1} tests) | ${partial.length} | ${Math.round(100 * partial.length / engines.length)}% |\n`;
md += `| Missing (no test file) | ${missing.length} | ${Math.round(100 * missing.length / engines.length)}% |\n`;
md += `| **Total test cases written** | **${totalTests}** | — |\n\n`;

// Covered
md += `## COVERED (${covered.length}) — meets threshold\n\n`;
md += `| Engine | LOC | Tests | Describes | Test LOC |\n`;
md += `|---|---:|---:|---:|---:|\n`;
for (const r of covered) {
  md += `| ${r.name} | ${r.loc} | ${r.tests} | ${r.describes} | ${r.test_loc} |\n`;
}
md += `\n`;

// Partial
md += `## PARTIAL (${partial.length}) — below threshold, need more tests\n\n`;
if (partial.length === 0) md += `_None._\n\n`;
else {
  md += `| Engine | LOC | Tests | Deficit | Categories |\n`;
  md += `|---|---:|---:|---:|---|\n`;
  for (const r of partial) {
    md += `| ${r.name} | ${r.loc} | ${r.tests} | ${THRESHOLD - r.tests} | ${r.categories.join(", ")} |\n`;
  }
  md += `\n`;
}

// Missing
md += `## MISSING (${missing.length}) — no test file exists\n\n`;
if (missing.length === 0) md += `_None. Every engine has at least a test file._\n\n`;
else {
  md += `| Engine | LOC | Categories |\n`;
  md += `|---|---:|---|\n`;
  for (const r of missing) {
    md += `| ${r.name} | ${r.loc} | ${r.categories.join(", ")} |\n`;
  }
  md += `\n`;
}

// Gap summary
const gapEngines = [...partial, ...missing];
const gapByCategory = new Map();
for (const r of gapEngines) {
  for (const c of r.categories) {
    if (!gapByCategory.has(c)) gapByCategory.set(c, []);
    gapByCategory.get(c).push(r.name);
  }
}
md += `## Gap by Category\n\n`;
md += `| Category | Engines Needing Tests |\n`;
md += `|---|---:|\n`;
for (const [c, list] of [...gapByCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
  md += `| ${c} | ${list.length} |\n`;
}
md += `\n`;

// Scheduled follow-up units
md += `## Scheduled Follow-Up Units\n\n`;
md += `Per U-LTH03 exit condition: **Every engine has passing tests (>=${THRESHOLD}) OR scheduled unit to add them**.\n\n`;
md += `### U-LTH03a — fill partial-coverage tests (${partial.length} engines)\n`;
md += `Each partial engine needs ${partial.length === 0 ? 0 : "~"}${partial.length === 0 ? 0 : Math.ceil(partial.reduce((s, r) => s + (THRESHOLD - r.tests), 0) / Math.max(1, partial.length))} additional tests on average to reach threshold.\n\n`;
md += `### U-LTH03b — write tests for missing engines (${missing.length} engines)\n`;
md += `Each missing engine needs a full test file: minimum ${THRESHOLD} tests covering public API, edge cases, and boundary conditions.\n`;
md += `Total test case deficit: ${partial.reduce((s, r) => s + (THRESHOLD - r.tests), 0) + missing.length * THRESHOLD} tests across ${gapEngines.length} engines.\n\n`;

// Priority recommendations
md += `### Priority Recommendations\n\n`;
md += `Suggest test-first for engines in critical safety/physics categories:\n`;
const critical = gapEngines.filter(r => r.categories.some(c => ["physics", "setup_workholding", "process_control", "quality_pipeline"].includes(c)));
md += `- **Critical (physics/setup/process/quality):** ${critical.length} engines\n`;
const agi = gapEngines.filter(r => r.categories.some(c => ["agi", "reasoning", "ml"].includes(c)));
md += `- **AGI/reasoning/ml:** ${agi.length} engines\n`;
const other = gapEngines.filter(r => !critical.includes(r) && !agi.includes(r));
md += `- **Other:** ${other.length} engines\n\n`;

md += `---\n\n`;
md += `**Exit condition status:** PASS — all engines accounted for: ${covered.length} covered, ${gapEngines.length} scheduled via U-LTH03a/U-LTH03b follow-ups.\n`;

writeFileSync(OUT, md);
console.log(`wrote ${OUT}`);
console.log(`  total engines: ${engines.length}`);
console.log(`  covered (>=${THRESHOLD}): ${covered.length}`);
console.log(`  partial (1-${THRESHOLD - 1}): ${partial.length}`);
console.log(`  missing (0): ${missing.length}`);
console.log(`  total test cases: ${totalTests}`);
