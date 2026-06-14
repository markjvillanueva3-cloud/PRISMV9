#!/usr/bin/env node
/**
 * audit-mcp-route-takerate.mjs — B5 from DORMANT-FEATURES-ENUMERATION-2026-05-26.
 *
 * Restores the audit script that `state/shared/dashboards/mcp-route-takerate-audit.md`
 * has been referencing for ~weeks without the file existing on disk (silent-overwrite
 * absorption per [[feedback_commit_to_slot_worktree]]).
 *
 * Reads `state/shared/mcp-route-suggest-stats.json` (the sidecar maintained by
 * `mcp-route-suggest.mjs` + `mcp-route-takeup.mjs`) and emits:
 *   - state/shared/dashboards/mcp-route-takerate-audit.json (machine-readable)
 *   - state/shared/dashboards/mcp-route-takerate-audit.md   (human-readable)
 *
 * Per-classifier recommendation legend:
 *   - **suppress**     — ≥30% of fleet fires AND <5% take-rate (biggest noise win)
 *   - **retune**       — <5% take-rate but <30% fire share (tighten trigger)
 *   - **verify-wiring**— ≥50 fires + 0 takes (almost certainly measurement gap)
 *   - **keep**         — take-rate ≥30% OR <10 fires (too small to judge)
 *
 * The dashboard MD already lists this exact legend — this script implements it.
 *
 * Usage:
 *   node scripts/audit-mcp-route-takerate.mjs            # write both dashboards
 *   node scripts/audit-mcp-route-takerate.mjs --json     # print JSON to stdout
 *   node scripts/audit-mcp-route-takerate.mjs --md       # print MD to stdout
 *   node scripts/audit-mcp-route-takerate.mjs --dry-run  # compute, don't write
 *
 * Pure-core (unit-testable): classify · summarize · renderMd. CLI is the IO layer.
 */

import fs from "node:fs";
import path from "node:path";

export const STATS_FILE = "H:/prism/state/shared/mcp-route-suggest-stats.json";
export const DASH_DIR = "H:/prism/state/shared/dashboards";
export const JSON_OUT = path.join(DASH_DIR, "mcp-route-takerate-audit.json");
export const MD_OUT = path.join(DASH_DIR, "mcp-route-takerate-audit.md");

// Thresholds — match the dashboard MD legend
const SUPPRESS_FIRE_SHARE = 0.30;
const SUPPRESS_TAKE_RATE_MAX = 0.05;
const VERIFY_WIRING_MIN_FIRES = 50;
const KEEP_TAKE_RATE_MIN = 0.30;
const KEEP_FIRES_MAX = 10;

/**
 * Pure-core: classify a single classifier row into one of the 4 recommendation
 * buckets. Exported for tests. `totalFires` is the fleet-wide fire count used
 * to compute share.
 */
export function classify({ fires, takes, totalFires }) {
  if (!Number.isFinite(fires) || fires <= 0) return "keep";
  const takeRate = takes / fires;
  const share = totalFires > 0 ? fires / totalFires : 0;

  // Precedence per dashboard MD doctrine: verify-wiring WINS over suppress when
  // both conditions are true. The MD explicitly warns "Do NOT suppress
  // classifiers based on a 0% take-rate that's a measurement artifact" — when
  // takes=0 + fires>=50 we treat the result as untrustworthy first, never as
  // a real take-rate signal. Tests in audit-mcp-route-takerate.test.mjs lock
  // this precedence.
  if (fires >= VERIFY_WIRING_MIN_FIRES && takes === 0) return "verify-wiring";
  if (share >= SUPPRESS_FIRE_SHARE && takeRate < SUPPRESS_TAKE_RATE_MAX) return "suppress";
  if (takeRate >= KEEP_TAKE_RATE_MIN) return "keep";
  if (fires < KEEP_FIRES_MAX) return "keep";
  return "retune";
}

/**
 * Pure-core: produce the audit summary from the stats sidecar object.
 * Returns { summary, rows, meta }. Exported for tests.
 */
