#!/usr/bin/env node
/**
 * compile-jm-tooling-stock.mjs — compile JM Die's TOOLING + STOCK/MATERIAL catalogs from the
 * QuickBooks "Purchases by Vendor Detail" report (slot:juliett, database-expansion → hotel ERP).
 *
 * Complements slot:hotel's `ingest-docustrata-jm-report.mjs` (which built the vendor-master +
 * AP summary: 174 vendors / 20,550 bill-lines / coarse byItemCategory). This adds the INVENTORY
 * dimension the operator asked for: the actual tooling items + the raw material stock (grades,
 * forms, sizes) JM Die buys — for hotel's ERP inventory / reorder-point side.
 *
 * Source: mcp-server/data/jm-die-database/reports/report-from-jm-tool-die-llc.txt (pdftotext -layout
 * of H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf; columns preserved). --in to override.
 *
 * PARSE MODEL: reuses hotel's authoritative vendor anchor — a vendor block is Bill lines terminated
 * by `Total <vendor> <qtySum>`. Per bill line we additionally CLASSIFY (deterministic keyword rules,
 * R5 = code not a model) into stock_material | tooling | service_subcontract | shop_supply | other,
 * and for stock we parse tool/die-steel GRADE + FORM + SIZE from the line.
 *
 * HONESTY (hotel financial-invariant doctrine, [[feedback_hotel_financial_invariant_gate]]): NO dollar
 * spend is summed or fabricated. The Cost column is column-flattened/unreliable; we capture at most a
 * few RAW observed unit-cost tokens per item as `costSamplesRaw` (loudly caveated, never summed) so the
 * ERP has a ballpark — authoritative cost must come from QuickBooks.
 *
 * Usage: node scripts/compile-jm-tooling-stock.mjs [--in <txt>] [--dry] [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = "H:/prism";
const argv = process.argv.slice(2);
const inIdx = argv.indexOf("--in");
const IN = inIdx >= 0 ? argv[inIdx + 1] : path.join(ROOT, "mcp-server/data/jm-die-database/reports/report-from-jm-tool-die-llc.txt");
const DRY = argv.includes("--dry");
const JSON_OUT = argv.includes("--json");
const OUT_DIR = path.join(ROOT, "mcp-server/data/jm-die-database");
const OUT_TOOLING = path.join(OUT_DIR, "jm-die-tooling-catalog.json");
const OUT_STOCK = path.join(OUT_DIR, "jm-die-stock-material-catalog.json");
const OUT_HANDOFF = path.join(OUT_DIR, "jm-die-tooling-stock-handoff.json");

const SCHEMA_VERSION = "1.0.0";

// ---- report chrome to skip (mirrors hotel) ----
const SKIP = [/^\d{1,2}:\d{2}\s*(AM|PM)\b/, /^\d{2}\/\d{2}\/\d{2}\b/, /^Accrual Basis\b/, /^Page \d+\s*$/i, /^Type\s+Date\s+Num\b/i, /^Purchases by Vendor/i, /^J\.M\. Tool/i];

// tool/die steel grade matchers (hyphen-optional, word-boundary; common shop/die steels) ----
const GRADE_PATTERNS = [
  /\bD-?2\b/i, /\bD-?3\b/i, /\bD-?6\b/i, /\bA-?2\b/i, /\bA-?6\b/i, /\bO-?1\b/i, /\bO-?6\b/i,
  /\bS-?7\b/i, /\bS-?5\b/i, /\bH-?13\b/i, /\bH-?11\b/i, /\bH-?12\b/i, /\bM-?2\b/i, /\bM-?4\b/i, /\bM-?42\b/i,
  /\bW-?1\b/i, /\bL-?6\b/i, /\bP-?20\b/i, /\bDC-?53\b/i, /\bCPM[- ]?\d{1,2}V\b/i, /\b440-?C\b/i, /\b17-?4\b/i,
  /\b4140\b/, /\b4340\b/, /\b8620\b/, /\b1018\b/, /\b1045\b/, /\b1144\b/, /\b12L14\b/i, /\b52100\b/, /\bA-?36\b/i, /\b6F\b/i,
];
// Order matters: the truncated QuickBooks "Item" category (STEEL RO.../STEEL FL...) is checked
// first since it's the most reliable form signal in this report, then in-memo form tokens.
const FORM_PATTERNS = [
  { form: "round", re: /\bSTEEL\s*RO|\b(RD|ROUND|DRILL ROD)\b|\bO\.?D\.?\b/i },
  { form: "flat", re: /\bSTEEL\s*FL|\b(FL|FLAT|DCF|GROUND FLAT)\b/i },
  { form: "plate", re: /\bSTEEL\s*PL|\bPLATE\b/i },
  { form: "square", re: /\bSTEEL\s*SQ|\b(SQ|SQUARE)\b/i },
  { form: "hex", re: /\bSTEEL\s*HE|\bHEX\b/i },
  { form: "sheet", re: /\bSTEEL\s*SH|\bSHEET\b/i },
  { form: "tube", re: /\b(TUBE|TUBING|DOM)\b/i },
];
// size: fraction/decimal dims like "1 1/8 OD", "3 X 3-1/2 X 8-10 FT", "1.250"
const SIZE_RE = /\b\d+(?:[\s./-]\d+\/\d+|\.\d+|\/\d+)?(?:\s*(?:OD|RD|DIA|"|IN|FT|MM))?(?:\s*X\s*\d+(?:[\s./-]\d+\/\d+|\.\d+)?){0,2}/i;

const TOOLING_PATTERNS = [
  /\bCARBIDE\b/i, /\bINSERT/i, /\bEND ?MILL/i, /\bDRILL\b/i, /\bTAP\b/i, /\bREAMER/i, /\bGRIND(ING)? WHEEL/i,
  /\bWHEEL\b/i, /\bCOLLET/i, /\bTOOL ?HOLDER/i, /\bHOLDER\b/i, /\bBROACH/i, /\bGUN ?DRILL/i, /\bCOUNTERBORE/i,
  /\bCOUNTERSINK/i, /\bBURR\b/i, /\bBORING BAR/i, /\bELECTRODE/i, /\bGRAPHITE/i, /\bDIAMOND/i, /\bCBN\b/i,
  /\bARBOR/i, /\bMILL\b/i, /\bSILVER (SOLDER|BRAZE)/i, /\bDIE BUTTON/i, /\bDOWEL/i, /\bEDM WIRE/i, /\bBRASS WIRE/i,
  /\bHONE\b/i, /\bHONING\b/i, /\bSTONE\b/i, /\bABRASIVE/i, /\bLAP\b/i, /\bBLANK\b/i,
];
// NOTE: ambiguous bare tokens (GRIND, TIN) deliberately excluded — "GRINDING WHEEL" / "TIN-COATED" are
// tooling, not a grind/coating service. Service keys are the unambiguous ones below.
const SERVICE_PATTERNS = [
  /\bHEAT ?TREAT/i, /\bTREATING\b/i, /\bCOATING\b/i, /\bTICN\b/i, /\bALTIN\b/i, /\bNITRID/i,
  /\bWIRE ?EDM\b/i, /\bMAINTENANCE\b/i, /\bFEE\b/i, /\bFREIGHT\b/i, /\bSHIPPING\b/i, /\bREPAIR/i, /\bCALIBRAT/i,
  /\bSERVICE\b/i, /\bSUBCONTRACT/i, /\bANNEAL/i, /\bSTRESS RELIEVE/i, /\bBLACK OXIDE/i, /\bPLATING\b/i,
];
const SUPPLY_PATTERNS = [/\bFUSE\b/i, /\bELECTRIC\b/i, /\bGLOVE/i, /\bTAPE\b/i, /\bCOOLANT/i, /\bLUBRICANT/i, /\bRAG\b/i, /\bBATTERY/i, /\bFILTER/i, /\bSAW ?BLADE/i, /\bBANDSAW/i, /\bOIL\b/i];

const STEEL_CAT_RE = /\bSTEEL\b/i;

function detectGrade(line) {
  // normalize the matched token (strip hyphens/spaces) so H-13≡H13, M-2≡M2, DC-53≡DC53, 440-C≡440C.
  for (const re of GRADE_PATTERNS) { const m = line.match(re); if (m) return m[0].toUpperCase().replace(/[\s-]/g, ""); }
  return null;
}
function detectForm(line) { for (const f of FORM_PATTERNS) if (f.re.test(line)) return f.form; return null; }
function anyMatch(line, pats) { return pats.some((re) => re.test(line)); }

/**
 * Classify a bill line into an inventory class. Precedence (order is load-bearing):
 *   1. QuickBooks STEEL item-category → stock_material (authoritative steel purchase).
 *   2. service/subcontract keyword → service_subcontract (heat-treat/coating lines often NAME the
 *      grade being treated, e.g. "HEAT TREAT D2" — must not be mistaken for a steel purchase).
 *   3. bare steel grade (no STEEL category, no service) → stock_material (raw material buy).
 *   4. tooling → tooling · 5. shop supply → shop_supply · 6. else other.
 */
