#!/usr/bin/env node
/**
 * quoting-docustrata-pipeline — iter21: one-call orchestrator chaining
 * iter20 synth → iter19 validator → iter18 bridge into a single operator-facing
 * CLI. The "test the full Docustrata-ready chain with realistic synthetic data"
 * entry point — nightly cron-safe.
 *
 * Pure-function export: runDocustrataPipeline(baselineRecords, opts) -> Result
 *   Result {
 *     ok,             // boolean: full chain succeeded
 *     stage,          // "synth"|"validate"|"bridge"|"done" — last completed stage
 *     reason,         // string|null — why we stopped (if !ok)
 *     synth,          // payload from iter20 generateSyntheticRevenueRecords
 *     validation,     // result from iter19 validateDocustrataPayload
 *     merge,          // {records, report} from iter18 mergeDocustrataRevenue
 *   }
 *
 * Failure handling: stops at first stage that emits errors; previous-stage
 * outputs are preserved for debugging.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-PIPELINE-ORCHESTRATOR (charlie /goal-yolo iter21)
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { generateSyntheticRevenueRecords } from "./quoting-docustrata-synth.mjs";
import { validateDocustrataPayload } from "./quoting-docustrata-format.mjs";
import { mergeDocustrataRevenue } from "./quoting-docustrata-bridge.mjs";
import { extractDocustrataRevenueRecords } from "./quoting-docustrata-extractor.mjs";

/**
 * Pure orchestrator — no FS, no side effects. Composes 3 iters.
 * Defensive against non-array input; passes opts through to each stage.
 */
export function runDocustrataPipeline(baselineRecords, opts = {}) {
  const synthOpts = opts.synth ?? {};
  const bridgeOpts = opts.bridge ?? {};

  // Stage 1: iter20 synth
  let synth;
  try {
    synth = generateSyntheticRevenueRecords(baselineRecords, synthOpts);
  } catch (e) {
    return {
      ok: false,
      stage: "synth",
      reason: `synth threw: ${String(e)}`,
      synth: null,
      validation: null,
      merge: null,
    };
  }

  // Stage 2: iter19 validate
  const validation = validateDocustrataPayload(synth);
  if (!validation.valid) {
    return {
      ok: false,
      stage: "validate",
      reason: `validator rejected: ${validation.errors.join("; ")}`,
      synth,
      validation,
      merge: null,
    };
  }

  // Stage 3: iter18 bridge
  let merge;
  try {
    merge = mergeDocustrataRevenue(baselineRecords, validation.normalized, bridgeOpts);
  } catch (e) {
    return {
      ok: false,
      stage: "bridge",
      reason: `bridge threw: ${String(e)}`,
      synth,
      validation,
      merge: null,
    };
  }

  return {
    ok: true,
    stage: "done",
    reason: null,
    synth,
    validation,
    merge,
  };
}

/**
 * iter42: async source-aware orchestrator. Adds --source=extractor branch
 * that calls the iter42 curated-source adapter instead of iter20 synth.
 * Back-compat: opts.source omitted | "synth" => existing sync path.
 *
 * If extractor returns ok:false (no curated source), behavior depends on
 * opts.fallbackToSynth (default true): true ⇒ fall back to synth, false ⇒
 * return ok:false at stage="extractor".
 */
