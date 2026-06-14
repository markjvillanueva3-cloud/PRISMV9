#!/usr/bin/env node
/**
 * seed-jm-die-scan-ledger — JM-DIE-FLEET-SCAN-MS0 / U-FS03
 *
 * Seeds state/shared/scan-tracking/jm-die-scan-ledger.jsonl with the files
 * the prior baselines already processed, so JMDieScanCoordinatorEngine.plan()
 * skips them on the next cold run.
 *
 * Seed scopes (mirrors the E2E ingest parameters that produced the baselines):
 *   • CNC LATHE/* (limit 200) → source="program-analysis", kind="cnc-program"
 *   • _PART LIBRARY/* (limit 530) → source="financial-baseline", kind="docustrata"
 *
 * This is intentionally a re-walk of those specific subdirs with the same
 * limit the original ingests used — semantically: "the program-analysis E2E
 * touched these 200 files; the financial-baseline E2E touched these 530".
 *
 * Idempotent: re-running just re-appends; loadScanned() de-dups via Set.
 *
 * Usage: node H:/prism/scripts/seed-jm-die-scan-ledger.mjs [--dry-run]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const ARCHIVE_ROOT = "H:/prism/JM DIE";
const LEDGER_PATH = "H:/prism/state/shared/scan-tracking/jm-die-scan-ledger.jsonl";
const DRY_RUN = process.argv.includes("--dry-run");

const CNC_PROGRAM_EXTENSIONS = new Set(["nc", "min", "mpf", "eia", "iso", "pim", "h", "spf", "ssb", "f"]);
const DOCUSTRATA_EXTENSIONS = new Set(["pdf", "docx", "doc", "xls", "xlsx", "jpg", "jpeg", "png", "tif", "tiff"]);

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function shaShort(absPath) {
  return crypto.createHash("sha256").update(absPath).digest("hex").slice(0, 8);
}

function walk(root, limit, out) {
  if (out.length >= limit) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    if (out.length >= limit) return;
    const abs = path.join(root, ent.name);
    if (ent.isDirectory()) walk(abs, limit, out);
    else if (ent.isFile()) {
      let stat; try { stat = fs.statSync(abs); } catch { continue; }
      out.push({ abs, ext: extOf(ent.name), size: stat.size, mtime: stat.mtime.toISOString() });
    }
  }
}

function classify(ext) {
  if (CNC_PROGRAM_EXTENSIONS.has(ext)) return "cnc-program";
  if (DOCUSTRATA_EXTENSIONS.has(ext)) return "docustrata";
  return "other";
}

function seedSubdir(subdir, limit, source, family) {
  const sub = path.join(ARCHIVE_ROOT, subdir);
  if (!fs.existsSync(sub)) {
    console.warn(`[seed] missing subdir, skipping: ${subdir}`);
    return [];
  }
  const found = [];
  walk(sub, limit, found);
  const nowIso = new Date().toISOString();
  return found.map((f) => ({
    abs_path: f.abs.replace(/\\/g, "/"),
    sha_short: shaShort(f.abs.replace(/\\/g, "/")),
    size_bytes: f.size,
    mtime_iso: f.mtime,
    scanned_at: nowIso,
    source,
    machine_family: family,
    kind: classify(f.ext),
  }));
}

function main() {
  if (!fs.existsSync(ARCHIVE_ROOT)) {
    console.error(`[seed] R12 fail-loud: archive root missing: ${ARCHIVE_ROOT}`);
    process.exit(2);
  }
  const rows = [];
  console.log("[seed] walking CNC LATHE/ (limit 200) — program-analysis E2E");
  rows.push(...seedSubdir("CNC LATHE", 200, "program-analysis", "lathe"));
  console.log("[seed] walking _PART LIBRARY/ (limit 530) — financial-baseline E2E");
  rows.push(...seedSubdir("_PART LIBRARY", 530, "financial-baseline", "mixed"));
  console.log(`[seed] total rows to write: ${rows.length}`);
  if (DRY_RUN) {
    console.log("[seed] --dry-run: not writing ledger");
    console.log("[seed] sample first 3 rows:");
    for (const r of rows.slice(0, 3)) console.log("  ", JSON.stringify(r));
    return;
  }
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  const lines = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  fs.appendFileSync(LEDGER_PATH, lines, "utf8");
  console.log(`[seed] wrote ${rows.length} rows → ${LEDGER_PATH}`);
}

main();
