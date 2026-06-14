// scripts/lib/vision-ensemble-fuse.mjs
//
// U-XRAY-VISION-ENSEMBLE — multi-VLM ensemble blueprint OCR with consensus fusion.
//
// WHY THIS EXISTS (the Blackwell unlock):
//   The single-model OCR path pins ONE vision model (qwen3-vl:8b-instruct) because the
//   old RTX 4080 (16GB) could hold only one resident. The RTX PRO 6000 Blackwell (96GB,
//   ~85GB idle in practice) removes that ceiling — it can hold THREE diverse VLM families
//   GPU-resident at once (qwen3-vl + qwen2.5-vl + llama3.2-vision ≈ 31GB) and serve them
//   CONCURRENTLY. This lib runs N independent VLMs over the SAME print in parallel and
//   FUSES their extractions into a corroborated consensus dimension set.
//
// WHY ENSEMBLE BEATS A BIGGER SINGLE MODEL (the science):
//   A single generative VLM's dominant OCR failure mode is HALLUCINATION — a confidently
//   reported dimension that is not on the drawing (the AI-expert pitfall "hallucination in
//   generative models"). Independent models from DIFFERENT families make UNCORRELATED
//   errors, so:
//     • a dimension ≥2 models agree on is strongly corroborated (a hallucination shared by
//       two independent families is improbable) → high-trust consensus value;
//     • a dimension only ONE model reports is a hallucination CANDIDATE (or a hard-to-read
//       real dim) → surfaced low-trust for the operator-confirm gate, never silently kept
//       as ground truth.
//   This is the exact noisy-OR corroboration doctrine PRISM already uses for cross-SOURCE
//   reconciliation (CrossSourceDimensionReconciliationEngine / dimension-corroborate.mjs:
//   print+CAD+CNC). Here the sources are N independent EXTRACTORS of one print, not
//   heterogeneous data sources — so this is a distinct fold (N-way, same-class, no
//   "CAD-is-exact" orientation), not a duplicate of that 2/3-source engine.
//
// REUSE (does NOT reimplement): the dimension MATCHER (dimMatches / typesCompatible /
//   dimType / dimToMm — type-aware, mm-canonical) from dimension-set-score.mjs, and the
//   prompt/request/parse primitives from ollama-vision-extract-lib.mjs. The only genuinely
//   new logic here is (a) N-way cross-model clustering with one-vote-per-model, (b) the
//   noisy-OR confidence combine in .mjs (the engine's combineConfidence is TS — a .mjs
//   cannot import it; this mirror is documented, not a silent fork), and (c) the
//   concurrent multi-model transport.
//
// PURE CORE (no I/O — unit-tested with reference values):
//   combineConfidenceNoisyOr · normalizeModelDim · clusterAcrossModels · fuseEnsemble
// IMPURE SHELL (fenced at bottom, dependency-injectable, NOT exercised by pure tests):
//   ocrImageWithModelAsync · runEnsembleOverImage

import {
  dimMatches,
  typesCompatible,
  dimType,
  dimToMm,
} from "./dimension-set-score.mjs";
import {
  buildVisionPrompt,
  buildOllamaRequestBody,
  parseVisionResponse,
} from "./ollama-vision-extract-lib.mjs";

// Per-dimension confidence used when a model omits one (parseVisionResponse can yield
// confidence:null). 0.5 = "no information" — it does not bias the weighted mean toward a
// dim, and in the noisy-OR it contributes a neutral half-vote.
export const DEFAULT_DIM_CONF = 0.5;

// Noisy-OR cap — identical to the TS engine's combineConfidence ceiling. No quantity of
// corroboration yields literal certainty (1.0): a residual ~1% reserves the possibility
// that ALL models shared a systematic misread (e.g. a smudged digit every model guesses
// the same way). Keeps the consensus honest (R12).
export const NOISY_OR_CAP = 0.99;

/**
 * Pure: combine independent corroborating confidences via noisy-OR, capped at NOISY_OR_CAP.
 *   P(true | sources) = 1 - Π(1 - cᵢ)
 * Mirrors CrossSourceDimensionReconciliationEngine.combineConfidence (TS — not importable
 * from .mjs). Each confidence is clamped to [0,1]; non-finite/absent entries are dropped.
 * Empty → 0. A single source returns that source's own confidence (capped).
 *
 * @param {number[]} confs
 * @returns {number} combined confidence in [0, NOISY_OR_CAP]
 */