export async function runDocustrataPipelineAsync(baselineRecords, opts = {}) {
  const source = opts.source ?? "synth";

  if (source !== "extractor") {
    // Identical to legacy sync path.
    return runDocustrataPipeline(baselineRecords, opts);
  }

  // Stage 0: iter42 extractor
  let extracted;
  try {
    extracted = await extractDocustrataRevenueRecords(opts.extractor ?? {});
  } catch (e) {
    return {
      ok: false,
      stage: "extractor",
      reason: `extractor threw: ${String(e)}`,
      synth: null,
      extractor: null,
      validation: null,
      merge: null,
    };
  }

  if (!extracted.ok) {
    if (opts.fallbackToSynth !== false) {
      // Soft fallback — call sync pipeline with synth as usual.
      const r = runDocustrataPipeline(baselineRecords, opts);
      return { ...r, extractor: extracted, extractor_fallback: true };
    }
    return {
      ok: false,
      stage: "extractor",
      reason: `extractor: ${extracted.reason}`,
      synth: null,
      extractor: extracted,
      validation: null,
      merge: null,
    };
  }

  // Stage 1.b — extractor produced records; treat them as synth substitute
  const synth = {
    schema_version: extracted.schema_version,
    generated_iso: extracted.generated_iso,
    source: extracted.source,
    records: extracted.records,
  };

  // Stage 2: iter19 validate
  const validation = validateDocustrataPayload(synth);
  if (!validation.valid) {
    return {
      ok: false,
      stage: "validate",
      reason: `validator rejected extractor output: ${validation.errors.join("; ")}`,
      synth,
      extractor: extracted,
      validation,
      merge: null,
    };
  }

  // Stage 3: iter18 bridge
  let merge;
  try {
    merge = mergeDocustrataRevenue(baselineRecords, validation.normalized, opts.bridge ?? {});
  } catch (e) {
    return {
      ok: false,
      stage: "bridge",
      reason: `bridge threw: ${String(e)}`,
      synth,
      extractor: extracted,
      validation,
      merge: null,
    };
  }

  return {
    ok: true,
    stage: "done",
    reason: null,
    synth,
    extractor: extracted,
    validation,
    merge,
  };
}

// ---------- CLI ----------
const ARGS = process.argv.slice(2);
function flag(name) { return ARGS.includes(`--${name}`); }
function val(name, dflt) {
  const i = ARGS.indexOf(`--${name}`);
  return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : dflt;
}

async function main() {
  const baselinePath = resolve(process.cwd(), val("baseline", "state/shared/quoting/baseline-records.json"));
  const outPath = resolve(process.cwd(), val("out", "state/shared/quoting/baseline-records-with-synth.json"));
  const baseMarkup = parseFloat(val("markup", "0.40"));
  const jitter = parseFloat(val("jitter", "0.20"));
  const jsonOut = flag("json");

  let baseline;
  try {
    baseline = JSON.parse(await fs.readFile(baselinePath, "utf-8"));
  } catch (e) {
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, stage: "read", reason: String(e), path: baselinePath }) + "\n");
    else process.stderr.write(`[docustrata-pipeline] FAIL read ${baselinePath}: ${e}\n`);
    process.exit(1);
  }

  // iter42: --source flag routes between sync synth path + async extractor path
  const source = val("source", "synth");
  const curatedPath = val("curated", undefined);
  const noFallback = flag("no-fallback");
  const result = await runDocustrataPipelineAsync(baseline?.records ?? [], {
    source,
    synth: { baseMarkupPct: baseMarkup, jitterPct: jitter },
    extractor: { curatedPath },
    fallbackToSynth: !noFallback,
  });

  if (result.ok) {
    const merged = {
      ...baseline,
      records: result.merge.records,
      docustrata_pipeline_report: {
        synth: { record_count: result.synth.records.length, base_markup_pct: baseMarkup, jitter_pct: jitter },
        validation: { warnings_count: result.validation.warnings.length },
        bridge: result.merge.report,
      },
    };
    await fs.writeFile(outPath, JSON.stringify(merged, null, 2), "utf-8");
  }

  if (jsonOut) {
    process.stdout.write(JSON.stringify({
      ok: result.ok,
      stage: result.stage,
      reason: result.reason,
      synth_count: result.synth?.records?.length ?? 0,
      validation_warnings: result.validation?.warnings?.length ?? 0,
      bridge_report: result.merge?.report ?? null,
      out: result.ok ? outPath : null,
    }) + "\n");
  } else {
    const tag = result.ok ? "OK" : `FAIL@${result.stage}`;
    const msg = result.ok
      ? `synth=${result.synth.records.length} matched=${result.merge.report.matched}/${result.merge.report.total} (${result.merge.report.match_rate_pct}%)`
      : `reason=${result.reason}`;
    process.stdout.write(`[docustrata-pipeline] ${tag} | ${msg}\n`);
  }
  process.exit(result.ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[docustrata-pipeline] UNHANDLED: ${e}\n`);
    process.exit(1);
  });
}
