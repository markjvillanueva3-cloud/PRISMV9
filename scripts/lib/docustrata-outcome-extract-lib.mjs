// docustrata-outcome-extract-lib.mjs -- pure core for extract-docustrata-outcomes.
//
// Pass-1 row classification (QUOTE/SALES_ORDER -> predicted; CLOSED_ORDER/INVOICE ->
// actual) + Pass-2 quote<->actual pairing. Extracted from the script for testability
// (R9) and to host U-QP-DOCTYPE-FIELD-MINING per-doc-type extractors next.
//
// U-QP-CLOSEDORDER-ROUTING-FIX (slot:charlie 2026-06-12): the pair-killing bug --
// CLOSED_ORDER rows (the settled, credential-free ACTUAL price; ~35% of the 12,761 JM
// "Orders Closed" PDFs carry $) were routed to the QUOTE bucket as a predicted price,
// so a settled order could never be the actual side of a (quoted,actual) pair. Pass-2
// only joined quotes<->invoices, and Docustrata holds only 5 INVOICE rows vs 12,773
// CLOSED_ORDER -> almost no pairs ever formed. CLOSED_ORDER is now an ACTUAL source.
//
// No inline shop-rate/margin constants (charlie soul). Pure -- no I/O.

export const MIN_ROLE_CONFIDENCE = 0.50;
export const PAIR_WINDOW_DAYS = 60;
export const MS_PER_DAY = 86400_000;
export const TARGET_ROLES = new Set(["SALES_ORDER", "CLOSED_ORDER", "INVOICE", "QUOTE"]);

// Roles whose $ is a PREDICTED/quoted price vs a settled ACTUAL price.
// NOTE: SALES_ORDER sits in the quote bucket for now -- it is mostly a $0 traveler;
// per-doc-type handling (skip-$ for travelers) is U-QP-DOCTYPE-FIELD-MINING. Do not
// "fix" it into the actual bucket prematurely -- a sales order is not a settled price.
export const QUOTE_ROLES = new Set(["QUOTE", "SALES_ORDER"]);
export const ACTUAL_ROLES = new Set(["CLOSED_ORDER", "INVOICE"]);

