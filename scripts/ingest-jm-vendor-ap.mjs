#!/usr/bin/env node
/**
 * ingest-jm-vendor-ap.mjs — JM Tool & Die Accounts-Payable → quoting cost-basis ingest (slot:charlie).
 *
 * Closes the COST half of the quoting data-ceiling (U-QP-ACCOUNTING-WIRE). The QUOTING-SYNERGY-MS0
 * data-ceiling note said JM's financials lived "in ERP/accounting", absent from the inbound-print
 * corpus. The operator handed over `Report_from_J.M._Tool_&_Die_LLC.pdf` — an 880-page QuickBooks
 * A/P report (~20,736 vendor bill line-items, 2014–2026) — i.e. JM's REAL input costs: outside
 * processes (weld/solder/braze/heat-treat/coat/grind/EDM), tooling/consumables, materials, overhead,
 * freight. This is the ground-truth cost basis the `should_cost` decomposition + the secondary-ops /
 * vendor-price / shop-utilities actions + the (wired) DocustrataAccountingBridgeEngine need.
 *
 * Pipeline:
 *   1. (optional) extract the PDF → raw text via pypdf (python). Pass --pdf to auto-extract, or --raw
 *      to parse an already-extracted text dump.
 *   2. parseLedger(rawText) → one structured record per transaction (vendor from the section header,
 *      type/date/num/qty/unit_cost/description parsed from the row).
 *   3. classifySpend(text) → one of: outside-process | material | tooling-consumable |
 *      overhead-utility | freight-shipping | inspection-quality | misc.
 *   4. buildVendorCostIndex(records) → per-vendor + per-category rollups (count, gross line_amount,
 *      unit-cost min/median/max, date range) — the quoting-consumable prior.
 *
 * Outputs (under state/shared/quoting/):
 *   - jm-vendor-ap-ledger.jsonl        (one record per bill line-item)
 *   - jm-vendor-cost-index.json        (rollups, knowledge-index-compatible entry schema)
 *   - JM-VENDOR-COST-INDEX.md          (human digest)
 *
 * R12 honesty: unit_cost is the QuickBooks "Cost" column (per-unit); line_amount = qty × unit_cost
 * (documented assumption — qty=1 rows, the majority of overhead lines, are exact regardless). Rows
 * whose cost rendered as "..." (Item Receipts, received-not-billed) are recorded with unit_cost=null
 * and EXCLUDED from spend totals — counts are surfaced, never silently dropped.
 *
 * Usage:
 *   node scripts/ingest-jm-vendor-ap.mjs --pdf "H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf"
 *   node scripts/ingest-jm-vendor-ap.mjs --raw <extracted.txt>
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const OUT_DIR = join(PRISM_ROOT, "state/shared/quoting");
const PDF_EXTRACT_TIMEOUT_MS = 600000; // pypdf over an 880-page report

// Transaction types, LONGEST-FIRST so "Credit Card Charge" matches before "Credit", "Bill Pmt" before "Bill".
const TXN_TYPES = [
  "Bill Pmt -Check", "Bill Pmt -CCard", "Credit Card Charge", "Credit Card Credit",
  "Item Receipt", "General Journal", "Sales Receipt", "Bill", "Credit", "Check", "Invoice", "Deposit",
];
// Types that REDUCE spend (vendor credits / refunds) — netted out of gross.
const CREDIT_TYPES = new Set(["Credit", "Credit Card Credit"]);

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
// A money/unit-cost token: requires a decimal point, ANY precision. QuickBooks prints currency at 2dp
// (11.03, 1,104.00, -50.00) but the per-unit Cost column carries full precision for material/subcontract
// ($/inch or $/lb: 1.7125, 4.24098). Requiring exactly 2dp silently dropped ~4,585 real material rows.
const COST_RE = /^\$?-?[\d,]+\.\d+$/;
const INT_RE = /^-?\d+$/;

/** Column-header line repeated on every page. Pure. */
export function isColumnHeader(line) {
  return /^\s*Type\s+Date\s+Num\b/.test(line);
}
/** "Total <VENDOR> <count>" subtotal line. Pure. */
export function isTotalLine(line) {
  return /^\s*Total\b/.test(line) || /^\s*TOTAL\b/.test(line);
}
/** First token(s) of a transaction row → the matched type, or null. Pure. */
export function matchTxnType(line) {
  const s = line.replace(/^\s+/, "");
  for (const t of TXN_TYPES) {
    if (s.startsWith(t + " ")) {
      // must be followed by a date to be a real txn row (guards against a memo that starts with "Bill ...")
      const after = s.slice(t.length + 1).trimStart();
      const tok = after.split(/\s+/)[0];
      if (DATE_RE.test(tok)) return t;
    }
  }
  return null;
}
/**
 * Is this a vendor section header? Pure.
 * A header is a non-empty line that is NOT a txn row, NOT a Total line, NOT the column header,
 * NOT pure page-furniture (page numbers / report title / date stamps).
 */
