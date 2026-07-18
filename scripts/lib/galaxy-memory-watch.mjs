#!/usr/bin/env node
// scripts/lib/galaxy-memory-watch.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-COMPACT (alpha, 2026-05-31).
//
// Phase A RETENTION: per-galaxy MEMORY.md size-watchdog + pointer-compression ADVISOR.
//
// The 24 KB-ceiling lesson (CLAUDE.md §Recent regressions — the master MEMORY.md silently truncates past
// 24576 B, breaking fleet-wide recall) applied PER GALAXY. A bloated galaxy brain (a) is expensive to
// recall and (b) can't distill into a useful ≤1 KB context-card — U-GCF-ROLLUP surfaced this directly:
// `quoting` (87 KB MEMORY.md) and `post-processor` produce "(no delta)" cards because their verbose brain
// overflows the 1 KB card budget. This watchdog measures every galaxy MEMORY.md, cross-references its card
// health (truncated / no-delta, from INDEX.json + MASTER-DIGEST.json), and ranks COMPACTION CANDIDATES with
// the MEMORY-ARCHIVE pointer-compression suggestion.
//
// ADVISORY ONLY (R12) — it NEVER rewrites the peer-locked galaxy MEMORY.md; it reports + suggests. An
// operator/golf does the actual compaction (move detail → `<g>/MEMORY-ARCHIVE.md`, keep ≤N pointers).
//
// DESIGN (mirrors galaxy-rollup.mjs / xgalaxy-inject.mjs for R11 consistency):
//   • pure-core (classify/assess/rank/render) + injected fs deps + fail-soft.
//   • REUSE (R8): the harness ceiling CEILING_BYTES is imported from memory-size-watch.mjs (single source);
//     DEFAULT_ROOTS from galaxy-context-card. Card health is READ from INDEX/DIGEST, never recomputed.
//   • SINGLE-WRITER-PER-FILE: writes ONLY its own MEMORY-WATCH.{md,json} sidecars + an append-only history
//     jsonl — never the galaxy MEMORY.md, never INDEX.json (the multi-writer clobber class).
//
// Knob: PRISM_GCF_COMPACT_DISABLE=1 → watch() is a no-op (pure fns still work).

import fs from "node:fs";
import path from "node:path";
import { DEFAULT_ROOTS } from "./galaxy-context-card.mjs";
import { CEILING_BYTES } from "../memory-size-watch.mjs";

// Per-galaxy SIZE budget = a DISTILLATION-COST PROXY, not a truncation cliff. Unlike the master MEMORY.md
// (auto-loaded into every chat at SessionStart → silently truncated past CEILING_BYTES, the real reason that
// ceiling exists), a galaxy brain is NOT auto-loaded fleet-wide — it's read on-demand and the federation
// injects its ≤1 KB CARD, not the brain. So size here is a "how expensive is this to distill / how likely to
// overflow the 1 KB card" heuristic. The DIRECT distillation-failure detector is the size-independent
// `cardNoDelta` signal (post-processor is flagged at only 8 KB). We reuse CEILING_BYTES as the critical line
// (R8 single source) because a brain larger than the entire master index is unambiguously over-budget.
export const GALAXY_CRITICAL_BYTES = CEILING_BYTES; // 24576 — imported harness ceiling, reused as the hard line
export const GALAXY_WARN_BYTES = 12288;             // ~half the ceiling — early distillation-cost warning
export const DEFAULT_HISTORY_PATH = "H:/prism/state/shared/galaxy-memory-watch-history.jsonl";
export const DEFAULT_WATCH_MD_PATH = `${DEFAULT_ROOTS.cardsDir}/MEMORY-WATCH.md`;
export const DEFAULT_WATCH_JSON_PATH = `${DEFAULT_ROOTS.cardsDir}/MEMORY-WATCH.json`;

const defaultRead = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };

// ── pure classification / assessment ────────────────────────────────────────────

// Classify a galaxy MEMORY.md byte size against the per-galaxy budget. Pure.
export function classifySize(bytes, opts = {}) {
  const warn = Number.isFinite(opts.warnBytes) ? opts.warnBytes : GALAXY_WARN_BYTES;
  const crit = Number.isFinite(opts.criticalBytes) ? opts.criticalBytes : GALAXY_CRITICAL_BYTES;
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes >= crit) return "critical";
  if (bytes >= warn) return "warn";
  return "ok";
}

