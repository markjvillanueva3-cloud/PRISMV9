#!/usr/bin/env node
/**
 * Test Legitimacy Targeted Audit — PRISM WORKTREE-CONSOLIDATE-MS0 / U-FND04
 *
 * Applies the EXACT regex from .claude/hooks/test-legitimacy.mjs (line 27) to
 * every *.test.ts file under mcp-server/src/__tests__/. Distinguishes real
 * weak-EOL violations from the broader 1500 raw `toBeDefined` grep matches —
 * many of those are legitimate uses inside larger assertion chains.
 *
 * Outputs JSON to state/shared/TEST-LEGITIMACY-VIOLATIONS-2026-05-06.json
 * with per-file line numbers + 80-char snippets for triage.
 *
 * The exact pattern (copied verbatim from the hook):
 *   /\.to(?:BeDefined|BeTruthy|BeUndefined|BeFalsy)\s*\(\s*\)\s*;?\s*$/m
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { exit } from "node:process";

const TESTS_DIR = "H:/PRISM/mcp-server/src/__tests__";
const OUTPUT = "H:/PRISM/state/shared/TEST-LEGITIMACY-VIOLATIONS-2026-05-06.json";

// Verbatim from .claude/hooks/test-legitimacy.mjs:27
const WEAK_EOL_RE = /\.to(?:BeDefined|BeTruthy|BeUndefined|BeFalsy)\s*\(\s*\)\s*;?\s*$/;

// Use git ls-files for fast enumeration of tracked test files
const lsResult = spawnSync(
  "git",
  ["-C", "H:/PRISM", "ls-files", "mcp-server/src/__tests__"],
  { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
);
if (lsResult.status !== 0) {
  console.error(`ERROR: git ls-files failed: ${lsResult.stderr}`);
  exit(2);
}

const testFiles = lsResult.stdout
  .split("\n")
  .filter(Boolean)
  .filter(f => f.endsWith(".test.ts"));

console.log(`Scanning ${testFiles.length} *.test.ts files...`);

let rawGrepCount = 0;
const violations = [];

for (const relPath of testFiles) {
  const fullPath = `H:/PRISM/${relPath}`;
  let content;
  try { content = readFileSync(fullPath, "utf-8"); } catch { continue; }

  const lines = content.split("\n");
  const fileViolations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf("toBeDefined") !== -1 || line.indexOf("toBeTruthy") !== -1
        || line.indexOf("toBeUndefined") !== -1 || line.indexOf("toBeFalsy") !== -1) {
      rawGrepCount++;
      if (WEAK_EOL_RE.test(line)) {
        fileViolations.push({
          line: i + 1,
          snippet: line.trim().slice(0, 80),
        });
      }
    }
  }

  if (fileViolations.length > 0) {
    violations.push({
      path: relPath,
      violation_count: fileViolations.length,
      lines: fileViolations,
    });
  }
}

violations.sort((a, b) => b.violation_count - a.violation_count);

const totalViolations = violations.reduce((sum, v) => sum + v.violation_count, 0);

mkdirSync("H:/PRISM/state/shared", { recursive: true });

const output = {
  schemaVersion: "1.0.0",
  generated_at: new Date().toISOString(),
  source: "mcp-server/scripts/test-legitimacy-targeted.mjs",
  hook_regex_source: ".claude/hooks/test-legitimacy.mjs:27",
  pattern_inspected: String(WEAK_EOL_RE),
  total_files_scanned: testFiles.length,
  raw_grep_count: rawGrepCount,
  files_with_violations: violations.length,
  total_real_violations: totalViolations,
  violations,
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2), "utf-8");

console.log(`\n=== TEST LEGITIMACY AUDIT ===`);
console.log(`Files scanned:        ${testFiles.length}`);
console.log(`Raw grep matches:     ${rawGrepCount}  (broader includes legitimate uses)`);
console.log(`Real violations:      ${totalViolations}  (weak-EOL only — what hook actually blocks)`);
console.log(`Files with violations: ${violations.length}`);
console.log(`Reduction ratio:       ${((1 - totalViolations / Math.max(1, rawGrepCount)) * 100).toFixed(1)}%`);
console.log(`Output:                ${OUTPUT}`);
if (violations.length > 0) {
  console.log(`\nTop 5 files by violation count:`);
  for (const v of violations.slice(0, 5)) {
    console.log(`  ${v.violation_count.toString().padStart(4)}  ${v.path}`);
  }
}

exit(0);
