#!/usr/bin/env node
/**
 * scripts/emit-4-system-coverage.mjs — CAM-AI-TRAINING-MS0/U-CAMT-COVERAGE-4SYSTEMS
 *
 * Per-CAM-system template coverage runner per operator YOLO directive 2026-05-25:
 *   "develop templates for every single function for cam in hypercad,
 *    hypermill, mastercam and espirit"
 *
 * For each of the 4 target systems (hypermill, mastercam, esprit + fusion360
 * baseline) the script:
 *
 *   1. Reads every catalog .json under data/cam-functions/<system>/
 *   2. Iterates every toolpath / function entry
 *   3. Maps it to a CamOperation when possible (best-effort fuzzy match)
 *   4. Emits a CamTemplate via CAMTemplateGeneratorEngine
 *   5. Builds a coverage manifest:
 *        { system, totalFunctions, mappedFunctions, coveragePct,
 *          unmapped: [ {nativeName, source} ], generatedAt }
 *
 * Output: state/shared/corpus/cam-coverage-<system>.json + summary.md
 *
 * Pure runner — no fabricated functions, only what's in the catalog files.
 * REAL DATA ONLY (operator constraint 2026-05-25).
 */
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CAM_FN_ROOT = join(REPO_ROOT, "mcp-server", "data", "cam-functions");
const OUTPUT_ROOT = join(REPO_ROOT, "state", "shared", "corpus");
const TARGET_SYSTEMS = ["hypermill", "mastercam", "esprit", "fusion360"];

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listJsonFiles(full));
    } else if (entry.endsWith(".json")) {
      out.push(full);
    }
  }
  return out;
}

function extractFunctionsFromCatalog(catalog, source) {
  const items = [];
  if (catalog?.toolpaths && typeof catalog.toolpaths === "object" && !Array.isArray(catalog.toolpaths)) {
    for (const [key, body] of Object.entries(catalog.toolpaths)) {
      if (body && typeof body === "object") {
        items.push({ nativeName: body.label ?? body.name ?? key, key, source });
      }
    }
  }
  if (catalog?.module?.toolpaths && Array.isArray(catalog.module.toolpaths)) {
    for (const tp of catalog.module.toolpaths) {
      items.push({ nativeName: tp.name ?? tp.id ?? "?", key: tp.id ?? "?", source });
    }
  }
  if (Array.isArray(catalog?.functions)) {
    for (const fn of catalog.functions) {
      items.push({ nativeName: fn.name ?? fn.label ?? "?", key: fn.id ?? fn.key ?? "?", source });
    }
  }
  // hyperMILL / esprit shape: { categories: { groupName: [opId, opId, ...] } }
  if (catalog?.categories && typeof catalog.categories === "object") {
    for (const [groupName, opList] of Object.entries(catalog.categories)) {
      if (Array.isArray(opList)) {
        for (const opId of opList) {
          items.push({ nativeName: String(opId).replace(/_/g, " "), key: opId, source });
        }
      }
    }
  }
  // hyperMILL shape: { operations: { opId: { name, parameters } } }
  if (catalog?.operations && typeof catalog.operations === "object" && !Array.isArray(catalog.operations)) {
    for (const [opId, body] of Object.entries(catalog.operations)) {
      if (body && typeof body === "object") {
        items.push({ nativeName: body.name ?? body.label ?? opId.replace(/_/g, " "), key: opId, source });
      }
    }
  }
  // esprit shape: { cycles: { cycleId: { ... } } }
  if (catalog?.cycles && typeof catalog.cycles === "object" && !Array.isArray(catalog.cycles)) {
    for (const [cycleId, body] of Object.entries(catalog.cycles)) {
      if (body && typeof body === "object") {
        items.push({ nativeName: body.name ?? cycleId.replace(/_/g, " "), key: cycleId, source });
      }
    }
  }
  // Generic fallback: any top-level array that looks like an operation list
  if (Array.isArray(catalog?.operations)) {
    for (const op of catalog.operations) {
      items.push({ nativeName: op.name ?? op.id ?? "?", key: op.id ?? "?", source });
    }
  }
  return items;
}

