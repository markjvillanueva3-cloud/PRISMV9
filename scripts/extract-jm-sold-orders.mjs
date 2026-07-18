#!/usr/bin/env node
/**
 * extract-jm-sold-orders.mjs — VENDOR-NETWORK-MS0/U-VDN-JM-ORDERS
 *
 * Mine JM's OUTBOUND sold-order pricing from the Docustrata "JMD Orders Closed"
 * PDFs (customer POs to J.M. Die — JM is the vendor). This is the real
 * quote-vs-actual / outbound-revenue data the quoting galaxy's iter59 data-ceiling
 * has lacked (DocuStrata was inbound-only). See MEMORY.md §9.
 *
 * R12 HONESTY: these are SCANNED POs with a noisy OCR text layer. Measured coverage
 * (250-order batch): ~56% price-table, ~64% qty, ~32% PO#, ~2% quote-ref. So this is
 * a BEST-EFFORT text-layer parse with a per-record confidence score — NOT a clean
 * dataset. The unrecoverable fraction needs the xray OCR pipeline (cross-galaxy).
 * Never feed a low-confidence price into a live quote (charlie soul: no dressed-up data).
 *
 * Input: a cache JSONL of {file, text} (one per order) produced by pypdf.
 * Output: state/shared/quoting/jm-sold-orders.{json,md} — records + coverage stats.
 *
 * Pure exports (unit-tested): parsePoNumber, parseQuoteRef, parsePriceFigures,
 * parseLineItems, scoreOrderConfidence, buildSoldOrderProfile.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism-slot-charlie";
const CACHE = join(PRISM_ROOT, "state/shared/quoting/.cache/jm-orders-batch.jsonl");
const OUT_DIR = join(PRISM_ROOT, "state/shared/quoting");
const MONEY = /\$?\d{1,3}(?:,\d{3})*\.\d{2,4}\b/g; // 1.874, 12,500.00, $3.50

/** JM's PO-number token ("M 59007" / "P12345"). Returns normalized (no space) or null. */
export function parsePoNumber(text) {
  const t = String(text || "");
  const m = t.match(/\b([MP])\s?(\d{4,6})\b/);
  return m ? `${m[1]}${m[2]}` : null;
}

