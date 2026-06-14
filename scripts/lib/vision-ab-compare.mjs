// scripts/lib/vision-ab-compare.mjs
//
// U-XRAY-VISION-AB — paired A/B comparison + upgrade verdict for blueprint-OCR
// vision models. THIS is the empirical gate that vision-model-select.mjs
// references in its header ("answered by the A/B benchmark bench-vision-ocr-ab.mjs,
// NOT by an assumed ranking baked in here") but which was never built. Without it,
// the Blackwell big-VRAM upgrade path in vision-model-select is a claim with no
// evidence: this lib produces the evidence.
//
// WHY PAIRED (within-subjects): every model in the A/B runs over the SAME synthetic
// prints (same seeds → byte-identical images + identical ground truth). A paired
// design removes print-to-print variance from the comparison, so a 2-point F1 delta
// is the MODEL's contribution, not luck of the draw on which prints got generated.
// The aggregate verdict is corroborated by a per-print sign count (wins/losses/ties)
// so a single lucky print cannot carry a model over the upgrade margin.
//
// WHY A MARGIN (not just "higher F1 wins"): swapping the proven 8b-instruct default
// for a bigger model costs VRAM, latency, and regression risk. A candidate must beat
// the baseline by a real margin (DEFAULT_F1_MARGIN) on a non-trivial print count to
// justify that cost — otherwise the verdict is "stay", matching vision-model-select's
// zero-regression safe-default behaviour. This is the R12 honesty seam: noise never
// masquerades as an improvement.
//
// PURE CORE (no I/O — unit-tested with reference values):
//   perPrintF1 · summarizeModelRun · rankModels · pairedF1Delta ·
//   determineWinner · buildUpgradeRecommendation
// IMPURE SHELL (fenced at bottom, dependency-injectable, NOT exercised by pure tests):
//   generateSyntheticPrint · ocrPngWithModel · runModelOverPrints
//
// Reuses (does NOT duplicate): ollama-vision-extract-lib (prompt/request/parse),
// dimension-set-score (scoreDimensionSet/aggregateScores), ocr-benchmark-lib
// (percentile), synthetic-print-gen.py (paired prints) — the same primitives
// ocr-closed-loop.mjs uses, run across N models instead of one.

