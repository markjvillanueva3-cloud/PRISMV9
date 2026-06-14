#!/usr/bin/env node
/**
 * quoting-train-cycle — invoke QuotingTrainingOrchestratorEngine.runOnce() from cron/scheduler.
 *
 * Operator overnight directive: "keep training the system with quoting".
 * yolo-iter1 shipped the orchestrator engine; yolo-iter3 ships the cron-side
 * invoker so the loop can actually fire every N minutes via Windows Task Scheduler.
 *
 * Reads JM Die baseline records from state/shared/quoting/baseline-records.json
 * (shape: { records: QuoteBaselineRecord[] }), runs one calibration cycle, prints
 * a one-line summary, exits 0 on success / 1 on error.
 *
 * Usage:
 *   node H:/prism/scripts/quoting-train-cycle.mjs
 *   node H:/prism/scripts/quoting-train-cycle.mjs --baseline state/shared/quoting/baseline-records.json
 *   node H:/prism/scripts/quoting-train-cycle.mjs --no-write   (dry-run: derive + CoV but don't write active factors)
 *   node H:/prism/scripts/quoting-train-cycle.mjs --feed-psn   (also feed psi_delta to autonomy loop)
 *   node H:/prism/scripts/quoting-train-cycle.mjs --json       (machine-readable single-line JSON)
 *
 * Exit codes:
 *   0  cycle ran successfully (active factors may or may not have been written depending on CoV verdict)
 *   1  cycle errored or baseline records missing
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-SCHEDULED-RETRAIN (charlie /goal-yolo iter3)
 */

