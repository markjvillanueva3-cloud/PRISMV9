// jm-corpus-vault-lib.mjs -- pure core for the JM-documents -> Obsidian-vault recall bridge.
//
// Turns the real settled-price actuals (orders-closed-actuals.jsonl, $355M / 6,718 JM Orders-Closed
// POs) into PER-CUSTOMER Obsidian notes so the quoting AI can SEMANTICALLY RECALL "what have we
// settled for this customer / part?" when quoting a new job. This is the RAG layer for quoting:
// flat JSONL has no semantic search or backlink graph; the vault does.
//
// Why the actuals (not jm-customers.jsonl): the file-inventory DB's customer_key is garbled
// folder-derived text that joins to the actuals at only ~27%; the actuals carry clean extracted
// customer names + real prices -- the quoting-critical dimension. (charlie soul: NEVER an aggressive
// customer-name filter -- grouping here is conservative exact-normalized string, no fuzzy merge.)
//
// Pure + injectable. No inline shop-rate/margin constants (only generic distribution stats).

// Data-quality outlier bound (NOT a shop-rate/margin pricing constant -- it is a parse-error
// rejection threshold). A single die-shop PO line/total above this is almost certainly an OCR
// extraction error (observed live: "BIRMINGHAM" $130.6M / 5 parts, "MULTITCCH" $14.9M / 1 part --
// non-physical). Generous default keeps all plausible large orders; configurable via the CLI.
export const DEFAULT_MAX_PLAUSIBLE_USD = 2_000_000;
// Lower data-quality floor: a die-shop part/PO settled BELOW this is a non-physical OCR/unit error
// (observed live: $0.002, $0.03 "settled prices"). Generous (keeps cheap real parts); configurable.
export const DEFAULT_MIN_PLAUSIBLE_USD = 1;
// Plausible calendar window for a settled-PO date. OCR yields impossible years (4611, 2921) that,
// because notes sort newest-first, dominate the top of the recall table -- so an out-of-window date
// is NULLED (the price row is kept; only the corrupt date is dropped). Window is generous.
const MIN_YEAR = 1990, MAX_YEAR = 2031;

// Form-label / non-customer artifacts the OCR mis-extracts as a "customer". This REJECTS non-customers
// (form boilerplate) -- it is NOT the aggressive REAL-customer-name merge the charlie soul refuses
// (a real garbled name like "MULTITCCH" is KEPT). Detection: exact known labels + form-phrase tokens
// that do not occur in real die-shop customer names.
const FORM_LABEL_EXACT = new Set([
  "SELECTED LOCATION", "SHIP TO", "SHIPTO", "I SHIPTO", "BILL TO", "BILLTO", "QUANTITY", "DRAWING",
  "DESCRIPTION", "ADDRESS", "VENDOR", "PURCHASE ORDER", "PO NUMBER", "ORDER NUMBER", "ORDER DATE",
  "DUE DATE", "LI NAME", "UNKNOWN", "N A", "NA", "NO", "NONE", "SAME", "TBD",
]);
// Form-phrase / form-field tokens that never appear in a real die-shop customer name (boilerplate
// fragments + generic form-field words). Word-boundary so multi-token leaks ("ADDRESS 1",
// "ADDRESS VENDOR ADDRESS") are caught, not just exact single-token labels.
const FORM_PHRASE_RE = /\b(ADDRESS|VENDOR|QUANTITY|DESCRIPTION|SHIP\s?TO|BILL\s?TO|PO\s?BOX|ORDER\s?DATE|LI\s?NAME|L?INE\s?DESC|PROPERTY\s?OF|REGULATORY|AUTHORITIES|THIS\s?DRAWING|DRAWING\s?IS)\b/;

/** True if the normalized name is an OCR form-label / boilerplate fragment, not a real customer. Pure. */
export function isFormLabelCustomer(normName) {
  if (FORM_LABEL_EXACT.has(normName)) return true;
  return FORM_PHRASE_RE.test(normName);
}

