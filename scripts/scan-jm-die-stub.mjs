#!/usr/bin/env node
/**
 * scan-jm-die-stub.mjs — Pure-mjs full-corpus discovery walk.
 *
 * Walks H:/PRISM/JM DIE recursively, computes per-file sha256, infers
 * customer/partNumber from the JM DIE/<CUSTOMER>/<PART>/ pattern, and
 * writes one PrintCorpusRow per file into rows.jsonl with
 *   scanStatus = "extracted"
 *   worstConfidenceFloor = "low_no_vision"  (stub backend — no real OCR)
 *   accuracyAgainstGroundTruth = null
 *   operatorVerdict = "pending"
 *
 * This produces REAL corpus discovery data without depending on the
 * compiled dist/ build. The rows correctly require operator review
 * (requiresOperatorReview=true) so the 100% gate honestly continues to
 * block — which is the right behaviour.
 *
 * Usage:
 *   node scripts/scan-jm-die-stub.mjs                # full corpus
 *   node scripts/scan-jm-die-stub.mjs --limit 1000   # bounded subset
 *   node scripts/scan-jm-die-stub.mjs --progress 100 # report every N
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = "H:/PRISM/JM DIE";
const DIR = "H:/prism/state/shared/print-corpus-tables";
const ROWS_FILE = "rows.jsonl";
const INDEX_FILE = "index.json";
const CHECKPOINT_FILE = "checkpoint.json";

const FORMATS = new Set(["pdf", "tif", "tiff", "png", "jpg", "jpeg", "dxf", "step", "iges", "svg"]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--root") args.root = argv[++i];
    else if (a === "--writer-dir") args.writerDir = argv[++i];
    else if (a === "--progress") args.progress = Number(argv[++i]);
  }
  return args;
}

function detectFormat(fp) {
  const ext = path.extname(fp).slice(1).toLowerCase();
  return FORMATS.has(ext) ? ext : null;
}

function customerInfer(fp) {
  const norm = fp.replace(/\\/g, "/");
  const m = norm.match(/\/JM DIE\/([^/]+)\/([^/]+)\//i);
  if (m) return { customer: m[1], partNumber: m[2], revision: null };
  return { customer: null, partNumber: null, revision: null };
}

function shaFileSync(fp) {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(fp, "r");
  try {
    const buf = Buffer.allocUnsafe(1 << 20);
    while (true) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n <= 0) break;
      hash.update(buf.subarray(0, n));
    }
    return hash.digest("hex");
  } finally {
    try { fs.closeSync(fd); } catch { /* ignore */ }
  }
}

function loadIndex() {
  const p = path.join(DIR, INDEX_FILE);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return {}; }
}

function saveIndex(idx) {
  const p = path.join(DIR, INDEX_FILE);
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(idx));
  fs.renameSync(tmp, p);
}

function appendRow(row) {
  fs.appendFileSync(path.join(DIR, ROWS_FILE), JSON.stringify(row) + "\n");
  if (row.customer) {
    const slug = row.customer.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "unknown";
    fs.appendFileSync(path.join(DIR, "by-customer", `${slug}.jsonl`), JSON.stringify(row) + "\n");
  }
}

function updateCheckpoint(sha, scannedAt) {
  const p = path.join(DIR, CHECKPOINT_FILE);
  let cp;
  if (fs.existsSync(p)) {
    try { cp = JSON.parse(fs.readFileSync(p, "utf-8")); } catch { /* default below */ }
  }
  cp = cp ?? { schemaVersion: "1.0.0", shasSeen: [], lastScannedAt: scannedAt, totalRowsWritten: 0 };
  if (!cp.shasSeen.includes(sha)) {
    cp.shasSeen.push(sha);
    cp.totalRowsWritten += 1;
  }
  cp.lastScannedAt = scannedAt;
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(cp, null, 2));
  fs.renameSync(tmp, p);
}

function makeStubRow(fp, sha, format, prov) {
  const ts = new Date().toISOString();
  return {
    rowId: `jm-die-${sha.slice(0, 12)}`,
    sourceSha256: sha,
    sourcePath: fp,
    sourceKind: "jm_die",
    sourceFormat: format,
    pageCount: 1,
    customer: prov.customer,
    partNumber: prov.partNumber,
    revision: prov.revision,
    pages: [
      {
        extractionId: `stub-${sha.slice(0, 12)}`,
        pdfPath: fp,
        page: 1,
        familyMatchId: null,
        regions: [],
        sources: [],
        confidenceFloor: "low_no_vision",
        contradictionsDetected: ["stub-backend: discovery-only, no real OCR run"],
        extractedAt: ts,
        backendId: "scan-jm-die-stub-v1",
      },
    ],
    worstConfidenceFloor: "low_no_vision",
    totalRegions: 0,
    weakestRegionConfidence: 0,
    scanStatus: "extracted",
    scannedAt: ts,
    scanLatencyMs: 0,
    groundTruthAvailable: false,
    groundTruthSource: "none",
    accuracyAgainstGroundTruth: null,
    accuracyVerifiedAt: null,
    requiresOperatorReview: true,
    operatorReviewedBy: null,
    operatorReviewedAt: null,
    operatorVerdict: "pending",
    isAnonymizable: prov.customer === null,
    anonymizationBlockedReason: prov.customer ? `customer name '${prov.customer}' present in path` : null,
  };
}

function* walk(root) {
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // permission denied / symlink loop etc.
    }
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(fp);
      } else if (e.isFile()) {
        const fmt = detectFormat(fp);
        if (fmt) yield { fp, fmt };
      }
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = args.root ?? ROOT;
  const limit = args.limit;
  const progressEvery = args.progress ?? 50;

  fs.mkdirSync(DIR, { recursive: true });
  fs.mkdirSync(path.join(DIR, "by-customer"), { recursive: true });

  const idx = loadIndex();
  let discovered = 0;
  let scanned = 0;
  let skipped = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (const { fp, fmt } of walk(root)) {
    discovered++;
    if (limit !== undefined && discovered > limit) break;
    try {
      const sha = shaFileSync(fp);
      if (Object.prototype.hasOwnProperty.call(idx, sha)) {
        skipped++;
      } else {
        const prov = customerInfer(fp);
        const row = makeStubRow(fp, sha, fmt, prov);
        appendRow(row);
        idx[sha] = scanned; // approx offset; we don't track exact
        updateCheckpoint(sha, row.scannedAt);
        scanned++;
      }
    } catch (e) {
      failed++;
    }
    if (discovered % progressEvery === 0) {
      const elapsedMs = Date.now() - startedAt;
      const rate = elapsedMs > 0 ? (discovered / (elapsedMs / 1000)).toFixed(1) : "?";
      process.stderr.write(`  discovered=${discovered} scanned=${scanned} skipped=${skipped} failed=${failed} rate=${rate}/s\n`);
    }
  }

  saveIndex(idx);

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✓ discovered  : ${discovered}`);
  console.log(`✓ scanned     : ${scanned}`);
  console.log(`✓ skipped     : ${skipped}`);
  console.log(`✓ failed      : ${failed}`);
  console.log(`✓ elapsed     : ${elapsedSec}s`);
  console.log(`✓ rows.jsonl  : ${path.join(DIR, ROWS_FILE)}`);
  console.log(`✓ index.json  : ${path.join(DIR, INDEX_FILE)}`);
  console.log(`✓ All ${scanned} rows are scanStatus=extracted (NOT verified_100pct).`);
  console.log(`  requiresOperatorReview=true on every row — 100% gate will block.`);
}

main();
