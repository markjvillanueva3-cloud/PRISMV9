#!/usr/bin/env node
/**
 * generate-fs-inventory.mjs — expand L9 filesystem nodes into 2nd-level children.
 *
 * The 84 L9 nodes in system-graph.json represent top-level directories under
 * H:/prism/ (subgroup=prism) and H:/ (subgroup=h_root). Each is currently a
 * leaf. This script walks one level deeper and emits a child node per
 * meaningful 2nd-level subdirectory, capped + bucketed when the count is
 * large.
 *
 * Output: state/shared/system-viz/fs-inventory-augmentation.json
 *
 * The merge step in scripts/merge-augmentations.mjs picks this up and folds
 * it into system-graph.json. Mirrors the pattern of generate-core-inventory.
 *
 * We deliberately do NOT touch generate-system-viz.mjs -- peer chat owns it.
 *
 * HEAP: when run standalone this loads the 745MB system-graph.json via
 * readGraphStreaming -- which needs the 24GB old-space heap that regen-viz.mjs
 * passes to every FAST[] generator (--max-old-space-size=24576). At node's
 * default heap the graph LOAD itself OOMs before the walk runs; the production
 * path is always via regen-viz, so this is fine. The actual hang-fix is the L9
 * subgroup filter below (74,704 -> 88 parents), independent of heap.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".cache",
  "$RECYCLE.BIN", "System Volume Information", ".pnpm", ".turbo",
]);

// per-parent caps
const MIN_SUBDIRS_TO_EXPAND = 3;   // skip parents with <3 subdirs (already a leaf-ish)
const MAX_CHILDREN_PER_PARENT = 8; // cap to keep graph readable
const BUCKET_MIN = 2;              // collapse extras into Misc

// per-child file walk caps (we only sample, not full enumerate)
const MAX_FILES_PER_CHILD = 5000;
const MAX_DEPTH_PER_CHILD = 3;

export function pathFromLabel(label) {
  // labels look like "H:/prism/BOX/ [5/5]" or "H:/Tools/" -- strip the trailing child-count
  // annotation "[N/M]" (added to L9 dir nodes by a decorator) THEN the trailing slash, so existsSync
  // resolves the real path (U-VIZ-FS-INVENTORY-WALK-FIX -- the annotation broke every parent before).
  if (!label) return null;
  return label.replace(/\s*\[[^\]]*\]\s*$/, "").replace(/\/$/, "").replace(/\\/g, "/").trim();
}

function listSubdirs(dir) {
  if (!fs.existsSync(dir)) return [];
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    if (e.name.startsWith("$")) continue;
    out.push(e.name);
  }
  return out;
}

function summarizeDir(dir) {
  // bounded recursive walk: returns {fileCount, totalBytes, maxDepth}
  let fileCount = 0;
  let totalBytes = 0;
  let maxDepth = 0;
  const stack = [{ p: dir, depth: 0 }];
  while (stack.length) {
    const { p, depth } = stack.pop();
    if (depth > maxDepth) maxDepth = depth;
    if (depth >= MAX_DEPTH_PER_CHILD) continue;
    if (fileCount >= MAX_FILES_PER_CHILD) break;
    let ents;
    try { ents = fs.readdirSync(p, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (e.name.startsWith("$") || SKIP_DIRS.has(e.name)) continue;
      const child = path.join(p, e.name);
      if (e.isDirectory()) {
        stack.push({ p: child, depth: depth + 1 });
      } else if (e.isFile()) {
        fileCount++;
        try { totalBytes += fs.statSync(child).size; } catch {}
        if (fileCount >= MAX_FILES_PER_CHILD) break;
      }
    }
  }
  return { fileCount, totalBytes, maxDepth, capped: fileCount >= MAX_FILES_PER_CHILD };
}

function logSize(bytes) {
  if (!bytes) return 0.3;
  const mb = bytes / (1024 * 1024);
  const v = 0.3 + Math.log10(1 + mb) * 0.12;
  return Math.min(0.95, Math.max(0.25, v));
}

function nodeIdFromSub(parentId, sub) {
  // strip "fs." prefix from parent then nest: fs.<parent>.<child>
  const stem = parentId.replace(/^fs\./, "");
  const childKey = sub.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return `fs.${stem}.${childKey || "x"}`;
}

export function generate(graphArg) {
  const graph = graphArg || (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  // ONLY the top-level filesystem-dir L9 nodes (subgroup prism|h_root, ~88) -- NOT the ~74,600 other L9
  // nodes (deep_subtree / deep_orphan / datacat_record / ...) whose path-like labels would each trigger a
  // bounded FS walk -> the >120s hang that kept this generator out of FAST[] (U-VIZ-FS-INVENTORY-WALK-FIX).
  // DELIBERATE NARROWING (R12): this also excludes ~56 `h_root_synthetic` L9 nodes (slot worktrees
  // H:/prism-slot-*, archived orphans, side projects like mcp-starter-kit). Those are transient
  // off-canonical-tree clutter that would churn the graph as worktrees are created/removed -- the
  // canonical inventory is the prism tree + the real H:/ roots, not every sibling working copy.
  const l9 = graph.nodes.filter(n => n.layer === "L9" && (n.subgroup === "prism" || n.subgroup === "h_root"));

  const byParent = {};
  const newNodes = [];
  const newEdges = [];
  const stats = { parents: 0, expanded: 0, skipped: 0, totalChildren: 0, missing: 0 };

  for (const parent of l9) {
    stats.parents++;
    const dir = pathFromLabel(parent.label);
    if (!dir) { stats.skipped++; continue; }
    if (!fs.existsSync(dir)) { stats.missing++; continue; }

    const subs = listSubdirs(dir);
    if (subs.length < MIN_SUBDIRS_TO_EXPAND) { stats.skipped++; continue; }

    // summarize each subdir
    const summarized = [];
    for (const sub of subs) {
      const childDir = path.join(dir, sub);
      const s = summarizeDir(childDir);
      summarized.push({ name: sub, dir: childDir, ...s });
    }

    // sort by fileCount desc — keep the meaningful ones
    summarized.sort((a, b) => b.fileCount - a.fileCount);

    // top-K kept as own nodes; rest collapsed into Misc
    const top = summarized.slice(0, MAX_CHILDREN_PER_PARENT);
    const rest = summarized.slice(MAX_CHILDREN_PER_PARENT);

    const children = [];
    const seenIds = new Set();
    for (const s of top) {
      const id = nodeIdFromSub(parent.id, s.name);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const node = {
        id,
        layer: "L9",
        subgroup: `${parent.subgroup}_2`,
        label: s.name,
        color: "#94a3b8",
        status: "built",
        size: logSize(s.totalBytes),
        tier: 1,
        parent: parent.id,
        info: `${path.relative(ROOT, s.dir).replace(/\\/g, "/") || s.dir} — ${s.fileCount}${s.capped ? "+" : ""} files, ${(s.totalBytes / (1024 * 1024)).toFixed(1)} MB`,
        fileCount: s.fileCount,
        totalBytes: s.totalBytes,
      };
      children.push(node);
      newNodes.push(node);
      newEdges.push({ from: parent.id, to: id, type: "contains", status: "active", intensity: 0.4 });
    }

    if (rest.length >= BUCKET_MIN) {
      const totalRestFiles = rest.reduce((a, x) => a + x.fileCount, 0);
      const totalRestBytes = rest.reduce((a, x) => a + x.totalBytes, 0);
      const id = nodeIdFromSub(parent.id, "_misc");
      if (!seenIds.has(id)) {
        const node = {
          id,
          layer: "L9",
          subgroup: `${parent.subgroup}_2`,
          label: `Misc (${rest.length})`,
          color: "#cbd5e1",
          status: "built",
          size: logSize(totalRestBytes),
          tier: 1,
          parent: parent.id,
          info: `${rest.length} smaller subdirs collapsed — ${totalRestFiles} files, ${(totalRestBytes / (1024 * 1024)).toFixed(1)} MB`,
          fileCount: totalRestFiles,
          totalBytes: totalRestBytes,
          isMisc: true,
          sampleSubdirs: rest.slice(0, 8).map(r => r.name),
        };
        children.push(node);
        newNodes.push(node);
        newEdges.push({ from: parent.id, to: id, type: "contains", status: "active", intensity: 0.3 });
      }
    }

    if (children.length) {
      stats.expanded++;
      stats.totalChildren += children.length;
      byParent[parent.id] = {
        mode: "subdir-expansion",
        count: children.length,
        totalSubdirs: subs.length,
        children: children.map(c => ({ id: c.id, label: c.label, fileCount: c.fileCount })),
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

// Run only when executed directly (so `import` for tests does NOT trigger the 745MB graph load + write).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generate();
  const outPath = path.join(VIZ_DIR, "fs-inventory-augmentation.json");
  fs.mkdirSync(VIZ_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`wrote ${outPath}`);
  console.log(`  parents=${result.stats.parents}  expanded=${result.stats.expanded}  skipped=${result.stats.skipped}  missing=${result.stats.missing}  totalChildren=${result.stats.totalChildren}`);
  const tops = Object.entries(result.byParent)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  for (const [pid, p] of tops) {
    console.log(`  ${pid.padEnd(40)} ${String(p.count).padStart(3)} children (from ${p.totalSubdirs} subdirs)`);
  }
}
