#!/usr/bin/env node
/**
 * ingest-jm-die-cad-corpus.mjs — CAM-AI-TRAINING-MS0/U-CAMT-A01
 *
 * Walks the JM Die archive (H:/PRISM/JM DIE/), classifies every real CAD
 * file via CADCorpusIngesterEngine's pure-logic classify() path, and emits:
 *   state/shared/corpus/jm-die-corpus.jsonl       — one CorpusFileEntry per line
 *   state/shared/corpus/jm-die-corpus.stats.json  — aggregate stats
 *
 * This is METADATA-ONLY corpus assembly — no STEP body parse. The training
 * corpus needs provenance + extension + customer-attribution + file-size
 * facts to seed downstream NN/GNN/LoRA pipelines. Deep B-Rep parse is lazy,
 * triggered per-template-build in Phase B.
 *
 * Real-data discipline (per operator work-order 2026-05-25):
 *   - NO synthetic / generated / faked CAD
 *   - Every entry traces back to a real JM Die customer folder
 *   - Files are not copied, only catalogued (canonical sourcePath preserved)
 *
 * Per [[feedback_commit_to_slot_worktree]] this script lives at
 * H:/prism-slot-kilo/scripts/ on slot/kilo branch and writes outputs to
 * H:/prism-slot-kilo/state/shared/corpus/.
 *
 * Usage:
 *   node scripts/ingest-jm-die-cad-corpus.mjs [--root <path>] [--out <dir>]
 *
 * Exit codes:
 *   0 — success, at least 1 entry catalogued
 *   1 — root path missing or zero files found (real-data shop should never be empty)
 *   2 — write failure
 */

import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { argv, exit, stdout } from "node:process";

// ── Args ────────────────────────────────────────────────────────────────────

function parseArgs(av) {
  const out = { root: "H:/PRISM/JM DIE", outDir: "state/shared/corpus", limit: 0 };
  for (let i = 2; i < av.length; i++) {
    const a = av[i];
    if (a === "--root") out.root = av[++i];
    else if (a === "--out") out.outDir = av[++i];
    else if (a === "--limit") out.limit = parseInt(av[++i] || "0", 10) || 0;
  }
  return out;
}

// ── Supported CAD extensions (mirrors CADCorpusIngesterEngine + JT/3DM/CATPart) ──

const SUPPORTED_EXTENSIONS = new Set([
  ".step", ".stp", ".iges", ".igs", ".sldprt", ".sldasm", ".ipt", ".iam",
  ".x_t", ".x_b", ".sat", ".3dm", ".catpart", ".catproduct", ".prt", ".asm",
  ".f3d", ".3mf", ".brep", ".jt", ".obj", ".stl",
]);

// ── Classifier (mirror of CADCorpusIngesterEngine pure-logic path) ──────────

const JM_DIE_CUSTOMERS_UPPER = new Set([
  // Permissive seed set — folder names not in this set fall through to the
  // machine-category-folder heuristic in detectCustomer(). The shipped
  // CADCorpusIngesterEngine pulls the full list from src/data/jm-die-profile.ts.
  "ITW", "ALCOA", "OPTIMAS", "SFS", "HOLO-KROME", "FASTENAL", "BOSSARD",
  "ARCONIC", "ACUMENT", "PARKER", "STANLEY", "EMHART", "PEM", "PENN-ENGINEERING",
]);

function normalizePathSep(p) {
  return p.replace(/\\/g, "/");
}

function detectExtension(path) {
  const norm = normalizePathSep(path).toLowerCase();
  for (const e of SUPPORTED_EXTENSIONS) {
    if (norm.endsWith(e)) return e;
  }
  return null;
}

