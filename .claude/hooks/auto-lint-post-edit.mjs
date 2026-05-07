#!/usr/bin/env node
/**
 * auto-lint-post-edit.mjs — PostToolUse hook
 * Runs ESLint on edited TypeScript files, auto-fixes simple issues.
 * Only shows errors (not warnings) to minimize token usage.
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// PostToolUse hooks receive input via stdin
let hookInput = {};
try {
  const stdin = readFileSync(0, "utf-8");
  hookInput = JSON.parse(stdin);
} catch {
  process.exit(0); // No input = nothing to lint
}
// Tool result structure: { tool_name, tool_input: { file_path }, tool_result }
const toolInput = hookInput.tool_input || {};
const filePath = toolInput.file_path || toolInput.filePath || hookInput.file_path || "";

// Only lint TypeScript files in mcp-server
if (!filePath || !filePath.match(/\.(ts|tsx)$/i)) {
  process.exit(0);
}

// Must be in mcp-server/src
if (!filePath.includes("mcp-server") || !filePath.includes("/src/")) {
  process.exit(0);
}

// Resolve to absolute path
const absPath = path.resolve(filePath);
if (!existsSync(absPath)) {
  process.exit(0);
}

const mcpRoot = absPath.replace(/[/\\]mcp-server[/\\].*$/, "/mcp-server");

try {
  // Run ESLint with auto-fix, errors only, compact format
  const result = execFileSync(
    "npx",
    [
      "eslint",
      "--fix",
      "--quiet", // errors only, no warnings
      "--format", "compact",
      "--max-warnings", "0",
      absPath,
    ],
    {
      cwd: mcpRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15000,
      shell: true,
    }
  );

  // If output exists, there were issues (even after fix)
  if (result.trim()) {
    console.log(`[LINT] ${path.basename(absPath)}:`);
    console.log(result.trim());
  }
} catch (err) {
  // ESLint exits non-zero on errors
  if (err.stdout?.trim()) {
    console.log(`[LINT ERROR] ${path.basename(absPath)}:`);
    console.log(err.stdout.trim());
  }
  if (err.stderr?.trim() && !err.stderr.includes("Oops!")) {
    console.error(err.stderr.trim());
  }
  // Don't block the edit — just report
}