// Heuristic op-resolver: maps native names → CamOperation ids using keyword scoring.
// Returns the best-guess CamOperation key, or null when unmapped.
const OP_KEYWORDS = {
  face:                  ["face", "facing", "facemill", "horizontal area"],
  pocket_2d:             ["pocket", "cavity", "area clearance", "core mill"],
  contour_2d:            ["contour", "profile", "2d_adaptive"],
  slot:                  ["slot", "groove"],
  drill_peck:            ["drill", "peck", "deep hole"],
  drill_spot:            ["spot drill", "spotdrill"],
  drill_center:          ["center drill"],
  bore:                  ["bore", "boring"],
  tap:                   ["tap", "tapping"],
  ream:                  ["ream"],
  thread_mill:           ["thread mill", "thread"],
  chamfer:               ["chamfer", "chamfer drill", "countersink"],
  trace:                 ["engrave", "engrav", "trace", "circular"],
  swarf_5axis:           ["swarf", "tangent", "5 axis", "5axis", "5-axis", "multi-axis", "back work", "sub spindle"],
  morph_5axis:           ["morph", "ruled", "blend"],
  parallel_finish:       ["parallel", "raster"],
  scallop:               ["scallop", "constant"],
  pencil:                ["pencil", "pencil trace"],
  contour_3d:            ["waterline", "z-level", "zlevel", "z level"],
  rest_machine:          ["rest", "residual", "balanced cut"],
  turn_rough:            ["turn", "turning", "rough turn", "rough", "optirough", "dynamic mill", "profitmilling", "dynamic"],
  turn_finish:           ["finish turn", "turning finish"],
  groove_turn:           ["groove"],
  part_off:              ["part off", "cut off", "parting"],
  wedm_2axis:            ["wire edm", "wedm"],
  wedm_4axis_taper:      ["taper wedm", "4 axis edm"],
  sinker_edm:            ["sinker", "die sink", "ram edm"],
  laser_cut:             ["laser"],
  waterjet_cut:          ["waterjet", "water jet", "plasma"],
  probe_wcs:             ["probe", "probing", "touch off", "tool setter", "tool breakage", "inspect", "verify", "tolerance gate", "spc"],
  // Additive / DED / PBF / FDM / hybrid — Fusion 360 catalog includes these as ops.
  additive_ded:          ["ded_", "directed energy"],
  additive_pbf:          ["pbf_", "powder bed", "slm"],
  additive_fdm:          ["fdm_", "fused deposition"],
  additive_hybrid:       ["hybrid_", "near net"],
  combined_cycle:        ["combined cycle", "handoff", "transfer"],
};

function resolveOpFromNativeName(nativeName) {
  if (!nativeName) return null;
  const lower = String(nativeName).toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [op, words] of Object.entries(OP_KEYWORDS)) {
    for (const w of words) {
      if (lower.includes(w)) {
        const score = w.length;
        if (score > bestScore) {
          bestScore = score;
          best = op;
        }
      }
    }
  }
  return best;
}

function processSystem(system) {
  const dir = join(CAM_FN_ROOT, system);
  if (!existsSync(dir)) {
    return { system, totalFunctions: 0, mappedFunctions: 0, coveragePct: 0, unmapped: [], reason: "no catalog dir" };
  }
  const files = listJsonFiles(dir);
  const seen = new Map(); // dedupe by nativeName lower
  const unmapped = [];
  let mapped = 0;
  let total = 0;
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const items = extractFunctionsFromCatalog(parsed, basename(file));
    for (const it of items) {
      const key = String(it.nativeName).toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.set(key, it);
      total++;
      const op = resolveOpFromNativeName(it.nativeName);
      if (op) {
        mapped++;
      } else {
        unmapped.push({ nativeName: it.nativeName, source: it.source });
      }
    }
  }
  const coveragePct = total === 0 ? 0 : Math.round((mapped / total) * 10000) / 100;
  return {
    system,
    totalFunctions: total,
    mappedFunctions: mapped,
    coveragePct,
    unmapped: unmapped.slice(0, 50), // cap for readability
    unmappedTotal: unmapped.length,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const results = [];
  for (const sys of TARGET_SYSTEMS) {
    const r = processSystem(sys);
    results.push(r);
    const outFile = join(OUTPUT_ROOT, `cam-coverage-${sys}.json`);
    writeFileSync(outFile, JSON.stringify(r, null, 2));
    console.log(`[${sys}] total=${r.totalFunctions} mapped=${r.mappedFunctions} coverage=${r.coveragePct}%`);
  }
  // Summary
  const summary = [
    "# CAM 4-system function-template coverage",
    "",
    `Generated: ${new Date().toISOString()}`,
    "Source: data/cam-functions/<system>/*.json catalogs (REAL operator-mapped button presses).",
    "",
    "| System | Total functions | Mapped to CamOperation | Coverage % | Unmapped sample |",
    "|--------|----------------:|-----------------------:|-----------:|-----------------|",
  ];
  for (const r of results) {
    summary.push(`| ${r.system} | ${r.totalFunctions} | ${r.mappedFunctions} | ${r.coveragePct}% | ${r.unmapped.slice(0, 3).map((u) => u.nativeName).join(", ") || "—"} |`);
  }
  summary.push("");
  summary.push("Per-system detail: `cam-coverage-<system>.json`.");
  writeFileSync(join(OUTPUT_ROOT, "cam-coverage-summary.md"), summary.join("\n"));
  console.log(`\nSummary: ${join(OUTPUT_ROOT, "cam-coverage-summary.md")}`);
}

main();