function detectMachineCategory(path) {
  const upper = normalizePathSep(path).toUpperCase();
  if (upper.includes("/CNC LATHE/") || upper.includes("OKUMA") || upper.includes("/LATHE/")) return "lathe";
  if (upper.includes("/WIRE EDM/") || upper.includes("WIREEDM") || upper.includes("WIRE-EDM")) return "wire_edm";
  if (upper.includes("/SINKER EDM/") || upper.includes("SINKER")) return "sinker_edm";
  if (upper.includes("/CNC MILL HAAS/") || upper.includes("HAAS")) return "mill";
  if (upper.includes("HURCO")) return "hurco";
  if (upper.includes("HYPERMILL") || upper.includes("/HMC/")) return "hypermill";
  if (upper.includes("/CNC MILL/") || upper.includes("/MILL/")) return "mill";
  if (upper.includes("/QUEUE/") || upper.includes("/UNFILED")) return "unknown";
  return "unknown";
}

function detectCustomer(path) {
  const norm = normalizePathSep(path);
  const parts = norm.split("/").filter(Boolean);
  for (const seg of parts) {
    const up = seg.toUpperCase();
    if (JM_DIE_CUSTOMERS_UPPER.has(up)) return up;
    for (const c of JM_DIE_CUSTOMERS_UPPER) {
      if (up.startsWith(c + "-") || up.startsWith(c + "_") || up.startsWith(c + " ")) return c;
    }
  }
  // Fall back to first folder under a known machine-category marker.
  // Layout convention: <root>/<machine-category>/<CUSTOMER>/<job>/<file>
  const lower = norm.toLowerCase();
  const machineMarkers = [
    "/cnc lathe/", "/cnc mill haas/", "/wire edm/", "/sinker edm/",
    "/hurco cnc programs/", "/jm die company/", "/lathe/", "/okuma/",
  ];
  for (const m of machineMarkers) {
    const idx = lower.indexOf(m);
    if (idx < 0) continue;
    const tail = norm.slice(idx + m.length);
    const next = tail.split("/").filter(Boolean)[0];
    if (next && /^[A-Z0-9][A-Z0-9 _\-\.&]+$/i.test(next)) return next.toUpperCase();
  }
  return "UNKNOWN";
}

// ── Walker (bounded depth, fault-tolerant) ──────────────────────────────────
// readdir/stat are intentionally try/caught: an entry can vanish between
// the readdir snapshot and our stat call (renamed by another process,
// transient antivirus lock, network share blip). We MUST keep walking the
// rest of the tree — a missing leaf is not a fatal error for a corpus
// catalog. We surface aggregate read failures via stderr at end-of-walk.

