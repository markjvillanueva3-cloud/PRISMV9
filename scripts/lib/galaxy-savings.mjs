#!/usr/bin/env node
// scripts/lib/galaxy-savings.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SAVINGS-TELEMETRY (alpha, 2026-05-31).
//
// Phase D CAPSTONE: roll up the federation's token savings — PROVES the milestone delivered (R12: savings
// MEASURED/ESTIMATED from real artifacts, not asserted). Consumes the sidecars every prior unit produced and
// reports savings in THREE HONEST CATEGORIES (never one inflated headline):
//
//   1. perInjectPotential — STRUCTURAL savings the federation surface buys EACH time it's used instead of
//      re-reading the brains: card-vs-brain (inject a ≤1 KB card instead of its multi-KB MEMORY.md, per galaxy,
//      from INDEX cardBytes vs MEMORY-WATCH brainBytes) + digest-vs-all-brains (inject the one ranked
//      MASTER-DIGEST instead of re-reading all 34 brains). Realized PER occurrence, not cumulative.
//   2. cumulativeRealized — recall-first nudge savings actually accrued (recall-first-savings.json). 0 until
//      the golf PreToolUse hook is wired — honestly reported as 0, NOT projected.
//   3. oneTimeSaveable — cross-galaxy dedup tokens reclaimable IF the DEDUP-REPORT advisory is applied.
//
// DESIGN (mirrors galaxy-rollup.mjs / galaxy-xdedup.mjs for R11): pure-core + injected fs deps + fail-soft.
// Every input sidecar is OPTIONAL — a missing one contributes 0 to its category (the report degrades, never
// throws). SINGLE-WRITER-PER-FILE: writes ONLY its own SAVINGS-REPORT.{json,md}.
//
// Knob: PRISM_GCF_SAVINGS_DISABLE=1 → savingsBuild is a no-op (pure fns still work).

import fs from "node:fs";
import { DEFAULT_ROOTS } from "./galaxy-context-card.mjs";

export const CHARS_PER_TOKEN = 4;
export const DEFAULT_REPORT_JSON_PATH = `${DEFAULT_ROOTS.cardsDir}/SAVINGS-REPORT.json`;
export const DEFAULT_REPORT_MD_PATH = `${DEFAULT_ROOTS.cardsDir}/SAVINGS-REPORT.md`;

const defaultRead = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };
const tok = (bytes) => (Number.isFinite(bytes) && bytes > 0 ? Math.round(bytes / CHARS_PER_TOKEN) : 0);

// Fail-soft JSON sidecar read → object | null. Pure given readImpl.
export function loadJson(path, readImpl) {
  try { const raw = (readImpl || defaultRead)(path); if (raw == null) return null; const j = JSON.parse(raw); return (j && typeof j === "object") ? j : null; } catch { return null; }
}

// ── pure savings models ──────────────────────────────────────────────────────────

// Per-galaxy card-vs-brain inject savings. Pure. index = INDEX.json (cards[].{galaxy,bytes}); memoryWatch =
// MEMORY-WATCH.json (all[].{galaxy,bytes}). For each galaxy with BOTH: brainTokens - cardTokens (saved per inject).
export function computeCardSavings(index, memoryWatch) {
  const cardBytes = {};
  for (const c of (index && Array.isArray(index.cards) ? index.cards : [])) if (c && typeof c.galaxy === "string" && Number.isFinite(c.bytes)) cardBytes[c.galaxy] = c.bytes;
  const brainBytes = {};
  for (const a of (memoryWatch && Array.isArray(memoryWatch.all) ? memoryWatch.all : [])) if (a && typeof a.galaxy === "string" && Number.isFinite(a.bytes)) brainBytes[a.galaxy] = a.bytes;
  const perGalaxy = [];
  let total = 0;
  for (const g of Object.keys(cardBytes)) {
    if (!(g in brainBytes)) continue; // need both to compute a real delta
    const brainTokens = tok(brainBytes[g]);
    const cardTokens = tok(cardBytes[g]);
    const saved = Math.max(0, brainTokens - cardTokens);
    perGalaxy.push({ galaxy: g, brainTokens, cardTokens, savedPerInject: saved });
    total += saved;
  }
  perGalaxy.sort((a, b) => b.savedPerInject - a.savedPerInject);
  return { perGalaxy, totalPerInject: total, galaxyCount: perGalaxy.length };
}

