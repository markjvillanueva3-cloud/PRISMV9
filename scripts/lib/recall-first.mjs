#!/usr/bin/env node
// scripts/lib/recall-first.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-RECALL-FIRST (alpha, 2026-05-31).
//
// Phase D OBSIDIAN TOKEN SAVINGS: recall-instead-of-reread — a nudge + a metric.
//
// Re-reading a whole multi-KB brain/memory file every time costs ~bytes/4 tokens; recalling the relevant
// ~3 snippets via semantic_search costs ~300. This unit (a) DECIDES when a Read of a recallable brain/memory
// file should be a recall instead, (b) renders the nudge with the ESTIMATED token savings, and (c) records
// the estimate to a savings ledger (the metric U-GCF-SAVINGS-TELEMETRY rolls up).
//
// SCOPE (complementary, NOT duplicative — R8): targets the BRAIN/MEMORY surface only — galaxy
// `engines/<g>/MEMORY.md`, `knowledge/memories/**`, the C: auto-memory dir, the master MEMORY.md. It does
// NOT touch the WIKI surface — `wiki-recall-on-read.mjs` + `wiki-read-offload-advisory.mjs` already own that.
// It adds the SAVINGS ESTIMATE that `recall-counter-track.mjs` (which only COUNTS reads) lacks.
//
// DESIGN (mirrors galaxy-rollup.mjs / galaxy-push.mjs for R11): pure-core (classify/estimate/decide/render)
// + injected fs deps + fail-soft. SINGLE-WRITER-PER-FILE: records to its OWN recall-first-savings.json
// sidecar — never a peer's offload-stats / wiki-recall-counts.
//
// Knobs: PRISM_GCF_RECALL_DISABLE=1 (no-op) · PRISM_GCF_RECALL_MIN_BYTES=N (nudge floor, default 4096).

import fs from "node:fs";

export const CHARS_PER_TOKEN = 4;            // standard rough token estimate
export const DEFAULT_RECALL_TOPK = 3;        // semantic_search snippets recalled
export const DEFAULT_RECALL_TOKENS = 300;    // ~DEFAULT_RECALL_TOPK snippets × ~100 tok
export const DEFAULT_MIN_BYTES = 4096;       // don't nudge tiny files — recall overhead isn't worth it
export const DEFAULT_SAVINGS_PATH = "H:/prism/state/shared/dashboards/recall-first-savings.json";

const defaultRead = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };

// ── pure classify / estimate / decide / render ───────────────────────────────────

