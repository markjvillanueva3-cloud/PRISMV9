#!/usr/bin/env node
/**
 * quoting-real-revenue-overlay.mjs — overlay REAL Docustrata invoices on top
 * of the iter58 corpus-synth baseline.
 *
 * QUOTING-SYNERGY-MS0/U-QP-REAL-REVENUE-OVERLAY (slot:charlie iter59 2026-05-28).
 *
 * The iter58 corpus baseline (47,905 records across 473 customers) carries
 * cost×1.4 synthetic revenue stubs in `actual_revenue_usd`. iter53-58 also
 * shipped `docustrata-extracted.jsonl` (auto-extract, 0 paired records as of
 * iter58 — Docustrata is 72% SCAN_GENERIC, not outbound transaction docs) and
 * `docustrata-invoices.curated.json` (10 hand-curated real invoices spanning
 * ATF / ALLFAST / AGRATI / JM DIE COMPANY / GENERAL BANDAGES).
 *
 * This script overlays the REAL invoice data on matching (customer, part_id)
 * pairs in the synth baseline. The result is the same baseline-records shape
 * the train-cycle expects, but with `revenue_source: "docustrata-real"` for
 * matched records and `"docustrata-synth"` (or its existing value) for the
 * rest. When future ERP/AccountingHardeningEngine data lands, swap the input
 * file; nothing downstream changes.
 *
 * Pure exports:
 *   - buildRevenueIndex(invoices)
 *   - canonicalKey(customer, part_id)
 *   - overlayRevenue(records, revenueIndex, options)
 *
 * CLI:
 *   node scripts/quoting-real-revenue-overlay.mjs \
 *     [--baseline state/shared/quoting/baseline-records-corpus-with-synth.json] \
 *     [--invoices state/shared/quoting/docustrata-invoices.curated.json] \
 *     [--out state/shared/quoting/baseline-records-corpus-with-real.json] \
 *     [--match-policy strict|fuzzy-customer]  (default fuzzy-customer)
 *     [--json]
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_BASELINE = "state/shared/quoting/baseline-records-corpus-with-synth.json";
const DEFAULT_INVOICES = "state/shared/quoting/docustrata-invoices.curated.json";
const DEFAULT_OUT = "state/shared/quoting/baseline-records-corpus-with-real.json";

const MIN_CONFIDENCE = 0;       // curated set is hand-curated; treat as confidence 1.0
const REAL_SOURCE_TAG = "docustrata-real";

/**
 * canonicalKey — normalize (customer, part_id) to an upper-case pipe key.
 * Strips whitespace; rejects empty halves.
 */
export function canonicalKey(customer, partId) {
  const c = String(customer ?? "").trim().toUpperCase();
  const p = String(partId ?? "").trim().toUpperCase();
  if (!c || !p) return null;
  return `${c}|${p}`;
}

/**
 * buildRevenueIndex — invoices[] → Map<key, {revenue_usd, source_meta}>.
 * Last-wins on key collision; emits warnings.
 */
export function buildRevenueIndex(invoices, opts = {}) {
  const map = new Map();
  const warnings = [];
  if (!Array.isArray(invoices)) {
    return { index: map, warnings: ["invoices is not an array"], skipped: 0 };
  }
  let skipped = 0;
  for (const inv of invoices) {
    const customer = inv?.customer;
    const partId = inv?.part_id;
    const revenue = Number(inv?.actual_invoice_usd);
    const confidence = inv?.extraction_confidence != null ? Number(inv.extraction_confidence) : 1.0;
    if (!Number.isFinite(revenue) || revenue <= 0) {
      skipped += 1;
      continue;
    }
    if (confidence < (opts.minConfidence ?? MIN_CONFIDENCE)) {
      skipped += 1;
      continue;
    }
    const key = canonicalKey(customer, partId);
    if (!key) {
      skipped += 1;
      continue;
    }
    if (map.has(key)) {
      warnings.push(`duplicate key ${key} — last-wins`);
    }
    map.set(key, {
      actual_revenue_usd: revenue,
      predicted_quote_usd: Number.isFinite(Number(inv?.predicted_quote_usd)) ? Number(inv.predicted_quote_usd) : null,
      quantity: Number.isFinite(Number(inv?.quantity)) ? Number(inv.quantity) : null,
      date: inv?.date ?? null,
      material: inv?.material ?? null,
      extraction_confidence: confidence,
    });
  }
  return { index: map, warnings, skipped };
}

/**
 * overlayRevenue — non-mutating overlay of revenue values on baseline records.
 * - strict: exact (customer.toUpperCase(), part_id.toUpperCase()) match
 * - fuzzy-customer: customer matches by includes/either-direction, part_id exact
 */
