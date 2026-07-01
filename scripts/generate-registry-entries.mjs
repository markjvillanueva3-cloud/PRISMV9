#!/usr/bin/env node
/**
 * generate-registry-entries.mjs — drill the largest registries (materials,
 * tools, machines, etc) into atomic L8 children. PRISM has 29,569 total
 * entries across 14 registries; capping at TOP_PER_REG keeps the viz from
 * exploding. Selection signal = file size (proxy for richness).
 *
 * Source layout:
 *   mcp-server/src/registries/data/<registry>/*.json   (catalog files)
 *
 * If the catalog dir doesn't exist, we fall back to scanning
 * mcp-server/data/* for known registry filenames.
 *
 * Output: state/shared/system-viz/registry-entries-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const TOP_PER_REG = 60;

// Mapping: registry parent id -> [list of possible filesystem locations]
const REG_SOURCES = [
  { parent: "reg.materialregistry", patterns: ["mcp-server/data/materials", "mcp-server/src/registries/data/materials"] },
  { parent: "reg.toolregistry",     patterns: ["mcp-server/data/tools", "mcp-server/src/registries/data/tools"] },
  { parent: "reg.machineregistry",  patterns: ["mcp-server/data/machines", "mcp-server/src/registries/data/machines"] },
  { parent: "reg.coatingregistry",  patterns: ["mcp-server/data/coatings", "mcp-server/src/registries/data/coatings"] },
  { parent: "reg.coolantregistry",  patterns: ["mcp-server/data/coolants", "mcp-server/src/registries/data/coolants"] },
  { parent: "reg.alarmregistry",    patterns: ["mcp-server/data/alarms", "mcp-server/src/registries/data/alarms"] },
  { parent: "reg.formularegistry",  patterns: ["mcp-server/data/formulas", "mcp-server/src/registries/data/formulas"] },
  { parent: "reg.postprocessorregistry", patterns: ["mcp-server/data/postprocessors", "mcp-server/src/registries/data/postprocessors"] },
  { parent: "reg.toolpathstrategyregistry", patterns: ["mcp-server/data/strategies", "mcp-server/src/registries/data/strategies"] },
  { parent: "reg.knowledgebaseregistry",    patterns: ["mcp-server/data/knowledge"] },
  { parent: "reg.camsystemregistry",         patterns: ["mcp-server/data/cam-systems"] },
  { parent: "reg.agentregistry",             patterns: ["mcp-server/data/agents"] },
];

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith(".json")) continue;
    let size = 0;
    try { size = fs.statSync(path.join(dir, e.name)).size; } catch {}
    out.push({ name: e.name, size, abs: path.join(dir, e.name) });
  }
  return out;
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    registriesScanned: REG_SOURCES.length,
    registriesWithEntries: 0,
    nodesEmitted: 0,
    parentMissing: 0,
    perRegistry: {},
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const reg of REG_SOURCES) {
    if (!existingIds.has(reg.parent)) { stats.parentMissing++; continue; }
    let files = [];
    for (const rel of reg.patterns) {
      const dir = path.join(ROOT, rel);
      if (fs.existsSync(dir)) { files = listFiles(dir); break; }
    }
    if (files.length === 0) continue;
    stats.registriesWithEntries++;
    files.sort((a, b) => b.size - a.size);
    const top = files.slice(0, TOP_PER_REG);
    for (const f of top) {
      const stem = f.name.replace(/\.json$/, "");
      const id = `${reg.parent}.entry.${slugify(stem)}`;
      if (existingIds.has(id) || seenId.has(id)) continue;
      seenId.add(id);
      newNodes.push({
        id,
        layer: "L8",
        subgroup: "registry_entry",
        parent: reg.parent,
        label: stem,
        status: "built",
        color: "#f59e0b",
        size: 0.22,
        tier: 3,
        ext: "json",
        sizeBytes: f.size,
        file: path.relative(ROOT, f.abs).replace(/\\/g, "/"),
      });
      stats.nodesEmitted++;
      stats.perRegistry[reg.parent] = (stats.perRegistry[reg.parent] || 0) + 1;
      pushEdge(reg.parent, id, "contains", "active", 0.18);
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    cap: TOP_PER_REG,
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "registry-entries-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  registries scanned:        ${result.stats.registriesScanned}`);
  console.log(`  registries with entries:   ${result.stats.registriesWithEntries}`);
  console.log(`  nodes emitted:             ${result.stats.nodesEmitted}`);
  console.log(`  parent missing:            ${result.stats.parentMissing}`);
  console.log(`  per registry:`);
  for (const [r, n] of Object.entries(result.stats.perRegistry).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${r.padEnd(40)} ${n}`);
  }
}
