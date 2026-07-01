#!/usr/bin/env node
/**
 * quoting-baseline-from-corpus.mjs — corpus-source bootstrap (alternative to
 * quoting-baseline-bootstrap.mjs).
 *
 * QUOTING-SYNERGY-MS0/U-QP-CORPUS-BASELINE (slot:charlie iter58 2026-05-28).
 *
 * The existing quoting-baseline-bootstrap.mjs walks JM DIE/ directly via the
 * fleet ledger and produces poisoned records (machine names like
 * "Okuma_Multus_B250II" appear as customers, machine_class collapses to "mill"
 * for everything, material_iso is always null). iter56 already shipped a clean
 * canonical corpus at state/shared/databases/jm-{file-inventory,customers}.jsonl
 * with proper per-file (customer, bucket, material, machine_class) attribution,
 * but the training pipeline doesn't read it.
 *
 * This script bridges that gap. Outputs the same baseline-records.json shape
 * the existing pipeline (stage 1+ in PIPELINE-RUNBOOK.md) expects, so it is a
 * drop-in alternative for stage 0.
 *
 * Streaming: jm-file-inventory.jsonl is 107.8MB; we line-stream it rather than
 * loading into memory.
 *
 * Pure exports for the test suite:
 *   - derivePartId(absPath)
 *   - rateForMachineClass(cls)
 *   - timeForBucket(bucket)
 *   - mergeFileIntoRecord(record|null, file, customerRec|null)
 *   - finalizeRecord(record) — fills derived fields, returns canonical shape
 *
 * CLI:
 *   node scripts/quoting-baseline-from-corpus.mjs \
 *     [--inventory state/shared/databases/jm-file-inventory.jsonl] \
 *     [--customers state/shared/databases/jm-customers.jsonl] \
 *     [--out state/shared/quoting/baseline-records.json] \
 *     [--limit 0]        # 0 = no limit (full corpus); default 0
 *     [--min-files 1]    # skip (customer, part_id) tuples with fewer files
 *     [--summary]        # print machine_class + material histogram to stderr
 *     [--json]           # machine-readable summary line on stdout
 */

import { createReadStream, promises as fs } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, basename } from "node:path";

const DEFAULT_INVENTORY = "state/shared/databases/jm-file-inventory.jsonl";
const DEFAULT_CUSTOMERS = "state/shared/databases/jm-customers.jsonl";
const DEFAULT_OUT = "state/shared/quoting/baseline-records.json";

// Rates by ISO group canonical-ish (mirrors iter13 deriveRecordDefaults)
const RATE_BY_CLASS = Object.freeze({
  "wire-edm": 110,
  wedm: 110,
  sinker: 100,
  "sinker-edm": 100,
  heidenhain: 100,
  mill: 95,
  lathe: 85,
  grinder: 75,
});

const TIME_BY_BUCKET = Object.freeze({
  program: 3600,
  cad: 1800,
  setup: 1200,
  print: 900,
  scan: 600,
  doc: 300,
  other: 300,
});

// stub material spend by class (iter54 will swap in DocuStrataMaterialPriorEngine per-grade)
const MATERIAL_SPEND_BY_CLASS = Object.freeze({
  "wire-edm": 80,
  wedm: 80,
  sinker: 70,
  "sinker-edm": 70,
  heidenhain: 70,
  mill: 60,
  lathe: 50,
  grinder: 40,
});

const STUB_MARKUP = 1.4;
const REVENUE_FLOOR = 10;

/**
 * normalizeClass — strip vendor suffixes from iter56's taxonomy.
 *   "mill_hurco"  → "mill"
 *   "lathe_okuma" → "lathe"
 *   "wire-edm"    → "wire-edm" (preserves canonical hyphenated form)
 */
export function normalizeClass(cls) {
  if (!cls || typeof cls !== "string") return null;
  const k = cls.toLowerCase().trim();
  if (k in RATE_BY_CLASS) return k;
  const before = k.split("_")[0];
  if (before in RATE_BY_CLASS) return before;
  return k;
}

export function rateForMachineClass(cls) {
  if (!cls || typeof cls !== "string") return 95;
  const key = normalizeClass(cls);
  return RATE_BY_CLASS[key] ?? 95;
}

export function timeForBucket(bucket) {
  if (!bucket || typeof bucket !== "string") return 300;
  const key = bucket.toLowerCase().trim();
  return TIME_BY_BUCKET[key] ?? 300;
}

export function materialSpendForClass(cls) {
  if (!cls || typeof cls !== "string") return 60;
  const key = normalizeClass(cls);
  return MATERIAL_SPEND_BY_CLASS[key] ?? 60;
}

