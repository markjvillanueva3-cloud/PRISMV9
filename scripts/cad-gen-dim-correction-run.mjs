#!/usr/bin/env node
/**
 * cad-gen-dim-correction-run.mjs -- the cad-gen DIMENSIONAL-correction harness
 * (U-DELTA-CADGEN-DIM-CORRECTION, slot:delta 2026-06-28). UNFREEZES CAD self-learning: it reads each
 * text->CadQuery GEN part (state/shared/cad-text-gen/<slug>/{request.json,model.step}), parses the
 * INTENDED prismatic envelope from request.json's spec, extracts the PRODUCED envelope from model.step
 * (via the fixed extractBboxMm), and a divergence -> a fix-ledger correction row. Today the 82-row
 * fix-ledger has NO live producer (verified 2026-06-28, [[reference_delta_live_cad_loop_map_2026_06_28]]);
 * this grows it from real generation divergence -> the LoRA training feed (cad-fix-training-corrections).
 *
 * Pure core (collectDivergences) is hermetically testable with injected fs + extractor + parser. Only
 * PRISMATIC box-family parts are checked (the lib gates round/featured ones -- point-bbox unreliable).
 *
 * Usage:
 *   node scripts/cad-gen-dim-correction-run.mjs --json                 # dry-run report (default)
 *   node scripts/cad-gen-dim-correction-run.mjs --apply --stamp <iso>  # append diverged rows to ledger
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractBboxMm } from "./lib/step-dimension-extract.mjs";
import { parseIntendedDims, dimDivergence, dimDivergenceToFixRow } from "./lib/cad-gen-dim-correction.mjs";
import { fixRowKey, dedupAgainst } from "./lib/cad-correction-to-fix-ledger.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GEN_DIR = path.join(ROOT, "state", "shared", "cad-text-gen");
const LEDGER = path.join(ROOT, "state", "shared", "cad-fix-training-ledger.jsonl");

/**
 * PURE: given a list of GEN part records [{ slug, spec, stepText }], diff each prismatic part's
 * produced envelope vs its intended spec and collect fix-ledger rows for the divergences.
 * Injected: parseImpl (spec->intended), bboxImpl (stepText->{dims}), diffImpl, rowImpl, stamp.
 * @returns { checked, prismatic, diverged, skipped, rows }
 */
export function collectDivergences(records, {
  parseImpl = parseIntendedDims, bboxImpl = extractBboxMm, diffImpl = dimDivergence,
  rowImpl = dimDivergenceToFixRow, stamp = null, relTol = 0.02,
} = {}) {
  const arr = Array.isArray(records) ? records : [];
  const rows = [];
  let prismatic = 0, diverged = 0, skipped = 0;
  for (const rec of arr) {
    const intended = parseImpl(rec && rec.spec);
    if (!intended) { skipped++; continue; }           // non-prismatic / unparseable -> not assessable here
    prismatic++;
    const bbox = bboxImpl(rec.stepText || "");
    if (!bbox || !Array.isArray(bbox.dims)) { skipped++; continue; } // unreadable/unknown-unit STEP
    const div = diffImpl(intended.envelopeMm, bbox.dims, { relTol });
    if (!div.assessable) { skipped++; continue; }
    if (div.diverged) {
      diverged++;
      const row = rowImpl(div, { part: intended.kind || "general", slug: rec.slug, ts: stamp });
      if (row) rows.push(row);
    }
  }
  return { checked: arr.length, prismatic, diverged, skipped, rows };
}

/** Read the GEN corpus records from disk: each <slug>/request.json (spec) + sibling model.step. */
function readGenRecords({ genDir = GEN_DIR, readDirImpl = fs.readdirSync, readFileImpl = fs.readFileSync, existsImpl = fs.existsSync } = {}) {
  let slugs = [];
  try { slugs = readDirImpl(genDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; }
  const out = [];
  for (const slug of slugs) {
    const reqPath = path.join(genDir, slug, "request.json");
    const stepPath = path.join(genDir, slug, "model.step");
    if (!existsImpl(reqPath) || !existsImpl(stepPath)) continue;
    let spec = "";
    try { spec = JSON.parse(readFileImpl(reqPath, "utf8")).request || ""; } catch { continue; }
    let stepText = "";
    try { stepText = readFileImpl(stepPath, "utf8"); } catch { continue; }
    out.push({ slug, spec, stepText });
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const apply = args.includes("--apply");
  const stamp = get("--stamp", process.env.PRISM_RUN_STAMP || null);

  const records = readGenRecords();
  if (apply && !stamp) { process.stderr.write("--apply requires --stamp <iso> (scripts cannot self-clock); refusing to write null-ts rows.\n"); process.exit(2); }
  const res = collectDivergences(records, { stamp });

  let appended = 0;
  if (apply && res.rows.length) {
    let existing = [];
    try { existing = fs.readFileSync(LEDGER, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { existing = []; }
    const existingKeys = new Set(existing.map(fixRowKey));
    const fresh = dedupAgainst(res.rows, existingKeys);
    if (fresh.length) { fs.appendFileSync(LEDGER, fresh.map((r) => JSON.stringify(r)).join("\n") + "\n"); appended = fresh.length; }
  }

  const out = { checked: res.checked, prismatic: res.prismatic, diverged: res.diverged, skipped: res.skipped, rowsProduced: res.rows.length, appended, applied: apply };
  if (asJson) { process.stdout.write(JSON.stringify({ ...out, rows: res.rows }, null, 2) + "\n"); return; }
  process.stdout.write(`[CADGEN-DIM-CORRECTION] checked ${out.checked} GEN parts -> ${out.prismatic} prismatic-assessable, ${out.diverged} diverged${apply ? `, ${appended} appended to fix-ledger` : " (dry-run; --apply --stamp <iso> to append)"}\n`);
  for (const r of res.rows.slice(0, 12)) process.stdout.write(`  ✗ ${r.source}: ${r.wrong} vs ${r.right}\n`);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main();

export { readGenRecords, GEN_DIR, LEDGER };