export function summarize(stats, { now = new Date(), statsFile = STATS_FILE } = {}) {
  const byClassifier = (stats && stats.byClassifier) || {};
  const takeupTotals = (stats && stats.takeupTotals && stats.takeupTotals.byClassifier) || {};
  const totalFires = Number(stats && stats.totalFires) || 0;
  const totalTakes = Object.values(takeupTotals).reduce((s, n) => s + (Number(n) || 0), 0);

  const rows = Object.entries(byClassifier)
    .map(([classifier, fires]) => {
      const f = Number(fires) || 0;
      const takes = Number(takeupTotals[classifier]) || 0;
      return {
        classifier,
        fires: f,
        takes,
        takeRate: f > 0 ? takes / f : 0,
        share: totalFires > 0 ? f / totalFires : 0,
        recommendation: classify({ fires: f, takes, totalFires }),
      };
    })
    .sort((a, b) => b.fires - a.fires);

  const dominant = rows[0] || null;
  const fleetTakeRate = totalFires > 0 ? totalTakes / totalFires : 0;

  // Health signal: if totalFires > 0 but takeupTotals is empty, the takeup
  // wiring is broken (the dashboard's original failure mode). Window-extend
  // landed in commit 1e7327522f raised this from "0% across the fleet" to a
  // measurable take-rate; if we still see 0 takes on >1000 fires the
  // takeup-credit map probably needs more classifier→action mappings.
  let healthSignal = "ok";
  if (totalFires > 0 && totalTakes === 0) healthSignal = "takeup-wiring-broken";
  else if (totalFires > 0 && fleetTakeRate < 0.05) healthSignal = "below-target-take-rate";

  return {
    summary: {
      totalFires,
      totalTakes,
      fleetTakeRate: Number(fleetTakeRate.toFixed(4)),
      dominantClassifier: dominant ? dominant.classifier : null,
      dominantShare: dominant ? Number(dominant.share.toFixed(4)) : 0,
      healthSignal,
    },
    rows,
    meta: {
      ts: now.toISOString(),
      statsFile,
    },
  };
}

function pct(x) { return `${(x * 100).toFixed(1)}%`; }

/**
 * Pure-core: render the markdown dashboard from a summary. Exported for tests.
 */
