#!/usr/bin/env node
// SIERRA-VAULT-OPS/U-VAULT-HEALTH (slot:sierra, 2026-06-17) -- unified vault-health dashboard.
//
// A 2nd-brain needs ONE health surface, not five scattered advisory reports. This
// AGGREGATES the four vault advisory detectors built across the SIERRA-VAULT-OPS
// arc into a single operator-facing rollup (per-detector headline + freshness +
// an overall status), and surfaces the regen command for any source that is stale
// or missing. It REUSES each detector's persisted JSON report (R8 -- aggregates,
// never re-implements a scan); it does NOT run the detectors (the contradiction
// lint needs a GPU, and freshness is the operator's call). READ-ONLY apart from
// the rollup JSON it writes.
//
// Sources aggregated (each writes its own report under state/shared/):
//   vault-rot-sentinel        -> vault-rot-report.json        (stale AND orphaned notes)
//   vault-supersession-detector -> memory-supersession-report.json (stale-as-current dated memos)
//   lint-memory-contradictions  -> memory-contradictions.json  (doctrine NLI conflicts)
//   vault-link-doctor --ambiguous -> vault-ambiguous-links-report.json (unhealable ambiguous links)
//
// CLI:
//   node scripts/vault-health.mjs              # console dashboard + write rollup
//   node scripts/vault-health.mjs --json       # machine rollup
//   node scripts/vault-health.mjs --no-write   # console only
//   node scripts/vault-health.mjs --stale-days 14
// Knob: PRISM_VAULT_HEALTH_STALE_DAYS=<N> (default 7).

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = resolve(__dirname, "..");
const STATE_DIR = resolve(PRISM_ROOT, "state/shared");
const OUT_PATH = resolve(STATE_DIR, "vault-health.json");
const MS_PER_DAY = 86_400_000;
const DEFAULT_STALE_DAYS = 7;
// Contradiction-scan coverage below this -> a clean (0-found) result is NOT a clean
// bill of health (R12): the NLI lint caps candidate pairs (e.g. 8/1105 = 0.7%), so a
// 0 over a sliver of pairs means "barely looked", not "doctrine verified consistent".
const LOW_COVERAGE = 0.5;
// An NLI "contradict" verdict whose reason is shorter than this is treated as
// LOW-CONFIDENCE (the lint prompt MANDATES a one-line reason; a missing/trivial one
// is non-compliant output -- observed: a mild semantic tension flagged as a hard
// contradiction with an empty reason). Reason-less verdicts do NOT count toward the WARN.
const MIN_REASON_LEN = 10;