// Assess one galaxy: size status + card-distillation signal → is it a compaction candidate, and WHY. Pure.
//   row:    { galaxy, bytes }
//   health: { hasDelta?:bool, salience?:number } | undefined  (from INDEX/DIGEST; optional)
// A galaxy is a CANDIDATE when its brain is over the per-galaxy budget OR its card fails to distill a
// domain delta. NOTE: a card being TRUNCATED at the 1 KB cap is its NORMAL operation (most galaxies have
// >1 KB of salient facts) — truncation is NOT a candidacy signal. The precise distillation-failure signal
// is "no domain delta" (the verbose master-brain block consumed the whole budget — quoting/post-processor).
export function assessGalaxy(row, health = {}, opts = {}) {
  const galaxy = row && typeof row.galaxy === "string" ? row.galaxy : "";
  const bytes = Number.isFinite(row && row.bytes) ? row.bytes : NaN;
  const sizeStatus = classifySize(bytes, opts);
  const h = health && typeof health === "object" ? health : {};
  // hasDelta is only meaningful when we actually have digest data; undefined → unknown (NOT a no-delta flag).
  const noDelta = h.hasDelta === false;
  const reasons = [];
  if (sizeStatus === "critical") reasons.push(`brain ${bytes}B ≥ ${opts.criticalBytes ?? GALAXY_CRITICAL_BYTES}B ceiling`);
  else if (sizeStatus === "warn") reasons.push(`brain ${bytes}B ≥ ${opts.warnBytes ?? GALAXY_WARN_BYTES}B warn`);
  if (noDelta) reasons.push("card has no domain delta (verbose brain ate the 1KB card budget)");
  return {
    galaxy,
    bytes: Number.isFinite(bytes) ? bytes : null,
    sizeStatus,
    cardNoDelta: noDelta,
    salience: Number.isFinite(h.salience) ? h.salience : null,
    isCandidate: reasons.length > 0,
    reasons,
  };
}

// Build the ranked watch model. Pure given measured galaxies + a card-health map.
//   galaxies: [{ galaxy, bytes }]   health: { [galaxy]: {truncated,hasDelta,salience} }
// Ranks candidates by severity (critical > warn > card-only) then by bytes desc.
export function buildWatchModel(opts = {}) {
  const galaxies = Array.isArray(opts.galaxies) ? opts.galaxies : [];
  const health = opts.health && typeof opts.health === "object" ? opts.health : {};
  const thr = { warnBytes: opts.warnBytes, criticalBytes: opts.criticalBytes };
  const all = galaxies
    .filter((r) => r && typeof r.galaxy === "string")
    .map((r) => assessGalaxy(r, health[r.galaxy], thr));
  const sev = (a) => (a.sizeStatus === "critical" ? 3 : a.sizeStatus === "warn" ? 2 : a.isCandidate ? 1 : 0);
  const candidates = all
    .filter((a) => a.isCandidate)
    .sort((a, b) => (sev(b) - sev(a)) || ((b.bytes ?? -1) - (a.bytes ?? -1)) || a.galaxy.localeCompare(b.galaxy));
  const totalBytes = all.reduce((s, a) => s + (a.bytes || 0), 0);
  const worst =
    candidates.some((c) => c.sizeStatus === "critical") ? "critical"
      : candidates.length ? "warn"
      : "ok";
  return {
    galaxyCount: all.length,
    totalBytes,
    warnBytes: opts.warnBytes ?? GALAXY_WARN_BYTES,
    criticalBytes: opts.criticalBytes ?? GALAXY_CRITICAL_BYTES,
    worst,
    candidateCount: candidates.length,
    candidates,
    all: all.slice().sort((a, b) => (b.bytes ?? -1) - (a.bytes ?? -1)),
  };
}