/**
 * derivePartId — produce a stable part_id from a JM Die file path.
 * Strategy: use the immediate parent folder name when it looks like a part code
 * (e.g. "R910", "A0763-99-12"), otherwise fall back to file basename without ext.
 */
export function derivePartId(absPath) {
  if (!absPath || typeof absPath !== "string") return "_UNKNOWN_";
  const norm = absPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = norm.split("/");
  if (parts.length < 2) return basename(absPath).replace(/\.[^.]+$/, "") || "_UNKNOWN_";
  // walk backwards from the file basename
  const file = parts[parts.length - 1] || "";
  const parent = parts[parts.length - 2] || "";
  // Heuristic: parent is a part code if it has digits + length 3-32
  if (parent && /\d/.test(parent) && parent.length >= 3 && parent.length <= 48) {
    return parent.toUpperCase();
  }
  return file.replace(/\.[^.]+$/, "").toUpperCase() || "_UNKNOWN_";
}

/**
 * mergeFileIntoRecord — add one file to an existing aggregate record (or seed
 * a new one). Returns the updated record. Pure — does not mutate inputs.
 */
export function mergeFileIntoRecord(existing, file, customerRec) {
  if (!file || typeof file !== "object") return existing;
  const customer = (file.customer || "").toString().trim();
  if (!customer || customer === "_" || customer === "null") return existing;
  const partId = derivePartId(file.path || "");
  if (!partId || partId === "_UNKNOWN_") return existing;
  const next = existing ? { ...existing } : {
    customer,
    part_id: partId,
    files: [],
    buckets: [],
    machine_classes: [],
    materials: [],
  };
  next.files = [...next.files, file.path || ""];
  if (file.bucket) next.buckets = [...next.buckets, file.bucket];
  // file.machine_class wins over customer fallback
  const fileMC = (file.machine_class || "").toString().trim();
  const custMCs = Array.isArray(customerRec?.machine_classes_seen) ? customerRec.machine_classes_seen : [];
  if (fileMC) next.machine_classes = [...next.machine_classes, fileMC];
  else if (custMCs.length > 0) next.machine_classes = [...next.machine_classes, custMCs[0]];
  const fileMat = (file.material || "").toString().trim();
  const custMats = Array.isArray(customerRec?.materials_seen) ? customerRec.materials_seen : [];
  if (fileMat) next.materials = [...next.materials, fileMat];
  else if (custMats.length > 0) next.materials = [...next.materials, custMats[0]];
  return next;
}

/**
 * finalizeRecord — convert internal aggregate to canonical baseline-records.json
 * shape. Picks the dominant machine_class + material, computes time from the
 * dominant bucket, stubs revenue from cost × markup.
 */
export function finalizeRecord(agg, dateIso) {
  if (!agg || !agg.customer || !agg.part_id) return null;
  const rawClass = dominantOrNull(agg.machine_classes);
  const dominantClass = rawClass ? normalizeClass(rawClass) : null;
  const dominantMaterial = dominantOrNull(agg.materials);
  const dominantBucket = dominantOrNull(agg.buckets) || "other";
  const cycle_s = timeForBucket(dominantBucket);
  const rate = rateForMachineClass(dominantClass);
  const material_spend = materialSpendForClass(dominantClass);
  const cost = (cycle_s / 3600) * rate + material_spend;
  const revenue = Math.max(REVENUE_FLOOR, Math.round(cost * STUB_MARKUP * 100) / 100);
  return {
    customer: agg.customer,
    part_id: agg.part_id,
    doc_date: dateIso,
    actual_revenue_usd: revenue,
    estimated_time_in_cut_s: cycle_s,
    machine_rate_usd_per_hr: rate,
    estimated_material_spend_usd: material_spend,
    machine_class: dominantClass,
    material_iso: dominantMaterial,
    _file_count: agg.files.length,
  };
}

function dominantOrNull(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const counts = new Map();
  for (const v of arr) {
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

async function loadCustomerMap(path) {
  let content;
  try {
    content = await fs.readFile(path, "utf8");
  } catch {
    return new Map();
  }
  const map = new Map();
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const rec = JSON.parse(t);
      if (rec && rec.customer_key) map.set(rec.customer_key.toUpperCase(), rec);
    } catch {
      /* skip */
    }
  }
  return map;
}

