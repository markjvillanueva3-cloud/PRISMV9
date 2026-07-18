#!/usr/bin/env node
/**
 * stub-hunt-inventory.mjs — discover + rank engine stubs by repair priority.
 *
 * STUB-HUNT-MS0 / U-STUB-INVENTORY (slot:bravo 2026-05-27). Scans
 * mcp-server/src/engines/*.ts for stub markers (U-EFF25 stub, "Stub: original
 * file lost", `{stub:true}` return, `{ok:false, stub:true}` return). For each
 * stub: extracts size, dispatcher wire-up count (how many `getEngine(...)`
 * call sites reference it), and emits a priority-ranked list. Highest
 * priority = wired stubs (operators expect work, get fallback) ordered by
 * call-site count + smallest-file-first (easiest wins).
 *
 * Usage:  node scripts/stub-hunt-inventory.mjs [--json]
 * Exit:   0 ok · 2 runtime error
 *
 * @module scripts/stub-hunt-inventory
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");

// Stub markers — tightened to only flag ACTIVE stubs:
// - return-shape markers ({stub:true} / {ok:false, stub:true}) prove the
//   function actually returns the placeholder shape
// - "STUB-RESCUE" + "@version 2.0.0 — restored" docstring lines INVALIDATE
//   the match (a rescued engine often retains the history mention)
// - the plain "U-EFF25 stub" or "Stub: original file lost" comments alone
//   no longer trigger — they need pairing with a return-shape marker
const ACTIVE_STUB_MARKERS = [
  /return\s+\{[^}]*\bstub:\s*true\b/i,
  /return\s+\{[^}]*\bok:\s*false,\s*stub:\s*true\b/i,
];

// Rescued-marker = explicit @version restoration tag added by stub-hunt commits.
const RESCUED_MARKERS = [
  /STUB-RESCUE/i,
  /restored from stub/i,
];

const RESCUED_THIS_SESSION = new Set([
  "BusinessSyncEngine",
  "CashFlowProjectionEngine",
  "MillingForceEngine",
  "MillProgramAnalyzerEngine",
  "EventBusEngine",
  "MillScientificPipelineEngine",
  "ToolSelectionRecommenderEngine",
  "ToolpathStrategyEngine",
  "MillPrintToProgramEngine",
  "CADFeatureRecognitionEngine",
  "CAMPhase5Stubs",
]);

/** Pure: classify file as ACTIVE stub (excludes rescued). */
export function isStub(src) {
  if (RESCUED_MARKERS.some((re) => re.test(src))) return false;
  return ACTIVE_STUB_MARKERS.some((re) => re.test(src));
}

/** Pure: classify file as RESCUED (was a stub, now restored). */
export function isRescued(src) {
  return RESCUED_MARKERS.some((re) => re.test(src));
}

/** Pure: count dispatcher references to an engine singleton name. */
export function countDispatcherRefs(dispSrcs, engineName) {
  const singletonName = engineName.charAt(0).toLowerCase() + engineName.slice(1);
  let count = 0;
  const re = new RegExp(`\\b${singletonName}\\b`, "g");
  for (const src of dispSrcs) {
    const matches = src.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

/** Pure: priority score — wired stubs first, smaller-file-first tiebreak. */
export function scorePriority(stub) {
  if (stub.rescued) return -1;
  const wireWeight = Math.min(stub.dispatcherRefs, 20) * 100;
  const sizeWeight = Math.max(0, 5000 - stub.bytes) / 50;
  return wireWeight + sizeWeight;
}

export function run({ enginesDir = ENGINES_DIR, dispatchersDir = DISPATCHERS_DIR, fsImpl = fs } = {}) {
  const dispSrcs = [];
  try {
    for (const name of fsImpl.readdirSync(dispatchersDir)) {
      if (!name.endsWith(".ts")) continue;
      dispSrcs.push(fsImpl.readFileSync(path.join(dispatchersDir, name), "utf8"));
    }
  } catch { /* fail-soft */ }

  const stubs = [];
  try {
    for (const name of fsImpl.readdirSync(enginesDir)) {
      if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
      const file = path.join(enginesDir, name);
      let src = "";
      let bytes = 0;
      try {
        src = fsImpl.readFileSync(file, "utf8");
        bytes = fsImpl.statSync(file).size;
      } catch { continue; }
      const engineName = name.replace(/\.ts$/, "");
      const active = isStub(src);
      const rescued = isRescued(src) || RESCUED_THIS_SESSION.has(engineName);
      if (!active && !rescued) continue;
      const dispatcherRefs = countDispatcherRefs(dispSrcs, engineName);
      stubs.push({ engineName, bytes, dispatcherRefs, rescued, file });
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  for (const s of stubs) s.priority = scorePriority(s);
  stubs.sort((a, b) => b.priority - a.priority);

  return {
    ok: true,
    scannedAt: new Date().toISOString(),
    totalStubs: stubs.length,
    rescuedCount: stubs.filter((s) => s.rescued).length,
    remainingCount: stubs.filter((s) => !s.rescued).length,
    stubs,
  };
}

export function renderTable(report) {
  const lines = [
    `# Stub-Hunt Inventory (STUB-HUNT-MS0 / U-STUB-INVENTORY)`,
    ``,
    `Scanned: ${report.scannedAt}`,
    `Total: ${report.totalStubs} · Rescued: ${report.rescuedCount} · Remaining: ${report.remainingCount}`,
    ``,
    `| # | Engine | Bytes | Dispatcher refs | Status | Priority |`,
    `|---|--------|------:|----------------:|--------|---------:|`,
  ];
  for (let i = 0; i < report.stubs.length; i++) {
    const s = report.stubs[i];
    const status = s.rescued ? "✓ RESCUED" : "✗ pending";
    lines.push(`| ${i + 1} | \`${s.engineName}\` | ${s.bytes} | ${s.dispatcherRefs} | ${status} | ${s.priority.toFixed(0)} |`);
  }
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("stub-hunt-inventory.mjs")) {
  try {
    const r = run();
    if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
    else process.stdout.write(`${renderTable(r)}\n`);
    process.exit(r.ok ? 0 : 2);
  } catch (e) {
    process.stderr.write(`stub-hunt-inventory: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
