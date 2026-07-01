#!/usr/bin/env node
// scripts/ocr-al-queue-surface.mjs
//
// U-XRAY-AL-QUEUE-SURFACE -- surface the closed-loop OCR active-learning queue for operator
// GOLD-verification (the gate to 100% print-reading accuracy). The training loop
// (blueprint-ocr-training-loop.mjs) writes active-learning-queue.jsonl: prints/pages whose
// ensemble pseudo-labels need a HUMAN decision before they can become GOLD supervised labels for
// india's blueprint-OCR LoRA. This tool reads that queue, dedups reaper-kill duplicate rows
// (last-wins by key+page, same convention as xray-trainset-to-lora.mjs), and emits a RANKED
// operator worklist: highest GOLD-readiness first (most corroborated dims per review = the cheapest
// GOLD wins). READ-ONLY -- never mutates the queue, the trainset, or any GOLD label.
//
// USAGE:
//   node scripts/ocr-al-queue-surface.mjs [--queue <path>] [--out-md <path>] [--out-json <path>]
//        [--top N] [--json]
// EXIT: 0 = surfaced (incl. empty queue) | 1 = queue file missing/unreadable.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_QUEUE = join(REPO_ROOT, "state", "shared", "ocr-training-loop", "corpus-train", "active-learning-queue.jsonl");
const DEFAULT_OUT_MD = join(REPO_ROOT, "state", "shared", "ocr-training-loop", "AL-QUEUE-GOLD-REVIEW.md");
const DEFAULT_OUT_JSON = join(REPO_ROOT, "state", "shared", "ocr-training-loop", "AL-QUEUE-GOLD-REVIEW.json");

/**
 * PURE: last-wins dedup of AL-queue rows by key+page. A reaper kill mid-print leaves duplicate rows
 * (the loop re-processes the whole print on resume), so the LATEST row for a key+page is the
 * authoritative one -- mirrors xray-trainset-to-lora.mjs dedup discipline.
 * @param {Array<object>} rows
 * @returns {{deduped: object[], dropped: number}}
 */
export function dedupRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byKey = new Map();
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    // key+page identifies a print/page; fall back to image/part for legacy keyless rows so they dedup
    // by a stable identity instead of all colliding on "#0" (mirrors xray-trainset-to-lora.mjs).
    const id = r.key != null ? r.key : r.image != null ? r.image : r.part != null ? r.part : "";
    const k = `${id}#${r.page == null ? 0 : r.page}`;
    byKey.set(k, r); // last-wins
  }
  return { deduped: [...byKey.values()], dropped: Math.max(0, list.length - byKey.size) };
}

/**
 * PURE: one print/page's GOLD-verification profile from its AL-queue row. Missing/malformed summary
 * fields collapse to 0 (never NaN) so a partial row still surfaces (fail-soft).
 * @param {object} r
 */
export function profileRow(r) {
  const s = (r && r.summary) || {};
  // clamp negatives + non-finite -> 0 so a malformed/legacy row can never make the noise denominator
  // in goldReadiness drop to 0 (Infinity) or below 1; the live producer emits .length counts (>= 0).
  const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
  return {
    key: r && r.key != null ? String(r.key) : "(unknown)",
    page: r && Number.isInteger(r.page) ? r.page : 0,
    image: r && r.image != null ? String(r.image) : "",
    corroborated: num(s.n_corroborated),                 // dims BOTH models agreed on -> GOLD candidates
    ambiguous: num(s.n_ambiguous_pairs),                 // value-disagreement -> human picks
    hallucination: num(s.n_hallucination_candidates),    // likely-wrong -> reject
    clusters: num(s.n_clusters),
    mean_conf: Math.min(1, num(s.mean_agreement_confidence_corroborated)), // bound to [0,1]
    n_models: num(s.n_models),
    reasons: Array.isArray(r && r.reasons) ? r.reasons : [],
  };
}

/**
 * PURE: gold-readiness score. Higher = more GOLD dims per operator-minute -- a print with many
 * high-confidence corroborated dims and little noise is the cheapest GOLD win. Corroborated dims
 * (weighted by their agreement confidence) are the signal; ambiguous + hallucination are the review
 * cost. A noise-free print scores exactly its confidence-weighted corroborated-dim count.
 * @param {{corroborated:number, mean_conf:number, ambiguous:number, hallucination:number}} p
 */
export function goldReadiness(p) {
  const conf = p.mean_conf > 0 ? p.mean_conf : 1; // un-scored corroboration is treated as full weight, not zero
  const signal = p.corroborated * conf;
  const noise = 1 + 0.1 * (p.ambiguous + p.hallucination);
  return +(signal / noise).toFixed(4);
}

/**
 * PURE: assemble the operator surface from raw AL-queue rows.
 * @param {Array<object>} rows
 */
export function surfaceAlQueue(rows) {
  const { deduped, dropped } = dedupRows(rows);
  const prints = deduped.map(profileRow).map((p) => ({ ...p, gold_readiness: goldReadiness(p) }));
  // verify the densest GOLD prints first; tie-break on raw corroborated count
  prints.sort((a, b) => b.gold_readiness - a.gold_readiness || b.corroborated - a.corroborated);
  const sum = (f) => prints.reduce((acc, p) => acc + f(p), 0);
  return {
    total_rows: Array.isArray(rows) ? rows.length : 0,
    distinct_prints: prints.length,
    dedup_dropped: dropped,
    total_corroborated_dims: sum((p) => p.corroborated),  // the GOLD-candidate pool size
    total_ambiguous: sum((p) => p.ambiguous),
    total_hallucination: sum((p) => p.hallucination),
    prints,
  };
}

