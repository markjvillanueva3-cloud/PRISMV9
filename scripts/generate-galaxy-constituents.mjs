#!/usr/bin/env node
/**
 * generate-galaxy-constituents.mjs — populate node.molecules for every
 * "galaxy" node so users can double-click ANY rollup and see its atomic
 * planets orbiting (existing enterMolecules() drill-down).
 *
 * Coverage we add:
 *   1. L5 engine-domain rollups (eng.mill, eng.lathe, eng.cam, ...) →
 *      every Engine.ts file matching the domain prefix.
 *   2. L6 core modules (core.algos, core.physics, core.schemas,
 *      core.tests, core.scripts, core.skills, core.hooks_src, core.hooks_cl) →
 *      every file in the matching directory.
 *   3. L7 registries → every entry in the registry's exported map/array.
 *
 * The existing molecules schema is reused verbatim:
 *   { id, label, kind, info?, file? }
 * The viz's enterMolecules() handles them with no further changes.
 *
 * Output: state/shared/system-viz/galaxy-constituents-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const ENGINE_DIR = path.join(ROOT, "mcp-server", "src", "engines");

const MAX_MOLECULES_PER_NODE = 600;     // hard cap so even eng.other (562) fits
const MIN_MOLECULES_PER_NODE = 1;

// L6 core module → source dir (from generate-core-inventory's mapping)
const CORE_DIR_MAP = {
  "core.algos":      ["mcp-server/src/algorithms"],
  "core.physics":    ["mcp-server/src/physics"],
  "core.schemas":    ["mcp-server/src/schemas"],
  "core.tests":      ["mcp-server/src/__tests__"],
  "core.scripts":    ["scripts"],
  "core.skills":     [".claude/commands", "C:/Users/wompu/.claude/commands"],
  "core.hooks_src":  ["mcp-server/src/hooks"],
  "core.hooks_cl":   [".claude/hooks"],
  "core.migrations": ["mcp-server/src/migrations"],
};

const REGISTRY_DIR = path.join(ROOT, "mcp-server", "src", "registries");

function listFiles(dirAbs, exts = [".ts", ".mjs", ".js", ".json", ".md"]) {
  if (!fs.existsSync(dirAbs)) return [];
  const out = [];
  for (const e of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    if (e.name.endsWith(".test.ts") || e.name.endsWith(".d.ts")) continue;
    if (!exts.some(x => e.name.endsWith(x))) continue;
    const p = path.join(dirAbs, e.name);
    let size = 0, mtime = null;
    try { const st = fs.statSync(p); size = st.size; mtime = st.mtimeMs; } catch {}
    out.push({ name: e.name, path: p, size, mtime });
  }
  return out;
}

function listEngineFiles() {
  if (!fs.existsSync(ENGINE_DIR)) return [];
  const out = [];
  for (const e of fs.readdirSync(ENGINE_DIR, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".ts")) continue;
    if (e.name.endsWith(".test.ts") || e.name.endsWith(".d.ts")) continue;
    const p = path.join(ENGINE_DIR, e.name);
    let size = 0, mtime = null;
    try { const st = fs.statSync(p); size = st.size; mtime = st.mtimeMs; } catch {}
    out.push({ name: e.name.replace(/\.ts$/, ""), path: p, size, mtime });
  }
  return out;
}

function loadGraphDomains(graph) {
  // L5 domain rollup nodes: layer L5, id starts with eng., parent is null or
  // doesn't start with eng. (i.e. they're not children of another eng.X node).
  const rollups = graph.nodes.filter(n =>
    n.layer === "L5" && n.id.startsWith("eng.")
    && (!n.parent || !n.parent.startsWith("eng."))
  );
  // Map a lowercased domain key (e.g. "mill") → rollup node, longest first
  // so "milling" tests before "mill", "lathe" before nothing, etc.
  const list = rollups.map(n => ({
    node: n,
    key: (n.id.replace(/^eng\./, "") || "").toLowerCase(),
  })).filter(x => x.key.length > 0);
  list.sort((a, b) => b.key.length - a.key.length);
  return list;
}

function classifyEngine(engineName, domains) {
  const lower = engineName.toLowerCase();
  for (const { key, node } of domains) {
    if (lower.startsWith(key)) return node.id;
  }
  return "eng.other";
}

function generate() {
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const annotations = {};                    // id → { molecules: [...] }
  const stats = {
    engineDomains: 0,
    enginesAttached: 0,
    coreModules: 0,
    coreFilesAttached: 0,
    registries: 0,
    registryEntriesAttached: 0,
    skipped: 0,
  };

  // ===== 1. ENGINE DOMAINS → all matching engines as molecules =====
  const domains = loadGraphDomains(graph);
  const engines = listEngineFiles();
  // Group engines by their classified domain id
  const enginesByDomain = {};
  for (const eng of engines) {
    const did = classifyEngine(eng.name, domains);
    (enginesByDomain[did] ??= []).push(eng);
  }
  for (const { node } of domains) {
    const eng = enginesByDomain[node.id] || [];
    if (eng.length < MIN_MOLECULES_PER_NODE) continue;
    eng.sort((a, b) => b.size - a.size);                  // biggest engines first
    const trimmed = eng.slice(0, MAX_MOLECULES_PER_NODE);
    const mols = trimmed.map(e => ({
      id: `${node.id}::${e.name.toLowerCase()}`,
      label: e.name,
      kind: "engine",
      info: `${(e.size / 1024).toFixed(1)} KB`,
      file: path.relative(ROOT, e.path).replace(/\\/g, "/"),
    }));
    if (eng.length > trimmed.length) {
      mols.push({
        id: `${node.id}::_more`,
        label: `+${eng.length - trimmed.length} more engines`,
        kind: "more",
        info: `Cap=${MAX_MOLECULES_PER_NODE}; fly closer or use search`,
      });
    }
    annotations[node.id] = { molecules: mols };
    stats.engineDomains++;
    stats.enginesAttached += mols.length;
  }
  // Dedicated bucket for orphans without a domain match
  const otherNode = domains.find(d => d.node.id === "eng.other")?.node;
  if (!otherNode && enginesByDomain["eng.other"]) {
    // Synthesize a description if eng.other doesn't exist as a graph node
    stats.skipped += enginesByDomain["eng.other"].length;
  }

  // ===== 2. CORE MODULES → files in directory =====
  for (const [coreId, dirRels] of Object.entries(CORE_DIR_MAP)) {
    const coreNode = graph.nodes.find(n => n.id === coreId);
    if (!coreNode) continue;
    const collected = [];
    for (const rel of dirRels) {
      const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
      collected.push(...listFiles(abs));
    }
    if (collected.length < MIN_MOLECULES_PER_NODE) continue;
    collected.sort((a, b) => b.size - a.size);
    const trimmed = collected.slice(0, MAX_MOLECULES_PER_NODE);
    const mols = trimmed.map(f => ({
      id: `${coreId}::${f.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`,
      label: f.name,
      kind: "file",
      info: `${(f.size / 1024).toFixed(1)} KB`,
      file: path.relative(ROOT, f.path).replace(/\\/g, "/"),
    }));
    if (collected.length > trimmed.length) {
      mols.push({
        id: `${coreId}::_more`,
        label: `+${collected.length - trimmed.length} more files`,
        kind: "more",
      });
    }
    annotations[coreId] = { molecules: mols };
    stats.coreModules++;
    stats.coreFilesAttached += mols.length;
  }

  // ===== 3. REGISTRIES → entries =====
  // Strategy: for each reg.* node, find a matching .ts file in registries/,
  // parse exported arrays/objects with regex (cheap, doesn't require TS compile).
  // We extract identifier-like keys from `{ <key>: ` lines and string keys from `"<key>": `.
  if (fs.existsSync(REGISTRY_DIR)) {
    const regNodes = graph.nodes.filter(n => n.layer === "L7" && n.id.startsWith("reg."));
    const regFiles = fs.readdirSync(REGISTRY_DIR).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    for (const node of regNodes) {
      const labelStem = (node.label || "").replace(/\s.*/, "");
      // Try multiple file patterns
      const candidates = [
        `${labelStem}.ts`,
        `${labelStem}Registry.ts`,
        ...regFiles.filter(f => f.toLowerCase().startsWith(labelStem.toLowerCase())),
      ];
      let foundFile = null;
      for (const cand of candidates) {
        const abs = path.join(REGISTRY_DIR, cand);
        if (fs.existsSync(abs)) { foundFile = abs; break; }
      }
      if (!foundFile) continue;
      let text = "";
      try { text = fs.readFileSync(foundFile, "utf8"); } catch { continue; }

      const entries = [];
      const seen = new Set();
      // Object literal style:    "<key>": ... or  <key>: ...
      const re1 = /^\s*["']?([A-Za-z_][A-Za-z0-9_-]+)["']?\s*:\s*[{[\"]/gm;
      // export const FOO = ... — top-level constants
      const re2 = /^export\s+const\s+([A-Za-z_][A-Za-z0-9_]+)\s*[=:]/gm;
      let m;
      while ((m = re1.exec(text)) !== null) {
        const k = m[1];
        if (seen.has(k)) continue;
        if (/^(export|const|let|var|function|return|if|else|for|while|switch|case|default|break|continue|new|this|null|true|false|undefined)$/.test(k)) continue;
        seen.add(k);
        entries.push({ key: k, kind: "registry-entry" });
        if (entries.length >= MAX_MOLECULES_PER_NODE) break;
      }
      while ((m = re2.exec(text)) !== null && entries.length < MAX_MOLECULES_PER_NODE) {
        const k = m[1];
        if (seen.has(k)) continue;
        seen.add(k);
        entries.push({ key: k, kind: "registry-export" });
      }
      if (entries.length < MIN_MOLECULES_PER_NODE) continue;
      const fileRel = path.relative(ROOT, foundFile).replace(/\\/g, "/");
      const mols = entries.map(e => ({
        id: `${node.id}::${e.key.toLowerCase()}`,
        label: e.key,
        kind: e.kind,
        file: fileRel,
      }));
      annotations[node.id] = { molecules: mols };
      stats.registries++;
      stats.registryEntriesAttached += mols.length;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    annotations,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "galaxy-constituents-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  engineDomains=${result.stats.engineDomains}  enginesAttached=${result.stats.enginesAttached}`);
console.log(`  coreModules=${result.stats.coreModules}  coreFilesAttached=${result.stats.coreFilesAttached}`);
console.log(`  registries=${result.stats.registries}  registryEntriesAttached=${result.stats.registryEntriesAttached}`);
console.log(`  total nodes annotated: ${Object.keys(result.annotations).length}`);