// Digest-vs-all-brains fleet inject savings. Pure. digest = MASTER-DIGEST.json ({bytes}); memoryWatch all[].bytes.
export function computeDigestSavings(digest, memoryWatch) {
  const digestTokens = tok(digest && digest.bytes);
  let allBrainsBytes = 0;
  for (const a of (memoryWatch && Array.isArray(memoryWatch.all) ? memoryWatch.all : [])) if (a && Number.isFinite(a.bytes)) allBrainsBytes += a.bytes;
  const allBrainsTokens = tok(allBrainsBytes);
  return { digestTokens, allBrainsTokens, savedPerInject: Math.max(0, allBrainsTokens - digestTokens) };
}

// Consolidate the three honest categories into one report model. Pure given the loaded sidecars.
export function buildSavingsModel(opts = {}) {
  const card = computeCardSavings(opts.index, opts.memoryWatch);
  const digest = computeDigestSavings(opts.digest, opts.memoryWatch);
  const recall = opts.recall && typeof opts.recall === "object" ? opts.recall : null;
  const dedup = opts.dedup && typeof opts.dedup === "object" ? opts.dedup : null;
  const cumulativeRealized = recall && Number.isFinite(recall.totalEstSavingsTokens) ? recall.totalEstSavingsTokens : 0;
  const oneTimeSaveable = dedup && Number.isFinite(dedup.totalEstTokensSaved) ? dedup.totalEstTokensSaved : 0;
  return {
    perInjectPotential: {
      cardVsBrain: card.totalPerInject,
      digestVsAllBrains: digest.savedPerInject,
      // NOT summed (R12 honesty — arm-B catch): card-vs-brain and digest-vs-all-brains are ALTERNATIVE inject
      // strategies that both replace re-reading the SAME brains; summing them double-counts. The larger is the
      // best single-strategy ceiling. AND both are CONTINGENT — they accrue only when a consumer actually
      // injects the card/digest in place of the brain (the inject path is golf-pending → unrealized capacity).
      bestStrategyCeiling: Math.max(card.totalPerInject, digest.savedPerInject),
      realizationCaveat: "Per-inject potential is UNREALIZED capacity until a consumer injects the card/digest in place of the brain (inject path golf-pending). card-vs-brain and digest-vs-all-brains are alternative strategies — do NOT sum them.",
      galaxyCount: card.galaxyCount,
      topGalaxies: card.perGalaxy.slice(0, 8),
      digest,
    },
    cumulativeRealized: { recallFirstTokens: cumulativeRealized, recallFirstNudges: recall && Number.isFinite(recall.totalNudges) ? recall.totalNudges : 0, wired: cumulativeRealized > 0 },
    oneTimeSaveable: { dedupTokens: oneTimeSaveable, dedupClusters: dedup && Number.isFinite(dedup.clusterCount) ? dedup.clusterCount : 0 },
    sources: {
      index: !!opts.index, memoryWatch: !!opts.memoryWatch, digest: !!opts.digest, recall: !!recall, dedup: !!dedup,
    },
  };
}

