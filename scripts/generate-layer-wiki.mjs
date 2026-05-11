#!/usr/bin/env node
/**
 * generate-layer-wiki.mjs
 *
 * Generates one Obsidian wiki entry per system-viz layer at
 *   H:/prism/knowledge/wiki/architecture/layer-<id>.md
 *
 * Source of truth: H:/prism/state/shared/system-viz/system-graph.json
 *
 * Each layer entry surfaces:
 *   - purpose (canonical per-layer description)
 *   - counts (nodes, edges in/out, kind distribution, status distribution)
 *   - top representative nodes
 *   - cross-references to system-viz directive + sibling layers
 *
 * Idempotent: regenerating overwrites only the auto-managed section between
 *   <!-- AUTO-START --> ... <!-- AUTO-END -->
 * markers, preserving any human-added notes above/below.
 *
 * Also updates knowledge/wiki/index.md with an "## architecture" subsection
 * pointing at every emitted entry.
 *
 * Flags:
 *   --check      exit 1 if wiki entries are stale relative to graph mtime
 *   --dry-run    print what would be written without touching disk
 */
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const WIKI_ARCH_DIR = resolve(PRISM_ROOT, "knowledge/wiki/architecture");
const WIKI_INDEX = resolve(PRISM_ROOT, "knowledge/wiki/index.md");
const DIRECTIVE = "knowledge/wiki/architecture/system-viz.md";

const args = new Set(process.argv.slice(2));
const FLAGS = {
  check: args.has("--check"),
  dryRun: args.has("--dry-run"),
};

// Canonical per-layer doctrine — describes WHAT lives in each layer + why.
// Layer ids match what the generator emits in system-graph.json.
const LAYER_META = {
  L0: {
    title: "L0 — Personas",
    purpose: "Roles and stakeholders the platform serves. Operator-in-the-loop is unconditional; every higher-layer surface must trace back to a persona.",
    tier: 5,
    siblings: ["L1"],
    consumes: ["L1"],
  },
  L1: {
    title: "L1 — Frontends",
    purpose: "All UI surfaces — Next.js web app variants, slash-command HTML viewers, in-host CAD/CAM panels. Pages without wired Tier-1 engines are 'dead pixels'.",
    tier: 4,
    siblings: ["L0", "L2"],
    consumes: ["L2"],
  },
  L2: {
    title: "L2 — Transport",
    purpose: "Wire protocols: MCP server :3100, REST, WebSocket, message queues, pub/sub. Auth, rate-limiting, telemetry middleware live here.",
    tier: 3,
    siblings: ["L1", "L3"],
    consumes: ["L3", "L4"],
  },
  L3: {
    title: "L3 — AI Hierarchy",
    purpose: "Three-tier AI orchestration. Tier-1 Claude (master), Tier-2 FullSystemAICoordinator (flow), Tier-3 domain specialists + Ollama local LLM bridges.",
    tier: 2,
    siblings: ["L2", "L4"],
    consumes: ["L4"],
  },
  L4: {
    title: "L4 — Dispatchers",
    purpose: "97 MCP dispatchers route every capability to engines. Categories: manufacturing, ai_intel, business, system. Primary execution surface — prefer dispatcher actions over inlining engine logic.",
    tier: 2,
    siblings: ["L3", "L4a", "L5"],
    consumes: ["L5", "L4a"],
  },
  L4a: {
    title: "L4a — Dispatcher Actions",
    purpose: "Individual action enums on each dispatcher. 9,228 actions form the leaf API surface. Each action maps to one or more engine calls.",
    tier: 2,
    siblings: ["L4", "L5"],
    consumes: ["L5"],
  },
  L5: {
    title: "L5 — Engines",
    purpose: "3,243 engines do the actual work. Each engine should be wired to ≥1 dispatcher; unwired engines are orphans that need either wiring or deletion.",
    tier: 1,
    siblings: ["L4", "L4a", "L6"],
    consumes: ["L6", "L7"],
  },
  L6: {
    title: "L6 — Core (algorithms, schemas, skills, tests)",
    purpose: "Foundation primitives that engines compose. Algorithms (53), Zod schemas (562+), TypeScript types (687), skills (637), tests (3175). Tier-0 atomic — build/fix here first for max cascade.",
    tier: 0,
    siblings: ["L5", "L7", "L8"],
    consumes: ["L7"],
  },
  L7: {
    title: "L7 — Registries",
    purpose: "14 registries holding 29,569 catalog entries (materials, tools, machines, alarms, formulas, coolants, coatings, workholding). Read-mostly knowledge tables consumed by engines.",
    tier: 0,
    siblings: ["L6", "L8"],
    consumes: [],
  },
  L8: {
    title: "L8 — Wiki / Memory / Milestones",
    purpose: "Compounding Karpathy-style LLM-Wiki (190 entries), agent memory vault (189 entries), milestone catalog (306), state files (74). Long-term context for cross-session continuity.",
    tier: 0,
    siblings: ["L7", "L10"],
    consumes: [],
  },
  L9: {
    title: "L9 — Filesystem (root tree)",
    purpose: "Top-level H:/prism filesystem structure: planned units (2,256), prism trees (300), H: root markers (100). Coarse navigation for non-PRISM assets.",
    tier: 0,
    siblings: ["L8", "L11"],
    consumes: [],
  },
  L10: {
    title: "L10 — Memory Vault Categories",
    purpose: "Memory vault subdirectories: code-tribal (181), root-level (77), feedback (44), project (32). Each houses durable cross-session learnings.",
    tier: 0,
    siblings: ["L8", "L11"],
    consumes: [],
  },
  L11: {
    title: "L11 — Deep Filesystem",
    purpose: "Every file under H:/prism (102,666 nodes). JSON state, markdown docs, Python tools, TypeScript engines. Use sparingly — this is the long tail.",
    tier: 0,
    siblings: ["L9", "L10"],
    consumes: [],
  },
};

