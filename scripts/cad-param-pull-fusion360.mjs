#!/usr/bin/env node
/**
 * cad-param-pull-fusion360.mjs — KNOWLEDGE-EXTRACT-COMPLETE-MS0/U-KEC-FUSION-PARAM-PULL
 *
 * First content extractor that drives the U-KEC-CAD-PARAM-EMITTER pipeline.
 * Walks all 5 Fusion 360 function-index catalogs (assembly, drawing, feature,
 * mesh, function-index core), and for every operation with declared
 * parameters, runs the emitter to produce wiki + tribal + nn-graph-seed nodes.
 *
 * Default mode: DRY-RUN (counts only). --apply writes to disk.
 *
 * CLI:
 *   node scripts/cad-param-pull-fusion360.mjs           # dry-run, prints counts
 *   node scripts/cad-param-pull-fusion360.mjs --apply   # writes wiki + tribal + nn-graph
 *
 * Outputs (with --apply):
 *   - knowledge/wiki/architecture/cad-params/fusion360/<fn>/<param>.md
 *   - knowledge/wiki/architecture/tribal/cad-params/fusion360-<fn>-<param>.md
 *   - state/shared/cad-param-graph-seed.jsonl (appended; one record per param)
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = resolve(__dirname, "..");

const FUSION_DATA_DIR = join(REPO_ROOT, "mcp-server", "data", "cad-functions", "fusion360");
const WIKI_OUT_BASE   = join(REPO_ROOT, "knowledge", "wiki");
const NN_SEED_FILE    = join(REPO_ROOT, "state", "shared", "cad-param-graph-seed.jsonl");

// ── Args ────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");
const JSON_OUT = process.argv.includes("--json");

// ── Walk Fusion catalogs ────────────────────────────────────────────────────

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
  // Both top-level "operations" (feature-operations.json) and nested shapes are accepted.
  return catalog.operations && typeof catalog.operations === "object" ? catalog.operations : {};
}

function flattenParameters(op) {
  // CADParameter[] live under op.tabs[*].parameters or op.tabs[*].params.
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

// ── Inlined emitter (avoids dynamic TS import; same shape as CADFunctionParameterEmitterEngine) ──

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

function writeFileSafe(filePath, body) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, body, "utf8");
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const SYSTEM = "fusion360";
  const catalogs = listCatalogFiles();
  let opCount = 0, paramCount = 0, wikiCount = 0, tribalCount = 0, seedCount = 0;
  const seedLines = [];

  for (const path of catalogs) {
    let catalog;
    try { catalog = loadCatalog(path); } catch { continue; }
    const operations = extractOperations(catalog);
    for (const [fnName, op] of Object.entries(operations)) {
      const params = flattenParameters(op);
      if (params.length === 0) continue;
      opCount++;
      for (const p of params) {
        paramCount++;
        const wiki = emitWikiNode(SYSTEM, fnName, p);
        const tribal = emitTribalNode(SYSTEM, fnName, p);
        const seed = emitNNSeed(SYSTEM, fnName, p);
        if (APPLY) {
          writeFileSafe(join(WIKI_OUT_BASE, wiki.relPath), wiki.body);
          writeFileSafe(join(WIKI_OUT_BASE, tribal.relPath), tribal.body);
          wikiCount++; tribalCount++;
        }
        seedLines.push(JSON.stringify(seed));
        seedCount++;
      }
    }
  }

  if (APPLY && seedLines.length > 0) {
    ensureDir(dirname(NN_SEED_FILE));
    appendFileSync(NN_SEED_FILE, seedLines.join("\n") + "\n", "utf8");
  }

  const summary = {
    schemaVersion: 1,
    system: SYSTEM,
    mode: APPLY ? "apply" : "dry-run",
    catalogsRead: catalogs.length,
    operationsWithParams: opCount,
    parametersTotal: paramCount,
    wikiNodesWritten: wikiCount,
    tribalNodesWritten: tribalCount,
    nnSeedsEmitted: seedCount,
  };

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(`[fusion-param-pull] mode=${summary.mode} catalogs=${summary.catalogsRead} ops=${summary.operationsWithParams} params=${summary.parametersTotal} wiki=${summary.wikiNodesWritten} tribal=${summary.tribalNodesWritten} seeds=${summary.nnSeedsEmitted}\n`);
  }
  process.exit(0);
}

main();
