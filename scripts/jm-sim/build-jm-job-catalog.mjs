#!/usr/bin/env node
/**
 * build-jm-job-catalog.mjs — JM historical job/order catalog builder
 *
 * Foundation dataset for the simulated quote-to-ship pipeline run
 * ([HOTEL] /goal — catch JM up to 2026 state). Reads the pre-built
 * Docustrata corpus (NEVER re-OCRs — per critical-resource-roots doctrine)
 * from TWO authoritative sources and emits structured ERP/quoting artifacts:
 *
 *   A. manifest.json `documents[]` (111,745 docs) — the authoritative
 *      business-document corpus. `folder_name` is the real ERP bucket
 *      (JMD Quotes / JMD Sales Orders / JMD Orders Closed / JMD Packing
 *      Slips / JMD Acct RecPay / …). This is the quoting + ERP + AR/AP data.
 *      NOTE: the coarse `.index/` classifier (SCAN/NOTE/PRINT) does NOT
 *      identify quotes/orders — folder_name is the source of truth.
 *
 *   B. .index/blueprint-program-join-full-v6.jsonl (76,205 parts) — the
 *      part↔blueprint↔program↔customer join = the manufacturing job records.
 *
 * Outputs (state/shared/jm-sim/):
 *   jm-job-catalog.json     — one record per historical part/job
 *   jm-business-docs.jsonl   — one line per quote/order/packing/AR doc
 *   jm-document-roles.json   — ERP-bucket counts + samples + year histogram
 *   jm-catalog-summary.json  — headline counts for the dashboard
 *
 * Fail-loud: throws if a source is missing (never silently emits an empty
 * catalog that downstream would read as "JM has no jobs").
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync, statSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

const ROOT = resolve(process.argv[2] || "H:/prism");
const DOCU = resolve(ROOT, "Docustrata");
const IDX = resolve(DOCU, ".index");
const OUT_DIR = resolve(ROOT, "state/shared/jm-sim");

const MANIFEST = resolve(DOCU, "manifest.json");
const JOIN = resolve(IDX, "blueprint-program-join-full-v6.jsonl");

const ROLE_SAMPLE_CAP = 25;        // sample docs retained per bucket in roles.json

for (const f of [MANIFEST, JOIN]) {
  if (!existsSync(f)) {
    throw new Error(`[build-jm-job-catalog] MISSING required source: ${f} — cannot build catalog. (Docustrata corpus not present?)`);
  }
}
mkdirSync(OUT_DIR, { recursive: true });

/** Stream a JSONL file line-by-line, invoking onRecord(obj) per valid JSON line. */
async function streamJsonl(path, onRecord) {
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  let lines = 0, parsed = 0, errors = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    lines++;
    let obj;
    try { obj = JSON.parse(line); } catch { errors++; continue; }
    parsed++;
    onRecord(obj);
  }
  return { lines, parsed, errors };
}