const AUTO_START = "<!-- AUTO-START — regenerated by generate-layer-wiki.mjs -->";
const AUTO_END = "<!-- AUTO-END -->";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function buildLayerIndex(G) {
  const nodeLayer = new Map();
  for (const n of G.nodes) nodeLayer.set(n.id, n.layer);
  const inByLayer = {};
  const outByLayer = {};
  for (const e of G.edges) {
    const fromL = nodeLayer.get(e.from);
    const toL = nodeLayer.get(e.to);
    if (toL) inByLayer[toL] = (inByLayer[toL] || 0) + 1;
    if (fromL) outByLayer[fromL] = (outByLayer[fromL] || 0) + 1;
  }
  return { inByLayer, outByLayer };
}

function analyzeLayer(G, layerId, edgeIdx) {
  const nodes = G.nodes.filter((n) => n.layer === layerId);
  const inEdges = { length: edgeIdx.inByLayer[layerId] || 0 };
  const outEdges = { length: edgeIdx.outByLayer[layerId] || 0 };
  const kinds = {};
  const statuses = {};
  for (const n of nodes) {
    const k = n.kind || n.subgroup || "node";
    kinds[k] = (kinds[k] || 0) + 1;
    const s = n.status || "-";
    statuses[s] = (statuses[s] || 0) + 1;
  }
  // Top representative nodes — prefer higher-leverage if available, else first 8
  const top = nodes
    .map((n) => ({
      label: n.label || n.id,
      id: n.id,
      leverage:
        (n.unlocks && n.unlocks.leverageScore) ||
        (n.count ? Number(n.count) : 0),
      status: n.status,
    }))
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, 10);
  return {
    nodes: nodes.length,
    inEdges: inEdges.length,
    outEdges: outEdges.length,
    kinds,
    statuses,
    top,
  };
}

function renderEntry(layerId, meta, analysis, generatedAt, headline) {
  const kindRows = Object.entries(analysis.kinds)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join("\n");
  const statusRows = Object.entries(analysis.statuses)
    .filter(([k]) => k !== "-")
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join("\n") || "| (none tagged) | — |";
  const topRows = analysis.top
    .map((t) => `- \`${t.id}\` — ${t.label}${t.status ? ` *(${t.status})*` : ""}`)
    .join("\n") || "_(no nodes)_";
  const siblingLinks = (meta.siblings || [])
    .map((s) => `[[layer-${s.toLowerCase()}]]`)
    .join(" · ");
  const consumesLinks = (meta.consumes || [])
    .map((s) => `[[layer-${s.toLowerCase()}]]`)
    .join(" · ") || "_(leaf)_";

  return `---
title: ${meta.title}
type: architecture
layer: ${layerId}
tier: ${meta.tier}
generated_by: scripts/generate-layer-wiki.mjs
last_verified: ${generatedAt}
tags: [architecture, system-viz, layer-${layerId.toLowerCase()}, tier-${meta.tier}]
related:
  - knowledge/wiki/architecture/system-viz.md
  - state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md
  - state/shared/system-viz/system-graph.json
---

# ${meta.title}

> ${meta.purpose}

**Headline:** ${headline.built} engines wired / ${headline.unwired} unwired · ${headline.drift} envelope drift · ${headline.pendingFE} frontend merges pending

${AUTO_START}

## Counts

- **Nodes in this layer:** ${analysis.nodes}
- **Edges into layer:** ${analysis.inEdges}
- **Edges out of layer:** ${analysis.outEdges}
- **Tier:** ${meta.tier} (${meta.tier === 0 ? "atomic foundation" : meta.tier === 5 ? "persona surface" : "tier-" + meta.tier})

## Kind distribution

| Kind | Count |
|------|-------|
${kindRows}

## Status distribution

| Status | Count |
|--------|-------|
${statusRows}

## Top nodes (by leverage / count)

${topRows}

## Siblings

${siblingLinks || "_(none)_"}

## Consumes

${consumesLinks}

${AUTO_END}

## See also

- Live graph: \`state/shared/system-viz/system-graph.json\`
- Directive: \`state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md\`
- Viewer: \`/system-viz\` slash command
`;
}