// ── markdown render (pure) ──────────────────────────────────────────────────────
export function renderWatch(model, opts = {}) {
  const generatedAt = opts.generatedAt || new Date().toISOString();
  const m = model || { candidates: [], all: [] };
  const bar = m.worst === "critical" ? "🔴 CRITICAL" : m.worst === "warn" ? "🟠 WARN" : "🟢 OK";
  const head = [
    "# 🧹 Galaxy MEMORY.md Compaction Watch",
    "",
    `> ${bar} — ${m.candidateCount} of ${m.galaxyCount} galaxy brains flagged for pointer-compression.`,
    `> Size is a DISTILLATION-COST proxy (galaxy brains are NOT auto-loaded — no truncation cliff like the master MEMORY.md): warn ≥ ${m.warnBytes} B · critical ≥ ${m.criticalBytes} B. The direct distillation-failure signal is "card has no domain delta".`,
    "> ADVISORY — never rewrites a peer-locked galaxy MEMORY.md. Compact by moving detail to `<galaxy>/MEMORY-ARCHIVE.md` and keeping ≤N pointers.",
    `> GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-COMPACT. Generated ${generatedAt}. Regenerate: \`node scripts/galaxy-memory-watch.mjs\`. Disable: PRISM_GCF_COMPACT_DISABLE=1.`,
    "",
  ];
  const candLines = m.candidateCount
    ? ["## Compaction candidates (ranked)", "", "| galaxy | bytes | size | card | why |", "|--------|------:|------|------|-----|"]
        .concat(m.candidates.map((c) =>
          `| ${c.galaxy} | ${c.bytes ?? "—"} | ${c.sizeStatus} | ${c.cardNoDelta ? "no-delta" : "ok"} | ${c.reasons.join("; ").replace(/\|/g, "\\|")} |`))
    : ["## Compaction candidates", "", "_None — every galaxy brain is within budget and distills to a card delta._"];
  return head.concat(candLines).join("\n");
}

// ── I/O (injected deps; fail-soft) ───────────────────────────────────────────────