import { spawnSync as nodeSpawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import {
  buildVisionPrompt,
  buildOllamaRequestBody,
  parseVisionResponse,
  DEFAULT_VISION_MODEL,
} from "./ollama-vision-extract-lib.mjs";
import { scoreDimensionSet, aggregateScores } from "./dimension-set-score.mjs";
import { percentile } from "./ocr-benchmark-lib.mjs";
import { isThinkingTrap } from "./vision-model-select.mjs";

// A candidate must beat the baseline's micro-F1 by AT LEAST this much to be
// recommended as an upgrade. 0.02 = 2 percentage points of F1 — large enough that
// run-to-run noise on a ~10-print paired set does not trip it, small enough that a
// genuine capability lift from a 4× larger model is recognised. Tune via opts.marginF1.
export const DEFAULT_F1_MARGIN = 0.02;

// A candidate must also win on AT LEAST this fraction of paired prints (not just the
// aggregate) — guards against one outlier print carrying the aggregate over margin.
export const DEFAULT_MIN_WIN_RATE = 0.5;

// A candidate must OCR at least this fraction of the prints to be eligible for upgrade
// AT ALL. Without this floor, a model that OCR'd 1 of 10 prints but fluked a high F1 on
// that single print could beat the margin on the F1-only path (when no paired data is
// supplied). Comparing F1 across very different coverage is apples-to-oranges; this is
// the absolute floor that keeps the verdict honest even without per-print pairing.
export const DEFAULT_MIN_COVERAGE = 0.5;

// Per-print F1 deltas with magnitude below this are a TIE, not a win/loss — swallows
// float-rounding noise so a 1e-12 difference never counts as a real per-print win.
export const DEFAULT_PAIRED_EPS = 1e-9;

// Per-page p95 latency beyond this is flagged as a cost in the verdict (informational
// on a 96GB Blackwell where big models are still GPU-resident; load-bearing on small
// cards). Does NOT by itself veto an upgrade — quality is the primary axis.
export const DEFAULT_LATENCY_BUDGET_MS = 60000;

/**
 * Pure: F1 from a per-print score record (scoreDimensionSet output). Returns 0 when
 * precision+recall is 0 or non-finite (a model that extracted nothing scores 0, never
 * NaN — so ranking/aggregation stays total). Never throws.
 * @param {{precision?:number, recall?:number}} score
 * @returns {number} F1 in [0,1]
 */
export function perPrintF1(score) {
  if (!score || typeof score !== "object") return 0;
  const p = Number(score.precision);
  const r = Number(score.recall);
  if (!Number.isFinite(p) || !Number.isFinite(r) || p + r <= 0) return 0;
  return (2 * p * r) / (p + r);
}

/**
 * Pure: collapse one model's full run into the comparison-ready summary.
 *
 * @param {{
 *   model: string,
 *   agg: object|null,            // aggregateScores() output (may be null/empty)
 *   latencyMsList?: number[],    // per-print OCR wall time (ms), successes only
 *   ocrOk?: number,              // prints that OCR'd + scored
 *   count?: number,              // total prints attempted
 * }} run
 * @returns {{
 *   model:string, f1:number, recall:number, precision:number, maeMm:(number|null),
 *   p50LatencyMs:(number|null), p95LatencyMs:(number|null), meanLatencyMs:(number|null),
 *   coverage:number, ocrOk:number, count:number, ran:boolean,
 * }}
 */
export function summarizeModelRun(run = {}) {
  const agg = run && run.agg && typeof run.agg === "object" ? run.agg : {};
  const lat = Array.isArray(run.latencyMsList)
    ? run.latencyMsList.map(Number).filter((n) => Number.isFinite(n) && n >= 0)
    : [];
  const count = Number.isFinite(run.count) && run.count > 0 ? run.count : 0;
  const ocrOk = Number.isFinite(run.ocrOk) && run.ocrOk >= 0 ? run.ocrOk : 0;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const maybe = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  return {
    model: typeof run.model === "string" ? run.model : "(unknown)",
    f1: num(agg.micro_f1),
    recall: num(agg.micro_recall),
    precision: num(agg.micro_precision),
    maeMm: maybe(agg.mean_mae_mm),
    p50LatencyMs: lat.length ? percentile(lat, 0.5) : null,
    p95LatencyMs: lat.length ? percentile(lat, 0.95) : null,
    meanLatencyMs: lat.length ? +(lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(1) : null,
    coverage: count ? +(ocrOk / count).toFixed(4) : 0,
    ocrOk,
    count,
    ran: ocrOk > 0,
  };
}

/**
 * Pure: deterministic ranking of model summaries, best first.
 * Order: F1 desc → coverage desc → p95 latency asc (faster wins ties) → model name asc.
 * Returns a NEW array (input not mutated). null/non-array → [].
 * @param {object[]} summaries  summarizeModelRun outputs
 * @returns {object[]}
 */
export function rankModels(summaries) {
  if (!Array.isArray(summaries)) return [];
  const lat = (s) => (Number.isFinite(s && s.p95LatencyMs) ? s.p95LatencyMs : Infinity);
  return summaries.slice().sort((a, b) => {
    if (b.f1 !== a.f1) return b.f1 - a.f1;
    if (b.coverage !== a.coverage) return b.coverage - a.coverage;
    if (lat(a) !== lat(b)) return lat(a) - lat(b);
    return String(a.model).localeCompare(String(b.model));
  });
}

/**
 * Pure: per-print paired sign count between two models on the SAME prints.
 * Both arrays MUST be index-aligned (print i in both). A print counts as a "win" for
 * the candidate when its F1 exceeds the baseline's by more than `eps` (default tiny
 * epsilon to swallow float noise); a "loss" when the baseline exceeds; else a "tie".
 * Prints where either side is missing/non-finite are skipped (nPaired excludes them).
 *
 * @param {object[]} baselineScores  scoreDimensionSet outputs (baseline)
 * @param {object[]} candidateScores scoreDimensionSet outputs (candidate), index-aligned
 * @param {{eps?:number}} [opts]
 * @returns {{nPaired:number, wins:number, losses:number, ties:number,
 *            meanF1Delta:(number|null), winRate:(number|null)}}
 *   wins/losses/winRate are from the CANDIDATE's perspective.
 */
export function pairedF1Delta(baselineScores, candidateScores, opts = {}) {
  const eps = Number.isFinite(opts.eps) ? opts.eps : DEFAULT_PAIRED_EPS;
  const base = Array.isArray(baselineScores) ? baselineScores : [];
  const cand = Array.isArray(candidateScores) ? candidateScores : [];
  const n = Math.min(base.length, cand.length);
  let wins = 0, losses = 0, ties = 0, nPaired = 0, deltaSum = 0;
  for (let i = 0; i < n; i++) {
    if (!base[i] || !cand[i]) continue;
    const bf = perPrintF1(base[i]);
    const cf = perPrintF1(cand[i]);
    if (!Number.isFinite(bf) || !Number.isFinite(cf)) continue;
    nPaired++;
    const d = cf - bf;
    deltaSum += d;
    if (d > eps) wins++;
    else if (d < -eps) losses++;
    else ties++;
  }
  return {
    nPaired,
    wins,
    losses,
    ties,
    meanF1Delta: nPaired ? +(deltaSum / nPaired).toFixed(4) : null,
    winRate: nPaired ? +(wins / nPaired).toFixed(4) : null,
  };
}

/**
 * Pure: decide whether to UPGRADE from the baseline model or STAY.
 *
 * A candidate is recommended ("upgrade") iff ALL hold:
 *   • baseline actually ran (coverage > 0) — else we have no floor → "inconclusive"
 *   • candidate ran (coverage > 0)
 *   • candidate.f1 - baseline.f1 >= marginF1
 *   • paired win-rate (if paired data supplied) >= minWinRate
 * Otherwise → "stay" on the baseline (zero-regression default), or "inconclusive" when
 * the baseline never ran.
 *
 * @param {object[]} summaries  summarizeModelRun outputs (must include the baseline)
 * @param {{
 *   baselineModel?: string,
 *   marginF1?: number,
 *   minWinRate?: number,
 *   latencyBudgetMs?: number,
 *   paired?: Record<string, {winRate:(number|null), nPaired:number}>, // candidate model → pairedF1Delta
 * }} [opts]
 * @returns {{
 *   action:"upgrade"|"stay"|"inconclusive",
 *   recommendedModel:(string|null), baselineModel:string,
 *   baselineF1:(number|null), candidateModel:(string|null), candidateF1:(number|null),
 *   deltaF1:(number|null), marginF1:number, beatsMargin:boolean,
 *   pairedWinRate:(number|null), minWinRate:number, latencyWarning:(string|null),
 *   ranked:object[], rationale:string,
 * }}
 */
export function determineWinner(summaries, opts = {}) {
  const baselineModel = typeof opts.baselineModel === "string" && opts.baselineModel
    ? opts.baselineModel : DEFAULT_VISION_MODEL;
  const marginF1 = Number.isFinite(opts.marginF1) ? opts.marginF1 : DEFAULT_F1_MARGIN;
  const minWinRate = Number.isFinite(opts.minWinRate) ? opts.minWinRate : DEFAULT_MIN_WIN_RATE;
  const minCoverage = Number.isFinite(opts.minCoverage) ? opts.minCoverage : DEFAULT_MIN_COVERAGE;
  const latencyBudgetMs = Number.isFinite(opts.latencyBudgetMs) ? opts.latencyBudgetMs : DEFAULT_LATENCY_BUDGET_MS;
  const paired = opts.paired && typeof opts.paired === "object" ? opts.paired : {};

  const list = Array.isArray(summaries) ? summaries : [];
  const ranked = rankModels(list);
  const base = list.find((s) => s && s.model === baselineModel) || null;

  const stay = (rationale, extra = {}) => ({
    action: "stay",
    recommendedModel: base ? base.model : baselineModel,
    baselineModel,
    baselineF1: base ? base.f1 : null,
    candidateModel: null, candidateF1: null, deltaF1: null,
    marginF1, beatsMargin: false, pairedWinRate: null, minWinRate,
    latencyWarning: null, ranked, rationale, ...extra,
  });

  if (!list.length) {
    return { ...stay("no model runs to compare"), action: "inconclusive", recommendedModel: baselineModel };
  }
  if (!base) {
    return {
      ...stay(`baseline "${baselineModel}" not in the A/B set — cannot establish a zero-regression floor`),
      action: "inconclusive",
      recommendedModel: ranked[0] ? ranked[0].model : baselineModel,
    };
  }
  if (!base.ran || base.coverage <= 0) {
    return { ...stay(`baseline "${baselineModel}" did not OCR any print (coverage 0) — no floor to beat`), action: "inconclusive" };
  }

  // Best NON-baseline candidate by rank.
  const candidate = ranked.find((s) => s.model !== baselineModel) || null;
  if (!candidate) return stay("only the baseline ran — no candidate to upgrade to");
  if (!candidate.ran || candidate.coverage <= 0) {
    return stay(`top candidate "${candidate.model}" did not OCR any print — staying on baseline`);
  }
  if (candidate.coverage < minCoverage) {
    return stay(`top candidate "${candidate.model}" coverage ${candidate.coverage} below floor ${minCoverage} — too few prints OCR'd to trust an upgrade (F1 on a partial set is not comparable to a full-coverage baseline)`);
  }

  const deltaF1 = +(candidate.f1 - base.f1).toFixed(4);
  const pr = paired[candidate.model] || null;
  const pairedWinRate = pr && Number.isFinite(pr.winRate) ? pr.winRate : null;
  const beatsF1 = deltaF1 >= marginF1;
  // Paired gate only applies when paired data was supplied for this candidate.
  const beatsPaired = pairedWinRate == null ? true : pairedWinRate >= minWinRate;
  const beatsMargin = beatsF1 && beatsPaired;

  const latencyWarning = (Number.isFinite(candidate.p95LatencyMs) && candidate.p95LatencyMs > latencyBudgetMs)
    ? `candidate p95 latency ${Math.round(candidate.p95LatencyMs)}ms/page exceeds budget ${latencyBudgetMs}ms — acceptable on big-VRAM hosts, costly elsewhere`
    : null;

  if (beatsMargin) {
    return {
      action: "upgrade",
      recommendedModel: candidate.model,
      baselineModel,
      baselineF1: base.f1,
      candidateModel: candidate.model,
      candidateF1: candidate.f1,
      deltaF1, marginF1, beatsMargin: true,
      pairedWinRate, minWinRate, latencyWarning, ranked,
      rationale: `"${candidate.model}" beats baseline F1 by ${deltaF1} (≥ margin ${marginF1})`
        + (pairedWinRate != null ? ` and wins ${(pairedWinRate * 100).toFixed(0)}% of paired prints (≥ ${(minWinRate * 100).toFixed(0)}%)` : "")
        + (latencyWarning ? " — note latency cost" : ""),
    };
  }

  const why = !beatsF1
    ? `ΔF1 ${deltaF1} < margin ${marginF1}`
    : `paired win-rate ${pairedWinRate} < ${minWinRate} (aggregate gain not corroborated per-print)`;
  return {
    action: "stay",
    recommendedModel: base.model,
    baselineModel,
    baselineF1: base.f1,
    candidateModel: candidate.model,
    candidateF1: candidate.f1,
    deltaF1, marginF1, beatsMargin: false,
    pairedWinRate, minWinRate, latencyWarning, ranked,
    rationale: `no upgrade — best candidate "${candidate.model}" ${why}; staying on safe default "${baselineModel}"`,
  };
}

/**
 * Pure: shape the verdict into an actionable upgrade recommendation that pairs with
 * vision-model-select. `selection` is an optional selectVisionModel() output (what the
 * seam picks today). Surfaces the concrete next step (pull / add-to-preference / none).
 *
 * @param {object} verdict   determineWinner() output
 * @param {object|null} [selection]  selectVisionModel() output (optional)
 * @returns {{action:string, recommendedModel:(string|null), currentSelection:(string|null),
 *            alreadySelected:boolean, nextStep:string, evidence:object}}
 */
export function buildUpgradeRecommendation(verdict, selection = null) {
  const v = verdict && typeof verdict === "object" ? verdict : {};
  const currentSelection = selection && typeof selection.model === "string" ? selection.model : null;
  const rec = v.recommendedModel || null;
  const alreadySelected = !!(rec && currentSelection && rec === currentSelection);
  // A recommended thinking-trap tag would be SILENTLY skipped by vision-model-select's
  // isJsonSafeVisionModel gate — so the recommendation must call it out, never tell the
  // operator to wire a model the seam will refuse. (Self-defeating in practice: a trap
  // emits no JSON → coverage 0 → never becomes the candidate; this guards the edge where
  // an operator force-benched a bare tag anyway.)
  const recommendedIsThinkingTrap = rec ? isThinkingTrap(rec) : false;

  let nextStep;
  if (v.action === "upgrade") {
    if (recommendedIsThinkingTrap) {
      nextStep = `WARNING: recommended "${rec}" is a thinking-trap variant — vision-model-select will SKIP it (it emits a <think> chain, not JSON). Use its "-instruct" variant instead before wiring.`;
    } else {
      nextStep = alreadySelected
        ? `selection already resolves to "${rec}" — no change needed`
        : `add "${rec}" to BIG_VISION_PREFERENCE (or set PRISM_VISION_MODEL) and ensure it is pulled, then re-run vision-model-select`;
    }
  } else if (v.action === "stay") {
    nextStep = `keep the safe default "${v.baselineModel || DEFAULT_VISION_MODEL}" — no benchmark-backed reason to change`;
  } else {
    nextStep = "inconclusive — re-run the A/B with the baseline present and OCR'ing, or more prints";
  }

  return {
    action: v.action || "inconclusive",
    recommendedModel: rec,
    currentSelection,
    alreadySelected,
    recommendedIsThinkingTrap,
    nextStep,
    evidence: {
      baselineModel: v.baselineModel ?? null,
      baselineF1: v.baselineF1 ?? null,
      candidateModel: v.candidateModel ?? null,
      candidateF1: v.candidateF1 ?? null,
      deltaF1: v.deltaF1 ?? null,
      marginF1: v.marginF1 ?? null,
      pairedWinRate: v.pairedWinRate ?? null,
      latencyWarning: v.latencyWarning ?? null,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// IMPURE SHELL (I/O) — paired-run primitives. Dependency-injectable (deps.spawn,
// deps.readFile) so the CLI is testable without a live GPU / Ollama / Python, and
// every failure degrades to a structured {error} record (never throws) so one bad
// print/model cannot abort the whole A/B walk. NOT imported by the pure unit tests.
//
// These mirror ocr-closed-loop.mjs's generatePrint/ocrPng but are (a) model-
// parameterised for A/B and (b) DI-shaped; the single-model closed loop keeps its
// own copies (proven, unchanged) — consolidation tracked as a follow-up dedup.
// ──────────────────────────────────────────────────────────────────────────────

const GEN_TIMEOUT_MS = 60000;
const DEFAULT_OCR_MAX_TIME_SEC = 200;

/**
 * Impure: generate ONE synthetic dimensioned print → {png, truth} | {error}.
 * @param {{seed:number, workDir:string, difficulty?:string, python:string, gen:string,
 *          spawn?:Function, readFile?:Function}} a
 */
export function generateSyntheticPrint(a) {
  const spawn = typeof a.spawn === "function" ? a.spawn : nodeSpawnSync;
  const readFile = typeof a.readFile === "function" ? a.readFile : readFileSync;
  const png = join(a.workDir, `ab-${a.seed}.png`);
  const r = spawn(a.python, [a.gen, "--out", png, "--seed", String(a.seed), "--units", "in", "--difficulty", a.difficulty || "easy"], { encoding: "utf8", timeout: GEN_TIMEOUT_MS });
  if (!r || r.status !== 0 || !existsSync(png) || !existsSync(png + ".truth.json")) {
    return { error: `gen seed=${a.seed} exit=${r ? r.status : "null"} ${((r && r.stderr) || "").slice(0, 120)}` };
  }
  try {
    return { png, truth: JSON.parse(readFile(png + ".truth.json", "utf8")) };
  } catch (e) {
    return { error: `truth parse seed=${a.seed}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Impure: OCR a PNG with a SPECIFIC model via Ollama (curl transport — node fetch is
 * unreliable against localhost Ollama under fleet contention, per ocr-closed-loop).
 * Returns the inner extraction or {error}. Never throws.
 * @param {{png:string, model:string, workDir:string, seed:(number|string),
 *          ollamaUrl?:string, maxTimeSec?:number, spawn?:Function, readFile?:Function}} a
 */
export function ocrPngWithModel(a) {
  const spawn = typeof a.spawn === "function" ? a.spawn : nodeSpawnSync;
  const readFile = typeof a.readFile === "function" ? a.readFile : readFileSync;
  const url = (a.ollamaUrl || "http://127.0.0.1:11434") + "/api/generate";
  let b64;
  try { b64 = readFile(a.png).toString("base64"); } catch (e) { return { error: `read png: ${e instanceof Error ? e.message : String(e)}` }; }
  const body = buildOllamaRequestBody(buildVisionPrompt("generic"), b64, { model: a.model });
  const reqFile = join(a.workDir, `ab-req-${a.model.replace(/[^\w.-]/g, "_")}-${a.seed}.json`);
  try { writeFileSync(reqFile, JSON.stringify(body)); } catch (e) { return { error: `write req: ${e instanceof Error ? e.message : String(e)}` }; }
  const r = spawn("curl", ["-s", "--max-time", String(a.maxTimeSec || DEFAULT_OCR_MAX_TIME_SEC), url, "-d", "@" + reqFile], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try { unlinkSync(reqFile); } catch { /* ignore */ }
  if (!r || r.status !== 0) return { error: `curl exit=${r ? r.status : "null"}` };
  let raw;
  try { raw = JSON.parse(r.stdout).response || ""; } catch { return { error: "ollama response not JSON" }; }
  if (!raw) return { error: "empty response" };
  const parsed = parseVisionResponse(raw, { assumeUnits: "in" });
  if (!parsed || !parsed.success || !parsed.extraction) return { error: "parse: " + ((parsed && parsed.error) || "no extraction") };
  return parsed.extraction;
}

/**
 * Impure: run ONE model over a pre-generated set of paired prints. Returns the run
 * bundle consumed by summarizeModelRun + pairedF1Delta. Prints are {seed, png, truth}.
 * @param {{model:string, prints:Array<{seed:number,png:string,truth:object}>,
 *          ollamaUrl?:string, maxTimeSec?:number, spawn?:Function, readFile?:Function,
 *          onCase?:Function}} a
 * @returns {{model:string, agg:object, latencyMsList:number[], ocrOk:number,
 *            count:number, perPrintScores:Array<object|null>, cases:object[]}}
 */
export function runModelOverPrints(a) {
  const prints = Array.isArray(a.prints) ? a.prints : [];
  const scores = [];
  const perPrintScores = [];
  const latencyMsList = [];
  const cases = [];
  for (const p of prints) {
    const t0 = nowMs(a.now);
    const ex = ocrPngWithModel({ png: p.png, model: a.model, workDir: p.workDir || dirnameOf(p.png), seed: p.seed, ollamaUrl: a.ollamaUrl, maxTimeSec: a.maxTimeSec, spawn: a.spawn, readFile: a.readFile });
    const ms = nowMs(a.now) - t0;
    if (ex && ex.error) {
      perPrintScores.push(null);
      cases.push({ seed: p.seed, error: ex.error, ms });
    } else {
      const sc = scoreDimensionSet((ex && ex.dimensions) || [], (p.truth && p.truth.dimensions) || []);
      scores.push(sc);
      perPrintScores.push(sc);
      latencyMsList.push(ms);
      const pnHit = ((ex.title_block || {}).part_number || "") === ((p.truth.title_block || {}).part_number || "");
      cases.push({ seed: p.seed, ms, recall: sc.recall, precision: sc.precision, matched: sc.matched, n_truth: sc.n_truth, mae_mm: sc.mae_mm, pn_hit: pnHit });
    }
    if (typeof a.onCase === "function") a.onCase(cases[cases.length - 1], a.model);
  }
  return {
    model: a.model,
    agg: aggregateScores(scores),
    latencyMsList,
    ocrOk: scores.length,
    count: prints.length,
    perPrintScores,
    cases,
  };
}

// tiny internal helpers (kept out of the pure export surface)
function nowMs(injected) { return typeof injected === "function" ? injected() : Date.now(); }
function dirnameOf(p) { const i = String(p).replace(/\\/g, "/").lastIndexOf("/"); return i >= 0 ? String(p).slice(0, i) : "."; }