export function classifyLine(line) {
  if (STEEL_CAT_RE.test(line)) return "stock_material";
  if (anyMatch(line, SERVICE_PATTERNS)) return "service_subcontract";
  if (detectGrade(line)) return "stock_material";
  if (anyMatch(line, TOOLING_PATTERNS)) return "tooling";
  if (anyMatch(line, SUPPLY_PATTERNS)) return "shop_supply";
  return "other";
}

/**
 * Best-effort memo (item description) for display. The pdftotext -layout text is COLUMNAR: columns are
 * separated by 2+ spaces. Split on that, then drop the columns that are NOT the memo: the truncated
 * vendor fragment (ends "..."), the QuickBooks item-category, and the pure qty/cost number columns.
 * (Memo and vendor are BOTH uppercase, so a naive uppercase regex eats the memo — hence column-split.)
 */
export function extractMemo(line) {
  // Everything AFTER the transaction date is `<doc#> <item desc> … <vendor-col> <category> <qty> <cost>`.
  // Slice after the date (handles ALL row shapes: "Bill <date>", bare "<date>", and the vendor-name-
  // prefixed first row "GREGGA CARBIDE <date>") — a leading-`Bill` strip alone leaked the vendor name
  // into the memo on first/continuation rows.
  const dm = line.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
  const s = dm ? line.slice(dm.index + dm[0].length) : line.replace(/^Bill\s+/, "");
  const cols = s.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean)
    .filter((c) => !/\.\.\.$/.test(c))                                              // truncated vendor fragment
    .filter((c) => !/^(MISC\.?|STEEL\b.*|MACHINE|SUBCONTRA\w*|SHOP\s*SU\w*)$/i.test(c)) // item category
    .filter((c) => !/^[\d.,\s/]+$/.test(c));                                        // pure qty/cost columns
  const memo = (cols[0] || "").replace(/^[A-Z]?\d[\w-]*\s+/, "");   // drop a leading invoice/num token
  return memo.trim().replace(/\s+/g, " ").slice(0, 80);
}