// Measure every galaxy's MEMORY.md byte size. Injected deps → hermetic. Fail-soft: a galaxy whose
// MEMORY.md is unreadable is skipped (not measured), never fatal.
export function measureGalaxies(opts = {}) {
  const enginesDir = opts.enginesDir || DEFAULT_ROOTS.enginesDir;
  const readdirImpl = opts.readdirImpl || ((d) => fs.readdirSync(d, { withFileTypes: true }));
  const statImpl = opts.statImpl || ((f) => fs.statSync(f));
  let names = [];
  try {
    names = readdirImpl(enginesDir).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch { return []; }
  const out = [];
  for (const g of names) {
    try {
      const st = statImpl(path.join(enginesDir, g, "MEMORY.md"));
      if (st && Number.isFinite(st.size)) out.push({ galaxy: g, bytes: st.size });
    } catch { /* no MEMORY.md → not a galaxy brain; skip */ }
  }
  return out;
}

// Build the card-health map: `salience` from INDEX.json (informational — carried for downstream U-GCF units,
// NOT used in candidacy here) + `hasDelta` from MASTER-DIGEST.json. Both optional + fail-soft: a missing/garbage
// file contributes nothing (the watchdog still works on size alone).
// CROSS-FILE CONTRACT: `hasDelta` is derived from MASTER-DIGEST.json `ranked[].topFact` (the field
// galaxy-rollup.mjs writes). If that producer field is renamed, the no-delta signal silently degrades to
// size-only (fail-soft, not a crash). INDEX and DIGEST are co-generated; a galaxy present in INDEX but ABSENT
// from DIGEST.ranked gets hasDelta:undefined → NEVER flagged no-delta (strict `=== false` in assessGalaxy).
export function loadCardHealth(opts = {}) {
  const readImpl = opts.readImpl || defaultRead;
  const indexPath = opts.indexPath || `${DEFAULT_ROOTS.cardsDir}/INDEX.json`;
  const digestPath = opts.digestJsonPath || `${DEFAULT_ROOTS.cardsDir}/MASTER-DIGEST.json`;
  const health = {};
  try {
    const raw = readImpl(indexPath);
    if (raw != null) {
      const j = JSON.parse(raw);
      for (const c of (j && Array.isArray(j.cards) ? j.cards : [])) {
        if (c && typeof c.galaxy === "string") {
          health[c.galaxy] = { salience: Number.isFinite(c.salience) ? c.salience : undefined };
        }
      }
    }
  } catch { /* INDEX absent/garbage → size-only assessment */ }
  try {
    const raw = readImpl(digestPath);
    if (raw != null) {
      const j = JSON.parse(raw);
      for (const r of (j && Array.isArray(j.ranked) ? j.ranked : [])) {
        if (r && typeof r.galaxy === "string") {
          health[r.galaxy] = { ...(health[r.galaxy] || {}), hasDelta: !!r.topFact };
        }
      }
    }
  } catch { /* DIGEST absent/garbage → no delta signal */ }
  return health;
}

function appendHistory(historyPath, rec, writeAppendImpl) {
  try {
    const append = writeAppendImpl || ((f, d) => fs.appendFileSync(f, d));
    append(historyPath, JSON.stringify(rec) + "\n");
  } catch { /* history is best-effort; never fail the watch on history error */ }
}

// ── orchestrator — FAIL-SOFT, NEVER throws ──────────────────────────────────────
// Returns { ok, written, worst, candidateCount, galaxyCount, exitCode, reason, candidates? }.
// exitCode mirrors memory-size-watch.mjs cron contract: 0 clean · 1 candidates-found · 2 measurement-error.
export function watch(opts = {}) {
  if (!opts || typeof opts !== "object") opts = {};
  try {
    if (process.env.PRISM_GCF_COMPACT_DISABLE === "1") {
      return { ok: false, disabled: true, written: false, reason: "disabled", exitCode: 0, galaxyCount: 0, candidateCount: 0 };
    }
    const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
    const readImpl = opts.readImpl || defaultRead;
    const writeImpl = opts.writeImpl || ((f, d) => fs.writeFileSync(f, d));
    const now = typeof opts.now === "function" ? opts.now : () => Date.now();
    const mdPath = opts.watchMdPath || `${roots.cardsDir}/MEMORY-WATCH.md`;
    const jsonPath = opts.watchJsonPath || `${roots.cardsDir}/MEMORY-WATCH.json`;
    const historyPath = opts.historyPath || DEFAULT_HISTORY_PATH;

    const galaxies = measureGalaxies({ enginesDir: roots.enginesDir, readdirImpl: opts.readdirImpl, statImpl: opts.statImpl });
    if (!galaxies.length) {
      return { ok: false, written: false, reason: "no-galaxies", exitCode: 2, galaxyCount: 0, candidateCount: 0 };
    }
    const health = loadCardHealth({ readImpl, indexPath: opts.indexPath, digestJsonPath: opts.digestJsonPath });
    const model = buildWatchModel({ galaxies, health, warnBytes: opts.warnBytes, criticalBytes: opts.criticalBytes });
    const generatedAt = new Date(now()).toISOString();
    const md = renderWatch(model, { generatedAt });
    const json = {
      schemaVersion: "1.0.0",
      generatedAt,
      galaxyCount: model.galaxyCount,
      totalBytes: model.totalBytes,
      warnBytes: model.warnBytes,
      criticalBytes: model.criticalBytes,
      worst: model.worst,
      candidateCount: model.candidateCount,
      candidates: model.candidates,
      all: model.all,
    };
    try {
      writeImpl(mdPath, md + "\n");
      writeImpl(jsonPath, JSON.stringify(json, null, 2));
    } catch (e) {
      return { ok: false, written: false, reason: "write-error", error: String((e && e.message) || e), exitCode: 2, galaxyCount: model.galaxyCount, candidateCount: model.candidateCount };
    }
    appendHistory(historyPath, { generatedAt, galaxyCount: model.galaxyCount, totalBytes: model.totalBytes, worst: model.worst, candidateCount: model.candidateCount }, opts.appendImpl);
    return {
      ok: true,
      written: true,
      reason: "written",
      worst: model.worst,
      exitCode: model.candidateCount > 0 ? 1 : 0,
      galaxyCount: model.galaxyCount,
      candidateCount: model.candidateCount,
      mdPath,
      jsonPath,
      candidates: model.candidates.slice(0, 8).map((c) => ({ galaxy: c.galaxy, bytes: c.bytes, sizeStatus: c.sizeStatus })),
    };
  } catch (e) {
    return { ok: false, written: false, reason: "error", error: String((e && e.message) || e), exitCode: 2, galaxyCount: 0, candidateCount: 0 };
  }
}