/** ISO-date normaliser (accepts ISO, MM/DD/YYYY). Returns YYYY-MM-DD or null. */
function toIso(d) {
  if (!d || typeof d !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const m = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

/** folder_name → canonical ERP bucket. Source of truth for doc role. */
function folderBucket(folderName) {
  const f = String(folderName || "").trim();
  if (/^JMD Quotes/i.test(f)) return "QUOTE";
  if (/^JMD Sales Orders/i.test(f)) return "SALES_ORDER";
  if (/^JMD Orders Closed/i.test(f)) return "ORDER_CLOSED";
  if (/^JMD Packing Slips/i.test(f)) return "PACKING_SLIP";
  if (/^JMD Acct/i.test(f)) return "AR_AP";
  if (/^JMD Taxes/i.test(f)) return "TAX";
  if (/^JMD UPS/i.test(f)) return "SHIPPING";
  if (/^JMD Laser/i.test(f)) return "LASER_SHEET";
  if (/^JMD Prints/i.test(f)) return "BLUEPRINT";
  if (/^JMD Altracs/i.test(f)) return "JOB_FOLDER";
  return null; // notebooks / scans / unfiled — not a structured ERP doc
}

// ── A. manifest.json — business documents ──────────────────────────────────
console.error("[1/2] parsing manifest.json (business documents) …");
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const docs = Array.isArray(manifest.documents) ? manifest.documents : [];
if (!docs.length) throw new Error("[build-jm-job-catalog] manifest.documents is empty — refusing to emit empty business-doc catalog");

const bucketCounts = {};            // ERP bucket → count
const bucketSamples = {};           // ERP bucket → sample doc records
const yearHistogram = {};           // bucket → { year → count }
let businessDocCount = 0;
const businessLines = [];           // jsonl lines for the structured docs

for (const d of docs) {
  const bucket = folderBucket(d.folder_name);
  if (!bucket) continue;
  businessDocCount++;
  bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
  const iso = toIso(d.document_date) || toIso(d.created_at);
  const year = iso ? iso.slice(0, 4) : "unknown";
  yearHistogram[bucket] = yearHistogram[bucket] || {};
  yearHistogram[bucket][year] = (yearHistogram[bucket][year] || 0) + 1;
  const rec = {
    id: d.id,
    bucket,
    date: iso,
    year,
    title: (d.title || d.filename || "").slice(0, 120),
    filename: d.filename || null,
    tags: Array.isArray(d.tags) ? d.tags.filter((t) => t && !/^watch$/i.test(t)).slice(0, 8) : [],
    folder: d.folder_name,
  };
  businessLines.push(JSON.stringify(rec));
  if (!bucketSamples[bucket]) bucketSamples[bucket] = [];
  if (bucketSamples[bucket].length < ROLE_SAMPLE_CAP) bucketSamples[bucket].push(rec);
}

// ── B. blueprint-program-join — manufacturing job records ──────────────────
console.error("[2/2] streaming blueprint-program-join-full-v6.jsonl (job/part records) …");
const catalog = [];
const confCounts = {};
let withPrograms = 0, withCustomer = 0;
const customerSet = new Set();
const joinStats = await streamJsonl(JOIN, (o) => {
  const conf = o.match_confidence || "unknown";
  confCounts[conf] = (confCounts[conf] || 0) + 1;
  const customers = Array.isArray(o.print_customers) ? o.print_customers.filter(Boolean) : [];
  customers.forEach((c) => customerSet.add(c));
  const nProg = o.n_programs || (Array.isArray(o.programs) ? o.programs.length : 0);
  if (nProg > 0) withPrograms++;
  if (customers.length) withCustomer++;
  catalog.push({
    part_number: o.part_number,
    part_number_normalized: o.part_number_normalized || o.part_number,
    customers,
    n_blueprints: Array.isArray(o.blueprints) ? o.blueprints.length : 0,
    blueprint_doc_ids: (Array.isArray(o.blueprints) ? o.blueprints : []).slice(0, 6).map((b) => b.doc_id),
    n_programs: nProg,
    match_confidence: conf,
    raw_pn_variants: o.raw_pn_variants || [],
  });
});

// ── Emit ───────────────────────────────────────────────────────────────────
const generatedAt = new Date().toISOString();

const summary = {
  schemaVersion: "2.0.0",
  generatedAt,
  source: {
    manifest: { file: "manifest.json", totalDocuments: docs.length, businessDocs: businessDocCount, sizeMB: +(statSync(MANIFEST).size / 1e6).toFixed(1) },
    join: { file: "blueprint-program-join-full-v6.jsonl", ...joinStats, sizeMB: +(statSync(JOIN).size / 1e6).toFixed(1) },
  },
  businessDocuments: {
    total: businessDocCount,
    byBucket: bucketCounts,
    yearHistogram,
  },
  jobs: {
    totalParts: catalog.length,
    withPrograms,
    withCustomer,
    uniqueCustomers: customerSet.size,
    byMatchConfidence: confCounts,
  },
};

writeFileSync(resolve(OUT_DIR, "jm-catalog-summary.json"), JSON.stringify(summary, null, 2));
writeFileSync(resolve(OUT_DIR, "jm-job-catalog.json"), JSON.stringify(catalog));
writeFileSync(resolve(OUT_DIR, "jm-business-docs.jsonl"), businessLines.join("\n") + "\n");
writeFileSync(resolve(OUT_DIR, "jm-document-roles.json"), JSON.stringify({
  schemaVersion: "2.0.0", generatedAt, byBucket: bucketCounts, samples: bucketSamples,
}, null, 2));

console.error("\n=== JM JOB CATALOG BUILT ===");
console.log(JSON.stringify(summary, null, 2));
