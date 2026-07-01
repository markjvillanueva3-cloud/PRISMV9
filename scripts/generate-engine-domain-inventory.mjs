#!/usr/bin/env node
/**
 * generate-engine-domain-inventory.mjs — drill L5 engine-domain rollups into
 * per-engine children.
 *
 * The 41 L5 nodes (id `eng.<domain>`) carry hardcoded counts — they're
 * cosmetic buckets, not the output of a real classifier. This script applies
 * a longest-prefix match (case-insensitive) over `mcp-server/src/engines/*.ts`
 * to assign each engine to one domain, then emits up to MAX_CHILDREN engines
 * per domain (top by file size) plus a Misc bucket for the rest.
 *
 * Output: state/shared/system-viz/engine-domain-inventory-augmentation.json
 *
 * The merge step in scripts/merge-augmentations.mjs picks this up. We do NOT
 * touch generate-system-viz.mjs (peer-claimed for edits).
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

// Per-parent caps
const MAX_CHILDREN_PER_DOMAIN = 8;
const MISC_BUCKET_MIN = 2;

function loadGraphDomains() {
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const l5 = graph.nodes.filter(n => n.layer === "L5" && n.id?.startsWith("eng."));
  // Dedupe by id; the existing graph has duplicates (same id under wired+unwired subgroups)
  const byId = new Map();
  for (const n of l5) if (!byId.has(n.id)) byId.set(n.id, n);
  // Map domain string -> parent node id, keyed by lowercased domain for matching
  const domains = [];
  for (const n of byId.values()) {
    const dom = n.domain || n.id.replace(/^eng\./, "");
    domains.push({ domain: dom, key: dom.toLowerCase(), parentId: n.id });
  }
  // Longest first so "Milling" is tested before "Mill"
  domains.sort((a, b) => b.key.length - a.key.length);
  return { graph, domains };
}

function listEngineFiles() {
  if (!fs.existsSync(ENGINE_DIR)) return [];
  const out = [];
  for (const e of fs.readdirSync(ENGINE_DIR, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith(".ts")) continue;
    if (e.name.endsWith(".test.ts")) continue;
    if (e.name.endsWith(".d.ts")) continue;
    const p = path.join(ENGINE_DIR, e.name);
    let size = 0;
    try { size = fs.statSync(p).size; } catch {}
    out.push({ name: e.name, path: p, size });
  }
  return out;
}

function classify(filename, domains) {
  // Strip ".ts" and trailing "Engine"; lowercase for match
  const stem = filename.replace(/\.ts$/, "");
  const stemLower = stem.toLowerCase();
  // Find first domain whose key is a prefix of stemLower (longest already first)
  for (const d of domains) {
    if (d.key === "other") continue; // catchall handled separately
    if (stemLower.startsWith(d.key)) return d;
  }
  return null;
}

function logSize(bytes) {
  if (!bytes) return 0.3;
  const kb = bytes / 1024;
  const v = 0.3 + Math.log10(1 + kb) * 0.16;
  return Math.min(0.9, Math.max(0.25, v));
}

function nodeIdFor(parentId, name) {
  const stem = name.replace(/\.ts$/, "");
  const slug = stem.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return `${parentId}.${slug}`;
}

function generate() {
  const { domains } = loadGraphDomains();
  const otherDomain = domains.find(d => d.key === "other");
  if (!otherDomain) throw new Error("L5 'eng.other' parent not found in graph");

  const files = listEngineFiles();
  // Bucket files by domain
  const buckets = new Map(); // parentId -> {parent, files[]}
  for (const d of domains) buckets.set(d.parentId, { parent: d, files: [] });

  let unmatched = 0;
  for (const f of files) {
    const d = classify(f.name, domains);
    if (d) {
      buckets.get(d.parentId).files.push(f);
    } else {
      buckets.get(otherDomain.parentId).files.push(f);
      unmatched++;
    }
  }

  const byParent = {};
  const newNodes = [];
  const newEdges = [];
  const stats = { domains: domains.length, totalFiles: files.length, classified: files.length - unmatched, unmatched, totalChildren: 0, expandedDomains: 0 };

  for (const [parentId, b] of buckets) {
    if (b.files.length === 0) continue;
    // Sort by size desc — biggest engines first
    b.files.sort((x, y) => y.size - x.size);
    const top = b.files.slice(0, MAX_CHILDREN_PER_DOMAIN);
    const rest = b.files.slice(MAX_CHILDREN_PER_DOMAIN);

    const seen = new Set();
    const childList = [];
    for (const f of top) {
      const id = nodeIdFor(parentId, f.name);
      if (seen.has(id)) continue;
      seen.add(id);
      const label = f.name.replace(/\.ts$/, "");
      const node = {
        id, layer: "L5",
        subgroup: `${parentId.replace(/^eng\./, "")}_engines`,
        label, color: "#22c55e", status: "built",
        size: logSize(f.size), tier: 0,
        parent: parentId,
        file: path.relative(ROOT, f.path).replace(/\\/g, "/"),
        info: `${path.relative(ROOT, f.path).replace(/\\/g, "/")} (${(f.size / 1024).toFixed(1)} KB)`,
      };
      newNodes.push(node);
      newEdges.push({ from: parentId, to: id, type: "contains", status: "active", intensity: 0.4 });
      childList.push({ id, label, file: node.file });
    }

    if (rest.length >= MISC_BUCKET_MIN) {
      const totalRestBytes = rest.reduce((a, x) => a + x.size, 0);
      const id = `${parentId}._misc`;
      if (!seen.has(id)) {
        const node = {
          id, layer: "L5",
          subgroup: `${parentId.replace(/^eng\./, "")}_engines`,
          label: `Misc (${rest.length})`,
          color: "#86efac", status: "built",
          size: logSize(totalRestBytes / Math.max(1, rest.length)), tier: 0,
          parent: parentId, isMisc: true,
          fileCount: rest.length, totalBytes: totalRestBytes,
          info: `${rest.length} smaller engines collapsed — ${(totalRestBytes / 1024).toFixed(1)} KB total`,
          sampleFiles: rest.slice(0, 8).map(r => path.relative(ROOT, r.path).replace(/\\/g, "/")),
        };
        newNodes.push(node);
        newEdges.push({ from: parentId, to: id, type: "contains", status: "active", intensity: 0.3 });
        childList.push({ id, label: node.label, fileCount: rest.length });
      }
    }

    if (childList.length) {
      stats.expandedDomains++;
      stats.totalChildren += childList.length;
      byParent[parentId] = {
        mode: "engine-drill",
        count: childList.length,
        totalEngines: b.files.length,
        children: childList,
      };
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    byParent,
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "engine-domain-inventory-augmentation.json");
fs.mkdirSync(VIZ_DIR, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  domains=${result.stats.domains}  files=${result.stats.totalFiles}  classified=${result.stats.classified}  unmatched=${result.stats.unmatched}  expanded=${result.stats.expandedDomains}  totalChildren=${result.stats.totalChildren}`);
const tops = Object.entries(result.byParent).sort((a, b) => b[1].totalEngines - a[1].totalEngines).slice(0, 12);
for (const [pid, p] of tops) {
  console.log(`  ${pid.padEnd(28)} ${String(p.count).padStart(3)}/${String(p.totalEngines).padStart(4)} engines`);
}
