#!/usr/bin/env node
/**
 * query-lathe-tribal.mjs
 *
 * AI-accessible query helper for the consolidated lathe tribal master index.
 * Designed to be invoked by:
 *   - Claude via /lathe-tribal-query slash command
 *   - LatheAITrainingEngine.validate() for vendor-prior lookups
 *   - LatheCAMIntelligenceEngine.selectInsert() for tool selection
 *   - prism_lathe:query_vendor_tribal MCP dispatcher action (follow-up unit)
 *
 * Index source:
 *   mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json
 *
 * Usage:
 *   node scripts/query-lathe-tribal.mjs --iso P --op od_rough
 *   node scripts/query-lathe-tribal.mjs --grade KCP25
 *   node scripts/query-lathe-tribal.mjs --vendor sandvik_coromant
 *   node scripts/query-lathe-tribal.mjs --search "stainless"
 *   node scripts/query-lathe-tribal.mjs --list-vendors
 *   node scripts/query-lathe-tribal.mjs --list-operations
 *
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0/U-LATHE-TRIBAL-QUERY
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const INDEX_PATH = resolve(repoRoot, "mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json");

function loadIndex() {
  if (!existsSync(INDEX_PATH)) {
    return { ok: false, error: "master-index-not-found", path: INDEX_PATH };
  }
  try {
    return { ok: true, data: JSON.parse(readFileSync(INDEX_PATH, "utf8")) };
  } catch (e) {
    return { ok: false, error: "parse-failed: " + (e && e.message ? e.message : String(e)) };
  }
}

function parseArgs(argv) {
  const args = { iso: null, op: null, grade: null, vendor: null, search: null, json: false,
                 listVendors: false, listOps: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--iso") args.iso = argv[++i];
    else if (a === "--op" || a === "--operation") args.op = argv[++i];
    else if (a === "--grade") args.grade = argv[++i];
    else if (a === "--vendor") args.vendor = argv[++i];
    else if (a === "--search" || a === "-s") args.search = argv[++i];
    else if (a === "--json") args.json = true;
    else if (a === "--list-vendors") args.listVendors = true;
    else if (a === "--list-operations") args.listOps = true;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write([
    "Usage:",
    "  --iso P|M|K|N|S|H            filter by ISO material group",
    "  --op od_rough|od_finish|...  filter by operation",
    "  --grade <code>               lookup a specific grade by code (e.g. CNMG, KCP25)",
    "  --vendor <key>               return vendor block (sandvik_coromant, iscar, etc.)",
    "  --search <text>              free-text search across grade codes + use descriptions",
    "  --list-vendors               list all vendor keys",
    "  --list-operations            list known operation keys",
    "  --json                       emit raw JSON instead of pretty text",
    "",
    "Examples:",
    "  query-lathe-tribal.mjs --iso M --op od_rough",
    "  query-lathe-tribal.mjs --grade AH725",
    "  query-lathe-tribal.mjs --search Inconel",
    "  query-lathe-tribal.mjs --vendor walter --json",
  ].join("\n") + "\n");
}

/** Find query records matching (iso, op). Pure function (testable). */
export function queryByIsoAndOp(index, iso, op) {
  const records = index?.wizard_query_records || [];
  if (!iso && !op) return records;
  const normIso = iso ? String(iso).toUpperCase() : null;
  const normOp = op ? String(op).toLowerCase() : null;
  // ISO match must be word-boundary precise — "H" must match the "H" token, NOT "FINISH" or "HRSA".
  // Accept: exact single-letter match ("P"==="P"), or ISO+digits form ("P25", "P05-P10", "H40-45"),
  // or single-letter ISO appearing as a standalone token in the key (split on non-alphanum).
  const isoRegex = normIso ? new RegExp("^" + normIso + "(\\d|$|-|/)") : null;
  return records.filter(rec => {
    const keys = (rec.query_keys || []).map(k => String(k).toLowerCase());
    const isoMatch = !normIso || keys.some(k => {
      const upper = k.toUpperCase();
      if (upper === normIso) return true;
      if (isoRegex && isoRegex.test(upper)) return true;
      // Standalone token form: split on non-alphanumeric, check if any token === normIso
      const tokens = upper.split(/[^A-Z0-9]+/).filter(Boolean);
      return tokens.includes(normIso);
    });
    const opMatch = !normOp || keys.includes(normOp);
    return isoMatch && opMatch;
  });
}

