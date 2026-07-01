// cad-part-decipher-hermes.mjs -- parallel-Hermes decipher of the residual the deterministic
// classifier could not decide (U-DELTA-CAD-DECIPHER-HERMES, slot:delta).
//
// Operator work order: "utilize parallel hermes agents ... decipher the print ... adding material
// for finishing operations, adding features for clamping or work holding."
//
// cad-part-decipher.mjs classifies 92.6% of the 2217 kernel-validated parts deterministically ($0,
// R5). The ~70 it marks `needsReasoning:true` (round-vs-prismatic genuinely undecidable from an
// AABB + shop-name alone -- e.g. "CASING WITH SINGLE SIDE BORE" [63.88, 50.93, 50.93]) are the
// residual THIS module owns: it asks a Hermes agent per part, bounded-concurrency (mapPool), to
// return the manufacturing family + workholding + finish stock. Hermes runs OUTSIDE Claude's
// context (a stronger-than-Ollama managed lane) -- the right tier for shop-language reasoning.
//
// LANE (the documented cloud/local trap -- reference_hermes_enrichment_loop_harness): the shared
// PRISM_HERMES_PROXY_URL is the NVIDIA OpenAI-compatible lane (integrate.api.nvidia.com/v1) with
// NVIDIA_API_KEY. Its default grok function-id 404s; a SERVED model (meta/llama-3.3-70b-instruct,
// the lane fallback) works. gpt-oss-120b is a REASONING model -> emits `reasoning` then `content`
// and truncates on a small token budget, so the bulk default is the fast direct-answer llama-3.3.
//
// Dark-lane-safe: if the lane is unreachable the run is a no-op with laneDown:true (never throws,
// never fabricates a decipher) -- matches the fleet cron pattern + R12 surfaces it in the report.
// This is ADVISORY (delta=CAD): authoritative workholding force/collision stays with the safety
// engines + Fusion kernel. It deciphers; it does not certify.

import fs from "node:fs";
import path from "node:path";
import { mapPool } from "./hermes-domain-enrichment-loop.mjs";