// Each source: how to read its report file + extract the one headline metric. The
// headline returns {value, severity, detail}; severity is ok | info | warn.
export const SOURCES = [
  {
    key: "rot", file: "vault-rot-report.json", title: "vault-rot (stale AND orphaned)",
    regen: "node scripts/vault-rot-sentinel.mjs --write",
    headline: (r) => {
      const v = Number(r.rottingCount ?? 0);
      return { value: v, severity: v > 0 ? "warn" : "ok", detail: `${r.scanned ?? "?"} scanned, ${r.orphaned ?? "?"} orphaned` };
    },
  },
  {
    key: "supersession", file: "memory-supersession-report.json", title: "supersession (stale-as-current)",
    // --write MEASURES (refreshes this report); episodic dated series are excluded from candidacy
    // (U-SIERRA-SUPERSEDE-SERIES-FIX). The series-safe --mark HEALS genuine re-versions but is an
    // operator-judgment manual action, not the nightly path (3-of-3 arm-C reverted unattended marking).
    regen: "node scripts/vault-supersession-detector.mjs --write",
    headline: (r) => {
      const v = Number(r.candidateCount ?? r.unmarked ?? 0);
      return { value: v, severity: v > 0 ? "warn" : "ok", detail: `${r.alreadyMarked ?? 0} marked, ${r.supersessionStems ?? 0} stems` };
    },
  },
  {
    key: "contradiction", file: "memory-contradictions.json", title: "doctrine contradictions",
    regen: "node scripts/lint-memory-contradictions.mjs",
    headline: (r) => {
      const t = r.totals ?? {};
      // Confidence-gate: count only REASONED (confirmed) contradictions toward the WARN.
      // A "contradict" verdict with an empty/trivial reason is low-confidence NLI noise
      // (the prompt mandates a one-line reason); surface those separately, never as a defect.
      // Falls back to totals.contradictions when no per-finding array is present (back-compat).
      const allC = Array.isArray(r.contradictions) ? r.contradictions : null;
      const reasonedCount = allC ? allC.filter((c) => c && typeof c.reason === "string" && c.reason.trim().length >= MIN_REASON_LEN).length : null;
      const v = reasonedCount != null ? reasonedCount : Number(t.contradictions ?? 0);
      const lowConf = allC ? allC.length - reasonedCount : 0;
      // "we didn't actually look" is NOT healthy (R12): a no-NLI-model run or an
      // aborted run leaves contradictions:0 over 0 checked pairs -- a green 0 there
      // would mask an unscanned vault. Flag needsScan so it never reads OK.
      const checked = Number(t.pairsChecked ?? 0);
      const total = Number(t.pairsTotal ?? 0);
      const unscanned = r.model == null || (total > 0 && checked === 0);
      if (unscanned) return { value: v, severity: "info", needsScan: true, detail: `NOT SCANNED${r.model == null ? " (no NLI model)" : " (0/" + (t.pairsTotal ?? "?") + " pairs checked)"}` };
      // A real contradiction always WARNs. A clean (0-found) result is OK only when coverage
      // is adequate; at LOW COVERAGE a 0 is "barely looked", so surface lowCoverage (info)
      // instead of a false-clean OK(green) (R12 -- sibling of needsScan above).
      const cov = total > 0 ? checked / total : 1;
      // Display the CHECKED coverage (checked/total) -- the metric the lowCoverage judgment
      // above is based on and the one that matches the "checked/total pairs" numerator. The
      // report's own `coverage` field is pairsConsidered/pairsTotal (candidate-SELECTION
      // coverage), which diverges from checked under a budget-partial run (e.g. 16 checked of
      // 150 selected of 1105) and read as a contradictory "16/1105 pairs (cov 0.136)".
      const budgetNote = r.budgetExceeded ? `, budget-partial (${t.notAttempted ?? "?"} not attempted)` : "";
      const pairsDetail = `${checked}/${total || "?"} pairs (cov ${total > 0 ? cov.toFixed(3) : "?"})${r.model ? `, ${r.model}` : ""}${budgetNote}${lowConf > 0 ? `; ${lowConf} low-confidence` : ""}`;
      if (v > 0) return { value: v, severity: "warn", detail: pairsDetail };
      if (total > 0 && cov < LOW_COVERAGE) return { value: 0, severity: "info", lowCoverage: true, detail: `0 found BUT only ${pairsDetail} -- LOW COVERAGE, not a clean bill` };
      return { value: 0, severity: "ok", detail: pairsDetail };
    },
  },
  {
    key: "ambiguous", file: "vault-ambiguous-links-report.json", title: "ambiguous broken links",
    regen: "node scripts/vault-link-doctor.mjs --ambiguous",
    headline: (r) => {
      const v = Number(r.ambiguousTotal ?? 0);
      return { value: v, severity: v > 0 ? "info" : "ok", detail: `${r.captured ?? 0} captured${r.truncated ? " (TRUNCATED)" : ""}` };
    },
  },
  {
    // U-SIERRA-BRAIN-REFRESH-HEALTHROW (2026-06-25, slot:sierra): surfaces the overnight brain-refresh
    // cron's last-run verdict in the SAME dashboard that rolls up the vault gap-sentinels -- so a
    // FAILED refresh (e.g. galaxy-synth mostly-failed -> exit 1) and WHICH pipeline broke show up,
    // instead of the report sitting unread on disk. `optional` so a never-run machine does not degrade.
    key: "brain-refresh", file: ".brain-refresh-last-run.json", title: "brain-refresh (last overnight run)",
    optional: true,
    regen: "node scripts/brain-refresh.mjs --force",
    headline: (r) => {
      const failed = Array.isArray(r.failedSteps) ? r.failedSteps : [];
      const steps = Array.isArray(r.steps) ? r.steps : [];
      const okN = steps.filter((s) => s && s.status === "ok").length;
      if (failed.length > 0) return { value: failed.length, severity: "warn", detail: `FAILED: ${failed.join(",")} (${okN}/${steps.length} pipelines ok)` };
      if (r.verdict === "deferred") return { value: 0, severity: "info", detail: `deferred (Ollama down; ${okN} ran)` };
      return { value: 0, severity: "ok", detail: `${r.verdict ?? "ok"} -- ${okN}/${steps.length} pipelines ok` };
    },
  },
];

