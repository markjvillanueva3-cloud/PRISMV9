#!/usr/bin/env node
/**
 * generate-cited-tips-viz-features.mjs — system-viz augmentation for
 * the iter13 cited-tip TS files. Adds an L8 roost + 1 pivot per
 * controller + 1 L10 leaf per TS file, with bridge edges to the
 * post-processor + classifier engines that consume them at runtime.
 *
 * Idempotent (merge-augmentations.mjs is the dedupe authority).
 *
 * @milestone POST-PDF-NODE-MS0/U-CITED-TIPS-VIZ
 * @slot echo · @iter 17 · @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.jm_die_cited_tips_corpus";
export const PLANNED_PARENT = "ghost.planned_features";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

const CITED_TIPS_DIR = path.join(ROOT, "mcp-server/src/data/tribal-tips/jm-die-curriculum");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "jm-die-cited-tips-augmentation.json");

const BRIDGE_ENGINES_BY_CONTROLLER = {
  haas: ["MasterPostProcessorEngine", "MasterPostProcessorUnifiedAGIEngine"],
  mazak: ["MasterPostProcessorEngine", "MasterPostProcessorUnifiedAGIEngine"],
  okuma: ["OkumaOSPMillMasterPostEngine", "MasterPostProcessorEngine"],
  hurco: ["HurcoV11MillMasterPostEngine"],
  siemens: ["MasterPostProcessorEngine", "MasterPostProcessorUnifiedAGIEngine"],
  fanuc: ["MasterPostProcessorEngine", "MasterPostProcessorUnifiedAGIEngine"],
};

/** Pure: build nodes + edges from a list of TS files. */
export function generate(tsFiles, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];

  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `JM Die cited-tips corpus (${tsFiles.length} TS files)`.slice(0, MAX_LABEL),
      layer: "L8", ghost: true, status: "ghost", kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `Iter13 per-controller cited-tip files emitted from iter9-12 curriculum pipeline. Consumed at runtime via scripts/lib/cited-tip-fetcher.mjs.`.slice(0, MAX_INFO),
    });
    ids.add(ROOST_ID);
  }

  let pivots = 0, leaves = 0, edges = 0;
  for (const f of tsFiles) {
    if (!f.controller) continue;
    const pivotId = `${ROOST_ID}.${f.controller}`;
    if (!ids.has(pivotId)) {
      newNodes.push({
        id: pivotId,
        label: `📂 ${f.controller} (${f.tips} tips)`.slice(0, MAX_LABEL),
        layer: "L9", ghost: true, status: "ghost", kind: "ghost-roost",
        parent: ROOST_ID,
        info: `${f.tips} cited tips for ${f.controller} controller — emitted from iter11 candidates JSONL.`.slice(0, MAX_INFO),
      });
      ids.add(pivotId);
      pivots++;
    }
    const leafId = `${pivotId}.file`;
    if (!ids.has(leafId)) {
      newNodes.push({
        id: leafId,
        label: `📘 ${f.file}`.slice(0, MAX_LABEL),
        layer: "L10", ghost: true, status: "ghost", kind: "cited-tips-ts-file",
        parent: pivotId,
        info: `mcp-server/src/data/tribal-tips/jm-die-curriculum/${f.file} · ${f.tips} CitedTip entries · ${f.bytes} bytes`.slice(0, MAX_INFO),
      });
      ids.add(leafId);
      leaves++;
    }
    const bridges = BRIDGE_ENGINES_BY_CONTROLLER[f.controller] || [];
    for (const engine of bridges) {
      newEdges.push({
        from: leafId,
        to: engine,
        kind: "bridge-cited-tip-engine",
        semantic: "consumed-by",
        label: `consumed-by · ${f.controller}`,
      });
      edges++;
    }
  }

  return { newNodes, newEdges, stats: { roostAdded: 1, pivots, leaves, edges, filesProcessed: tsFiles.length } };
}

function listTsFiles() {
  if (!fs.existsSync(CITED_TIPS_DIR)) return [];
  const out = [];
  for (const name of fs.readdirSync(CITED_TIPS_DIR)) {
    if (!name.endsWith("-cited-tips.ts")) continue;
    const controller = name.replace(/-cited-tips\.ts$/, "");
    const fp = path.join(CITED_TIPS_DIR, name);
    const stat = fs.statSync(fp);
    const text = fs.readFileSync(fp, "utf8");
    const tipCount = (text.match(/\n  \{\n    id: "cur-/g) || []).length;
    out.push({ file: name, controller, tips: tipCount, bytes: stat.size });
  }
  return out;
}

function main() {
  const tsFiles = listTsFiles();
  if (tsFiles.length === 0) {
    console.error(`FAIL-LOUD: no cited-tip TS files in ${CITED_TIPS_DIR}`);
    console.error("Run scripts/generate-cited-tips-from-candidates.mjs first.");
    return 2;
  }
  const { newNodes, newEdges, stats } = generate(tsFiles, []);
  const result = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: CITED_TIPS_DIR,
    newNodes, newEdges, stats,
  };
  fs.mkdirSync(VIZ_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`wrote ${OUT_PATH}`);
  console.log(`  files processed:  ${stats.filesProcessed}`);
  console.log(`  pivots emitted:   ${stats.pivots}`);
  console.log(`  leaves emitted:   ${stats.leaves}`);
  console.log(`  bridge edges:     ${stats.edges}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