async function streamInventory(path, onRecord, { limit = 0 } = {}) {
  const stream = createReadStream(path, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let consumed = 0;
  let parsed = 0;
  let skipped = 0;
  for await (const line of rl) {
    consumed += 1;
    const t = line.trim();
    if (!t) continue;
    let rec;
    try {
      rec = JSON.parse(t);
    } catch {
      skipped += 1;
      continue;
    }
    parsed += 1;
    onRecord(rec);
    if (limit > 0 && parsed >= limit) {
      rl.close();
      stream.destroy();
      break;
    }
  }
  return { consumed, parsed, skipped };
}

function parseArgs(argv) {
  const args = {
    inventory: DEFAULT_INVENTORY,
    customers: DEFAULT_CUSTOMERS,
    out: DEFAULT_OUT,
    limit: 0,
    minFiles: 1,
    summary: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--inventory") args.inventory = argv[++i];
    else if (a === "--customers") args.customers = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]) || 0;
    else if (a === "--min-files") args.minFiles = Math.max(1, Number(argv[++i]) || 1);
    else if (a === "--summary") args.summary = true;
    else if (a === "--json") args.json = true;
  }
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const invPath = resolve(args.inventory);
  const custPath = resolve(args.customers);
  const outPath = resolve(args.out);

  const customers = await loadCustomerMap(custPath);
  const aggregates = new Map(); // key = `${customer}|${part_id}`

  const inventoryStats = await streamInventory(invPath, (file) => {
    const customer = (file?.customer || "").toString().trim().toUpperCase();
    if (!customer || customer === "_" || customer === "NULL") return;
    const partId = derivePartId(file?.path || "");
    if (!partId || partId === "_UNKNOWN_") return;
    const key = `${customer}|${partId}`;
    const cust = customers.get(customer);
    const merged = mergeFileIntoRecord(aggregates.get(key), { ...file, customer }, cust);
    if (merged) aggregates.set(key, merged);
  }, { limit: 0 }); // always stream the whole inventory; --limit applies to OUTPUT records

  const today = new Date().toISOString().slice(0, 10);
  const records = [];
  for (const agg of aggregates.values()) {
    if (agg.files.length < args.minFiles) continue;
    const rec = finalizeRecord(agg, today);
    if (rec) records.push(rec);
  }
  records.sort((a, b) => (b._file_count - a._file_count) || a.customer.localeCompare(b.customer));
  const capped = args.limit > 0 ? records.slice(0, args.limit) : records;

  await fs.mkdir(resolve(outPath, ".."), { recursive: true });
  const payload = {
    generated_iso: new Date().toISOString(),
    source: "jm-die-corpus-iter56",
    note: "Corpus-derived baseline. Streams jm-file-inventory.jsonl + jm-customers.jsonl. actual_revenue_usd is a cost×1.4 stub until DocustrataHistoricalPricingTrainerEngine extracts real invoices.",
    record_count: capped.length,
    inventory_files_consumed: inventoryStats.parsed,
    inventory_files_skipped: inventoryStats.skipped,
    customers_loaded: customers.size,
    unique_pairs_aggregated: aggregates.size,
    records: capped,
  };
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");

  if (args.summary) {
    const histClass = new Map();
    const histMaterial = new Map();
    const histRate = new Map();
    for (const r of capped) {
      const c = r.machine_class || "(null)";
      const m = r.material_iso || "(null)";
      const rate = String(r.machine_rate_usd_per_hr);
      histClass.set(c, (histClass.get(c) || 0) + 1);
      histMaterial.set(m, (histMaterial.get(m) || 0) + 1);
      histRate.set(rate, (histRate.get(rate) || 0) + 1);
    }
    const fmtHist = (h) => [...h.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(", ");
    process.stderr.write(`[corpus-bootstrap] machine_class: ${fmtHist(histClass)}\n`);
    process.stderr.write(`[corpus-bootstrap] material_iso:  ${fmtHist(histMaterial)}\n`);
    process.stderr.write(`[corpus-bootstrap] rate_$/hr:     ${fmtHist(histRate)}\n`);
  }

  const out = {
    ok: true,
    record_count: capped.length,
    inventory_parsed: inventoryStats.parsed,
    inventory_skipped: inventoryStats.skipped,
    customers_loaded: customers.size,
    out: outPath,
  };
  if (args.json) {
    process.stdout.write(JSON.stringify(out) + "\n");
  } else {
    process.stdout.write(`[corpus-bootstrap] WROTE ${outPath} | ${capped.length} records | streamed ${inventoryStats.parsed} files | ${customers.size} customers\n`);
  }
  return out;
}

// Import-safe CLI guard (mirror iter9 convention)
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
    process.stderr.write(`[corpus-bootstrap] FATAL: ${err.message}\n`);
    process.exit(1);
  });
}