/** Return the date string if its year is in the plausible window, else "" (corrupt OCR date). Pure. */
export function sanitizeDate(s) {
  const str = typeof s === "string" ? s.trim() : "";
  const m = str.match(/^(\d{4})/);
  const y = m ? Number(m[1]) : NaN;
  return Number.isFinite(y) && y >= MIN_YEAR && y <= MAX_YEAR ? str : "";
}

/** Conservative customer-name normalizer: uppercase + collapse non-alnum to single space + trim.
 *  NOT a fuzzy merge (soul refuse: non-conservative-customer-name-filter) -- only case/whitespace. */
export function normCustomer(s) {
  return (typeof s === "string" ? s : "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Filesystem-safe slug for a customer note filename. Stable + collision-resistant (keeps alnum,
 *  dash-joins, lowercases, caps length, appends a short deterministic suffix from the full name). */
export function slugifyCustomer(name) {
  const base = (typeof name === "string" ? name : "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  // deterministic 4-char suffix (djb2) so two names that slug-collide stay distinct files
  let h = 5381;
  for (let i = 0; i < (name || "").length; i++) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
  const suffix = h.toString(36).slice(0, 4);
  return (base || "customer") + "-" + suffix;
}

/** Median of a sorted numeric array. Pure. */
function median(sorted) {
  const n = sorted.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Group settled actuals by customer (conservative exact-normalized name). Pure.
 * Drops rows below minConfidence, with non-positive/NaN price, or with an empty customer.
 * @param {Array} actuals  records: {customer, part_id, date, actual_invoice_usd, order_number, extraction_confidence}
 * @param {{minConfidence?: number, maxPlausibleUsd?: number, excluded?: object}} [opts]
 *        excluded (if passed) is mutated with drop counts {lowConf, badPrice, outlierPrice, formLabel, emptyCustomer}.
 * @returns {Map<string,{display:string, rows:Array}>} keyed by normalized customer
 */
export function groupActualsByCustomer(actuals, opts = {}) {
  const minConf = Number.isFinite(opts.minConfidence) ? opts.minConfidence : 0;
  const maxUsd = Number.isFinite(opts.maxPlausibleUsd) ? opts.maxPlausibleUsd : DEFAULT_MAX_PLAUSIBLE_USD;
  const minUsd = Number.isFinite(opts.minPlausibleUsd) ? opts.minPlausibleUsd : DEFAULT_MIN_PLAUSIBLE_USD;
  const ex = opts.excluded && typeof opts.excluded === "object" ? opts.excluded : {};
  ex.lowConf = 0; ex.badPrice = 0; ex.outlierPrice = 0; ex.subDollar = 0; ex.formLabel = 0; ex.emptyCustomer = 0; ex.nulledDate = 0;
  const out = new Map();
  for (const a of Array.isArray(actuals) ? actuals : []) {
    const conf = Number(a?.extraction_confidence ?? 0);
    if (conf < minConf) { ex.lowConf++; continue; }
    const price = Number(a?.actual_invoice_usd);
    if (!Number.isFinite(price) || price <= 0) { ex.badPrice++; continue; }
    if (price > maxUsd) { ex.outlierPrice++; continue; }  // non-physical high -> extraction error
    if (price < minUsd) { ex.subDollar++; continue; }      // non-physical low (sub-dollar OCR/unit error)
    const key = normCustomer(a?.customer);
    if (!key) { ex.emptyCustomer++; continue; }
    if (isFormLabelCustomer(key)) { ex.formLabel++; continue; }  // OCR form artifact, not a customer
    const date = sanitizeDate(a?.date);  // null out impossible-year OCR dates (keep the price row)
    if (!date && a?.date) ex.nulledDate++;
    if (!out.has(key)) out.set(key, { display: String(a.customer).trim(), rows: [] });
    out.get(key).rows.push({
      part: String(a?.part_id ?? "").trim() || "(unknown)",
      price,
      order: String(a?.order_number ?? "").trim() || "",
      date,
      conf,
    });
  }
  return out;
}

/** Settled-price stats for one customer's rows. Pure. Returns null on empty. */
export function customerPriceStats(rows) {
  const prices = (Array.isArray(rows) ? rows : []).map((r) => r.price).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (prices.length === 0) return null;
  const total = prices.reduce((s, v) => s + v, 0);
  const parts = new Set((rows || []).map((r) => r.part).filter((p) => p && p !== "(unknown)"));
  const orders = new Set((rows || []).map((r) => r.order).filter(Boolean));
  const dates = (rows || []).map((r) => r.date).filter(Boolean).sort();
  return {
    record_count: rows.length,
    part_count: parts.size,
    order_count: orders.size,
    settled_total_usd: Math.round(total * 100) / 100,
    price_median_usd: median(prices),
    price_min_usd: prices[0],
    price_max_usd: prices[prices.length - 1],
    date_first: dates[0] || null,
    date_last: dates[dates.length - 1] || null,
  };
}

const USD = (v) => (typeof v === "number" ? "$" + Math.round(v).toLocaleString("en-US") : "n/a");

/**
 * Render one customer's Obsidian note (markdown w/ frontmatter + wikilinks). Pure.
 * Caps the parts table at `maxRows` and states the cap explicitly (R12: no silent truncation).
 */
export function renderCustomerNote(display, rows, stats, opts = {}) {
  const maxRows = Number.isFinite(opts.maxRows) ? opts.maxRows : 60;
  const slug = slugifyCustomer(display);
  const sorted = [...rows].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.price - a.price);
  const shown = sorted.slice(0, maxRows);
  const capped = sorted.length > maxRows;
  const fm = [
    "---",
    `name: jm_corpus_customer_${slug}`,
    `description: JM Die settled-price recall for ${display} -- ${stats.part_count} parts, ${stats.order_count} orders, ${USD(stats.settled_total_usd)} settled (quoting recall)`,
    "type: reference",
    "metadata:",
    "  node_type: jm-corpus-customer",
    `  customer: ${JSON.stringify(display)}`,
    `  part_count: ${stats.part_count}`,
    `  order_count: ${stats.order_count}`,
    `  settled_total_usd: ${stats.settled_total_usd}`,
    `  price_median_usd: ${stats.price_median_usd}`,
    `  date_range: ${stats.date_first || "?"}..${stats.date_last || "?"}`,
    "  tags: [jm-corpus, quoting, customer, settled-price]",
    "---",
    "",
  ].join("\n");
  const head =
    `# ${display} -- JM Die settled-price history\n\n` +
    `**Quoting recall:** when quoting a new part for **${display}**, these are the REAL settled prices on record ` +
    `(Orders-Closed POs, extraction_confidence >= ${opts.minConfidence ?? 0.6}). ADVISORY recall, NOT a quote -- ` +
    `apply the live margin floor + calibration.\n\n` +
    `- Parts on record: **${stats.part_count}** | Orders: **${stats.order_count}** | Records: ${stats.record_count}\n` +
    `- Settled total: **${USD(stats.settled_total_usd)}** | per-record median **${USD(stats.price_median_usd)}** ` +
    `(range ${USD(stats.price_min_usd)}..${USD(stats.price_max_usd)})\n` +
    `- Date range: ${stats.date_first || "?"} .. ${stats.date_last || "?"}\n\n`;
  const table =
    `## Parts + settled prices${capped ? ` (newest ${maxRows} of ${sorted.length})` : ""}\n\n` +
    `| Part | Settled $ | Order # | Date |\n|---|---:|---|---|\n` +
    shown.map((r) => `| ${r.part} | ${USD(r.price)} | ${r.order || "-"} | ${r.date || "-"} |`).join("\n") + "\n";
  const foot =
    `\n*Source: \`state/shared/quoting/orders-closed-actuals.jsonl\` ($355M / 6,718 real JM Orders-Closed actuals). ` +
    `Generated by \`jm-corpus-to-vault.mjs\`. See [[reference_charlie_docustrata_corpus_price_map_2026_06_13]].*\n`;
  return { slug, content: fm + head + table + foot };
}