import { promises as fs, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { validateBaseline } from "./lib/quoting-baseline-guard.mjs";
import { resolveTrainableBaseline } from "./lib/quoting-baseline-resolve.mjs";
import { matchPredictedToActuals, loadActualPrices } from "./lib/quoting-actuals-match.mjs";

/**
 * iter10: pure ledger-row builder — shape every train-cycle result into a stable
 * JSONL row for drift audit. Exported so the test file can pin the shape.
 * Defensive against partial/null result fields (training engines may throw,
 * skip, or short-circuit before populating report.metrics).
 */
export function buildLedgerRow(result, tsIso = new Date().toISOString(), realMatch = null) {
  const r = result ?? {};
  const report = r.report ?? {};
  const metrics = report.metrics ?? {};
  const rm = realMatch ?? {};
  return {
    ts_iso: tsIso,
    ok: Boolean(r.ok),
    reason: r.reason ?? null,
    total_predicted: typeof report.total_predicted === "number" ? report.total_predicted : 0,
    mape_pct: typeof metrics.mape_pct === "number" ? metrics.mape_pct : null,
    safe_to_activate: Boolean(r.safe_to_activate),
    active_factor_written: Boolean(r.active_factor_written),
    active_factor_path: r.active_factor_path ?? null,
    psi_delta_fed_count: typeof r.psi_delta_fed_count === "number" ? r.psi_delta_fed_count : 0,
    skip_reason: r.skip_reason ?? null,
    warnings_count: Array.isArray(r.warnings) ? r.warnings.length : 0,
    // U-QP-LEDGER-REF-RELIABILITY: capture the outbound-calibration reference health (from the
    // real_distribution_match block) so the drift-audit trail detects when the reference degrades
    // (e.g. more OCR noise ingested) over time. null when the cycle produced no match (no
    // predictions / engine unavailable). Validated by type (a malformed realMatch yields null).
    reference_reliable: typeof rm.reference_reliable === "boolean" ? rm.reference_reliable : null,
    reliability_verdict: typeof rm.reliability_verdict === "string" ? rm.reliability_verdict : null,
  };
}

export const TRAINING_STATUS_SCHEMA_VERSION = "1.0.0";

/**
 * iter3 (U-QP-TRAINING-STATUS-SNAPSHOT, charlie 2026-06-02): build the single-object
 * "latest quoting training cycle" status snapshot that the PRISM app FRONTEND and any
 * BACKEND consumer polls — the front-to-back data-synergy surface for the closed loop
 * (sibling to latest-drift-alert.json, which SessionStart already consumes). Unlike the
 * append-only train-cycle-history.jsonl (full audit trail), this is the latest single
 * record so a consumer reads one small file instead of tail-parsing the ledger.
 *
 * Pure + defensive — mirrors buildLedgerRow's null-safety: a partial / short-circuited /
 * thrown cycle still yields a stable, schema-versioned shape (every field present, typed,
 * defaulted). Carries the iter1 baseline provenance so a consumer can SEE when the loop
 * trained on a fallback corpus instead of the configured baseline.
 *
 * @param {object} result            QuotingTrainingOrchestratorEngine.runOnce() result
 * @param {object} [opts]
 * @param {string} [opts.tsIso]
 * @param {object|null} [opts.realMatch]          real_distribution_match block
 * @param {object|null} [opts.dataCoverage]       data_source_coverage block
 * @param {object} [opts.baselineProvenance]      { baseline_source, baseline_fallback }
 * @param {string[]} [opts.baselineWarnings]      guard advisory warnings
 */
export function buildTrainingStatusSnapshot(result, opts = {}) {
  const r = result ?? {};
  const report = r.report ?? {};
  const metrics = report.metrics ?? {};
  const rm = opts.realMatch ?? null;
  const cov = opts.dataCoverage ?? null;
  const prov = opts.baselineProvenance ?? {};
  return {
    schemaVersion: TRAINING_STATUS_SCHEMA_VERSION,
    ts_iso: opts.tsIso ?? new Date().toISOString(),
    ok: Boolean(r.ok),
    reason: r.reason ?? null,
    baseline_source: prov.baseline_source ?? null,
    baseline_fallback: prov.baseline_fallback ?? null,
    total_predicted: typeof report.total_predicted === "number" ? report.total_predicted : 0,
    mape_pct: typeof metrics.mape_pct === "number" ? metrics.mape_pct : null,
    safe_to_activate: Boolean(r.safe_to_activate),
    active_factor_written: Boolean(r.active_factor_written),
    active_factor_path: r.active_factor_path ?? null,
    // skip_reason carries WHY a cycle did not activate a factor (e.g. "writeIfSafe=false
    // (dry-run mode)" under --no-write, or a CoV-gate reason) — the frontend renders this
    // so an operator sees a safe-but-dormant cycle's cause, not a blank.
    skip_reason: r.skip_reason ?? null,
    psi_delta_fed_count: typeof r.psi_delta_fed_count === "number" ? r.psi_delta_fed_count : 0,
    baseline_warnings: Array.isArray(opts.baselineWarnings) ? opts.baselineWarnings : [],
    data_source_coverage: cov
      ? {
          consumed_count: typeof cov.consumed_count === "number" ? cov.consumed_count : null,
          available_count: typeof cov.available_count === "number" ? cov.available_count : null,
          coverage_pct: typeof cov.coverage_pct === "number" ? cov.coverage_pct : null,
          unconsumed_available: Array.isArray(cov.unconsumed_available) ? cov.unconsumed_available : [],
        }
      : null,
    real_distribution_match: rm && rm.ok
      ? {
          verdict: rm.verdict ?? null,
          median_ratio: typeof rm.median_ratio === "number" ? rm.median_ratio : null,
          reference_reliable: typeof rm.reference_reliable === "boolean" ? rm.reference_reliable : null,
          reliability_verdict: typeof rm.reliability_verdict === "string" ? rm.reliability_verdict : null,
          advisory: true,
        }
      : null,
    // U-QP-TRAINCYCLE-FEED: PRISM predicted-FMV vs the REAL $355M / 6,718 Orders-Closed settled
    // actuals. ADVISORY -- the frontend renders the directional calibration verdict; the factor
    // is untouched (CoV-gated in the engine, provenance gate never softened).
    docustrata_actuals_match: (() => {
      const dm = opts.docustrataMatch ?? null;
      return dm && dm.ok
        ? {
            verdict: dm.verdict ?? null,
            median_ratio: typeof dm.median_ratio === "number" ? dm.median_ratio : null,
            within_band_pct: typeof dm.within_band_pct === "number" ? dm.within_band_pct : null,
            actual_total_usd: typeof dm.actual_total_usd === "number" ? dm.actual_total_usd : null,
            actuals_priced: typeof dm.actuals_priced === "number" ? dm.actuals_priced : null,
            advisory: true,
          }
        : null;
    })(),
  };
}

/**
 * iter11 (U-QP-TRAIN-DATA-COVERAGE): the quoting data sources the closed loop COULD train on.
 * `consumed` marks whether THIS train-cycle actually reads each one today — baseline (always),
 * outbound sold-orders ("outbound" = only when the real_distribution_match advisory ran), the rest
 * not-yet. Surfaced so the loop honestly reports its own training-data coverage (R12) and names the
 * unconsumed source to wire next, toward the /goal's "utilizing ALL documents and features." These
 * are data-file names (not constants-to-import). READ-ONLY existence check — NEVER combines sources,
 * so it introduces no cross-grain units risk (cost-index blends $/bar·$/foot·$/piece — see the
 * cost-basis units caveat; a real cost wire must be units-careful, hence deferred, not faked here).
 */
export const QUOTING_DATA_SOURCES = [
  { key: "baseline", file: "baseline-records.json", role: "prediction corpus (FMV inputs → accuracy → factor)", consumed: true },
  { key: "outbound_sold_orders", file: "jm-sold-orders.json", role: "calibration TARGET — what JM charges", consumed: "outbound" },
  { key: "vendor_cost_index", file: "jm-vendor-cost-index.json", role: "inbound cost basis — what JM pays (units-blended; wire carefully)", consumed: false },
  { key: "tool_purchases", file: "jm-tool-purchases.json", role: "tooling spend", consumed: false },
  { key: "docustrata_invoices", file: "docustrata-invoices.curated.json", role: "real customer invoices", consumed: false },
  // U-QP-TRAINCYCLE-FEED: the $355M / 6,718 real settled-price actuals extracted from the
  // full JMD Orders-Closed corpus. Consumed via an ADVISORY distribution-match (never alters
  // the factor, never touches the provenance gate) -- same gate-safe role as outbound_sold_orders.
  { key: "docustrata_actuals", file: "orders-closed-actuals.jsonl", role: "real settled-price actuals (Orders-Closed POs) -- calibration TARGET", consumed: "docustrata_actuals" },
];

/**
 * Report which quoting data sources are present on disk and which THIS cycle consumed.
 * Pure + injectable (`opts.existsImpl` for hermetic tests; defaults to fs.existsSync).
 * `opts.outboundConsumed` = did the real_distribution_match advisory run this cycle.
 */
export function dataSourceCoverage(quotingDir, opts = {}) {
  const exists = typeof opts.existsImpl === "function" ? opts.existsImpl : existsSync;
  const outboundConsumed = opts.outboundConsumed === true;
  const docustrataActualsConsumed = opts.docustrataActualsConsumed === true;
  const sources = QUOTING_DATA_SOURCES.map((s) => {
    const present = Boolean(exists(resolve(quotingDir, s.file)));
    const consumed = s.consumed === true ? true
      : s.consumed === "outbound" ? outboundConsumed
      : s.consumed === "docustrata_actuals" ? docustrataActualsConsumed
      : false;
    return { key: s.key, file: s.file, role: s.role, present, consumed };
  });
  const available = sources.filter((s) => s.present);
  const consumedCount = available.filter((s) => s.consumed).length;
  return {
    sources,
    available_count: available.length,
    consumed_count: consumedCount,
    coverage_pct: available.length > 0 ? Math.round((consumedCount / available.length) * 100) : 0,
    unconsumed_available: available.filter((s) => !s.consumed).map((s) => s.key),
  };
}

const ARGS = process.argv.slice(2);
function flag(name) { return ARGS.includes(`--${name}`); }
function val(name, dflt) {
  const idx = ARGS.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < ARGS.length ? ARGS[idx + 1] : dflt;
}

const DEFAULT_BASELINE = "state/shared/quoting/baseline-records.json";
const explicitBaseline = ARGS.includes("--baseline");
const configuredBaseline = val("baseline", DEFAULT_BASELINE);
const noWrite = flag("no-write");
const feedPsn = flag("feed-psn");
const jsonOut = flag("json");
const forceDegenerate = flag("force-degenerate");
const fallbackOverride = val("fallback-corpus", null);

// U-QP-BASELINE-FALLBACK fallback policy (charlie 2026-06-02): revive the dead
// DEFAULT loop WITHOUT overriding explicit operator intent.
//   • --no-fallback / --force-degenerate → strict (configured baseline only)
//   • --fallback-corpus <path>           → fall back to that path if configured refused
//   • bare invocation (no --baseline)    → fall back through the canonical real corpora
//   • explicit --baseline, no override   → strict (honor the named baseline; guard-refuse → exit 2)
// `undefined` lets the resolver use its default FALLBACK_CORPORA; `[]` is strict.
let fallbackList;
if (flag("no-fallback") || forceDegenerate) fallbackList = [];
else if (fallbackOverride) fallbackList = [fallbackOverride];
else if (!explicitBaseline) fallbackList = undefined;
else fallbackList = [];

async function main() {
  // U-QP-BASELINE-FALLBACK (charlie 2026-06-02): resolve WHICH baseline the loop
  // trains on. Honor the configured/default path first; if the poison-guard refuses
  // it (or it's missing/unreadable/empty) AND fallback is enabled (see fallbackList
  // policy above), fall back through the canonical real-data corpora — each re-
  // validated by the SAME guard. This revives the dead default loop: the default
  // baseline-records.json is a 100-record poisoned BOOTSTRAP stub (machine MODELS as
  // customers, constant stub revenue) the guard (correctly) refuses, which made the
  // bare `node scripts/quoting-train-cycle.mjs` exit 2 every run while the real
  // 47,905-record corpus (baseline-records-corpus-with-real.json) sat unused beside it.
  const resolved = await resolveTrainableBaseline({
    configuredPath: configuredBaseline,
    cwd: process.cwd(),
    validate: (recs) => validateBaseline(recs),
    fallbacks: fallbackList,
  });
  const records = resolved.records;
  let guard = resolved.guard;

  // 0-record / unreadable across ALL candidates (configured + any fallbacks) →
  // train-cycle's own reject (exit 1), preserving the prior 0-record/missing-file
  // behavior (validateBaseline([]) is "ok" by design, so this reject is ours, not the
  // guard's). resolved.tried carries the per-candidate provenance.
  if (records.length === 0) {
    const detail = resolved.tried.map((t) => `${t.path}: ${t.reason ?? (t.admitted ? "admitted" : "rejected")}`);
    if (jsonOut) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "no trainable baseline records", configured: configuredBaseline, tried: resolved.tried }) + "\n");
    } else {
      process.stderr.write(`[quoting-train-cycle] FAIL: no trainable records in configured baseline or fallbacks:\n  ${detail.join("\n  ")}\n`);
    }
    process.exit(1);
  }

  // QUOTING-SYNERGY-MS0/U-QP-BASELINE-GUARD preflight (charlie 2026-06-01, extended
  // 2026-06-02): the configured baseline was refused by the poison-guard AND no
  // fallback corpus was admitted → REFUSE (exit 2), unless --force-degenerate.
  // resolved.ok is true iff some candidate was guard-admitted; when false with
  // records>0, the configured candidate parsed but the guard refused it (and either
  // fallback was disabled/strict or every fallback was also refused). Same loud
  // message as before, now enriched with the fallback provenance (what was tried).
  if (!resolved.ok && !forceDegenerate) {
    const reasons = (guard?.reasons ?? resolved.configuredReasons) ?? [];
    if (jsonOut) {
      process.stdout.write(JSON.stringify({
        ok: false,
        reason: "baseline refused by guard (degenerate/poisoned)",
        configured: configuredBaseline,
        total: guard?.total ?? records.length,
        poisoned: guard?.poisoned ?? null,
        clean_count: guard?.clean_count ?? null,
        reasons,
        fallback_tried: resolved.tried,
        hint: "no clean fallback corpus admitted; regenerate the baseline, pass --fallback-corpus <path>, or --force-degenerate to train anyway (NOT recommended)",
      }) + "\n");
    } else {
      process.stderr.write(
        `[quoting-train-cycle] REFUSE: configured baseline is degenerate and no fallback corpus was admitted — not training (pass --force-degenerate to override):\n` +
          reasons.map((r) => `  • ${r}`).join("\n") + "\n" +
          `  tried: ${resolved.tried.map((t) => `${t.path}[${t.admitted ? "ok" : t.reason ?? "rejected"}]`).join(", ")}\n`,
      );
    }
    process.exit(2);
  }

  // --force-degenerate path: guard is non-null here (records>0 ⟹ the configured file
  // parsed, so resolveTrainableBaseline captured its guard). Recompute defensively in
  // the unlikely event it's null so guard.warnings is always available downstream.
  if (!guard) guard = validateBaseline(records);

  // U-QP-BASELINE-FALLBACK: LOUD advisory (R12) when the loop trained on a FALLBACK
  // corpus rather than the configured baseline — the operator must know the configured
  // baseline was bypassed and why. Carried into --json as `baseline_fallback`.
  if (resolved.fallbackUsed && !jsonOut) {
    process.stderr.write(
      `[quoting-train-cycle] FALLBACK: configured baseline '${configuredBaseline}' was ` +
        `${resolved.configuredRefused ? "REFUSED by the poison-guard" : "missing/unreadable/empty"}; ` +
        `trained on fallback corpus '${resolved.path}' instead` +
        (resolved.configuredReasons.length ? ` (configured reasons: ${resolved.configuredReasons.join("; ")})` : "") + "\n",
    );
  }

  // U-QP-BASELINE-FALLBACK: baseline provenance is fully known the moment the resolver
  // returns — BEFORE the engine loads. Spread into BOTH the success --json AND the
  // engine-load-failure --json so the baseline_source/baseline_fallback contract is
  // observable regardless of whether the training engine could be imported in this
  // environment (R12 + a guaranteed test oracle, not one gated on engine presence).
  const baselineProvenance = {
    baseline_source: resolved.path,
    baseline_fallback: resolved.fallbackUsed
      ? {
          configured: configuredBaseline,
          used: resolved.path,
          configured_refused: resolved.configuredRefused,
          configured_reasons: resolved.configuredReasons,
        }
      : null,
  };

  // U-QP-GUARD-VOLUME-AND-SYNTH (2026-06-01): surface ADVISORY guard warnings (e.g.
  // synthetic_revenue_dominant) LOUDLY even when the baseline is admitted. Training
  // proceeds — the data is usable for self-consistency calibration — but R12 demands
  // the operator know the resulting factor is NOT validated against real outbound
  // pricing. Carried into the --json result below as `baseline_warnings`; the 11-key
  // drift-audit ledger row is intentionally NOT widened (see quoting-train-cycle.ledger.test.mjs).
  if (Array.isArray(guard.warnings) && guard.warnings.length && !jsonOut) {
    process.stderr.write(
      `[quoting-train-cycle] ADVISORY: baseline admitted WITH ${guard.warnings.length} warning(s) — ` +
        `the resulting calibration is self-consistency, NOT real-world-validated:\n` +
        guard.warnings.map((w) => `  ⚠ ${w}`).join("\n") + "\n",
    );
  }

  // Lazy-load the engine. Windows ESM requires file:// URLs for absolute paths
  // (yolo-iter5 fix: bare Windows path "H:/..." rejected by ERR_UNSUPPORTED_ESM_URL_SCHEME).
  // Plain `node` can only import the COMPILED .js — for .ts source, invoke this
  // script via tsx instead (`node mcp-server/node_modules/.bin/tsx scripts/...`).
  const distPath = resolve(process.cwd(), "mcp-server/dist/engines/QuotingTrainingOrchestratorEngine.js");
  const srcPath = resolve(process.cwd(), "mcp-server/src/engines/QuotingTrainingOrchestratorEngine.ts");
  let engine;
  let loadErr;
  // SRC-FIRST (U-QP-EXTPRICE-CALIB finding, 2026-06-01): the per-file `dist/engines/*.js` are STALE
  // FOSSILS — the current esbuild build (esbuild.config.mjs) bundles to dist/index.js (+ chunks/),
  // NOT per-file dist/engines/. Importing the per-file dist therefore loads ANCIENT code (missing
  // recent fields like report.predicted_fmv_usd_all → the advisory real-distribution match silently
  // no-ops). Prefer SRC (loads current code under tsx, the documented run mode); fall back to the dist
  // fossil only when src can't load (plain `node`, which can't import .ts — same behavior as before).
  // NOTE (U-QP-EXTPRICE-CALIB P1): this means the calibration FACTOR math also follows the src/dist
  // split — production scheduled runs SHOULD invoke via tsx
  // (`node mcp-server/node_modules/tsx/dist/cli.mjs scripts/quoting-train-cycle.mjs`) to train on CURRENT
  // code; plain `node` trains from the stale fossil (still CoV-gated, so it never activates unsafely,
  // but it is stale). Follow-up: standardize the scheduled-retrain task invocation on tsx.
  try {
    const mod = await import(pathToFileURL(srcPath).href);
    engine = mod.quotingTrainingOrchestratorEngine ?? mod.default;
  } catch (e1) {
    loadErr = e1;
    try {
      const mod = await import(pathToFileURL(distPath).href);
      engine = mod.quotingTrainingOrchestratorEngine ?? mod.default;
      loadErr = undefined;
    } catch (e2) {
      loadErr = e2;
    }
  }
  if (!engine) {
    const hint = "dist missing — run `cd mcp-server && npm run build:fast` first, OR invoke via tsx: `node mcp-server/node_modules/.bin/tsx scripts/quoting-train-cycle.mjs`";
    if (jsonOut) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "engine load failed", hint, dist: distPath, src: srcPath, error: String(loadErr), ...baselineProvenance }) + "\n");
    } else {
      process.stderr.write(`[quoting-train-cycle] FAIL: ${hint}\n`);
    }
    process.exit(1);
  }
  if (!engine || typeof engine.runOnce !== "function") {
    if (jsonOut) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "engine load failed — runOnce not callable" }) + "\n");
    } else {
      process.stderr.write("[quoting-train-cycle] FAIL: engine has no runOnce() method\n");
    }
    process.exit(1);
  }

  const result = await engine.runOnce({
    records,
    writeIfSafe: !noWrite,
    feedPsnAutonomy: feedPsn,
  });

  // U-QP-EXTPRICE-CALIB (charlie 2026-06-01): ADVISORY real-outbound distribution match.
  // Compare the model's per-PART-JOB FMV predictions to JM's REAL per-line ext_price distribution
  // (the units-correct grain — NOT per-piece unitPrice; see U-QP-TRAIN-PREDICTED-EXPOSE). This closes
  // the iter59 match_pct=0 gap via a distribution match (no per-part join). READ-ONLY: surfaced for
  // observability, NEVER alters the calibration factor (the soul refuses softening reconciliation /
  // emitting a quote without the margin-floor gate). Fail-soft — a load/compute failure must not block
  // the cycle. Residual caveat: a multi-qty ext_price line bundles N pieces vs the FMV's implied-qty
  // setup amortization, so this is the correct GRAIN but an approximate band; also the baseline may be
  // synthetic (see baseline_warnings) — hence ADVISORY.
  let realMatch = null;
  try {
    const predictedAll = Array.isArray(result?.report?.predicted_fmv_usd_all) ? result.report.predicted_fmv_usd_all : [];
    if (predictedAll.length > 0) {
      // SRC-FIRST, dist-fallback (mirrors the orchestrator loader above — dist/engines is fossil).
      const opiSrc = resolve(process.cwd(), "mcp-server/src/engines/OutboundPriceIndexEngine.ts");
      const opiDist = resolve(process.cwd(), "mcp-server/dist/engines/OutboundPriceIndexEngine.js");
      let opi;
      try {
        opi = (await import(pathToFileURL(opiSrc).href)).outboundPriceIndexEngine;
      } catch {
        opi = (await import(pathToFileURL(opiDist).href)).outboundPriceIndexEngine;
      }
      const m = opi.compareToPredicted(predictedAll, { against: "line", minConfidence: "high" });
      if (m && m.ok) {
        realMatch = {
          ok: true,
          against: m.against,
          predicted_median: m.predicted?.median ?? null,
          real_median: m.reference?.median ?? null,
          median_ratio: m.medianRatio,
          within_band_pct: m.withinBandPct,
          ks_gap: m.ksGap,
          verdict: m.verdict,
          predicted_n: m.predicted?.n ?? 0,
          real_n: m.reference?.n ?? 0,
          advisory: true,
          units_note: "per-part-job FMV vs per-line ext_price (REAL outbound); advisory — never alters the factor",
          reference_caveat: m.caveat ?? null,
          // U-QP-OUTBOUND-REF-RELIABILITY: structural honesty flag — when false the
          // median_ratio/verdict reflect too-few samples or a degenerate price spike
          // (the OCR "$1" signature), NOT a calibrated comparison.
          reference_reliable: m.referenceReliable,
          reliability_verdict: m.reliabilityVerdict,
          reliability_caveat: m.reliabilityCaveat ?? null,
        };
      } else {
        realMatch = { ok: false, reason: "no real-outbound ext_price reference at minConfidence=high", advisory: true };
      }
    }
  } catch (e) {
    process.stderr.write(`[quoting-train-cycle] real-distribution match skipped (non-fatal): ${e}\n`);
  }

  // U-QP-TRAINCYCLE-FEED: ADVISORY distribution-match of PRISM's predicted FMV vs the REAL
  // $355M / 6,718 settled-price actuals (full JMD Orders-Closed corpus). Mirrors the outbound
  // match exactly: never alters the factor, never touches the provenance gate -- the actuals are
  // REAL (not PLACEHOLDER_MARKERS). Makes the docustrata_actuals source CONSUMED (coverage++).
  let docustrataMatch = null;
  try {
    const predictedAll = Array.isArray(result?.report?.predicted_fmv_usd_all) ? result.report.predicted_fmv_usd_all : [];
    if (predictedAll.length > 0) {
      const actualsPath = resolve(process.cwd(), "state/shared/quoting/orders-closed-actuals.jsonl");
      const loaded = loadActualPrices(actualsPath, { minConfidence: 0.6 });
      if (loaded && loaded.prices.length > 0) {
        docustrataMatch = matchPredictedToActuals(predictedAll, loaded.prices);
        docustrataMatch.actuals_loaded = loaded.count;
        docustrataMatch.actuals_priced = loaded.prices.length;
      } else {
        docustrataMatch = { ok: false, reason: "no-actuals-on-disk (run docustrata-run-all-documents on JMD Orders Closed)", advisory: true };
      }
    }
  } catch (e) {
    process.stderr.write(`[quoting-train-cycle] docustrata-actuals match skipped (non-fatal): ${e}\n`);
  }

  // iter10: append to rolling history ledger for drift audit. Non-fatal — a
  // ledger-write failure must not block the main result emit (downstream
  // QuotingActiveFactorLoaderEngine consumes the active-calibration.json, not
  // this ledger). Surfaced as stderr per fail-loud doctrine.
  try {
    const ledgerPath = resolve(process.cwd(), "state/shared/quoting/train-cycle-history.jsonl");
    await fs.mkdir(dirname(ledgerPath), { recursive: true });
    const row = buildLedgerRow(result, undefined, realMatch);
    await fs.appendFile(ledgerPath, JSON.stringify(row) + "\n", "utf-8");
  } catch (e) {
    process.stderr.write(`[quoting-train-cycle] ledger append failed (non-fatal): ${e}\n`);
  }

  // iter11 (U-QP-TRAIN-DATA-COVERAGE): report which quoting data sources this cycle trains on vs
  // which are present-but-unconsumed, so the loop honestly surfaces its own coverage gap (R12) and
  // names the next source to wire. Read-only; outbound counts as consumed only if the match ran.
  const dataCoverage = dataSourceCoverage(resolve(process.cwd(), "state/shared/quoting"), {
    outboundConsumed: Boolean(realMatch && realMatch.ok),
    docustrataActualsConsumed: Boolean(docustrataMatch && docustrataMatch.ok),
  });

  // iter3 (U-QP-TRAINING-STATUS-SNAPSHOT): write the single-object latest-cycle status the
  // PRISM app FRONTEND + BACKEND consumers poll (sibling to latest-drift-alert.json). This
  // is the front-to-back data-synergy surface — the closed loop's output made readable by
  // the app in one small file. Writes EVEN under --no-write (it is observability, NOT factor
  // activation). Non-fatal — a snapshot-write failure must not block the cycle (fail-loud
  // to stderr); downstream consumers tolerate a stale/absent snapshot.
  try {
    const statusPath = resolve(process.cwd(), "state/shared/quoting/latest-training-status.json");
    const snapshot = buildTrainingStatusSnapshot(result, {
      realMatch,
      docustrataMatch,
      dataCoverage,
      baselineProvenance,
      baselineWarnings: Array.isArray(guard.warnings) ? guard.warnings : [],
    });
    await fs.mkdir(dirname(statusPath), { recursive: true });
    // ATOMIC write (tmp + rename) — matches the sibling latest-drift-alert.json pattern.
    // The file is POLLED by the frontend/backend, so a plain writeFile would let a poller
    // read a half-written truncated JSON mid-write; rename is atomic on the same volume.
    const tmpPath = `${statusPath}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmpPath, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
    await fs.rename(tmpPath, statusPath);
  } catch (e) {
    process.stderr.write(`[quoting-train-cycle] training-status snapshot write failed (non-fatal): ${e}\n`);
  }

  if (jsonOut) {
    process.stdout.write(JSON.stringify({
      ok: result.ok,
      reason: result.reason,
      total_predicted: result.report?.total_predicted ?? 0,
      mape_pct: result.report?.metrics?.mape_pct,
      safe_to_activate: result.safe_to_activate,
      active_factor_written: result.active_factor_written,
      active_factor_path: result.active_factor_path,
      psi_delta_fed_count: result.psi_delta_fed_count,
      skip_reason: result.skip_reason,
      warnings_count: result.warnings?.length ?? 0,
      baseline_warnings: Array.isArray(guard.warnings) ? guard.warnings : [],
      ...baselineProvenance,
      real_distribution_match: realMatch,
      docustrata_actuals_match: docustrataMatch,
      data_source_coverage: dataCoverage,
    }) + "\n");
  } else {
    const status = result.active_factor_written ? "WROTE" : result.safe_to_activate ? "SAFE-DRYRUN" : "GATED";
    const mape = result.report?.metrics?.mape_pct?.toFixed(1) ?? "—";
    process.stdout.write(`[quoting-train-cycle] ${status} | ${result.report?.total_predicted ?? 0} records, MAPE ${mape}%, psi_delta_fed=${result.psi_delta_fed_count} | ${result.skip_reason ?? result.active_factor_path ?? ""}\n`);
    if (realMatch && realMatch.ok) {
      const mr = typeof realMatch.median_ratio === "number" ? realMatch.median_ratio.toFixed(2) : "—";
      const kg = typeof realMatch.ks_gap === "number" ? realMatch.ks_gap.toFixed(3) : "—";
      process.stdout.write(`[quoting-train-cycle] real-dist match (ADVISORY, predicted FMV vs real ext_price): verdict=${realMatch.verdict} median_ratio=${mr} ks_gap=${kg} (predicted_n=${realMatch.predicted_n}, real_n=${realMatch.real_n})\n`);
      if (realMatch.reference_reliable === false) {
        process.stdout.write(`[quoting-train-cycle]   ⚠ real-dist reference NOT reliable (${realMatch.reliability_verdict}): ${realMatch.reliability_caveat ?? realMatch.reference_caveat ?? ""} — median_ratio/verdict are DIRECTIONAL, NOT a calibrated metric\n`);
      } else if (realMatch.reference_caveat) {
        process.stdout.write(`[quoting-train-cycle]   ⚠ real-dist reference is ADVISORY / OCR-noisy (real_median=${realMatch.real_median}) — median_ratio/verdict are DIRECTIONAL, not a calibrated metric\n`);
      }
    }
    if (docustrataMatch && docustrataMatch.ok) {
      const dmr = typeof docustrataMatch.median_ratio === "number" ? docustrataMatch.median_ratio.toFixed(2) : "n/a";
      const wb = typeof docustrataMatch.within_band_pct === "number" ? (docustrataMatch.within_band_pct * 100).toFixed(0) : "n/a";
      const at = typeof docustrataMatch.actual_total_usd === "number" ? `$${docustrataMatch.actual_total_usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "n/a";
      process.stdout.write(`[quoting-train-cycle] docustrata-actuals match (ADVISORY, predicted FMV vs REAL Orders-Closed settled price): verdict=${docustrataMatch.verdict} median_ratio=${dmr} within_band=${wb}% (predicted_n=${docustrataMatch.predicted_n}, actuals_priced=${docustrataMatch.actuals_priced ?? docustrataMatch.actual_n}, actual_total=${at}) -- never alters the factor\n`);
    } else if (docustrataMatch && docustrataMatch.reason) {
      process.stdout.write(`[quoting-train-cycle] docustrata-actuals match skipped: ${docustrataMatch.reason}\n`);
    }
    process.stdout.write(`[quoting-train-cycle] data-source coverage: ${dataCoverage.consumed_count}/${dataCoverage.available_count} present quoting sources consumed (${dataCoverage.coverage_pct}%); unconsumed: ${dataCoverage.unconsumed_available.join(", ") || "none"}\n`);
  }
  process.exit(result.ok ? 0 : 1);
}

// iter10: only run main() when invoked as CLI, not when imported as a library
// (the test file imports {buildLedgerRow} and must NOT trigger a training cycle).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (jsonOut) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "unhandled error", error: String(e) }) + "\n");
    } else {
      process.stderr.write(`[quoting-train-cycle] UNHANDLED: ${e}\n`);
    }
    process.exit(1);
  });
}