// ── markdown render (pure) ────────────────────────────────────────────────────────
export function renderSavings(model, opts = {}) {
  const generatedAt = opts.generatedAt || new Date().toISOString();
  const m = model || {};
  const pip = m.perInjectPotential || {};
  const cr = m.cumulativeRealized || {};
  const ots = m.oneTimeSaveable || {};
  const lines = [
    "# 💰 Galaxy Context Federation — Savings Telemetry",
    "",
    `> Capstone roll-up (GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-SAVINGS-TELEMETRY). Generated ${generatedAt}.`,
    "> Three HONEST categories — structural per-inject potential, cumulative realized, one-time saveable. Estimated (bytes/4), not asserted.",
    "> Regenerate: `node scripts/galaxy-savings.mjs build`. Disable: PRISM_GCF_SAVINGS_DISABLE=1.",
    "",
    "## 1. Per-inject potential — UNREALIZED capacity (accrues only when a consumer injects the card/digest in place of the brain)",
    "_card-vs-brain and digest-vs-all-brains are ALTERNATIVE strategies (both replace re-reading the same brains) — NOT additive._",
    `- card-vs-brain: **~${pip.cardVsBrain || 0} tok** across ${pip.galaxyCount || 0} galaxies (inject a ≤1 KB card vs its full MEMORY.md)`,
    `- digest-vs-all-brains: **~${pip.digestVsAllBrains || 0} tok** (inject the one ranked MASTER-DIGEST vs re-reading all brains)`,
    `- **best single-strategy ceiling: ~${pip.bestStrategyCeiling || 0} tok/inject** (the larger of the two — contingent on the inject path being wired)`,
    "",
    "## 2. Cumulative realized (recall-first nudge savings actually accrued)",
    `- **~${cr.recallFirstTokens || 0} tok** over ${cr.recallFirstNudges || 0} nudges` + (cr.wired ? "" : " — _0: the recall-first PreToolUse hook is golf-pending (HOOK-PATCH-GCF-RECALL-FIRST.md); honestly reported as unrealized, not projected._"),
    "",
    "## 3. One-time saveable (cross-galaxy dedup, if the advisory is applied)",
    `- **~${ots.dedupTokens || 0} tok** across ${ots.dedupClusters || 0} dup clusters`,
    "",
    "## Top per-inject card savings (galaxy)",
    "| galaxy | brain tok | card tok | saved/inject |",
    "|--------|----------:|---------:|-------------:|",
  ];
  for (const g of (pip.topGalaxies || [])) lines.push(`| ${g.galaxy} | ${g.brainTokens} | ${g.cardTokens} | ${g.savedPerInject} |`);
  const missing = Object.entries(m.sources || {}).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) lines.push("", `_Missing sidecars (contributed 0): ${missing.join(", ")} — run the corresponding build CLI._`);
  return lines.join("\n");
}

// ── orchestrator (injected deps; fail-soft; NEVER throws) ───────────────────────
// reasons: disabled · written · write-error · error
export function savingsBuild(opts = {}) {
  if (!opts || typeof opts !== "object") opts = {};
  try {
    if (process.env.PRISM_GCF_SAVINGS_DISABLE === "1") return { ok: false, disabled: true, written: false, reason: "disabled" };
    const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
    const dir = roots.cardsDir;
    const readImpl = opts.readImpl || defaultRead;
    const writeImpl = opts.writeImpl || ((f, d) => fs.writeFileSync(f, d));
    const now = typeof opts.now === "function" ? opts.now : () => Date.now();
    const jsonPath = opts.reportJsonPath || `${dir}/SAVINGS-REPORT.json`;
    const mdPath = opts.reportMdPath || `${dir}/SAVINGS-REPORT.md`;

    const model = buildSavingsModel({
      index: opts.index || loadJson(opts.indexPath || `${dir}/INDEX.json`, readImpl),
      memoryWatch: opts.memoryWatch || loadJson(opts.memoryWatchPath || `${dir}/MEMORY-WATCH.json`, readImpl),
      digest: opts.digest || loadJson(opts.digestPath || `${dir}/MASTER-DIGEST.json`, readImpl),
      recall: opts.recall || loadJson(opts.recallPath || "H:/prism/state/shared/dashboards/recall-first-savings.json", readImpl),
      dedup: opts.dedup || loadJson(opts.dedupPath || `${dir}/DEDUP-REPORT.json`, readImpl),
    });
    const generatedAt = new Date(now()).toISOString();
    const md = renderSavings(model, { generatedAt });
    const json = { schemaVersion: "1.0.0", generatedAt, ...model };
    try { writeImpl(jsonPath, JSON.stringify(json, null, 2)); writeImpl(mdPath, md + "\n"); }
    catch (e) { return { ok: false, written: false, reason: "write-error", error: String((e && e.message) || e) }; }
    return {
      ok: true, written: true, reason: "written",
      perInjectCeiling: model.perInjectPotential.bestStrategyCeiling,
      cumulativeRealized: model.cumulativeRealized.recallFirstTokens,
      oneTimeSaveable: model.oneTimeSaveable.dedupTokens,
      sources: model.sources,
      jsonPath, mdPath,
    };
  } catch (e) {
    return { ok: false, written: false, reason: "error", error: String((e && e.message) || e) };
  }
}
