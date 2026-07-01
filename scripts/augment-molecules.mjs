#!/usr/bin/env node
/**
 * augment-molecules.mjs — emit per-node "molecule" lists for drill-down view.
 *
 * For each node in the graph, attach a `molecules` array of the atomic
 * constituents that make up that node (the things you'd see if you
 * "entered" that node). Examples:
 *
 *   L4 dispatcher.{name}  → list of action names from `const ACTIONS = [...]`
 *   L5 eng.{domain}       → list of engine file names whose path/name matches
 *   L3 ai.t1.claude       → list of capabilities
 *   L3 skills.libraries   → list of skill files
 *   L3 hooks.userpromptsubmit → list of hook script files
 *
 * Each molecule has: { id, label, kind, file?, info? }
 *
 * Output:
 *   state/shared/system-viz/molecules-augmentation.json
 *
 * { generatedAt, totals: {nodes, totalMolecules}, byNodeId: { [id]: [...molecules] } }
 *
 * Run AFTER generate-system-viz.mjs. The merge step folds these into nodes.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamGraphArray } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const VIZ_DIR   = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH     = path.join(VIZ_DIR, "system-graph.json");
const OUT       = path.join(VIZ_DIR, "molecules-augmentation.json");

if (!fs.existsSync(GRAPH)) {
  console.error(`graph missing: ${GRAPH} — run generate-system-viz.mjs first`);
  process.exit(2);
}
// Project ONLY the node fields the molecule generators below actually use
// (L5 id+domain, L3 hooks.* id, L9 id) via an OFF-HEAP streaming walk. The graph
// is >500MB; materializing it (readGraphStreaming(...).nodes) holds every node on
// the V8 heap at once, which OOM'd this stage under the 432MB default heap
// (U-VIZ-AUGMENT-MOLECULES-STREAM, 2026-06-09). Streaming keeps peak heap O(1
// node), so the stage runs under ANY heap, not only a 24GB-spawned child.
const l5Nodes = [];      // { id, domain } for layer-L5 engine-domain nodes
const l3HookNodes = [];  // { id } for L3 nodes whose id starts with "hooks."
const l9Nodes = [];      // { id } for L9 filesystem nodes
const streamedNodeCount = streamGraphArray(GRAPH, "nodes", (n) => {
  if (!n || typeof n.layer !== "string") return;
  if (n.layer === "L5") { if (n.domain) l5Nodes.push({ id: n.id, domain: n.domain }); return; }
  if (n.layer === "L3") { if (typeof n.id === "string" && n.id.startsWith("hooks.")) l3HookNodes.push({ id: n.id }); return; }
  if (n.layer === "L9") l9Nodes.push({ id: n.id });
});
if (streamedNodeCount === 0) {
  console.error(`augment-molecules: streamed 0 nodes from ${GRAPH} (empty or unreadable nodes array)`);
  process.exit(2);
}

const byNodeId = {};
let totalMolecules = 0;

function add(id, mols) {
  if (!mols || mols.length === 0) return;
  byNodeId[id] = mols;
  totalMolecules += mols.length;
}

// ===== L4 — Dispatchers — parse `const ACTIONS = [...] as const` =====
const dispDir = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
if (fs.existsSync(dispDir)) {
  const files = fs.readdirSync(dispDir).filter(f => f.endsWith(".ts"));
  for (const f of files) {
    const src = fs.readFileSync(path.join(dispDir, f), "utf8");
    // Match `const ACTIONS = [ ... ] as const;` (allow multiline, comments)
    const m = src.match(/const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
    if (!m) continue;
    // Extract quoted strings, ignore comments and stray tokens
    const actions = [];
    const re = /["']([a-zA-Z0-9_\-:.]+)["']/g;
    let mm;
    while ((mm = re.exec(m[1])) !== null) actions.push(mm[1]);
    if (actions.length === 0) continue;
    const nodeId = `disp.${f.replace(/\.ts$/, "").toLowerCase()}`;
    const mols = actions.map(a => ({
      id: `${nodeId}::${a}`,
      label: a,
      kind: "action",
      file: `mcp-server/src/tools/dispatchers/${f}`,
      info: `dispatcher action — ${a}`,
    }));
    add(nodeId, mols);
  }
}

// ===== L5 — Engine Domains — match engine files to domain by name prefix =====
const engDir = path.join(ROOT, "mcp-server", "src", "engines");
if (fs.existsSync(engDir)) {
  const files = fs.readdirSync(engDir).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  // Build per-domain bucket
  const byDomain = {};
  for (const node of l5Nodes) {
    const dom = node.domain;
    if (!dom) continue;
    byDomain[dom.toLowerCase()] = node.id;
  }
  // Heuristic: domain "Mill" matches files containing "Mill" (case-insensitive),
  // "WEDM"/"EDM" matches "WEDM" or "Edm", etc.
  const domainPatterns = {
    mill:       /mill/i,
    wedm:       /wedm|wireedm/i,
    cad:        /^cad/i,
    cam:        /^cam/i,
    safety:     /safety/i,
    ai:         /^ai|^aip|llm|inference|reason/i,
    quality:    /quality|qc|spc/i,
    cost:       /cost|price|quote/i,
    erp:        /erp/i,
    adaptive:   /adaptive/i,
    memory:     /memory|cache/i,
    hook:       /hook/i,
    material:   /material/i,
    tool:       /^tool/i,
    toolpath:   /toolpath/i,
    physics:    /physics|kienzle|taylor/i,
    probe:      /probe/i,
    knowledge:  /knowledge|wiki/i,
    lathe:      /lathe|turning/i,
    machine:    /machine|spindle/i,
    other:      null,
  };
  // Bucket each engine file
  const buckets = {};
  for (const f of files) {
    const base = f.replace(/\.ts$/, "");
    let assigned = false;
    for (const [dom, re] of Object.entries(domainPatterns)) {
      if (re && re.test(base) && byDomain[dom]) {
        (buckets[byDomain[dom]] ??= []).push(base);
        assigned = true;
        break;
      }
    }
    if (!assigned && byDomain.other) {
      (buckets[byDomain.other] ??= []).push(base);
    }
  }
  // Cap per-domain at 200 molecules to keep output reasonable
  for (const [nodeId, names] of Object.entries(buckets)) {
    const sorted = names.sort();
    const truncated = sorted.length > 200 ? sorted.slice(0, 200) : sorted;
    const mols = truncated.map(name => ({
      id: `${nodeId}::${name}`,
      label: name,
      kind: "engine",
      file: `mcp-server/src/engines/${name}.ts`,
      info: `engine class — ${name}`,
    }));
    if (sorted.length > 200) {
      mols.push({
        id: `${nodeId}::__more__`,
        label: `… +${sorted.length - 200} more`,
        kind: "more",
        info: `${sorted.length - 200} additional engines not shown`,
      });
    }
    add(nodeId, mols);
  }
}

// ===== L3 — AI tier nodes — hand-curated capability lists =====
const aiTierMolecules = {
  "ai.t1.claude": [
    { label: "Master orchestration", kind: "capability", info: "Routes user intent across the AI stack" },
    { label: "Multi-step reasoning", kind: "capability", info: "Plans + executes manufacturing tasks" },
    { label: "Code generation", kind: "capability", info: "Authors engines, hooks, dispatchers" },
    { label: "Safety oversight", kind: "capability", info: "Final approver for shop-floor outputs" },
    { label: "Tribal knowledge synthesis", kind: "capability", info: "Combines multi-source context into rulings" },
  ],
  "ai.t2.coordinator": [
    { label: "Domain routing", kind: "capability", info: "Picks the right tier-3 specialist" },
    { label: "Context aggregation", kind: "capability", info: "Pulls memory + wiki + telemetry" },
    { label: "Result synthesis", kind: "capability", info: "Combines tier-3 outputs into a single answer" },
    { label: "Approval flow", kind: "capability", info: "Gates outputs through tier-1 when needed" },
  ],
  "ai.t3.mill":    [{ label: "Mill specialist", kind: "specialist", info: "Owns Kienzle/Taylor/SLD/deflection/thermal/wear/chatter" }],
  "ai.t3.lathe":   [{ label: "Lathe specialist", kind: "specialist", info: "Threading, hard-turn, grooving, sub-spindle" }],
  "ai.t3.wedm":    [{ label: "WEDM specialist", kind: "specialist", info: "Wire EDM physics + AGI orchestration" }],
  "ai.t3.cad":     [{ label: "CAD specialist", kind: "specialist", info: "Geometry, feature-recognition, DFM" }],
  "ai.t3.cam":     [{ label: "CAM specialist", kind: "specialist", info: "Toolpath strategy + post generation" }],
  "ai.t3.safety":  [{ label: "Safety specialist", kind: "specialist", info: "S(x) scoring, envelope checks, collision" }],
  "ai.t3.cost":    [{ label: "Cost specialist", kind: "specialist", info: "Quoting, should-cost, cycle-time" }],
};
for (const [id, list] of Object.entries(aiTierMolecules)) {
  const mols = list.map((m, i) => ({
    id: `${id}::${m.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`,
    label: m.label,
    kind: m.kind,
    info: m.info,
  }));
  add(id, mols);
}

// ===== L3 — Skills / Hooks — file system enumeration =====
function listMd(dir, kind, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .sort()
    .map(f => ({
      id: `${prefix}::${f.replace(/\.md$/, "")}`,
      label: f.replace(/\.md$/, ""),
      kind,
      file: path.relative(ROOT, path.join(dir, f)).replace(/\\/g, "/"),
      info: `${kind} — ${f}`,
    }));
}

// Skills (project + user)
const projectSkills = listMd(path.join(ROOT, ".claude", "commands"), "skill", "skills.project");
const userSkills    = listMd(path.join(process.env.USERPROFILE || "", ".claude", "commands"), "skill", "skills.user");
add("skills.project", projectSkills.slice(0, 200));
add("skills.user",    userSkills.slice(0, 200));

// Hooks (.claude/hooks)
const hookDir = path.join(ROOT, ".claude", "hooks");
if (fs.existsSync(hookDir)) {
  const hookFiles = fs.readdirSync(hookDir)
    .filter(f => f.endsWith(".mjs") || f.endsWith(".js"))
    .sort();
  const hookMols = hookFiles.map(f => ({
    id: `hooks.all::${f}`,
    label: f.replace(/\.(mjs|js)$/, ""),
    kind: "hook",
    file: `.claude/hooks/${f}`,
    info: `hook script — ${f}`,
  }));
  // Match against any L3 node whose id starts with "hooks."
  for (const n of l3HookNodes) {
    add(n.id, hookMols.slice(0, 80));
  }
}

// ===== L9 — Filesystem — top-level directory listing =====
for (const n of l9Nodes) {
  // node id like "fs.mcp-server" — extract the dir
  const m = n.id.match(/^fs\.(.+)$/);
  if (!m) continue;
  const dirAbs = path.join(ROOT, m[1]);
  if (!fs.existsSync(dirAbs)) continue;
  let entries;
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true })
      .filter(e => !e.name.startsWith(".") && !e.name.startsWith("node_modules"))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch { continue; }
  const mols = entries.slice(0, 60).map(e => ({
    id: `${n.id}::${e.name}`,
    label: e.name,
    kind: e.isDirectory() ? "directory" : "file",
    file: `${m[1]}/${e.name}`,
    info: `${e.isDirectory() ? "directory" : "file"} — ${m[1]}/${e.name}`,
  }));
  if (entries.length > 60) {
    mols.push({
      id: `${n.id}::__more__`,
      label: `… +${entries.length - 60} more`,
      kind: "more",
      info: `${entries.length - 60} more entries not shown`,
    });
  }
  add(n.id, mols);
}

// ===== Write output =====
const out = {
  generatedAt: new Date().toISOString(),
  schemaVersion: "1.0.0",
  totals: {
    nodesAugmented: Object.keys(byNodeId).length,
    totalMolecules,
  },
  byNodeId,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${OUT}`);
console.log(`  nodes augmented: ${out.totals.nodesAugmented}`);
console.log(`  total molecules: ${out.totals.totalMolecules}`);