function walkCad(rootDir, opts = {}) {
  const { maxDepth = 12, onProgress } = opts;
  const out = [];
  const readdirFailures = [];
  const statFailures = [];
  let scanned = 0;
  const stack = [{ path: rootDir, depth: 0 }];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur.path, { withFileTypes: true });
    } catch (err) {
      // Permission denied / network share blip / vanished dir.
      // Record it, skip — corpus catalog must remain restartable.
      readdirFailures.push({ path: cur.path, code: err?.code || "UNKNOWN" });
      continue;
    }
    for (const e of entries) {
      const p = join(cur.path, e.name);
      if (e.isDirectory()) {
        if (cur.depth < maxDepth) stack.push({ path: p, depth: cur.depth + 1 });
      } else if (e.isFile()) {
        scanned++;
        const ext = detectExtension(p);
        if (!ext) continue;
        let bytes = 0;
        try {
          bytes = statSync(p).size;
        } catch (err) {
          // File vanished between readdir and stat — record + still
          // catalog the entry with bytes=0 so provenance survives.
          statFailures.push({ path: p, code: err?.code || "UNKNOWN" });
        }
        out.push({ path: p, ext, bytes });
        if (out.length % 1000 === 0 && onProgress) onProgress({ scanned, found: out.length });
      }
    }
  }
  return { files: out, totalScanned: scanned, readdirFailures, statFailures };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(argv);
  const startedAt = new Date().toISOString();
  stdout.write(`[ingest-jm-die-cad-corpus] root=${args.root} out=${args.outDir} started=${startedAt}\n`);

  if (!existsSync(args.root)) {
    stdout.write(`FATAL: root not found: ${args.root}\n`);
    exit(1);
  }

  const t0 = Date.now();
  const { files, totalScanned, readdirFailures, statFailures } = walkCad(args.root, {
    maxDepth: 14,
    onProgress: ({ scanned, found }) => {
      stdout.write(`  ... scanned=${scanned} cad_found=${found}\n`);
    },
  });
  const walkMs = Date.now() - t0;
  stdout.write(`[walk] scanned=${totalScanned} cad_found=${files.length} in ${walkMs}ms\n`);
  if (readdirFailures.length) stdout.write(`[walk] readdir_failures=${readdirFailures.length}\n`);
  if (statFailures.length) stdout.write(`[walk] stat_failures=${statFailures.length}\n`);

  if (files.length === 0) {
    stdout.write(`FATAL: zero CAD files found under ${args.root} — real-data shop should never be empty\n`);
    exit(1);
  }

  // Classify
  const entries = [];
  for (const f of files) {
    const sourcePath = normalizePathSep(f.path);
    entries.push({
      sourcePath,
      customer: detectCustomer(sourcePath),
      machineCategory: detectMachineCategory(sourcePath),
      ext: f.ext,
      bytes: f.bytes,
      ingestedAt: startedAt,
      provenance: {
        archive: "JM_DIE",
        archiveRoot: normalizePathSep(args.root),
        license: "JM_DIE_INTERNAL_USE_ONLY",
        synthetic: false,
      },
    });
    if (args.limit && entries.length >= args.limit) break;
  }

  // Stats
  const byCustomer = {};
  const byCategory = {};
  const byExtension = {};
  let totalBytes = 0;
  for (const e of entries) {
    byCustomer[e.customer] = (byCustomer[e.customer] || 0) + 1;
    byCategory[e.machineCategory] = (byCategory[e.machineCategory] || 0) + 1;
    byExtension[e.ext] = (byExtension[e.ext] || 0) + 1;
    totalBytes += e.bytes;
  }
  const stats = {
    schemaVersion: "1.0.0",
    generatedAt: startedAt,
    runtimeMs: Date.now() - t0,
    archive: "JM_DIE",
    archiveRoot: normalizePathSep(args.root),
    total: entries.length,
    totalBytes,
    uniqueCustomers: Object.keys(byCustomer).length,
    byCustomer,
    byCategory,
    byExtension,
    readdirFailures: readdirFailures.length,
    statFailures: statFailures.length,
    sample: entries.slice(0, 5).map((e) => ({
      sourcePath: e.sourcePath,
      customer: e.customer,
      machineCategory: e.machineCategory,
      ext: e.ext,
      bytes: e.bytes,
    })),
  };

  // Emit
  const outAbs = resolve(args.outDir);
  try {
    mkdirSync(outAbs, { recursive: true });
  } catch (err) {
    // recursive:true makes EEXIST OK, but propagate any other error —
    // we cannot write the corpus to a missing directory.
    if (err?.code !== "EEXIST") {
      stdout.write(`FATAL: cannot create out dir ${outAbs}: ${err?.message || err}\n`);
      exit(2);
    }
  }
  const jsonlPath = join(outAbs, "jm-die-corpus.jsonl");
  const statsPath = join(outAbs, "jm-die-corpus.stats.json");
  try {
    const jsonl = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
    writeFileSync(jsonlPath, jsonl, "utf8");
    writeFileSync(statsPath, JSON.stringify(stats, null, 2), "utf8");
  } catch (err) {
    stdout.write(`FATAL: write failure: ${err?.message || err}\n`);
    exit(2);
  }

  stdout.write(`[done] ${entries.length} entries → ${relative(process.cwd(), jsonlPath)}\n`);
  stdout.write(`[done] stats → ${relative(process.cwd(), statsPath)}\n`);
  stdout.write(`[done] uniqueCustomers=${stats.uniqueCustomers} totalBytes=${(totalBytes / 1048576).toFixed(1)}MB\n`);
}

// Top-level await pattern: we deliberately `void` the promise after
// attaching .catch so an uncaught rejection still hits stdout + exit(2).
void main().catch((err) => { stdout.write(`UNCAUGHT: ${err?.stack || err}\n`); exit(2); });
