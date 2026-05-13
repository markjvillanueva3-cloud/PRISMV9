#!/usr/bin/env node
// tier: T4
/**
 * pretool-change-radius.mjs — PreToolUse Write|Edit hook
 *
 * Reads stdin → extracts file_path → asks ChangeImpactRadiusEngine for a
 * blast-radius report → injects a concise summary as hook context so Claude
 * sees what will break BEFORE the edit lands.
 *
 * Non-blocking, time-budgeted (300ms hard kill).
 *
 * NOTE: Previously emitted a "deferred" advisory on every tool call even
 * when no real impact report was available. That was burning hundreds of
 * tokens per edit with no actionable content. The advisory now fires ONLY
 * when a real cached report exists.
 *
 * @module hooks/pretool-change-radius
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TIME_BUDGET_MS = 300;
const CACHE_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".claude",
  "cache",
  "change-radius-cache.json"
);
const CACHE_TTL_MS = 60_000;

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return { entries: {} };
}

function saveCache(c) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(c));
  } catch { /* ignore */ }
}

function formatReport(r) {
  const emoji = {
    low: "🟢",
    medium: "🟡",
    high: "🟠",
    critical: "🔴",
  }[r.riskLevel] || "⚪";
  const lines = [
    `${emoji} CHANGE IMPACT RADIUS — ${r.riskLevel.toUpperCase()} (confidence ${Math.round(r.confidence * 100)}%)`,
    `  File: ${path.basename(r.filePath)} [${r.changeKind}]`,
    `  Direct: ${r.direct.length} | Transitive: ${r.transitive.length} | Tests: ${r.tests.length}`,
    `  Hooks fired: ${r.hooks.length} | Dispatchers: ${r.dispatchers.length}`,
    `  Est. build Δ: ~${r.estBuildDelta}ms | Computed in ${r.computedInMs}ms`,
  ];
  if (r.hooks.length > 0 && r.hooks.length <= 5) {
    lines.push(`  Hooks: ${r.hooks.join(", ")}`);
  }
  if (r.dispatchers.length > 0 && r.dispatchers.length <= 5) {
    lines.push(`  Dispatchers: ${r.dispatchers.join(", ")}`);
  }
  if (r.warnings.length > 0) {
    lines.push(`  ⚠ ${r.warnings.join("; ")}`);
  }
  return lines.join("\n");
}

function isDeferredStub(report) {
  if (!report) return true;
  if (Array.isArray(report.warnings) && report.warnings.some((w) => /deferred/i.test(w))) return true;
  if ((report.direct?.length ?? 0) === 0 &&
      (report.transitive?.length ?? 0) === 0 &&
      (report.tests?.length ?? 0) === 0 &&
      (report.confidence ?? 0) < 0.5) return true;
  return false;
}

async function main() {
  const killer = setTimeout(() => {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }, TIME_BUDGET_MS);

  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    clearTimeout(killer);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const { tool_name, tool_input } = input;
  if (!["Write", "Edit", "MultiEdit"].includes(tool_name)) {
    clearTimeout(killer);
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const filePath = tool_input?.file_path || tool_input?.notebook_path;
  if (!filePath) {
    clearTimeout(killer);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (!/\.(ts|tsx)$/.test(filePath)) {
    clearTimeout(killer);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const cache = loadCache();
  const now = Date.now();
  const cached = cache.entries[filePath];

  if (cached && now - cached.timestamp < CACHE_TTL_MS && !isDeferredStub(cached.report)) {
    clearTimeout(killer);
    console.log(
      JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: formatReport(cached.report),
        },
      })
    );
    return;
  }

  clearTimeout(killer);
  console.log(JSON.stringify({ continue: true }));

  setImmediate(() => {
    try {
      cache.entries[filePath] = {
        timestamp: now,
        report: {
          filePath,
          changeKind: tool_name === "Write" ? "create" : "edit",
          direct: [],
          transitive: [],
          tests: [],
          hooks: [],
          dispatchers: [],
          estBuildDelta: 0,
          confidence: 0.3,
          riskLevel: "low",
          computedInMs: 0,
          warnings: ["deferred — call prism_dev:change_radius_predict_sync for full report"],
        },
      };
      saveCache(cache);
    } catch { /* ignore */ }
  });
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
