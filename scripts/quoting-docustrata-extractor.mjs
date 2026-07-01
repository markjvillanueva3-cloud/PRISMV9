#!/usr/bin/env node
/**
 * quoting-docustrata-extractor — iter42: real-source adapter that replaces
 * iter20 synth in the pipeline.
 *
 * Scope-cut from the iter29 spec (which assumed engine had extractAllInvoices()
 * — it doesn't). This adapter instead reads a curated invoice sidecar produced
 * by a future PDF/OCR extractor, passes through DocustrataHistoricalPricing-
 * TrainerEngine.buildTrainingSet() for market conditioning, then maps the
 * resulting MarketConditionedRecord[] → iter19 validator-shape revenue records.
 *
 * Curated source: state/shared/quoting/docustrata-invoices.curated.json
 *   Shape: { schema_version: "1.0.0", invoices: DocustrataExtractedRecord[] }
 *   Where DocustrataExtractedRecord per the engine matches
 *   { date, customer, part_id, material, predicted_quote_usd,
 *     actual_invoice_usd, quantity }
 *
 * If curated source missing: returns { ok:false, reason:"no-curated-source" }
 * so caller can fall back to synth.
 *
 * Output shape (LOCKED by iter19 + iter27):
 *   { schema_version, generated_iso, source: "docustrata-historical-pricing-trainer",
 *     records: [{ customer, part_id, revenue }] }
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-EXTRACTOR-WIRE (charlie /goal-yolo iter42)
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";

export const CURATED_SOURCE_DEFAULT_PATH = "state/shared/quoting/docustrata-invoices.curated.json";
export const SUPPORTED_CURATED_SCHEMA_VERSIONS = new Set(["1.0.0"]);

/** Revenue bounds — must agree with iter19 validator REVENUE_BOUNDS. */
export const REVENUE_BOUNDS = { min: 0.01, max: 10_000_000 };

/**
 * Read + validate the curated invoice sidecar.
 * Pure-ish: takes file content, returns { ok, invoices?, reason? }.
 */
export function parseCuratedSource(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    return { ok: false, reason: `parse-error: ${e.message}` };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "not-an-object" };
  }
  if (!SUPPORTED_CURATED_SCHEMA_VERSIONS.has(parsed.schema_version)) {
    return { ok: false, reason: `unsupported-schema-version: ${parsed.schema_version}` };
  }
  if (!Array.isArray(parsed.invoices)) {
    return { ok: false, reason: "missing-or-non-array-invoices" };
  }
  return { ok: true, invoices: parsed.invoices };
}

/**
 * Map a single MarketConditionedRecord (engine output) → iter19 revenue-record
 * shape. Returns null if invalid (caller skips + counts as warning).
 */
export function conditionedRecordToRevenueRecord(rec) {
  if (!rec || typeof rec !== "object") return null;
  const customer = typeof rec.customer === "string" ? rec.customer.trim().toUpperCase() : null;
  const partId = typeof rec.part_id === "string" ? rec.part_id.trim() : null;
  // Prefer market-adjusted invoice (today's-conditions revenue) since the
  // training loop compares against today's quotes. Fall back to raw invoice.
  const rev = typeof rec.market_adjusted_invoice_usd === "number"
    ? rec.market_adjusted_invoice_usd
    : (typeof rec.actual_invoice_usd === "number" ? rec.actual_invoice_usd : null);

  if (!customer || !partId || rev == null) return null;
  if (!Number.isFinite(rev) || rev < REVENUE_BOUNDS.min || rev > REVENUE_BOUNDS.max) return null;
  return { customer, part_id: partId, revenue: Math.round(rev * 100) / 100 };
}

/**
 * Map raw extracted invoices (no engine pass) → iter19 revenue records.
 * Used when caller passes opts.skipMarketConditioning=true (smoke tests).
 */
export function rawInvoiceToRevenueRecord(inv) {
  if (!inv || typeof inv !== "object") return null;
  const customer = typeof inv.customer === "string" ? inv.customer.trim().toUpperCase() : null;
  const partId = typeof inv.part_id === "string" ? inv.part_id.trim() : null;
  const rev = typeof inv.actual_invoice_usd === "number" ? inv.actual_invoice_usd : null;
  if (!customer || !partId || rev == null) return null;
  if (!Number.isFinite(rev) || rev < REVENUE_BOUNDS.min || rev > REVENUE_BOUNDS.max) return null;
  return { customer, part_id: partId, revenue: Math.round(rev * 100) / 100 };
}

/**
 * Bound output by maxRecords to prevent unbounded payloads from a corrupt
 * curated source. Default 5000 matches iter20 synth ceiling.
 */
