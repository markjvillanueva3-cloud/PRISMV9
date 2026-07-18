#!/usr/bin/env node
/**
 * extract-lathe-pdfs-per-page.mjs
 *
 * Page-by-page lathe-relevant data extractor for the JM DIE/TRIBAL+WIKI PDF
 * corpus. Unlike pdf-parse-extract.mjs (concatenated text + first 25 headings),
 * this script emits ONE wiki + tribal record per page, classifying each page's
 * lathe-relevance and surfacing the notable atoms (grade codes, G-codes,
 * ISO groups, insert geometry, materials, controllers).
 *
 * Per-page classification axes:
 *   - g_codes_seen     (G18/G50/G71/G72/G73/G76/G96/G97 ...)
 *   - insert_codes     (CNMG, WNMG, DNMG, SNMG, TNMG, VBMT, RCMX ...)
 *   - iso_groups       (P / M / K / N / S / H tokens)
 *   - vendor_grades    (KCP25, AH725, GC4425, NC3030, WPP20G ...)
 *   - lathe_keywords   (lathe/turning/spindle/chuck/tailstock/CSS ...)
 *   - mill_keywords    (mill/milling/end mill/flute — used to flag pages as
 *                       mill-only)
 *   - is_lathe_page    (heuristic: lathe_keyword_count >= 2 && mill_count == 0
 *                       OR has G71/G96/G50 OR has turning insert code)
 *
 * Output:
 *   - state/shared/extracted-pdfs/whiskey-lathe-pages-2026-05-26.jsonl
 *     (one row per page across all PDFs; AI-queryable)
 *   - mcp-server/data/ingestion_cache/lathe-pages-summary-2026-05-26.json
 *     (per-PDF + per-page summary index)
 *
 * Uses pdf-parse v2 PDFParse class — `result.pages` is the per-page array.
 *
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0/U-LATHE-VENDOR-PDF-CURRICULUM-PARSE
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const PDF_PARSE_BASE = "H:/prism/mcp-server/package.json";

// ────────────────────────────────────────────────────────────────────────────
// Lathe-relevant PDF corpus (operator-curated JM DIE/TRIBAL+WIKI subset)
// ────────────────────────────────────────────────────────────────────────────
const LATHE_PDF_CORPUS = [
  // Lathe-specific (5)
  "H:/PRISM/JM DIE/TRIBAL + WIKI/CNC Lathe Programming for Turning.pdf",
  "H:/PRISM/JM DIE/TRIBAL + WIKI/CNC Lathe Programming - cnc_lathe_programming-uploaded.pdf",
  "H:/PRISM/JM DIE/TRIBAL + WIKI/InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf",
  "H:/PRISM/JM DIE/TRIBAL + WIKI/Using IF and GOTO For a Poor Man's G71 Lathe Roughing Cycle - CNCCookbook_ Be A Better CNC'er.pdf",
  "H:/PRISM/JM DIE/TRIBAL + WIKI/Using Your Mill CAM For the Lathe and Turning G-Code [ Sneaky Trick ] - CNCCookbook_ Be A Better CNC'er.pdf",
  // Cross-domain references with lathe sections (pick representative ones; per-page filter keeps mill-only pages out)
  "H:/PRISM/JM DIE/TRIBAL + WIKI/Autodesk_CNCBOOK.pdf",
  "H:/PRISM/JM DIE/TRIBAL + WIKI/CNC Programming with G Code_ Easy Free Tutorial [ 2024 ].pdf",
  "H:/PRISM/JM DIE/TRIBAL + WIKI/Fundamentals_of_CNC_Machining.pdf",
];

// ────────────────────────────────────────────────────────────────────────────
// Page-classification patterns
// ────────────────────────────────────────────────────────────────────────────
const G_CODE_RE   = /\bG(0?[1-9]|[1-9]\d)\b/g;
const M_CODE_RE   = /\bM(0?[1-9]|[1-9]\d)\b/g;
const ISO_GROUP_RE = /\bISO\s*([PMKNSH])\b|\b([PMKNSH])\s*(?:0?\d{2}|0?\d|10|20|30|40)\b/g;

const INSERT_CODE_PREFIXES = ["CNMG","CNMA","CCMT","CCGT","WNMG","WNMA","WCMT","DNMG","DCMT","SNMG","SCMT","TNMG","TPMR","TCMT","VBMT","VNMG","VCMT","RCMX","RCMT","TNGG","TPGN"];
const INSERT_CODE_RE = new RegExp("\\b(" + INSERT_CODE_PREFIXES.join("|") + ")\\b", "g");

// Common vendor grade codes (subset; extracted from the master tribal index)
const VENDOR_GRADE_CODES = [
  "GC4425","GC4415","GC4405",
  "IC8250","IC907","IC908","IC830","IC328","IC4100",
  "KCP05","KCP10","KCP25","KCP25C","KCP30","KCP40","KCM15","KCM25","KCM35","KCK05","KCK15","KCK20","KCU10","KCU25","KCS10",
  "NC3010","NC3020","NC3030","NC3120","PC5300","PC8010","PC9030","NC9020",
  "MC6025","UE6020","UE6110","UE6105","VP15TF","VP25N","VP45N",
  "CA5525","PR1525",
  "WPP10G","WPP20G","WPP30G","WPP10S","WPP20S","WPP30S","WMP20S","WKK10S","WKK20S","WAK10",
  "TP1500","TP2500","TP3500","TP1501","TP2501","TP0501","TK1001","TK2001","TK1501",
  "AH725","AH8005","AH120","AH8015","AH6225",
  "AC8115P","AC8020P","AC8025P","AC8035P","AC5005S","AC5015S","AC5025S",
  "CT3000","PV3010","TT5100","TT7005","TT7015","TT8115","TT8125","TT9215","TT9225","TT9235","TB610","TB670","TB730",
];
const VENDOR_GRADE_RE = new RegExp("\\b(" + VENDOR_GRADE_CODES.join("|") + ")\\b", "g");

const LATHE_KW_RE = /\b(lathe|turning|chuck|tailstock|spindle|live[- ]tool|sub[- ]?spindle|swiss|CSS|constant surface speed|facing|grooving|parting|cutoff|boring|threading|turret|bar feed|collet|tool ?nose ?radius|G7[1-6]\b|G9[67]\b|G50\s*S)/gi;
const MILL_KW_RE  = /\b(mill(?:ing)?|end[- ]?mill|face[- ]?mill|ball[- ]?nose|peripheral|adaptive[- ]?clear|side[- ]?milling|slot[- ]?milling|pocket[- ]?milling|flute ?count|helix angle|step[- ]?down|step[- ]?over)/gi;
const CONTROLLER_RE = /\b(Fanuc|Haas|Okuma|Mazak|Mitsubishi|Siemens|Heidenhain|Doosan|Hurco|Tormach|Mori ?Seiki|DMG|Pathpilot|MasterCam|hyperMILL|InventorCAM|Fusion ?360|Mill ?Turn)/gi;

function countMatches(re, text) {
  const m = text.match(re);
  return m ? m.length : 0;
}

function uniqueMatches(re, text) {
  const m = text.match(re);
  if (!m) return [];
  return [...new Set(m.map(s => s.trim().toUpperCase()))];
}

function uniqueMatchesCase(re, text) {
  const m = text.match(re);
  if (!m) return [];
  return [...new Set(m.map(s => s.trim()))];
}

/** Classify a single page's lathe-relevance + extract atoms. Pure function. */
export function classifyPage(pageText) {
  if (typeof pageText !== "string" || pageText.length < 20) {
    return { is_lathe_page: false, atoms: {}, scores: { lathe: 0, mill: 0 } };
  }

  const g_codes = uniqueMatches(G_CODE_RE, pageText);
  const m_codes = uniqueMatches(M_CODE_RE, pageText);
  const insert_codes = uniqueMatches(INSERT_CODE_RE, pageText);
  const vendor_grades = uniqueMatches(VENDOR_GRADE_RE, pageText);
  const controllers = uniqueMatchesCase(CONTROLLER_RE, pageText);

  const isoMatches = [...pageText.matchAll(ISO_GROUP_RE)];
  const iso_groups = [...new Set(isoMatches.map(m => (m[1] || m[2] || "").toUpperCase()).filter(Boolean))];

  const latheCount = countMatches(LATHE_KW_RE, pageText);
  const millCount = countMatches(MILL_KW_RE, pageText);

  // Lathe-page heuristic — explicit canned cycles or turning inserts trump keyword count.
  const hasTurningCannedCycle = g_codes.some(g => /^G7[1-6]$|^G9[67]$/.test(g));
  const hasTurningInsert = insert_codes.length > 0;
  const is_lathe_page = (
    hasTurningCannedCycle ||
    hasTurningInsert ||
    (latheCount >= 2 && (latheCount >= millCount || millCount <= 1))
  );

  return {
    is_lathe_page,
    atoms: {
      g_codes,
      m_codes,
      insert_codes,
      vendor_grades,
      iso_groups,
      controllers,
    },
    scores: { lathe: latheCount, mill: millCount },
  };
}