// Classify a path as a recallable BRAIN/MEMORY file. Pure. Returns { recallable, surface, recallQuery }.
// Surfaces: galaxy-brain (engines/<g>/MEMORY.md) · obsidian-memory (knowledge/memories or C: memory dir) ·
// master-brain (the projects/.../memory/MEMORY.md). Wiki paths are intentionally NOT recallable here.
export function classifyRecallable(filePath) {
  const p = String(filePath || "").replace(/\\/g, "/");
  if (!p) return { recallable: false, surface: null };
  // (?:^|\/) anchors match both ABSOLUTE harness Read paths (H:/prism/knowledge/...) and relative ones.
  if (/(?:^|\/)knowledge\/wiki\//i.test(p)) return { recallable: false, surface: "wiki" }; // wiki hooks own this
  // master brain: <home>/.claude/projects/<proj>/memory/MEMORY.md
  if (/(?:^|\/)\.claude\/projects\/[^/]+\/memory\/MEMORY\.md$/i.test(p)) {
    return { recallable: true, surface: "master-brain", recallQuery: "the topic you need from the master index" };
  }
  // galaxy brain: mcp-server/src/engines/<galaxy>/MEMORY.md
  const g = p.match(/(?:^|\/)engines\/([^/]+)\/MEMORY\.md$/i);
  if (g) return { recallable: true, surface: "galaxy-brain", galaxy: g[1], recallQuery: g[1].replace(/[-_]/g, " ") };
  // obsidian memory file: knowledge/memories/** or the C: auto-memory source dir
  if (/(?:^|\/)knowledge\/memories\//i.test(p) || /(?:^|\/)\.claude\/projects\/[^/]+\/memory\/[^/]+\.md$/i.test(p)) {
    return { recallable: true, surface: "obsidian-memory", recallQuery: "the fact you need" };
  }
  return { recallable: false, surface: null };
}

// Estimate recall-vs-reread token cost. Pure. savings can be negative for tiny files (caller gates on it).
export function estimateSavings(bytes, opts = {}) {
  const recallTokens = Number.isFinite(opts.recallTokens) ? opts.recallTokens : DEFAULT_RECALL_TOKENS;
  const cpt = Number.isFinite(opts.charsPerToken) && opts.charsPerToken > 0 ? opts.charsPerToken : CHARS_PER_TOKEN;
  const readTokens = Number.isFinite(bytes) && bytes > 0 ? Math.round(bytes / cpt) : 0;
  return { readTokens, recallTokens, savings: readTokens - recallTokens };
}

// Decide whether a Read should be a recall instead. Pure. Returns a structured decision (never throws).
//   nudge=true iff recallable AND bytes >= minBytes AND estimated savings > 0.
export function shouldNudgeRecall(filePath, bytes, opts = {}) {
  const minBytes = Number.isFinite(opts.minBytes) ? opts.minBytes : DEFAULT_MIN_BYTES;
  const cls = classifyRecallable(filePath);
  const est = estimateSavings(bytes, opts);
  const nudge = !!cls.recallable && Number.isFinite(bytes) && bytes >= minBytes && est.savings > 0;
  return {
    nudge,
    surface: cls.surface,
    galaxy: cls.galaxy || null,
    recallQuery: cls.recallQuery || null,
    bytes: Number.isFinite(bytes) ? bytes : null,
    readTokens: est.readTokens,
    recallTokens: est.recallTokens,
    savings: est.savings,
    reason: !cls.recallable ? "not-recallable" : !(Number.isFinite(bytes) && bytes >= minBytes) ? "below-min-bytes" : est.savings > 0 ? "nudge" : "no-savings",
  };
}

// Render the recall nudge text. Pure. "" when not a nudge.
export function renderRecallNudge(decision, filePath) {
  if (!decision || !decision.nudge) return "";
  const q = decision.recallQuery || "what you need";
  return `## ♻ recall-first — this ${decision.surface} is semantically recallable\n`
    + `Re-reading the whole file ≈ ${decision.readTokens} tok; \`prism_memory:semantic_search query="${q}" topK=${DEFAULT_RECALL_TOPK}\` returns ~${DEFAULT_RECALL_TOPK} snippets ≈ ${decision.recallTokens} tok.\n`
    + `**Est. savings ~${decision.savings} tok** if the snippets answer your need. Re-read the full file only if they don't.`;
}

// ── metric (injected deps; fail-soft) ────────────────────────────────────────────

// Record an estimated recall savings to the OWN sidecar ledger (cumulative + per-surface). Fail-soft;
// SINGLE-WRITER (never a peer's offload-stats). Read-modify-write the json; advisory telemetry only.
export function recordRecallSavings(decision, opts = {}) {
  if (!decision || !decision.nudge) return { ok: false, reason: "no-nudge" };
  const readImpl = opts.readImpl || defaultRead;
  const writeImpl = opts.writeImpl || ((f, d) => fs.writeFileSync(f, d));
  const savingsPath = opts.savingsPath || DEFAULT_SAVINGS_PATH;
  let state = { schemaVersion: "1.0.0", totalNudges: 0, totalEstSavingsTokens: 0, bySurface: {} };
  // RMW trusts nothing about a prior sidecar's field TYPES (a corrupt/peer-poked file must never propagate
  // NaN/string garbage): coerce every accumulator with Number(...)||0, and reject a non-object/array prior.
  try { const raw = readImpl(savingsPath); if (raw != null) { const j = JSON.parse(raw); if (j && typeof j === "object" && !Array.isArray(j)) state = { ...state, ...j, bySurface: { ...(j.bySurface || {}) } }; } } catch { /* fresh */ }
  const s = decision.surface || "unknown";
  const add = Number(decision.savings) || 0;
  state.totalNudges = (Number(state.totalNudges) || 0) + 1;
  state.totalEstSavingsTokens = (Number(state.totalEstSavingsTokens) || 0) + add;
  const bs = (state.bySurface[s] && typeof state.bySurface[s] === "object") ? state.bySurface[s] : {};
  bs.nudges = (Number(bs.nudges) || 0) + 1;
  bs.estSavingsTokens = (Number(bs.estSavingsTokens) || 0) + add;
  state.bySurface[s] = bs;
  try { writeImpl(savingsPath, JSON.stringify(state, null, 2)); return { ok: true, totalNudges: state.totalNudges, totalEstSavingsTokens: state.totalEstSavingsTokens }; }
  catch (e) { return { ok: false, reason: "write-error", error: String((e && e.message) || e) }; }
}

// Read the cumulative savings summary. Fail-soft → zeros.
export function recallSavingsSummary(opts = {}) {
  const readImpl = opts.readImpl || defaultRead;
  try {
    const raw = readImpl(opts.savingsPath || DEFAULT_SAVINGS_PATH);
    if (raw == null) return { totalNudges: 0, totalEstSavingsTokens: 0, bySurface: {} };
    const j = JSON.parse(raw);
    return (j && typeof j === "object") ? { totalNudges: j.totalNudges || 0, totalEstSavingsTokens: j.totalEstSavingsTokens || 0, bySurface: j.bySurface || {} } : { totalNudges: 0, totalEstSavingsTokens: 0, bySurface: {} };
  } catch { return { totalNudges: 0, totalEstSavingsTokens: 0, bySurface: {} }; }
}

// ── orchestrator (the hook/CLI entry) — FAIL-SOFT, NEVER throws ─────────────────
// Given a filePath (+ optional bytes; statted if absent), returns the decision + nudge text. The golf-patched
// PreToolUse:Read hook calls this and, when nudge=true, surfaces `text` + records the savings estimate.
export function recallFirst(filePath, opts = {}) {
  try {
    if (process.env.PRISM_GCF_RECALL_DISABLE === "1") return { nudge: false, reason: "disabled", text: "" };
    let minBytes = DEFAULT_MIN_BYTES;
    if (Number.isFinite(opts.minBytes)) {
      minBytes = opts.minBytes;
    } else {
      const env = process.env.PRISM_GCF_RECALL_MIN_BYTES;
      if (env != null && env !== "") {
        const parsed = parseInt(env, 10); // separate validity from zero: 0 = "no floor", not a falsy → default
        if (Number.isFinite(parsed)) minBytes = Math.max(0, parsed);
      }
    }
    let bytes = opts.bytes;
    if (!Number.isFinite(bytes)) {
      const statImpl = opts.statImpl || ((f) => fs.statSync(f));
      try { bytes = statImpl(filePath).size; } catch { bytes = NaN; }
    }
    const decision = shouldNudgeRecall(filePath, bytes, { ...opts, minBytes });
    const text = renderRecallNudge(decision, filePath);
    return { ...decision, text };
  } catch (e) {
    return { nudge: false, reason: "error", error: String((e && e.message) || e), text: "" };
  }
}
