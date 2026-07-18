#!/usr/bin/env node
// build-jm-part-library.mjs
// DB-EXPANSION / DB-GAP-LIST B2 — ingest the 30,890 orphaned `part.json` extraction
// sidecars under `H:/PRISM/JM DIE/Prism JM Die/**/part.json` into ONE consolidated,
// queryable store: the print-to-program part-number index.
//
// Each `part.json` is a phase18-build-part-library.py output keyed by part number,
// carrying the blueprint-program-join-v6 result: { partNumber, customer, matchConfidence,
// prints[], cncPrograms[], cadCam[], joinTableSource, ... }. 67% land under `_UNASSIGNED`.
// Pre-ingest these are pure dead PRISM-produced data — produced, never databased, no consumer.
//
// Source-of-truth pattern: scripts/build-jm-document-ledger.mjs (deterministic per-record
// ledger, zero silent drops, fail-loud reconciliation invariant).
//
// CLAUDE.md discipline applied:
//  - R12 fail-loud: every sidecar lands in exactly ONE disposition; reconciliation invariant
//    THROWS + exit 1 on any drift. Parse errors are an EXPLICIT bucket (malformed), never dropped.
//  - Stream-write the JSONL (createWriteStream, append per record) — never build a 30K-element
//    array in memory then writeFileSync.
//  - Atomic finalize: write to <out>.tmp then rename (tmp+rename); a crash mid-walk never
//    leaves a torn canonical store.
//  - Schema-versioned output (schemaVersion on the summary + per row).
//
// Usage:
//   node scripts/build-jm-part-library.mjs            # full build → canonical store + summary
//   node scripts/build-jm-part-library.mjs --dry-run  # walk + reconcile, NO writes (counts only)
//   node scripts/build-jm-part-library.mjs --limit N  # cap at N sidecars (smoke)

import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/PRISM/JM DIE/Prism JM Die";
const OUT_DIR = "H:/prism/state/shared/databases";
const STORE_PATH = path.join(OUT_DIR, "jm-part-library.jsonl");
const SUMMARY_PATH = path.join(OUT_DIR, "jm-part-library-summary.json");

const SCHEMA_VERSION = "1.0.0";

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const LIMIT = (() => {
  const i = argv.indexOf("--limit");
  return i >= 0 && argv[i + 1] ? parseInt(argv[i + 1], 10) : Infinity;
})();

// matchConfidence vocab observed in the corpus (sampled 3000): miss · loose · ambiguous · exact.
// Any value NOT in this set is routed to `other` (VISIBLE, never silently coerced).
const KNOWN_MATCH = new Set(["miss", "loose", "ambiguous", "exact"]);

/**
 * Lazily yield every `part.json` path under ROOT via an explicit DFS stack
 * (no recursion-depth limit, constant heap regardless of tree size).
 */
// Skipped-dir trace: an unreadable subtree (perm/EBUSY) is skipped rather than throwing
// the whole walk, but a SILENT skip would weaken the zero-drop guarantee (the reconciliation
// invariant only covers files actually yielded, not dirs we never entered). So skips are
// counted + surfaced in the summary — a non-zero count is a VISIBLE undercount trace, not a
// silent gap (scrutiny A/C P3, 2026-06-08).
const walkSkips = { count: 0, dirs: [] };

function* walkPartJson(root) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      walkSkips.count++;
      if (walkSkips.dirs.length < 50) walkSkips.dirs.push(`${dir} (${e?.code ?? "ERR"})`);
      continue; // unreadable dir (perm/EBUSY) — skip, never throw the whole walk
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && ent.name === "part.json") yield full;
    }
  }
}

/**
 * Normalize one raw part.json sidecar into a flat, queryable row.
 * Returns { row, disposition } where disposition ∈ assigned|unassigned (+ programLink flag).
 */