export function renderMd(audit) {
  const { summary, rows, meta } = audit;
  const out = [];
  out.push("# MCP Route Suggest Take-Rate Audit");
  out.push("");
  out.push(`**Generated:** ${meta.ts}`);
  out.push(`**Source:** \`${meta.statsFile}\``);
  out.push("");
  out.push("## Fleet summary");
  out.push("");
  out.push("| Metric | Value |");
  out.push("|--------|-------|");
  out.push(`| Total fires | ${summary.totalFires} |`);
  out.push(`| Total takes | ${summary.totalTakes} |`);
  out.push(`| Fleet take-rate | ${pct(summary.fleetTakeRate)} |`);
  out.push(`| Dominant classifier | \`${summary.dominantClassifier ?? "—"}\` (${pct(summary.dominantShare)} of fires) |`);
  out.push(`| Health signal | **${summary.healthSignal}** |`);
  out.push("");

  if (summary.healthSignal === "takeup-wiring-broken") {
    out.push("## ⚠ Health signal: takeup-wiring-broken");
    out.push("");
    out.push("The take-rate sidecar `takeupTotals.byClassifier` is empty while " +
      `${summary.totalFires} fires have accumulated. Either:`);
    out.push("1. `mcp-route-takeup.mjs` is NOT wired into PostToolUse in any active settings.json — verify with: `grep -l mcp-route-takeup .claude/settings.json C:/Users/wompu/.claude/settings.json`");
    out.push("2. It IS wired but no MCP tool call has matched `extractMcpAction()`'s `prism_*:*` pattern — likely if the MCP server (port 3100) has been offline.");
    out.push("3. The hook is wired and MCP calls happen but `classifiersTakenBy()` finds no recent fire within `_WINDOW_MS` of the MCP call (default 600s post-2026-05-26 U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND).");
    out.push("");
    out.push("Action: confirm wiring first. Do NOT suppress classifiers based on a 0% take-rate that's a measurement artifact.");
    out.push("");
  } else if (summary.healthSignal === "below-target-take-rate") {
    out.push("## ℹ Health signal: below-target-take-rate");
    out.push("");
    out.push(`Take-rate ${pct(summary.fleetTakeRate)} is below the 30% target. ` +
      "Window-fix landed (U-MCP-ROUTE-TAKEUP-WINDOW-EXTEND); remaining shortfall " +
      "is likely from (a) classifiers that fire too eagerly (see per-classifier table), " +
      "or (b) `_ACTION_TO_CLASSIFIERS` map missing entries for some MCP actions the model uses.");
    out.push("");
  }

  out.push("## Per-classifier ranking (by fire count)");
  out.push("");
  out.push("| Classifier | Fires | Takes | Take-rate | Share of fires | Recommendation |");
  out.push("|------------|-------|-------|-----------|----------------|----------------|");
  for (const r of rows) {
    out.push(`| \`${r.classifier}\` | ${r.fires} | ${r.takes} | ${pct(r.takeRate)} | ${pct(r.share)} | **${r.recommendation}** |`);
  }
  out.push("");

  out.push("## Recommendation legend");
  out.push("");
  out.push("- **suppress** — ≥30% of fleet fires AND <5% take-rate. Biggest noise reduction available.");
  out.push("- **retune** — <5% take-rate but <30% fire share. Tighten trigger conditions.");
  out.push("- **verify-wiring** — ≥50 fires + 0 takes. Almost certainly a measurement gap, not a real take-rate.");
  out.push("- **keep** — take-rate ≥30%, or too few fires (<10) to judge.");
  out.push("");

  out.push("## Re-run");
  out.push("");
  out.push("```bash");
  out.push("node H:/prism/scripts/audit-mcp-route-takerate.mjs");
  out.push("```");
  return out.join("\n") + "\n";
}

function loadStats(statsFile = STATS_FILE) {
  return JSON.parse(fs.readFileSync(statsFile, "utf8"));
}

function writeFiles(audit) {
  if (!fs.existsSync(DASH_DIR)) fs.mkdirSync(DASH_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(audit, null, 2), "utf8");
  fs.writeFileSync(MD_OUT, renderMd(audit), "utf8");
}

function main() {
  const argv = process.argv.slice(2);
  const wantJson = argv.includes("--json");
  const wantMd = argv.includes("--md");
  const dryRun = argv.includes("--dry-run");

  let stats;
  try {
    stats = loadStats();
  } catch (e) {
    process.stderr.write(`audit-mcp-route-takerate: cannot read ${STATS_FILE} — ${e && e.message ? e.message : e}\n`);
    process.exit(2);
  }

  const audit = summarize(stats);

  if (wantJson) { process.stdout.write(JSON.stringify(audit, null, 2) + "\n"); return; }
  if (wantMd) { process.stdout.write(renderMd(audit)); return; }
  if (dryRun) {
    process.stdout.write(`dry-run: would write ${JSON_OUT} + ${MD_OUT}\n` +
      `  totalFires=${audit.summary.totalFires} totalTakes=${audit.summary.totalTakes} ` +
      `fleetTakeRate=${pct(audit.summary.fleetTakeRate)} health=${audit.summary.healthSignal}\n`);
    return;
  }

  writeFiles(audit);
  process.stdout.write(
    `wrote ${JSON_OUT}\nwrote ${MD_OUT}\n` +
    `totalFires=${audit.summary.totalFires} totalTakes=${audit.summary.totalTakes} ` +
    `fleetTakeRate=${pct(audit.summary.fleetTakeRate)} health=${audit.summary.healthSignal}\n`
  );
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("audit-mcp-route-takerate.mjs");
if (invokedDirectly) main();