export function isVendorHeader(line) {
  const s = line.trim();
  if (!s) return false;
  if (isColumnHeader(s) || isTotalLine(s)) return false;
  if (matchTxnType(s)) return false;
  if (/^\d/.test(s)) return false;                       // starts with a digit → wrapped row / page num
  if (/^Page\b/i.test(s) || /^Accrual Basis/i.test(s)) return false;
  if (/\bAccounts Payable\b/i.test(s) && /\bDetail\b/i.test(s)) return false; // report title
  if (DATE_RE.test(s)) return false;
  // a header is mostly uppercase letters / company punctuation, no trailing money
  if (COST_RE.test(s.split(/\s+/).pop() || "")) return false;
  return /[A-Za-z]/.test(s);
}

/**
 * Parse the trailing "[...descr...] <qty> <unitCost>" of a row (everything after the Num).
 * Returns { qty, unitCost, descr } — unitCost null when the cost rendered as "..." (received-not-billed).
 * Pure.
 */
export function parseTrailingQtyCost(rest) {
  const toks = rest.trim().split(/\s+/).filter(Boolean);
  if (toks.length === 0) return { qty: null, unitCost: null, descr: "" };
  const last = toks[toks.length - 1];
  let unitCost = null, qty = null, cutAt = toks.length;
  if (COST_RE.test(last)) {
    unitCost = Number(last.replace(/[$,]/g, ""));
    cutAt = toks.length - 1;
    const prev = toks[toks.length - 2];
    if (prev != null && INT_RE.test(prev)) { qty = Number(prev); cutAt = toks.length - 2; }
  } else {
    // cost truncated ("...") — recover qty as the last integer token, cost stays null
    for (let i = toks.length - 1; i >= 0; i--) {
      if (INT_RE.test(toks[i])) { qty = Number(toks[i]); cutAt = i; break; }
    }
  }
  return { qty, unitCost, descr: toks.slice(0, cutAt).join(" ") };
}

const SPEND_RULES = [
  ["outside-process", /\b(weld|solder|silver\s*solder|braz|coat|tin\b|ticn|tial|plat|anodiz|anneal|harden|temper|heat\s*treat|metal\s*treat|metallurg|nitri|black\s*oxid|passivat|zinc|chrome|grind|edm|wire\s*edm|laser|water\s*?jet|deburr|tumbl|polish)/i],
  ["inspection-quality", /\b(calibrat|inspect|gage|gauge|cmm|micrometer|caliper|certif|metrolog)/i],
  ["tooling-consumable", /\b(tool\s*bit|insert|end\s*mill|drill|tap\b|reamer|borazon|diamond|pcd|carbide(?!\s*part)|collet|abrasive|grinding\s*wheel|cutter|fixture)/i],
  ["material", /\b(steel|h13|d2\b|a2\b|s7\b|m2\b|o1\b|cpm|4140|4340|stainless|alum|brass|copper|bronze|bar\s*stock|plate|tool\s*steel|round\s*stock|flat\s*stock|blank)/i],
  ["freight-shipping", /\b(ups\b|fedex|freight|shipping|postage|delivery|courier)/i],
  ["overhead-utility", /\b(telephone|phone|electric|gas\b|water|internet|maintenance|rent\b|lease|insurance|payroll|\btax\b|fee\b|software|license|subscription|utility|utilit|janitor|waste|disposal)/i],
];
/** Classify a spend description into a quoting cost category. Pure. */
export function classifySpend(text) {
  const t = String(text || "");
  // EDM electrode/graphite BLANKS are physical consumables JM buys (tooling) — not the EDM *service*.
  // This override beats the outside-process "edm" token, which would otherwise capture "EDM ELECTRODE".
  if (/\b(electrode|graphite)\b/i.test(t)) return "tooling-consumable";
  for (const [cat, re] of SPEND_RULES) if (re.test(t)) return cat;
  return "misc";
}

