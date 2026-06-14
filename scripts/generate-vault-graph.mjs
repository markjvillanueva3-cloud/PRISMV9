#!/usr/bin/env node
/**
 * generate-vault-graph.mjs — the graph→Obsidian direction of the 2nd-brain link.
 *
 * Emits a navigable JSON-Canvas summary of the PRISM system-graph into the vault so the
 * code map renders *inside* Obsidian (Canvas view): `knowledge/PRISM-System-Map.canvas`.
 * Obsidian Canvas chokes past ~a few hundred nodes, so this is a SUMMARY: the layer
 * hub/structure nodes + the top-N by edge-degree per layer (the saleable-product / persona /
 * dispatcher / engine-domain / registry backbone), laid out in vertical layer columns,
 * with the edges among the kept nodes. Colour-coded to match the brain viewer's layer palette.
 *
 * Also emits `state/shared/system-viz/obsidian-vault-augmentation.json` — the wiki *folder*
 * hierarchy as L8 hub nodes (knowledge/wiki/concepts, /entities, /decisions, /patterns, …)
 * with `contains` edges down to the wiki-entry nodes that already exist (wiki.* / vault.mem.*),
 * so the vault's own topology is visible in the 3D map. Idempotent; merged by merge-augmentations.
 *
 * Wired into scripts/regen-viz.mjs (post-merge). Manual run:
 *   node --max-old-space-size=8192 scripts/generate-vault-graph.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const VAULT = path.join(ROOT, "knowledge");                        // H:/prism/knowledge
const CANVAS_OUT = path.join(VAULT, "PRISM-System-Map.canvas");
const AUG_OUT = path.join(VIZ_DIR, "obsidian-vault-augmentation.json");

// brain-viewer layer palette (hex strings without #)
const LAYER_HEX = { L0: "f472b6", L1: "3b82f6", L2: "22d3ee", L3: "a855f7", L4: "10b981", L4a: "34d399", L5: "f59e0b", L6: "6b7280", Lgit: "84cc16", L7: "8b5cf6", L8: "fb923c", L9: "fbbf24", L10: "14b8a6", L11: "475569" };
// Obsidian canvas only allows preset colours "1".."6" OR a hex; we use hex.
const LAYER_ORDER = ["L0", "L1", "L2", "L3", "L4", "Lgit", "L5", "L7", "L8"];   // the structural backbone (skip L4a/L6/L9/L10/L11 — too granular for a canvas)
const PER_LAYER_CAP = { L0: 14, L1: 30, L2: 16, L3: 20, L4: 110, Lgit: 28, L5: 60, L7: 40, L8: 40 };  // node budget per layer in the canvas

function main() {
  let G;
  try { G = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8"))); }
  catch (e) { console.error(`[vault-graph] cannot read graph: ${e.message}`); process.exit(0); }

  // edge degree per id
  const deg = new Map();
  for (const e of G.edges || []) { const a = e.from || e.source, b = e.to || e.target; if (a) deg.set(a, (deg.get(a) || 0) + 1); if (b) deg.set(b, (deg.get(b) || 0) + 1); }

  // pick the kept set: per layer, prefer hub/product/domain-rollup nodes, then top by degree
  const byLayer = new Map();
  for (const n of G.nodes) { if (!byLayer.has(n.layer)) byLayer.set(n.layer, []); byLayer.get(n.layer).push(n); }
  const importantSub = /hub|rollup|domain|product|persona|registry|dispatcher|tip$/i;
  const keptIds = new Set(), keptByLayer = new Map();
  for (const l of LAYER_ORDER) {
    const list = (byLayer.get(l) || []).slice();
    list.sort((a, b) => {
      const ia = importantSub.test(a.subgroup || "") ? 1 : 0, ib = importantSub.test(b.subgroup || "") ? 1 : 0;
      if (ia !== ib) return ib - ia;
      return (deg.get(b.id) || 0) - (deg.get(a.id) || 0);
    });
    const kept = list.slice(0, PER_LAYER_CAP[l] || 30);
    keptByLayer.set(l, kept);
    for (const n of kept) keptIds.add(n.id);
  }

  // ── JSON Canvas ──
  // vertical layer columns: x by layer index, y stacked within layer; widths fixed.
  const NW = 260, NH = 56, GAPX = 320, GAPY = 80, LX = 360;   // node box + gaps
  const cn = [], ce = [];
  let cIdx = 0;
  const labelOf = (n) => {
    let t = String(n.label || n.id);
    if (t.length > 60) t = t.slice(0, 57) + "…";
    return `${n.layer} · ${t}`;
  };
  // a wiki/memory file path attached to a node → make it a "file"-type card so it opens the note
  const fileOf = (n) => {
    const w = n.knowledge && Array.isArray(n.knowledge.wikiEntries) && n.knowledge.wikiEntries[0] && n.knowledge.wikiEntries[0].path;
    if (!w) return null;
    const m = String(w).replace(/\\/g, "/").match(/\/knowledge\/(.+)$/i);
    return m ? m[1] : null;
  };
  for (let li = 0; li < LAYER_ORDER.length; li++) {
    const l = LAYER_ORDER[li], kept = keptByLayer.get(l) || [];
    const x = li * (NW + GAPX);
    // a layer header card
    cn.push({ id: `hdr-${l}`, type: "text", text: `# ${l}\n${(byLayer.get(l) || []).length.toLocaleString()} nodes · top ${kept.length} shown`, x, y: -GAPY - NH * 2, width: NW, height: NH * 2, color: LAYER_HEX[l] || "808080" });
    kept.forEach((n, j) => {
      const f = fileOf(n);
      const node = { id: `n${cIdx++}-${l}-${j}`, x, y: j * (NH + GAPY * 0.4), width: NW, height: NH, color: LAYER_HEX[l] || "808080" };
      if (f) { node.type = "file"; node.file = `knowledge/${f}`; }   // opens the wiki note on click
      else   { node.type = "text"; node.text = labelOf(n); }
      node.__nodeId = n.id;   // internal, stripped before write
      cn.push(node);
    });
  }
  // edges among kept nodes (map graph-id → canvas-node-id)
  const canvasIdOf = new Map();
  for (const c of cn) if (c.__nodeId) canvasIdOf.set(c.__nodeId, c.id);
  let edgeIdx = 0;
  const seenE = new Set();
  for (const e of G.edges || []) {
    const a = e.from || e.source, b = e.to || e.target;
    const ca = canvasIdOf.get(a), cb = canvasIdOf.get(b);
    if (!ca || !cb || ca === cb) continue;
    const k = ca + "|" + cb; if (seenE.has(k)) continue; seenE.add(k);
    ce.push({ id: `e${edgeIdx++}`, fromNode: ca, toNode: cb, fromSide: "right", toSide: "left" });
    if (ce.length >= 1200) break;   // keep the canvas snappy
  }
  for (const c of cn) delete c.__nodeId;
  const canvas = { nodes: cn, edges: ce };
  let canvasWritten = false;
  try { fs.mkdirSync(VAULT, { recursive: true }); fs.writeFileSync(CANVAS_OUT, JSON.stringify(canvas, null, 1) + "\n", "utf8"); canvasWritten = true; }
  catch (e) { console.error(`[vault-graph] could not write canvas (${e.message}) — continuing with the augmentation`); }

  // ── obsidian-vault-augmentation.json: wiki folder hierarchy as L8 hubs ──
  const newNodes = [], newEdges = [];
  const VAULT_HUB = "vault.root";
  newNodes.push({ id: VAULT_HUB, layer: "L7", subgroup: "vault_root", label: "Obsidian Vault (knowledge/)", status: "built", color: "#fb923c", size: 0.7, tier: 1, synthetic: true });
  // wiki folders under knowledge/wiki/*
  const wikiRoot = path.join(VAULT, "wiki");
  let folderHubs = 0, folderChildEdges = 0;
  if (fs.existsSync(wikiRoot)) {
    let subs = [];
    try { subs = fs.readdirSync(wikiRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { subs = []; }
    for (const sub of subs) {
      const hubId = `vault.wiki.${sub.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      let count = 0; try { count = fs.readdirSync(path.join(wikiRoot, sub)).filter((f) => f.endsWith(".md")).length; } catch { count = 0; }
      newNodes.push({ id: hubId, layer: "L8", subgroup: "vault_wiki_folder", parent: VAULT_HUB, label: `wiki/${sub}`, status: "built", color: "#fb923c", size: 0.32, tier: 2, synthetic: true, mdFiles: count, folder: `knowledge/wiki/${sub}` });
      newEdges.push({ from: VAULT_HUB, to: hubId, type: "contains", status: "active", intensity: 0.3 });
      folderHubs++;
      // link existing wiki.* nodes whose id/path mentions this folder to the hub
      for (const n of G.nodes) {
        if (n.layer !== "L8" || !(n.id || "").startsWith("wiki.")) continue;
        const inFolder = (n.path && String(n.path).replace(/\\/g, "/").includes(`/wiki/${sub}/`)) || (n.id || "").includes(`.${sub.toLowerCase()}.`);
        if (inFolder) { newEdges.push({ from: hubId, to: n.id, type: "contains", status: "active", intensity: 0.15 }); folderChildEdges++; }
      }
    }
  }
  // memories folder hub → link existing vault.mem.* nodes
  const memNodes = G.nodes.filter((n) => (n.id || "").startsWith("vault.mem.") || (n.id || "").startsWith("memory_"));
  if (memNodes.length) {
    const memHub = "vault.memories";
    newNodes.push({ id: memHub, layer: "L8", subgroup: "vault_mem_folder", parent: VAULT_HUB, label: "memories/", status: "built", color: "#fb923c", size: 0.32, tier: 2, synthetic: true, mdFiles: memNodes.length, folder: "knowledge/memories" });
    newEdges.push({ from: VAULT_HUB, to: memHub, type: "contains", status: "active", intensity: 0.3 });
    for (const n of memNodes) newEdges.push({ from: memHub, to: n.id, type: "contains", status: "active", intensity: 0.12 });
    folderHubs++; folderChildEdges += memNodes.length;
  }
  const aug = { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), newNodes, newEdges, stats: { folderHubs, folderChildEdges, canvasNodes: cn.length, canvasEdges: ce.length, canvasWritten } };
  fs.writeFileSync(AUG_OUT, JSON.stringify(aug, null, 0) + "\n", "utf8");

  console.log(`[vault-graph] wrote PRISM-System-Map.canvas (${cn.length} nodes / ${ce.length} edges, ${canvasWritten ? "ok" : "FAILED"}) + obsidian-vault-augmentation.json (${newNodes.length} hub nodes / ${newEdges.length} edges, ${folderHubs} folders)`);
}
main();