// --- Regex patterns ---------------------------------------------------------
export const RE_CUSTOMER = /\b(?:BILL\s*TO|SOLD\s*TO|CUSTOMER|SHIP\s*TO)\s*[:\-]?\s*([A-Z][A-Z0-9 ,\.&'\-]{2,40}?)(?=\s{2,}|\n|$)/i;
export const RE_PART = /\b(?:PART\s*[#:]|P\/N|ITEM\s*[#:]|REF|JOB\s*[#:])\s*([A-Z0-9\-\/_\.]{3,30})/i;
export const RE_DATE_US = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})\b/;
export const RE_DATE_ISO = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/;
export const RE_QUOTE_TOTAL = /\b(?:QUOTE\s*TOTAL|TOTAL\s*QUOTED?|EXTENDED\s*PRICE|SUBTOTAL)\s*[:\$]?\s*\$?\s*([0-9,]+\.?\d{0,2})/i;
export const RE_INVOICE_TOTAL = /\b(?:INVOICE\s*TOTAL|AMOUNT\s*DUE|GRAND\s*TOTAL|BALANCE\s*DUE|TOTAL)\s*[:\$]?\s*\$?\s*([0-9,]+\.?\d{0,2})/i;

export function parseUsd(raw) {
  if (!raw) return null;
  const n = Number(String(raw).replace(/[,$]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// --- U-QP-DOCTYPE-FIELD-MINING: real PO/order format miners -----------------
// The JM "Orders Closed" docs are PURCHASE ORDERS (customer -> JM Die the vendor),
// NOT invoices. They carry the settled price as per-line "Amount: $X" / "Unit Cost:
// $Y" line items + an "Order Number"/"PO Number", NOT an "INVOICE TOTAL:" line. The
// generic RE_INVOICE_TOTAL therefore misses them entirely. Built + tested against real
// samples (Elite Fasteners PO #28469, Elgin Fastener PO #134368).

// Order / PO / Job number -- the precise join key (customer|part can false-pair repeats).
// Capture an alphanumeric order id that CONTAINS at least one digit (lookahead),
// so "A-7741" / "28469" / "134368" all match but a stray word does not.
export const RE_ORDER_NUM = /\b(?:P\.?O\.?|PURCHASE\s*ORDER|ORDER|JOB)\s*(?:NUMBER|NO|#)\.?\s*[:#]?\s*((?=[A-Z0-9\-]*\d)[A-Z0-9][A-Z0-9\-]{2,})/i;

// A standalone dollar figure ($1,234.56 or $6.95000) anywhere in the text.
export const RE_DOLLAR = /\$\s*([0-9][0-9,]*(?:\.\d{1,5})?)/g;
// An explicitly-labeled order/grand total (strongest signal when present).
export const RE_LABELED_TOTAL = /\b(?:ORDER\s*TOTAL|GRAND\s*TOTAL|TOTAL\s*(?:AMOUNT|DUE)?|INVOICE\s*TOTAL|AMOUNT\s*DUE|BALANCE\s*DUE)\s*[:\-]?\s*\$?\s*([0-9][0-9,]*\.?\d{0,2})/ig;

/** All positive dollar amounts in a doc, descending. Pure. */
export function mineDollarAmounts(text) {
  if (typeof text !== "string") return [];
  const out = [];
  for (const m of text.matchAll(RE_DOLLAR)) {
    const v = parseUsd(m[1]);
    if (v != null) out.push(v);
  }
  return out.sort((a, b) => b - a);
}

/** Order / PO / Job number for the pairing join key. Pure. Returns string|null. */
export function mineOrderNumber(text) {
  if (typeof text !== "string") return null;
  const m = text.match(RE_ORDER_NUM);
  return m ? m[1].toUpperCase() : null;
}

// Part-number miner for the PO format. The label ("Part Number") often sits on its OWN
// line with the code on the NEXT line (e.g. "Quantity Part Number\n250-360LZBCAP"), and
// the generic RE_PART (label + same-line code) misses it or grabs a stray word ("use").
// A real JM part code CONTAINS a digit -- that filter rejects word-noise.
export const RE_PART_LABELED = /\b(?:PART\s*(?:NUMBER|NO|#)|P\/N|ITEM\s*(?:NUMBER|NO|#))\s*[:#]?\s*\n?\s*((?=[A-Z0-9\-\/\.]*\d)[A-Z0-9][A-Z0-9\-\/\.]{2,29})/i;
// JM in-house part codes are commonly "NNN-XXXX" with a LETTER suffix (e.g. 250-360LZBCAP).
// The letter lookahead is load-bearing: it rejects phone numbers (815-397-8848, all-digit
// NNN-NNN-NNNN) that the letterhead injects -- found polluting 6,718 real actuals at scale.
export const RE_PART_INLINE = /\b(\d{3}-(?=[A-Z0-9\-]*[A-Z])[A-Z0-9][A-Z0-9\-]{2,24})\b/;

/** Part number for the join key (PO-aware). Pure. Returns string|null. */
export function minePartNumber(text) {
  if (typeof text !== "string") return null;
  const labeled = text.match(RE_PART_LABELED);
  if (labeled) return labeled[1].toUpperCase();
  const inline = text.match(RE_PART_INLINE);
  if (inline) return inline[1].toUpperCase();
  const generic = text.match(RE_PART);
  // Generic RE_PART can grab a non-part word (e.g. "use"); require a digit to accept it.
  if (generic && /\d/.test(generic[1])) return generic[1].toUpperCase();
  return null;
}

/**
 * The settled ACTUAL order value from a PO/order doc. Pure. Strategy (best-first):
 *   1. an explicitly-labeled total (ORDER/GRAND/INVOICE TOTAL ...) -> highest confidence;
 *   2. else the MAX dollar amount on the page (the order total is the largest single $;
 *      unit costs + per-line extended amounts are all <= the total) -> medium confidence.
 * Returns { amount, method, confidence } or null when no $ is present.
 */
export function mineOrderTotal(text) {
  if (typeof text !== "string") return null;
  let labeledMax = null;
  for (const m of text.matchAll(RE_LABELED_TOTAL)) {
    const v = parseUsd(m[1]);
    if (v != null && (labeledMax == null || v > labeledMax)) labeledMax = v;
  }
  if (labeledMax != null) return { amount: labeledMax, method: "labeled-total", confidence: 0.9 };
  const all = mineDollarAmounts(text);
  if (all.length === 0) return null;
  // Max amount = the order total (unit costs + line extensions are all <= total).
  return { amount: all[0], method: "max-dollar", confidence: all.length >= 2 ? 0.6 : 0.4 };
}

export function parseDate(text) {
  if (typeof text !== "string") return null;
  const isoM = text.match(RE_DATE_ISO);
  if (isoM) return `${isoM[1]}-${isoM[2].padStart(2, "0")}-${isoM[3].padStart(2, "0")}`;
  const usM = text.match(RE_DATE_US);
  if (usM) {
    let year = usM[3];
    if (year.length === 2) year = (Number(year) < 50 ? "20" : "19") + year;
    return `${year}-${usM[1].padStart(2, "0")}-${usM[2].padStart(2, "0")}`;
  }
  return null;
}

export function normalizeCustomer(s) {
  if (!s) return null;
  return String(s)
    .toUpperCase()
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(INC|LLC|LTD|CORP|CORPORATION|COMPANY|CO|MFG|FASTENERS?)\b/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
}

/**
 * Classify one text-extracted record into a quote/actual bucket entry.
 * Pure -- no I/O. Returns:
 *   { ok:true, bucket:"quote"|"actual", key, fields, entry }  (priceable row)
 *   { ok:false, reason, bucket:null, fields? }                (filtered/no-$)
 */
export function classifyRow(rec, { minRoleConfidence = MIN_ROLE_CONFIDENCE } = {}) {
  const role = rec && rec.inferred_role;
  if (!TARGET_ROLES.has(role)) return { ok: false, reason: "role-not-targeted", bucket: null };
  if ((rec.role_confidence ?? 0) < minRoleConfidence) return { ok: false, reason: "low-role-confidence", bucket: null };
  const text = rec.extracted?.text ?? rec.text ?? rec.extracted_text ?? "";
  if (!text || text.length < 40) return { ok: false, reason: "no-text", bucket: null };

  const customer = normalizeCustomer(text.match(RE_CUSTOMER)?.[1]);
  const partMatch = minePartNumber(text); // PO-aware (label-on-own-line + NNN-XXXX + digit-gated)
  const date = parseDate(text);

  let confidence = 0.2;
  if (customer) confidence += 0.2;
  if (partMatch) confidence += 0.2;
  if (date) confidence += 0.2;

  const key = `${customer ?? ""}|${partMatch ?? ""}`;
  const fields = { customer, part_id: partMatch, date, hasCustomer: !!customer, hasPart: !!partMatch, hasDate: !!date };

  if (QUOTE_ROLES.has(role)) {
    const qAmt = parseUsd(text.match(RE_QUOTE_TOTAL)?.[1] ?? text.match(RE_INVOICE_TOTAL)?.[1]);
    if (qAmt) {
      confidence += 0.2;
      return { ok: true, bucket: "quote", key, fields, entry: { date, predicted_quote_usd: qAmt, confidence, source_id: rec.id, role, customer, part_id: partMatch } };
    }
    return { ok: false, reason: "no-amount", bucket: null, fields };
  }

  // ACTUAL side -- CLOSED_ORDER (settled PO price) + INVOICE are both ground-truth actuals.
  // U-QP-DOCTYPE-FIELD-MINING: real Orders-Closed POs carry $ as per-line "Amount: $X" /
  // "Unit Cost: $Y" + an "Order Number", NOT an "INVOICE TOTAL" line -- mineOrderTotal
  // (labeled-total else max-dollar) extracts them where the flat RE_INVOICE_TOTAL missed.
  if (ACTUAL_ROLES.has(role)) {
    const tot = mineOrderTotal(text);
    if (tot) {
      // Fold the mining method's reliability into confidence (labeled-total > max-dollar).
      const conf = Math.min(1, confidence + 0.2 * tot.confidence);
      const actual_source = role === "CLOSED_ORDER" ? "closed_order" : "invoice";
      return {
        ok: true, bucket: "actual", key, fields,
        entry: {
          date, actual_invoice_usd: tot.amount, actual_price_method: tot.method,
          order_number: mineOrderNumber(text), confidence: conf, source_id: rec.id,
          role, customer, part_id: partMatch, actual_source,
        },
      };
    }
    return { ok: false, reason: "no-amount", bucket: null, fields };
  }

  return { ok: false, reason: "unhandled-role", bucket: null, fields };
}

/**
 * Flatten the actuals map into standalone settled-price records. Pure.
 *
 * The closed loop's ground truth is the ACTUAL settled price (from Orders Closed POs).
 * Most actuals have NO matching document-quote (Quotes folder = drawings, ~8/374 carry
 * $), so quote<->actual pairing alone DISCARDS the bulk of real actuals. These
 * standalone actuals are matched against PRISM's OWN prediction downstream (the OODA
 * loop's predicted-vs-actual), so they MUST be emitted, not dropped. Keyed by
 * customer|part for the prediction join; carries order_number + provenance.
 */
export function collectStandaloneActuals(actualsByKey) {
  const out = [];
  for (const [key, list] of actualsByKey) {
    if (!Array.isArray(list)) continue;
    for (const a of list) {
      out.push({
        customer: a.customer ?? null,
        part_id: a.part_id ?? null,
        date: a.date ?? null,
        actual_invoice_usd: a.actual_invoice_usd,
        actual_source: a.actual_source ?? "invoice",
        actual_price_method: a.actual_price_method ?? null,
        order_number: a.order_number ?? null,
        extraction_confidence: a.confidence,
        source_id: a.source_id,
        join_key: key,
      });
    }
  }
  out.sort((x, y) => (y.extraction_confidence ?? 0) - (x.extraction_confidence ?? 0));
  return out;
}

/**
 * Pair each quote with the closest-in-time ACTUAL (invoice OR closed_order) that
 * FOLLOWS it within windowDays, on the same customer|part key. Pure -- no I/O.
 * Returns pairs sorted by extraction_confidence desc.
 */
export function pairQuotesToActuals(quotesByKey, actualsByKey, { windowDays = PAIR_WINDOW_DAYS } = {}) {
  const pairs = [];
  for (const [key, quotes] of quotesByKey) {
    if (!key.includes("|") || key === "|") continue; // skip empty keys
    const actuals = actualsByKey.get(key) ?? [];
    if (actuals.length === 0) continue;
    for (const q of quotes) {
      let best = null;
      let bestDelta = Infinity;
      for (const a of actuals) {
        if (!q.date || !a.date) continue;
        const dq = new Date(q.date).getTime();
        const da = new Date(a.date).getTime();
        if (!Number.isFinite(dq) || !Number.isFinite(da)) continue;
        if (da < dq) continue; // actual must follow the quote
        const delta = (da - dq) / MS_PER_DAY;
        if (delta <= windowDays && delta < bestDelta) {
          best = a;
          bestDelta = delta;
        }
      }
      if (!best) continue;
      pairs.push({
        quote_id: `OCR-${q.source_id}-${best.source_id}`,
        customer: q.customer,
        part_id: q.part_id,
        doc_date: q.date,
        predicted_quote_usd: q.predicted_quote_usd,
        actual_invoice_usd: best.actual_invoice_usd,
        actual_source: best.actual_source ?? "invoice",
        accepted: true,
        material: null,
        machine_class: null,
        observed_at: best.date,
        extraction_confidence: Math.min(1, (q.confidence + best.confidence) / 2),
        days_to_invoice: bestDelta,
        source_quote_id: q.source_id,
        source_invoice_id: best.source_id,
      });
    }
  }
  pairs.sort((a, b) => b.extraction_confidence - a.extraction_confidence);
  return pairs;
}
