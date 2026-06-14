#!/usr/bin/env node
/**
 * quoting-docustrata-format — iter19: format validator for the Docustrata
 * revenue payload that the iter18 bridge consumes.
 *
 * iter18 ships the bridge SHIM (mergeDocustrataRevenue) but accepts any
 * key->revenue Map or any plain object — too permissive. iter19 locks down
 * the contract: validate the EXTRACTOR's payload BEFORE feeding it to the
 * bridge, so a malformed Docustrata extraction can't silently poison the
 * training loop.
 *
 * Accepted payload shapes (the validator normalizes BOTH to a single Map):
 *   1. Flat map:  { "ALCOA|P1": 1500, "ITW|P2": 2300, ... }
 *   2. Records:   {
 *                   "schema_version": "1.0.0",
 *                   "generated_iso": "2026-05-26T...",
 *                   "source": "docustrata-historical-pricing-trainer",
 *                   "records": [
 *                     { "customer": "ALCOA", "part_id": "p1", "revenue": 1500 },
 *                     ...
 *                   ]
 *                 }
 *
 * Returns { valid, errors, warnings, normalized, stats }:
 *   normalized:  Map<KEY, revenue> ready to pass to mergeDocustrataRevenue
 *   stats:       { row_count, distinct_customers, revenue_range,
 *                   schema_version (records-shape only), source }
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-FORMAT-VALIDATOR (charlie /goal-yolo iter19)
 */

import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildRevenueKey } from "./quoting-docustrata-bridge.mjs";

/** Accepted schema versions (additive — old payloads still valid). */
export const SUPPORTED_SCHEMA_VERSIONS = new Set(["1.0.0"]);

/** Minimum/maximum sane revenue values (catches data corruption + truncation). */
export const REVENUE_BOUNDS = Object.freeze({ min: 0.01, max: 10_000_000 });

/**
 * Pure validator. Defensive against null/undefined/non-object input.
 * Returns { valid, errors, warnings, normalized, stats }.
 * errors    — disqualifying issues (returns valid:false)
 * warnings  — non-fatal issues (returns valid:true with warning list)
 * normalized — Map ready for mergeDocustrataRevenue
 */
