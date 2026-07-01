#!/usr/bin/env node
/**
 * generate-knowledge-inventory.mjs — drill L8 memory rollups into per-file
 * children.
 *
 * The 6 L8 memory nodes (mem.feedback, mem.project, mem.reference, mem.user,
 * mem.uncategorized, mem._index) are leaf rollups. This script walks the
 * matching `knowledge/memories/<type>/*.md` directories and emits one child
 * node per memory file. Same per-parent cap + Misc bucket pattern as
 * generate-core-inventory.mjs.
 *
 * Output: state/shared/system-viz/knowledge-inventory-augmentation.json
 *
 * Wiki subgroup is intentionally skipped — most wiki/<sub>/ dirs are empty
 * (only architecture, entities, lessons have content). When wiki is fully
 * populated, this generator can be extended to drill those too.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const MEM_ROOT = path.join(ROOT, "knowledge", "memories");

// L8 memory node id ↔ subdir mapping.
const MEMORY_PARENTS = [
  { id: "mem.feedback",      subdir: "feedback" },
  { id: "mem.project",       subdir: "project" },
  { id: "mem.reference",     subdir: "reference" },
  { id: "mem.user",          subdir: "user" },
  { id: "mem.uncategorized", subdir: "uncategorized" },
  { id: "mem._index",        subdir: "_index" },
];

const PER_PARENT_CAP = 8;
const MISC_MIN = 2;

function listMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const p = path.join(dir, e.name);
    let size = 0; try { size = fs.statSync(p).size; } catch {}
    out.push({ name: e.name, path: p, size });
  }
  return out;
}

function logSize(bytes) {
  if (!bytes) return 0.3;
  const kb = bytes / 1024;
  const v = 0.3 + Math.log10(1 + kb) * 0.18;
  return Math.min(0.9, Math.max(0.25, v));
}

function nodeIdFromFile(parentId, name) {
  const stem = name.replace(/\.md$/, "");
  const slug = stem.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return `${parentId}.${slug || "x"}`;
}

function generate() {
  const byParent = {};
  const newNodes = [];
  const newEdges = [];
  const stats = { parents: 0, expanded: 0, skipped: 0, totalChildren: 0, totalFiles: 0 };

  for (const parent of MEMORY_PARENTS) {
    stats.parents++;
    const dir = path.join(MEM_ROOT, parent.subdir);
    const files = listMdFiles(dir);
    if (files.length === 0) { stats.skipped++; continue; }

    // Sort by size desc — most informative memories first
    files.sort((a, b) => b.size - a.size);
    const top = files.slice(0, PER_PARENT_CAP);
    const rest = files.slice(PER_PARENT_CAP);

    const seen = new Set();
    const childList = [];
    for (const f of top) {
      const id = nodeIdFromFile(parent.id, f.name);
      if (seen.has(id)) continue;
      seen.add(id);
      const label = f.name.replace(/\.md$/, "");
      const node = {
        id, layer: "L8",
        subgroup: `memory_${parent.subdir}`,
        label, color: "#a855f7", status: "built",
        size: logSize(f.size), tier: 0,
        parent: parent.id,
        file: path.relative(ROOT, f.path).replace(/\\/g, "/"),
        info: `${path.relative(ROOT, f.path).replace(/\\/g, "/")} (${(f.size / 1024).toFixed(1)} KB)`,
      };
      newNodes.push(node);
      newEdges.push({ from: parent.id, to: id, type: "contains", status: "active", intensity: 0.4 });
      childList.push({ id, label, file: node.file });
    }

    if (rest.length >= MISC_MIN) {
      const totalRestBytes = rest.reduce((a, x) => a + x.size, 0);
      const id = `${parent.id}._misc`;
      if (!seen.has(id)) {
        const node = {
          id, layer: "L8",
          subgroup: `memory_${parent.subdir}`,
          label: `Misc (${rest.length})`,
          color: "#d8b4fe", status: "built",
          size: logSize(totalRestBytes / Math.max(1, rest.length)), tier: 0,
          parent: parent.id, isMisc: true,
          fileCount: rest.length, totalBytes: totalRestBytes,
          info: `${rest.length} smaller memories collapsed — ${(totalRestBytes / 1024).toFixed(1)} KB total`,
          sampleFiles: rest.slice(0, 8).map(r => path.relative(ROOT, r.path).replace(/\\/g, "/")),
        };
        newNodes.push(node);
        newEdges.push({ from: parent.id, to: id, type: "contains", status: "active", intensity: 0.3 });
        childList.push({ id, label: node.label, fileCount: rest.length });
      }
    }

    if (childList.length) {
      stats.expanded++;
      stats.totalChildren += childList.length;
      stats.totalFiles += files.length;
      byParent[parent.id] = {
        mode: "memory-drill",
        count: childList.length,
        totalFiles: files.length,
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
const outPath = path.join(VIZ_DIR, "knowledge-inventory-augmentation.json");
fs.mkdirSync(VIZ_DIR, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  parents=${result.stats.parents}  expanded=${result.stats.expanded}  skipped=${result.stats.skipped}  files=${result.stats.totalFiles}  children=${result.stats.totalChildren}`);
for (const [pid, p] of Object.entries(result.byParent)) {
  console.log(`  ${pid.padEnd(22)} ${String(p.count).padStart(3)}/${String(p.totalFiles).padStart(4)} memories`);
}
