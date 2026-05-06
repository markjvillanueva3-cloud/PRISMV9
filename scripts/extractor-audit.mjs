#!/usr/bin/env node
/**
 * extractor-audit — INTEL-OLLAMA-OBSIDIAN-MS0/P18-U01.
 *
 * Inventories every catalog / tool / data extractor script under
 *   mcp-server/scripts/extract-*.{py,mjs,ts}
 * and classifies it along three orthogonal axes:
 *
 *   1. inputFormat    — pdf | xlsx | csv | json | html | api | text
 *   2. outputTarget   — registry | dataset | obsidian | qdrant | other
 *   3. patternType    — table-extract | regex-scrape | structured-parse |
 *                       llm-prompted | api-fetch | manual-record
 *
 * Two more derived signals:
 *   - vendor          — heuristic vendor token from filename
 *                       (sandvik, kennametal, iscar, …) or "generic"
 *   - keepInFramework — true if the script's pattern is reusable; false
 *                       if it's a single-shot vendor-specific record
 *                       that should be archived once its data is captured.
 *
 * The classifier is purely heuristic — file content + filename. No LLM
 * call, no live PDF parse. Tests run in milliseconds against synthetic
 * fixtures; the live audit reads ~40 small script files.
 *
 * USAGE
 *   node scripts/extractor-audit.mjs                    # human-readable
 *   node scripts/extractor-audit.mjs --json             # machine-readable
 *   node scripts/extractor-audit.mjs --markdown         # write EXTRACTOR-INVENTORY.md
 *   node scripts/extractor-audit.mjs --root <dir>       # custom scripts dir
 *
 * Exit code: 0 always (this is informational, not a gate).
 */

import * as fs from "node:fs";
import * as path from "node:path";

export const SCRIPTS_ROOT_RELATIVE = "mcp-server/scripts";
export const FILENAME_GLOB = /^extract-.+\.(py|mjs|ts)$/;
export const HEAD_BYTES_FOR_CLASSIFY = 8192;

export const KNOWN_VENDORS = [
  "accupro", "ampc", "camfix", "guhring", "haimer", "ingersoll",
  "iscar", "kennametal", "korloy", "osg", "sandvik", "seco",
  "tungaloy", "widia", "yg1", "hypermill", "hypercad", "mit",
];

// ──────────────────────────────────────────────────────────────────────
// Pure logic — directly testable
// ──────────────────────────────────────────────────────────────────────

/**
 * Decide the input format from a head excerpt of the script.
 *
 * @param {string} body  - first ~8KB of the script
 * @param {string} ext   - file extension without dot ("py" | "mjs" | "ts")
 */
