#!/usr/bin/env node
// scripts/build-print-corpus-manifest.mjs
//
// U-XRAY-PRINT-CORPUS-MANIFEST (STEP 2 of the OCR-training-scope synthesis) — define the REAL
// denominator of "all prints in the JM folder / Docustrata" by SEARCHING juliett's already-extracted
// index (mcp-server/data/jm-die-database/tables/documents.jsonl, 111,745 v3-classified docs), NEVER by
// re-OCRing the 257K corpus (the no-re-OCR soul, R8). Emits a counted 3-bucket manifest + a VLM
// worklist so the closed-loop runner processes drawings, not the 79K business documents.
//
// THE DATA REALITY (verified 2026-06-08, why the buckets are shaped this way):
//   - documents.jsonl carries per-doc: role, role_tier, has_text_layer, needs_ocr, print_score
//     (a SIGNED integer drawing-likeness score, observed −48..+21; higher = more drawing-like),
//     disk_path, mime.
//   - EVERY text-layer doc ALSO has needs_ocr=true (0 docs are text-layer-sufficient) — the text
//     layers are universally partial (title block captured, dimension callouts not). So there is no
//     free "read the text layer" lane; a drawing's dimensions need vision extraction.
//   - role=PRINT (7,616) are the explicitly-classified engineering prints; the bulk are business
//     paperwork (NOTE/SALES_ORDER/CLOSED_ORDER/SCAN_BUSINESS/PACKING_SLIP/QUOTE) — excluded.
//
// THREE BUCKETS:
//   A drawing_print      — role∈DRAWING_ROLES OR print_score≥PRINT_SCORE_FLOOR. The VLM worklist.
//   B ambiguous_scan     — role∈{SCAN_GENERIC,UNKNOWN,IMPORTED_BATCH} & needs_ocr & not clearly biz.
//                          May hide prints; lower priority, processed after A (operator-review tier).
//   C excluded           — business paperwork OR no drawing signal. NOT processed (reason logged).
//
// USAGE:
//   node scripts/build-print-corpus-manifest.mjs [--docs <documents.jsonl>] [--out-dir <dir>]
//        [--print-score-floor 5] [--emit-worklist] [--worklist-bucket drawing|drawing+ambiguous]
//        [--worklist-limit N] [--json]
// EXIT: 0 = ok · 3 = index not found / args error.

