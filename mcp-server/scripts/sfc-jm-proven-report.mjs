#!/usr/bin/env node
/**
 * sfc-jm-proven-report -- SFC-JM-PROVEN / U-SFC-JM-PROVEN-REPORT (slot:oscar, 2026-06-25)
 * =======================================================================================
 *
 * Turns the JM-Die proven-speedfeed store (produced by extract-jm-proven-speedfeed.mjs --
 * 16,524 Okuma lathe programs -> 94,015 samples -> 50 proven material x op configs) into the
 * operator's ACTUAL ask: "our programs are written by amateurs, don't trust the speeds/feeds --
 * use them as the GUIDELINE to test against." This report classifies each proven config as:
 *
 *   - TRUST   (confidence >= threshold): JM programs AGREE across many samples -> a trustworthy
 *             guideline PRISM can validate against.
 *   - OVERRIDE (confidence <  threshold): JM programs DISAGREE (high cross-program variance) ->
 *             the amateur-programmed values are unreliable here; PRISM physics should override.
 *
 * It also surfaces a variance proxy (proven range width as a % of the recommended value) so the
 * spread of the amateur programming is visible per config.
 *
 * Pure node (reads the persisted store JSON) -- no .ts engine import, so no tsx needed.
 *
 * Run:
 *   node scripts/sfc-jm-proven-report.mjs                       (text report)
 *   node scripts/sfc-jm-proven-report.mjs --json                (machine output)
 *   node scripts/sfc-jm-proven-report.mjs --threshold 0.75      (custom trust cutoff)
 *   node scripts/sfc-jm-proven-report.mjs --store <path>        (non-default store)
 *
 * @milestone SFC-JM-PROVEN
 * @unit U-SFC-JM-PROVEN-REPORT
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MCP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_STORE = path.join(MCP_ROOT, "data", "state", "jm-proven-speedfeed-store.json");

// The proven-blend confidence gate the orchestrator uses (SpeedFeedOrchestratorEngine proven-blend
// applies a proven value only when confidence >= 0.7); the report's default TRUST cutoff mirrors it
// so "trust" here means "the orchestrator would actually blend this JM value".
export const DEFAULT_TRUST_THRESHOLD = 0.7;

// === PURE HELPERS (no I/O -- unit-tested in sfc-jm-proven-report.test.mjs) ===

/** Normalize the store's provenParams (array OR keyed object) to a flat array of configs. */
export function toConfigArray(provenParams) {
  if (Array.isArray(provenParams)) return provenParams.filter(Boolean);
  if (provenParams && typeof provenParams === "object") return Object.values(provenParams).filter(Boolean);
  return [];
}

/** TRUST iff confidence >= threshold, else OVERRIDE. A missing/NaN confidence is OVERRIDE (fail-safe:
 *  an unknown-confidence JM value is NOT trusted). */
export function classifyTrust(config, threshold = DEFAULT_TRUST_THRESHOLD) {
  const c = Number(config && config.confidence);
  return Number.isFinite(c) && c >= threshold ? "trust" : "override";
}

/** Variance proxy: the proven range width as a percentage of the recommended value. Wider = the
 *  amateur programs disagreed more. Returns null when the range/recommended is unusable. */
export function rangeWidthPct(metric) {
  if (!metric || !Array.isArray(metric.range) || metric.range.length !== 2) return null;
  const [lo, hi] = metric.range.map(Number);
  const rec = Number(metric.recommended);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(rec) || Math.abs(rec) < 1e-9) return null;
  // Math.abs(hi-lo) so a reversed range [hi,lo] still yields a NON-NEGATIVE variance proxy (never a
  // misleading negative %); the extractor emits ascending ranges but we do not depend on that.
  return (Math.abs(hi - lo) / Math.abs(rec)) * 100;
}

/** Aggregate the configs into a summary: trust/override counts, sample totals, and per-material /
 *  per-operation trust breakdowns. */
export function summarize(configs, threshold = DEFAULT_TRUST_THRESHOLD) {
  const out = {
    total: configs.length,
    trust: 0,
    override: 0,
    samplesInTrust: 0,
    samplesInOverride: 0,
    byMaterial: {},
    byOperation: {},
  };
  for (const c of configs) {
    const cls = classifyTrust(c, threshold);
    const n = Number(c && c.sampleCount) || 0;
    out[cls]++;
    if (cls === "trust") out.samplesInTrust += n; else out.samplesInOverride += n;
    const mat = (c && c.materialGroup) || "unknown";
    const op = (c && c.operation) || "unknown";
    (out.byMaterial[mat] ??= { trust: 0, override: 0 })[cls]++;
    (out.byOperation[op] ??= { trust: 0, override: 0 })[cls]++;
  }
  return out;
}

