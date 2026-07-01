#!/usr/bin/env node
// scripts/build-ocr-gold-verify-package.mjs
//
// U-XRAY-GOLD-VERIFY-PACKAGE -- assemble an operator-reviewable GOLD-verification folder for the
// closed-loop OCR trainset. The training loop weak-labels JM prints into trainset.jsonl (gold/silver
// dims that will train india's blueprint-OCR LoRA). Before those pseudo-labels become GOLD, a human
// confirms each extracted value against the actual print -- THIS packages exactly what's needed:
//   - VERIFY-dimensions.csv : one row per extracted dim (INCH + mm + Y/N columns; opens in Excel)
//   - prints/               : a copy of every source print PDF referenced (open next to the sheet)
//   - README.txt            : what to do
//   - AL-QUEUE-context.md    : the broader needs-review worklist, for context (copied if present)
//
// JM prints are in INCHES; the loop stores value_mm (it read with assumeUnits:"in"). The sheet shows
// value_inch = value_mm/25.4 FIRST (what's on the print) so an inch shop can compare directly -- a
// mm-only sheet would be unusable here (units-first discipline).
//
// READ-ONLY on PRISM state: copies the trainset + source PDFs out; never mutates the loop's data or
// writes any GOLD label (the operator's marks in the CSV are the GOLD signal, fed back separately).
//
// USAGE:
//   node scripts/build-ocr-gold-verify-package.mjs [--trainset <path>] [--dest <folder>] [--no-pdfs]
// EXIT: 0 ok | 1 trainset missing/unreadable.

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { argv, exit } from "node:process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TRAINSET = join(REPO_ROOT, "state", "shared", "ocr-training-loop", "corpus-train", "trainset.jsonl");
const DEFAULT_AL_REVIEW = join(REPO_ROOT, "state", "shared", "ocr-training-loop", "AL-QUEUE-GOLD-REVIEW.md");
// Windows shows OneDrive\Desktop as the Desktop when redirected; prefer it, fall back to local Desktop.
function defaultDesktop() {
  const od = join(homedir(), "OneDrive", "Desktop");
  if (existsSync(od)) return od;
  return join(homedir(), "Desktop");
}

const MM_PER_INCH = 25.4;

/** PURE: read trainset jsonl into rows, fail-soft skipping malformed lines. */
export function readTrainset(text) {
  const out = [];
  for (const line of String(text == null ? "" : text).split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* torn line -- skip */ }
  }
  return out;
}

/** PURE: CSV-escape one field (RFC-4180: wrap in quotes + double interior quotes when needed). */
export function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.split('"').join('""')}"` : s;
}

/**
 * PURE: flatten trainset rows into per-dim CSV records. Each label becomes one operator-review row.
 * value_inch (what's on the print) is derived from value_mm; non-numeric value_mm yields a blank inch.
 * @param {Array<object>} rows
 * @returns {{header:string[], records:Array<Array<string|number>>, distinctPrints:string[], dimCount:number}}
 */
export function buildDimRecords(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const header = ["print", "page", "dim_no", "type", "value_inch", "value_mm", "tier", "confidence", "corroboration", "CORRECT_Y_N", "CORRECT_value_inch_if_wrong"];
  const records = [];
  const prints = new Set();
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const printPath = String(r.image != null ? r.image : r.key != null ? r.key : "").split("#")[0];
    const printName = basename(printPath.split("\\").join("/")) || "(unknown)";
    if (printPath) prints.add(printPath);
    const page = Number.isInteger(r.page) ? r.page : 0;
    const labels = Array.isArray(r.labels) ? r.labels : [];
    labels.forEach((l, i) => {
      const mm = l && Number.isFinite(l.value_mm) ? l.value_mm : null;
      const inch = mm != null ? +(mm / MM_PER_INCH).toFixed(4) : "";
      records.push([
        printName, page, i + 1,
        l && l.type != null ? String(l.type) : "",
        inch, mm != null ? +mm.toFixed(4) : "",
        l && l.tier != null ? String(l.tier) : "",
        l && Number.isFinite(l.agreement_confidence) ? l.agreement_confidence : "",
        l && Number.isFinite(l.corroboration) ? l.corroboration : "",
        "", "", // operator fills: CORRECT? (Y/N), correct value if wrong
      ]);
    });
  }
  // group by print then page then dim_no for a print-at-a-time review flow
  records.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || (a[1] - b[1]) || (a[2] - b[2]));
  return { header, records, distinctPrints: [...prints], dimCount: records.length };
}

