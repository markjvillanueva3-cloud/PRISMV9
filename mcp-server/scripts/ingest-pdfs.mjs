#!/usr/bin/env node
/**
 * ingest-pdfs.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U02 driver.
 *
 * Walk a Resources/ subtree, find every general-knowledge .pdf, and feed
 * each through KnowledgeIngestEngine. Per-PDF results are appended to a
 * checkpoint JSONL so the worker is restartable: if it crashes after PDF
 * 47 of 116, re-running picks up from PDF 48 (idempotent in Qdrant via
 * the chunk-id hash, but skipping the extract step is faster).
 *
 * Usage:
 *   node scripts/ingest-pdfs.mjs --dir "H:/prism/Resources/MANUFACTURER_CATALOGS"
 *                                [--limit 5]
 *                                [--dry-run]
 *                                [--checkpoint data/state/kip-ingest.jsonl]
 *                                [--resume]   # skip ids already in checkpoint
 *
 * Idempotency:
 *   Qdrant ids are sha256(source|chunkIndex), so re-ingesting the same
 *   PDF upserts in place — but we still avoid the wasted Python+chunk
 *   work via the resume flag.
 *
 * Failure handling:
 *   Per-PDF exceptions are caught and recorded; the loop never aborts.
 *   The ingest result (or {error}) is appended to the checkpoint.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

// ---- tsx re-exec gate (must be FIRST so parent doesn't repeat work) --------

const isTsxRuntime = process.env.TSX_RUNTIME === "1"
  || process.execArgv.some((a) => a.includes("tsx/"))
  || (typeof process[Symbol.for("ts-node.register.instance")] !== "undefined");

if (!isTsxRuntime && !process.env.PRISM_KIP_BYPASS_TSX) {
  const tsxBin = process.platform === "win32"
    ? path.resolve("mcp-server/node_modules/.bin/tsx.cmd")
    : path.resolve("mcp-server/node_modules/.bin/tsx");
  if (!fs.existsSync(tsxBin)) {
    console.error(`tsx binary not found at ${tsxBin}. Run: cd mcp-server && npm install`);
    process.exit(2);
  }
  const { spawnSync } = await import("node:child_process");
  const res = spawnSync(tsxBin, [process.argv[1], ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, TSX_RUNTIME: "1" },
    shell: process.platform === "win32",
  });
  process.exit(res.status ?? 1);
}

const { values: argv } = parseArgs({
  options: {
    dir:        { type: "string" },
    limit:      { type: "string" },
    "dry-run":  { type: "boolean", default: false },
    checkpoint: { type: "string", default: "mcp-server/data/state/kip-ingest.jsonl" },
    resume:     { type: "boolean", default: false },
    "vendor-from-name": { type: "boolean", default: true },
  },
});

if (!argv.dir) {
  console.error("usage: ingest-pdfs.mjs --dir <path> [--limit N] [--dry-run] [--resume]");
  process.exit(2);
}
if (!fs.existsSync(argv.dir) || !fs.statSync(argv.dir).isDirectory()) {
  console.error(`not a directory: ${argv.dir}`);
  process.exit(2);
}

const limit = argv.limit ? Number.parseInt(argv.limit, 10) : Infinity;
if (!Number.isFinite(limit) && argv.limit) {
  console.error(`invalid --limit: ${argv.limit}`);
  process.exit(2);
}

const checkpointPath = path.resolve(argv.checkpoint);
fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });

// ---- discover PDFs -----------------------------------------------------------

function walkPdfs(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch (e) {
      console.warn(`[scan] skip ${cur}: ${e.message}`);
      continue;
    }
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".pdf")) {
        out.push(p);
      }
    }
  }
  return out;
}

console.log(`[scan] walking ${argv.dir}…`);
const allPdfs = walkPdfs(argv.dir);
console.log(`[scan] found ${allPdfs.length} PDFs`);

// ---- resume-skip set ---------------------------------------------------------

const completed = new Set();
if (argv.resume && fs.existsSync(checkpointPath)) {
  const lines = fs.readFileSync(checkpointPath, "utf8").split("\n").filter(Boolean);
  for (const ln of lines) {
    try {
      const o = JSON.parse(ln);
      if (o?.source && !o?.error) completed.add(o.source);
    } catch { /* skip malformed checkpoint line */ }
  }
  console.log(`[resume] ${completed.size} already-complete PDFs will be skipped`);
}

const targets = allPdfs.filter((p) => !completed.has(p)).slice(0, limit);
console.log(`[plan] ${targets.length} PDFs to ingest (limit=${limit === Infinity ? "∞" : limit})`);

// ---- engine + Qdrant wiring --------------------------------------------------
// We've already re-execed under tsx (see top), so TS imports work here.

