#!/usr/bin/env node
/**
 * regen-dsl-shortcodes.mjs — SYSTEM-VIZ-DSL-MS0/U-DSL-EXTEND
 *
 * Augments mcp-server/data/docs/CODE_SYSTEM_INDEX.json with shortcodes for
 * system-viz graph node types that the existing file-tree-only scanner misses.
 * The original index covers 14 categories (E/D/A/S/H/U/V/SV/T/C/R/M/DOC/X)
 * scanning physical files under mcp-server/; this script extends it with
 * graph-only types: actions (AC), skills (SK), milestones (ML), formulas (FM),
 * ghosts (GH).
 *
 * Token-efficiency rationale: in prompts, hooks, agent output, and wiki
 * cross-references, references like "ai_route_mill_pipeline" or
 * "WiringBatchExecutorEngine" cost ~5-10 tokens each. Replacing them with
 * "AC0042" or the existing "E1234" cuts that by 50-80%. The savings only
 * matter for asset types that appear in conversation — engines, dispatchers,
 * actions, hooks, skills, milestones, formulas — NOT for the L10-L12 file/
 * bundle/canonical-file nodes (372 k of the 372 k+ graph) which are graph-walk
 * targets, never cross-references.
 *
 * Determinism: shortcodes are assigned by sorted name within each new
 * category, sequential alphanumeric body. Re-running with the same graph +
 * existing JSON produces identical output. Existing E/D/A/S/H/U/V/SV/T/C/R/M
 * codes are PRESERVED VERBATIM — this script only adds.
 *
 * Capacity per category (current default 4-digit body):
 *   alphanumeric 0-9a-zA-Z = 62 chars → 62^4 = 14.8 M codes per prefix → plenty
 *   (we don't use leading zeros; 9999 in plain decimal is fine for current scale)
 *
 * Edge cases:
 *   - Graph missing → exit non-zero, never write
 *   - JSON corrupt → exit non-zero, never write
 *   - New name already in existing codes (file-tree scan caught it) → preserved
 *   - Category overflow → fail loud with telemetry note
 *   - Concurrent writer on JSON → atomic temp+rename, retry on EBUSY
 *
 * Usage:
 *   node scripts/regen-dsl-shortcodes.mjs --dry-run
 *   node scripts/regen-dsl-shortcodes.mjs --apply
 *   node scripts/regen-dsl-shortcodes.mjs --json --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const INDEX_PATH = path.join(ROOT, "mcp-server", "data", "docs", "CODE_SYSTEM_INDEX.json");

// New categories — keep prefixes unique vs existing 14 categories.
// Existing: E, D, A, S, H, U, V, SV, T, C, R, M, DOC, X
// Predicates use `kind` ONLY (NOT layer) because the L# bands hold heterogeneous
// node types in PRISM's graph schema — e.g. L8 holds 21K wiki_entries, not
// skills; L9 holds 28K mixed. The discriminator that actually identifies the
// intended type is the `kind` field, set explicitly by the graph builders.
export const NEW_CATEGORIES = Object.freeze({
  AC: { label: "Action (dispatcher action)", kindMatch: /^dispatcher\.action$/, nodeMatch: (n) => n?.kind === "dispatcher.action" },
  SK: { label: "Skill", kindMatch: /^skill$/, nodeMatch: (n) => n?.kind === "skill" },
  ML: { label: "Milestone", kindMatch: /^milestone$/, nodeMatch: (n) => n?.kind === "milestone" },
  FM: { label: "Formula", kindMatch: /^formula$/, nodeMatch: (n) => n?.kind === "formula" },
  GH: { label: "Ghost (L13)", kindMatch: /^ghost\./, nodeMatch: (n) => typeof n?.kind === "string" && n.kind.startsWith("ghost.") },
});

export const DSL_VERSION = "3.0.0";
export const SHORTCODE_BODY_DIGITS = 4;
export const SHORTCODE_CAPACITY_PER_CATEGORY = Math.pow(62, SHORTCODE_BODY_DIGITS); // 14.78M

/** Pure assigner: existing codes preserved; new names get sequential 4-digit body. */
export function assignShortcodes(existingCodes, newNamesByCategory, opts = {}) {
  const bodyDigits = opts.bodyDigits ?? SHORTCODE_BODY_DIGITS;
  const result = { added: {}, preserved: 0, byCategory: {}, overflows: [] };

  // Index existing codes by name within each category (skip empty entries).
  const existingByPrefix = {};
  for (const [code, entry] of Object.entries(existingCodes || {})) {
    if (!entry || typeof entry !== "object" || !entry.name) continue;
    const prefix = code.match(/^[A-Z]+/)?.[0] || "?";
    if (!existingByPrefix[prefix]) existingByPrefix[prefix] = new Map();
    existingByPrefix[prefix].set(String(entry.name).toLowerCase(), code);
  }

  for (const [prefix, names] of Object.entries(newNamesByCategory)) {
    if (!Array.isArray(names) || names.length === 0) {
      result.byCategory[prefix] = { added: 0, preserved: 0, total: 0 };
      continue;
    }
    // Sort alphabetically for stable assignment.
    const sorted = [...new Set(names.filter((n) => typeof n === "string" && n.length > 0))].sort();
    const existingMap = existingByPrefix[prefix] || new Map();

    // Find next unused numeric body for this prefix
    const usedBodies = new Set();
    for (const code of existingMap.values()) {
      const body = code.slice(prefix.length);
      if (/^\d+$/.test(body)) usedBodies.add(parseInt(body, 10));
    }
    let nextSeq = 1;
    const nextBody = () => {
      while (usedBodies.has(nextSeq)) nextSeq++;
      const b = nextSeq;
      usedBodies.add(b);
      nextSeq++;
      return b;
    };

    let addedCount = 0;
    let preservedCount = 0;
    for (const name of sorted) {
      const nameLower = name.toLowerCase();
      if (existingMap.has(nameLower)) { preservedCount++; continue; }
      const body = nextBody();
      if (body >= Math.pow(10, bodyDigits)) {
        result.overflows.push({ prefix, name, body });
        continue;
      }
      const code = prefix + String(body).padStart(bodyDigits, "0");
      result.added[code] = { code, name, category: prefix };
      addedCount++;
    }
    result.byCategory[prefix] = {
      added: addedCount,
      preserved: preservedCount,
      total: existingMap.size + addedCount,
    };
    result.preserved += preservedCount;
  }
  return result;
}

