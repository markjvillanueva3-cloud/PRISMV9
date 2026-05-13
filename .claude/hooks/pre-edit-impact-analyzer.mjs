#!/usr/bin/env node
// tier: T1
// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * Pre-Edit Impact Analyzer Hook
 *
 * Fires on PreToolUse for Edit/Write operations.
 * Predicts which tests/files might break and warns about high-impact changes.
 *
 * Risk levels:
 * - low: proceed without warning
 * - medium: INFO with affected tests
 * - high: WARN with suggestion to run tests first
 * - critical: STRONG WARN about blast radius
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, basename, resolve } from "node:path";

const STATS_FILE = "H:/prism/state/edit-impact-stats.json";
const SRC_ROOT = "H:/prism/mcp-server/src";

// Simple dependency graph (built on first run, cached)
let graphCache = null;
let graphBuiltAt = 0;
const CACHE_TTL_MS = 300000; // 5 minutes

function loadStats() {
  try {
    return JSON.parse(readFileSync(STATS_FILE, "utf-8"));
  } catch {
    return { predictions: 0, highRiskBlocked: 0, testsRun: 0 };
  }
}

function saveStats(stats) {
  const dir = dirname(STATS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

function parseImports(content) {
  const imports = [];
  const regex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function isTestFile(filePath) {
  const name = basename(filePath);
  return name.includes(".test.") || name.includes(".spec.") || filePath.includes("__tests__");
}

function isEngineFile(filePath) {
  return basename(filePath).endsWith("Engine.ts") && !isTestFile(filePath);
}

function assessRisk(filePath, importedByCount, isEngine) {
  let score = 0;

  score += Math.min(importedByCount * 5, 30);
  if (isEngine) score += 15;
  if (filePath.includes("dispatcher")) score += 20;
  if (filePath.includes("schema")) score += 15;
  if (filePath.includes("physics") || filePath.includes("constants")) score += 20;

  if (score >= 50) return "critical";
  if (score >= 35) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function formatWarning(riskLevel, filePath, suggestions) {
  const icons = { low: "✓", medium: "ℹ", high: "⚠", critical: "🚨" };
  const icon = icons[riskLevel] || "•";

  let msg = `${icon} Edit impact: ${riskLevel.toUpperCase()}`;
  if (suggestions.length > 0) {
    msg += `\n   ${suggestions.slice(0, 2).join("\n   ")}`;
  }
  return msg;
}

async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf-8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = input.tool_name || "";
  if (!["Edit", "Write"].includes(toolName)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || "";

  if (!filePath || !filePath.includes("mcp-server/src")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Skip test files - they don't cause cascading breaks
  if (isTestFile(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const stats = loadStats();
  stats.predictions++;

  const isEngine = isEngineFile(filePath);
  const suggestions = [];

  // Check for direct test
  const baseName = basename(filePath).replace(/\.tsx?$/, "");
  const testPath = filePath.replace("/engines/", "/__tests__/").replace(".ts", ".test.ts");

  if (isEngine && !existsSync(testPath)) {
    suggestions.push(`No test found - consider adding ${baseName}.test.ts`);
  } else if (existsSync(testPath)) {
    suggestions.push(`Run: npx vitest run ${basename(testPath)}`);
  }

  // Simple heuristic for impact
  const importedByCount = isEngine ? 3 : 1; // Engines typically have more dependents
  const riskLevel = assessRisk(filePath, importedByCount, isEngine);

  if (filePath.includes("dispatcher")) {
    suggestions.push("Dispatcher edit: verify action enum + case handler match");
  }
  if (filePath.includes("schema")) {
    suggestions.push("Schema edit: check all consumers handle new shape");
  }

  saveStats(stats);

  if (riskLevel === "low") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const warning = formatWarning(riskLevel, filePath, suggestions);

  if (riskLevel === "critical") {
    stats.highRiskBlocked++;
    saveStats(stats);
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: warning } }));
  } else {
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: warning } }));
  }
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