const SRC = path.resolve("mcp-server/src");
const srcUrl = (rel) => pathToFileURL(path.join(SRC, rel)).href;
const { QdrantMemoryEngine } = await import(srcUrl("engines/QdrantMemoryEngine.ts"));
const { createOllamaEmbedder } = await import(srcUrl("engines/OllamaEmbedderFactory.ts"));
const { KnowledgeIngestEngine } = await import(srcUrl("engines/KnowledgeIngestEngine.ts"));
const { qdrantVectorStoreEngine } = await import(srcUrl("engines/QdrantVectorStoreEngine.ts"));

// Best-effort: ensure the Qdrant store the singleton is wired to is connected.
// If the store engine is exported separately we ping it; otherwise we rely on
// remember() returning ok:false on disconnected and skip uploads.
// Wire a QdrantMemoryEngine instance backed by the SAME qdrantVectorStoreEngine
// singleton we're about to connect — the default exported `qdrantMemoryEngine`
// has its own private store, which would not see our connection.
const embedder = createOllamaEmbedder();
const memory = new QdrantMemoryEngine({ store: qdrantVectorStoreEngine, embedder });

if (!argv["dry-run"]) {
  const qdrantUrl = process.env.QDRANT_URL ?? "http://127.0.0.1:6333";
  try {
    const connectResult = await qdrantVectorStoreEngine.connect({
      url: qdrantUrl,
      timeoutMs: 30_000,
    });
    if (!connectResult?.ok) {
      console.warn(`[qdrant] connect failed: ${connectResult?.error ?? "unknown"}`);
      process.exit(2);
    }
    console.log(`[qdrant] connected to ${qdrantUrl}`);
  } catch (e) {
    console.warn(`[qdrant] connect threw: ${e.message}`);
    process.exit(2);
  }
}

const engine = new KnowledgeIngestEngine({ memory });

// ---- vendor inference helper ------------------------------------------------

function vendorFromName(filename) {
  const n = filename.toLowerCase();
  const known = [
    "iscar", "sandvik", "kennametal", "mitsubishi", "kyocera",
    "tungaloy", "seco", "walter", "ingersoll", "korloy",
    "yg-1", "ymw", "dormer", "osg", "guhring",
    "hanita", "sgs", "harvey", "helical", "destiny",
    "imco", "nachi", "sumitomo", "tegutec", "widia",
    "fanuc", "okuma", "haas", "hurco", "mazak",
    "siemens", "heidenhain", "fagor", "mitsubishi", "fadal",
    "hardinge", "doosan", "dn-solutions", "matsuura",
  ];
  for (const v of known) {
    if (n.includes(v)) return v.charAt(0).toUpperCase() + v.slice(1);
  }
  return null;
}

// ---- main loop ---------------------------------------------------------------

const checkpointFd = fs.openSync(checkpointPath, "a");
const startedAt = Date.now();
let okCount = 0;
let failCount = 0;

function appendCheckpoint(record) {
  fs.writeSync(checkpointFd, JSON.stringify(record) + "\n");
}

for (let i = 0; i < targets.length; i++) {
  const pdfPath = targets[i];
  const filename = path.basename(pdfPath);
  const meta = {
    source: pdfPath.replace(/\\/g, "/"),
    title: filename.replace(/\.pdf$/i, ""),
    vendor: argv["vendor-from-name"] ? vendorFromName(filename) ?? undefined : undefined,
    category: "manufacturer-catalog",
    tags: ["MANUFACTURER_CATALOGS", "kip-p14-u02"],
  };
  const tag = `[${i + 1}/${targets.length}]`;
  console.log(`${tag} ${filename}${meta.vendor ? ` (vendor=${meta.vendor})` : ""}`);

  try {
    const result = await engine.ingestPdf(pdfPath, meta, {
      dryRun: argv["dry-run"],
      timeoutMs: 10 * 60 * 1000, // 10 min/PDF — large datasheets are slow
    });
    appendCheckpoint({ ...result, completedAt: new Date().toISOString() });
    okCount++;
    console.log(
      `${tag}   ✓ pages=${result.pages} chunks=${result.chunks} ` +
      `upserted=${result.upserted} errors=${result.errors.length} ` +
      `${(result.durationMs / 1000).toFixed(1)}s`,
    );
  } catch (e) {
    failCount++;
    const errRec = { source: meta.source, error: e?.message ?? String(e), failedAt: new Date().toISOString() };
    appendCheckpoint(errRec);
    console.warn(`${tag}   ✗ ${e?.message ?? e}`);
  }
}

fs.closeSync(checkpointFd);
const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\n[done] ${okCount} ok, ${failCount} failed, ${elapsed}s elapsed`);
console.log(`[done] checkpoint: ${checkpointPath}`);
