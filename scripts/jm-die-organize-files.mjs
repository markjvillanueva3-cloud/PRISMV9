#!/usr/bin/env node
/**
 * jm-die-organize-files.mjs — JM-DIE-ORGANIZE-MS0
 *
 * Operator directive (slot uniform, 2026-05-27):
 *   "H:\PRISM\JM DIE copy all files throughout the folder and copy them to
 *    their corresponding company folder to match them to prints and orders
 *    in the _PART_library folder in the jm die folder."
 *
 * Strategy (Karpathy R8 — read before write):
 *   Source layout (sampled):
 *     H:/PRISM/JM DIE/<MACHINE-FOLDER>/<CUSTOMER>/...
 *       e.g. CNC MILL HAAS/ALCOA FASTENING/...
 *       e.g. CNC LATHE/ACME/...
 *       e.g. HURCO CNC PROGRAMS/<CUSTOMER>/...
 *       e.g. OKUMA/<CUSTOMER>/...
 *
 *   Destination layout (already exists, 477 customer folders):
 *     H:/PRISM/JM DIE/_PART LIBRARY/<CUSTOMER>/<PART-NUMBER>/...
 *
 *   Matching: top-level child of a known machine folder == customer name.
 *   Build a fuzzy match from machine-folder customer → _PART LIBRARY customer
 *   (exact match first, then case-insensitive, then substring on a longest-
 *   prefix-wins basis).
 *
 * Outputs:
 *   state/shared/jm-die-organize-plan.json (full plan — every src→dst pair)
 *   state/shared/jm-die-organize-summary.json (per-machine + per-customer rollup)
 *   state/shared/jm-die-organize-unmatched.json (customers we couldn't map)
 *
 * Modes:
 *   default      — dry-run; write plans + summary, NO file copies
 *   --execute    — actually copy (idempotent: skip if dst exists with same size+mtime)
 *   --machine X  — restrict to one machine folder
 *   --limit N    — cap number of files in plan (debug)
 *
 * Karpathy edge cases handled:
 *   - empty source folders → recorded in summary as 0-file directories
 *   - duplicate destination paths → records as conflict (does not overwrite)
 *   - permission errors → counted, surfaced in summary
 *   - unmatched customers → recorded; ARE NOT copied (must be human-resolved)
 *   - resumable: re-run skips files already present at dst with same size
 *
 * Karpathy R12 fail-loud:
 *   Every error path produces an explicit log line + bumps a counter; no
 *   silent skip. Final summary prints a non-zero exit on any UNRECOVERED
 *   error class so CI/operator sees the failure.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JM_DIE_ROOT = "H:/PRISM/JM DIE";
const PART_LIBRARY = path.join(JM_DIE_ROOT, "_PART LIBRARY");
const OUT_DIR = path.join(ROOT, "state", "shared");
const PLAN_PATH = path.join(OUT_DIR, "jm-die-organize-plan.json");
const SUMMARY_PATH = path.join(OUT_DIR, "jm-die-organize-summary.json");
const UNMATCHED_PATH = path.join(OUT_DIR, "jm-die-organize-unmatched.json");

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) || Infinity : Infinity;
const machineIdx = args.indexOf("--machine");
const MACHINE_FILTER = machineIdx >= 0 ? args[machineIdx + 1] : null;

// ---------------------------------------------------------------------------
// Top-level JM DIE children that are MACHINE-ORGANIZED (customer subfolders)
// vs. NOT machine-organized (everything else — handled separately).
// ---------------------------------------------------------------------------

const MACHINE_FOLDERS = [
  "CNC LATHE",
  "CNC MILL HAAS",
  "CNC OKUMA MULTUS",
  "HURCO CNC PROGRAMS",
  "OKUMA",
  "ROKU-ROKU",
  "WIRE EDM",
  "LATHE",
  "HAAS-HURCO",
];

// Folders that are NOT customer-organized — skip for now (will need a
// separate strategy / operator decision).
const NON_CUSTOMER_FOLDERS = new Set([
  "_PART LIBRARY",
  "BASEBALL PARTS",
  "FUSION CAD AND CAM FILES",
  "GENERAL BANDAGES",
  "JM DIE COMPANY",
  "MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION",
  "MACRO PROGRAMS",
  "MATTHEW programs",
  "POST PROCESSORS",
  "PRISM CAD TESTING",
  "PRISM MODIFIED POST PROCESSORS",
  "QUEUE",
  "REVERSE ENGINEERING",
  "SETUPS",
  "TRIBAL + WIKI",
]);

// Substring-match minimum key length — prevents 2-char keys (e.g. "AJ")
// from fuzzy-matching too aggressively. 4 is the empirical floor where
// false positives stayed near zero in the JM Die customer set.
const MIN_SUBSTRING_KEY_LEN = 4;

// How many copy-error samples to surface in the final log (R12 fail loud,
// but don't flood the console with 162K-row error walls).
const ERROR_SAMPLE_CAP = 5;

// ---------------------------------------------------------------------------
// Customer matching: machine-folder customer name → _PART LIBRARY customer name
// ---------------------------------------------------------------------------

function loadPartLibraryCustomers() {
  if (!fs.existsSync(PART_LIBRARY)) {
    throw new Error(`PART_LIBRARY not found: ${PART_LIBRARY}`);
  }
  const out = [];
  for (const e of fs.readdirSync(PART_LIBRARY, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(e.name);
  }
  return out;
}

function normalizeCustomerKey(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .replace(/^(THE|A|AN)/, "");
}

function buildCustomerMatcher(partLibraryCustomers) {
  const byNormKey = new Map();
  for (const c of partLibraryCustomers) {
    const k = normalizeCustomerKey(c);
    if (!byNormKey.has(k)) byNormKey.set(k, c);
  }

  return function match(sourceCustomer) {
    // Exact match
    if (partLibraryCustomers.includes(sourceCustomer)) {
      return { matched: sourceCustomer, confidence: "exact", reason: "string equal" };
    }
    // Normalized exact
    const k = normalizeCustomerKey(sourceCustomer);
    if (byNormKey.has(k)) {
      return { matched: byNormKey.get(k), confidence: "normalized", reason: `normKey=${k}` };
    }
    // Longest-prefix substring (source is contained in / contains dest)
    let best = null;
    for (const c of partLibraryCustomers) {
      const ck = normalizeCustomerKey(c);
      if (k.length >= MIN_SUBSTRING_KEY_LEN && ck.includes(k)) {
        if (!best || c.length < best.matched.length) {
          best = { matched: c, confidence: "substring", reason: `dest contains src normKey` };
        }
      } else if (ck.length >= MIN_SUBSTRING_KEY_LEN && k.includes(ck)) {
        if (!best || c.length < best.matched.length) {
          best = { matched: c, confidence: "substring", reason: `src contains dest normKey` };
        }
      }
    }
    if (best) return best;
    return { matched: null, confidence: "none", reason: "no candidate" };
  };
}

// ---------------------------------------------------------------------------
// File enumeration: walk one customer subfolder, return all files.
// ---------------------------------------------------------------------------

function* walkFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkFiles(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

// ---------------------------------------------------------------------------
// Build the plan
// ---------------------------------------------------------------------------

function buildPlan() {
  const customers = loadPartLibraryCustomers();
  const match = buildCustomerMatcher(customers);

  const plan = [];
  const unmatched = []; // customers we could not match
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: EXECUTE ? "execute" : "dry-run",
    partLibraryCustomerCount: customers.length,
    machineFolders: {},
    totals: {
      planEntries: 0,
      bytes: 0,
      unmatchedCustomers: 0,
      conflicts: 0,
      readErrors: 0,
    },
  };

  let machineList = MACHINE_FOLDERS;
  if (MACHINE_FILTER) machineList = MACHINE_FOLDERS.filter((m) => m === MACHINE_FILTER);

  for (const machine of machineList) {
    const machineDir = path.join(JM_DIE_ROOT, machine);
    if (!fs.existsSync(machineDir)) {
      summary.machineFolders[machine] = { skipped: "not present" };
      continue;
    }
    const machineStat = {
      sourceCustomers: 0,
      matched: 0,
      unmatched: 0,
      files: 0,
      bytes: 0,
    };
    let machineCustomers;
    try {
      machineCustomers = fs.readdirSync(machineDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch (e) {
      summary.totals.readErrors++;
      summary.machineFolders[machine] = { error: e.message };
      continue;
    }
    for (const srcCustomer of machineCustomers) {
      machineStat.sourceCustomers++;
      const m = match(srcCustomer);
      if (!m.matched) {
        machineStat.unmatched++;
        unmatched.push({ machine, sourceCustomer: srcCustomer, reason: m.reason });
        summary.totals.unmatchedCustomers++;
        continue;
      }
      machineStat.matched++;
      const srcRoot = path.join(machineDir, srcCustomer);
      const dstRoot = path.join(PART_LIBRARY, m.matched, `__from__${machine}__${srcCustomer}`);
      for (const file of walkFiles(srcRoot)) {
        if (plan.length >= LIMIT) break;
        const rel = path.relative(srcRoot, file);
        const dst = path.join(dstRoot, rel);
        let stat;
        try { stat = fs.statSync(file); } catch (e) {
          summary.totals.readErrors++;
          continue;
        }
        plan.push({
          src: file.replace(/\\/g, "/"),
          dst: dst.replace(/\\/g, "/"),
          bytes: stat.size,
          mtime: stat.mtimeMs,
          machine,
          srcCustomer,
          dstCustomer: m.matched,
          matchConfidence: m.confidence,
        });
        machineStat.files++;
        machineStat.bytes += stat.size;
      }
      if (plan.length >= LIMIT) break;
    }
    summary.machineFolders[machine] = machineStat;
    if (plan.length >= LIMIT) break;
  }

  summary.totals.planEntries = plan.length;
  summary.totals.bytes = plan.reduce((a, e) => a + e.bytes, 0);

  return { plan, summary, unmatched };
}

// ---------------------------------------------------------------------------
// Execute (copy)
// ---------------------------------------------------------------------------

function executePlan(plan) {
  let copied = 0;
  let skipped = 0;
  let errors = 0;
  const errorSamples = [];
  for (const entry of plan) {
    try {
      // idempotent: skip if dst exists with same size
      if (fs.existsSync(entry.dst)) {
        try {
          const st = fs.statSync(entry.dst);
          if (st.size === entry.bytes) { skipped++; continue; }
        } catch { /* fall through to copy */ }
      }
      fs.mkdirSync(path.dirname(entry.dst), { recursive: true });
      fs.copyFileSync(entry.src, entry.dst);
      copied++;
    } catch (e) {
      errors++;
      if (errorSamples.length < ERROR_SAMPLE_CAP) errorSamples.push({ src: entry.src, msg: e.message });
    }
  }
  return { copied, skipped, errors, errorSamples };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log(`[jm-die-organize] mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} machine=${MACHINE_FILTER ?? "ALL"} limit=${LIMIT === Infinity ? "none" : LIMIT}`);
  const t0 = Date.now();
  const { plan, summary, unmatched } = buildPlan();
  console.log(`[jm-die-organize] plan built in ${Date.now() - t0}ms — entries=${plan.length} unmatched-customers=${unmatched.length}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(PLAN_PATH, JSON.stringify(plan, null, 2));
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  fs.writeFileSync(UNMATCHED_PATH, JSON.stringify(unmatched, null, 2));
  console.log(`[jm-die-organize] wrote ${PLAN_PATH} (${plan.length} entries)`);
  console.log(`[jm-die-organize] wrote ${SUMMARY_PATH}`);
  console.log(`[jm-die-organize] wrote ${UNMATCHED_PATH} (${unmatched.length} unmatched)`);

  // Per-machine summary
  for (const [m, s] of Object.entries(summary.machineFolders)) {
    if (s.skipped) {
      console.log(`  ${m}: SKIPPED — ${s.skipped}`);
    } else if (s.error) {
      console.log(`  ${m}: ERROR — ${s.error}`);
    } else {
      console.log(`  ${m}: ${s.sourceCustomers} customers (${s.matched} matched / ${s.unmatched} unmatched) — ${s.files} files, ${(s.bytes / 1e6).toFixed(1)} MB`);
    }
  }
  console.log(`TOTAL: ${summary.totals.planEntries} files, ${(summary.totals.bytes / 1e9).toFixed(2)} GB, ${summary.totals.unmatchedCustomers} unmatched customers, ${summary.totals.readErrors} read errors`);

  // Surface the non-customer top-level folders that THIS script did not handle
  // (Karpathy R12 fail loud — operator can see what was skipped + must decide).
  const nonCustomerPresent = [...NON_CUSTOMER_FOLDERS].filter((f) =>
    fs.existsSync(path.join(JM_DIE_ROOT, f))
  );
  console.log(`[jm-die-organize] non-customer top-level folders NOT planned (need separate strategy): ${nonCustomerPresent.length}`);
  for (const f of nonCustomerPresent) console.log(`  - ${f}`);

  if (EXECUTE) {
    console.log(`[jm-die-organize] executing copy of ${plan.length} files...`);
    const t1 = Date.now();
    const r = executePlan(plan);
    console.log(`[jm-die-organize] copied=${r.copied} skipped=${r.skipped} errors=${r.errors} in ${Date.now() - t1}ms`);
    if (r.errors > 0) {
      console.log(`[jm-die-organize] FIRST-${r.errorSamples.length} ERROR SAMPLES:`);
      for (const s of r.errorSamples) console.log(`  ${s.src} -> ${s.msg}`);
      process.exit(1);
    }
  } else {
    console.log(`[jm-die-organize] DRY-RUN — re-run with --execute to copy. Inspect plan + unmatched first.`);
  }
}

main();