/** Parse the whole raw A/P text → { records[], stats }. Pure. */
export function parseLedger(rawText) {
  const lines = String(rawText || "").split(/\r?\n/);
  const records = [];
  let vendor = null;
  let nulls = 0, credits = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (isColumnHeader(line)) continue;
    if (isTotalLine(line)) continue;
    const type = matchTxnType(line);
    if (!type) {
      if (isVendorHeader(line)) vendor = line.trim();
      continue;
    }
    // txn row: <type> <date> <num> <rest>
    const s = line.replace(/^\s+/, "");
    const afterType = s.slice(type.length + 1).trimStart();
    const dateTok = afterType.split(/\s+/)[0];
    const afterDate = afterType.slice(dateTok.length).trimStart();
    const numTok = afterDate.split(/\s+/)[0] || "";
    const rest = afterDate.slice(numTok.length).trimStart();
    const { qty, unitCost, descr } = parseTrailingQtyCost(rest);
    const category = classifySpend(`${descr} ${vendor || ""}`);
    const isCredit = CREDIT_TYPES.has(type);
    if (unitCost == null) nulls++;
    if (isCredit) credits++;
    const lineAmount = unitCost != null && qty != null ? Math.round(unitCost * qty * 100) / 100 : null;
    records.push({
      vendor: vendor || "UNKNOWN", type, date: dateTok, num: numTok,
      description: descr, qty, unit_cost: unitCost,
      line_amount: lineAmount, is_credit: isCredit, category,
    });
  }
  return {
    records,
    stats: { total: records.length, nullCost: nulls, creditRows: credits, vendors: new Set(records.map((r) => r.vendor)).size },
  };
}

function median(nums) {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round(((a[m - 1] + a[m]) / 2) * 100) / 100;
}

/** Roll records up into per-vendor + per-category cost priors. Pure. */
export function buildVendorCostIndex(records) {
  const recs = Array.isArray(records) ? records : [];
  const byVendor = {}, byCategory = {};
  let grossSpend = 0, creditTotal = 0;
  for (const r of recs) {
    // Normalize to a positive magnitude; the sign is decided by is_credit (not by the PDF's printed
    // sign), so net = gross − credits is always ≤ gross regardless of how a refund was keyed.
    const amt = Math.abs(Number.isFinite(r.line_amount) ? r.line_amount : 0);
    if (r.is_credit) creditTotal += amt; else grossSpend += amt;
    const sign = r.is_credit ? -1 : 1;
    const v = (byVendor[r.vendor] ||= { count: 0, spend: 0, categories: {}, firstDate: r.date, lastDate: r.date });
    v.count++; v.spend = Math.round((v.spend + sign * amt) * 100) / 100;
    v.categories[r.category] = (v.categories[r.category] || 0) + 1;
    if (r.date && r.date < v.firstDate) v.firstDate = r.date;
    if (r.date && r.date > v.lastDate) v.lastDate = r.date;
    const c = (byCategory[r.category] ||= { count: 0, spend: 0, unitCosts: [], vendors: new Set() });
    c.count++; c.spend = Math.round((c.spend + sign * amt) * 100) / 100;
    if (Number.isFinite(r.unit_cost) && !r.is_credit) c.unitCosts.push(r.unit_cost);
    c.vendors.add(r.vendor);
  }
  const categories = {};
  for (const [cat, c] of Object.entries(byCategory)) {
    const u = c.unitCosts;
    categories[cat] = {
      count: c.count, spend: Math.round(c.spend * 100) / 100, vendorCount: c.vendors.size,
      unitCost: u.length ? { min: Math.min(...u), median: median(u), max: Math.max(...u), n: u.length } : null,
    };
  }
  return {
    schemaVersion: "1.0.0",
    totals: {
      records: recs.length,
      grossSpend: Math.round(grossSpend * 100) / 100,
      creditTotal: Math.round(creditTotal * 100) / 100,
      netSpend: Math.round((grossSpend - creditTotal) * 100) / 100,
      vendorCount: Object.keys(byVendor).length,
    },
    categories,
    vendors: byVendor,
  };
}