export function combineConfidenceNoisyOr(confs) {
  const xs = (Array.isArray(confs) ? confs : [])
    .map((c) => Number(c))
    .filter((c) => Number.isFinite(c))
    .map((c) => Math.max(0, Math.min(1, c)));
  if (!xs.length) return 0;
  let pNotAll = 1;
  for (const c of xs) pNotAll *= (1 - c);
  return Math.min(NOISY_OR_CAP, +(1 - pNotAll).toFixed(4));
}

/**
 * Pure: normalize one model-reported dimension into the ensemble candidate shape, or null
 * if it carries no usable mm value. Reuses dimToMm (handles {nominal_mm}/{mm}/number and the
 * Number(null)===0 / Number("")===0 footguns) and dimType (collapses "unknown"/sentinels to
 * null → value-only fallback, consistent with the scorer).
 *
 * @param {object|number} d
 * @returns {{type:(string|null), mm:number, confidence:(number|null), raw_text:(string|null)}|null}
 */
export function normalizeModelDim(d) {
  const mm = dimToMm(d);
  if (mm === null) return null;
  const type = dimType(d); // null for bare-number / unknown / sentinel
  let confidence = null;
  if (d && typeof d === "object" && d.confidence != null) {
    const c = Number(d.confidence);
    if (Number.isFinite(c)) confidence = Math.max(0, Math.min(1, c));
  }
  const raw_text = d && typeof d === "object" && typeof d.raw_text === "string" ? d.raw_text : null;
  return { type, mm, confidence, raw_text };
}

/**
 * Pure: cluster dimensions across N models into agreement groups.
 *
 * One-vote-per-model: a cluster never contains two dims from the SAME model — corroboration
 * counts DISTINCT models, and a model reporting the same nominal twice means two real feature
 * instances, not self-corroboration. A candidate joins the FEASIBLE cluster (type-compatible
 * with the cluster's resolved type, value within dimMatches tolerance of the cluster anchor,
 * and not already holding this model) whose anchor is CLOSEST; else it seeds a new cluster.
 *
 * Determinism: candidates are pre-sorted by (type, mm, model) so the anchor (first member) and
 * all assignments are independent of input order.
 *
 * @param {Array<{model:string, dims:Array}>} perModel  per-model normalized-or-raw dim lists
 * @param {{pct?:number, absMm?:number, typeAware?:boolean}} [opts]  matcher tolerances
 * @returns {Array<{anchorMm:number, resolvedType:(string|null), members:Array<{model:string,mm:number,confidence:(number|null),type:(string|null),raw_text:(string|null)}>}>}
 */
export function clusterAcrossModels(perModel, opts = {}) {
  const typeAware = opts.typeAware === undefined ? true : !!opts.typeAware;
  // Flatten to candidates, each tagged with its model. ALWAYS route through normalizeModelDim
  // (idempotent on an already-normalized dim — dimToMm reads nominal_mm??mm and dimType collapses
  // sentinels) so a hand-built {mm, type:"unknown"} can never bypass the sentinel→null collapse
  // and wrongly block a legitimate merge.
  const cands = [];
  for (const entry of Array.isArray(perModel) ? perModel : []) {
    if (!entry || typeof entry !== "object") continue;
    const model = typeof entry.model === "string" && entry.model ? entry.model : "(unknown-model)";
    const dims = Array.isArray(entry.dims) ? entry.dims : [];
    for (const raw of dims) {
      const n = normalizeModelDim(raw);
      if (!n || !Number.isFinite(n.mm)) continue;
      cands.push({ model, mm: n.mm, confidence: n.confidence ?? null, type: n.type ?? null, raw_text: n.raw_text ?? null });
    }
  }
  // Deterministic order: by type (nulls last), then value, then model.
  cands.sort((a, b) => {
    const at = a.type || "￿", bt = b.type || "￿";
    if (at !== bt) return at < bt ? -1 : 1;
    if (a.mm !== b.mm) return a.mm - b.mm;
    return String(a.model).localeCompare(String(b.model));
  });

  const clusters = [];
  for (const c of cands) {
    let best = null, bestDelta = Infinity;
    for (const cl of clusters) {
      if (cl.members.some((m) => m.model === c.model)) continue;          // one vote per model
      if (typeAware && !typesCompatible(c.type, cl.resolvedType)) continue; // type gate
      if (!dimMatches(c.mm, cl.anchorMm, opts)) continue;                  // value gate
      const delta = Math.abs(c.mm - cl.anchorMm);
      if (delta < bestDelta) { bestDelta = delta; best = cl; }
    }
    if (best) {
      best.members.push({ model: c.model, mm: c.mm, confidence: c.confidence, type: c.type, raw_text: c.raw_text });
      if (best.resolvedType == null && c.type != null) best.resolvedType = c.type; // first concrete type wins
    } else {
      clusters.push({ anchorMm: c.mm, resolvedType: c.type, members: [{ model: c.model, mm: c.mm, confidence: c.confidence, type: c.type, raw_text: c.raw_text }] });
    }
  }
  return clusters;
}

