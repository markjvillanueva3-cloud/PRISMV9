#!/usr/bin/env node
/**
 * quoting-docustrata-synth — iter20: deterministic synthetic revenue generator
 * for testing the iter18 bridge + iter19 validator with realistic data BEFORE
 * the actual DocustrataHistoricalPricingTrainerEngine extractor lands.
 *
 * generateSyntheticRevenueRecords(baselineRecords, opts) -> validator-compliant payload
 *
 * Revenue model (transparent + deterministic):
 *   cost     = (cycleTimeHr × machineRate) + materialSpend
 *   markup   = base_markup_pct + jitter(seed, customer+part_id) // [-jitter_pct, +jitter_pct]
 *   revenue  = cost × (1 + markup)
 *
 * Default base_markup_pct = 0.40 (40% gross margin — typical job-shop floor)
 * Default jitter_pct = 0.20 (±20% per-customer variance — realistic shop spread)
 *
 * Determinism: same (customer, part_id) → same revenue. Reproducible for testing.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-SYNTH (charlie /goal-yolo iter20)
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Deterministic [0,1) hash from a string — simple FNV-1a variant. Pure. */
export function deterministicHashUnit(s) {
  if (typeof s !== "string" || s.length === 0) return 0;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h % 1_000_000) / 1_000_000;
}

/**
 * Pure generator — derive synthetic Docustrata-compliant records from baseline records.
 * Returns { schema_version, generated_iso, source, records } in the records-shape
 * the iter19 validator accepts.
 */
export function generateSyntheticRevenueRecords(baselineRecords, opts = {}) {
  const baseMarkup = typeof opts.baseMarkupPct === "number" ? opts.baseMarkupPct : 0.40;
  const jitter = typeof opts.jitterPct === "number" ? opts.jitterPct : 0.20;
  const tsIso = opts.tsIso ?? new Date().toISOString();
  const minRevenue = typeof opts.minRevenue === "number" ? opts.minRevenue : 1;

  const safe = Array.isArray(baselineRecords) ? baselineRecords : [];
  const records = [];
  for (const r of safe) {
    if (!r || typeof r !== "object") continue;
    if (typeof r.customer !== "string" || typeof r.part_id !== "string") continue;
    const cycleS = typeof r.estimated_time_in_cut_s === "number" && r.estimated_time_in_cut_s > 0
      ? r.estimated_time_in_cut_s : 1800;
    const rate = typeof r.machine_rate_usd_per_hr === "number" && r.machine_rate_usd_per_hr > 0
      ? r.machine_rate_usd_per_hr : 95;
    const material = typeof r.estimated_material_spend_usd === "number" && r.estimated_material_spend_usd >= 0
      ? r.estimated_material_spend_usd : 50;
    const cost = (cycleS / 3600) * rate + material;
    // Jitter: ±jitter_pct, deterministic on (customer|part_id)
    const u = deterministicHashUnit(`${r.customer}|${r.part_id}`);
    const jitterFactor = -jitter + (2 * jitter * u); // [-jitter, +jitter]
    const effectiveMarkup = baseMarkup + jitterFactor;
    const revenue = cost * (1 + effectiveMarkup);
    const rounded = Math.max(minRevenue, Math.round(revenue * 100) / 100);
    records.push({ customer: r.customer, part_id: r.part_id, revenue: rounded });
  }

  return {
    schema_version: "1.0.0",
    generated_iso: tsIso,
    source: "quoting-docustrata-synth",
    records,
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
  const outPath = resolve(process.cwd(), val("out", "state/shared/quoting/docustrata-revenues-synth.json"));
  const baseMarkup = parseFloat(val("markup", "0.40"));
  const jitter = parseFloat(val("jitter", "0.20"));
  const jsonOut = flag("json");

  let baseline;
  try {
    baseline = JSON.parse(await fs.readFile(baselinePath, "utf-8"));
  } catch (e) {
    if (jsonOut) process.stdout.write(JSON.stringify({ ok: false, reason: "baseline read failed", path: baselinePath, error: String(e) }) + "\n");
    else process.stderr.write(`[docustrata-synth] FAIL ${baselinePath}: ${e}\n`);
    process.exit(1);
  }

  const payload = generateSyntheticRevenueRecords(baseline?.records ?? [], { baseMarkupPct: baseMarkup, jitterPct: jitter });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf-8");

  if (jsonOut) {
    process.stdout.write(JSON.stringify({ ok: true, out: outPath, record_count: payload.records.length, base_markup_pct: baseMarkup, jitter_pct: jitter }) + "\n");
  } else {
    process.stdout.write(`[docustrata-synth] WROTE ${outPath} | ${payload.records.length} records | markup=${(baseMarkup * 100).toFixed(0)}%±${(jitter * 100).toFixed(0)}%\n`);
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[docustrata-synth] UNHANDLED: ${e}\n`);
    process.exit(1);
  });
}
