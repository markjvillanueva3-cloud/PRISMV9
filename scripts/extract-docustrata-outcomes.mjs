#!/usr/bin/env node
/**
 * extract-docustrata-outcomes — stream Docustrata/.index/documents-text-extracted-v3.jsonl,
 * filter to outbound quote/invoice records, regex-parse fields, emit
 * CycleOutcome records for the closed-loop training corpus.
 *
 * QUOTING-SYNERGY-MS0/U-QP-OCR-OUTCOME-EXTRACT (slot:charlie iter58 2026-05-27).
 *
 * INPUT: H:/PRISM/Docustrata/.index/documents-text-extracted-v3.jsonl (58.9MB, 73,506 rows)
 *
 * FILTER: inferred_role in {SALES_ORDER, CLOSED_ORDER, INVOICE, QUOTE} AND
 *         role_confidence >= MIN_ROLE_CONFIDENCE (0.50) AND text non-empty
 *
 * PARSE per row (regex over text body):
 *   - customer       — "BILL TO"/"SOLD TO"/"CUSTOMER:" patterns
 *   - part_id        — "PART #"/"P/N"/"ITEM"/"REF" patterns
 *   - date           — MM/DD/YYYY or YYYY-MM-DD anywhere in text
 *   - predicted_quote_usd -- quote total ("QUOTE TOTAL:"/"TOTAL:" on QUOTE/SALES_ORDER rows)
 *   - actual_invoice_usd  -- settled total on the ACTUAL side: INVOICE *or* CLOSED_ORDER
 *     (U-QP-CLOSEDORDER-ROUTING-FIX -- a settled CLOSED_ORDER is the actual, not a quote)
 *
 * PAIR quote <-> actual (invoice or closed_order) by (customer, part_id) match
 *   within PAIR_WINDOW_DAYS (60); the actual must FOLLOW the quote.
 *
 * EMIT to state/shared/quoting/docustrata-extracted.jsonl, one row per pair.
 * Permissive — rows with <5 fields parsed still emitted with confidence score
 * (calibration weights by confidence).
 *
 * USAGE:
 *   node scripts/extract-docustrata-outcomes.mjs [--limit=N] [--input=PATH] [--out=PATH]
 */

import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
// U-QP-CLOSEDORDER-ROUTING-FIX: pure classify/pair core extracted to a tested lib.
// classifyRow now routes CLOSED_ORDER to the ACTUAL bucket (was mis-filed as a quote).
import {
  classifyRow,
  pairQuotesToActuals,
  collectStandaloneActuals,
  MIN_ROLE_CONFIDENCE,
  TARGET_ROLES,
} from "./lib/docustrata-outcome-extract-lib.mjs";

const DEFAULT_INPUT = resolve("H:/PRISM/Docustrata/.index/documents-text-extracted-v3.jsonl");
const DEFAULT_OUT = resolve("H:/PRISM/state/shared/quoting/docustrata-extracted.jsonl");

