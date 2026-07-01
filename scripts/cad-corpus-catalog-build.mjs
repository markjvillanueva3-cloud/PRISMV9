#!/usr/bin/env node
/**
 * cad-corpus-catalog-build.mjs — KNOWLEDGE-EXTRACT-COMPLETE-MS0/U-KEC-CORPUS-CATALOG
 *
 * Walk the 4 user-named source directories (H:/PRISM/JM DIE, /resources,
 * /extracted, /extracted_modules) and build a unified file-type manifest:
 *
 *   - per-directory file counts
 *   - per-extension file counts
 *   - PDF count + sample paths (training material extraction targets)
 *   - CAD file count + sample paths (STEP/IGES/DWG/DXF/SLDPRT/IPT/F3D/X_T)
 *   - depth-limit and node-budget caps so the script doesn't stall on huge trees
 *
 * Output: state/shared/CAD-CORPUS-CATALOG-2026-05-24.json
 *
 * Default mode is APPLY (writes the catalog). --dry-run prints summary only.
 *
 * Designed to be re-runnable and resumable. Subsequent extractors
 * (U-KEC-PDF-LEARN-BATCH, U-KEC-CAD-FILE-INDEX) iterate over this manifest's
 * sample lists rather than re-walking the corpus.
 */

import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = resolve(__dirname, "..");

const SOURCE_DIRS = [
  "JM DIE",
  "resources",
  "extracted",
  "extracted_modules",
];

const PDF_EXTS = new Set([".pdf"]);
const CAD_EXTS = new Set([
  ".step", ".stp", ".iges", ".igs", ".ipt", ".iam", ".sldprt", ".sldasm",
  ".x_t", ".x_b", ".dwg", ".dxf", ".f3d", ".3dm", ".stl", ".prt", ".asm",
]);
const PROGRAM_EXTS = new Set([".nc", ".mpf", ".gcode", ".tap", ".eia", ".out"]);
const DOC_EXTS  = new Set([".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".md"]);
const CODE_EXTS = new Set([".ts", ".js", ".mjs", ".py", ".json"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);

const MAX_DEPTH = 8;
const MAX_NODES_PER_DIR = 200_000;
const SAMPLE_CAP = 25;

const APPLY = !process.argv.includes("--dry-run");
const OUT_FILE = join(REPO_ROOT, "state", "shared", "CAD-CORPUS-CATALOG-2026-05-24.json");

// ── Walk ────────────────────────────────────────────────────────────────────

function walk(root, budget) {
  const out = { fileCount: 0, dirCount: 0, byExt: {}, pdfSamples: [], cadSamples: [], programSamples: [] };
  if (!existsSync(root)) {
    out.missing = true;
    return out;
  }
  const stack = [{ path: root, depth: 0 }];
  while (stack.length > 0 && budget.nodesVisited < MAX_NODES_PER_DIR) {
    const { path, depth } = stack.pop();
    budget.nodesVisited++;
    let entries;
    try { entries = readdirSync(path); } catch { continue; }
    for (const entry of entries) {
      const p = join(path, entry);
      let s;
      try { s = statSync(p); } catch { continue; }
      if (s.isDirectory()) {
        out.dirCount++;
        if (depth < MAX_DEPTH) stack.push({ path: p, depth: depth + 1 });
      } else if (s.isFile()) {
        out.fileCount++;
        const ext = extname(entry).toLowerCase();
        out.byExt[ext] = (out.byExt[ext] || 0) + 1;
        if (PDF_EXTS.has(ext) && out.pdfSamples.length < SAMPLE_CAP) out.pdfSamples.push(p);
        else if (CAD_EXTS.has(ext) && out.cadSamples.length < SAMPLE_CAP) out.cadSamples.push(p);
        else if (PROGRAM_EXTS.has(ext) && out.programSamples.length < SAMPLE_CAP) out.programSamples.push(p);
      }
    }
  }
  out.budgetExhausted = budget.nodesVisited >= MAX_NODES_PER_DIR;
  return out;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const result = {
    schemaVersion: 1,
    builtAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    sourceDirs: SOURCE_DIRS,
    maxDepth: MAX_DEPTH,
    maxNodesPerDir: MAX_NODES_PER_DIR,
    perDir: {},
    totals: { files: 0, dirs: 0, pdfs: 0, cad: 0, programs: 0, docs: 0, code: 0, videos: 0 },
    extRollup: {},
  };

  for (const dir of SOURCE_DIRS) {
    const root = join(REPO_ROOT, dir);
    const budget = { nodesVisited: 0 };
    const summary = walk(root, budget);
    result.perDir[dir] = summary;
    if (summary.missing) continue;
    result.totals.files += summary.fileCount;
    result.totals.dirs  += summary.dirCount;
    for (const [ext, n] of Object.entries(summary.byExt)) {
      result.extRollup[ext] = (result.extRollup[ext] || 0) + n;
      if (PDF_EXTS.has(ext))     result.totals.pdfs += n;
      if (CAD_EXTS.has(ext))     result.totals.cad  += n;
      if (PROGRAM_EXTS.has(ext)) result.totals.programs += n;
      if (DOC_EXTS.has(ext))     result.totals.docs += n;
      if (CODE_EXTS.has(ext))    result.totals.code += n;
      if (VIDEO_EXTS.has(ext))   result.totals.videos += n;
    }
  }

  // Top 20 extensions by count for the next-phase extractor to prioritize.
  result.topExtensions = Object.entries(result.extRollup)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([ext, n]) => ({ ext, count: n }));

  if (APPLY) {
    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), "utf8");
  }

  const t = result.totals;
  const lines = [
    `[cad-corpus-catalog] mode=${APPLY ? "apply" : "dry-run"} dirs=${SOURCE_DIRS.length}`,
    `  totals: files=${t.files}  dirs=${t.dirs}`,
    `  pdfs=${t.pdfs}  cad=${t.cad}  programs=${t.programs}  docs=${t.docs}  videos=${t.videos}  code=${t.code}`,
    `  topExt: ${result.topExtensions.slice(0, 8).map(e => `${e.ext}(${e.count})`).join(" ")}`,
  ];
  for (const dir of SOURCE_DIRS) {
    const d = result.perDir[dir];
    if (d.missing) { lines.push(`  ${dir}: MISSING`); continue; }
    lines.push(`  ${dir}: files=${d.fileCount} dirs=${d.dirCount} budgetExhausted=${!!d.budgetExhausted}`);
  }
  if (APPLY) lines.push(`  wrote ${OUT_FILE}`);
  process.stdout.write(lines.join("\n") + "\n");
}

main();