function normalize(raw, srcPath) {
  const customer = typeof raw.customer === "string" ? raw.customer : "";
  const isUnassigned = customer === "_UNASSIGNED" || customer === "";
  const prints = Array.isArray(raw.prints) ? raw.prints : [];
  const cncPrograms = Array.isArray(raw.cncPrograms) ? raw.cncPrograms : [];
  const cadCam = Array.isArray(raw.cadCam) ? raw.cadCam : [];
  const mc = typeof raw.matchConfidence === "string" ? raw.matchConfidence : "other";

  const row = {
    schemaVersion: SCHEMA_VERSION,
    partNumber: raw.partNumber ?? raw.partNumberNormalized ?? "",
    partNumberNormalized: raw.partNumberNormalized ?? raw.partNumber ?? "",
    customer,
    customerSource: raw.customerSource ?? null,
    matchConfidence: KNOWN_MATCH.has(mc) ? mc : "other",
    rawMatchConfidence: mc, // preserve the original even when routed to `other`
    assigned: !isUnassigned,
    printCount: prints.length,
    programCount: cncPrograms.length,
    cadCamCount: cadCam.length,
    hasProgramLink: cncPrograms.length > 0,
    hasCadLink: cadCam.length > 0,
    joinTableSource: raw.joinTableSource ?? null,
    // keep the join detail (prints/programs/cad) so the store is self-contained for lookups
    prints,
    cncPrograms,
    cadCam,
    sourceSidecar: srcPath.replace(/\\/g, "/"),
    createdAt: raw.createdAt ?? null,
    createdBy: raw.createdBy ?? null,
  };
  return { row, isUnassigned };
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`FATAL: source root not found: ${ROOT}`);
    process.exit(1);
  }
  if (!DRY_RUN) fs.mkdirSync(OUT_DIR, { recursive: true });

  const tmpPath = STORE_PATH + ".tmp";
  const ws = DRY_RUN ? null : fs.createWriteStream(tmpPath, { encoding: "utf-8" });
  // Symmetric fail-loud on a write error (disk-full / EIO): clean up the tmp orphan and
  // exit(1) like the reconciliation-failure path — never leave an unhandled stream 'error'
  // to crash via uncaught exception, and never rename a partial tmp into the canonical store.
  if (ws) {
    ws.on("error", (e) => {
      try { fs.unlinkSync(tmpPath); } catch {}
      console.error(`FATAL: store write failed: ${e?.message ?? e}`);
      process.exit(1);
    });
  }

  let seen = 0;
  let written = 0;
  let malformed = 0;
  let assigned = 0;
  let unassigned = 0;
  let withProgram = 0;
  let withCad = 0;
  const matchHist = Object.create(null);
  const customerHist = Object.create(null);

  for (const srcPath of walkPartJson(ROOT)) {
    if (seen >= LIMIT) break;
    seen++;
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(srcPath, "utf-8"));
    } catch {
      malformed++;
      // Zero-drop: a malformed sidecar STILL lands as an explicit malformed row.
      if (ws) ws.write(JSON.stringify({ schemaVersion: SCHEMA_VERSION, malformed: true, sourceSidecar: srcPath.replace(/\\/g, "/") }) + "\n");
      written++;
      continue;
    }
    const { row, isUnassigned } = normalize(raw, srcPath);
    if (isUnassigned) unassigned++; else assigned++;
    if (row.hasProgramLink) withProgram++;
    if (row.hasCadLink) withCad++;
    matchHist[row.matchConfidence] = (matchHist[row.matchConfidence] || 0) + 1;
    const cKey = row.customer || "(empty)";
    customerHist[cKey] = (customerHist[cKey] || 0) + 1;
    if (ws) ws.write(JSON.stringify(row) + "\n");
    written++;
  }

  // ── RECONCILIATION INVARIANT (R12 fail-loud) ──────────────────────────────
  // Every sidecar must land in exactly one place: written == seen, and the
  // assigned/unassigned/malformed partition must sum to seen.
  const partitioned = assigned + unassigned + malformed;
  const invariantOk = written === seen && partitioned === seen;
  if (!invariantOk) {
    console.error(
      `FATAL: reconciliation invariant violated — seen=${seen} written=${written} ` +
      `assigned=${assigned} unassigned=${unassigned} malformed=${malformed} (sum=${partitioned})`
    );
    if (ws) { ws.end(); try { fs.unlinkSync(tmpPath); } catch {} }
    process.exit(1);
  }

  const summary = {
    schemaVersion: SCHEMA_VERSION,
    generated: new Date().toISOString(),
    milestone: "DB-EXPANSION / DB-GAP-LIST-B2",
    sourceRoot: ROOT,
    storePath: DRY_RUN ? "(dry-run, not written)" : STORE_PATH.replace(/\\/g, "/"),
    counts: {
      sidecarsSeen: seen,
      rowsWritten: written,
      assigned,
      unassigned,
      malformed,
      withProgramLink: withProgram,
      withCadLink: withCad,
      // pct denominators are the PARSED population (seen - malformed), so the rate describes
      // the records the counts actually came from (P3 scrutiny — malformed rows carry no
      // assigned/program fields, so including them in the denominator understated the rate).
      parsedOk: seen - malformed,
      assignedPct: seen - malformed ? +((assigned / (seen - malformed)) * 100).toFixed(1) : 0,
      programLinkPct: seen - malformed ? +((withProgram / (seen - malformed)) * 100).toFixed(1) : 0,
    },
    matchConfidenceHistogram: matchHist,
    topCustomers: Object.entries(customerHist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([customer, count]) => ({ customer, count })),
    reconciliation: { invariantOk, formula: "written == seen && assigned+unassigned+malformed == seen" },
    // Non-zero walkSkips.count = an unreadable subtree was skipped → the yielded-file count is
    // an undercount of what's on disk. VISIBLE here so a silent gap never masquerades as complete.
    walkSkips: { count: walkSkips.count, sample: walkSkips.dirs },
  };

  if (!DRY_RUN) {
    ws.end();
    // atomic finalize: tmp → canonical only after the stream flushes cleanly
    ws.on("finish", () => {
      fs.renameSync(tmpPath, STORE_PATH);
      fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n", "utf-8");
      console.log(JSON.stringify(summary, null, 2));
    });
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
}

main();