function harvestSectionHeading(pageText) {
  if (!pageText) return null;
  // First line that looks like a heading: starts with #, or is short + title-case + no period at end
  const lines = pageText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length < 4 || line.length > 80) continue;
    if (line.endsWith(".") || line.endsWith(",") || line.endsWith(";")) continue;
    if (/^[A-Z][A-Za-z0-9 \-&/+_()]+$/.test(line)) return line;
  }
  return lines[0] ? lines[0].slice(0, 80) : null;
}

async function loadPdfParse() {
  const req = createRequire(PDF_PARSE_BASE);
  const mod = req("pdf-parse");
  const PDFParse = mod?.PDFParse ?? mod?.default?.PDFParse;
  if (typeof PDFParse !== "function") throw new Error("PDFParse class missing");
  return PDFParse;
}

function pdfToSlug(p) {
  return path.basename(p, path.extname(p))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function extractPdfPerPage(pdfPath, PDFParse, opts) {
  if (!fs.existsSync(pdfPath)) {
    return { ok: false, path: pdfPath, error: "file-not-found" };
  }
  const slug = pdfToSlug(pdfPath);
  const buf = fs.readFileSync(pdfPath);
  let parser;
  let result;
  try {
    parser = new PDFParse({ data: new Uint8Array(buf) });
    result = await parser.getText({ first: opts.maxPages });
  } catch (e) {
    if (parser) { try { await parser.destroy(); } catch {/*swallow*/} }
    return { ok: false, path: pdfPath, error: "pdf-parse-failed: " + (e?.message || String(e)) };
  }

  const pages = Array.isArray(result?.pages) ? result.pages : [];
  const total = result?.total || pages.length;

  const pageRecords = [];
  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const page = pages[i];
    // pdf-parse v2 page shape may be { text, ... } or just a string — handle both
    const pageText = typeof page === "string" ? page : (page?.text || page?.content || "");
    if (!pageText || pageText.length < 20) continue;
    const cls = classifyPage(pageText);
    const heading = harvestSectionHeading(pageText);
    pageRecords.push({
      slug,
      pdf: pdfPath.replace(/\\/g, "/"),
      page_number: pageNum,
      page_total: total,
      heading,
      char_count: pageText.length,
      is_lathe_page: cls.is_lathe_page,
      scores: cls.scores,
      atoms: cls.atoms,
      snippet: pageText.slice(0, 280).replace(/\s+/g, " "),
    });
  }
  try { await parser.destroy(); } catch {/*swallow*/}

  const lathePages = pageRecords.filter(r => r.is_lathe_page);
  return {
    ok: true,
    slug,
    path: pdfPath,
    pages_total: total,
    pages_scanned: pageRecords.length,
    pages_classified_lathe: lathePages.length,
    pageRecords,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {
    maxPages: 80,
    onlyLathe: false,
    out: null,
    summaryOut: null,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max") opts.maxPages = parseInt(args[++i], 10);
    else if (args[i] === "--only-lathe") opts.onlyLathe = true;
    else if (args[i] === "--out") opts.out = args[++i];
    else if (args[i] === "--summary-out") opts.summaryOut = args[++i];
  }
  const PDFParse = await loadPdfParse();
  const jsonlPath = opts.out || path.resolve(repoRoot, "state/shared/extracted-pdfs/whiskey-lathe-pages-2026-05-26.jsonl");
  const summaryPath = opts.summaryOut || path.resolve(repoRoot, "mcp-server/data/ingestion_cache/lathe-pages-summary-2026-05-26.json");
  fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });

  // Truncate JSONL to avoid duplicate appends on re-run
  fs.writeFileSync(jsonlPath, "");

  const summary = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    extractor: "scripts/extract-lathe-pdfs-per-page.mjs",
    options: opts,
    pdf_count: LATHE_PDF_CORPUS.length,
    per_pdf: [],
    totals: {
      pages_scanned: 0,
      pages_classified_lathe: 0,
      atoms: { g_codes: 0, insert_codes: 0, vendor_grades: 0 },
    },
  };

  for (const pdfPath of LATHE_PDF_CORPUS) {
    process.stderr.write("# extracting " + path.basename(pdfPath) + " ...\n");
    const rec = await extractPdfPerPage(pdfPath, PDFParse, opts);
    if (!rec.ok) {
      summary.per_pdf.push({ path: pdfPath, ok: false, error: rec.error });
      continue;
    }
    let emitted = 0;
    for (const pr of rec.pageRecords) {
      if (opts.onlyLathe && !pr.is_lathe_page) continue;
      fs.appendFileSync(jsonlPath, JSON.stringify(pr) + "\n");
      emitted++;
      summary.totals.atoms.g_codes += pr.atoms.g_codes.length;
      summary.totals.atoms.insert_codes += pr.atoms.insert_codes.length;
      summary.totals.atoms.vendor_grades += pr.atoms.vendor_grades.length;
    }
    summary.totals.pages_scanned += rec.pages_scanned;
    summary.totals.pages_classified_lathe += rec.pages_classified_lathe;
    summary.per_pdf.push({
      slug: rec.slug,
      path: pdfPath.replace(/\\/g, "/"),
      pages_total: rec.pages_total,
      pages_scanned: rec.pages_scanned,
      pages_classified_lathe: rec.pages_classified_lathe,
      pages_emitted: emitted,
    });
  }

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  process.stdout.write(JSON.stringify({
    ok: true,
    pdfs: summary.pdf_count,
    pages_scanned: summary.totals.pages_scanned,
    pages_classified_lathe: summary.totals.pages_classified_lathe,
    atoms: summary.totals.atoms,
    jsonl: jsonlPath,
    summary: summaryPath,
  }, null, 2) + "\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(e => { process.stderr.write("FATAL " + e.stack + "\n"); process.exit(1); });