/** PURE: render the operator-reviewable markdown worklist. */
export function renderMarkdown(surface, opts = {}) {
  const top = Number.isInteger(opts.top) && opts.top > 0 ? opts.top : 50;
  const stamp = opts.generatedAt ? String(opts.generatedAt) : "";
  const L = [];
  L.push("# OCR Active-Learning Queue -- GOLD-Verification Worklist");
  L.push("");
  L.push("> The gate to 100% print-reading accuracy. Each row is a print/page whose ensemble");
  L.push("> pseudo-labels need a HUMAN decision before they become GOLD supervised labels for india's");
  L.push("> blueprint-OCR LoRA. CONFIRM the corroborated dims (both VLMs agreed, high confidence) ->");
  L.push("> GOLD. Resolve the ambiguous dim-pairs (model value-disagreement). Reject the hallucination");
  L.push("> candidates. READ-ONLY surface -- verifying is an operator action; this tool never writes GOLD.");
  L.push("");
  L.push(`- **Distinct prints needing review:** ${surface.distinct_prints}`);
  L.push(`- **GOLD-candidate dims (corroborated, ready to confirm):** ${surface.total_corroborated_dims}`);
  L.push(`- **Ambiguous dim-pairs (need a human pick):** ${surface.total_ambiguous}`);
  L.push(`- **Hallucination candidates (likely reject):** ${surface.total_hallucination}`);
  if (surface.dedup_dropped) L.push(`- _(${surface.dedup_dropped} duplicate rows from reaper-kill resume, deduped last-wins)_`);
  if (stamp) L.push(`- _generated: ${stamp}_`);
  L.push("");
  const shown = Math.min(top, surface.prints.length);
  L.push(`## Top ${shown} prints by GOLD-readiness (verify these first)`);
  L.push("");
  L.push("| # | Print | Pg | Corrob (GOLD) | Conf | Ambig | Halluc | Readiness |");
  L.push("|--:|-------|---:|--------------:|-----:|------:|-------:|----------:|");
  surface.prints.slice(0, top).forEach((p, i) => {
    L.push(`| ${i + 1} | ${p.key} | ${p.page} | ${p.corroborated} | ${p.mean_conf.toFixed(2)} | ${p.ambiguous} | ${p.hallucination} | ${p.gold_readiness} |`);
  });
  L.push("");
  L.push("_Source: scripts/ocr-al-queue-surface.mjs over corpus-train/active-learning-queue.jsonl. Re-run after each nightly OCR Training Loop pass._");
  return L.join("\n");
}

/** Read a .jsonl file into an array of objects, fail-soft skipping malformed lines. */
function readJsonl(path) {
  const out = [];
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* torn/partial line -- skip, never abort */ }
  }
  return out;
}

function main() {
  const args = argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const queuePath = get("--queue", DEFAULT_QUEUE);
  const outMd = get("--out-md", DEFAULT_OUT_MD);
  const outJson = get("--out-json", DEFAULT_OUT_JSON);
  const topRaw = get("--top", null);
  const top = topRaw != null ? parseInt(topRaw, 10) : 50;
  const jsonOut = args.includes("--json");

  if (!existsSync(queuePath)) {
    console.error(`[al-queue-surface] queue not found: ${queuePath}`);
    exit(1);
  }
  let rows;
  try { rows = readJsonl(queuePath); }
  catch (e) { console.error(`[al-queue-surface] read failed: ${e instanceof Error ? e.message : String(e)}`); exit(1); }

  const surface = surfaceAlQueue(rows);
  // ts injected here (not in the pure core) so the surface stays deterministic for tests.
  const generatedAt = new Date().toISOString();
  const md = renderMarkdown(surface, { top, generatedAt });

  try {
    mkdirSync(dirname(outMd), { recursive: true });
    writeFileSync(outMd, md);
    writeFileSync(outJson, JSON.stringify({ generatedAt, ...surface, mustHumanVerify: true,
      note: "Operator confirms corroborated dims -> GOLD trainset for india LoRA. Advisory surface; no GOLD label is written by this tool." }, null, 2));
  } catch (e) { console.error(`[al-queue-surface] write failed: ${e instanceof Error ? e.message : String(e)}`); exit(1); }

  if (jsonOut) {
    console.log(JSON.stringify({ ...surface, outMd, outJson }, null, 2));
  } else {
    console.log(`[al-queue-surface] ${surface.distinct_prints} prints | ${surface.total_corroborated_dims} GOLD-candidate dims | ${surface.total_ambiguous} ambiguous | ${surface.total_hallucination} halluc`);
    console.log(`  top print: ${surface.prints[0] ? `${surface.prints[0].key}#${surface.prints[0].page} (${surface.prints[0].corroborated} corrob, readiness ${surface.prints[0].gold_readiness})` : "(empty queue)"}`);
    console.log(`  -> ${outMd}`);
  }
  exit(0);
}

// Run main() only when invoked directly (not on import). Normalize BOTH sides to forward-slash so the
// compare holds on Windows, where fileURLToPath returns a backslash path.
const here = fileURLToPath(import.meta.url).split("\\").join("/");
const invoked = argv[1] ? argv[1].split("\\").join("/") : "";
if (here === invoked) main();