function preserveHumanContent(existing, newAutoBlock, fullEntry) {
  // If file exists with auto markers, preserve everything outside them.
  if (!existing) return fullEntry;
  const startIdx = existing.indexOf(AUTO_START);
  const endIdx = existing.indexOf(AUTO_END);
  if (startIdx === -1 || endIdx === -1) {
    // Either no markers (first run) or hand-authored — overwrite cleanly.
    return fullEntry;
  }
  const before = existing.slice(0, startIdx);
  const after = existing.slice(endIdx + AUTO_END.length);
  return before + newAutoBlock + after;
}

function extractAutoBlock(fullEntry) {
  const s = fullEntry.indexOf(AUTO_START);
  const e = fullEntry.indexOf(AUTO_END);
  return fullEntry.slice(s, e + AUTO_END.length);
}

function updateWikiIndex(layerEntries) {
  if (!existsSync(WIKI_INDEX)) return null;
  const text = readFileSync(WIKI_INDEX, "utf8");
  const section = [
    "## architecture",
    "",
    "_Auto-managed by `scripts/generate-layer-wiki.mjs` — do not hand-edit between markers._",
    "",
    "<!-- ARCH-LAYERS-START -->",
    ...layerEntries.map(
      (e) =>
        `- [[layer-${e.layerId.toLowerCase()}]] — ${e.title} (${e.count} nodes, tier ${e.tier})`
    ),
    "<!-- ARCH-LAYERS-END -->",
    "",
  ].join("\n");

  let next;
  if (text.includes("<!-- ARCH-LAYERS-START -->")) {
    next = text.replace(
      /<!-- ARCH-LAYERS-START -->[\s\S]*?<!-- ARCH-LAYERS-END -->/m,
      [
        "<!-- ARCH-LAYERS-START -->",
        ...layerEntries.map(
          (e) =>
            `- [[layer-${e.layerId.toLowerCase()}]] — ${e.title} (${e.count} nodes, tier ${e.tier})`
        ),
        "<!-- ARCH-LAYERS-END -->",
      ].join("\n")
    );
  } else if (text.includes("\n## architecture")) {
    // Section header exists but no markers — append marker block right after it.
    next = text.replace(
      /(\n## architecture\s*\n)/,
      `$1\n${section}\n`
    );
  } else {
    // Append a fresh section at end.
    next = text.trimEnd() + "\n\n" + section + "\n";
  }
  return next;
}

function main() {
  if (!existsSync(GRAPH_PATH)) {
    process.stderr.write(`graph not found at ${GRAPH_PATH}\n`);
    process.exit(2);
  }

  if (FLAGS.check) {
    const gMtime = statSync(GRAPH_PATH).mtimeMs;
    let stale = 0;
    for (const id of Object.keys(LAYER_META)) {
      const f = join(WIKI_ARCH_DIR, `layer-${id.toLowerCase()}.md`);
      if (!existsSync(f)) {
        stale++;
        continue;
      }
      if (statSync(f).mtimeMs < gMtime) stale++;
    }
    if (stale > 0) {
      process.stderr.write(`${stale} layer wiki entries stale\n`);
      process.exit(1);
    }
    process.stderr.write("all layer entries fresh\n");
    process.exit(0);
  }

  const G = readJson(GRAPH_PATH);
  const headline = (G.meta && G.meta.headline) || { built: 0, unwired: 0, drift: 0, pendingFE: 0 };
  const generatedAt = new Date().toISOString().split("T")[0];
  const edgeIdx = buildLayerIndex(G);

  ensureDir(WIKI_ARCH_DIR);

  const indexEntries = [];
  for (const [layerId, meta] of Object.entries(LAYER_META)) {
    const analysis = analyzeLayer(G, layerId, edgeIdx);
    const full = renderEntry(layerId, meta, analysis, generatedAt, headline);
    const outPath = join(WIKI_ARCH_DIR, `layer-${layerId.toLowerCase()}.md`);
    const existing = existsSync(outPath) ? readFileSync(outPath, "utf8") : null;
    const newAutoBlock = extractAutoBlock(full);
    const finalContent = preserveHumanContent(existing, newAutoBlock, full);

    if (FLAGS.dryRun) {
      process.stdout.write(`would write ${outPath} (${finalContent.length} bytes)\n`);
    } else {
      writeFileSync(outPath, finalContent, "utf8");
    }

    indexEntries.push({
      layerId,
      title: meta.title,
      tier: meta.tier,
      count: analysis.nodes,
    });
  }

  const indexUpdated = updateWikiIndex(indexEntries);
  if (indexUpdated && !FLAGS.dryRun) {
    writeFileSync(WIKI_INDEX, indexUpdated, "utf8");
  }

  process.stdout.write(
    `generated ${indexEntries.length} layer wiki entries · index ${indexUpdated ? "updated" : "skipped"}\n`
  );
  process.stdout.write(
    `total graph: ${G.nodes.length} nodes / ${G.edges.length} edges · headline=${JSON.stringify(headline)}\n`
  );
}

main();
