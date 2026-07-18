#!/usr/bin/env node
/**
 * cad-curved-dim-diagnose.mjs -- diagnostic for the curved-part dim-accuracy gap (slot:delta).
 *
 * The generation quality report shows curved DIAMETER accuracy at ~69% over ~149 measured, but that
 * `accurate` flag is `diaAccurate && lenAccurate`. This splits the two so we can see whether the ~31%
 * "miss" is a real DIAMETER defect or a LENGTH-measurement artifact on disc-shaped cylinders (where the
 * vertex bbox may capture the circular diameter instead of the short axial length). READ-ONLY, no cadquery.
 *
 *   node scripts/cad-curved-dim-diagnose.mjs [--limit N]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { curvedDimCheck } from "./lib/cad-curved-dim-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GEN_DIR = path.resolve(ROOT, "state/shared/cad-text-gen");

function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : 0;
  const maxArg = process.argv.indexOf("--max");
  const maxDirs = maxArg >= 0 ? Number(process.argv[maxArg + 1]) : 0; // 0 = all
  const MAX_STEP_BYTES = 2 * 1024 * 1024; // skip huge STEP (curved primitives are tiny; big = complex, not curved-dim-checkable)
  let dirs = fs.readdirSync(GEN_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  if (maxDirs > 0) dirs = dirs.slice(0, maxDirs);
  const rows = [];
  let skippedBig = 0;
  for (const slug of dirs) {
    const dir = path.join(GEN_DIR, slug);
    const stepPath = path.join(dir, "model.step");
    const reqPath = path.join(dir, "request.json");
    if (!fs.existsSync(stepPath) || !fs.existsSync(reqPath)) continue;
    let req; try { req = JSON.parse(fs.readFileSync(reqPath, "utf8")).request; } catch { continue; }
    if (typeof req !== "string") continue;
    let st; try { st = fs.statSync(stepPath); } catch { continue; }
    if (st.size > MAX_STEP_BYTES) { skippedBig++; continue; }
    const step = fs.readFileSync(stepPath, "utf8");
    const cd = curvedDimCheck(req, step);
    if (!cd.applicable) continue;
    rows.push({ slug, req, ...cd });
  }
  if (skippedBig) console.log(`  (skipped ${skippedBig} STEP > 2MB)`);
  const applicable = rows.length;
  const diaOk = rows.filter((r) => r.diaDeltaPct <= 2).length;
  const bothOk = rows.filter((r) => r.accurate).length;
  const lenStated = rows.filter((r) => r.requestedLenMm != null);
  const lenOk = lenStated.filter((r) => r.lenDeltaPct != null && r.lenDeltaPct <= 2).length;
  // The failures: diameter passes but the WHOLE check fails (i.e. length is what sinks it)
  const lenSunkDiaOk = rows.filter((r) => r.diaDeltaPct <= 2 && !r.accurate);
  // The real diameter defects: diameter itself misses
  const diaMiss = rows.filter((r) => r.diaDeltaPct > 2);

  console.log(`curved-dim diagnose over ${applicable} applicable curved gens:`);
  console.log(`  DIAMETER-only accurate: ${diaOk}/${applicable} (${(100 * diaOk / applicable).toFixed(1)}%)`);
  console.log(`  BOTH dia+len accurate:  ${bothOk}/${applicable} (${(100 * bothOk / applicable).toFixed(1)}%)  <- the reported "curved accurate"`);
  console.log(`  length stated: ${lenStated.length}  length accurate: ${lenOk}/${lenStated.length}`);
  console.log(`  >> dia OK but check FAILS (length-sunk): ${lenSunkDiaOk.length}`);
  console.log(`  >> real DIAMETER misses (>2%):           ${diaMiss.length}`);
  const show = (arr, label) => {
    console.log(`\n  --- ${label} (first ${Math.min(limit || 12, arr.length)}) ---`);
    for (const r of arr.slice(0, limit || 12)) {
      console.log(`    dia req=${r.requestedDiaMm} got=${r.matchedDiaMm} (${r.diaDeltaPct}%)  len req=${r.requestedLenMm} got=${r.matchedLenMm} (${r.lenDeltaPct}%)  ${r.slug.slice(0, 40)}`);
    }
  };
  if (lenSunkDiaOk.length) show(lenSunkDiaOk, "LENGTH-SUNK (diameter is fine)");
  if (diaMiss.length) show(diaMiss, "REAL DIAMETER MISSES");
}
main();
