#!/usr/bin/env node
/**
 * audit-backend-fe-coverage.mjs -- the INVERSE of audit-fe-route-action-contract.
 *
 * That audit asks "does every FE-referenced action resolve to a real dispatcher action?" (FE -> BE).
 * THIS audit asks the BACKEND -> FRONTEND direction: "which dispatcher actions have NO frontend
 * consumer at all?" -- the unexposed backend capabilities the SPA could surface but does not.
 *
 * Method (deterministic, reproducible, cron-able):
 *   1. buildDispatcherMap() (reused tested parser) -> every prism_* dispatcher's full action set.
 *   2. Collect every quoted string literal in web/src (the FE action-reference universe).
 *   3. An action whose EXACT string appears NOWHERE in web/src is a HIGH-CONFIDENCE ORPHAN
 *      (no FE surface). An action that DOES appear is "referenced" -- an UPPER BOUND on wired
 *      (a common word like "estimate"/"compare" can coincidentally match), so we report the
 *      orphan set (high-confidence) as the actionable gap, and the referenced count as a ceiling.
 *
 * Output: state/shared/dashboards/BACKEND-FE-COVERAGE.{json,md} -- per-dispatcher coverage + the
 * orphan-action lists, sorted by orphan count (biggest unexposed surface first).
 *
 * Usage: node scripts/audit-backend-fe-coverage.mjs [--json] [--top N]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDispatcherMap } from "./lib/fe-route-action-contract.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DISPATCHERS = path.join(REPO, "mcp-server/src/tools/dispatchers");
const WEB_SRC = path.join(REPO, "mcp-server/web/src");

/** Every quoted ('/"/`) string literal token in the FE source tree. */
export function collectFeStringLiterals(webDir) {
  const found = new Set();
  const RE = /['"`]([a-zA-Z][a-zA-Z0-9_]{2,})['"`]/g;
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === "__tests__") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const src = fs.readFileSync(p, "utf8");
        for (const m of src.matchAll(RE)) found.add(m[1]);
      }
    }
  })(webDir);
  return found;
}

/** Pure coverage computation -- exported for tests. */
export function computeCoverage(dispatcherMap, feStrings) {
  const rows = [];
  for (const [tool, info] of dispatcherMap) {
    const acts = [...info.actions];
    if (acts.length === 0) continue;
    const referenced = acts.filter((a) => feStrings.has(a));
    const orphan = acts.filter((a) => !feStrings.has(a));
    rows.push({
      tool,
      file: info.file,
      total: acts.length,
      referencedCeiling: referenced.length,
      orphan: orphan.length,
      coverageCeilingPct: +((referenced.length / acts.length) * 100).toFixed(1),
      orphanActions: orphan.sort(),
    });
  }
  rows.sort((a, b) => b.orphan - a.orphan);
  const totalActions = rows.reduce((s, r) => s + r.total, 0);
  const totalOrphan = rows.reduce((s, r) => s + r.orphan, 0);
  return {
    schemaVersion: "1.0.0",
    dispatchers: rows.length,
    totalActions,
    totalReferencedCeiling: totalActions - totalOrphan,
    totalOrphan,
    overallCoverageCeilingPct: totalActions ? +(((totalActions - totalOrphan) / totalActions) * 100).toFixed(1) : 0,
    rows,
  };
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const topI = args.indexOf("--top");
  const top = topI >= 0 ? Number(args[topI + 1]) || 15 : 15;

  const { map } = buildDispatcherMap(DISPATCHERS);
  const feStrings = collectFeStringLiterals(WEB_SRC);
  const report = computeCoverage(map, feStrings);

  const outDir = path.join(REPO, "state/shared/dashboards");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "BACKEND-FE-COVERAGE.json"), JSON.stringify(report, null, 2));

  const md = [];
  md.push("# Backend -> Frontend coverage (which dispatcher actions have NO FE consumer)");
  md.push("");
  md.push("> INVERSE of the FE->BE contract audit. An action whose string appears nowhere in web/src is a");
  md.push("> high-confidence ORPHAN (unexposed backend capability). `referencedCeiling` is an UPPER bound");
  md.push("> (a common word may coincidentally match) -- the orphan list is the actionable signal.");
  md.push("> Regen: `node scripts/audit-backend-fe-coverage.mjs`.");
  md.push("");
  md.push(`**${report.dispatchers} dispatchers, ${report.totalActions} actions; ${report.totalOrphan} orphan (no FE string), ${report.overallCoverageCeilingPct}% referenced-ceiling.**`);
  md.push("");
  md.push("| dispatcher | total | orphan | cov-ceiling% | file |");
  md.push("|---|---|---|---|---|");
  for (const r of report.rows.slice(0, top)) {
    md.push(`| ${r.tool} | ${r.total} | ${r.orphan} | ${r.coverageCeilingPct} | ${r.file} |`);
  }
  fs.writeFileSync(path.join(outDir, "BACKEND-FE-COVERAGE.md"), md.join("\n") + "\n");

  if (asJson) console.log(JSON.stringify({ summary: { dispatchers: report.dispatchers, totalActions: report.totalActions, totalOrphan: report.totalOrphan, overallCoverageCeilingPct: report.overallCoverageCeilingPct }, top: report.rows.slice(0, top).map((r) => ({ tool: r.tool, total: r.total, orphan: r.orphan })) }, null, 2));
  else {
    console.log(`Backend->FE coverage: ${report.dispatchers} dispatchers, ${report.totalActions} actions, ${report.totalOrphan} orphan (${report.overallCoverageCeilingPct}% referenced-ceiling)`);
    for (const r of report.rows.slice(0, top)) console.log(`  ${r.tool.padEnd(28)} total=${String(r.total).padStart(4)} orphan=${String(r.orphan).padStart(4)} cov<=${r.coverageCeilingPct}%`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
