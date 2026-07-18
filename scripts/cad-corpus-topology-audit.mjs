// cad-corpus-topology-audit.mjs -- audit the REAL CAD reference corpus for topologically-broken parts
// (U-CADGEN-CORPUS-TOPOLOGY-AUDIT, slot:delta 2026-07-04). Runs the OCCT-kernel validity gate
// (cad-topology-validity.mjs, 73347d34eb) over the neutral B-Rep corpus under resources/CAD FILES.
//
// WHY: the closed loop uses real CAD (imported STEP/IGES, Fusion exports, JM reference parts) as ground
// truth for comparison + as training references. Unlike cadquery-generated gens (valid by construction),
// real-world CAD CAN be topologically invalid (non-manifold, open shells, self-intersecting from a bad
// import/conversion). A broken reference part is a poisoned training reference. This finds them so they
// can be excluded / flagged. The gate is the KERNEL check (Shape.isValid), not regex.
//
// Bounded by --limit (default 120) so a run is tractable on the slow disk; --limit 0 = no cap. It reports
// the fraction valid + lists the INVALID parts (valid===false) and the unreadable ones (valid===null).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSteps, summarize } from "./cad-topology-validity.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CORPUS = path.resolve("H:/PRISM/resources/CAD FILES");
const STEP_RE = /\.(step|stp)$/i;

/**
 * Recursively collect up to `limit` STEP file paths under `root` (breadth-ish, dir by dir). Bounded so
 * the scan itself can't run away on a huge tree. Injected fs ops for testability.
 */
export function collectStepFiles(root, { limit = 120, readdir = fs.readdirSync, stat = fs.statSync } = {}) {
  const found = [];
  const stack = [root];
  while (stack.length && (limit === 0 || found.length < limit)) {
    const dir = stack.shift();
    let entries;
    try { entries = readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      let isDir = false, isFile = false;
      try {
        if (typeof ent.isDirectory === "function") { isDir = ent.isDirectory(); isFile = ent.isFile(); }
        else { const s = stat(full); isDir = s.isDirectory(); isFile = s.isFile(); }
      } catch { continue; }
      if (isDir) { if (!/node_modules|\.git/.test(ent.name)) stack.push(full); }
      else if (isFile && STEP_RE.test(ent.name)) {
        found.push(full);
        if (limit !== 0 && found.length >= limit) break;
      }
    }
  }
  return found;
}

export const __test = { collectStepFiles };

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const limArg = args.find((a) => a.startsWith("--limit="));
  const limit = limArg ? Number(limArg.split("=")[1]) : 120;
  const rootArg = args.find((a) => !a.startsWith("--"));
  const root = rootArg || DEFAULT_CORPUS;

  if (!fs.existsSync(root)) { console.error(`corpus root not found: ${root}`); process.exit(2); }
  const t0 = Date.now();
  const paths = collectStepFiles(root, { limit });
  const results = validateSteps(paths, { timeoutMs: 20 * 60 * 1000 });
  const s = summarize(results);
  const unreadable = results.filter((r) => r.valid === null && r.error && r.error !== "missing");
  // The FULL invalid list (not capped) -- this is the consumable exclusion artifact: a broken reference
  // part must be excluded from CADGeometryComparisonEngine's ground-truth set (comparing against it is
  // meaningless). --write persists it so a consumer can read it without re-running the (slow) kernel scan.
  const report = {
    generatedAt: new Date().toISOString(), root, scanned: paths.length, limit,
    valid: s.valid, invalid: s.invalid, unanalyzable: s.unanalyzable,
    invalidPaths: results.filter((r) => r.valid === false).map((r) => r.path),
    unreadable: unreadable.slice(0, 50).map((r) => ({ path: r.path, error: r.error })),
  };
  if (args.includes("--write")) {
    const outPath = path.resolve(ROOT, "state", "shared", "cad-corpus-topology-report.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const tmp = `${outPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(report, null, 2) + "\n");
    fs.renameSync(tmp, outPath); // atomic
    report.wrote = outPath;
  }
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`cad-corpus-topology-audit: ${s.valid}/${s.total} valid, ${s.invalid} INVALID, ${s.unanalyzable} unanalyzable (root=${root}, limit=${limit})`);
    for (const p of s.invalidPaths) console.log(`  INVALID (topologically broken): ${p}`);
    for (const r of unreadable.slice(0, 15)) console.log(`  UNREADABLE: ${path.basename(r.path)} :: ${r.error}`);
    console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}