export function applyMaxRecords(records, maxRecords) {
  if (!Array.isArray(records)) return [];
  const cap = Math.max(1, Math.min(50_000, maxRecords ?? 5000));
  return records.length > cap ? records.slice(0, cap) : records;
}

/**
 * Main extractor entry-point — returns the iter19-validator-shape payload.
 *
 * opts:
 *   curatedPath?: string                       — override default sidecar path
 *   maxRecords?: number                        — bound output (default 5000)
 *   skipMarketConditioning?: boolean           — bypass engine pass (smoke tests)
 *   marketLookup?: (date, mat) => MarketSnapshot — engine optional lookup hook
 *   todayMarket?: TrainerInput.today_market    — reference market for conditioning
 */
export async function extractDocustrataRevenueRecords(opts = {}) {
  const curatedPath = resolve(process.cwd(), opts.curatedPath ?? CURATED_SOURCE_DEFAULT_PATH);

  let content;
  try {
    content = await fs.readFile(curatedPath, "utf-8");
  } catch (e) {
    return {
      ok: false,
      reason: `no-curated-source: ${e.code === "ENOENT" ? "file-missing" : e.message}`,
      curated_path: curatedPath,
    };
  }

  const parsed = parseCuratedSource(content);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason, curated_path: curatedPath };
  }

  let conditioned = parsed.invoices;
  let conditioningStats = { applied: false, n_market_adjusted: 0, n_missing_market: 0 };

  if (!opts.skipMarketConditioning) {
    // Dynamic import — engine lives in mcp-server/dist (TypeScript compiled).
    // If dist not present (fresh repo or unbuilt), fall back gracefully.
    let engine;
    try {
      const mod = await import("../mcp-server/dist/engines/DocustrataHistoricalPricingTrainerEngine.js");
      engine = mod.docustrataHistoricalPricingTrainerEngine ?? new mod.DocustrataHistoricalPricingTrainerEngine();
    } catch (e) {
      // Soft fallback — return raw-invoice mapping if engine unavailable.
      conditioned = parsed.invoices;
      conditioningStats = { applied: false, n_market_adjusted: 0, n_missing_market: 0, fallback_reason: `engine-import-failed: ${e.message}` };
    }
    if (engine) {
      const output = engine.buildTrainingSet({
        records: parsed.invoices,
        today_market: opts.todayMarket,
        marketLookup: opts.marketLookup,
      });
      if (output.ok && Array.isArray(output.records)) {
        conditioned = output.records;
        conditioningStats = {
          applied: true,
          n_market_adjusted: output.n_market_adjusted,
          n_missing_market: output.n_missing_market,
          pre_adjust_signed_pct: output.pre_adjust_signed_pct,
          post_adjust_signed_pct: output.post_adjust_signed_pct,
        };
      } else {
        conditioningStats = { applied: false, n_market_adjusted: 0, n_missing_market: 0, fallback_reason: `engine-returned-not-ok: ${output.reason ?? "unknown"}` };
        conditioned = parsed.invoices;
      }
    }
  }

  const mapper = conditioningStats.applied ? conditionedRecordToRevenueRecord : rawInvoiceToRevenueRecord;
  const mapped = [];
  let skipped = 0;
  for (const rec of conditioned) {
    const out = mapper(rec);
    if (out) mapped.push(out);
    else skipped += 1;
  }
  const bounded = applyMaxRecords(mapped, opts.maxRecords);

  return {
    ok: true,
    schema_version: "1.0.0",
    generated_iso: new Date().toISOString(),
    source: "docustrata-historical-pricing-trainer",
    records: bounded,
    stats: {
      curated_invoice_count: parsed.invoices.length,
      mapped_count: mapped.length,
      skipped_count: skipped,
      bounded_count: bounded.length,
      market_conditioning: conditioningStats,
    },
    curated_path: curatedPath,
  };
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  function val(flag, dflt) {
    const i = args.indexOf(`--${flag}`);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
  }
  const opts = {
    curatedPath: val("curated", undefined),
    maxRecords: parseInt(val("max-records", "5000"), 10),
    skipMarketConditioning: args.includes("--skip-conditioning"),
  };
  const result = await extractDocustrataRevenueRecords(opts);

  if (args.includes("--write") && result.ok) {
    const outPath = resolve(process.cwd(), val("out", "state/shared/quoting/docustrata-revenues.json"));
    const payload = {
      schema_version: result.schema_version,
      generated_iso: result.generated_iso,
      source: result.source,
      records: result.records,
    };
    await fs.writeFile(outPath, JSON.stringify(payload, null, 2));
    process.stderr.write(`[extractor] wrote ${outPath} (${result.records.length} records)\n`);
  }

  console.log(JSON.stringify(result, null, args.includes("--pretty") ? 2 : 0));
}

const isMain = import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`[extractor] FAIL: ${e.message}\n`);
    process.exit(1);
  });
}
