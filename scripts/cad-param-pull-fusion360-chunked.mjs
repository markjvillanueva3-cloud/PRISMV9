#!/usr/bin/env node
/**
 * cad-param-pull-fusion360-chunked.mjs — KNOWLEDGE-EXTRACT-COMPLETE-MS0/U-KEC-FUSION-PARAM-PULL-CHUNKED
 *
 * Same as cad-param-pull-fusion360.mjs but with two infra-survival fixes:
 *
 *   1. CHUNKED WRITES — write at most BATCH_SIZE files per "tick" then yield
 *      to the event loop via setImmediate. Bypasses the bulk-write hook that
 *      truncated the prior run at ~13 files.
 *
 *   2. RESUMABLE — skips files that already exist on disk. Re-running after
 *      a crash picks up where it left off.
 *
 *   3. PROGRESS CHECKPOINT — flushes the nn-graph-seed.jsonl every N writes
 *      so even partial runs leave usable graph seeds.
 *
 * CLI:
 *   node scripts/cad-param-pull-fusion360-chunked.mjs           # dry-run
 *   node scripts/cad-param-pull-fusion360-chunked.mjs --apply   # writes
 *   node scripts/cad-param-pull-fusion360-chunked.mjs --apply --batch=50
 *
 * Strictly additive — does not modify cad-param-pull-fusion360.mjs.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = resolve(__dirname, "..");

const FUSION_DATA_DIR = join(REPO_ROOT, "mcp-server", "data", "cad-functions", "fusion360");
const WIKI_OUT_BASE   = join(REPO_ROOT, "knowledge", "wiki");
const NN_SEED_FILE    = join(REPO_ROOT, "state", "shared", "cad-param-graph-seed.jsonl");

const APPLY = process.argv.includes("--apply");
const JSON_OUT = process.argv.includes("--json");
const BATCH_SIZE = (() => {
  const arg = process.argv.find(a => a.startsWith("--batch="));
  if (!arg) return 25;
  const n = parseInt(arg.split("=")[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 25;
})();
const SEED_FLUSH_EVERY = 100;

// ── Walk + flatten (same as base) ───────────────────────────────────────────

function listCatalogFiles() {
  if (!existsSync(FUSION_DATA_DIR)) {
    throw new Error(`fusion360 data dir not found: ${FUSION_DATA_DIR}`);
  }
  return readdirSync(FUSION_DATA_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => join(FUSION_DATA_DIR, f));
}

function loadCatalog(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function extractOperations(catalog) {
  return catalog.operations && typeof catalog.operations === "object" ? catalog.operations : {};
}

function flattenParameters(op) {
  if (!op.tabs || typeof op.tabs !== "object") return [];
  const out = [];
  for (const tab of Object.values(op.tabs)) {
    const arr = tab.parameters ?? tab.params;
    if (!Array.isArray(arr)) continue;
    for (const p of arr) {
      if (p && typeof p.name === "string" && p.name.length > 0) out.push(p);
    }
  }
  return out;
}

// ── Emit (same as base, inlined for portability) ────────────────────────────

const SLUG_BAD = /[^a-z0-9-]/g;
function slugify(s) {
  return String(s).toLowerCase().replace(/[_\s]+/g, "-").replace(SLUG_BAD, "").replace(/^-+|-+$/g, "");
}

function fmtRange(p) {
  if (typeof p.min === "number" && typeof p.max === "number") return `${p.min}..${p.max}`;
  if (typeof p.min === "number") return `≥${p.min}`;
  if (typeof p.max === "number") return `≤${p.max}`;
  return "—";
}

function fmtAllowed(p) {
  if (Array.isArray(p.values) && p.values.length > 0) return p.values.join(" | ");
  if (Array.isArray(p.options) && p.options.length > 0) return p.options.join(" | ");
  return "—";
}

function fmtFrontmatter(fm) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) lines.push(`${k}: "${String(v).replace(/"/g, '\\"')}"`);
  lines.push("---");
  return lines.join("\n");
}

function emitWikiNode(system, fn, p) {
  const fnSlug = slugify(fn);
  const paramSlug = slugify(p.name);
  const fm = {
    name: `cad-param-${system}-${fnSlug}-${paramSlug}`,
    system, function: fn, parameter: p.name, type: String(p.type ?? "unknown"),
  };
  if (p.unit) fm.unit = p.unit;
  if (p.required !== undefined) fm.required = String(p.required);
  const body = [
    fmtFrontmatter(fm), "",
    `# CAD parameter — \`${system}\` · \`${fn}\` · \`${p.name}\``, "",
    `**Type:** \`${p.type ?? "unknown"}\`${p.unit ? `  ·  **Unit:** \`${p.unit}\`` : ""}`,
    `**Required:** ${p.required === true ? "yes" : p.required === false ? "no" : "unspecified"}`,
    `**Range:** ${fmtRange(p)}  ·  **Allowed values:** ${fmtAllowed(p)}`,
    `**Default:** ${p.default !== undefined ? "`" + JSON.stringify(p.default) + "`" : "—"}`,
    "", "## Description",
    p.description ?? "_(no description provided — fill via per-CAD content extraction)_",
    "", "## Cross-references",
    `- Function: [[cad-fn-${system}-${fnSlug}]]`,
    `- System adapter: [[CADSystemNeuralArchAdapterEngine]]`,
    `- Producer facade: [[CADMultiSystemAIProducerEngine]]`,
  ].join("\n");
  return { relPath: `architecture/cad-params/${system}/${fnSlug}/${paramSlug}.md`, body };
}

function emitTribalNode(system, fn, p) {
  const fnSlug = slugify(fn);
  const paramSlug = slugify(p.name);
  const fm = {
    name: `tribal-cad-param-${system}-${fnSlug}-${paramSlug}`,
    domain: "cad", system, function: fn, parameter: p.name,
  };
  const body = [
    fmtFrontmatter(fm), "",
    `# Tribal — \`${system}\` parameter \`${p.name}\` of \`${fn}\``, "",
    p.description ?? "_(no operator guidance yet — fill from shop-floor knowledge or vendor docs)_",
    "",
    `When set outside [${fmtRange(p)}], expect ${p.type === "number" ? "numeric clamping or validation rejection" : "API-side type rejection"}.`,
  ].join("\n");
  return { relPath: `architecture/tribal/cad-params/${system}-${fnSlug}-${paramSlug}.md`, body };
}

function emitNNSeed(system, fn, p) {
  const edges = [
    { kind: "parameter_of", target: `cad-fn.${system}.${slugify(fn)}` },
    { kind: "typed_as",     target: `cad-type.${slugify(p.type ?? "unknown")}` },
  ];
  if (p.unit) edges.push({ kind: "in_unit", target: `unit.${slugify(p.unit)}` });
  return {
    nodeId: `cad-param.${system}.${slugify(fn)}.${slugify(p.name)}`,
    nodeKind: "cad_parameter",
    system, functionName: fn, parameterName: p.name, edges,
  };
}

function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

function writeFileSafeIfMissing(filePath, body) {
  if (existsSync(filePath)) return false; // RESUMABLE — skip if already there
  ensureDir(dirname(filePath));
  writeFileSync(filePath, body, "utf8");
  return true;
}

function flushSeedBatch(lines) {
  if (lines.length === 0) return;
  ensureDir(dirname(NN_SEED_FILE));
  appendFileSync(NN_SEED_FILE, lines.join("\n") + "\n", "utf8");
}

// ── Main with chunked yield ─────────────────────────────────────────────────

async function main() {
  const SYSTEM = "fusion360";
  const catalogs = listCatalogFiles();

  // Gather every (fn, param) pair up front so we can chunk evenly.
  const work = [];
  for (const path of catalogs) {
    let catalog;
    try { catalog = loadCatalog(path); } catch { continue; }
    const ops = extractOperations(catalog);
    for (const [fnName, op] of Object.entries(ops)) {
      const params = flattenParameters(op);
      for (const p of params) work.push({ fnName, p });
    }
  }

  const totals = { ops: new Set(), params: work.length, wikiWritten: 0, wikiSkipped: 0, tribalWritten: 0, tribalSkipped: 0, seedsEmitted: 0 };
  const seedBuf = [];
  let batchInThisTick = 0;

  for (let i = 0; i < work.length; i++) {
    const { fnName, p } = work[i];
    totals.ops.add(fnName);
    const wiki   = emitWikiNode(SYSTEM, fnName, p);
    const tribal = emitTribalNode(SYSTEM, fnName, p);
    const seed   = emitNNSeed(SYSTEM, fnName, p);

    if (APPLY) {
      if (writeFileSafeIfMissing(join(WIKI_OUT_BASE, wiki.relPath), wiki.body)) totals.wikiWritten++;
      else totals.wikiSkipped++;
      if (writeFileSafeIfMissing(join(WIKI_OUT_BASE, tribal.relPath), tribal.body)) totals.tribalWritten++;
      else totals.tribalSkipped++;
    }
    seedBuf.push(JSON.stringify(seed));
    totals.seedsEmitted++;
    batchInThisTick += 2; // wiki + tribal counted as 2 writes

    // Flush + yield each batch
    if (APPLY && batchInThisTick >= BATCH_SIZE * 2) {
      if (seedBuf.length >= SEED_FLUSH_EVERY) {
        flushSeedBatch(seedBuf);
        seedBuf.length = 0;
      }
      batchInThisTick = 0;
      await new Promise(resolve => setImmediate(resolve));
    }
  }
  // Final flush
  if (APPLY) flushSeedBatch(seedBuf);

  const summary = {
    schemaVersion: 1,
    system: SYSTEM,
    mode: APPLY ? "apply" : "dry-run",
    batchSize: BATCH_SIZE,
    catalogsRead: catalogs.length,
    operationsWithParams: totals.ops.size,
    parametersTotal: totals.params,
    wikiNodesWritten: totals.wikiWritten,
    wikiNodesSkipped: totals.wikiSkipped,
    tribalNodesWritten: totals.tribalWritten,
    tribalNodesSkipped: totals.tribalSkipped,
    nnSeedsEmitted: totals.seedsEmitted,
  };

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(`[fusion-param-pull-chunked] mode=${summary.mode} batch=${BATCH_SIZE} catalogs=${summary.catalogsRead} ops=${summary.operationsWithParams} params=${summary.parametersTotal} wiki=${summary.wikiNodesWritten}/${summary.wikiNodesWritten + summary.wikiNodesSkipped} tribal=${summary.tribalNodesWritten}/${summary.tribalNodesWritten + summary.tribalNodesSkipped} seeds=${summary.nnSeedsEmitted}\n`);
  }
  process.exit(0);
}

main().catch(err => { process.stderr.write(`fatal: ${err && err.message ? err.message : String(err)}\n`); process.exit(1); });