export function validateDocustrataPayload(raw) {
  const errors = [];
  const warnings = [];
  const normalized = new Map();
  const stats = {
    row_count: 0,
    distinct_customers: 0,
    revenue_range: null,
    schema_version: null,
    source: null,
  };

  if (raw === null || raw === undefined) {
    errors.push("payload is null/undefined");
    return { valid: false, errors, warnings, normalized, stats };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`payload must be an object, got ${Array.isArray(raw) ? "array" : typeof raw}`);
    return { valid: false, errors, warnings, normalized, stats };
  }

  // Records-shape detection: has a records[] AND/OR schema_version
  const hasRecords = Array.isArray(raw.records);
  if (hasRecords) {
    stats.schema_version = raw.schema_version ?? null;
    stats.source = raw.source ?? null;
    if (raw.schema_version !== undefined && !SUPPORTED_SCHEMA_VERSIONS.has(raw.schema_version)) {
      errors.push(`unsupported schema_version: ${JSON.stringify(raw.schema_version)} (accepted: ${[...SUPPORTED_SCHEMA_VERSIONS].join(", ")})`);
    }
    if (raw.records.length === 0) {
      warnings.push("records array is empty — no overrides will apply");
    }
    const customers = new Set();
    let revMin = Infinity;
    let revMax = -Infinity;
    let validRows = 0;
    for (let i = 0; i < raw.records.length; i++) {
      const r = raw.records[i];
      if (!r || typeof r !== "object" || Array.isArray(r)) {
        errors.push(`records[${i}] must be an object`);
        continue;
      }
      const k = buildRevenueKey(r.customer, r.part_id);
      if (k === null) {
        errors.push(`records[${i}] has invalid customer/part_id (need non-empty strings)`);
        continue;
      }
      if (typeof r.revenue !== "number" || !Number.isFinite(r.revenue)) {
        errors.push(`records[${i}] revenue must be a finite number, got ${typeof r.revenue}`);
        continue;
      }
      if (r.revenue < REVENUE_BOUNDS.min || r.revenue > REVENUE_BOUNDS.max) {
        warnings.push(`records[${i}] revenue ${r.revenue} outside sane range [${REVENUE_BOUNDS.min}, ${REVENUE_BOUNDS.max}] — likely data error`);
        continue;
      }
      if (normalized.has(k)) {
        warnings.push(`duplicate key ${k} (records[${i}]) — last value wins`);
      }
      normalized.set(k, r.revenue);
      customers.add(r.customer.toUpperCase().trim());
      if (r.revenue < revMin) revMin = r.revenue;
      if (r.revenue > revMax) revMax = r.revenue;
      validRows++;
    }
    stats.row_count = validRows;
    stats.distinct_customers = customers.size;
    stats.revenue_range = validRows > 0 ? { min: revMin, max: revMax } : null;
  } else {
    // Flat map shape: { "KEY": revenue, ... }
    let validRows = 0;
    let revMin = Infinity;
    let revMax = -Infinity;
    const customers = new Set();
    for (const [k, v] of Object.entries(raw)) {
      if (!/^[A-Z0-9_\- ]+\|[A-Z0-9_\- ]+$/i.test(k)) {
        warnings.push(`flat-map key "${k}" doesn't match expected CUSTOMER|PART_ID shape — skipping`);
        continue;
      }
      if (typeof v !== "number" || !Number.isFinite(v)) {
        errors.push(`flat-map key "${k}" value must be a finite number, got ${typeof v}`);
        continue;
      }
      if (v < REVENUE_BOUNDS.min || v > REVENUE_BOUNDS.max) {
        warnings.push(`flat-map key "${k}" revenue ${v} outside sane range — skipping`);
        continue;
      }
      normalized.set(k.toUpperCase(), v);
      const cust = k.split("|")[0].toUpperCase().trim();
      customers.add(cust);
      if (v < revMin) revMin = v;
      if (v > revMax) revMax = v;
      validRows++;
    }
    stats.row_count = validRows;
    stats.distinct_customers = customers.size;
    stats.revenue_range = validRows > 0 ? { min: revMin, max: revMax } : null;
    if (validRows === 0) {
      errors.push("no valid entries in flat-map payload");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized,
    stats,
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
  const path = resolve(process.cwd(), val("file", "state/shared/quoting/docustrata-revenues.json"));
  const jsonOut = flag("json");

  let raw;
  try {
    raw = JSON.parse(await fs.readFile(path, "utf-8"));
  } catch (e) {
    if (jsonOut) process.stdout.write(JSON.stringify({ valid: false, reason: "read failed", path, error: String(e) }) + "\n");
    else process.stderr.write(`[docustrata-format] FAIL read ${path}: ${e}\n`);
    process.exit(1);
  }

  const result = validateDocustrataPayload(raw);
  if (jsonOut) {
    process.stdout.write(JSON.stringify({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      stats: result.stats,
      normalized_size: result.normalized.size,
    }) + "\n");
  } else {
    const tag = result.valid ? "OK" : "FAIL";
    process.stdout.write(`[docustrata-format] ${tag} | rows=${result.stats.row_count} customers=${result.stats.distinct_customers} | errors=${result.errors.length} warnings=${result.warnings.length}\n`);
    for (const e of result.errors) process.stderr.write(`  ERROR: ${e}\n`);
    for (const w of result.warnings) process.stderr.write(`  WARN : ${w}\n`);
  }
  process.exit(result.valid ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    process.stderr.write(`[docustrata-format] UNHANDLED: ${e}\n`);
    process.exit(1);
  });
}
