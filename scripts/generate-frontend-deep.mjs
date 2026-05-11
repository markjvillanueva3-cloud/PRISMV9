#!/usr/bin/env node
/**
 * generate-frontend-deep.mjs — recursively walk every PRISM frontend and
 * emit per-file atomic L1 nodes plus directory rollups.
 *
 * Three frontends:
 *   - mcp-server/web/src              (main PRISM web — 100+ files)
 *   - cqask/ui                         (pending merge — 8 files)
 *   - mcp-cadquery/frontend/src        (pending merge — 10 files)
 *
 * Layout:
 *   L1  frontend.<app>                    (existing app rollup)
 *     L1  frontend.<app>.<segment>           (directory rollup)
 *       L1  frontend.<app>.<segment>.<file>     (per-file atomic)
 *
 * File classification:
 *   - components/  → component
 *   - pages/       → page  (route)
 *   - hooks/       → hook
 *   - api/         → api
 *   - features/    → feature
 *   - utils/       → util
 *   - types/       → type
 *   - __tests__/   → SKIP (already in L6 tests)
 *
 * Output: state/shared/system-viz/frontend-deep-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");

const FRONTENDS = [
  { app: "prism-web",    root: "mcp-server/web/src",      color: "#3b82f6", parentHint: null },
  { app: "cqask-ui",     root: "cqask/ui",                color: "#a78bfa", parentHint: null },
  { app: "cadquery-ui",  root: "mcp-cadquery/frontend/src", color: "#10b981", parentHint: null },
];

const VALID_EXTS = new Set([".tsx", ".ts", ".jsx", ".js", ".vue", ".svelte"]);
const SKIP_FILES = new Set(["vite-env.d.ts", "main.tsx", "index.ts", "tsconfig.json"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", ".git", "__tests__", "__snapshots__"]);
const MAX_DEPTH = 8;
const SLUG_NONALNUM = /[^a-z0-9._-]/g;

const ROLE_BY_SEGMENT = {
  components: "component",
  pages:      "page",
  hooks:      "hook",
  api:        "api",
  features:   "feature",
  utils:      "util",
  types:      "type",
  store:      "state",
  stores:     "state",
  context:    "state",
  contexts:   "state",
  routes:     "route",
  layouts:    "layout",
  layout:     "layout",
  ui:         "primitive",
};

const ROLE_COLOR = {
  component: "#60a5fa",
  page:      "#fbbf24",
  hook:      "#a78bfa",
  api:       "#22d3ee",
  feature:   "#34d399",
  util:      "#94a3b8",
  type:      "#cbd5e1",
  state:     "#f472b6",
  route:     "#fb923c",
  layout:    "#e879f9",
  primitive: "#7dd3fc",
};

function slug(s) {
  return s.toLowerCase().replace(SLUG_NONALNUM, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function detectRole(relPath) {
  const segs = relPath.split(/[\\/]/);
  for (const seg of segs) {
    const r = ROLE_BY_SEGMENT[seg.toLowerCase()];
    if (r) return r;
  }
  return "module";
}

function generate() {
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  function pushEdge(from, to) {
    const k = `${from}|${to}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type: "contains", status: "active", intensity: 0.18 });
    return true;
  }
  function addNode(n) {
    if (seenId.has(n.id)) return false;
    seenId.add(n.id);
    newNodes.push(n);
    return true;
  }

  const stats = { frontends: 0, dirRollups: 0, fileAtomics: 0, perApp: {}, perRole: {} };

  for (const fe of FRONTENDS) {
    const absRoot = path.join(ROOT, fe.root);
    if (!fs.existsSync(absRoot)) continue;
    stats.frontends++;

    const appRollupId = `frontend.${fe.app}`;
    addNode({
      id: appRollupId, layer: "L1",
      subgroup: "frontend_app",
      label: fe.app, status: "built",
      color: fe.color, size: 0.7, tier: 2, synthetic: true,
    });

    const dirToRollupId = new Map();   // relDir → rollupId
    function ensureDirRollup(relDir) {
      if (!relDir || relDir === "." || relDir === "") return appRollupId;
      if (dirToRollupId.has(relDir)) return dirToRollupId.get(relDir);
      const parts = relDir.split(/[\\/]/);
      const parentRel = parts.slice(0, -1).join("/");
      const parentId = ensureDirRollup(parentRel);
      const rollupId = `frontend.${fe.app}.${slug(relDir.replace(/[\\/]/g, "."))}`;
      dirToRollupId.set(relDir, rollupId);
      addNode({
        id: rollupId, layer: "L1",
        subgroup: "frontend_dir",
        parent: parentId,
        label: parts.slice(-1)[0], status: "built",
        color: fe.color, size: 0.40, tier: 2,
      });
      pushEdge(parentId, rollupId);
      stats.dirRollups++;
      return rollupId;
    }

    let perApp = { files: 0, byRole: {} };
    function walk(abs, depth) {
      if (depth > MAX_DEPTH) return;
      let ents;
      try { ents = fs.readdirSync(abs, { withFileTypes: true }); }
      catch { return; }
      for (const e of ents) {
        if (e.isDirectory()) {
          if (SKIP_DIRS.has(e.name.toLowerCase())) continue;
          walk(path.join(abs, e.name), depth + 1);
          continue;
        }
        if (!e.isFile()) continue;
        if (e.name.endsWith(".test.ts") || e.name.endsWith(".test.tsx") || e.name.endsWith(".spec.ts")) continue;
        if (SKIP_FILES.has(e.name)) continue;
        const ext = path.extname(e.name).toLowerCase();
        if (!VALID_EXTS.has(ext)) continue;
        const abspath = path.join(abs, e.name);
        const rel = path.relative(absRoot, abspath).split(path.sep).join("/");
        const relDir = path.dirname(rel);
        const stem = e.name.replace(/\.(tsx?|jsx?|vue|svelte)$/i, "");
        const role = detectRole(rel);
        const parentRollup = ensureDirRollup(relDir === "." ? "" : relDir);
        const fileId = `frontend.${fe.app}.${slug(rel.replace(/[\\/]/g, ".").replace(/\.[^.]+$/, ""))}`;
        let sizeBytes = 0;
        try { sizeBytes = fs.statSync(abspath).size; }
        catch { /* noop */ }
        addNode({
          id: fileId, layer: "L1",
          subgroup: "frontend_file",
          parent: parentRollup,
          label: stem, status: "built",
          color: ROLE_COLOR[role] || fe.color,
          size: 0.18 + Math.min(0.20, Math.log10(1 + sizeBytes / 1024) * 0.08),
          tier: 3,
          ext: ext.slice(1),
          file: `${fe.root}/${rel}`,
          role,
          sizeBytes,
        });
        pushEdge(parentRollup, fileId);
        stats.fileAtomics++;
        perApp.files++;
        perApp.byRole[role] = (perApp.byRole[role] || 0) + 1;
        stats.perRole[role] = (stats.perRole[role] || 0) + 1;
      }
    }
    walk(absRoot, 0);
    stats.perApp[fe.app] = perApp;
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes, newEdges, stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "frontend-deep-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
console.log(`  frontends scanned: ${result.stats.frontends}`);
console.log(`  dir rollups:       ${result.stats.dirRollups}`);
console.log(`  file atomics:      ${result.stats.fileAtomics}`);
console.log(`  ── per app ──`);
for (const [app, p] of Object.entries(result.stats.perApp)) {
  const roles = Object.entries(p.byRole).map(([r, n]) => `${r}:${n}`).join(" ");
  console.log(`    ${app.padEnd(14)} files=${p.files}  ${roles}`);
}
console.log(`  ── per role total ──`);
for (const [r, n] of Object.entries(result.stats.perRole).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${r.padEnd(12)} ${n}`);
}