/** Build the per-config rows (sorted: trust first, then by descending sampleCount) for display/JSON. */
export function buildRows(configs, threshold = DEFAULT_TRUST_THRESHOLD) {
  return configs
    .map((c) => ({
      materialGroup: c.materialGroup ?? "unknown",
      operation: c.operation ?? "unknown",
      cssRecommended: c.css?.recommended ?? null,
      cssVariancePct: rangeWidthPct(c.css),
      feedRecommended: c.feed?.recommended ?? null,
      feedVariancePct: rangeWidthPct(c.feed),
      confidence: Number.isFinite(Number(c.confidence)) ? Number(c.confidence) : null,
      sampleCount: Number(c.sampleCount) || 0,
      classification: classifyTrust(c, threshold),
    }))
    .sort((a, b) =>
      a.classification === b.classification
        ? b.sampleCount - a.sampleCount
        : a.classification === "trust" ? -1 : 1,
    );
}

function fmtPct(v) { return v == null ? "  n/a" : `${v.toFixed(0)}%`.padStart(5); }
function fmtNum(v) { return v == null ? "n/a" : String(v); }

/** Render a compact text report. Pure (string in -> string out). */
export function formatReport(store, threshold = DEFAULT_TRUST_THRESHOLD) {
  const configs = toConfigArray(store.provenParams);
  const s = summarize(configs, threshold);
  const rows = buildRows(configs, threshold);
  const L = [];
  L.push(`JM-Die proven speed/feed report (trust cutoff confidence >= ${threshold})`);
  L.push(`source: ${store.source ?? "?"} | programs: ${fmtNum(store.totalPrograms)} | samples: ${fmtNum(store.totalSamples)} | outliers: ${fmtNum(store.outliersFlagged)}`);
  L.push(`configs: ${s.total}  ->  TRUST ${s.trust} (guideline) / OVERRIDE ${s.override} (amateur-variance, PRISM physics wins)`);
  L.push(`samples behind TRUST: ${s.samplesInTrust} | behind OVERRIDE: ${s.samplesInOverride}`);
  L.push("");
  L.push("material         operation         CSS    var   feed      var   conf  n      class");
  L.push("---------------- ----------------- ------ ----- --------- ----- ----- ------ --------");
  for (const r of rows) {
    L.push([
      String(r.materialGroup).padEnd(16),
      String(r.operation).padEnd(17),
      String(r.cssRecommended ?? "n/a").padStart(6),
      fmtPct(r.cssVariancePct),
      String(r.feedRecommended ?? "n/a").padStart(9),
      fmtPct(r.feedVariancePct),
      (r.confidence == null ? "n/a" : r.confidence.toFixed(2)).padStart(5),
      String(r.sampleCount).padStart(6),
      r.classification,
    ].join(" "));
  }
  return L.join("\n");
}

// === MAIN (I/O; guarded so tests import the pure helpers without side effects) ===

function main() {
  const args = process.argv.slice(2);
  const JSON_OUT = args.includes("--json");
  const tIdx = args.indexOf("--threshold");
  const threshold = tIdx >= 0 && args[tIdx + 1] ? Number(args[tIdx + 1]) : DEFAULT_TRUST_THRESHOLD;
  if (!Number.isFinite(threshold)) {
    // Surface a typo'd --threshold (R12) instead of silently classifying every config OVERRIDE
    // (classifyTrust(c, NaN) is always false -> a misleading "0 TRUST" report).
    console.error(`[sfc-jm-proven-report] invalid --threshold (must be a number, e.g. 0.7): ${args[tIdx + 1]}`);
    process.exit(1);
  }
  const sIdx = args.indexOf("--store");
  const storePath = sIdx >= 0 && args[sIdx + 1] ? args[sIdx + 1] : DEFAULT_STORE;

  if (!fs.existsSync(storePath)) {
    // Fail loud (R12): no guessing -- the store must be extracted first.
    console.error(
      `[sfc-jm-proven-report] store not found: ${storePath}\n` +
      `Run the extractor first: npx tsx scripts/extract-jm-proven-speedfeed.mjs`,
    );
    process.exit(1);
  }

  let store;
  try {
    store = JSON.parse(fs.readFileSync(storePath, "utf8"));
  } catch (e) {
    console.error(`[sfc-jm-proven-report] could not parse ${storePath}: ${e.message}`);
    process.exit(1);
  }

  const configs = toConfigArray(store.provenParams);
  if (JSON_OUT) {
    console.log(JSON.stringify({
      threshold,
      summary: summarize(configs, threshold),
      rows: buildRows(configs, threshold),
      store: {
        source: store.source, totalPrograms: store.totalPrograms,
        totalSamples: store.totalSamples, outliersFlagged: store.outliersFlagged,
        storeReportedHighConfidenceCount: store.highConfidenceCount, generatedAt: store.generatedAt,
      },
    }, null, 2));
  } else {
    console.log(formatReport(store, threshold));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