/** Render the cost index as a human digest. Pure. */
export function renderCostIndexMd(index, generatedAtIso) {
  const t = index.totals || {};
  const lines = [];
  lines.push("# JM-VENDOR-COST-INDEX — JM Tool & Die accounts-payable cost basis (quoting galaxy)");
  lines.push("");
  lines.push(`> Generated ${generatedAtIso} · source: \`H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf\` (880-page QuickBooks A/P) · owner: slot:charlie (quoting). Cost half of the data-ceiling fix (U-QP-ACCOUNTING-WIRE).`);
  lines.push("");
  lines.push(`**${t.records} line-items · ${t.vendorCount} vendors · gross spend $${(t.grossSpend ?? 0).toLocaleString()} · credits $${(t.creditTotal ?? 0).toLocaleString()} · net $${(t.netSpend ?? 0).toLocaleString()}**`);
  lines.push("");
  lines.push("## Spend by category (the quoting cost-basis priors)");
  lines.push("| category | line-items | net spend | vendors | unit-cost min / median / max |");
  lines.push("|----------|-----------:|----------:|--------:|------------------------------|");
  const cats = Object.entries(index.categories || {}).sort((a, b) => b[1].spend - a[1].spend);
  for (const [cat, c] of cats) {
    const uc = c.unitCost ? `$${c.unitCost.min} / $${c.unitCost.median} / $${c.unitCost.max} (n=${c.unitCost.n})` : "—";
    lines.push(`| ${cat} | ${c.count} | $${(c.spend ?? 0).toLocaleString()} | ${c.vendorCount} | ${uc} |`);
  }
  lines.push("");
  lines.push("## Top 25 vendors by net spend");
  lines.push("| vendor | line-items | net spend | top category | date range |");
  lines.push("|--------|-----------:|----------:|--------------|------------|");
  const vendors = Object.entries(index.vendors || {}).sort((a, b) => b[1].spend - a[1].spend).slice(0, 25);
  for (const [name, v] of vendors) {
    const topCat = Object.entries(v.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    lines.push(`| ${name} | ${v.count} | $${(v.spend ?? 0).toLocaleString()} | ${topCat} | ${v.firstDate}–${v.lastDate} |`);
  }
  lines.push("");
  lines.push("## How quoting consumes this");
  lines.push("- **should_cost decomposition** — outside-process + material + tooling unit-cost priors feed the per-stage cost model (no more synth-only guesses).");
  lines.push("- **`quoting_secondary_ops_price`** — outside-process category (weld/solder/braze/coat/heat-treat/grind/EDM) is the real secondary-ops price book.");
  lines.push("- **`vendor_realtime_price` / `DocustrataAccountingBridgeEngine`** — per-vendor spend history + date range = the vendor-price prior.");
  lines.push("- **`quoting_shop_utilities_cost` / `quoting_shop_electricity_cost`** — overhead-utility category sizes the real overhead burden.");
  lines.push("");
  lines.push("> R12: unit_cost = QuickBooks per-unit \"Cost\"; line_amount = qty × unit_cost. Item-Receipt rows (received-not-billed, cost rendered \"...\") recorded with null cost + excluded from spend.");
  return lines.join("\n");
}

/** Extract the PDF → raw text via pypdf (python). Returns the text. */
function extractPdfText(pdfPath) {
  const py = process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";
  const tmp = join(tmpdir(), "jm-vendor-ap-raw.txt");
  // Paths are passed via argv (sys.argv[1]=pdf, [2]=out) — NEVER string-interpolated into the python
  // source — so a path containing a quote/newline cannot break out of a literal and inject code.
  const code = [
    "import sys",
    "from pypdf import PdfReader",
    "r=PdfReader(sys.argv[1])",
    "open(sys.argv[2],'w',encoding='utf-8').write('\\n'.join((p.extract_text() or '') for p in r.pages))",
  ].join("\n");
  execFileSync(py, ["-c", code, pdfPath, tmp], { stdio: "inherit", timeout: PDF_EXTRACT_TIMEOUT_MS });
  return readFileSync(tmp, "utf8");
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--pdf") args.pdf = argv[++i];
    else if (argv[i] === "--raw") args.raw = argv[++i];
    else if (argv[i] === "--out-dir") args.outDir = argv[++i];
  }
  const outDir = args.outDir || OUT_DIR;
  let rawText;
  if (args.raw) rawText = readFileSync(args.raw, "utf8");
  else if (args.pdf) rawText = extractPdfText(args.pdf);
  else { console.error("usage: --pdf <pdf> | --raw <txt> [--out-dir <dir>]"); return 2; }

  const { records, stats } = parseLedger(rawText);
  if (records.length === 0) { console.error("FAIL-LOUD: parsed 0 records — check the raw extraction"); return 3; }
  const index = buildVendorCostIndex(records);
  const iso = new Date().toISOString().slice(0, 10);

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "jm-vendor-ap-ledger.jsonl"), records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  writeFileSync(join(outDir, "jm-vendor-cost-index.json"), JSON.stringify(index, null, 2));
  writeFileSync(join(outDir, "JM-VENDOR-COST-INDEX.md"), renderCostIndexMd(index, iso));

  console.log(`[ingest-jm-vendor-ap] ${stats.total} line-items · ${stats.vendors} vendors · ${stats.nullCost} null-cost (excluded) · ${stats.creditRows} credits`);
  console.log(`  gross $${index.totals.grossSpend.toLocaleString()} · net $${index.totals.netSpend.toLocaleString()}`);
  console.log(`  → ${join(outDir, "jm-vendor-ap-ledger.jsonl")}`);
  console.log(`  → ${join(outDir, "jm-vendor-cost-index.json")}`);
  console.log(`  → ${join(outDir, "JM-VENDOR-COST-INDEX.md")}`);
  return 0;
}

const invokedDirectly = (() => {
  try { return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
})();
if (invokedDirectly) { process.exit(main(process.argv.slice(2))); }