function costSamples(line) {
  // grab trailing decimal tokens (raw, unreliable) — the last 1-2 numbers on the line
  const nums = line.match(/\b\d+\.\d{2,4}\b/g);
  return nums ? nums.slice(-2) : [];
}

/**
 * Vendor-name-aware class promotion (applied per line at vendor-block flush, when the WHOLE block's
 * vendor name is known). The per-line classifier can't see the vendor; this recovers lines it misses:
 *   • a tooling house (…CARBIDE/…TOOL/…CUTTER) whose line lacks a tooling keyword → recover from "other".
 *   • a tooling house whose line carries a SPURIOUS "STEEL" item-category column (this report's category
 *     column is noisy) but NO real steel grade → it's tooling (e.g. GREGGA CARBIDE "MC5015" carbide
 *     inserts mis-tagged STEEL), NOT a steel-stock buy. Requires `!grade` so a genuine graded steel
 *     purchase from a tool-named vendor (e.g. "…TOOL… H13 ROUND") stays stock_material.
 *   • a treat/coat/plating house → its stock/other lines are the service being performed, not a buy
 *     (unless the line is an authoritative STEEL-category purchase: `steelCat` keeps it stock).
 * Pure + exported for unit testing. Returns the final class string.
 */
export function promoteClass({ pClass, steelCat, grade, vendorIsTooling, vendorIsService }) {
  if (vendorIsTooling && pClass === "other") return "tooling";
  if (vendorIsTooling && pClass === "stock_material" && !grade) return "tooling";
  if (vendorIsService && !steelCat && (pClass === "stock_material" || pClass === "other")) return "service_subcontract";
  return pClass;
}