export function overlayRevenue(records, revenueIndex, opts = {}) {
  const policy = opts.policy ?? "fuzzy-customer";
  if (!Array.isArray(records)) {
    return { records: [], report: { total: 0, matched: 0, unmatched: 0, source_hits: {} } };
  }
  const out = [];
  let matched = 0;
  const sourceHits = {};
  // Pre-build a parallel index for fuzzy lookups: map by part_id → array of {customer, value}
  let byPartId = null;
  if (policy === "fuzzy-customer") {
    byPartId = new Map();
    for (const [key, value] of revenueIndex) {
      const [cust, pid] = key.split("|");
      const list = byPartId.get(pid) ?? [];
      list.push({ customer: cust, value });
      byPartId.set(pid, list);
    }
  }
  for (const r of records) {
    if (!r || typeof r !== "object") {
      out.push(r);
      continue;
    }
    const key = canonicalKey(r.customer, r.part_id);
    let hit = null;
    if (key && revenueIndex.has(key)) {
      hit = revenueIndex.get(key);
    } else if (policy === "fuzzy-customer" && r.part_id) {
      const pid = String(r.part_id).trim().toUpperCase();
      const candidates = byPartId?.get(pid) ?? [];
      const recCust = String(r.customer ?? "").trim().toUpperCase();
      if (recCust && candidates.length > 0) {
        // pick candidate whose customer is contained-in or contains the record customer
        for (const cand of candidates) {
          if (cand.customer.includes(recCust) || recCust.includes(cand.customer)) {
            hit = cand.value;
            break;
          }
        }
      }
    }
    if (hit) {
      matched += 1;
      sourceHits[REAL_SOURCE_TAG] = (sourceHits[REAL_SOURCE_TAG] ?? 0) + 1;
      out.push({
        ...r,
        actual_revenue_usd: hit.actual_revenue_usd,
        revenue_source: REAL_SOURCE_TAG,
        extraction_confidence: hit.extraction_confidence,
      });
    } else {
      const existing = r.revenue_source ?? "docustrata-synth";
      sourceHits[existing] = (sourceHits[existing] ?? 0) + 1;
      out.push({ ...r });
    }
  }
  return {
    records: out,
    report: {
      total: records.length,
      matched,
      unmatched: records.length - matched,
      source_hits: sourceHits,
      match_pct: records.length > 0 ? Math.round((matched / records.length) * 10000) / 100 : 0,
    },
  };
}

function parseArgs(argv) {
  const args = {
    baseline: DEFAULT_BASELINE,
    invoices: DEFAULT_INVOICES,
    out: DEFAULT_OUT,
    policy: "fuzzy-customer",
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--baseline") args.baseline = argv[++i];
    else if (a === "--invoices") args.invoices = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--match-policy") args.policy = argv[++i];
    else if (a === "--json") args.json = true;
  }
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const baselinePath = resolve(args.baseline);
  const invoicesPath = resolve(args.invoices);
  const outPath = resolve(args.out);

  const baselineRaw = JSON.parse(await fs.readFile(baselinePath, "utf8"));
  const invoicesRaw = JSON.parse(await fs.readFile(invoicesPath, "utf8"));

  const baselineRecords = Array.isArray(baselineRaw.records) ? baselineRaw.records : [];
  const invoices = Array.isArray(invoicesRaw.invoices) ? invoicesRaw.invoices : (Array.isArray(invoicesRaw.records) ? invoicesRaw.records : []);

  const { index, warnings: indexWarnings, skipped: invSkipped } = buildRevenueIndex(invoices);
  const { records: merged, report } = overlayRevenue(baselineRecords, index, { policy: args.policy });

  await fs.mkdir(resolve(outPath, ".."), { recursive: true });
  const payload = {
    generated_iso: new Date().toISOString(),
    source: "real-revenue-overlay-on-corpus-synth",
    note: `Overlays ${index.size} real-invoice keys from ${invoicesRaw.source ?? "(unknown)"} onto ${baselineRecords.length} synth records. Records matched get revenue_source="docustrata-real"; rest keep their prior tag.`,
    baseline_source: baselinePath,
    invoices_source: invoicesPath,
    match_policy: args.policy,
    real_invoice_keys: index.size,
    real_invoices_skipped: invSkipped,
    warnings: indexWarnings,
    record_count: merged.length,
    overlay_report: report,
    records: merged,
  };
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");

  const summary = {
    ok: true,
    record_count: merged.length,
    real_invoice_keys: index.size,
    matched: report.matched,
    unmatched: report.unmatched,
    match_pct: report.match_pct,
    source_hits: report.source_hits,
    out: outPath,
  };
  if (args.json) {
    process.stdout.write(JSON.stringify(summary) + "\n");
  } else {
    process.stdout.write(`[real-revenue-overlay] WROTE ${outPath} | ${report.matched}/${merged.length} matched (${report.match_pct}%) | ${index.size} real invoice keys\n`);
  }
  return summary;
}

const isMain = (() => {
  try {
    const u = new URL(import.meta.url);
    return process.argv[1] && resolve(process.argv[1]) === resolve(u.pathname.replace(/^\//, ""));
  } catch {
    return false;
  }
})();

if (isMain) {
  main().catch((err) => {
    process.stderr.write(`[real-revenue-overlay] FATAL: ${err.message}\n`);
    process.exit(1);
  });
}
