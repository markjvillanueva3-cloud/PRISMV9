#!/usr/bin/env node
/**
 * batch-pdf-extract.mjs — scalable PDF extraction for the 207-PDF pending backlog.
 *
 * For each pending PDF (per iter43 coverage roost), runs pdftotext on the first
 * N pages, harvests a heuristic "title + section anchor" tip, and emits a stub
 * jsonl entry to state/shared/extracted-pdfs/batch-<batch>.jsonl. These show up
 * automatically in the iter28 roost on the next regen-viz run.
 *
 * STUB tips are flagged `confidence: 0.3` + `extraction_quality: "batch-stub"`
 * + `needs_curation: true` so downstream consumers know they're heuristic, not
 * page-cited. Operator can promote to full tip in a later manual iter.
 *
 * Bounded: extracts up to --max N PDFs per run (default 20) to keep runtime under
 * a few minutes. Run repeatedly to advance coverage. Skips already-extracted PDFs
 * automatically (collectExtractedPdfPaths intersection).
 *
 * Usage:
 *   node scripts/batch-pdf-extract.mjs                # 20 PDFs, default kinds
 *   node scripts/batch-pdf-extract.mjs --max 50       # bigger batch
 *   node scripts/batch-pdf-extract.mjs --kind blueprint-pdf  # filter by kind
 *   node scripts/batch-pdf-extract.mjs --dry-run      # plan only, no write
 *
 * @milestone MIT-COURSE-INTEGRATION/U-PDF-BATCH-EXTRACT
 * @slot india
 * @iter 44
 * @date 2026-05-25
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";

const CORPUS_PATH = path.join(ROOT, "state/shared/cadcam-consolidated-corpus.json");
const TIPS_DIR = path.join(ROOT, "state/shared/extracted-pdfs");
const BRIDGE_FALLBACK = {
  "blueprint-pdf":     ["engine.PdfBlueprintDimensionExtractorEngine", "engine.CADGeometryEngine"],
  "manual-pdf":        ["engine.PostProcessorPipelineEngine", "engine.MachineControllerEngine"],
  "resource-catalog":  ["engine.ShopToolingRegistryEngine", "engine.ToolCatalogEngine"],
  "machining-handbook":["engine.KienzleForceModelEngine", "engine.CuttingForceEngine", "engine.UltimateSpeedFeedEngine"],
  "other-pdf":         ["engine.PdfGenericExtractorEngine"],
};

/** Pure: normalize a path. */
export function normalizePath(p) {
  if (!p || typeof p !== "string") return "";
  return p.replace(/\\/g, "/").replace(/^([a-z]):/i, (_, d) => d.toUpperCase() + ":");
}

/** Pure: parse argv into options. */
export function parseArgs(argv) {
  const out = { max: 20, kind: null, dryRun: false, pages: 5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--max" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.max = Number.isFinite(n) ? Math.max(1, n) : 20;
    }
    else if (a === "--kind" && argv[i + 1]) out.kind = argv[++i];
    else if (a === "--pages" && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      out.pages = Number.isFinite(n) ? Math.max(1, Math.min(50, n)) : 5;
    }
  }
  return out;
}

/** Pure: read jsonl files + collect extracted-pdf paths set. */
export function collectExtractedPaths(dir = TIPS_DIR) {
  const out = new Set();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".jsonl")) continue;
    let text;
    try { text = fs.readFileSync(path.join(dir, f), "utf8"); } catch { continue; }
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      try {
        const obj = JSON.parse(t);
        if (obj?.source?.pdf_path) out.add(normalizePath(obj.source.pdf_path));
      } catch { /* skip */ }
    }
  }
  return out;
}

/** Pure: collect pending pdf entries from corpus, optionally filtered by kind. */
export function collectPendingEntries(corpus, alreadyExtracted, kindFilter = null) {
  const all = [
    ...(Array.isArray(corpus?.cad) ? corpus.cad : []),
    ...(Array.isArray(corpus?.cam) ? corpus.cam : []),
    ...(Array.isArray(corpus?.both) ? corpus.both : []),
  ];
  const seenSlugs = new Set();
  const pending = [];
  for (const e of all) {
    if (!e || typeof e.slug !== "string") continue;
    if (seenSlugs.has(e.slug)) continue;
    seenSlugs.add(e.slug);
    if (e.source_type !== "pdf") continue;
    if (kindFilter && e.kind !== kindFilter) continue;
    const norm = normalizePath(e.source || "");
    if (alreadyExtracted.has(norm)) continue;
    pending.push(e);
  }
  return pending;
}