export function classifyInputFormat(body, ext) {
  if (typeof body !== "string" || body.length === 0) return "unknown";
  const b = body.toLowerCase();
  if (/pymupdf|pypdf|pdfplumber|pdf-parse|pdfreader\b/.test(b)) return "pdf";
  if (/openpyxl|xlsxwriter|exceljs|read_excel|\.xlsx/.test(b)) return "xlsx";
  if (/\bcsv\b|read_csv|csv-parse/.test(b)) return "csv";
  if (/cheerio|beautifulsoup|fromstring\(.*html/.test(b)) return "html";
  if (/\bfetch\(|requests\.get|axios\.|node-fetch/.test(b)) return "api";
  if (/json\.loads?\(|JSON\.parse\(/.test(b)) return "json";
  return "text";
}

/**
 * Decide where the script's output lands. Heuristic: matches the path
 * literal it writes to.
 *
 * @param {string} body
 */
export function classifyOutputTarget(body) {
  if (typeof body !== "string" || body.length === 0) return "unknown";
  const b = body.toLowerCase();
  if (/registries[./]|registry\.|register\(|registers\b/.test(b)) return "registry";
  if (/qdrant|vector_store|upsert\(/.test(b)) return "qdrant";
  if (/obsidian|wiki\/|knowledge\/wiki/.test(b)) return "obsidian";
  if (/data\/[a-z0-9_-]+-extracted\.json/.test(b)) return "dataset";
  if (/writefile|writeFileSync|json\.dump|fs\.writeFile/i.test(body)) return "dataset";
  return "other";
}

/**
 * Decide the high-level extraction pattern. Three are reusable
 * (table-extract, regex-scrape, structured-parse, api-fetch); two are
 * mostly one-off (llm-prompted, manual-record).
 *
 * @param {string} body
 * @param {string} inputFormat
 */
export function classifyPatternType(body, inputFormat) {
  if (typeof body !== "string" || body.length === 0) return "unknown";
  const b = body.toLowerCase();
  if (/extract_tables\(|find_tables\(|page\.tables|tabula\b/.test(b)) return "table-extract";
  if (/ollama|llm\.|chat\.completions|generate.*prompt|gpt-|claude-/.test(b)) return "llm-prompted";
  if (/re\.match|re\.findall|re\.search|\.match\(.*\/.*\/.*\)|regex/.test(b)) return "regex-scrape";
  if (inputFormat === "api") return "api-fetch";
  if (/json\.dump|jsondump|writefile.*json|json\.parse|json\.loads/.test(b)) return "structured-parse";
  return "manual-record";
}

/**
 * Pull a vendor token from the filename. Falls back to "generic" if no
 * known vendor matches.
 *
 * @param {string} filename - basename only
 */
export function extractVendor(filename) {
  if (typeof filename !== "string" || filename.length === 0) return "generic";
  const lower = filename.toLowerCase();
  for (const v of KNOWN_VENDORS) {
    if (lower.includes(v)) return v;
  }
  return "generic";
}

/**
 * Decide whether the extractor's pattern is general enough to keep live
 * vs candidate for archival once its data has been captured.
 *
 * Rule of thumb:
 *   - api-fetch + structured-parse + table-extract → keep (reusable)
 *   - llm-prompted → keep (orchestrated through ExtractionFrameworkEngine)
 *   - regex-scrape with vendor != generic → archive once data captured
 *   - manual-record → archive
 *
 * @param {object} input
 * @param {string} input.patternType
 * @param {string} input.vendor
 */
export function decideKeepInFramework({ patternType, vendor }) {
  if (patternType === "table-extract" || patternType === "structured-parse" || patternType === "api-fetch") {
    return { keep: true, reason: "reusable-pattern" };
  }
  if (patternType === "llm-prompted") {
    return { keep: true, reason: "framework-orchestrated" };
  }
  if (patternType === "regex-scrape" && vendor !== "generic") {
    return { keep: false, reason: "vendor-specific-regex" };
  }
  if (patternType === "manual-record") {
    return { keep: false, reason: "one-shot-record" };
  }
  return { keep: false, reason: "unclassified" };
}

/**
 * Compose the per-script audit record. Everything else upstream is I/O.
 *
 * @param {object} input
 * @param {string} input.filename
 * @param {string} input.body
 * @param {string} input.ext
 */
export function classifyExtractor({ filename, body, ext }) {
  const inputFormat = classifyInputFormat(body, ext);
  const outputTarget = classifyOutputTarget(body);
  const patternType = classifyPatternType(body, inputFormat);
  const vendor = extractVendor(filename);
  const keep = decideKeepInFramework({ patternType, vendor });
  return {
    filename,
    ext,
    inputFormat,
    outputTarget,
    patternType,
    vendor,
    keepInFramework: keep.keep,
    keepReason: keep.reason,
  };
}

/**
 * Aggregate counts by axis from a list of audit records.
 *
 * @param {Array<{inputFormat:string, outputTarget:string, patternType:string, vendor:string, keepInFramework:boolean}>} records
 */
export function summarize(records) {
  const inputFormatCounts = {};
  const outputTargetCounts = {};
  const patternTypeCounts = {};
  const vendorCounts = {};
  let keepCount = 0;
  let archiveCount = 0;
  for (const r of records) {
    inputFormatCounts[r.inputFormat] = (inputFormatCounts[r.inputFormat] ?? 0) + 1;
    outputTargetCounts[r.outputTarget] = (outputTargetCounts[r.outputTarget] ?? 0) + 1;
    patternTypeCounts[r.patternType] = (patternTypeCounts[r.patternType] ?? 0) + 1;
    vendorCounts[r.vendor] = (vendorCounts[r.vendor] ?? 0) + 1;
    if (r.keepInFramework) keepCount++;
    else archiveCount++;
  }
  return {
    total: records.length,
    keepCount,
    archiveCount,
    inputFormatCounts,
    outputTargetCounts,
    patternTypeCounts,
    vendorCounts,
  };
}

/**
 * Render the inventory as Markdown. Stable ordering — tests can match
 * exact strings.
 *
 * @param {{records: Array<any>, summary: any, generatedAt: string}} report
 */
export function renderInventoryMarkdown(report) {
  const { records, summary, generatedAt } = report;
  const lines = [];
  lines.push("# Extractor Inventory");
  lines.push("");
  lines.push(`> Generated by \`scripts/extractor-audit.mjs\` at ${generatedAt}.`);
  lines.push("> INTEL-OLLAMA-OBSIDIAN-MS0/P18-U01.");
  lines.push("");
  lines.push(`**Total scripts:** ${summary.total}`);
  lines.push(`**Keep in framework:** ${summary.keepCount}  ·  **Archive after capture:** ${summary.archiveCount}`);
  lines.push("");
  lines.push("## Counts by axis");
  lines.push("");
  lines.push("### Input format");
  for (const k of Object.keys(summary.inputFormatCounts).sort()) {
    lines.push(`- \`${k}\`: ${summary.inputFormatCounts[k]}`);
  }
  lines.push("");
  lines.push("### Output target");
  for (const k of Object.keys(summary.outputTargetCounts).sort()) {
    lines.push(`- \`${k}\`: ${summary.outputTargetCounts[k]}`);
  }
  lines.push("");
  lines.push("### Pattern type");
  for (const k of Object.keys(summary.patternTypeCounts).sort()) {
    lines.push(`- \`${k}\`: ${summary.patternTypeCounts[k]}`);
  }
  lines.push("");
  lines.push("### Vendor distribution");
  const sortedVendors = Object.keys(summary.vendorCounts).sort((a, b) =>
    (summary.vendorCounts[b] ?? 0) - (summary.vendorCounts[a] ?? 0) || a.localeCompare(b),
  );
  for (const k of sortedVendors) {
    lines.push(`- \`${k}\`: ${summary.vendorCounts[k]}`);
  }
  lines.push("");
  lines.push("## Per-script classification");
  lines.push("");
  lines.push("| Script | Input | Pattern | Output | Vendor | Disposition |");
  lines.push("|---|---|---|---|---|---|");
  const sortedRecords = [...records].sort((a, b) => a.filename.localeCompare(b.filename));
  for (const r of sortedRecords) {
    const dispo = r.keepInFramework ? `KEEP — ${r.keepReason}` : `ARCHIVE — ${r.keepReason}`;
    lines.push(`| \`${r.filename}\` | ${r.inputFormat} | ${r.patternType} | ${r.outputTarget} | ${r.vendor} | ${dispo} |`);
  }
  lines.push("");
  lines.push("## Framework abstraction (P18-U02)");
  lines.push("");
  lines.push("Scripts marked **KEEP** route their work through `ExtractionFrameworkEngine.parse(input, schema)` once P18-U02 lands. Scripts marked **ARCHIVE** retain their captured datasets under `mcp-server/src/data/<vendor>-extracted.json`; the script itself moves to `mcp-server/scripts/_completed_utilities/` once verified.");
  lines.push("");
  lines.push("## Reusable patterns observed");
  lines.push("");
  lines.push("- **`pdf` + `table-extract`** — most vendor catalogs (ISCAR, Kennametal, Tungaloy, Sandvik). Common shape: open PDF with `pymupdf`, iterate pages, run `page.find_tables()`, normalize ISO 13399 columns.");
  lines.push("- **`pdf` + `structured-parse`** — fixed-schema catalogs (Widia 2022, YG1). Hand-coded column→field maps.");
  lines.push("- **`api-fetch`** — Hypermill workflow / API extractors. JSON over HTTP.");
  lines.push("");
  lines.push("These three patterns will be the first abstractions surfaced through `ExtractionFrameworkEngine.parse()`.");
  return lines.join("\n") + "\n";
}

/**
 * Argv parser.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const out = { json: false, markdown: false, root: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--markdown") out.markdown = true;
    else if (a === "--root") out.root = argv[++i] ?? "";
    else if (a.startsWith("--root=")) out.root = a.slice("--root=".length);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// I/O glue
// ──────────────────────────────────────────────────────────────────────

function findRepoRoot(startCwd = process.cwd()) {
  let cur = startCwd;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, "docker-compose.yml"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startCwd;
}

function listExtractors(scriptsDir) {
  if (!fs.existsSync(scriptsDir)) return [];
  return fs
    .readdirSync(scriptsDir)
    .filter((n) => FILENAME_GLOB.test(n))
    .sort();
}

function readHead(p) {
  const fd = fs.openSync(p, "r");
  try {
    const buf = Buffer.alloc(HEAD_BYTES_FOR_CLASSIFY);
    const n = fs.readSync(fd, buf, 0, HEAD_BYTES_FOR_CLASSIFY, 0);
    return buf.slice(0, n).toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot();
  const scriptsDir = args.root ? path.resolve(args.root) : path.join(repoRoot, SCRIPTS_ROOT_RELATIVE);
  if (!fs.existsSync(scriptsDir)) {
    process.stderr.write(`scripts dir not found: ${scriptsDir}\n`);
    process.exit(0);
  }

  const filenames = listExtractors(scriptsDir);
  const records = filenames.map((filename) => {
    const ext = filename.split(".").pop() ?? "";
    const body = readHead(path.join(scriptsDir, filename));
    return classifyExtractor({ filename, body, ext });
  });
  const summary = summarize(records);
  const generatedAt = new Date().toISOString();
  const report = { generatedAt, scriptsDir, records, summary };

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }
  if (args.markdown) {
    const md = renderInventoryMarkdown(report);
    const outPath = path.join(repoRoot, "EXTRACTOR-INVENTORY.md");
    fs.writeFileSync(outPath, md, "utf8");
    process.stdout.write(`wrote ${outPath} (${md.length} bytes, ${records.length} scripts)\n`);
    return;
  }

  // Human-readable summary
  process.stdout.write(`scripts: ${scriptsDir}\n`);
  process.stdout.write(`total:   ${summary.total}\n`);
  process.stdout.write(`keep:    ${summary.keepCount}  archive: ${summary.archiveCount}\n`);
  process.stdout.write(`input:   ${JSON.stringify(summary.inputFormatCounts)}\n`);
  process.stdout.write(`pattern: ${JSON.stringify(summary.patternTypeCounts)}\n`);
  process.stdout.write(`output:  ${JSON.stringify(summary.outputTargetCounts)}\n`);
  process.stdout.write(`vendors: ${Object.keys(summary.vendorCounts).length} distinct\n`);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("extractor-audit.mjs");
if (invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`unhandled: ${e?.stack ?? e}\n`);
    process.exit(0);
  });
}
