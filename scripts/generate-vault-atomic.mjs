#!/usr/bin/env node
/**
 * generate-vault-atomic.mjs -- drill the NON-wiki / NON-memories Obsidian vault
 * namespaces (knowledge/tribal, knowledge/claude-md, knowledge/gsd,
 * knowledge/Skills, knowledge/decisions, knowledge/sessions, ...) into
 * per-file atomic L8 nodes parented to a synthesized namespace rollup
 * (vault_tribal, vault_claude-md, ...). This is the sibling of
 * generate-memories-atomic.mjs (which already covers knowledge/memories) and
 * generate-system-viz's wiki coverage (knowledge/wiki) -- together they make the
 * WHOLE vault queryable via master_index_query / /system-viz.
 *
 * WHY THIS EXISTS (verified 2026-06-12, slot papa): `memory_*` ids = 17,388 in
 * system-graph.json (all of knowledge/memories) and `knowledge/wiki` = 43,531
 * nodes -- both already in-graph. But `knowledge/tribal` (4,247 .md),
 * `knowledge/claude-md` (88), `knowledge/gsd` (69), `knowledge/Skills` (41),
 * `knowledge/decisions` (5) etc. had ~1 node each -- invisible to the master
 * index. This generator closes that ~4,460-file gap.
 *
 * WHY NO GRAPH LOAD (differs from memories-atomic on purpose): merge-augmentations.mjs
 * dedups nodes by `id` (base-graph-first wins), so emitting the full vault
 * snapshot every run is idempotent at merge time. Skipping the 711MB graph read
 * avoids the OOM class that plagues these scripts and makes this generator cheap
 * + fail-safe (it can never wedge on graph size).
 *
 * Output: state/shared/system-viz/vault-atomic-augmentation.json
 * Wiring: regen-viz.mjs FAST[] + merge-augmentations.mjs loadOptional splice
 *         (both-or-neither -- per the FAST[]+splice rule).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const KNOW_DIR = path.join(ROOT, "knowledge");

// Namespaces already covered by other generators -- never re-walk them here.
const ALREADY_COVERED = new Set(["wiki", "memories"]);

// A file under this byte size is a near-empty stub (frontmatter only).
const STUB_BYTES = 300;
// Node-size visual scaling from file bytes (log10 KB curve, capped).
const SIZE_BASE = 0.26;
const SIZE_CAP = 0.18;
const SIZE_KB_COEFF = 0.07;

// Per-namespace hue (advisory color in /system-viz); default for anything new.
const NS_HUE = {
  tribal: "#f59e0b", "claude-md": "#60a5fa", gsd: "#34d399", Skills: "#c084fc",
  decisions: "#f472b6", sessions: "#fb7185", "hermes-brain": "#a78bfa",
  "hermes-outputs": "#818cf8", observations: "#2dd4bf", errors: "#ef4444",
  "h-drive-atlas": "#fbbf24", roadmap: "#22d3ee", relationships: "#a3e635",
  summaries: "#fcd34d", "data-index": "#93c5fd", "code-index": "#7dd3fc",
  "lint-reports": "#fca5a5", Materials: "#86efac", _default: "#94a3b8",
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function extractTitle(text) {
  const h = text.match(/^#\s+(.+?)\s*$/m);
  if (h) return h[1].slice(0, 120);
  const fm = text.match(/^---[\s\S]*?\n\s*(?:name|title)\s*:\s*(.+?)\s*$/m);
  if (fm) return fm[1].slice(0, 120);
  return null;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function listNamespaces() {
  if (!fs.existsSync(KNOW_DIR)) return [];
  return fs.readdirSync(KNOW_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !ALREADY_COVERED.has(e.name))
    .map((e) => e.name)
    .sort();
}

function generate() {
  const namespaces = listNamespaces();
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    namespaces: namespaces.length,
    filesScanned: 0,
    nodesEmitted: 0,
    parentSynth: 0,
    perNamespace: {},
  };

  function pushEdge(from, to) {
    const k = `${from}|${to}|contains`;
    if (seenEdge.has(k)) return;
    seenEdge.add(k);
    newEdges.push({ from, to, type: "contains", status: "active", intensity: 0.18 });
  }

  for (const ns of namespaces) {
    const nsDir = path.join(KNOW_DIR, ns);
    const files = walk(nsDir);
    if (files.length === 0) continue;
    const parentId = `vault_${ns}`;
    const hue = NS_HUE[ns] || NS_HUE._default;

    // Synthesize the namespace rollup parent once.
    if (!seenId.has(parentId)) {
      seenId.add(parentId);
      newNodes.push({
        id: parentId, layer: "L8", subgroup: "vault_namespace",
        label: `vault/${ns}`, color: hue, status: "built", size: 0.55,
        tier: 3, synthetic: true,
      });
      stats.parentSynth++;
    }

    for (const abs of files) {
      const rel = path.relative(nsDir, abs).replace(/\\/g, "/");
      const stem = rel.replace(/\.md$/, "");
      const slug = slugify(stem.replace(/\//g, "_"));
      const id = `${parentId}.${slug}`;
      if (seenId.has(id)) continue;
      seenId.add(id);

      let sizeBytes = 0;
      let text = "";
      try {
        sizeBytes = fs.statSync(abs).size;
        text = fs.readFileSync(abs, "utf8").slice(0, 5000);
      } catch { /* unreadable file -- emit with size 0, never throw */ }
      const title = extractTitle(text) ?? stem.split("/").pop().replace(/-/g, " ");

      newNodes.push({
        id, layer: "L8", subgroup: "vault_entry", parent: parentId,
        label: title,
        status: sizeBytes < STUB_BYTES ? "stub" : "built",
        color: hue,
        size: SIZE_BASE + Math.min(SIZE_CAP, Math.log10(1 + sizeBytes / 1024) * SIZE_KB_COEFF),
        tier: 3, ext: "md", sizeBytes,
        file: `knowledge/${ns}/${rel}`,
        vaultNamespace: ns,
      });
      pushEdge(parentId, id);
      stats.nodesEmitted++;
      stats.filesScanned++;
      stats.perNamespace[ns] = (stats.perNamespace[ns] || 0) + 1;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "knowledge/* (excl. wiki, memories)",
    newNodes,
    newEdges,
    stats,
  };
}

// Exported for tests (pure, no side effects).
export { generate, listNamespaces, slugify, extractTitle };

// CLI entry -- only runs when invoked directly, not when imported by a test.
if (process.argv[1]?.endsWith("generate-vault-atomic.mjs")) {
  const result = generate();
  const outPath = path.join(VIZ_DIR, "vault-atomic-augmentation.json");
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
  console.log(`  namespaces:    ${result.stats.namespaces}`);
  console.log(`  files scanned: ${result.stats.filesScanned}`);
  console.log(`  nodes emitted: ${result.stats.nodesEmitted}`);
  console.log(`  parent synth:  ${result.stats.parentSynth}`);
  for (const [k, n] of Object.entries(result.stats.perNamespace).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(18)} ${n}`);
  }
}
