#!/usr/bin/env node
// scripts/galaxy-addressability-report.mjs
// ADVISORY galaxy->slot addressability report (HERMES-CAPABILITY-C1 governance, slot:bravo 2026-06-18).
//
// The live CONSUMER of the slot-galaxy-map reverse resolver (U-GALAXY-REVERSE-RESOLVER). Runs
// galaxyAddressabilityReport over the real galaxy population (mcp-server/src/engines/<g>/ dirs with a
// CLAUDE.md) and surfaces the NEEDS-OWNER backlog -- the galaxies that resolve only via the orchestrator
// FALLBACK (source:"fallback") and therefore still need an explicit owner-slot in SLOT_GALAXY_MAP. This
// is the actionable other half of HERMES-CONTROL-READINESS blocker #4 ("assign the unowned galaxies").
//
// READ-ONLY + ADVISORY -- it routes nothing, controls nothing (the bravo soul refuses
// unsafe-fleet-control-before-governance; this is a report, not the enforcing router). Exit 0 always.
//
// Usage:  node scripts/galaxy-addressability-report.mjs [--json] [--engines <dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { galaxyAddressabilityReport } from "./lib/slot-galaxy-map.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENGINES = path.resolve(__dirname, "..", "mcp-server", "src", "engines");

/**
 * Pure (fs injected): list real galaxy dir names under enginesRoot. A galaxy is a non-dot directory
 * containing a CLAUDE.md (skips engines/.claude, the rules dir, and any dir without doctrine).
 */
export function listGalaxyDirs({ enginesRoot, fsImpl = fs } = {}) {
  let entries;
  try { entries = fsImpl.readdirSync(enginesRoot, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter((d) => d.isDirectory() && !d.name.startsWith(".")
      && fsImpl.existsSync(path.join(enginesRoot, d.name, "CLAUDE.md")))
    .map((d) => d.name)
    .sort();
}

/**
 * Pure: the assign-an-owner backlog = galaxies addressable ONLY via the fallback backstop (no explicit
 * SLOT_GALAXY_MAP owner). Sorted galaxy names. These are what blocker #4 asks the operator to assign.
 */
export function needsOwnerBacklog(report) {
  if (!report || !Array.isArray(report.perGalaxy)) return [];
  return report.perGalaxy.filter((r) => r.source === "fallback").map((r) => r.galaxy).sort();
}

/** Pure: render the addressability report as human-readable text. */
export function renderAddressabilityReport(report) {
  if (!report) return "galaxy-addressability: no report";
  const backlog = needsOwnerBacklog(report);
  const lines = [];
  lines.push(`# Galaxy -> slot addressability`);
  lines.push(``);
  lines.push(`galaxies=${report.total}  explicit-owner=${report.explicit}  fallback=${report.fallback}  unaddressable=${report.unaddressable}  allAddressable=${report.allAddressable}`);
  lines.push(``);
  if (backlog.length === 0) {
    lines.push(`All galaxies have an explicit owner-slot -- no assign-an-owner backlog.`);
  } else {
    lines.push(`## NEEDS OWNER (${backlog.length}) -- addressable only via fallback; assign an owner-slot in scripts/lib/slot-galaxy-map.mjs SLOT_GALAXY_MAP (operator + sierra/golf):`);
    for (const g of backlog) lines.push(`  - ${g}`);
  }
  if (report.unaddressable > 0) {
    lines.push(``);
    lines.push(`## WARNING: ${report.unaddressable} galaxy(ies) are UNADDRESSABLE (routing dead-end) -- should be impossible with a fallback configured.`);
  }
  return lines.join("\n");
}

/** Build the full report for a galaxy population (read from disk by default). */
export function buildReport({ enginesRoot = DEFAULT_ENGINES, fsImpl = fs, fallbackSlot } = {}) {
  const galaxies = listGalaxyDirs({ enginesRoot, fsImpl });
  const report = galaxyAddressabilityReport(galaxies, fallbackSlot ? { fallbackSlot } : {});
  return { ...report, needsOwner: needsOwnerBacklog(report) };
}

// CLI guard. `argv1 &&` guards the empty-argv1 case (node -e / programmatic import): without it,
// thisUrl.endsWith("") is ALWAYS true, so importing this module would run main on import.
const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
const thisUrl = import.meta.url.replace(/\\/g, "/");
if (argv1 && (thisUrl === `file:///${argv1}` || thisUrl.endsWith(argv1))) {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const engIdx = args.indexOf("--engines");
  const enginesRoot = engIdx >= 0 && args[engIdx + 1] ? args[engIdx + 1] : DEFAULT_ENGINES;
  const report = buildReport({ enginesRoot });
  if (asJson) process.stdout.write(JSON.stringify(report) + "\n");
  else process.stdout.write(renderAddressabilityReport(report) + "\n");
  process.exit(0);
}