// Pure core: given each source's parsed report (or undefined if absent), build the
// rollup. Injected nowMs/staleDays keep it deterministic + hermetic.
export function aggregateHealth(reportsByKey = {}, { nowMs = Date.now(), staleDays = DEFAULT_STALE_DAYS } = {}) {
  const rows = [];
  for (const src of SOURCES) {
    const r = reportsByKey[src.key];
    if (!r || typeof r !== "object") {
      if (src.optional) continue; // optional source (e.g. brain-refresh) absent -> no row, no overall degrade
      rows.push({ key: src.key, title: src.title, state: "missing", regen: src.regen });
      continue;
    }
    let h;
    try { h = src.headline(r); } catch { h = { value: null, severity: "warn", detail: "unreadable report shape" }; }
    const genMs = Date.parse(r.generatedAt ?? "");
    const ageDays = Number.isFinite(genMs) ? (nowMs - genMs) / MS_PER_DAY : null;
    const stale = ageDays != null && ageDays > staleDays;
    rows.push({
      key: src.key, title: src.title, state: "present",
      value: h.value, severity: h.severity, detail: h.detail,
      ageDays: ageDays == null ? null : Math.round(ageDays * 10) / 10,
      stale, needsScan: !!h.needsScan, lowCoverage: !!h.lowCoverage, regen: src.regen,
    });
  }
  const warn = rows.filter((x) => x.severity === "warn").length;
  const info = rows.filter((x) => x.severity === "info").length;
  const missing = rows.filter((x) => x.state === "missing").length;
  const stale = rows.filter((x) => x.stale).length;
  const needsScan = rows.filter((x) => x.needsScan).length;
  const lowCoverage = rows.filter((x) => x.lowCoverage).length;
  // WARN dominates (a real defect); else STALE if any source is old / missing / never
  // actually scanned (needsScan -- a green that "didn't look" would be a false OK); else OK.
  // lowCoverage is INFO (visible on the row, surfaced in counts) but does NOT escalate
  // overall -- the partial-scan is the lint's steady state, so escalating would peg the
  // dashboard perpetually STALE; the row detail carries the honest "not a clean bill" signal.
  const overall = warn > 0 ? "WARN" : (missing > 0 || stale > 0 || needsScan > 0) ? "STALE" : "OK";
  return { generatedAt: new Date(nowMs).toISOString(), overall, counts: { warn, info, missing, stale, needsScan, lowCoverage, sources: SOURCES.length }, rows };
}

function loadReports({ stateDir = STATE_DIR, readFileImpl = readFileSync, existsImpl = existsSync } = {}) {
  const out = {};
  for (const src of SOURCES) {
    const p = resolve(stateDir, src.file);
    if (!existsImpl(p)) continue;
    try { out[src.key] = JSON.parse(readFileImpl(p, "utf8")); } catch { /* corrupt report -> treat as missing */ }
  }
  return out;
}

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseArgs(argv) {
  const out = { json: false, write: true, staleDays: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--no-write") out.write = false;
    else if (a === "--stale-days") out.staleDays = parseInt(argv[++i], 10);
  }
  return out;
}

const SEV_ICON = { ok: "OK ", info: "i  ", warn: "!! " };

function main() {
  const args = parseArgs(process.argv.slice(2));
  // clamp BOTH entry points identically (CLI + env) so --stale-days 0/-5 cannot mark
  // every report stale.
  const staleDays = clampInt(
    args.staleDays != null ? String(args.staleDays) : process.env.PRISM_VAULT_HEALTH_STALE_DAYS,
    DEFAULT_STALE_DAYS, 1, 100000);
  const reports = loadReports();
  const roll = aggregateHealth(reports, { staleDays });

  if (args.write) {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    // Atomic publish: brain-refresh's auto-fan-out now runs vault-health as a step (U-SIERRA-BRAIN-
    // VHEALTH-STEP) alongside the standalone sierra-cron call, so vault-health.json has two writers.
    // A bare writeFileSync could interleave-corrupt the rollup that downstream readers JSON.parse;
    // tmp+rename makes each publish atomic. (Mirrors the vault-rot-report atomic-write fix.)
    const tmp = `${OUT_PATH}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify(roll, null, 2) + "\n", "utf8");
    renameSync(tmp, OUT_PATH);
  }
  if (args.json) { process.stdout.write(JSON.stringify(roll, null, 2) + "\n"); return; }

  process.stdout.write(`[vault-health] overall=${roll.overall} (warn=${roll.counts.warn} info=${roll.counts.info} missing=${roll.counts.missing} stale=${roll.counts.stale} needsScan=${roll.counts.needsScan} lowCoverage=${roll.counts.lowCoverage})\n`);
  for (const row of roll.rows) {
    if (row.state === "missing") {
      process.stdout.write(`  --  ${row.title}: NO REPORT -> ${row.regen}\n`);
      continue;
    }
    const age = row.ageDays == null ? "age ?" : `${row.ageDays}d`;
    const flags = `${row.stale ? " STALE" : ""}${row.needsScan ? " NEEDS-SCAN" : ""}${row.lowCoverage ? " LOW-COVERAGE" : ""}`;
    process.stdout.write(`  ${SEV_ICON[row.severity] || "?  "}${row.title}: ${row.value}  (${row.detail}; ${age}${flags})\n`);
    // surface the regen/confirm command on anything actionable: stale, never-scanned,
    // OR a WARN (the value may be last-scan not live -- re-run to confirm before acting).
    if (row.stale || row.needsScan || row.lowCoverage || row.severity === "warn") process.stdout.write(`        -> regen/confirm: ${row.regen}\n`);
  }
  if (roll.counts.warn === 0 && roll.counts.missing === 0 && roll.counts.stale === 0 && roll.counts.needsScan === 0 && roll.counts.lowCoverage === 0) {
    process.stdout.write("  vault is healthy: no defects, all detectors fresh + scanned.\n");
  }
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(process.argv[1] || "");
  } catch { return false; }
})();
if (invokedDirect) {
  try { main(); }
  catch (err) {
    try { process.stderr.write(`[vault-health] ${err?.stack || err?.message || err}\n`); }
    catch { /* ignore */ }
    process.exit(1);
  }
}