/**
 * PURE: flatten trainset rows into per-GD&T-frame CSV records (U-XRAY-GDT-GOLD-VERIFY). The trainset
 * now carries trainable `gdt_labels` (each with an `fcf_text` ground-truth string) -- so a GD&T frame
 * gets the SAME operator-confirm gate a dimension does before it becomes a GOLD LoRA label. Reads
 * `r.gdt_labels`; rows without any are simply skipped (no GD&T to review on that print).
 * @param {Array<object>} rows
 * @returns {{header:string[], records:Array<Array<string|number>>, distinctPrints:string[], gdtCount:number}}
 */
export function buildGdtRecords(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const header = ["print", "page", "gdt_no", "symbol", "fcf_text", "tier", "agreement_fraction", "corroboration", "calibration_basis", "CORRECT_Y_N", "CORRECT_fcf_if_wrong"];
  const records = [];
  const prints = new Set();
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const printPath = String(r.image != null ? r.image : r.key != null ? r.key : "").split("#")[0];
    const printName = basename(printPath.split("\\").join("/")) || "(unknown)";
    if (printPath) prints.add(printPath);
    const page = Number.isInteger(r.page) ? r.page : 0;
    const gdt = Array.isArray(r.gdt_labels) ? r.gdt_labels : [];
    gdt.forEach((g, i) => {
      records.push([
        printName, page, i + 1,
        g && g.symbol != null ? String(g.symbol) : "",
        g && g.fcf_text != null ? String(g.fcf_text) : "",
        g && g.tier != null ? String(g.tier) : "",
        g && Number.isFinite(g.agreement_fraction) ? g.agreement_fraction : "",
        g && Number.isFinite(g.corroboration) ? g.corroboration : "",
        g && g.calibration_basis != null ? String(g.calibration_basis) : "",
        "", "", // operator fills: CORRECT? (Y/N), correct FCF if wrong
      ]);
    });
  }
  records.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || (a[1] - b[1]) || (a[2] - b[2]));
  return { header, records, distinctPrints: [...prints], gdtCount: records.length };
}

