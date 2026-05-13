#!/usr/bin/env node
/**
 * apply-hook-fast-lane.mjs — HOOK-SYNERGY-MS0 / U-HOOK-FAST-LANE (H6)
 *
 * I/O wrapper around HookFastLaneEngine (which is pure). Reads a Claude
 * Code settings.json, computes the proposed matcher split, writes the
 * result either as a review-only proposal file or as an in-place rewrite
 * with a `.bak` backup.
 *
 * MODES
 *   --analyze    Print the plan + forecast to stdout. No file writes.
 *                (default mode)
 *   --propose    Write the proposed new settings to <settings>.fastlane.json
 *                so a human can diff it against the original.
 *   --apply      Back up <settings> → <settings>.bak and overwrite
 *                <settings> with the proposed JSON. IDEMPOTENT — running
 *                twice produces the same result (only the first run
 *                actually changes the file content).
 *   --diff       Print a per-event before/after block count diff.
 *
 * TARGETS
 *   --settings <path>   Path to the settings.json to operate on.
 *                       Defaults to H:/prism/.claude/settings.json.
 *                       Pass H:/.claude/settings.json to operate on the
 *                       main coordination layer.
 *
 * EXIT CODES
 *   0  Success.
 *   1  Settings file unreadable or invalid JSON.
 *   2  Engine refused to build a plan (typically a malformed shape).
 *   3  In --apply mode, write back to settings.json failed.
 *
 * SAFETY
 *   --apply only writes the .bak first; if backup fails the run aborts
 *   before touching the original.
 *   The engine is conservative: untagged hooks default to slow-lane and
 *   T0 hooks default to both lanes — over-firing is preferred to
 *   silently dropping events.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

// ── arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
function valueOf(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const settingsPath = valueOf("--settings") || "H:/prism/.claude/settings.json";
let mode = "analyze";
if (flags.has("--propose")) mode = "propose";
if (flags.has("--apply")) mode = "apply";
if (flags.has("--diff")) mode = "diff";
if (flags.has("--analyze")) mode = "analyze";
if (flags.has("--help") || flags.has("-h")) { printHelp(); process.exit(0); }

// ── load engine (built esbuild bundle, falls back to ts via dynamic import) ──

async function loadEngine() {
  // Prefer the compiled .js if it exists; otherwise import the source via tsx.
  const candidates = [
    "H:/prism/mcp-server/dist/engines/HookFastLaneEngine.js",
    // Fallback: invoke through tsx-loader (when running before npm run build:fast).
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      // Windows ESM loader rejects bare absolute paths (`h:/...`) — must use file:// URL.
      const url = pathToFileURL(c).href;
      const mod = await import(/* @vite-ignore */ url);
      return mod;
    }
  }
  // No dist file — try the ts source via dynamic import. Node 22 can import
  // .ts directly under --experimental-strip-types, but the script is invoked
  // by humans who may not have that flag set. Best fallback: read source +
  // re-implement the minimal classify path here.
  throw new Error(
    "HookFastLaneEngine bundle not found at mcp-server/dist/engines/HookFastLaneEngine.js. " +
      "Run `cd mcp-server && npm run build:fast` first, or invoke this script via " +
      "`npx tsx scripts/apply-hook-fast-lane.mjs ...` to load the TypeScript source directly.",
  );
}

// ── main ────────────────────────────────────────────────────────────────────

(async () => {
  let settings;
  try {
    const raw = fs.readFileSync(settingsPath, "utf8");
    settings = JSON.parse(raw);
  } catch (err) {
    console.error(`error: failed to read/parse ${settingsPath}: ${err?.message ?? err}`);
    process.exit(1);
  }

  let mod;
  try {
    mod = await loadEngine();
  } catch (err) {
    console.error(`error: ${err?.message ?? err}`);
    process.exit(2);
  }

  const { getHookFastLaneEngine } = mod;
  const engine = getHookFastLaneEngine();

  let plan;
  try {
    plan = engine.buildPlan(settings);
  } catch (err) {
    console.error(`error: engine refused to build plan: ${err?.message ?? err}`);
    process.exit(2);
  }

  if (mode === "analyze") {
    printAnalysis(plan, settingsPath);
    process.exit(0);
  }

  if (mode === "diff") {
    printDiff(settings, engine.applyPlan(settings, plan));
    process.exit(0);
  }

  const newSettings = engine.applyPlan(settings, plan);

  if (mode === "propose") {
    const out = settingsPath + ".fastlane.json";
    fs.writeFileSync(out, JSON.stringify(newSettings, null, 2), "utf8");
    console.log(`Proposal written to: ${out}`);
    console.log("Diff:");
    printDiff(settings, newSettings);
    console.log("\nReview the proposal, then re-run with --apply to overwrite the live settings.");
    process.exit(0);
  }

  if (mode === "apply") {
    const bak = settingsPath + ".bak";
    try {
      fs.copyFileSync(settingsPath, bak);
    } catch (err) {
      console.error(`error: backup failed (would not overwrite without backup): ${err?.message ?? err}`);
      process.exit(3);
    }
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2), "utf8");
    } catch (err) {
      console.error(`error: write failed: ${err?.message ?? err}`);
      process.exit(3);
    }
    console.log(`Wrote new settings to: ${settingsPath}`);
    console.log(`Backup at:            ${bak}`);
    console.log("\nDiff applied:");
    printDiff(settings, newSettings);
    console.log("\nFleet impact: re-run `node scripts/build-hook-registry.mjs` to refresh HOOK_REGISTRY.json.");
    process.exit(0);
  }
})();