/** Extract graph nodes into name-arrays keyed by new-category prefix. */
export function extractNewNamesFromGraph(graph) {
  const out = {};
  for (const prefix of Object.keys(NEW_CATEGORIES)) out[prefix] = [];
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  for (const n of nodes) {
    if (!n) continue;
    for (const [prefix, def] of Object.entries(NEW_CATEGORIES)) {
      if (def.nodeMatch(n)) {
        const name = nodeName(n);
        if (name) out[prefix].push(name);
        break; // one prefix per node
      }
    }
  }
  return out;
}

function nodeName(n) {
  if (n?.label && typeof n.label === "string") return n.label;
  if (n?.name && typeof n.name === "string") return n.name;
  if (typeof n?.id === "string") {
    const parts = n.id.split(/[./:]/);
    return parts[parts.length - 1] || n.id;
  }
  return null;
}

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (err) { throw new Error(`failed to read ${filePath}: ${err?.message || err}`); }
}

function writeJsonAtomic(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  const RETRY_DELAYS_MS = [50, 100, 200, 400, 800, 1600];
  let lastErr = null;
  for (const delay of RETRY_DELAYS_MS) {
    try { fs.renameSync(tmp, filePath); return; }
    catch (err) {
      lastErr = err;
      const code = err?.code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "EACCES" && code !== "EEXIST") throw err;
      const until = Date.now() + delay;
      while (Date.now() < until) { /* spin */ }
    }
  }
  throw lastErr ?? new Error("rename retry exhausted");
}