/** Referenced quote id ("quote#10/18/17"). Returns the ref or null. */
export function parseQuoteRef(text) {
  const m = String(text || "").match(/quote\s*#?\s*([\w./\-]{2,})/i);
  return m ? m[1].replace(/[.\s]+$/, "") : null;
}

/** All dollar/decimal figures as numbers (deduped order preserved). */
export function parsePriceFigures(text) {
  const out = [];
  for (const m of String(text || "").matchAll(MONEY)) {
    const n = Number(m[0].replace(/[$,]/g, ""));
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

/**
 * Best-effort price line-items: a leading qty (N or N.00) followed later in the line
 * by a unit price and an ext price. OCR-noisy → low yield by design. Pure.
 * Returns [{qty, unit_price, ext_price}], only rows where ext ≈ qty*unit within 5%.
 */
export function parseLineItems(text) {
  const items = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const qm = line.match(/^\s*(\d{1,4}(?:\.\d{1,2})?)\s+/); // leading quantity
    if (!qm) continue;
    const qty = Number(qm[1]);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const nums = [];
    for (const m of line.matchAll(MONEY)) nums.push(Number(m[0].replace(/[$,]/g, "")));
    if (nums.length < 2) continue;
    // take the last two money figures as (unit, ext); accept if ext ≈ qty*unit (±5%)
    const ext = nums[nums.length - 1];
    const unit = nums[nums.length - 2];
    if (unit > 0 && ext > 0) {
      const expect = qty * unit;
      if (expect > 0 && Math.abs(ext - expect) / expect <= 0.05) {
        items.push({ qty, unit_price: unit, ext_price: ext });
      }
    }
  }
  return items;
}

/** Confidence in the parse: high (po + verified line-item), medium (price table OR figures), low. Pure. */
export function scoreOrderConfidence({ poNumber, lineItems, priceFigures, hasPriceTable }) {
  if (poNumber && lineItems && lineItems.length >= 1) return "high";
  if (hasPriceTable && ((lineItems && lineItems.length) || (priceFigures && priceFigures.length >= 2))) return "medium";
  if ((priceFigures && priceFigures.length >= 1) || poNumber) return "low";
  return "none";
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

/** Build the sold-order profile from cached {file,text} rows. Pure. */
export function buildSoldOrderProfile(rows) {
  const records = [];
  const byConf = { high: 0, medium: 0, low: 0, none: 0 };
  let withVerifiedLineItems = 0;
  let confirmedRevenue = 0; // sum of verified ext_price (high/medium only)
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row.text !== "string") continue;
    const t = row.text;
    const poNumber = parsePoNumber(t);
    const quoteRef = parseQuoteRef(t);
    const lineItems = parseLineItems(t);
    const priceFigures = parsePriceFigures(t);
    const hasPriceTable = /unit\s*price|ext\.?\s*price/i.test(t);
    const confidence = scoreOrderConfidence({ poNumber, lineItems, priceFigures, hasPriceTable });
    byConf[confidence] = (byConf[confidence] || 0) + 1;
    const orderExt = lineItems.reduce((s, li) => s + (li.ext_price || 0), 0);
    if (lineItems.length) withVerifiedLineItems++;
    if ((confidence === "high" || confidence === "medium") && orderExt > 0) confirmedRevenue += orderExt;
    records.push({
      file: row.file || null,
      po_number: poNumber,
      quote_ref: quoteRef,
      line_items: lineItems,
      order_ext_total: round2(orderExt),
      confidence,
    });
  }
  records.sort((a, b) => b.order_ext_total - a.order_ext_total);
  return {
    schemaVersion: "1.0.0",
    source: "Docustrata/JMD Orders Closed (customer POs to J.M. Die — outbound sold orders)",
    advisoryOnly: true,
    mustHumanVerify: true,
    caveat: "Best-effort parse of a NOISY OCR text layer. Only high/medium-confidence records carry usable pricing; low/none need the xray OCR pipeline. Never feed low-confidence prices into a live quote.",
    ordersProcessed: records.length,
    byConfidence: byConf,
    ordersWithVerifiedLineItems: withVerifiedLineItems,
    confirmedExtRevenue: round2(confirmedRevenue),
    records: records.slice(0, 500), // cap the embedded list; stats cover all
  };
}

export function renderSoldOrderMd(p, iso) {
  const L = [];
  L.push("# JM-SOLD-ORDERS — outbound pricing mined from JMD Orders Closed (customer POs to J.M. Die)");
  L.push("");
  L.push(`> Generated ${iso} · source: \`${p.source}\` · owner: slot:charlie · **advisory, must-human-verify, OCR-noisy**.`);
  L.push(`> ${p.caveat}`);
  L.push("");
  L.push(`- **${p.ordersProcessed}** orders processed · **${p.ordersWithVerifiedLineItems}** with verified line-items · **$${p.confirmedExtRevenue.toLocaleString()}** confirmed ext-revenue (high/medium only)`);
  L.push("");
  L.push("## Confidence distribution");
  L.push("| Confidence | Orders | Meaning |");
  L.push("|------------|-------:|---------|");
  L.push(`| high | ${p.byConfidence.high || 0} | PO# + verified qty×unit=ext line-item |`);
  L.push(`| medium | ${p.byConfidence.medium || 0} | price table + figures, line-item unverified |`);
  L.push(`| low | ${p.byConfidence.low || 0} | a PO# or stray figure only |`);
  L.push(`| none | ${p.byConfidence.none || 0} | nothing recoverable from text layer → needs xray OCR |`);
  L.push("");
  L.push("## Top sold orders by ext-total (high/medium confidence)");
  L.push("| PO# | quote ref | line-items | ext total |");
  L.push("|-----|-----------|-----------:|----------:|");
  for (const r of p.records.filter((x) => x.confidence === "high" || x.confidence === "medium").slice(0, 25)) {
    L.push(`| ${r.po_number || "—"} | ${r.quote_ref || "—"} | ${r.line_items.length} | $${r.order_ext_total.toLocaleString()} |`);
  }
  L.push("");
  L.push("## Next step (R12)");
  L.push("Full + reliable extraction (esp. the 21,515 scanned JMD Sales Orders + the low/none fraction here) needs the **xray blueprint-vision OCR pipeline** — a cross-galaxy handoff, not a charlie text-layer parse. This profile covers the text-recoverable subset only.");
  return L.join("\n");
}

function nowIso() { return new Date().toISOString(); }

function loadJsonl(path) {
  const out = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try { out.push(JSON.parse(s)); } catch { /* skip */ }
  }
  return out;
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--cache") args.cache = argv[++i];
    else if (argv[i] === "--out-dir") args.outDir = argv[++i];
  }
  const cache = args.cache || CACHE;
  if (!existsSync(cache)) {
    console.error(`FAIL-LOUD: order text cache not found at ${cache}. Extract a batch with pypdf first (one {file,text} JSONL per order).`);
    return 3;
  }
  const rows = loadJsonl(cache);
  if (!rows.length) { console.error("FAIL-LOUD: cache empty"); return 4; }
  const profile = buildSoldOrderProfile(rows);
  const outDir = args.outDir || OUT_DIR;
  mkdirSync(outDir, { recursive: true });
  const iso = nowIso();
  writeFileSync(join(outDir, "jm-sold-orders.json"), JSON.stringify({ ...profile, generatedAt: iso }, null, 2));
  writeFileSync(join(outDir, "JM-SOLD-ORDERS.md"), renderSoldOrderMd(profile, iso));
  const c = profile.byConfidence;
  console.log(`[jm-sold-orders] ${profile.ordersProcessed} orders · conf {high:${c.high||0},medium:${c.medium||0},low:${c.low||0},none:${c.none||0}} · ${profile.ordersWithVerifiedLineItems} w/line-items · $${profile.confirmedExtRevenue.toLocaleString()} confirmed`);
  console.log(`  → ${join(outDir, "jm-sold-orders.json")}`);
  return 0;
}

const invokedDirectly = (() => {
  try { return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
})();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