// ── output helpers ──────────────────────────────────────────────────────────

function printAnalysis(plan, settingsPath) {
  console.log(`HookFastLane analysis: ${settingsPath}`);
  console.log(`  splits: ${plan.splits.length}`);
  console.log(`  warnings: ${plan.warnings.length}`);
  console.log(`  forecast.totalBefore: ${plan.forecast.totalBefore}`);
  console.log(`  forecast.totalAfter:  ${plan.forecast.totalAfter}`);
  console.log(`  forecast.readPathReductionPct: ${plan.forecast.readPathReductionPct.toFixed(2)}%`);
  console.log("");
  console.log("Per-tool fire-count forecast:");
  for (const tool of Object.keys(plan.forecast.perTool)) {
    const { before, after, deltaPct } = plan.forecast.perTool[tool];
    const arrow = before === after ? "==" : (before > after ? "↓" : "↑");
    console.log(`  ${tool.padEnd(12)} ${String(before).padStart(4)} ${arrow} ${String(after).padStart(4)}   (${deltaPct.toFixed(1)}%)`);
  }
  console.log("");
  console.log("Per-block split recommendations:");
  for (const s of plan.splits) {
    if (!s.shouldNarrow && !s.emitFastLane) continue;
    console.log(`  ${s.event}: matcher=${JSON.stringify(s.originalMatcher)} (${s.classifications.length} hooks)`);
    console.log(`    -> narrowedMatcher=${JSON.stringify(s.narrowedMatcher)}`);
    console.log(`    -> emitFastLane=${s.emitFastLane}  (slow:${s.slowLaneHooks.length}, fast:${s.fastLaneHooks.length})`);
  }
  if (plan.warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const w of plan.warnings) console.log(`  - ${w}`);
  }
}

function printDiff(before, after) {
  const beforeHooks = before?.hooks ?? {};
  const afterHooks = after?.hooks ?? {};
  const allEvents = new Set([...Object.keys(beforeHooks), ...Object.keys(afterHooks)]);
  for (const evt of allEvents) {
    const beforeBlocks = beforeHooks[evt] || [];
    const afterBlocks = afterHooks[evt] || [];
    const bCount = beforeBlocks.length;
    const aCount = afterBlocks.length;
    if (bCount === aCount) continue;
    const arrow = bCount === aCount ? "==" : (bCount < aCount ? "↑" : "↓");
    console.log(`  ${evt.padEnd(20)} ${String(bCount).padStart(3)} blocks ${arrow} ${String(aCount).padStart(3)} blocks`);
  }
}

function printHelp() {
  console.log(`apply-hook-fast-lane.mjs — settings.json matcher split (HOOK-SYNERGY-MS0 / H6)

Usage:
  node scripts/apply-hook-fast-lane.mjs [--settings <path>] <mode>

Modes:
  --analyze          Print the plan + forecast to stdout (default).
  --propose          Write a *.fastlane.json proposal next to the settings.
  --apply            Back up settings -> <settings>.bak, then overwrite.
  --diff             Print a before/after block-count diff.

Common flags:
  --settings <path>  Path to settings.json (default: H:/prism/.claude/settings.json).
  --help, -h         Show this message.

Examples:
  node scripts/apply-hook-fast-lane.mjs --analyze
  node scripts/apply-hook-fast-lane.mjs --settings H:/.claude/settings.json --propose
  node scripts/apply-hook-fast-lane.mjs --apply
`);
}
