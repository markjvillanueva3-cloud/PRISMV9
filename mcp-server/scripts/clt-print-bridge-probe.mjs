#!/usr/bin/env node
// clt-print-bridge-probe.mjs -- CLOSED-LOOP-TRAINING T-CLT-PRINT-BRIDGE (slot:hotel, 2026-07-02).
//
// SUMMARY-ONLY reconcile of the LIVE JM-tree print_doc population (pdf/tif from the scan
// ledger, existence-checked) against the Docustrata export manifest's 111,745 indexed
// documents -- BEFORE any OCR is queued (operator directive: never re-OCR Docustrata).
// Join tiers (honest, weakest-last):
//   confirmed  = basename + file_size both match a Docustrata document
//   name_only  = basename matches but size differs/missing (probable same doc family)
//   unmatched  = no Docustrata document shares the basename -> the true OCR-residue pool
// Prints ONE compact JSON. Never prints paths/content (R5).
//
// Canon rule mirrors JMDieScanLedgerEngine.canonScanPath -- KEEP-IN-SYNC.
// Run: node H:/prism/mcp-server/scripts/clt-print-bridge-probe.mjs
import fs from "node:fs";
import readline from "node:readline";

const LEDGER = "H:/prism/state/shared/scan-tracking/jm-die-scan-ledger.jsonl";
const DOCU_MANIFEST = "H:/PRISM/Docustrata/manifest.json";

const canon = (p) => p.replace(/\\/g, "/").toLowerCase();
const DOC_EXT = new Set([".pdf", ".tif", ".tiff"]);

function baseAndExt(canonPath) {
  const base = canonPath.split("/").pop() ?? "";
  const di = base.lastIndexOf(".");
  return { base, ext: di > 0 ? base.slice(di) : "" };
}

// 1. Live JM-tree print docs from the ledger (canon-deduped, existence-checked).
const seen = new Map(); // canon -> {raw, size}
const rl = readline.createInterface({ input: fs.createReadStream(LEDGER), crlfDelay: Infinity });
for await (const line of rl) {
  const t = line.trim();
  if (!t) continue;
  try {
    const r = JSON.parse(t);
    if (typeof r.abs_path !== "string" || !r.abs_path) continue;
    const k = canon(r.abs_path);
    const { ext } = baseAndExt(k);
    if (!DOC_EXT.has(ext)) continue;
    if (!seen.has(k)) seen.set(k, { raw: r.abs_path, size: typeof r.size_bytes === "number" ? r.size_bytes : 0 });
  } catch { /* counted upstream by stats(); this probe only joins */ }
}

// 2. Docustrata manifest: basename -> Set of file sizes.
const docu = JSON.parse(fs.readFileSync(DOCU_MANIFEST, "utf8"));
const docs = Array.isArray(docu.documents) ? docu.documents : [];
const byName = new Map(); // lower basename -> Set<size>
for (const d of docs) {
  const fn = typeof d?.filename === "string" ? d.filename.toLowerCase() : null;
  if (!fn) continue;
  if (!byName.has(fn)) byName.set(fn, new Set());
  const sz = typeof d?.file_size === "number" ? d.file_size : -1;
  byName.get(fn).add(sz);
}

// 3. Join live prints against the Docustrata name/size map.
let liveTotal = 0, confirmed = 0, nameOnly = 0, unmatched = 0, sizeMissing = 0;
for (const [k, info] of seen) {
  let exists = false;
  try { exists = fs.existsSync(info.raw); } catch { /* tombstone */ }
  if (!exists) continue;
  liveTotal++;
  const { base } = baseAndExt(k);
  const sizes = byName.get(base);
  if (!sizes) { unmatched++; continue; }
  if (info.size > 0 && sizes.has(info.size)) confirmed++;
  else { nameOnly++; if (info.size <= 0) sizeMissing++; }
}

console.log(JSON.stringify({
  ok: true,
  live_jm_tree_print_docs: liveTotal,
  docustrata_documents: docs.length,
  docustrata_distinct_filenames: byName.size,
  confirmed_name_and_size: confirmed,
  name_only_probable: nameOnly,
  name_only_with_missing_ledger_size: sizeMissing,
  unmatched_true_ocr_residue: unmatched,
  residue_pct_of_live_prints: liveTotal > 0 ? Math.round((unmatched / liveTotal) * 1000) / 10 : 0,
}));