/** Pure: weighted mean of mm by confidence; falls back to plain mean when all weights are 0. */
function weightedMeanMm(members) {
  let wsum = 0, vsum = 0;
  for (const m of members) {
    const w = Number.isFinite(m.confidence) && m.confidence > 0 ? m.confidence : 0;
    wsum += w; vsum += w * m.mm;
  }
  if (wsum > 0) return +(vsum / wsum).toFixed(4);
  const mean = members.reduce((s, m) => s + m.mm, 0) / members.length;
  return +mean.toFixed(4);
}

/**
 * Pure: fuse N model extractions into a corroborated consensus dimension set.
 *
 * @param {Array<{model:string, extraction:object}>} modelExtractions  successful per-model OCR
 *        (extraction.dimensions is the per-model dim list — the parseVisionResponse shape).
 * @param {{pct?:number, absMm?:number, typeAware?:boolean, quorum?:number, conflictBand?:number}} [opts]
 *        quorum: distinct-model count for "corroborated" (default max(2, ceil(N/2))).
 *        conflictBand: relative gap below which two same-type clusters are flagged as an
 *        ambiguous pair (value-disagreement OR two distinct similar features). Default 0.30.
 * @returns {{
 *   dimensions: Array<object>,            // fused, corroboration-desc
 *   ambiguous_pairs: Array<object>,       // same-type clusters within conflictBand (operator-disambiguate)
 *   summary: object,
 *   per_model: Array<{model:string, dim_count:number}>,
 * }}
 */