const PROXY = process.env.PRISM_HERMES_PROXY_URL || "https://integrate.api.nvidia.com/v1";
const KEY = process.env.PRISM_HERMES_TOKEN || process.env.NVIDIA_API_KEY || "";
const MODEL = process.env.PRISM_CAD_HERMES_MODEL || "meta/llama-3.3-70b-instruct";
const CONCURRENCY = Number(process.env.PRISM_CAD_HERMES_CONCURRENCY || 2); // NVIDIA lane rate-limits wide fan-out
const RETRIES = Number(process.env.PRISM_CAD_HERMES_RETRY || 3);
const FLUSH_EVERY = Number(process.env.PRISM_CAD_HERMES_FLUSH_EVERY || 8); // persist every N parts (kill-safe cron)
const FAMILIES = new Set(["round", "prismatic", "unsure"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Build the OpenAI-compatible messages for one residual part. */
export function buildDecipherMessages(part) {
  const bbox = part.bbox || part.bboxMm || [];
  const sorted = [...bbox].sort((a, b) => b - a);
  const [L, M, S] = sorted;
  const eqHint = M != null && S != null && Math.abs(M - S) <= 0.03 * Math.max(M, S)
    ? ` Two extents are ~equal (${M}, ${S}) -> a diameter across two axes is plausible.`
    : (L != null && M != null && Math.abs(L - M) <= 0.03 * Math.max(L, M)
      ? ` The two largest extents are ~equal (${L}, ${M}).`
      : " No two extents are equal (prismatic-leaning geometry).");
  return [
    { role: "system", content: "You are a CNC job-shop process planner. Decide whether a machined part is best produced TURNED (round body, chucked on its OD on a lathe) or PRISMATIC (block/plate, milling vise/fixture). Answer ONLY with compact single-line JSON, no prose, no markdown." },
    { role: "user", content:
      `Part name: ${JSON.stringify(part.label)}\n` +
      `Part class: ${part.partClass || "unknown"}\n` +
      `Bounding-box extents (mm): [${sorted.join(", ")}].${eqHint}\n` +
      `Respond ONLY as JSON: {"family":"round"|"prismatic"|"unsure","confidence":0.0-1.0,"reason":"one sentence","workholding":"one phrase","finish_stock_mm_per_side":number}` },
  ];
}

/** Robustly extract the decipher JSON from a model reply (may carry fences / prose / be null). */
export function parseHermesDecipher(content) {
  if (typeof content !== "string" || !content.trim()) return null;
  let text = content.replace(/```json/gi, "```").replace(/```/g, " ");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let obj;
  try { obj = JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  const family = String(obj.family || "").trim().toLowerCase(); // trim: recover "round " / " prismatic"
  if (!FAMILIES.has(family)) return null; // never accept an off-vocabulary family (no fabrication)
  const conf = Number(obj.confidence);
  return {
    family,
    confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : null,
    reason: typeof obj.reason === "string" ? obj.reason.slice(0, 240) : null,
    workholding: typeof obj.workholding === "string" ? obj.workholding.slice(0, 120) : null,
    finishStockMmPerSide: Number.isFinite(Number(obj.finish_stock_mm_per_side)) ? Number(obj.finish_stock_mm_per_side) : null,
  };
}

/** POST one part to the Hermes lane; 429/503 backoff; returns parsed decipher or null. */
export async function defaultAsk(part, { fetchImpl = fetch, model = MODEL, url = PROXY, key = KEY, retries = RETRIES } = {}) {
  const body = { model, messages: buildDecipherMessages(part), temperature: 0.2, max_tokens: 300 };
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetchImpl(`${url.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
    } catch {
      if (attempt < retries) { await sleep(2000 * (attempt + 1)); continue; }
      return null;
    }
    if ((res.status === 429 || res.status === 503) && attempt < retries) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    const content = j?.choices?.[0]?.message?.content;
    return parseHermesDecipher(content);
  }
  return null;
}

/** Probe the lane once (dark-lane-safe): a cheap models list; returns true if reachable. */
export async function probeLane({ fetchImpl = fetch, url = PROXY, key = KEY } = {}) {
  if (!key) return false;
  try {
    const r = await fetchImpl(`${url.replace(/\/$/, "")}/models`, { headers: { Authorization: `Bearer ${key}` } });
    return r.ok;
  } catch { return false; }
}

/** Load the residual (needsReasoning:true) rows from the deterministic decipher dataset. */
export function loadResidual(decipherPath) {
  const raw = fs.readFileSync(decipherPath, "utf8").trim();
  const out = [];
  for (const l of raw ? raw.split("\n") : []) {
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o?.classification?.needsReasoning) out.push({ label: o.label, partClass: o.partClass, bbox: o.bboxMm });
  }
  return out;
}

/**
 * runHermesResidual -- parallel-Hermes decipher over the residual. Bounded concurrency + resumable.
 * @param {Array} residual  from loadResidual
 * @param {{askImpl?:Function, concurrency?:number, outPath?:string, resume?:boolean, limit?:number,
 *          probeImpl?:Function, skipProbe?:boolean, flushEvery?:number}} [opts]
 */
export async function runHermesResidual(residual, opts = {}) {
  const askImpl = opts.askImpl || defaultAsk;
  const concurrency = opts.concurrency || CONCURRENCY;
  const stats = { total: residual.length, considered: 0, resolved: 0, unsure: 0, unparsed: 0, errored: 0, skippedDuplicate: 0, byFamily: {}, samples: [], laneDown: false };

  if (!opts.skipProbe) {
    const up = await (opts.probeImpl || probeLane)();
    if (!up) { stats.laneDown = true; return stats; } // dark-lane-safe: no-op, never fabricate
  }

  const seen = new Set();
  if (opts.resume && opts.outPath && fs.existsSync(opts.outPath)) {
    for (const l of fs.readFileSync(opts.outPath, "utf8").trim().split("\n")) {
      try { const o = JSON.parse(l); if (o?.label) seen.add(o.label); } catch { /* skip */ }
    }
  }

  // Dedup against BOTH the resume-set and within the input itself (a label seen twice is asked once).
  let work = [];
  for (const p of residual) {
    if (p.label && seen.has(p.label)) continue;
    if (p.label) seen.add(p.label);
    work.push(p);
  }
  stats.skippedDuplicate = residual.length - work.length;
  if (opts.limit) work = work.slice(0, opts.limit);

  // Persist in CHUNKS, not once at the end: a killed / 1h-capped / rebooted cron run keeps every
  // completed chunk, so convergence is monotonic across runs instead of all-or-nothing. A fresh
  // (non-resume) run truncates first so the appended chunks ARE the whole output; --resume appends.
  const flushEvery = opts.flushEvery || FLUSH_EVERY;
  if (opts.outPath) {
    fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
    if (!opts.resume) fs.writeFileSync(opts.outPath, ""); // fresh run starts clean
  }

  for (let i = 0; i < work.length; i += flushEvery) {
    const chunk = work.slice(i, i + flushEvery);
    const records = await mapPool(chunk, concurrency, async (part) => {
      const hermes = await askImpl(part);
      return { label: part.label, partClass: part.partClass, bboxMm: part.bbox, hermes, decipheredBy: "hermes", model: MODEL };
    });
    const out = [];
    for (const rec of records) {
      stats.considered++;
      if (rec && rec.__error) { stats.errored++; continue; } // the call itself threw (mapPool error slot)
      if (!rec || !rec.hermes) { stats.unparsed++; continue; } // model reply rejected -> surfaced, not fabricated
      const fam = rec.hermes.family;
      stats.byFamily[fam] = (stats.byFamily[fam] || 0) + 1;
      if (fam === "unsure") stats.unsure++; else stats.resolved++;
      if (stats.samples.length < 8) stats.samples.push({ label: rec.label, family: fam, conf: rec.hermes.confidence, hold: rec.hermes.workholding });
      if (opts.outPath) out.push(JSON.stringify(rec));
    }
    if (opts.outPath && out.length) fs.appendFileSync(opts.outPath, out.join("\n") + "\n"); // flush THIS chunk now
  }
  return stats;
}

export const __test = { buildDecipherMessages, parseHermesDecipher, loadResidual, FAMILIES };

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1]?.endsWith("cad-part-decipher-hermes.mjs")) {
  const args = process.argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); if (i < 0) return d; const v = args[i + 1]; return v && !v.startsWith("--") ? v : d; };
  const inPath = get("--in", "state/shared/cad-fusion-live/part-decipher.jsonl");
  const outPath = args.includes("--out") ? get("--out", "state/shared/cad-fusion-live/part-decipher-hermes.jsonl") : null;
  const limit = get("--limit", null);
  const residual = loadResidual(inPath);
  const stats = await runHermesResidual(residual, { outPath, resume: args.includes("--resume"), limit: limit ? Number(limit) : undefined });
  if (args.includes("--json")) console.log(JSON.stringify(stats, null, 2));
  else if (stats.laneDown) console.log(`Hermes lane DOWN (no key or unreachable) -- residual ${stats.total} left for a later pass (dark-safe no-op)`);
  else {
    console.log(`parallel-Hermes decipher: ${stats.considered} asked, resolved=${stats.resolved} unsure=${stats.unsure} unparsed=${stats.unparsed} errored=${stats.errored} (of ${stats.total} residual)`);
    if (stats.considered > 0 && stats.resolved + stats.unsure === 0) {
      console.log(`  ⚠ EVERY reply unparsed/errored -- likely the lane model is not served (check PRISM_CAD_HERMES_MODEL='${MODEL}' is on this lane; the grok default 404s on NVIDIA)`);
    }
    console.log(`  byFamily: ${JSON.stringify(stats.byFamily)}`);
    stats.samples.forEach((s) => console.log(`  ${s.label} -> ${s.family} (${s.conf}) | ${s.hold}`));
    if (outPath) console.log(`  wrote -> ${outPath}`);
  }
}
