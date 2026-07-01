#!/usr/bin/env node
/**
 * jm-die-prism-cad-files-scan.mjs — JM-DIE-ORGANIZE-MS0/U-JMO02
 *
 * Phase 3 candidate scanner: enumerate CAD-format files on H:/ OUTSIDE
 * `JM DIE/` so the operator can confirm which sources to copy into
 * `_PART LIBRARY/prism cad files/`.
 *
 * Read-only. Emits:
 *   state/shared/jm-die-prism-cad-files-candidates.json
 *
 * Strategy: walk pre-computed h-drive-dir-index.json (cheap), not the
 * filesystem directly (the dir-index already cost 4 minutes to build).
 * Find every directory containing ≥1 CAD-format file, summarize size.
 *
 * Excludes:
 *   - H:/PRISM/JM DIE/ (already its own org operation)
 *   - H:/prism-slot-X (slot worktrees — git clones, NOT canonical source)
 *   - H:/prism-cad-X (slot worktrees — same reason)
 *   - H:/prism-X (anything matching slot-worktree pattern)
 *   - any node_modules / .git / .cache / dist / build subtree
 *
 * The operator can then run jm-die-organize-files.mjs with the
 * --prism-cad-files flag (Phase 3b — separate commit) pointing at the
 * chosen subset.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR_INDEX_PATH = path.join(ROOT, "state", "shared", "system-viz", "h-drive-dir-index.json");
const OUT_PATH = path.join(ROOT, "state", "shared", "jm-die-prism-cad-files-candidates.json");

const CAD_EXTS = new Set([
  ".step", ".stp",      // ISO 10303
  ".iges", ".igs",      // ANSI Y14.26
  ".sldprt", ".sldasm", // SolidWorks
  ".ipt", ".iam",       // Inventor
  ".f3d",               // Fusion 360
  ".3dm",               // Rhino
  ".stl",               // mesh
  ".x_t", ".x_b",       // Parasolid
  ".sat",               // ACIS
  ".obj",               // Wavefront
  ".dwg", ".dxf",       // AutoCAD
  ".prt",               // NX / Creo / Pro-E
  ".catpart", ".catproduct", // CATIA
  ".jt",                // JT
]);

// Path-prefix excludes
const EXCLUDE_PREFIXES = [
  "H:/PRISM/JM DIE",
  "H:/prism-slot-",
  "H:/prism-cad-",
  "H:/prism-cam-",
  "H:/prism-test-",
];

// Substring excludes (anywhere in path)
const EXCLUDE_SUBSTRINGS = [
  "/node_modules/",
  "/.git/",
  "/.cache/",
  "/dist/",
  "/build/",
];

function shouldExclude(dirPath) {
  for (const p of EXCLUDE_PREFIXES) {
    if (dirPath.startsWith(p)) return true;
  }
  for (const s of EXCLUDE_SUBSTRINGS) {
    if (dirPath.includes(s)) return true;
  }
  return false;
}

function main() {
  if (!fs.existsSync(DIR_INDEX_PATH)) {
    console.error(`ERR: dir-index not found at ${DIR_INDEX_PATH}`);
    console.error(`     Regenerate via: node scripts/h-drive-full-index.mjs`);
    process.exit(2);
  }
  console.log(`[prism-cad-scan] loading dir-index (~21MB)...`);
  const t0 = Date.now();
  const idx = JSON.parse(fs.readFileSync(DIR_INDEX_PATH, "utf8"));
  console.log(`[prism-cad-scan] loaded ${idx.dirs.length} dirs in ${Date.now() - t0}ms`);

  const candidates = [];
  let scannedCount = 0;
  let excludedCount = 0;

  for (const dir of idx.dirs) {
    scannedCount++;
    if (shouldExclude(dir.path)) { excludedCount++; continue; }
    if (!dir.byExt) continue;
    // Count CAD-format files in this dir
    let cadFileCount = 0;
    let cadBytes = 0;
    const cadByExt = {};
    for (const [ext, count] of Object.entries(dir.byExt)) {
      if (CAD_EXTS.has(ext.toLowerCase())) {
        cadFileCount += count;
        cadByExt[ext] = count;
      }
    }
    if (cadFileCount === 0) continue;
    // estimate bytes from total bytes × (cad / total) — approximate but good enough
    if (dir.fileCount > 0 && dir.totalBytes > 0) {
      cadBytes = Math.round(dir.totalBytes * (cadFileCount / dir.fileCount));
    }
    candidates.push({
      path: dir.path,
      depth: dir.depth,
      cadFileCount,
      estCadBytes: cadBytes,
      cadByExt,
      totalFileCount: dir.fileCount,
      totalBytes: dir.totalBytes,
    });
  }

  candidates.sort((a, b) => b.cadFileCount - a.cadFileCount);

  const summary = {
    generatedAt: new Date().toISOString(),
    dirIndexGeneratedAt: idx.generatedAt,
    scannedDirs: scannedCount,
    excludedDirs: excludedCount,
    candidateDirs: candidates.length,
    totalCadFiles: candidates.reduce((a, c) => a + c.cadFileCount, 0),
    totalEstCadBytes: candidates.reduce((a, c) => a + c.estCadBytes, 0),
    topCandidates: candidates.slice(0, 20),
    allCandidates: candidates,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2));
  console.log(`[prism-cad-scan] wrote ${OUT_PATH}`);
  console.log(`[prism-cad-scan] candidates=${candidates.length} totalCadFiles=${summary.totalCadFiles.toLocaleString()} estBytes=${(summary.totalEstCadBytes / 1e9).toFixed(2)} GB`);
  console.log(`[prism-cad-scan] TOP 10 candidate dirs:`);
  for (const c of candidates.slice(0, 10)) {
    const exts = Object.entries(c.cadByExt).map(([e, n]) => `${e}=${n}`).join(", ");
    console.log(`  ${c.cadFileCount.toString().padStart(6)} files  ${(c.estCadBytes / 1e6).toFixed(1).padStart(7)} MB  ${c.path}  [${exts}]`);
  }
  console.log(`\n[prism-cad-scan] next step: operator confirms which candidates → run Phase 3b copy`);
}

main();
