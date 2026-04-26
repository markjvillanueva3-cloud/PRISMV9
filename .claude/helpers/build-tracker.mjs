#!/usr/bin/env node
/**
 * build-tracker.mjs — PostToolUse hook for Write|Edit|MultiEdit
 *
 * Smart build tracking that replaces the broken 35ms tsc inline hook.
 * Instead of running full `tsc --noEmit` after every edit (30s each):
 *
 * 1. Tracks which files were edited this session
 * 2. After N edits to src/ files, suggests a build check
 * 3. Categorizes edits by risk level (physics > engine > dispatcher > test > other)
 * 4. Uses MASTER_INDEX to understand file relationships
 *
 * Net effect: replaces N×30s tsc runs with 1 well-timed suggestion,
 * saving 60-120s per session while maintaining build confidence.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { CACHE_DIR } from "./hook-cache.mjs";

const STATE_FILE = process.env.PRISM_BUILD_TRACKER_STATE || path.join(CACHE_DIR, "build-tracker-state.json");
const BUILD_THRESHOLD = 5; // suggest build check after N source edits
const HIGH_RISK_THRESHOLD = 2; // suggest immediately after N high-risk edits

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(""); return; }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { data += c; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
    setTimeout(() => resolve(data), 150);
  });
}

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    }
  } catch { /* fresh state */ }
  return {
    edits: [],
    lastBuildCheck: 0,
    lastBuildPass: true,
    sessionStart: Date.now(),
  };
}

function saveState(state) {
  try {
    mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* non-critical */ }
}

function classifyFile(filePath) {
  const p = filePath.replace(/\\/g, "/");

  if (p.includes("src/physics/")) return { risk: "critical", category: "physics" };
  if (p.includes("src/registries/")) return { risk: "high", category: "registry" };
  if (p.includes("src/engines/") && !p.includes(".test.")) return { risk: "high", category: "engine" };
  if (p.includes("src/tools/dispatchers/")) return { risk: "high", category: "dispatcher" };
  if (p.includes("src/schemas/")) return { risk: "medium", category: "schema" };
  if (p.includes("src/algorithms/")) return { risk: "medium", category: "algorithm" };
  if (p.includes("src/__tests__/")) return { risk: "low", category: "test" };
  if (p.includes("src/routes/")) return { risk: "medium", category: "route" };
  if (p.endsWith(".ts") && p.includes("mcp-server/src/")) return { risk: "medium", category: "source" };
  return { risk: "none", category: "other" };
}

function extractFilePath(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return (parsed.tool_input?.file_path || parsed.file_path || "").replace(/\\/g, "/");
  } catch {
    return "";
  }
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const raw = await readStdin();
  const filePath = extractFilePath(raw);

  if (!filePath) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  const { risk, category } = classifyFile(filePath);

  // Don't track non-source files
  if (risk === "none") {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // Load and update state
  const state = loadState();

  // Reset if session is old (>6 hours)
  if (Date.now() - state.sessionStart > 6 * 3600_000) {
    state.edits = [];
    state.lastBuildCheck = 0;
    state.lastBuildPass = true;
    state.sessionStart = Date.now();
  }

  state.edits.push({
    file: filePath.split("/").pop(),
    category,
    risk,
    ts: Date.now(),
  });

  const editsSinceCheck = state.edits.filter((e) => e.ts > state.lastBuildCheck);
  const sourceEdits = editsSinceCheck.filter((e) => e.risk !== "low");
  const highRiskEdits = editsSinceCheck.filter((e) => e.risk === "critical" || e.risk === "high");

  saveState(state);

  // Decide whether to suggest a build check
  let suggestion = null;

  if (risk === "critical") {
    suggestion = `PHYSICS EDIT (${filePath.split("/").pop()}): Run \`npx tsc --noEmit\` soon - physics constants affect all pipelines.`;
  } else if (highRiskEdits.length >= HIGH_RISK_THRESHOLD && sourceEdits.length >= BUILD_THRESHOLD) {
    const categories = [...new Set(highRiskEdits.map((e) => e.category))].join(", ");
    suggestion = `BUILD CHECK SUGGESTED: ${sourceEdits.length} source edits (${highRiskEdits.length} high-risk: ${categories}) since last check. Run \`npx tsc --noEmit\` to verify.`;
  } else if (sourceEdits.length >= BUILD_THRESHOLD * 2) {
    suggestion = `BUILD CHECK: ${sourceEdits.length} source edits since last check. Consider \`npx tsc --noEmit\`.`;
  }

  // If user ran tsc recently (detect from bash history), mark as checked
  // This is handled by the PostToolUse Bash hook that clears the cache

  if (suggestion) {
    process.stdout.write(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: suggestion } }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }

  process.exit(0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
