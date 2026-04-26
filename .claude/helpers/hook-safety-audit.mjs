#!/usr/bin/env node
/**
 * hook-safety-audit.mjs — Audit and fix common hook safety issues
 *
 * Issues detected and fixed:
 * 1. async main() without .catch() — can hang on unhandled rejection
 * 2. stdin reading without timeout — can hang forever
 * 3. Missing JSON output on error path — can cause parse errors
 * 4. process.exit() without JSON output — can hang waiting for output
 */
import fs from "node:fs";
import path from "node:path";

const HOOKS_DIR = "H:\\prism\\.claude\\hooks";
const HELPERS_DIR = "H:\\prism\\.claude\\helpers";

const issues = [];

function auditFile(filePath, fileName) {
  const content = fs.readFileSync(filePath, "utf8");
  const fileIssues = [];

  // Issue 1: async main() without .catch()
  // Only flag if there's an async main() definition but no main().catch() call anywhere
  if (/async\s+function\s+main\s*\(/.test(content)) {
    // Check if main().catch() exists (the call, not the definition)
    if (!/main\s*\(\s*\)\s*\.catch/.test(content)) {
      fileIssues.push({
        type: "NO_CATCH",
        severity: "high",
        message: "async main() called without .catch() — unhandled rejections can hang",
        fixable: true,
      });
    }
  }

  // Issue 2: stdin reading without timeout
  if (/process\.stdin\.on\s*\(\s*['"]data/.test(content)) {
    if (!/setTimeout/.test(content)) {
      fileIssues.push({
        type: "NO_STDIN_TIMEOUT",
        severity: "medium",
        message: "stdin reading without timeout protection",
        fixable: false,
      });
    }
  }

  // Issue 3: catch block without JSON output
  const catchBlocks = content.match(/catch\s*(?:\([^)]*\))?\s*\{[^}]*\}/g) || [];
  for (const block of catchBlocks) {
    if (!block.includes("JSON.stringify") && !block.includes("process.stdout") && !block.includes("console.log")) {
      // Silent catch is okay if there's a final JSON output
      if (!/process\.stdout\.write.*JSON\.stringify/.test(content.slice(content.indexOf(block)))) {
        fileIssues.push({
          type: "SILENT_CATCH",
          severity: "low",
          message: "catch block may not output JSON — could cause hang",
          fixable: false,
        });
        break; // Only report once per file
      }
    }
  }

  // Issue 4: hookSpecificOutput for wrong event type (already fixed by other script)
  // Just audit here
  for (const event of ["Stop", "SessionStart", "PreCompact"]) {
    const pattern = new RegExp(`hookSpecificOutput.*hookEventName.*["']${event}["']`);
    if (pattern.test(content)) {
      fileIssues.push({
        type: "WRONG_SCHEMA",
        severity: "high",
        message: `${event} event using hookSpecificOutput instead of systemMessage`,
        fixable: true,
      });
    }
  }

  // Issue 5: spawn without unref or error handler
  if (/spawn\s*\(/.test(content)) {
    if (!/\.unref\(\)/.test(content) && !/detached:\s*true/.test(content)) {
      fileIssues.push({
        type: "SPAWN_NO_UNREF",
        severity: "medium",
        message: "spawn() without unref() — child process may keep hook alive",
        fixable: false,
      });
    }
  }

  if (fileIssues.length > 0) {
    issues.push({ file: fileName, issues: fileIssues });
  }

  return fileIssues;
}

function fixFile(filePath, fileIssues) {
  if (!fileIssues.some(i => i.fixable)) return false;

  let content = fs.readFileSync(filePath, "utf8");
  let fixed = false;

  for (const issue of fileIssues) {
    if (!issue.fixable) continue;

    if (issue.type === "NO_CATCH") {
      // Fix: standalone main(); call → main().catch(() => { ... });
      // Must NOT match function definitions like "async function main()"
      const beforeFix = content;
      // Match main() at end of file or as standalone statement, not in function definition
      content = content.replace(
        /^(main\s*\(\s*\)\s*);?\s*$/gm,
        'main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });'
      );
      if (content !== beforeFix) {
        fixed = true;
        console.log(`  ✓ Fixed NO_CATCH in ${path.basename(filePath)}`);
      }
    }
  }

  if (fixed) {
    fs.writeFileSync(filePath, content);
  }
  return fixed;
}

function processDirectory(dir, fix = false) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let fixedCount = 0;

  for (const file of files) {
    if (file.isDirectory()) continue;
    if (!file.name.endsWith(".mjs") && !file.name.endsWith(".js")) continue;
    if (file.name.includes(".disabled")) continue;

    const filePath = path.join(dir, file.name);
    const fileIssues = auditFile(filePath, file.name);

    if (fix && fileIssues.length > 0) {
      if (fixFile(filePath, fileIssues)) {
        fixedCount++;
      }
    }
  }
  return fixedCount;
}

// Parse args
const args = process.argv.slice(2);
const shouldFix = args.includes("--fix");

console.log("=== Hook Safety Audit ===");
console.log(`Mode: ${shouldFix ? "AUDIT + FIX" : "AUDIT ONLY"}`);
console.log("");

processDirectory(HOOKS_DIR, shouldFix);
processDirectory(HELPERS_DIR, shouldFix);

// Summary
console.log("\n=== Summary ===");
const bySeverity = { high: 0, medium: 0, low: 0 };
for (const { issues: fileIssues } of issues) {
  for (const issue of fileIssues) {
    bySeverity[issue.severity]++;
  }
}

console.log(`Total files with issues: ${issues.length}`);
console.log(`High severity: ${bySeverity.high}`);
console.log(`Medium severity: ${bySeverity.medium}`);
console.log(`Low severity: ${bySeverity.low}`);

if (issues.length > 0) {
  console.log("\n=== Issues by File ===");
  for (const { file, issues: fileIssues } of issues) {
    console.log(`\n${file}:`);
    for (const issue of fileIssues) {
      const fixTag = issue.fixable ? " [FIXABLE]" : "";
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}${fixTag}`);
    }
  }
}

if (!shouldFix && bySeverity.high > 0) {
  console.log("\nRun with --fix to auto-fix fixable issues");
}
