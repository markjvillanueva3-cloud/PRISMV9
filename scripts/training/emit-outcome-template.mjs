#!/usr/bin/env node
/**
 * emit-outcome-template.mjs — outcome-emitter starter template.
 *
 * Every domain chat (charlie/delta/echo/foxtrot/hotel/kilo/mike/whiskey/papa/
 * sierra/quebec/tango/oscar) wires its training pipeline into the
 * PSN-SELF-IMPROVING-LOOP substrate by appending OutcomeLedgerRecord JSONL
 * rows. This is the template — copy + adapt per domain. Production usage:
 *
 *   import { appendOutcome } from "scripts/training/emit-outcome-template.mjs";
 *   appendOutcome({
 *     domain_ledger: "state/shared/training/lathe-outcomes.jsonl",
 *     record: {
 *       observed_at: new Date().toISOString(),
 *       shop_id: "jm-die",
 *       category: "lathe",
 *       domain: "time",
 *       estimated: 10.5,
 *       actual: 12.3,
 *       unit: "min",
 *       s_of_x: 0.92,
 *     },
 *   });
 *
 * Once outcomes land in the ledger, india's `ShopOutcomeIngestProcessorEngine`
 * picks them up automatically. No further wiring required.
 *
 * Schema reference: state/shared/specs/PSN-SELF-IMPROVING-LOOP-COORDINATION-CONTRACT-2026-05-25.md
 *
 * slot:india /goal-fleet-coord iter11
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// SCHEMA — OutcomeLedgerRecord (the canonical shape every emit must conform to)
// ============================================================================

const VALID_CATEGORIES = new Set([
  "lathe", "mill", "wedm", "sinker_edm", "5axis", "swiss", "grinding", "mill_turn",
]);
const VALID_DOMAINS = new Set(["rate", "time", "quality", "yield"]);

/**
 * Validate a record against OutcomeLedgerRecord schema. Throws on first
 * violation with structured error so callers see exactly what's wrong.
 * Returns the same record (pass-through) on success.
 */
export function validateOutcomeRecord(record) {
  if (!record || typeof record !== "object") {
    throw new Error("validateOutcomeRecord: record must be an object");
  }
  if (typeof record.observed_at !== "string" || record.observed_at.length === 0) {
    throw new Error("validateOutcomeRecord: observed_at required (ISO8601 string)");
  }
  if (record.shop_id !== undefined && (typeof record.shop_id !== "string" || record.shop_id.length === 0)) {
    throw new Error("validateOutcomeRecord: shop_id must be non-empty string when present");
  }
  if (!VALID_CATEGORIES.has(record.category)) {
    throw new Error(`validateOutcomeRecord: category must be one of ${[...VALID_CATEGORIES].join(", ")}`);
  }
  if (!VALID_DOMAINS.has(record.domain)) {
    throw new Error(`validateOutcomeRecord: domain must be one of ${[...VALID_DOMAINS].join(", ")}`);
  }
  if (!Number.isFinite(record.estimated)) {
    throw new Error("validateOutcomeRecord: estimated must be a finite number");
  }
  if (!Number.isFinite(record.actual)) {
    throw new Error("validateOutcomeRecord: actual must be a finite number");
  }
  if (typeof record.unit !== "string" || record.unit.length === 0) {
    throw new Error("validateOutcomeRecord: unit required (non-empty string)");
  }
  if (record.s_of_x !== undefined) {
    if (!Number.isFinite(record.s_of_x) || record.s_of_x < 0 || record.s_of_x > 1) {
      throw new Error("validateOutcomeRecord: s_of_x must be a finite number in [0, 1]");
    }
  }
  if (record.evidence_id !== undefined && typeof record.evidence_id !== "string") {
    throw new Error("validateOutcomeRecord: evidence_id must be a string (HASHED — never raw customer name)");
  }
  return record;
}

/**
 * Append one outcome to a domain ledger. Creates the parent directory + a
 * leading __meta header on first write. Pure append (never rewrites prior
 * rows). Thread-safety via O_APPEND (POSIX-equivalent on Windows + node).
 */
export function appendOutcome(opts) {
  const { domain_ledger, record, meta } = opts;
  if (typeof domain_ledger !== "string" || domain_ledger.length === 0) {
    throw new Error("appendOutcome: domain_ledger path required");
  }
  validateOutcomeRecord(record);

  const dir = path.dirname(domain_ledger);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(domain_ledger)) {
    const header = {
      __meta: true,
      version: 1,
      source: meta?.source || "emit-outcome-template",
      domain_ledger,
      generated_at: new Date().toISOString(),
    };
    fs.writeFileSync(domain_ledger, JSON.stringify(header) + "\n", "utf8");
  }

  fs.appendFileSync(domain_ledger, JSON.stringify(record) + "\n", "utf8");
  return { ok: true, ledger: domain_ledger, appended: 1 };
}

/**
 * Append a batch of outcomes — single open, batched fsync. Use when emitting
 * 10+ outcomes from a single training run.
 */
export function appendBatch(opts) {
  const { domain_ledger, records, meta } = opts;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("appendBatch: records[] required");
  }
  for (let i = 0; i < records.length; i++) {
    try {
      validateOutcomeRecord(records[i]);
    } catch (e) {
      throw new Error(`appendBatch: record[${i}] invalid: ${e.message}`);
    }
  }
  const dir = path.dirname(domain_ledger);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const lines = [];
  if (!fs.existsSync(domain_ledger)) {
    lines.push(JSON.stringify({
      __meta: true,
      version: 1,
      source: meta?.source || "emit-outcome-template (batch)",
      domain_ledger,
      generated_at: new Date().toISOString(),
    }));
  }
  for (const r of records) lines.push(JSON.stringify(r));
  fs.appendFileSync(domain_ledger, lines.join("\n") + "\n", "utf8");
  return { ok: true, ledger: domain_ledger, appended: records.length };
}

// ============================================================================
// CLI — `node emit-outcome-template.mjs --domain=lathe --estimated=10 --actual=12 --unit=min`
// ============================================================================

function parseCliArgs(argv) {
  const args = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === __filename;
}

if (isMain()) {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args.category) {
    process.stderr.write(
      "Usage: emit-outcome-template.mjs --category=lathe --domain=time \\\n" +
      "       --estimated=10 --actual=12 --unit=min [--shop_id=jm-die] [--s_of_x=0.92]\n" +
      "       [--ledger=state/shared/training/<domain>-outcomes.jsonl]\n",
    );
    process.exit(2);
  }
  const record = {
    observed_at: new Date().toISOString(),
    shop_id: args.shop_id || "jm-die",
    category: args.category,
    domain: args.domain || "time",
    estimated: Number(args.estimated),
    actual: Number(args.actual),
    unit: args.unit || "min",
    ...(args.s_of_x !== undefined ? { s_of_x: Number(args.s_of_x) } : {}),
    ...(args.evidence_id ? { evidence_id: args.evidence_id } : {}),
  };
  const ledger = args.ledger || `state/shared/training/${args.category}-outcomes.jsonl`;
  const result = appendOutcome({ domain_ledger: ledger, record });
  process.stdout.write(JSON.stringify(result) + "\n");
}