/** Pure: extract a heuristic title from the first lines of pdftotext output. */
export function heuristicTitle(text) {
  const lines = String(text || "").split(/\r?\n/).map(s => s.trim()).filter(s => s.length >= 4 && s.length <= 100);
  for (const l of lines) {
    if (/^[A-Z]/.test(l) && !/^(page|copyright|©|\d+\s)/i.test(l)) return l;
  }
  return lines[0] || "(unknown title)";
}

/** Run pdftotext on a single PDF + return text body (or null on failure). */
export function runPdftotext(pdfPath, pages) {
  const r = spawnSync("pdftotext", ["-layout", "-f", "1", "-l", String(pages), pdfPath, "-"], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0 || !r.stdout) return null;
  return r.stdout;
}

/** Pure: shape a stub tip for one PDF. */
export function entryToStubTip(entry, title, ts) {
  const kind = entry.kind || "other-pdf";
  const engines = BRIDGE_FALLBACK[kind] || BRIDGE_FALLBACK["other-pdf"];
  const audience = entry.classification?.cad
    ? (entry.classification?.cam ? ["delta", "kilo"] : ["delta"])
    : (entry.classification?.cam ? ["kilo"] : ["alpha"]);
  return {
    id: `batch.${entry.slug}`,
    domain: entry.classification?.cad ? "cad" : (entry.classification?.cam ? "cam" : "general"),
    topic: "batch-stub-pending-curation",
    tip: `BATCH-STUB tip from ${entry.kind} PDF "${title.slice(0, 80)}". Page-1 heuristic only — REQUIRES MANUAL CURATION before downstream training consumption. Bridge engines from kind-fallback map; refine on curation pass.`,
    source: {
      book: title.slice(0, 80),
      kind: entry.kind,
      pdf_path: entry.source,
      extraction_quality: "batch-stub",
      pages_scanned: "1-5",
    },
    bridge_engines: engines,
    audience,
    confidence: 0.3,
    needs_curation: true,
    extracted_at: ts,
    extracted_by: "claude-9f3a8e4f-india-iter44-batch",
    schemaVersion: SCHEMA_VERSION,
  };
}

export function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(`FATAL: ${CORPUS_PATH} missing`);
    return 1;
  }
  const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
  const extracted = collectExtractedPaths();
  const pending = collectPendingEntries(corpus, extracted, args.kind);

  console.log(`pending PDFs matching filter: ${pending.length}`);
  console.log(`batch limit (--max):           ${args.max}`);
  console.log(`pages per PDF (--pages):       ${args.pages}`);
  console.log(`already-extracted set size:    ${extracted.size}`);

  const targets = pending.slice(0, args.max);
  if (args.dryRun) {
    console.log(`DRY-RUN — would extract ${targets.length} PDFs:`);
    for (const t of targets) console.log(`  ${t.slug} (${t.kind})`);
    return 0;
  }

  const ts = new Date().toISOString();
  const stubs = [];
  let succeeded = 0, failed = 0;
  for (const e of targets) {
    if (!fs.existsSync(e.source)) {
      console.error(`  [skip] ${e.slug}: source file missing`);
      failed++;
      continue;
    }
    const text = runPdftotext(e.source, args.pages);
    if (!text) {
      console.error(`  [fail] ${e.slug}: pdftotext failed (timeout / parse error)`);
      failed++;
      continue;
    }
    const title = heuristicTitle(text);
    stubs.push(entryToStubTip(e, title, ts));
    succeeded++;
  }

  if (stubs.length === 0) {
    console.log("no stubs to write");
    return 0;
  }
  const outName = `batch-${ts.replace(/[:.]/g, "-").slice(0, 19)}.jsonl`;
  const outPath = path.join(TIPS_DIR, outName);
  fs.mkdirSync(TIPS_DIR, { recursive: true });
  fs.writeFileSync(outPath, stubs.map(s => JSON.stringify(s)).join("\n") + "\n");
  console.log(`wrote ${outPath} (${stubs.length} stub tips)`);
  console.log(`succeeded: ${succeeded}, failed: ${failed}, batch coverage delta: +${stubs.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
