#!/usr/bin/env node
/**
 * scripts/emit-templates-4-systems.mjs — CAM-AI-TRAINING-MS0/U-CAMT-TEMPLATE-EMIT-4SYS
 *
 * Produces the actual CamTemplate training corpus for the operator YOLO 2026-05-25
 * directive: "develop templates for every single function for cam in hypercad,
 * hypermill, mastercam and espirit".
 *
 * For each of (hypermill, mastercam, esprit, fusion360):
 *   1. Walk data/cam-functions/<system>/*.json
 *   2. Extract every toolpath / operation / cycle entry
 *   3. Map to a CamOperation via the OP_KEYWORDS resolver (mirrors emit-4-system-coverage)
 *   4. Emit a minimal CamTemplate-shaped record (id, op, system, native_name, parameters skeleton)
 *
 * Output: state/shared/corpus/cam-templates-<system>.jsonl (one template per line).
 *
 * Cannot import the TS engine cleanly into a .mjs script without compilation —
 * so this emits the CamTemplate DATA shape directly (id, op, system, native_name,
 * featureClass, defaults). Downstream consumers (LoRA / RAG indexers) read the
 * JSONL and feed the corpus.
 *
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
    if (st.isDirectory()) out.push(...listJsonFiles(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

function extractFunctionsFromCatalog(catalog, source) {
  const items = [];
  if (catalog?.toolpaths && typeof catalog.toolpaths === "object" && !Array.isArray(catalog.toolpaths)) {
    for (const [key, body] of Object.entries(catalog.toolpaths)) {
      if (body && typeof body === "object") {
        items.push({ nativeName: body.label ?? body.name ?? key, key, source, body });
      }
    }
  }
  if (catalog?.module?.toolpaths && Array.isArray(catalog.module.toolpaths)) {
    for (const tp of catalog.module.toolpaths) {
      items.push({ nativeName: tp.name ?? tp.id ?? "?", key: tp.id ?? "?", source, body: tp });
    }
  }
  if (Array.isArray(catalog?.functions)) {
    for (const fn of catalog.functions) {
      items.push({ nativeName: fn.name ?? fn.label ?? "?", key: fn.id ?? fn.key ?? "?", source, body: fn });
    }
  }
  if (catalog?.categories && typeof catalog.categories === "object") {
    for (const [, opList] of Object.entries(catalog.categories)) {
      if (Array.isArray(opList)) {
        for (const opId of opList) {
          items.push({ nativeName: String(opId).replace(/_/g, " "), key: opId, source, body: null });
        }
      }
    }
  }
  if (catalog?.operations && typeof catalog.operations === "object" && !Array.isArray(catalog.operations)) {
    for (const [opId, body] of Object.entries(catalog.operations)) {
      if (body && typeof body === "object") {
        items.push({ nativeName: body.name ?? body.label ?? opId.replace(/_/g, " "), key: opId, source, body });
      }
    }
  }
  if (catalog?.cycles && typeof catalog.cycles === "object" && !Array.isArray(catalog.cycles)) {
    for (const [cycleId, body] of Object.entries(catalog.cycles)) {
      if (body && typeof body === "object") {
        items.push({ nativeName: body.name ?? cycleId.replace(/_/g, " "), key: cycleId, source, body });
      }
    }
  }
  if (Array.isArray(catalog?.operations)) {
    for (const op of catalog.operations) {
      items.push({ nativeName: op.name ?? op.id ?? "?", key: op.id ?? "?", source, body: op });
    }
  }
  return items;
}

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
  additive_ded:          ["ded_", "directed energy"],
  additive_pbf:          ["pbf_", "powder bed", "slm"],
  additive_fdm:          ["fdm_", "fused deposition"],
  additive_hybrid:       ["hybrid_", "near net"],
  combined_cycle:        ["combined cycle", "handoff", "transfer"],
};

function resolveOp(nativeName) {
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

/**
 * Build a CamTemplate data shape. NOT importing the TS engine here —
 * the consumer (LoRA / RAG indexer) reads JSONL records of this shape.
 */
function buildTemplate({ system, key, nativeName, op, body }) {
  // Parameter extraction — best-effort from catalog body
  const parameters = {};
  if (body && typeof body === "object") {
    // Common shapes: body.parameters (array or object), body.params, body.tabs[*].params
    const params = body.parameters ?? body.params ?? [];
    if (Array.isArray(params)) {
      for (const p of params) {
        if (p && typeof p === "object" && p.id) {
          parameters[p.id] = p.default ?? null;
        }
      }
    } else if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        parameters[k] = (v && typeof v === "object") ? (v.default ?? null) : v;
      }
    }
    if (Array.isArray(body.tabs)) {
      for (const tab of body.tabs) {
        if (tab && Array.isArray(tab.parameters)) {
          for (const p of tab.parameters) {
            if (p && typeof p === "object" && p.id) {
              parameters[p.id] = p.default ?? null;
            }
          }
        }
      }
    }
    if (Array.isArray(body.pages)) {
      for (const pg of body.pages) {
        if (pg && Array.isArray(pg.parameters)) {
          for (const p of pg.parameters) {
            if (p && typeof p === "object" && p.id) {
              parameters[p.id] = p.default ?? null;
            }
          }
        }
      }
    }
  }
  return {
    id: `${op}__${system}__${key}`,
    op,
    system,
    nativeKey: key,
    nativeName,
    parameters,
    provenance: {
      realDataOnly: true,
      sourceMilestone: "CAM-AI-TRAINING-MS0",
      sourceSlot: "kilo",
      operatorConstraint: "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)",
    },
  };
}

function processSystem(system) {
  const dir = join(CAM_FN_ROOT, system);
  if (!existsSync(dir)) return { system, count: 0, file: null };
  const files = listJsonFiles(dir);
  const seen = new Map();
  let count = 0;
  const outFile = join(OUTPUT_ROOT, `cam-templates-${system}.jsonl`);
  const lines = [];
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
      seen.set(key, true);
      const op = resolveOp(it.nativeName);
      if (!op) continue;
      const tmpl = buildTemplate({
        system,
        key: it.key,
        nativeName: it.nativeName,
        op,
        body: it.body,
      });
      lines.push(JSON.stringify(tmpl));
      count++;
    }
  }
  writeFileSync(outFile, lines.join("\n") + (lines.length ? "\n" : ""));
  return { system, count, file: outFile };
}

function main() {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const results = [];
  let totalTemplates = 0;
  for (const sys of TARGET_SYSTEMS) {
    const r = processSystem(sys);
    results.push(r);
    totalTemplates += r.count;
    console.log(`[${sys}] emitted ${r.count} templates → ${r.file}`);
  }
  console.log(`\nTotal templates emitted: ${totalTemplates}`);
  writeFileSync(
    join(OUTPUT_ROOT, "cam-templates-summary.json"),
    JSON.stringify({ totalTemplates, perSystem: results, generatedAt: new Date().toISOString() }, null, 2),
  );
}

main();
