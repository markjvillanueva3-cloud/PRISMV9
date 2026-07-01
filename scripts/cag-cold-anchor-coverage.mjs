#!/usr/bin/env node
// scripts/cag-cold-anchor-coverage.mjs
// Aggregates the per-session CAG cold-cache-anchor sidecars
// (state/shared/cag-route/cold-cache-anchor-<sid>.json) into a MEASURABLE coverage
// metric. Closes the prior gap (loop-eng-gaps assessment 2026-06-10): the cold anchor
// records WHICH cold-tier doctrine sources it anchored per session, but nothing
// aggregated them -- "you cannot currently measure the cold-hit rate." This makes the
// CAG synergy a deterministic number: per-source presence rate across recent sessions,
// overall coverage, avg cold bytes anchored/session, and the worst-covered sources.
//
// CAG (cache-augmented generation) is a fleet-wide AI-systems synergy leg (PSN, the
// cold anchor carries claude-md + wiki-index + galaxy-cards + memory-md = per-galaxy
// awareness). This is the measurement substrate for it -- ALL-GALAXY-WIDE, not domain.
//
//   node scripts/cag-cold-anchor-coverage.mjs            # human summary
//   node scripts/cag-cold-anchor-coverage.mjs --json     # full JSON
//   node scripts/cag-cold-anchor-coverage.mjs --window N # last N sessions (default 200)
// Writes the canonical report to state/shared/cag-route/COLD-ANCHOR-COVERAGE.json.

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export const SIDECAR_DIR = process.env.PRISM_CAG_SIDECAR_DIR || "H:/prism/state/shared/cag-route";
export const REPORT_PATH = join(SIDECAR_DIR, "COLD-ANCHOR-COVERAGE.json");
const DEFAULT_WINDOW = 200;

export function listSidecars(dir = SIDECAR_DIR) {
  try {
    return readdirSync(dir)
      .filter((f) => f.startsWith("cold-cache-anchor-") && f.endsWith(".json"))
      .map((f) => {
        const p = join(dir, f);
        let mtimeMs = 0;
        try { mtimeMs = statSync(p).mtimeMs; } catch { /* skip */ }
        return { f, p, mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs); // newest first
  } catch { return []; }
}

export function loadSidecar(p) {
  try {
    const o = JSON.parse(readFileSync(p, "utf-8"));
    if (!o || o.kind !== "cag-cold-cache-anchor" || !Array.isArray(o.coldSources)) return null;
    return o;
  } catch { return null; }
}

// Pure aggregation over an array of sidecar objects -> coverage report. Testable core.
export function aggregateCoverage(sidecars) {
  const bySource = new Map(); // id -> { seen, present, actualBytesSum, declaredBytesSum }
  let sessions = 0;
  let totalColdBytes = 0;
  for (const sc of sidecars) {
    if (!sc || !Array.isArray(sc.coldSources)) continue;
    sessions++;
    let sessionBytes = 0;
    for (const cs of sc.coldSources) {
      if (!cs || typeof cs.id !== "string") continue;
      let rec = bySource.get(cs.id);
      if (!rec) { rec = { id: cs.id, seen: 0, present: 0, actualBytesSum: 0, declaredBytesSum: 0 }; bySource.set(cs.id, rec); }
      rec.seen++;
      rec.declaredBytesSum += Number(cs.declaredSizeBytes) || 0;
      if (cs.present === true) {
        rec.present++;
        const ab = Number(cs.actualSizeBytes) || 0;
        rec.actualBytesSum += ab;
        sessionBytes += ab;
      }
    }
    totalColdBytes += sessionBytes;
  }
  const sources = [...bySource.values()].map((r) => ({
    id: r.id,
    seen: r.seen,
    present: r.present,
    presenceRate: r.seen ? Math.round((r.present / r.seen) * 1000) / 1000 : 0,
    avgActualBytes: r.present ? Math.round(r.actualBytesSum / r.present) : 0,
  })).sort((a, b) => a.presenceRate - b.presenceRate); // worst coverage first
  const overallPresence = sources.length
    ? sources.reduce((s, x) => s + x.presenceRate, 0) / sources.length
    : 0;
  return {
    sessions,
    sourceCount: sources.length,
    overallPresenceRate: Math.round(overallPresence * 1000) / 1000,
    avgColdBytesPerSession: sessions ? Math.round(totalColdBytes / sessions) : 0,
    sources,
  };
}

export function buildReport({ window = DEFAULT_WINDOW, dir = SIDECAR_DIR } = {}) {
  const files = listSidecars(dir).slice(0, Math.max(1, window));
  const sidecars = files.map((x) => loadSidecar(x.p)).filter(Boolean);
  const report = aggregateCoverage(sidecars);
  report.window = window;
  report.scanned = files.length;
  report.loaded = sidecars.length;
  return report;
}

function fmt(report) {
  const lines = [];
  lines.push("CAG COLD-ANCHOR COVERAGE (cache-augmented generation synergy -- fleet-wide)");
  lines.push(`  sessions=${report.sessions}  sources=${report.sourceCount}  overall-presence=${(report.overallPresenceRate * 100).toFixed(1)}%  avg-cold/session=${(report.avgColdBytesPerSession / 1024).toFixed(0)}KB`);
  lines.push("  per-source presence rate (worst first):");
  for (const s of report.sources) {
    const flag = s.presenceRate < 0.9 ? " <-- COVERAGE GAP" : "";
    lines.push(`    ${(s.presenceRate * 100).toFixed(0).padStart(3)}%  ${s.id.padEnd(18)} (${s.present}/${s.seen}, ${(s.avgActualBytes / 1024).toFixed(0)}KB)${flag}`);
  }
  return lines.join("\n");
}

function main(argv) {
  const wIdx = argv.indexOf("--window");
  const window = wIdx >= 0 ? Math.max(1, parseInt(argv[wIdx + 1], 10) || DEFAULT_WINDOW) : DEFAULT_WINDOW;
  const report = buildReport({ window });
  try {
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, JSON.stringify({ schemaVersion: 1, generatedAt: report.generatedAt || null, ...report }, null, 2));
  } catch { /* fail-soft: still print */ }
  if (argv.includes("--json")) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(fmt(report) + "\n");
}

import { fileURLToPath } from "node:url";
const __isCLI = process.argv[1] && (() => {
  try { return fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; }
})();
if (__isCLI) main(process.argv.slice(2));