export function fuseEnsemble(modelExtractions, opts = {}) {
  const runs = (Array.isArray(modelExtractions) ? modelExtractions : [])
    .filter((r) => r && typeof r === "object" && typeof r.model === "string" && r.extraction && typeof r.extraction === "object");
  const nModels = runs.length;
  const quorum = Number.isFinite(opts.quorum) && opts.quorum >= 1
    ? Math.floor(opts.quorum)
    : Math.max(2, Math.ceil(nModels / 2));
  const conflictBand = Number.isFinite(opts.conflictBand) ? opts.conflictBand : 0.30;

  const perModel = runs.map((r) => ({
    model: r.model,
    dims: Array.isArray(r.extraction.dimensions) ? r.extraction.dimensions : [],
  }));
  const per_model = perModel.map((p) => ({ model: p.model, dim_count: p.dims.filter((d) => dimToMm(d) !== null).length }));

  const clusters = clusterAcrossModels(perModel, opts);

  const dimensions = clusters.map((cl) => {
    const models = cl.members.map((m) => m.model);
    const corroboration = models.length; // one-vote-per-model ⇒ distinct
    const confs = cl.members.map((m) => (Number.isFinite(m.confidence) ? m.confidence : DEFAULT_DIM_CONF));
    const mms = cl.members.map((m) => m.mm);
    const value_mm = weightedMeanMm(cl.members);
    const value_spread_mm = +(Math.max(...mms) - Math.min(...mms)).toFixed(4);
    const agreement_confidence = combineConfidenceNoisyOr(confs);
    const maxMemberConf = Math.max(...confs);
    let status;
    if (corroboration >= quorum) status = "corroborated";
    else if (corroboration === 1) status = "singleton";
    else status = "partial";
    return {
      type: cl.resolvedType || "unknown",
      value_mm,
      value_spread_mm,
      corroboration,
      n_models: nModels,
      agreement_confidence,
      // the lift this dim gets from independent corroboration vs trusting its single best model
      confidence_gain: +(agreement_confidence - maxMemberConf).toFixed(4),
      status,
      low_corroboration: corroboration < quorum,
      hallucination_candidate: corroboration === 1 && nModels >= 2, // only 1 of ≥2 models saw it
      models,
      member_values_mm: mms,
      raw_texts: cl.members.map((m) => m.raw_text).filter(Boolean),
    };
  });
  // corroboration desc, then tighter agreement, then value — best-trust dims first.
  dimensions.sort((a, b) =>
    b.corroboration - a.corroboration ||
    a.value_spread_mm - b.value_spread_mm ||
    a.value_mm - b.value_mm);

  // Ambiguous pairs: two SAME-(known)-type clusters within conflictBand that did NOT merge
  // (beyond agreement tol). Honestly labeled — could be model value-disagreement on one
  // feature OR two genuinely distinct similar features. NEVER auto-merged, NEVER averaged.
  const ambiguous_pairs = [];
  for (let i = 0; i < dimensions.length; i++) {
    for (let j = i + 1; j < dimensions.length; j++) {
      const a = dimensions[i], b = dimensions[j];
      if (a.type === "unknown" || b.type === "unknown" || a.type !== b.type) continue;
      const big = Math.max(Math.abs(a.value_mm), Math.abs(b.value_mm));
      if (big <= 0) continue;
      const rel = Math.abs(a.value_mm - b.value_mm) / big;
      if (rel > 0 && rel <= conflictBand) {
        ambiguous_pairs.push({
          type: a.type,
          value_a_mm: a.value_mm, value_b_mm: b.value_mm,
          rel_diff: +rel.toFixed(4),
          models_a: a.models, models_b: b.models,
          note: "same-type values within conflict band: model value-disagreement OR two distinct similar features — operator must disambiguate; never auto-merged.",
        });
      }
    }
  }

  const corroborated = dimensions.filter((d) => d.corroboration >= 2);
  const singletons = dimensions.filter((d) => d.corroboration === 1);
  const hist = {};
  for (const d of dimensions) hist[d.corroboration] = (hist[d.corroboration] || 0) + 1;
  const meanCorrob = dimensions.length
    ? +(dimensions.reduce((s, d) => s + d.corroboration, 0) / dimensions.length).toFixed(4) : 0;
  const meanAgreeCorroborated = corroborated.length
    ? +(corroborated.reduce((s, d) => s + d.agreement_confidence, 0) / corroborated.length).toFixed(4) : null;

  const summary = {
    n_models: nModels,
    models: runs.map((r) => r.model),
    per_model_dim_count: Object.fromEntries(per_model.map((p) => [p.model, p.dim_count])),
    quorum,
    n_clusters: dimensions.length,
    n_corroborated: corroborated.length,                 // ≥2 models agree (consensus, high-trust)
    n_partial: dimensions.filter((d) => d.status === "partial").length,
    n_singleton: singletons.length,                      // 1 model only (low-trust)
    n_hallucination_candidates: dimensions.filter((d) => d.hallucination_candidate).length,
    n_ambiguous_pairs: ambiguous_pairs.length,
    corroboration_histogram: hist,
    mean_corroboration: meanCorrob,
    mean_agreement_confidence_corroborated: meanAgreeCorroborated,
    consensus_dim_count: corroborated.length,
  };

  return { dimensions, ambiguous_pairs, summary, per_model };
}