export function parse(text) {
  const lines = text.split(/\r?\n/);
  const stock = new Map();    // grade|form → entry
  const tooling = new Map();  // vendor → {memos:Map, count}
  const vendorClass = new Map(); // vendor → {stock_material, tooling, service_subcontract, shop_supply, other}
  let pending = [];           // {class, grade, form, size, memo, vendorLineFrag, date, cost[]}
  let itemLineTotal = 0, vendorCount = 0;

  const flush = (vendor) => {
    if (!vendorClass.has(vendor)) vendorClass.set(vendor, { stock_material: 0, tooling: 0, service_subcontract: 0, shop_supply: 0, other: 0 });
    const vc = vendorClass.get(vendor);
    // Vendor-name signal: a supplier whose NAME is a tooling house (TS TOOLING SUPPLY, ...CARBIDE, ...CUTTER)
    // sells tooling even when an individual line lacks a tooling keyword → recover those from "other".
    // Exclude "TOOL STEEL" (those are steel/stock suppliers, not tooling).
    // prefix matches (no trailing \b) so TOOL→TOOLING/TOOLS, COAT→COATED, TREAT→TREATING all hit.
    const vendorIsTooling = /\b(TOOL|CARBIDE|ABRASIVE|CUTTER|CUTTING|INDEXABLE|DIAMOND|GRIND)/i.test(vendor) && !/TOOL\s*STEEL/i.test(vendor);
    const vendorIsService = /\b(TREAT|COAT|PLATING|ANODIZ|POLISH|HARDEN|NITRID|METAL TREAT)/i.test(vendor);
    for (const p of pending) {
      // vendor-name signals recover lines a per-line keyword scan can't classify (pure, tested):
      p.class = promoteClass({ pClass: p.class, steelCat: p.steelCat, grade: p.grade, vendorIsTooling, vendorIsService });
      vc[p.class] = (vc[p.class] || 0) + 1;
      if (p.class === "stock_material" && p.grade) {
        const key = `${p.grade}|${p.form || "?"}`;
        const e = stock.get(key) || { grade: p.grade, form: p.form || "unknown", occurrences: 0, vendors: new Set(), sizeSamples: new Set(), firstDate: null, lastDate: null, costSamplesRaw: [] };
        e.occurrences++; e.vendors.add(vendor);
        if (p.size && e.sizeSamples.size < 12) e.sizeSamples.add(p.size);
        if (p.cost.length && e.costSamplesRaw.length < 5) e.costSamplesRaw.push(...p.cost.slice(0, 1));
        if (!e.firstDate || p.date < e.firstDate) e.firstDate = p.date;
        if (!e.lastDate || p.date > e.lastDate) e.lastDate = p.date;
        stock.set(key, e);
      } else if (p.class === "tooling") {
        const t = tooling.get(vendor) || { vendor, count: 0, memos: new Map(), firstDate: null, lastDate: null, costSamplesRaw: [] };
        t.count++;
        if (p.memo) t.memos.set(p.memo, (t.memos.get(p.memo) || 0) + 1);
        if (p.cost.length && t.costSamplesRaw.length < 8) t.costSamplesRaw.push(...p.cost.slice(0, 1));
        if (!t.firstDate || p.date < t.firstDate) t.firstDate = p.date;
        if (!t.lastDate || p.date > t.lastDate) t.lastDate = p.date;
        tooling.set(vendor, t);
      }
    }
    pending = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || SKIP.some((re) => re.test(line))) continue;
    // `Total <vendor>` footer ends a vendor block. The vendor NAME is the first 2+space-delimited
    // column; the rest of the line is the (noisy) category column + qty-subtotal (e.g.
    // "Total PTS-TOOLS        MISC.    4,914"). The prior `(.+?)(\s+[\d,]+)?` capture left the
    // category token glued to the name ("PTS-TOOLS … MISC. 4,914") — polluting vendor keys so a
    // vendor's lines split across dirty/clean names and the ERP ingested garbage. Column-split (same
    // discipline as extractMemo) and take column 0.
    const totalM = line.match(/^Total\s+(.+)$/i);
    if (totalM) {
      // Column 0 (split on 2+ spaces) is the vendor name; the category + qty-subtotal sit in later
      // 2+space-delimited columns, so col-0 is already clean. Do NOT strip a trailing number here —
      // QuickBooks names distinct accounts with a single-space numeric suffix ("CINTAS 22" vs
      // "CINTAS 769"); stripping it merged them and broke the 174-distinct alignment with hotel.
      const vname = totalM[1].split(/\s{2,}/)[0].trim();
      if (vname && !/^total$/i.test(vname)) { vendorCount++; flush(vname); continue; }
    }
    // A transaction/item row carries a transaction date MM/DD/YYYY. `Total <vendor>` footers are
    // matched+`continue`d above (and carry no date), and 2-digit-year report chrome is SKIP-filtered,
    // so any remaining 4-digit-year date line is a real item row. Keying on the DATE (not a leading
    // "Bill") is REQUIRED: QuickBooks "Purchases by Vendor Detail" prints each vendor block's FIRST
    // item row with the VENDOR NAME in the Type column (not "Bill") and wraps later items onto bare-date
    // continuation rows — the old /^Bill/ anchor silently dropped both, so single-transaction vendors
    // (e.g. GREGGA CARBIDE) vanished entirely and multi-item bills were undercounted. The first date in
    // the line is always the transaction date (it precedes the item description), so a memo-embedded date
    // cannot cause a double count.
    const dateM = line.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
    if (dateM) {
      const [, mm, dd, yyyy] = dateM;
      if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31 || +yyyy < 2000 || +yyyy > 2100) continue; // guard stray numerics
      itemLineTotal++;
      const date = `${yyyy}-${mm}-${dd}`; // ISO for sort
      const cls = classifyLine(line);
      pending.push({ class: cls, steelCat: STEEL_CAT_RE.test(line), grade: detectGrade(line), form: detectForm(line), size: (line.match(SIZE_RE) || [null])[0]?.trim()?.slice(0, 24) || null, memo: extractMemo(line), date, cost: costSamples(line) });
      continue;
    }
  }
  return { stock, tooling, vendorClass, itemLineTotal, vendorCount };
}