/** Look up a grade code across all vendors. Returns array of {vendor, grade}. */
export function findGrade(index, code) {
  const out = [];
  if (!code) return out;
  const target = String(code).trim().toUpperCase();
  const vendors = index?.vendors || {};
  for (const [vendorKey, vendorRec] of Object.entries(vendors)) {
    const grades = vendorRec.grades || [];
    for (const g of grades) {
      if (String(g.code).toUpperCase() === target) {
        out.push({ vendor: vendorKey, grade: g, vendor_site: vendorRec.site });
      }
    }
  }
  return out;
}

/** Free-text search over grade codes + use descriptions + vendor names. */
export function searchAll(index, text) {
  if (!text) return [];
  const q = String(text).toLowerCase();
  const out = [];
  const vendors = index?.vendors || {};
  for (const [vendorKey, vendorRec] of Object.entries(vendors)) {
    const grades = vendorRec.grades || [];
    for (const g of grades) {
      const haystack = [
        g.code, (g.use || ""), (g.coating || ""), vendorKey,
        ...(g.iso || []),
      ].join(" ").toLowerCase();
      if (haystack.includes(q)) out.push({ vendor: vendorKey, grade: g });
    }
  }
  return out;
}

function formatPretty(result, args, index) {
  if (args.listVendors) {
    const v = Object.keys(index.vendors || {});
    return ["Vendors (" + v.length + "):", ...v.map(x => "  - " + x)].join("\n");
  }
  if (args.listOps) {
    const ops = Object.keys(index.ai_query_synonyms || {}).filter(k => !k.startsWith("ISO_") && !["CBN","PVD","CVD"].includes(k));
    return ["Operations:", ...ops.map(x => "  - " + x)].join("\n");
  }
  if (args.vendor && result) {
    const lines = ["Vendor: " + args.vendor, "  site: " + (result.site || "(none)")];
    const grades = result.grades || [];
    if (grades.length > 0) {
      lines.push("  grades (" + grades.length + "):");
      for (const g of grades) {
        lines.push("    " + g.code + "  iso=" + (g.iso || []).join("/") + "  coating=" + (g.coating || "") + "  use=" + (g.use || ""));
      }
    }
    const res = result.resources || [];
    if (res.length > 0) {
      lines.push("  resources:");
      for (const u of res) lines.push("    " + u);
    }
    return lines.join("\n");
  }
  if (args.grade) {
    const hits = result || [];
    if (hits.length === 0) return "No grade found matching: " + args.grade;
    return hits.map(h =>
      h.vendor + ":  " + h.grade.code + "  iso=" + (h.grade.iso || []).join("/") +
      "  coating=" + (h.grade.coating || "") + "  use=" + (h.grade.use || "") +
      "  [" + (h.vendor_site || "") + "]"
    ).join("\n");
  }
  if (args.search) {
    const hits = result || [];
    if (hits.length === 0) return "No matches for: " + args.search;
    return hits.slice(0, 30).map(h =>
      h.vendor + ":  " + h.grade.code + "  " + (h.grade.use || "")
    ).join("\n") + (hits.length > 30 ? "\n... and " + (hits.length - 30) + " more" : "");
  }
  // iso + op default path
  const recs = result || [];
  if (recs.length === 0) return "No query records match — try --iso P --op od_rough";
  const lines = [];
  for (const rec of recs) {
    lines.push("Query: " + (rec.query_keys || []).join(" | "));
    lines.push("  first_choice: " + rec.first_choice);
    lines.push("  alternatives: " + (rec.alternatives || []).join(", "));
    lines.push("  candidates: " + (rec.candidates || []).slice(0, 12).join(", ") +
               (rec.candidates && rec.candidates.length > 12 ? " ... +" + (rec.candidates.length - 12) : ""));
    lines.push("  rationale: " + rec.rationale);
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv);
  const loaded = loadIndex();
  if (!loaded.ok) {
    process.stderr.write("ERROR: " + loaded.error + "\n");
    process.exit(2);
  }
  const index = loaded.data;

  let result;
  if (args.listVendors || args.listOps) {
    result = null;
  } else if (args.vendor) {
    result = index.vendors?.[args.vendor];
    if (!result) {
      process.stderr.write("Unknown vendor: " + args.vendor + ". Try --list-vendors.\n");
      process.exit(3);
    }
  } else if (args.grade) {
    result = findGrade(index, args.grade);
  } else if (args.search) {
    result = searchAll(index, args.search);
  } else {
    result = queryByIsoAndOp(index, args.iso, args.op);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(formatPretty(result, args, index) + "\n");
  }
}

// Only run main() when invoked as a script (not on import for tests)
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
