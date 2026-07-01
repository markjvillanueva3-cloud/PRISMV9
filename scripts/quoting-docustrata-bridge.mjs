#!/usr/bin/env node
/**
 * quoting-docustrata-bridge — iter18 shim: overlay real invoice revenues onto
 * baseline records, replacing the size-byte stub from iter4/iter13.
 *
 * Pre-iter18, every baseline record's actual_revenue_usd was a heuristic
 * derived from file size (`Math.max(10, sizeBytes * 0.0001)`). iter18 ships
 * the bridge SHIM that lets a future iter19 plug in real invoice extractions
 * from DocustrataHistoricalPricingTrainerEngine without touching the bootstrap
 * pipeline structure.
 *
 * Exports:
 *   buildRevenueKey(customer, partId) -> string | null
 *     - Canonical lookup key (uppercase + trimmed). Returns null on bad input.
 *
 *   mergeDocustrataRevenue(records, revenueMap, opts?) -> {records, report}
 *     - For each record, if revenueMap has matching key, override
 *       actual_revenue_usd with the real number AND set a revenue_source flag
 *       on the record so downstream consumers can distinguish stub vs real.
 *     - report: { total, matched, unmatched, override_min, override_max,
 *                 stub_preserved_count, match_rate_pct }
 *
 * Usage (CLI, future iter):
 *   node scripts/quoting-docustrata-bridge.mjs \
 *     --baseline state/shared/quoting/baseline-records.json \
 *     --docustrata state/shared/quoting/docustrata-revenues.json
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-BRIDGE-SHIM (charlie /goal-yolo iter18)
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Canonical lookup key. Both inputs must be non-empty strings after trim.
 * Uppercase normalization so "Alcoa" and "ALCOA" collide intentionally.
 */
export function buildRevenueKey(customer, partId) {
  if (typeof customer !== "string" || typeof partId !== "string") return null;
  const c = customer.trim();
  const p = partId.trim();
  if (c.length === 0 || p.length === 0) return null;
  return `${c.toUpperCase()}|${p.toUpperCase()}`;
}

/**
 * Merge a {key -> revenue} map into baseline records. Non-mutating: returns
 * NEW records array. Records without a matching key keep their original
 * actual_revenue_usd (the iter4 size-byte stub).
 *
 * opts.minRevenue (default 1) — guard against zero/negative override values;
 *   any candidate below this floor is rejected (logged in report).
 */
export function mergeDocustrataRevenue(records, revenueMap, opts = {}) {
  const minRevenue = typeof opts.minRevenue === "number" && opts.minRevenue >= 0
    ? opts.minRevenue : 1;
  const safeRecords = Array.isArray(records) ? records : [];
  const safeMap = revenueMap instanceof Map
    ? revenueMap
    : (revenueMap && typeof revenueMap === "object" ? new Map(Object.entries(revenueMap)) : new Map());

  let matched = 0;
  let unmatched = 0;
  let rejectedBelowMin = 0;
  let overrideMin = Infinity;
  let overrideMax = -Infinity;

  const out = safeRecords.map(r => {
    if (!r || typeof r !== "object") return r;
    const key = buildRevenueKey(r.customer, r.part_id);
    if (key === null) {
      unmatched++;
      return { ...r, revenue_source: "stub" };
    }
    const candidate = safeMap.get(key);
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= minRevenue) {
      matched++;
      if (candidate < overrideMin) overrideMin = candidate;
      if (candidate > overrideMax) overrideMax = candidate;
      return { ...r, actual_revenue_usd: candidate, revenue_source: "docustrata" };
    }
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate < minRevenue) {
      rejectedBelowMin++;
    }
    unmatched++;
    return { ...r, revenue_source: "stub" };
  });

  const total = out.length;
  const matchRate = total > 0 ? Math.round((matched / total) * 1000) / 10 : 0;

  return {
    records: out,
    report: {
      total,
      matched,
      unmatched,
      stub_preserved_count: unmatched,
      rejected_below_min: rejectedBelowMin,
      override_min: matched > 0 ? overrideMin : null,
      override_max: matched > 0 ? overrideMax : null,
      match_rate_pct: matchRate,
      min_revenue_threshold: minRevenue,
    },
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
  const docustrataPath = resolve(process.cwd(), val("docustrata", "state/shared/quoting/docustrata-revenues.json"));
  const outPath = resolve(process.cwd(), val("out", "state/shared/quoting/baseline-records-merged.json"));
  const jsonOut = flag("json");
  const minRevenue = parseFloat(val("min-revenue", "1"));

  let baseline;
  try {
    baseline = JSON.parse(await fs.readFile(baselinePath, "utf-8"));
  } catch (e) {
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, reason: "baseline read failed", path: baselinePath, error: String(e) }) + "\n");
    else process.stderr.write(`[docustrata-bridge] FAIL baseline ${baselinePath}: ${e}\n`);
    process.exit(1);
  }

  let docustrataRaw;
  try {
    docustrataRaw = JSON.parse(await fs.readFile(docustrataPath, "utf-8"));
  } catch (e) {
    // docustrata-revenues.json missing is non-fatal — every record stays stub
    if (jsonOut) {
      process.stdout.write(JSON.stringify({ ok: true, mode: "no-overrides", reason: `docustrata file missing: ${docustrataPath}` }) + "\n");
    } else {
      process.stderr.write(`[docustrata-bridge] WARN no docustrata file at ${docustrataPath} — preserving all stubs\n`);
    }
    process.exit(0);
  }

  // Accept either {customer|part: revenue} flat map OR {records: [{customer, part_id, revenue}]}.
  let revenueMap;
  if (Array.isArray(docustrataRaw?.records)) {
    revenueMap = new Map();
    for (const r of docustrataRaw.records) {
      const k = buildRevenueKey(r?.customer, r?.part_id);
      if (k && typeof r?.revenue === "number") revenueMap.set(k, r.revenue);
    }
  } else if (docustrataRaw && typeof docustrataRaw === "object") {
    revenueMap = new Map(Object.entries(docustrataRaw));
  } else {
    revenueMap = new Map();
  }

  const result = mergeDocustrataRevenue(baseline?.records ?? [], revenueMap, { minRevenue });

  const merged = { ...baseline, records: result.records, docustrata_merge_report: result.report };
  await fs.writeFile(outPath, JSON.stringify(merged, null, 2), "utf-8");

  if (jsonOut) {
    process.stdout.write(JSON.stringify({ ok: true, ...result.report, out: outPath }) + "\n");
  } else {
    process.stdout.write(
      `[docustrata-bridge] WROTE ${outPath} | matched=${result.report.matched}/${result.report.total} ` +
      `(${result.report.match_rate_pct}%) | override range=[${result.report.override_min},${result.report.override_max}] ` +
      `| stubs preserved=${result.report.stub_preserved_count} | rejected<${minRevenue}=${result.report.rejected_below_min}\n`,
    );
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[docustrata-bridge] UNHANDLED: ${e}\n`);
    process.exit(1);
  });
}
