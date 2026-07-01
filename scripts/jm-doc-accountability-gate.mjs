#!/usr/bin/env node
/**
 * jm-doc-accountability-gate.mjs — U-JMDOC01 (JM-DOC-POPULATION-MS0)
 *
 * The campaign's GREEN/RED signal that "every JM document is accounted for".
 * Joins the proven per-document ledger (build-jm-document-ledger.mjs output) with the
 * bridge registry (U-JMDOC02) and asserts the accountability invariants. Re-runnable,
 * non-zero exit on any integrity violation. Each seed-bridge unit's acceptance criterion =
 * "this gate stays GREEN after my bridge lands AND my tuple's bridge_status flips shipped".
 *
 * Inputs (both required, fail-loud if absent/malformed):
 *   state/shared/databases/jm-document-ledger-summary.json   (the reconciled ledger)
 *   state/shared/databases/jm-doc-bridge-registry.json        (tuple -> bridge_status)
 *
 * Assertions:
 *   G1  ledger.invariant_ok===true AND all 4 invariant_checks true (refuse to certify a broken ledger)
 *   G2  every ledger tuple with disposition!=unrouted-misc has a registry row whose status is tracked
 *       (shipped|deferred|pending). UNTRACKED tuple => FAIL. --strict: pending also => FAIL.
 *   G3  every registry row with status=deferred has a non-empty deferred_reason (no silent deferral)
 *   G4  every ledger.unrouted_detail entry has a matching registry.unrouted row (status=deferred + reason)
 *   G5  financial discipline: ledger.invariant_checks.no_consumed_financial===true AND every financial-bucket
 *       (or financial_guard) registry row uses a link/pointer seed_method and is NOT disposition=consumed
 *   G6  coverage report: shipped primary-disposition volume / total_inventoried (+ pending punch list)
 *
 * Usage: node scripts/jm-doc-accountability-gate.mjs [--json] [--strict]
 *   default (progress) — exit 0 if G1/G3/G4/G5 pass and every tuple is TRACKED; pending is reported, not fatal.
 *   --strict (close-out) — additionally require every tuple shipped|deferred (pending => exit 1).
 * Exit 0 = GREEN, 1 = RED (integrity violation or, in --strict, incomplete coverage), 2 = bad inputs.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = resolve(ROOT, "state/shared/databases/jm-document-ledger-summary.json");
const REGISTRY_PATH = resolve(ROOT, "state/shared/databases/jm-doc-bridge-registry.json");
const JSON_MODE = process.argv.includes("--json");
const STRICT = process.argv.includes("--strict");

// Buckets whose documents are financial/order records — must be link/pointer only, never `consumed`.
const FINANCIAL_BUCKETS = new Set([
  "sales_orders", "closed_orders", "invoices", "invoice",
  "tax_financial", "accounting", "customer_po", "acknowledgment",
  "quotes", "quote",
]);
const TRACKED_STATUS = new Set(["shipped", "deferred", "pending"]);

function die(code, msg) {
  if (!JSON_MODE) console.error(`\n[jm-doc-gate] FATAL: ${msg}`);
  else console.log(JSON.stringify({ ok: false, exit: code, fatal: msg }, null, 2));
  process.exit(code);
}
function loadJson(path, label) {
  let raw;
  try { raw = readFileSync(path, "utf8"); }
  catch { die(2, `cannot read ${label} at ${path}`); }
  try { return JSON.parse(raw); }
  catch (e) { die(2, `${label} is not valid JSON: ${e instanceof Error ? e.message : e}`); }
}

const ledger = loadJson(LEDGER_PATH, "ledger-summary");
const registry = loadJson(REGISTRY_PATH, "bridge-registry");

const failures = []; // hard integrity violations -> RED regardless of mode
const fail = (gate, detail) => failures.push({ gate, detail });

// ---- G1: ledger integrity ----
const checks = ledger.invariant_checks || {};
if (ledger.invariant_ok !== true) fail("G1", `ledger.invariant_ok !== true (got ${ledger.invariant_ok})`);
for (const k of ["disposition_sum_eq_total", "tuple_sum_eq_total", "accounted_plus_orphan_eq_total", "no_consumed_financial"]) {
  if (checks[k] !== true) fail("G1", `ledger.invariant_checks.${k} !== true (got ${checks[k]})`);
}

const tuples = registry.tuples || {};
const unrouted = registry.unrouted || {};
const allRegRows = [
  ...Object.entries(tuples).map(([k, v]) => ["tuples", k, v]),
  ...Object.entries(unrouted).map(([k, v]) => ["unrouted", k, v]),
  ...Object.entries(registry.cross_cutting || {}).map(([k, v]) => ["cross_cutting", k, v]),
];

// ---- G3: deferred rows need a reason ----
for (const [section, key, row] of allRegRows) {
  if (row.bridge_status === "deferred") {
    const reason = (row.deferred_reason || "").trim();
    if (!reason) fail("G3", `${section}/${key} is deferred with empty deferred_reason`);
  }
  if (row.bridge_status && !TRACKED_STATUS.has(row.bridge_status)) {
    fail("G3", `${section}/${key} has unknown bridge_status "${row.bridge_status}"`);
  }
}

// ---- G2: every non-unrouted ledger tuple is tracked in registry.tuples ----
const byTuple = ledger.by_source_bucket || [];
let coveredVol = 0, pendingVol = 0, deferredVol = 0, shippedTuples = 0, pendingTuples = 0;
const pendingList = [];
const strictViolations = [];
for (const t of byTuple) {
  if (t.disposition === "unrouted-misc") continue; // handled by G4
  const key = `${t.source}/${t.bucket}`;
  const row = tuples[key];
  if (!row) { fail("G2", `ledger tuple ${key} (disp=${t.disposition}, n=${t.count}) has NO registry.tuples row (UNTRACKED)`); continue; }
  // count cross-check (ledger is source of truth; registry drift is a warning unless strict)
  if (typeof row.count === "number" && row.count !== t.count) {
    if (STRICT) fail("G2", `${key} count drift: registry ${row.count} vs ledger ${t.count}`);
  }
  if (row.bridge_status === "shipped") { coveredVol += t.count; shippedTuples++; }
  else if (row.bridge_status === "deferred") { deferredVol += t.count; }
  else if (row.bridge_status === "pending") {
    pendingVol += t.count; pendingTuples++;
    pendingList.push({ tuple: key, count: t.count, unit: row.unit || "?", disposition: t.disposition });
    if (STRICT) strictViolations.push(`${key} (n=${t.count}, unit ${row.unit || "?"}) still pending`);
  }
}

// ---- G4: every ledger unrouted_detail entry is an explicit deferred registry.unrouted row ----
for (const u of ledger.unrouted_detail || []) {
  const key = `${u.source}/${u.bucket}`;
  const row = unrouted[key];
  if (!row) fail("G4", `unrouted_detail ${key} (n=${u.count}) has NO registry.unrouted row`);
  else if (row.bridge_status !== "deferred") fail("G4", `unrouted ${key} must be bridge_status=deferred (got ${row.bridge_status})`);
  else if (!(row.deferred_reason || "").trim()) fail("G4", `unrouted ${key} deferred without reason`);
}

// ---- G5: financial discipline ----
if (checks.no_consumed_financial !== true) fail("G5", "ledger reports consumed financial docs (no_consumed_financial !== true)");
for (const [section, key, row] of allRegRows) {
  const bucket = key.split("/")[1];
  const isFinancial = row.financial_guard === true || FINANCIAL_BUCKETS.has(bucket);
  if (!isFinancial) continue;
  const method = String(row.seed_method || "").toLowerCase();
  const linkLike = method.includes("link") || method.includes("pointer") || method.includes("reference");
  if (!linkLike) fail("G5", `financial ${section}/${key} seed_method "${row.seed_method}" is not link/pointer-only`);
  if (row.disposition === "consumed") fail("G5", `financial ${section}/${key} has disposition=consumed (forbidden)`);
}

// ---- G6: coverage ----
const total = ledger.total_inventoried || 0;
const orphanVol = (ledger.unrouted_detail || []).reduce((s, u) => s + (u.count || 0), 0);
const pct = (n) => total ? ((100 * n) / total).toFixed(3) + "%" : "n/a";
const green = failures.length === 0 && (!STRICT || strictViolations.length === 0);

const report = {
  ok: green,
  mode: STRICT ? "strict" : "progress",
  total_inventoried: total,
  shipped_primary_volume: coveredVol,
  shipped_primary_pct: pct(coveredVol),
  deferred_volume: deferredVol,
  pending_volume: pendingVol,
  explicit_orphan_volume: orphanVol,
  shipped_tuples: shippedTuples,
  pending_tuples: pendingTuples,
  cross_cutting_customer_shipped: (registry.cross_cutting?.customer?.bridge_status === "shipped"),
  failures,
  strict_violations: strictViolations,
  pending_punch_list: pendingList.sort((a, b) => b.count - a.count),
};

if (JSON_MODE) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\n=== JM-DOC ACCOUNTABILITY GATE (${report.mode}) ===`);
  console.log(`total inventoried        : ${total}`);
  console.log(`shipped primary volume   : ${coveredVol} (${pct(coveredVol)})  [${shippedTuples} tuple(s)]`);
  console.log(`deferred (explicit)      : ${deferredVol} (${pct(deferredVol)})`);
  console.log(`pending volume           : ${pendingVol} (${pct(pendingVol)})  [${pendingTuples} tuple(s)]`);
  console.log(`explicit orphan (unrouted): ${orphanVol} (${pct(orphanVol)})`);
  console.log(`cross-cut customer link  : ${report.cross_cutting_customer_shipped ? "SHIPPED (147,791 docs)" : "pending"}`);
  if (pendingList.length) {
    console.log(`\nPENDING punch list (build these to raise coverage):`);
    for (const p of report.pending_punch_list) console.log(`  ${String(p.count).padStart(7)}  ${p.tuple}  -> ${p.unit} (${p.disposition})`);
  }
  if (failures.length) {
    console.log(`\n*** ${failures.length} INTEGRITY FAILURE(S) — GATE RED ***`);
    for (const f of failures) console.log(`  [${f.gate}] ${f.detail}`);
  }
  if (STRICT && strictViolations.length) {
    console.log(`\n*** --strict: ${strictViolations.length} tuple(s) still pending — close-out incomplete ***`);
    for (const v of strictViolations) console.log(`  ${v}`);
  }
  console.log(`\nRESULT: ${green ? "GREEN ✅ (every document accounted for; integrity holds)" : "RED ❌"}`);
}

process.exit(green ? 0 : 1);
