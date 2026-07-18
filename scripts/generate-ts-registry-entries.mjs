#!/usr/bin/env node
/**
 * generate-ts-registry-entries.mjs — parse mcp-server/src/registries/*.ts
 * source files for inline `id: "..."` entries and emit one L8 child per entry
 * under the matching L7 registry rollup.
 *
 * Heuristic parse (no full TS AST): scan for lines matching
 *   /^\s*(id|key)\s*:\s*['"`]([a-zA-Z0-9_.-]+)['"`]/
 * Captures the id and looks back/forward for an adjacent name/label/title.
 *
 * Files covered (and entry counts at time of writing):
 *   ToolpathStrategyRegistry.ts        721
 *   AlgorithmRegistry.ts                44
 *   ToolpathStrategyRegistry_Part1.ts   28
 *   CoolantRegistry.ts                  22
 *   CoatingRegistry.ts                  19
 *   KnowledgeBaseRegistry.ts            12
 * Total ~850 entries.
 *
 * Output: state/shared/system-viz/ts-registry-entries-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REG_DIR = path.join(ROOT, "mcp-server", "src", "registries");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const MAX_ENTRIES_PER_FILE = 1000;
const ID_PATTERN = /^\s*(?:id|key|code)\s*:\s*['"`]([a-zA-Z0-9_.\- ]+)['"`]/;
const NAME_PATTERN = /^\s*(?:name|label|title|displayName)\s*:\s*['"`]([^'"`\n]{0,80})['"`]/;
const SLUG_NONALNUM = /[^a-z0-9._-]/g;
const SLUG_UNDERSCORE_RUN = /_+/g;

// Map registry filename → parent rollup id (matches existing graph ids).
// Names lowercased + "registry" suffix stripped.
const FILE_TO_PARENT = {
  "toolpathstrategyregistry.ts":       "reg.toolpathstrategyregistry",
  "toolpathstrategyregistry_part1.ts": "reg.toolpathstrategyregistry",
  "algorithmregistry.ts":              "reg.algorithmregistry",
  "coolantregistry.ts":                "reg.coolantregistry",
  "coatingregistry.ts":                "reg.coatingregistry",
  "knowledgebaseregistry.ts":          "reg.knowledgebaseregistry",
  "materialregistry.ts":               "reg.materialregistry",
  "machineregistry.ts":                "reg.machineregistry",
  "toolregistry.ts":                   "reg.toolregistry",
  "postprocessorregistry.ts":          "reg.postprocessorregistry",
  "formularegistry.ts":                "reg.formularegistry",
  "alarmregistry.ts":                  "reg.alarmregistry",
  "agentregistry.ts":                  "reg.agentregistry",
  "camsystemregistry.ts":              "reg.camsystemregistry",
  "skillregistry.ts":                  "reg.skillregistry",
  "scriptregistry.ts":                 "reg.scriptregistry",
  "hookregistry.ts":                   "reg.hookregistry",
  "aisubsystemregistry.ts":            "reg.aisubsystemregistry",
  "databaseregistry.ts":               "reg.databaseregistry",
  "machinespindledefaults.ts":         "reg.machineregistry",
  "toolgeometrydefaults.ts":           "reg.toolregistry",
  "physicsmappingregistry.ts":         "reg.formularegistry",
};

function slugify(s) {
  return s.toLowerCase().replace(SLUG_NONALNUM, "_").replace(SLUG_UNDERSCORE_RUN, "_").replace(/^_|_$/g, "");
}

function parseEntries(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const idM = ln.match(ID_PATTERN);
    if (idM) {
      if (cur) entries.push(cur);
      cur = { id: idM[1], name: null, line: i + 1 };
      continue;
    }
    if (cur && !cur.name) {
      const nm = ln.match(NAME_PATTERN);
      if (nm) cur.name = nm[1].trim();
    }
    // End-of-object boundary: if we see a `}` at zero/low indent and no name
    // captured yet, accept as-is on the next id
  }
  if (cur) entries.push(cur);
  return entries;
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  function pushEdge(from, to) {
    const k = `${from}|${to}|contains`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type: "contains", status: "active", intensity: 0.18 });
    return true;
  }

  const stats = { filesScanned: 0, filesWithEntries: 0, totalEntries: 0, parentMissing: 0, perRegistry: {} };

  for (const file of fs.readdirSync(REG_DIR)) {
    if (!file.endsWith(".ts") || file.endsWith(".d.ts")) continue;
    const key = file.toLowerCase();
    const parent = FILE_TO_PARENT[key];
    if (!parent) continue;
    stats.filesScanned++;

    const content = fs.readFileSync(path.join(REG_DIR, file), "utf8");
    const entries = parseEntries(content).slice(0, MAX_ENTRIES_PER_FILE);
    if (entries.length === 0) continue;
    stats.filesWithEntries++;

    if (!existingIds.has(parent) && !seenId.has(parent)) {
      stats.parentMissing++;
      // Still emit the entries — they'll show up disconnected, which signals
      // the registry rollup is missing and is itself a useful finding.
    }

    for (const e of entries) {
      const slug = slugify(e.id);
      const childId = `${parent}.entry.${slug}`;
      if (existingIds.has(childId) || seenId.has(childId)) continue;
      seenId.add(childId);
      newNodes.push({
        id: childId, layer: "L8",
        subgroup: "registry_entry",
        parent,
        label: (e.name || e.id).slice(0, 60),
        status: "built", color: "#f59e0b",
        size: 0.20, tier: 3,
        ext: "ts",
        registryFile: `mcp-server/src/registries/${file}`,
        sourceLine: e.line,
        entryId: e.id,
      });
      pushEdge(parent, childId);
      stats.totalEntries++;
      stats.perRegistry[parent] = (stats.perRegistry[parent] || 0) + 1;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes, newEdges, stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "ts-registry-entries-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  files scanned:        ${result.stats.filesScanned}`);
  console.log(`  files w/ entries:     ${result.stats.filesWithEntries}`);
  console.log(`  entries emitted:      ${result.stats.totalEntries}`);
  console.log(`  parent missing:       ${result.stats.parentMissing}`);
  console.log(`  ── per registry ──`);
  for (const [r, n] of Object.entries(result.stats.perRegistry).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${r.padEnd(36)} ${n}`);
  }
}
