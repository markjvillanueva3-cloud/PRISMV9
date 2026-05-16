/**
 * rgs-plan-coverage.mjs
 * Coverage + anti-rot dashboard for the RGS tool-plan sidecar.
 *
 * Exported pure function:
 *   coverage({ openUnits, sidecar, outcomes }) → CoverageReport
 *
 * CLI:
 *   node scripts/rgs-plan-coverage.mjs          # text dashboard
 *   node scripts/rgs-plan-coverage.mjs --json   # machine-readable JSON
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const SIDECAR_PATH = path.join(REPO_ROOT, "state", "shared", "roadmap-tool-plans.json");
const OUTCOMES_PATH = path.join(REPO_ROOT, "state", "shared", "roadmap-tool-plan-outcomes.jsonl");

// ---------------------------------------------------------------------------
// Pure core function
// ---------------------------------------------------------------------------

/**
 * @typedef {{ key: string }} OpenUnit
 * @typedef {{ schemaVersion: string, plans: Record<string, { pipelines: Array<{skill:string}>, source?: string }> }} Sidecar
 * @typedef {{ v: number, ts: string, unitKey: string, outcome: "shipped"|"blocked"|"reverted", predictedPipelines: string[] }} OutcomeRecord
 *
 * @typedef {{
 *   totalOpen: number,
 *   withPlan: number,
 *   withoutPlan: number,
 *   coveragePct: number,
 *   perPipeline: Record<string, { shipped: number, blocked: number, reverted: number, total: number, shipRate: number }>,
 *   bySource: Record<string, number>
 * }} CoverageReport
 *
 * @param {{ openUnits: OpenUnit[], sidecar: Sidecar|null, outcomes: OutcomeRecord[] }} opts
 * @returns {CoverageReport}
 */
export function coverage({ openUnits, sidecar, outcomes }) {
  const totalOpen = openUnits.length;
  const plans = sidecar?.plans ?? {};

  // Coverage counts
  let withPlan = 0;
  for (const unit of openUnits) {
    if (Object.prototype.hasOwnProperty.call(plans, unit.key)) {
      withPlan++;
    }
  }
  const withoutPlan = totalOpen - withPlan;
  const coveragePct = totalOpen === 0
    ? 0
    : Math.round((withPlan / totalOpen) * 1000) / 10; // 1 decimal

  // perPipeline aggregation from outcomes
  const perPipeline = {};
  for (const rec of outcomes) {
    const pips = Array.isArray(rec.predictedPipelines) ? rec.predictedPipelines : [];
    for (const skill of pips) {
      if (!perPipeline[skill]) {
        perPipeline[skill] = { shipped: 0, blocked: 0, reverted: 0, total: 0, shipRate: 0 };
      }
      const entry = perPipeline[skill];
      entry.total++;
      if (rec.outcome === "shipped")  entry.shipped++;
      else if (rec.outcome === "blocked")  entry.blocked++;
      else if (rec.outcome === "reverted") entry.reverted++;
    }
  }
  // Apply Laplace smoothing: shipRate = (shipped+1)/(shipped+blocked+reverted+2)
  for (const skill of Object.keys(perPipeline)) {
    const e = perPipeline[skill];
    e.shipRate = (e.shipped + 1) / (e.shipped + e.blocked + e.reverted + 2);
  }

  // bySource: count plans by .source. The sidecar stores each ToolPlan FLAT
  // (plans[key] IS the plan — no .plan nesting), so read entry.source directly.
  const bySource = {};
  for (const entry of Object.values(plans)) {
    const src = entry?.source ?? "unknown";
    bySource[src] = (bySource[src] ?? 0) + 1;
  }

  return { totalOpen, withPlan, withoutPlan, coveragePct, perPipeline, bySource };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function loadSidecar() {
  try {
    const raw = fs.readFileSync(SIDECAR_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadOutcomes() {
  try {
    const raw = fs.readFileSync(OUTCOMES_PATH, "utf8");
    return raw
      .split("\n")
      .filter(l => l.trim())
      .map(l => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function renderText(report, sidecarMissing) {
  const lines = [];

  const pctStr = sidecarMissing
    ? "0.0% (no sidecar)"
    : `${report.coveragePct}%`;

  lines.push(`% open units with fresh plan: ${pctStr}`);
  lines.push("=".repeat(48));

  if (sidecarMissing) {
    lines.push("");
    lines.push("  No sidecar found — run /rgs tool-plan --all-open to generate tool plans.");
    lines.push(`  Expected: ${SIDECAR_PATH}`);
    lines.push("");
    lines.push(`  Total open units : ${report.totalOpen}`);
    lines.push(`  With plan        : 0`);
    lines.push(`  Without plan     : ${report.totalOpen}`);
    return lines.join("\n");
  }

  lines.push("");
  lines.push(`  Total open units : ${report.totalOpen}`);
  lines.push(`  With plan        : ${report.withPlan}`);
  lines.push(`  Without plan     : ${report.withoutPlan}`);
  lines.push(`  Coverage         : ${report.coveragePct}%`);

  // bySource
  lines.push("");
  lines.push("Plans by source:");
  const sources = Object.keys(report.bySource).sort();
  if (sources.length === 0) {
    lines.push("  (none)");
  } else {
    for (const src of sources) {
      lines.push(`  ${src.padEnd(16)} ${report.bySource[src]}`);
    }
  }

  // perPipeline
  lines.push("");
  lines.push("Per-pipeline outcomes (Laplace ship-rate):");
  const skills = Object.keys(report.perPipeline).sort();
  if (skills.length === 0) {
    lines.push("  (no outcome records yet)");
  } else {
    lines.push(`  ${"skill".padEnd(24)} ${"shipped".padStart(7)} ${"blocked".padStart(7)} ${"reverted".padStart(8)} ${"total".padStart(6)} ${"shipRate".padStart(9)}`);
    lines.push("  " + "-".repeat(66));
    for (const skill of skills) {
      const e = report.perPipeline[skill];
      lines.push(
        `  ${skill.padEnd(24)} ${String(e.shipped).padStart(7)} ${String(e.blocked).padStart(7)} ${String(e.reverted).padStart(8)} ${String(e.total).padStart(6)} ${e.shipRate.toFixed(3).padStart(9)}`
      );
    }
  }

  return lines.join("\n");
}

// Only run CLI when invoked directly
const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const { enumerateOpenUnits, loadEnvelopes, loadProgress } =
    await import("./lib/rgs-unit-enum.mjs");

  const jsonMode = process.argv.includes("--json");

  const sidecar = loadSidecar();
  const outcomes = loadOutcomes();
  const openUnits = enumerateOpenUnits({
    envelopes: loadEnvelopes(),
    progress:  loadProgress(),
  });

  const report = coverage({ openUnits, sidecar, outcomes });
  const sidecarMissing = sidecar === null;

  if (jsonMode) {
    console.log(JSON.stringify({ sidecarMissing, ...report }, null, 2));
  } else {
    console.log(renderText(report, sidecarMissing));
  }
}