function main() {
  if (!fs.existsSync(IN)) { console.error(`[tooling-stock] report text not found: ${IN}\n  re-extract: pdftotext -layout "H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf" "${IN}"`); process.exit(1); }
  const { stock, tooling, vendorClass, itemLineTotal, vendorCount } = parse(fs.readFileSync(IN, "utf8"));

  const stockList = [...stock.values()].map((e) => ({
    grade: e.grade, form: e.form, occurrences: e.occurrences,
    vendorCount: e.vendors.size, vendors: [...e.vendors].sort().slice(0, 10),
    sizeSamples: [...e.sizeSamples], firstDate: e.firstDate, lastDate: e.lastDate,
    costSamplesRaw: e.costSamplesRaw,
  })).sort((a, b) => b.occurrences - a.occurrences);

  const toolingList = [...tooling.values()].map((t) => ({
    vendor: t.vendor, occurrences: t.count,
    topItems: [...t.memos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([memo, n]) => ({ memo, n })),
    firstDate: t.firstDate, lastDate: t.lastDate, costSamplesRaw: t.costSamplesRaw,
  })).sort((a, b) => b.occurrences - a.occurrences);

  const vendorRoles = [...vendorClass.entries()].map(([vendor, c]) => {
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    const dominant = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    return { vendor, total, dominantRole: dominant[0], breakdown: c };
  }).sort((a, b) => b.total - a.total);

  const META = {
    schemaVersion: SCHEMA_VERSION,
    source: "DocuStrata: H:/PRISM/Docustrata/Report_from_J.M._Tool__Die_LLC.pdf (QuickBooks Purchases by Vendor Detail, 2014-05-01..2026-05-29)",
    generated: process.env.PRISM_INGEST_STAMP || "2026-05-29",
    shop: "J.M. Tool & Die, LLC",
    builtBy: "scripts/compile-jm-tooling-stock.mjs (slot:juliett, database-expansion)",
    reconciliation: { vendorCount, itemLineTotal, note: "vendorCount aligns with hotel's jm-die-vendor-registry.json (174 vendors). itemLineTotal counts DISTINCT item rows (incl. each vendor-block's first row + bare-date continuation rows that the prior /^Bill/ pass dropped) and is therefore HIGHER than hotel's ~20,550 QuickBooks Bill-transaction count — finer granularity, not a discrepancy." },
    costCaveat: "costSamplesRaw are RAW observed unit-cost tokens from column-flattened text — UNRELIABLE, never summed, NOT authoritative spend. Per hotel financial-invariant doctrine, authoritative $ must come from QuickBooks.",
  };

  const toolingDoc = { ...META, kind: "jm-die-tooling-catalog", toolingVendorCount: toolingList.length, totalToolingLines: toolingList.reduce((a, t) => a + t.occurrences, 0), vendors: toolingList };
  const stockDoc = { ...META, kind: "jm-die-stock-material-catalog", distinctGradeForms: stockList.length, totalStockLines: stockList.reduce((a, s) => a + s.occurrences, 0), gradesForms: stockList };
  const handoffDoc = {
    ...META, kind: "jm-die-tooling-stock-handoff", forSlot: "hotel (business/ERP)",
    purpose: "ERP inventory + reorder-point seed: what JM Die buys (tooling) and stocks (material grades/forms/sizes), by vendor + frequency + date-range.",
    consumes: { vendorRegistry: "mcp-server/data/state/jm-die-vendor-registry.json (hotel — 174 vendors)", canonicalStore: "mcp-server/data/jm-die-database/ (juliett)" },
    artifacts: { toolingCatalog: "mcp-server/data/jm-die-database/jm-die-tooling-catalog.json", stockMaterialCatalog: "mcp-server/data/jm-die-database/jm-die-stock-material-catalog.json" },
    summary: {
      stock_distinctGradeForms: stockList.length, stock_totalLines: stockDoc.totalStockLines,
      tooling_vendorCount: toolingList.length, tooling_totalLines: toolingDoc.totalToolingLines,
      topStock: stockList.slice(0, 10).map((s) => ({ grade: s.grade, form: s.form, occurrences: s.occurrences, vendors: s.vendorCount })),
      topToolingVendors: toolingList.slice(0, 10).map((t) => ({ vendor: t.vendor, occurrences: t.occurrences })),
      vendorRoles: vendorRoles.slice(0, 25).map((v) => ({ vendor: v.vendor, dominantRole: v.dominantRole, total: v.total })),
    },
    erpRecommendations: [
      "Seed an ERP material-master from gradesForms (grade × form) — each is a stockable SKU; sizeSamples seed the variant dimensions.",
      "Seed a tooling/consumable vendor-preference list from tooling vendors (who supplies carbide/inserts/etc.).",
      "Reorder-point: use occurrences + firstDate/lastDate cadence as a purchase-frequency signal (NOT $; reconcile cost from QuickBooks).",
      "Vendor roles classify the 174 vendors into material-supplier / tooling-supplier / service-subcontract / shop-supply for AP routing.",
    ],
  };

  if (DRY || JSON_OUT) {
    console.log(JSON.stringify({ reconciliation: META.reconciliation, summary: handoffDoc.summary }, null, 2));
    if (DRY) return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // atomic-ish per file (small JSONs)
  for (const [p, doc] of [[OUT_TOOLING, toolingDoc], [OUT_STOCK, stockDoc], [OUT_HANDOFF, handoffDoc]]) {
    const tmp = `${p}.${process.pid}.tmp`;
    try { fs.writeFileSync(tmp, JSON.stringify(doc, null, 2)); fs.renameSync(tmp, p); }
    catch (e) { try { fs.unlinkSync(tmp); } catch {} throw e; }
  }
  // read-back smoke test
  const back = JSON.parse(fs.readFileSync(OUT_HANDOFF, "utf8"));
  const ok = back.schemaVersion === SCHEMA_VERSION && back.summary.stock_distinctGradeForms === stockList.length;
  console.log(`[tooling-stock] vendors=${vendorCount} itemLines=${itemLineTotal} | stock gradeForms=${stockList.length} (${stockDoc.totalStockLines} lines) | tooling vendors=${toolingList.length} (${toolingDoc.totalToolingLines} lines) | smoke=${ok ? "PASS" : "FAIL"}`);
  console.log(`[tooling-stock] → ${path.relative(ROOT, OUT_TOOLING)}, ${path.relative(ROOT, OUT_STOCK)}, ${path.relative(ROOT, OUT_HANDOFF)}`);
  if (!ok) process.exit(3);
}

// Only run the full parse+write when invoked directly — NOT when imported (the test file imports the
// pure helpers; any consumer importing classifyLine/promoteClass must not silently rewrite the catalogs).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
