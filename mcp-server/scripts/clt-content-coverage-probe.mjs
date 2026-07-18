#!/usr/bin/env node
// clt-content-coverage-probe.mjs -- CLOSED-LOOP-TRAINING CLT-3b (slot:hotel, 2026-07-02).
//
// SUMMARY-ONLY probe: classifies every canon-unique path on the JM DIE scan ledger by
// content class (print_doc / cad_model / cam_project / cnc_program / other), existence-checks
// each against the live filesystem (live vs tombstone -- a ledger row count is never a
// coverage claim, only a live intersect is), and prints ONE compact JSON summary. Never
// prints paths or file contents (R5: the 465K-row work stays in code, not model context).
//
// Canon rule mirrors JMDieScanLedgerEngine.canonScanPath (NTFS-scope comparison key):
// backslash->forward-slash + lowercase. Duplicated here (plain .mjs, no TS import) --
// KEEP-IN-SYNC with mcp-server/src/engines/JMDieScanLedgerEngine.ts.
//
// Run: node H:/prism/mcp-server/scripts/clt-content-coverage-probe.mjs
import fs from "node:fs";
import readline from "node:readline";

const LEDGER = "H:/prism/state/shared/scan-tracking/jm-die-scan-ledger.jsonl";

const canon = (p) => p.replace(/\\/g, "/").toLowerCase();

const CAD = new Set([".stp", ".step", ".igs", ".iges", ".x_t", ".x_b", ".sldprt", ".sldasm",
  ".ipt", ".iam", ".idw", ".dwg", ".dxf", ".3dm", ".sat", ".prt", ".catpart"]);
const CAM = new Set([".mcx", ".mcx-5", ".mcx-6", ".mcx-7", ".mcx-8", ".mcx-9", ".emcam",
  ".cyc", ".esp", ".hmc", ".vnc", ".z3"]);
const PROG = new Set([".min", ".nc", ".eia", ".pim", ".cnc", ".tap", ".mpf", ".ptp",
  ".sub", ".lib", ".mac", ".ssb"]);
const DOC = new Set([".pdf", ".tif", ".tiff"]);

function classify(canonPath) {
  const base = canonPath.split("/").pop() ?? "";
  const di = base.lastIndexOf(".");
  const ext = di > 0 ? base.slice(di) : "";
  if (DOC.has(ext)) return "print_doc";
  if (CAD.has(ext)) return "cad_model";
  if (CAM.has(ext)) return "cam_project";
  // Extensionless files in this corpus are overwhelmingly CNC programs (Okuma/Fanuc
  // program files carry no extension) -- counted as cnc_program candidates.
  if (PROG.has(ext) || ext === "") return "cnc_program";
  return "other";
}

const seen = new Map(); // canon -> first raw path
const rl = readline.createInterface({ input: fs.createReadStream(LEDGER), crlfDelay: Infinity });
let parseErrors = 0;
for await (const line of rl) {
  const t = line.trim();
  if (!t) continue;
  try {
    const r = JSON.parse(t);
    if (typeof r.abs_path === "string" && r.abs_path.length > 0) {
      const k = canon(r.abs_path);
      if (!seen.has(k)) seen.set(k, r.abs_path);
    } else parseErrors++;
  } catch { parseErrors++; }
}

const byClassAll = {};
const byClassLive = {};
let live = 0, tombstone = 0;
for (const [k, raw] of seen) {
  const c = classify(k);
  byClassAll[c] = (byClassAll[c] ?? 0) + 1;
  let exists = false;
  try { exists = fs.existsSync(raw); } catch { /* treat unreadable as tombstone */ }
  if (exists) { live++; byClassLive[c] = (byClassLive[c] ?? 0) + 1; }
  else tombstone++;
}

console.log(JSON.stringify({
  ok: true,
  ledger: LEDGER,
  canon_unique: seen.size,
  live,
  tombstone,
  parse_errors: parseErrors,
  by_class_all: byClassAll,
  by_class_live: byClassLive,
}));
