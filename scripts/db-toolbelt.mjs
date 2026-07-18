#!/usr/bin/env node
// scripts/db-toolbelt.mjs
//
// JULIETT DOMAIN TOOLBELT — one command surface for every DB / extraction / batch
// tool juliett (database-expansion) reaches for. Operator directive (2026-05-31):
// "make all scripts and hooks and batch tools and extractors easily accessible for
//  your domain since you'll be using them the most. lets start getting our database
//  maxed out with data."
//
// USE:
//   node scripts/db-toolbelt.mjs                 # list all tools (categorized)
//   node scripts/db-toolbelt.mjs --cat extractor # list one category
//   node scripts/db-toolbelt.mjs --json          # machine-readable registry
//   node scripts/db-toolbelt.mjs --status        # DB-fill dashboard (how maxed-out are the stores)
//   node scripts/db-toolbelt.mjs --run <id> [-- <args...>]   # dispatch a tool
//
// The extractor sub-registry is imported from lib/catalog-extraction-router.mjs
// (single source of truth — never duplicate the extractor list).
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { EXTRACTORS } from "./lib/catalog-extraction-router.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ── TOOL REGISTRY (curated canonical set; the 155 raw scripts collapse to what juliett runs) ──
export const TOOLS = {
  database_builders: [
    { id: "jm-die-db", run: "node scripts/build-jm-die-database.mjs", desc: "DocuStrata+JM corpus -> mcp-server/data/jm-die-database/ (111K docs / 38K files)", when: "after Docustrata changes" },
    { id: "vendor-catalog-db", run: "node scripts/build-vendor-catalog-db.mjs", desc: "Charlie vendor corpus -> mcp-server/data/vendor-catalog-db/ (vendors + catalogs + SFC pointers + jm spend)", when: "after Charlie regenerates the quoting artifacts" },
    { id: "monolith-db", run: "node scripts/extract-monolith-databases.mjs --apply", desc: "monolith HTMLs -> mcp-server/data/prism-reference-db/ (1859 stores / 13.9K records, 17 category bundles)", when: "monolith HTML changes" },
    { id: "sfc-manifest", run: "node scripts/build-catalog-sfc-manifest.mjs --directory state/shared/quoting/vendor-directory.jsonl --catalogs state/shared/quoting/vendor-sources/catalog-vendors.jsonl --jm-tools state/shared/quoting/jm-tool-purchases.json --out-dir state/shared/quoting", desc: "per-maker SFC extraction worklist (139 makers; vc/fz target .ts)", when: "vendor directory / catalogs change (charlie-owned)" },
    { id: "vendor-directory", run: "node scripts/build-vendor-directory.mjs --out-dir state/shared/quoting --sources-dir H:/prism-slot-charlie/state/shared/quoting/vendor-sources", desc: "433-vendor supplier directory (charlie-owned source build)", when: "vendor sources change" },
  ],
  extractors: EXTRACTORS.map((e) => ({ id: e.id, run: e.script.startsWith("scripts/") ? `${e.lang.startsWith("python") ? "python" : "node"} ${e.script}` : e.script, desc: `${e.captures.slice(0, 4).join("/")} [${e.fidelity}]`, when: e.when })),
  batch_books: [
    { id: "batch-pdf", run: "node scripts/batch-pdf-extract.mjs --max 20", desc: "pdftotext triage stubs over the PDF backlog (confidence 0.3; promote later)", when: "fast first-pass over many PDFs" },
    { id: "batch-vision", run: "node scripts/batch-ollama-vision-extract.mjs", desc: "resumable overnight qwen3-vl:8b-instruct vision-OCR (SHA checkpoint)", when: "scanned/complex PDFs; REQUIRES Ollama up. Runs CONCURRENT with the chat fleet (8.1GB GPU-resident — no longer needs an idle GPU)" },
    { id: "batch-extraction", run: "python scripts/batch/extraction_batch.py", desc: "Python batch-extraction harness (the 'batch books')", when: ">100 files extraction run" },
    { id: "batch-material", run: "python scripts/batch/material_batch.py", desc: "material-science dataset batch generator", when: "bulk material-data population" },
    { id: "batch-report", run: "python scripts/batch/report_generator.py", desc: "summarize a batch run", when: "after a batch" },
  ],
  enrich: [
    { id: "enrich-cutting", run: "node scripts/enrich-catalog-cutting-data.mjs", desc: "cross-ref tool skeletons vs ingested speed-feed .ts -> fill cutting_data (loud-flags unmatched)", when: "after extraction, to lift coverage with NO new PDF parse" },
    { id: "router", run: "node -e \"import('./scripts/lib/catalog-extraction-router.mjs').then(m=>console.log(JSON.stringify(m.buildRoutingRegistry(new Date().toISOString()),null,2)))\"", desc: "print the extractor routing + full math/science schema", when: "deciding which extractor to use / what math/science to capture" },
    { id: "classify-tables", run: "node scripts/lib/catalog-table-classifier.mjs", desc: "classify camelot-extracted tables (cutting-data/geometry/index/other) — the pre-normalizer gate so only real SF grids get persisted, never catalog index prose", when: "after camelot-extract <pdf>, BEFORE persisting cutting_data" },
  ],
  guards_hooks: [
    { id: "corpus-integrity", path: ".claude/hooks/corpus-integrity.mjs", desc: "PostToolUse:Write — JSONL pipeline JSON+hash+schema+dedup guard (fires automatically)", when: "auto — guards every JSONL write" },
    { id: "ingestion-cache-root-guard", path: ".claude/hooks/ingestion-cache-root-guard.mjs", desc: "PostToolUse — ingestion content must land in data/ingestion_cache/ (excludes src/engines, scripts, *.md/.ts/.mjs)", when: "auto — keeps scraped data corralled" },
    { id: "file-claim-guard", path: ".claude/hooks/file-claim-guard.mjs", desc: "PreToolUse — blocks edits to peer-claimed files (multi-chat safety)", when: "auto" },
  ],
};