import { existsSync, mkdirSync, writeFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DOCS = join(REPO_ROOT, "mcp-server", "data", "jm-die-database", "tables", "documents.jsonl");
const DEFAULT_OUT = join(REPO_ROOT, "state", "shared", "ocr-training-loop");

// Roles that ARE engineering drawings/prints (the VLM target).
export const DRAWING_ROLES = Object.freeze(new Set(["PRINT", "LASER_SHEET"]));
// Roles that MIGHT hide a drawing (scanned/unclassified) — bucket B, processed after A.
export const AMBIGUOUS_ROLES = Object.freeze(new Set(["SCAN_GENERIC", "UNKNOWN", "IMPORTED_BATCH"]));
// Roles that are business paperwork — never a drawing (bucket C).
export const BUSINESS_ROLES = Object.freeze(new Set([
  "NOTE", "SALES_ORDER", "CLOSED_ORDER", "SCAN_BUSINESS", "PACKING_SLIP",
  "QUOTE", "SHIPPING", "TAX_FINANCIAL", "INVOICE", "RECEIPT", "STATEMENT",
]));
// print_score is a signed drawing-likeness integer; at/above this floor a doc is a drawing even if
// its role wasn't classified PRINT. Conservative default (the PRINT docs observed score ~21).
const DEFAULT_PRINT_SCORE_FLOOR = 5;

/**
 * Pure: classify one document record into a bucket + reason. The single source of the bucketing
 * rule — both the manifest counts and the worklist emit flow through this so they can never diverge.
 * @param {object} doc  a documents.jsonl record
 * @param {{printScoreFloor?:number}} opts
 * @returns {{bucket:"drawing"|"ambiguous"|"excluded", reason:string}}
 */
export function classifyDoc(doc, opts = {}) {
  const floor = Number.isFinite(opts.printScoreFloor) ? opts.printScoreFloor : DEFAULT_PRINT_SCORE_FLOOR;
  const role = doc && typeof doc.role === "string" ? doc.role : "UNKNOWN";
  // Coerce a string score ("21") too — Number.isFinite("21") is false, which would silently zero a
  // real drawing's score and leak it to excluded (lost data). The corpus stores an int today, but
  // absorb the string form defensively (reviewer-A P2).
  const psNum = Number(doc && doc.print_score);
  const ps = Number.isFinite(psNum) ? psNum : 0;
  const isPdf = !doc || doc.mime == null || doc.mime === "application/pdf";

  if (!isPdf) return { bucket: "excluded", reason: `non-pdf mime ${doc && doc.mime}` };
  // Business paperwork is never a drawing — even with an accidental positive print_score.
  if (BUSINESS_ROLES.has(role)) return { bucket: "excluded", reason: `business role ${role}` };
  // Explicit drawing role OR strong drawing-score → the VLM worklist.
  if (DRAWING_ROLES.has(role) || ps >= floor) return { bucket: "drawing", reason: DRAWING_ROLES.has(role) ? `drawing role ${role}` : `print_score ${ps}>=${floor}` };
  // Scanned/unclassified that still needs OCR → might hide a print → ambiguous (lower priority).
  if (AMBIGUOUS_ROLES.has(role) && doc && doc.needs_ocr) return { bucket: "ambiguous", reason: `ambiguous role ${role} needs_ocr` };
  return { bucket: "excluded", reason: `no drawing signal (role ${role}, print_score ${ps})` };
}

function parseArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const has = (f) => args.includes(f);
  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };
  return {
    docs: get("--docs", DEFAULT_DOCS),
    outDir: get("--out-dir", DEFAULT_OUT),
    printScoreFloor: num("--print-score-floor", DEFAULT_PRINT_SCORE_FLOOR),
    emitWorklist: has("--emit-worklist"),
    worklistBucket: get("--worklist-bucket", "drawing"),
    worklistLimit: num("--worklist-limit", 0), // 0 = no limit
    json: has("--json"),
  };
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  if (!existsSync(opts.docs)) { console.error(`ERROR: index not found: ${opts.docs}`); return 3; }
  mkdirSync(opts.outDir, { recursive: true });

  const counts = { drawing: 0, ambiguous: 0, excluded: 0 };
  const excludeReasons = {};
  const drawingByRole = {};
  const ambiguousByRole = {};
  const worklistWant = opts.worklistBucket === "drawing+ambiguous" ? new Set(["drawing", "ambiguous"]) : new Set(["drawing"]);
  const worklistPaths = [];
  let total = 0, noPath = 0;

  const rl = createInterface({ input: createReadStream(opts.docs, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    let doc;
    try { doc = JSON.parse(t); } catch { continue; } // skip a malformed line, never abort
    total++;
    const { bucket, reason } = classifyDoc(doc, { printScoreFloor: opts.printScoreFloor });
    counts[bucket]++;
    if (bucket === "excluded") excludeReasons[reason.split("(")[0].trim()] = (excludeReasons[reason.split("(")[0].trim()] || 0) + 1;
    else {
      const role = doc.role || "UNKNOWN";
      if (bucket === "drawing") drawingByRole[role] = (drawingByRole[role] || 0) + 1;
      else ambiguousByRole[role] = (ambiguousByRole[role] || 0) + 1;
    }
    if (opts.emitWorklist && worklistWant.has(bucket)) {
      const path = doc.disk_path || doc.path || null;
      if (!path) noPath++;
      else if (opts.worklistLimit === 0 || worklistPaths.length < opts.worklistLimit) worklistPaths.push(path);
    }
  }

  const manifest = {
    schemaVersion: "1.0.0",
    generated_from: opts.docs,
    print_score_floor: opts.printScoreFloor,
    total_docs: total,
    buckets: counts,
    drawing_by_role: drawingByRole,
    ambiguous_by_role: ambiguousByRole,
    excluded_top_reasons: Object.fromEntries(Object.entries(excludeReasons).sort((a, b) => b[1] - a[1]).slice(0, 12)),
    no_path_skipped: noPath,
    note: "Buckets via SEARCH of juliett's documents.jsonl (no re-OCR). drawing = VLM worklist; ambiguous = scanned/unclassified (lower priority, may hide prints); excluded = business paperwork or no drawing signal. EVERY text-layer doc also needs_ocr (text layers are partial) — no free read-the-text-layer lane.",
  };
  const manifestPath = join(opts.outDir, "print-corpus-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  let worklistPath = null;
  if (opts.emitWorklist) {
    worklistPath = join(opts.outDir, `corpus-worklist-${opts.worklistBucket.replace("+", "-")}.txt`);
    writeFileSync(worklistPath, `# print-corpus VLM worklist · bucket=${opts.worklistBucket} · ${worklistPaths.length} prints · gen ${manifestPath}\n` + worklistPaths.join("\n") + (worklistPaths.length ? "\n" : ""));
  }

  // ALARM if the drawing bucket is implausibly large (a filter leak — STEP 2 success criterion).
  const ALARM_DRAWING_MAX = 60000;
  const alarm = counts.drawing > ALARM_DRAWING_MAX;

  console.log(`\n📐 PRINT-CORPUS MANIFEST (${total} docs scanned)`);
  console.log(`  drawing   (VLM worklist): ${counts.drawing}   ${JSON.stringify(drawingByRole)}`);
  console.log(`  ambiguous (scan/unclass): ${counts.ambiguous}   ${JSON.stringify(ambiguousByRole)}`);
  console.log(`  excluded  (biz/no-signal): ${counts.excluded}`);
  console.log(`     top reasons: ${JSON.stringify(manifest.excluded_top_reasons)}`);
  if (worklistPath) console.log(`  → worklist (${worklistPaths.length}): ${worklistPath}`);
  console.log(`  → manifest: ${manifestPath}`);
  if (alarm) console.log(`  ⚠ ALARM: drawing bucket ${counts.drawing} > ${ALARM_DRAWING_MAX} — possible filter leak, review before scaling.`);
  if (opts.json) console.log(JSON.stringify({ ...manifest, worklist: worklistPath, worklist_count: worklistPaths.length, alarm }));
  return 0;
}

// Run-as-main guard — importing this module (e.g. from the test, for classifyDoc) must NOT trigger
// the 111K-doc scan / manifest write / process.exit (reviewer-B P1: a pure-fn import did production
// I/O + coupled test exit status to the index's presence).
const invokedDirectly = argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().then((code) => exit(code)).catch((e) => { console.error("FATAL:", e instanceof Error ? e.stack : String(e)); exit(3); });
}