// ──────────────────────────────────────────────────────────────────────────────
// IMPURE SHELL (I/O) — concurrent multi-model transport. Dependency-injectable
// (deps.spawn / deps.writeFile / deps.readFile / deps.unlink) so the runner is testable
// without a live GPU / Ollama, and every per-model failure degrades to a structured
// {error} record (never throws) so one bad model cannot abort the ensemble. NOT exercised
// by the pure unit tests.
//
// Transport is curl (NOT node fetch): node fetch is unreliable against localhost Ollama
// under fleet contention (documented in ocr-closed-loop.mjs / vision-ab-compare.mjs). The
// base64 image goes in a request FILE (curl -d @file) to dodge arg-length limits. Unlike
// the existing spawnSync runners, this spawns ALL models in parallel (Promise.all) — the
// Blackwell concurrency that makes the ensemble nearly free in wall-clock vs one model.
// ──────────────────────────────────────────────────────────────────────────────

import { spawn as nodeSpawn } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_MAX_TIME_SEC = 300; // a freshly-pulled big model's first (cold) call can be slow
// Hard cap on accumulated stdout — parity with the proven spawnSync runners' maxBuffer
// (vision-ab-compare.mjs uses 64MB). The streaming accumulator below has no implicit Node
// maxBuffer, so without this a runaway/streaming model could grow `stdout` unbounded in RAM.
// The real OCR response (num_predict 4096) is tens of KB; exceeding 64MB means a broken
// transport → abort that model loudly rather than OOM the ensemble.
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;

/** Internal: promisified curl spawn → {status, stdout, stderr}. Never rejects. Bounds stdout. */
function curlAsync(args, deps = {}) {
  const spawnFn = typeof deps.spawn === "function" ? deps.spawn : nodeSpawn;
  return new Promise((resolve) => {
    let stdout = "", stderr = "", settled = false, overflow = false;
    let child;
    try {
      child = spawnFn("curl", args, { encoding: "utf8" });
    } catch (e) {
      resolve({ status: null, stdout: "", stderr: e instanceof Error ? e.message : String(e) });
      return;
    }
    const done = (status) => { if (!settled) { settled = true; resolve({ status: overflow ? null : status, stdout, stderr }); } };
    if (child.stdout) child.stdout.on("data", (d) => {
      if (overflow) return;
      stdout += d.toString();
      if (stdout.length > MAX_RESPONSE_BYTES) {
        overflow = true;
        stderr += `[stdout exceeded ${MAX_RESPONSE_BYTES} bytes — aborting]`;
        try { child.kill(); } catch { /* best-effort */ }
        done(null);
      }
    });
    if (child.stderr) child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (e) => { stderr += (e && e.message) || String(e); done(null); });
    child.on("close", (code) => done(code));
  });
}

/**
 * Impure: OCR one already-base64'd image with a SPECIFIC model via Ollama, async. Returns
 * the parsed extraction or {error}. Never throws. Reuses the prompt/request/parse core.
 *
 * @param {{
 *   imageBase64:string, model:string, workDir?:string, tag?:(string|number),
 *   partClass?:string, wireEdm?:boolean, assumeUnits?:string,
 *   ollamaUrl?:string, maxTimeSec?:number,
 *   deps?:{spawn?:Function, writeFile?:Function, unlink?:Function}
 * }} a
 * @returns {Promise<object>}  extraction shape, or { error:string }
 */
export async function ocrImageWithModelAsync(a) {
  const deps = a.deps || {};
  const writeFile = typeof deps.writeFile === "function" ? deps.writeFile : writeFileSync;
  const unlink = typeof deps.unlink === "function" ? deps.unlink : unlinkSync;
  if (typeof a.imageBase64 !== "string" || !a.imageBase64) return { error: "no imageBase64" };
  if (typeof a.model !== "string" || !a.model) return { error: "no model" };
  const url = (a.ollamaUrl || DEFAULT_OLLAMA_URL) + "/api/generate";
  const prompt = buildVisionPrompt(a.partClass || "generic", { wireEdm: !!a.wireEdm });
  const body = buildOllamaRequestBody(prompt, a.imageBase64, { model: a.model });
  const workDir = a.workDir || tmpdir();
  const reqFile = join(workDir, `ens-req-${a.model.replace(/[^\w.-]/g, "_")}-${a.tag ?? "x"}-${process.pid}.json`);
  try { writeFile(reqFile, JSON.stringify(body)); } catch (e) { return { error: `write req: ${e instanceof Error ? e.message : String(e)}` }; }
  const r = await curlAsync(["-s", "--max-time", String(a.maxTimeSec || DEFAULT_MAX_TIME_SEC), url, "-d", "@" + reqFile], deps);
  try { unlink(reqFile); } catch { /* best-effort cleanup */ }
  if (!r || r.status !== 0) return { error: `curl exit=${r ? r.status : "null"} ${(r && r.stderr ? r.stderr.slice(0, 120) : "")}`.trim() };
  let raw;
  try { raw = JSON.parse(r.stdout).response || ""; } catch { return { error: "ollama response not JSON" }; }
  if (!raw) return { error: "empty response" };
  const parsed = parseVisionResponse(raw, { assumeUnits: a.assumeUnits });
  if (!parsed || !parsed.success || !parsed.extraction) return { error: "parse: " + ((parsed && parsed.error) || "no extraction") };
  return parsed.extraction;
}