/** PURE: render the CSV text from header + records. */
export function renderCsv(header, records) {
  const lines = [header.map(csvCell).join(",")];
  for (const rec of records) lines.push(rec.map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n"; // CRLF: Excel-friendly on Windows
}

/** PURE: README body. */
export function renderReadme({ dimCount, gdtCount = 0, printCount, generatedAt }) {
  return [
    "PRISM -- OCR GOLD-VERIFICATION PACKAGE",
    "=====================================",
    generatedAt ? `Generated: ${generatedAt}` : "",
    "",
    "WHAT THIS IS",
    "------------",
    `PRISM's closed-loop OCR read your JM prints and extracted ${dimCount} dimensions from ${printCount} prints.`,
    "It is confident enough to TRAIN the AI (india's blueprint-OCR LoRA) on them -- but not until a human",
    "(you) confirms they are correct. Your confirmation is the gate to 100% print-reading accuracy.",
    "",
    "WHAT TO DO",
    "----------",
    "1. Open VERIFY-dimensions.csv (double-click -> Excel).",
    "2. It is sorted by print. For each row, open the matching PDF in the prints\\ folder and find that",
    "   dimension on the drawing.",
    "3. value_inch is what PRISM read (JM prints are in inches; value_mm is the same value in mm).",
    "4. In CORRECT_Y_N type Y if the value matches the print, N if it is wrong.",
    "5. If N, put the right value (in inches) in CORRECT_value_inch_if_wrong.",
    "6. Save the CSV and send it back -- the Y rows become GOLD training labels; the N rows are corrected.",
    "",
    "GD&T (geometric tolerances)",
    "---------------------------",
    `VERIFY-gdt.csv lists ${gdtCount} GD&T frame(s) PRISM read (position, flatness, runout, etc.) as`,
    "feature-control-frame text, e.g. \"position 0.1mm MMC [A|B]\". Same drill: CORRECT_Y_N = Y if the frame",
    "matches the print, else N + the correct frame text in CORRECT_fcf_if_wrong. Y rows train the AI's GD&T",
    "reading (the same gate the dimensions get). An empty sheet just means no GD&T was read in this batch.",
    "",
    "NOTES",
    "-----",
    "- tier 'silver' = high agreement (both AI models agreed), 'gold' = highest. Your Y promotes it to GOLD.",
    "- confidence is the AI's self-rated agreement (0-1). corroboration = how many models agreed.",
    "- You do NOT need to find every dimension on the print -- only confirm the ones listed.",
    "- AL-QUEUE-context.md lists prints flagged as UNCERTAIN (model disagreement); separate, lower priority.",
    "- This is the first batch (corpus ~0.8% done). The nightly run produces more; re-package as it grows.",
    "",
  ].join("\r\n");
}

function main() {
  const args = argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const trainsetPath = get("--trainset", DEFAULT_TRAINSET);
  const dest = get("--dest", join(defaultDesktop(), "PRISM-OCR-GOLD-VERIFY"));
  const noPdfs = args.includes("--no-pdfs");

  if (!existsSync(trainsetPath)) { console.error(`[gold-verify] trainset not found: ${trainsetPath}`); exit(1); }
  let rows;
  try { rows = readTrainset(readFileSync(trainsetPath, "utf8")); }
  catch (e) { console.error(`[gold-verify] read failed: ${e instanceof Error ? e.message : String(e)}`); exit(1); }

  const { header, records, distinctPrints, dimCount } = buildDimRecords(rows);
  const gdt = buildGdtRecords(rows);
  const generatedAt = new Date().toISOString();

  mkdirSync(dest, { recursive: true });
  writeFileSync(join(dest, "VERIFY-dimensions.csv"), renderCsv(header, records));
  // GD&T frames get the same operator-confirm gate as dims (U-XRAY-GDT-GOLD-VERIFY). Written even when
  // empty (header-only) so the operator knows GD&T review is part of the flow and none was extracted yet.
  writeFileSync(join(dest, "VERIFY-gdt.csv"), renderCsv(gdt.header, gdt.records));
  writeFileSync(join(dest, "README.txt"), renderReadme({ dimCount, gdtCount: gdt.gdtCount, printCount: distinctPrints.length, generatedAt }));
  if (existsSync(DEFAULT_AL_REVIEW)) {
    try { copyFileSync(DEFAULT_AL_REVIEW, join(dest, "AL-QUEUE-context.md")); } catch { /* best-effort */ }
  }

  // Copy the source print PDFs (so the operator can open each next to the sheet). Missing/oversized
  // files are reported, never abort. PDFs only (the trainset images are PDF paths).
  let copied = 0, missing = 0, skippedBig = 0;
  if (!noPdfs) {
    const printsDir = join(dest, "prints");
    mkdirSync(printsDir, { recursive: true });
    const MAX_BYTES = 50 * 1024 * 1024; // skip a pathological >50MB scan, note it
    for (const p of distinctPrints) {
      const fsPath = p.split("\\").join("/");
      if (!existsSync(fsPath)) { missing++; continue; }
      try {
        if (statSync(fsPath).size > MAX_BYTES) { skippedBig++; continue; }
        copyFileSync(fsPath, join(printsDir, basename(fsPath)));
        copied++;
      } catch { missing++; }
    }
  }

  console.log(`[gold-verify] ${dimCount} dims + ${gdt.gdtCount} GD&T frames from ${distinctPrints.length} prints -> ${dest}`);
  console.log(`  VERIFY-dimensions.csv + VERIFY-gdt.csv + README.txt${existsSync(join(dest, "AL-QUEUE-context.md")) ? " + AL-QUEUE-context.md" : ""}`);
  if (!noPdfs) console.log(`  prints/: ${copied} copied${missing ? `, ${missing} missing` : ""}${skippedBig ? `, ${skippedBig} skipped (>50MB)` : ""}`);
  exit(0);
}

const here = fileURLToPath(import.meta.url).split("\\").join("/");
const invoked = argv[1] ? argv[1].split("\\").join("/") : "";
if (here === invoked) main();