function parseArgs() {
  const out = { input: DEFAULT_INPUT, outPath: DEFAULT_OUT, limit: Infinity };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--input=")) out.input = resolve(a.slice("--input=".length));
    else if (a.startsWith("--out=")) out.outPath = resolve(a.slice("--out=".length));
    else if (a.startsWith("--limit=")) out.limit = Number(a.slice("--limit=".length));
  }
  return out;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  console.log(`[extract] streaming ${args.input}`);
  console.log(`[extract] target roles: ${[...TARGET_ROLES].join(", ")} · min role-conf: ${MIN_ROLE_CONFIDENCE}`);

  const stream = createReadStream(args.input, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  // Pass 1 -- classify each row into the QUOTE (predicted) or ACTUAL bucket.
  // U-QP-CLOSEDORDER-ROUTING-FIX: CLOSED_ORDER is an ACTUAL source (was a quote).
  const quotesByKey = new Map();  // "CUSTOMER|PART_ID" -> [{date, predicted_quote_usd, ...}]
  const actualsByKey = new Map(); // "CUSTOMER|PART_ID" -> [{date, actual_invoice_usd, actual_source, ...}]
  let total = 0;
  let qualified = 0;
  let withQuoteAmt = 0;
  let withActualAmt = 0;
  let withCustomer = 0;
  let withPart = 0;
  let withDate = 0;

  for await (const line of rl) {
    if (total >= args.limit) break;
    if (!line.trim()) continue;
    total += 1;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const c = classifyRow(rec);
    // qualified = rows that passed the role + confidence + text gates (reached field parse).
    if (c.reason === "role-not-targeted" || c.reason === "low-role-confidence" || c.reason === "no-text") continue;
    qualified += 1;
    if (c.fields) {
      if (c.fields.hasCustomer) withCustomer += 1;
      if (c.fields.hasPart) withPart += 1;
      if (c.fields.hasDate) withDate += 1;
    }
    if (!c.ok) continue; // priceable role but no $ found
    const bucket = c.bucket === "quote" ? quotesByKey : actualsByKey;
    const list = bucket.get(c.key) ?? [];
    list.push(c.entry);
    bucket.set(c.key, list);
    if (c.bucket === "quote") withQuoteAmt += 1; else withActualAmt += 1;
  }

  console.log(`[extract] scanned ${total} rows  qualified ${qualified}  field-coverage:`);
  console.log(`            customer ${withCustomer}  part ${withPart}  date ${withDate}  quote-amt ${withQuoteAmt}  actual-amt ${withActualAmt}`);
  console.log(`[extract] candidate quotes ${quotesByKey.size} keys  candidate actuals ${actualsByKey.size} keys`);

  // Pass 2 -- pair quote <-> actual (invoice OR closed_order) within PAIR_WINDOW_DAYS.
  const pairs = pairQuotesToActuals(quotesByKey, actualsByKey);
  console.log(`[extract] paired quote<->actual rows: ${pairs.length}`);

  // U-QP-EMIT-STANDALONE-ACTUALS: most real actuals (settled Orders-Closed prices) have NO
  // matching document-quote (Quotes folder = drawings) -- emit them standalone for the OODA
  // predicted-vs-actual match downstream instead of discarding the unpaired set.
  const standaloneActuals = collectStandaloneActuals(actualsByKey);
  console.log(`[extract] standalone actuals (settled prices, for prediction-match): ${standaloneActuals.length}`);

  // Write JSONL output + a wrapping {invoices:[]} for back-compat with iter49 driver
  await fs.mkdir(resolve(args.outPath, ".."), { recursive: true });
  await fs.writeFile(
    args.outPath,
    JSON.stringify({
      schema_version: "1.0.0",
      generated_iso: new Date().toISOString(),
      source: "docustrata-text-extracted-v3-ocr-pass",
      note: "iter58 permissive extractor — confidence-scored. Calibration should weight by extraction_confidence.",
      invoices: pairs.map((p) => ({
        date: p.doc_date,
        customer: p.customer,
        part_id: p.part_id,
        material: p.material,
        predicted_quote_usd: p.predicted_quote_usd,
        actual_invoice_usd: p.actual_invoice_usd,
        actual_source: p.actual_source,
        quantity: 1,
        extraction_confidence: p.extraction_confidence,
        days_to_invoice: p.days_to_invoice,
        source_quote_id: p.source_quote_id,
        source_invoice_id: p.source_invoice_id,
      })),
      // Standalone settled actuals (no document-quote) -- consumed by the train-cycle for
      // PRISM-prediction-vs-actual matching. Additive key; legacy consumers ignore it.
      actuals: standaloneActuals,
    }, null, 2),
    "utf8",
  );
  console.log(`[extract] wrote ${pairs.length} paired records → ${args.outPath}`);

  // High-confidence subset (≥0.6) for fast CoV-gate clearance test
  const highConf = pairs.filter((p) => p.extraction_confidence >= 0.6);
  console.log(`[extract] high-confidence subset (≥0.6): ${highConf.length}`);
}

main().catch((e) => {
  console.error(`[extract] FATAL: ${e.message}`);
  console.error(e.stack);
  process.exit(2);
});