// ── DB-fill status dashboard (how maxed-out are the stores) ─────────────────────────
const STORES = [
  { id: "jm-die-database", manifest: "mcp-server/data/jm-die-database/manifest.json" },
  { id: "vendor-catalog-db", manifest: "mcp-server/data/vendor-catalog-db/manifest.json" },
  { id: "prism-reference-db", manifest: "mcp-server/data/prism-reference-db/MANIFEST.json" },
];

function readJsonSafe(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(REPO, rel), "utf8")); } catch { return null; }
}

function storeStatus() {
  return STORES.map((s) => {
    const m = readJsonSafe(s.manifest);
    if (!m) return { id: s.id, present: false };
    let counts = m.counts || m.summary || m.rollups || {};
    // prism-reference-db's manifest uses byCategory:{cat:{count,records,bytes}} — not `counts`.
    // Without this branch the dashboard printed `{}` while the store held 13,920 records (silent misreport, R12).
    if ((!counts || Object.keys(counts).length === 0) && m.byCategory && typeof m.byCategory === "object") {
      counts = Object.fromEntries(
        Object.entries(m.byCategory).map(([k, v]) => [k, (v && (v.records ?? v.count)) ?? v]),
      );
    }
    const byCatTotal = m.byCategory && typeof m.byCategory === "object"
      ? Object.values(m.byCategory).reduce((a, v) => a + ((v && (v.records ?? v.count)) || 0), 0)
      : null;
    const total = m.totalDocs || m.totalRecords || m.count || byCatTotal
      || (counts && (counts.vendors || counts.total)) || null;
    return { id: s.id, present: true, schemaVersion: m.schemaVersion || null, counts, total };
  });
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────
function flatTools() {
  return Object.entries(TOOLS).flatMap(([cat, arr]) => arr.map((t) => ({ ...t, category: cat })));
}

function printList(catFilter) {
  for (const [cat, arr] of Object.entries(TOOLS)) {
    if (catFilter && cat !== catFilter && !cat.startsWith(catFilter)) continue;
    console.log(`\n## ${cat}`);
    for (const t of arr) {
      const cmd = t.run || `(hook) ${t.path}`;
      console.log(`  ${t.id.padEnd(26)} ${t.desc}`);
      console.log(`  ${" ".repeat(26)} → ${cmd}`);
      if (t.when) console.log(`  ${" ".repeat(26)}   when: ${t.when}`);
    }
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--json")) { console.log(JSON.stringify({ tools: TOOLS, stores: storeStatus() }, null, 2)); return; }
  if (argv.includes("--status")) {
    console.log("DB-fill status (juliett stores):");
    for (const s of storeStatus()) {
      if (!s.present) { console.log(`  ${s.id.padEnd(20)} MISSING (not built)`); continue; }
      console.log(`  ${s.id.padEnd(20)} schema ${s.schemaVersion || "—"} · total=${s.total ?? "?"} · ${JSON.stringify(s.counts).slice(0, 140)}`);
    }
    return;
  }
  const runIdx = argv.indexOf("--run");
  if (runIdx !== -1) {
    const id = argv[runIdx + 1];
    const tool = flatTools().find((t) => t.id === id);
    if (!tool) { console.error(`[db-toolbelt] unknown tool id: ${id}. Run with no args to list.`); process.exit(2); }
    if (!tool.run) { console.error(`[db-toolbelt] ${id} is a ${tool.category} (auto-firing hook), not directly runnable. Path: ${tool.path}`); process.exit(2); }
    const passThru = argv.includes("--") ? argv.slice(argv.indexOf("--") + 1) : [];
    const cmd = passThru.length ? `${tool.run} ${passThru.join(" ")}` : tool.run;
    console.log(`[db-toolbelt] running ${id}: ${cmd}`);
    const r = spawnSync(cmd, { cwd: REPO, shell: true, stdio: "inherit" });
    process.exit(r.status ?? 0);
  }
  const catIdx = argv.indexOf("--cat");
  printList(catIdx !== -1 ? argv[catIdx + 1] : null);
  console.log(`\n(${flatTools().length} tools · \`--run <id>\` to dispatch · \`--status\` for DB fill · \`--json\` machine-readable)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