/**
 * Impure: run an ensemble of VLMs over ONE image CONCURRENTLY, then fuse. The image is read
 * + base64'd ONCE and shared across all models (one disk read, N inferences). Every model
 * runs in parallel via Promise.all — the Blackwell exploit. One model's failure is recorded
 * and excluded from the fuse; the ensemble still produces a result from the survivors.
 *
 * @param {{
 *   png:string, models:string[], partClass?:string, wireEdm?:boolean, assumeUnits?:string,
 *   ollamaUrl?:string, maxTimeSec?:number, workDir?:string,
 *   fuseOpts?:object,
 *   deps?:{spawn?:Function, readFile?:Function, writeFile?:Function, unlink?:Function, now?:Function}
 * }} a
 * @returns {Promise<{
 *   fused:object, per_model_runs:Array<{model:string, ok:boolean, ms:number, dim_count:(number|null), error:(string|null)}>,
 *   models_ok:number, models_failed:number, image:string,
 * }>}
 */
export async function runEnsembleOverImage(a) {
  const deps = a.deps || {};
  const readFile = typeof deps.readFile === "function" ? deps.readFile : readFileSync;
  const now = typeof deps.now === "function" ? deps.now : Date.now;
  const models = Array.isArray(a.models) ? a.models.filter((m) => typeof m === "string" && m) : [];
  if (!a.png || typeof a.png !== "string") return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], models_ok: 0, models_failed: 0, image: a.png || null, error: "no png" };
  if (!models.length) return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], models_ok: 0, models_failed: 0, image: a.png, error: "no models" };

  let b64;
  try { b64 = readFile(a.png).toString("base64"); }
  catch (e) { return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], models_ok: 0, models_failed: 0, image: a.png, error: `read png: ${e instanceof Error ? e.message : String(e)}` }; }

  const results = await Promise.all(models.map(async (model, idx) => {
    const t0 = now();
    const ex = await ocrImageWithModelAsync({
      imageBase64: b64, model, tag: idx, workDir: a.workDir,
      partClass: a.partClass, wireEdm: a.wireEdm, assumeUnits: a.assumeUnits,
      ollamaUrl: a.ollamaUrl, maxTimeSec: a.maxTimeSec, deps,
    });
    const ms = now() - t0;
    if (ex && ex.error) return { model, ok: false, ms, dim_count: null, error: ex.error, extraction: null };
    const dim_count = Array.isArray(ex.dimensions) ? ex.dimensions.length : 0;
    return { model, ok: true, ms, dim_count, error: null, extraction: ex };
  }));

  const okRuns = results.filter((r) => r.ok && r.extraction);
  const fused = fuseEnsemble(okRuns.map((r) => ({ model: r.model, extraction: r.extraction })), a.fuseOpts);
  // extraction included (null on failure) so a consumer can score each single model vs the
  // fused consensus (the ensemble-lift comparison) without re-running OCR.
  const per_model_runs = results.map((r) => ({ model: r.model, ok: r.ok, ms: r.ms, dim_count: r.dim_count, error: r.error, extraction: r.extraction || null }));
  return {
    fused,
    per_model_runs,
    models_ok: okRuns.length,
    models_failed: results.length - okRuns.length,
    image: a.png,
  };
}
