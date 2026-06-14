#!/usr/bin/env node
/**
 * jm-population-status.mjs — U-JMDOC-SYNERGY-STATUS (JM-DOC-POPULATION-MS0, slot:hotel)
 *
 * READ-ONLY awareness/dashboard surface for the JM-document population campaign.
 * The campaign shipped seed bridges (gate GREEN) but nothing in the awareness/dashboard
 * layer SURFACES that JM data is populated — so a closed-loop app-user test can't see it
 * at a glance. This script reads the three existing campaign artifacts and emits a status
 * snapshot (JSON + human one-pager) suitable for awareness-snapshot / dashboard injection.
 *
 * Inputs (all required, all SMALL — fail-loud if any missing):
 *   state/shared/databases/jm-document-ledger-summary.json   (reconciled ledger — source of truth for counts)
 *   state/shared/databases/jm-doc-bridge-registry.json        (tuple -> bridge_status)
 *   state/shared/databases/jm-corpus-summary.json             (corpus inventory stats)
 *
 * Coverage method MIRRORS scripts/jm-doc-accountability-gate.mjs (U-JMDOC01):
 *   shipped_coverage_pct = sum(ledger.by_source_bucket[].count where
 *                              registry.tuples[`${source}/${bucket}`].bridge_status === "shipped")
 *                          / ledger.total_inventoried * 100
 *   This equals the gate's shipped_primary_pct, so the two cross-check exactly.
 *
 * Outputs (idempotent — re-run overwrites):
 *   state/shared/dashboards/jm-population-status.json   (machine-readable)
 *   state/shared/dashboards/jm-population-status.md      (human one-pager)
 *
 * Usage: node scripts/jm-population-status.mjs [--json]
 *   --json   print the JSON snapshot to stdout (for dashboard consumers)
 *
 * NO engine/financial/business logic, NO PII — reads existing artifacts, writes a status snapshot.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = "1.0.0";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_MODE = process.argv.includes("--json");

const LEDGER_PATH = resolve(ROOT, "state/shared/databases/jm-document-ledger-summary.json");
const REGISTRY_PATH = resolve(ROOT, "state/shared/databases/jm-doc-bridge-registry.json");
const CORPUS_PATH = resolve(ROOT, "state/shared/databases/jm-corpus-summary.json");
const OUT_JSON = resolve(ROOT, "state/shared/dashboards/jm-population-status.json");
const OUT_MD = resolve(ROOT, "state/shared/dashboards/jm-population-status.md");

function die(msg) {
  console.error(`\n[jm-population-status] FATAL: ${msg}`);
  process.exit(2);
}

function loadJson(path, label) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    die(`required input "${label}" not found at ${path} (campaign artifact missing — has the ledger been built?)`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    die(`"${label}" at ${path} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const ledger = loadJson(LEDGER_PATH, "jm-document-ledger-summary.json");
const registry = loadJson(REGISTRY_PATH, "jm-doc-bridge-registry.json");
const corpus = loadJson(CORPUS_PATH, "jm-corpus-summary.json");

// ---- Counts (ledger is the source of truth) ----
const total = Number(ledger.total_inventoried) || 0;
if (total <= 0) die(`ledger.total_inventoried is ${ledger.total_inventoried} (expected a positive document count)`);

const tuples = registry.tuples || {};
const byTuple = Array.isArray(ledger.by_source_bucket) ? ledger.by_source_bucket : [];

// ---- Coverage: sum shipped-tuple ledger counts (mirrors the accountability gate) ----
let shippedVol = 0;
let deferredVol = 0;
let pendingVol = 0;
let shippedTuples = 0;
let deferredTuples = 0;
let pendingTuples = 0;
const pendingDetail = [];

for (const t of byTuple) {
  if (t.disposition === "unrouted-misc") continue; // unrouted handled separately; not a tracked tuple
  const key = `${t.source}/${t.bucket}`;
  const row = tuples[key];
  if (!row) continue; // untracked tuple — the gate flags this; we surface it via shippedTuples gap only
  const count = Number(t.count) || 0;
  if (row.bridge_status === "shipped") {
    shippedVol += count;
    shippedTuples++;
  } else if (row.bridge_status === "deferred") {
    deferredVol += count;
    deferredTuples++;
  } else if (row.bridge_status === "pending") {
    pendingVol += count;
    pendingTuples++;
    pendingDetail.push({
      tuple: key,
      count,
      disposition: t.disposition,
      unit: row.unit || "?",
      owner: row.owner || "?",
    });
  }
}
pendingDetail.sort((a, b) => b.count - a.count);

const pct = (n) => (total ? Number(((100 * n) / total).toFixed(3)) : 0);
const shippedCoveragePct = pct(shippedVol);

// ---- by_disposition straight from the ledger ----
const byDisposition = { ...(ledger.by_disposition || {}) };

// ---- gate_green: integrity floor (G1 of the accountability gate) ----
const invChecks = ledger.invariant_checks || {};
const gateGreen =
  ledger.invariant_ok === true &&
  invChecks.disposition_sum_eq_total === true &&
  invChecks.tuple_sum_eq_total === true &&
  invChecks.accounted_plus_orphan_eq_total === true &&
  invChecks.no_consumed_financial === true;

// ---- customers + financial guard ----
const distinctCustomers = Number(ledger.distinct_customers) || 0;
const corpusCustomers = Number(corpus?.stats?.customer_count) || 0;
const crmSeededDocs = Number(registry?.cross_cutting?.customer?.covered) || 0;
const financialGuarded = Number(ledger.financial_guarded_count) || 0;

const generatedAt = new Date().toISOString();

const snapshot = {
  schema_version: SCHEMA_VERSION,
  generated_at: generatedAt,
  milestone: ledger.milestone || "JM-DOC-POPULATION-MS0",
  total_documents: total,
  shipped_coverage_pct: shippedCoveragePct,
  shipped_volume: shippedVol,
  deferred_volume: deferredVol,
  pending_volume: pendingVol,
  by_disposition: byDisposition,
  tuples: {
    shipped: shippedTuples,
    deferred: deferredTuples,
    pending: pendingTuples,
  },
  pending_detail: pendingDetail,
  customers: distinctCustomers,
  corpus_customers: corpusCustomers,
  crm_seeded_docs: crmSeededDocs,
  financial_guarded: financialGuarded,
  gate_green: gateGreen,
  sources: {
    ledger: "state/shared/databases/jm-document-ledger-summary.json",
    registry: "state/shared/databases/jm-doc-bridge-registry.json",
    corpus: "state/shared/databases/jm-corpus-summary.json",
  },
};

// ---- Human one-pager ----
const fmt = (n) => Number(n).toLocaleString("en-US");
const dispRows = Object.entries(byDisposition)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| ${k} | ${fmt(v)} | ${pct(v)}% |`)
  .join("\n");

const pendingRows = pendingDetail.length
  ? pendingDetail
      .map((p) => `| ${p.tuple} | ${fmt(p.count)} | ${p.unit} | ${p.owner} |`)
      .join("\n")
  : "| _(none — all tracked tuples shipped or deferred)_ | | | |";

const md = `# JM-Population Status — ${snapshot.milestone}

> Read-only awareness surface (U-JMDOC-SYNERGY-STATUS, slot:hotel). Regenerate via
> \`node scripts/jm-population-status.mjs\`. Source of truth: the campaign ledger + bridge registry.

**Generated:** ${generatedAt}

## Coverage headline

- **${shippedCoveragePct}%** of JM documents are surfaced through a SHIPPED seed bridge
  (**${fmt(shippedVol)}** of **${fmt(total)}** documents).
- Accountability gate integrity: **${gateGreen ? "GREEN ✅" : "RED ❌"}** (ledger invariants ${gateGreen ? "hold" : "BROKEN"}).
- Tracked tuples: **${shippedTuples} shipped**, **${deferredTuples} deferred**, **${pendingTuples} pending**.
- JM customers in corpus: **${fmt(distinctCustomers)}** distinct (${fmt(crmSeededDocs)} docs CRM-linked).
- Financial-guarded documents (link/pointer-only, NO discrete ERP records): **${fmt(financialGuarded)}**.

## Documents by disposition

| Disposition | Documents | Share |
|-------------|-----------|-------|
${dispRows}

## Shipped vs pending tuples

- **Shipped:** ${shippedTuples} tuple(s), ${fmt(shippedVol)} documents (${shippedCoveragePct}% of total).
- **Deferred:** ${deferredTuples} tuple(s), ${fmt(deferredVol)} documents (explicit, owned elsewhere).
- **Pending:** ${pendingTuples} tuple(s), ${fmt(pendingVol)} documents (planned, not yet bridged).

### Pending punch list (build these to raise coverage)

| Tuple (source/bucket) | Documents | Unit | Owner |
|-----------------------|-----------|------|-------|
${pendingRows}

---
_Schema ${SCHEMA_VERSION}. Inputs: jm-document-ledger-summary.json · jm-doc-bridge-registry.json · jm-corpus-summary.json._
`;

writeFileSync(OUT_JSON, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
writeFileSync(OUT_MD, md, "utf8");

if (JSON_MODE) {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  console.log(`\n=== JM-POPULATION STATUS (${snapshot.milestone}) ===`);
  console.log(`total documents     : ${fmt(total)}`);
  console.log(`shipped coverage    : ${shippedCoveragePct}%  (${fmt(shippedVol)} docs, ${shippedTuples} tuples)`);
  console.log(`deferred / pending  : ${fmt(deferredVol)} (${deferredTuples}t) / ${fmt(pendingVol)} (${pendingTuples}t)`);
  console.log(`customers           : ${fmt(distinctCustomers)} distinct  (${fmt(crmSeededDocs)} docs CRM-linked)`);
  console.log(`financial-guarded   : ${fmt(financialGuarded)}`);
  console.log(`gate integrity      : ${gateGreen ? "GREEN" : "RED"}`);
  console.log(`\nby disposition:`);
  for (const [k, v] of Object.entries(byDisposition).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(7)}  ${k} (${pct(v)}%)`);
  }
  if (pendingDetail.length) {
    console.log(`\npending punch list (${pendingDetail.length}):`);
    for (const p of pendingDetail) {
      console.log(`  ${String(p.count).padStart(7)}  ${p.tuple} -> ${p.unit} [${p.owner}]`);
    }
  }
  console.log(`\nwrote: ${OUT_JSON}`);
  console.log(`wrote: ${OUT_MD}`);
}