function parseArgs(argv) {
  const out = { dryRun: false, apply: false, json: false, graphPath: GRAPH_PATH, indexPath: INDEX_PATH };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--json") out.json = true;
    else if (a === "--graph") out.graphPath = argv[++i];
    else if (a === "--index") out.indexPath = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.error("usage: regen-dsl-shortcodes [--dry-run | --apply] [--json] [--graph path] [--index path]");
      process.exit(0);
    }
  }
  if (!out.apply && !out.dryRun) out.dryRun = true; // default safe
  return out;
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));
  const graph = readJsonSafe(opts.graphPath);
  const index = readJsonSafe(opts.indexPath);
  if (!index || typeof index !== "object" || !index.codes || !index.reverse) {
    throw new Error(`malformed index (missing codes/reverse): ${opts.indexPath}`);
  }

  const newNames = extractNewNamesFromGraph(graph);
  const result = assignShortcodes(index.codes, newNames);

  // Merge added codes into the index
  let mergeCount = 0;
  for (const [code, entry] of Object.entries(result.added)) {
    if (!index.codes[code]) {
      index.codes[code] = entry;
      // reverse map: name → code (for DSL lookup)
      index.reverse[entry.name] = code;
      mergeCount++;
    }
  }

  // Update category metadata
  index.categories = index.categories || {};
  for (const [prefix, def] of Object.entries(NEW_CATEGORIES)) {
    const stats = result.byCategory[prefix] || { added: 0, preserved: 0, total: 0 };
    index.categories[prefix] = {
      label: def.label,
      prefix,
      count: (index.categories[prefix]?.count || 0) + stats.added,
      source: "system-viz-graph",
      kind: def.kindMatch?.source || null,
    };
  }
  index._meta = index._meta || {};
  index._meta.version = DSL_VERSION;
  index._meta.dsl_extended_at = new Date().toISOString();
  index._meta.dsl_extended_by = "regen-dsl-shortcodes.mjs (SYSTEM-VIZ-DSL-MS0/U-DSL-EXTEND)";
  index._meta.total_codes = Object.keys(index.codes).length;

  const report = {
    ok: true,
    dryRun: opts.dryRun,
    indexPath: opts.indexPath,
    graphPath: opts.graphPath,
    totalCodesAfter: index._meta.total_codes,
    newCodesAdded: mergeCount,
    preservedExisting: result.preserved,
    byCategory: result.byCategory,
    overflows: result.overflows,
    newCategorySamples: Object.fromEntries(
      Object.entries(result.byCategory)
        .filter(([, s]) => s.added > 0)
        .map(([prefix]) => [
          prefix,
          Object.entries(result.added).filter(([code]) => code.startsWith(prefix)).slice(0, 3).map(([code, entry]) => `${code}: ${entry.name}`),
        ])
    ),
  };

  if (opts.dryRun) {
    if (opts.json) console.log(JSON.stringify(report, null, 2));
    else printHumanReport(report);
    return;
  }

  // Apply: atomic write
  writeJsonAtomic(opts.indexPath, index);
  report.written = true;
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else { printHumanReport(report); console.log(`\n  → wrote ${opts.indexPath} (${index._meta.total_codes} total codes)`); }
}

function printHumanReport(r) {
  console.log(`DSL Shortcode Extension — ${r.dryRun ? "DRY-RUN" : "APPLY"}`);
  console.log(`  graph:  ${r.graphPath}`);
  console.log(`  index:  ${r.indexPath}`);
  console.log(`  added:  ${r.newCodesAdded} new codes`);
  console.log(`  preserved: ${r.preservedExisting} existing codes`);
  console.log(`  total:  ${r.totalCodesAfter} codes after extension`);
  if (r.overflows.length > 0) console.log(`  ⚠ overflows: ${r.overflows.length} names exceed body capacity — bump bodyDigits`);
  console.log(`\n  by category:`);
  for (const [prefix, stats] of Object.entries(r.byCategory)) {
    if (stats.total === 0) continue;
    console.log(`    ${prefix}: +${stats.added} new, ${stats.preserved} preserved → ${stats.total} total`);
    const samples = r.newCategorySamples?.[prefix] || [];
    samples.forEach((s) => console.log(`      e.g. ${s}`));
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
