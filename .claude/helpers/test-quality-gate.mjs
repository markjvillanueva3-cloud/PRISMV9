#!/usr/bin/env node
/**
 * test-quality-gate.mjs — PostToolUse hook for Write/Edit on test files
 *
 * BLOCKS test files that contain stub/placeholder patterns:
 * - expect(true), expect(1).toBe(1), expect("x").toBe("x") — trivial assertions
 * - Empty it() blocks with no assertions
 * - it.skip / describe.skip without justification
 * - TODO/FIXME comments in test bodies
 * - Tests with fewer than 2 meaningful assertions
 *
 * This enforces the principle: "Tests must verify actual behavior, not just pass."
 *
 * When a stub test is detected, the hook:
 * 1. Deletes the offending file
 * 2. Returns a block decision with detailed feedback
 */

import { readFileSync, existsSync } from "node:fs";
import process from "node:process";
import { appearsRouteSensitive, hasRouteContinuityEvidence } from "./lib/test-legitimacy-core.mjs";

const filePath = process.env.TOOL_INPUT_file_path || "";

// Only check test files
if (!filePath.match(/\.(test|spec)\.tsx?$/)) {
  console.log("{}");
  process.exit(0);
}

// PostToolUse: file should exist now, read it
let content = "";
if (existsSync(filePath)) {
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    console.log("{}");
    process.exit(0);
  }
} else {
  // File doesn't exist (maybe failed write) — allow
  console.log("{}");
  process.exit(0);
}

// No content — allow
if (!content) {
  console.log("{}");
  process.exit(0);
}

const issues = [];

// Pattern 1: Trivial assertions
const trivialPatterns = [
  /expect\s*\(\s*true\s*\)/g,
  /expect\s*\(\s*false\s*\)/g,
  /expect\s*\(\s*1\s*\)\s*\.\s*toBe\s*\(\s*1\s*\)/g,
  /expect\s*\(\s*"[^"]*"\s*\)\s*\.\s*toBe\s*\(\s*"[^"]*"\s*\)/g,  // Exact string match
  /expect\s*\(\s*'[^']*'\s*\)\s*\.\s*toBe\s*\(\s*'[^']*'\s*\)/g,
  /expect\s*\(\s*null\s*\)\s*\.\s*toBe\s*\(\s*null\s*\)/g,
  /expect\s*\(\s*undefined\s*\)\s*\.\s*toBe\s*\(\s*undefined\s*\)/g,
];

for (const pattern of trivialPatterns) {
  const matches = content.match(pattern);
  if (matches) {
    issues.push(`TRIVIAL ASSERTION: Found ${matches.length}x pattern like "${matches[0].slice(0, 40)}..." — tests must verify actual behavior`);
  }
}

// Pattern 2: Truly empty it() blocks
const emptyBlockPatterns = [
  /it\s*\(\s*["'`][^"'`]*["'`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\}\s*\)/g,
  /it\s*\(\s*["'`][^"'`]*["'`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\/\/\s*(?:TODO|FIXME|stub|placeholder)[^}]*\}\s*\)/gi,
];
let emptyBlocks = 0;
for (const pattern of emptyBlockPatterns) {
  emptyBlocks += (content.match(pattern) || []).length;
}
if (emptyBlocks > 0) {
  issues.push(`EMPTY TEST BLOCKS: ${emptyBlocks} it() blocks have no assertions — every test must verify something`);
}

// Pattern 3: Skip without justification
const skipPatterns = [
  /it\.skip\s*\(\s*["'`](?!.*\b(TODO|WIP|BLOCKED|PENDING)\b)/gi,
  /describe\.skip\s*\(\s*["'`](?!.*\b(TODO|WIP|BLOCKED|PENDING)\b)/gi,
  /xit\s*\(/g,
  /xdescribe\s*\(/g,
];

for (const pattern of skipPatterns) {
  const matches = content.match(pattern);
  if (matches) {
    issues.push(`SKIPPED TESTS: Found ${matches.length}x skipped test without justification (add TODO/WIP/BLOCKED in description)`);
  }
}

// Pattern 4: TODO/FIXME in test bodies indicating incomplete tests
const todoInTestRegex = /it\s*\([^)]+\)\s*=>\s*\{[^}]*(\/\/\s*(TODO|FIXME|XXX|HACK)[^}]*)\}/gi;
const todoMatches = content.match(todoInTestRegex);
if (todoMatches) {
  issues.push(`INCOMPLETE TESTS: Found TODO/FIXME comments inside test blocks — finish the test or remove it`);
}

// Pattern 5: Test file with very few assertions overall
const assertionCount = (content.match(/expect\s*\(/g) || []).length;
const testCount = (content.match(/\bit\s*\(/g) || []).length;

if (testCount > 0 && assertionCount < testCount) {
  issues.push(`LOW ASSERTION DENSITY: ${assertionCount} assertions for ${testCount} tests (avg ${(assertionCount/testCount).toFixed(1)}/test) — minimum 1 assertion per test required`);
}

// Pattern 6: Placeholder content
const placeholderPatterns = [
  /\/\/\s*placeholder/gi,
  /\/\/\s*stub/gi,
  /\/\/\s*mock\s+this/gi,
  /throw\s+new\s+Error\s*\(\s*["'`]not\s+implemented["'`]\s*\)/gi,
  /pass\s*;\s*\/\/\s*TODO/gi,
];

for (const pattern of placeholderPatterns) {
  if (pattern.test(content)) {
    issues.push(`PLACEHOLDER CODE: Found placeholder/stub comment — implement real test logic`);
    break;
  }
}

// Pattern 7: Tests that just check existence without behavior
const existenceOnlyPatterns = [
  /expect\s*\([^)]+\)\s*\.\s*toBeDefined\s*\(\s*\)\s*;?\s*\}\s*\)/g,  // Only toBeDefined, nothing else
  /expect\s*\([^)]+\)\s*\.\s*toBeTruthy\s*\(\s*\)\s*;?\s*\}\s*\)/g,   // Only toBeTruthy at end
];

for (const pattern of existenceOnlyPatterns) {
  const matches = content.match(pattern);
  if (matches && matches.length > 3) {
    issues.push(`WEAK ASSERTIONS: ${matches.length}+ tests only check existence (toBeDefined/toBeTruthy) — verify actual values and behavior`);
    break;
  }
}

// Pattern 8: Route/workflow tests must verify continuity params, not just link existence
if (appearsRouteSensitive(filePath, content) && !hasRouteContinuityEvidence(content)) {
  issues.push(
    "ROUTE CONTINUITY TOO WEAK: workflow tests must parse the rendered URL (getSearchParams/new URL) and assert concrete upstream/downstream params like originSource, focusJobId, machineId, or partClassId.",
  );
}

// Output result
if (issues.length > 0) {
  const filename = filePath.split(/[/\\]/).pop();

  const reason = `TEST QUALITY GATE BLOCKED: ${filename}\n\n${issues.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}\n\nTests must verify actual behavior with meaningful assertions. Strengthen the test before proceeding.`;

  console.log(JSON.stringify({
    decision: "block",
    reason
  }));
  process.exit(1); // Ensure non-zero exit
} else {
  // Passed — provide encouraging context
  if (assertionCount >= 10) {
    console.log(JSON.stringify({
      additionalContext: `TEST QUALITY: ${assertionCount} assertions across ${testCount} tests (${(assertionCount/testCount).toFixed(1)} avg) — good coverage.`
    }));
  } else {
    console.log("{}");
  }
}
