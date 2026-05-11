#!/usr/bin/env node
/**
 * generate-layer-stack-overview.mjs
 *
 * Emits a single human-readable architecture overview entry at
 *   H:/prism/knowledge/wiki/architecture/layer-stack-overview.md
 *
 * Contents:
 *   - Mermaid layer-dependency diagram (L0..L11 + L4a)
 *   - Live counts per layer
 *   - Headline metrics
 *   - Atomic-first build doctrine summary (Tier 0 → Tier 5)
 *   - Cross-links to every per-layer entry
 *
 * Read this entry first when onboarding to PRISM architecture — it's the
 * single-page index for the system-viz brain.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const WIKI_ARCH_DIR = resolve(PRISM_ROOT, "knowledge/wiki/architecture");
const OUT_PATH = join(WIKI_ARCH_DIR, "layer-stack-overview.md");

const LAYER_ORDER = ["L0", "L1", "L2", "L3", "L4", "L4a", "L5", "L6", "L7", "L8", "L9", "L10", "L11"];

const LAYER_LABEL = {
  L0: "Personas",
  L1: "Frontends",
  L2: "Transport",
  L3: "AI Hierarchy",
  L4: "Dispatchers",
  L4a: "Dispatcher Actions",
  L5: "Engines",
  L6: "Core (algos / schemas / skills)",
  L7: "Registries",
  L8: "Wiki / Memory / Milestones",
  L9: "Filesystem (root)",
  L10: "Memory Vault Categories",
  L11: "Deep Filesystem",
};

const LAYER_TIER = {
  L0: 5,
  L1: 4,
  L2: 3,
  L3: 2,
  L4: 2,
  L4a: 2,
  L5: 1,
  L6: 0,
  L7: 0,
  L8: 0,
  L9: 0,
  L10: 0,
  L11: 0,
};

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function countLayers(G) {
  const counts = {};
  for (const n of G.nodes) counts[n.layer] = (counts[n.layer] || 0) + 1;
  return counts;
}

function renderMermaid(counts) {
  const lines = ["```mermaid", "flowchart TD"];
  for (const L of LAYER_ORDER) {
    const label = LAYER_LABEL[L] || L;
    const c = counts[L] || 0;
    const tier = LAYER_TIER[L];
    const node = `${L}["${L} · ${label}<br/><b>${c.toLocaleString()}</b> nodes · tier ${tier}"]`;
    lines.push(`    ${node}`);
  }
  // Vertical descent edges (top-down consumption)
  lines.push("    L0 --> L1");
  lines.push("    L1 --> L2");
  lines.push("    L2 --> L3");
  lines.push("    L3 --> L4");
  lines.push("    L4 --> L4a");
  lines.push("    L4 --> L5");
  lines.push("    L4a --> L5");
  lines.push("    L5 --> L6");
  lines.push("    L5 --> L7");
  lines.push("    L6 --> L7");
  lines.push("    L6 --> L8");
  lines.push("    L8 --> L10");
  lines.push("    L9 --> L11");
  lines.push("    L10 --> L11");
  // Tier styling
  lines.push("    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4");
  lines.push("    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365");
  lines.push("    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9");
  lines.push("    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9");
  lines.push("    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a");
  lines.push("    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a");
  lines.push("    class L6,L7,L8,L9,L10,L11 tier0");
  lines.push("    class L5 tier1");
  lines.push("    class L3,L4,L4a tier2");
  lines.push("    class L2 tier3");
  lines.push("    class L1 tier4");
  lines.push("    class L0 tier5");
  lines.push("```");
  return lines.join("\n");
}

function renderCountTable(counts) {
  const rows = LAYER_ORDER.map((L) => {
    const c = counts[L] || 0;
    return `| [[layer-${L.toLowerCase()}]] | ${L} | ${LAYER_LABEL[L]} | ${LAYER_TIER[L]} | ${c.toLocaleString()} |`;
  });
  return [
    "| Wiki entry | ID | Layer | Tier | Nodes |",
    "|------------|----|-------|------|-------|",
    ...rows,
  ].join("\n");
}

function render(G) {
  const counts = countLayers(G);
  const headline = (G.meta && G.meta.headline) || {};
  const generatedAt = new Date().toISOString().split("T")[0];
  const totalNodes = (G.nodes || []).length;
  const totalEdges = (G.edges || []).length;

  return `---
title: Layer Stack Overview
type: architecture
generated_by: scripts/generate-layer-stack-overview.mjs
last_verified: ${generatedAt}
tags: [architecture, system-viz, overview, mermaid, atomic-first]
related:
  - state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md
  - state/shared/system-viz/system-graph.json
  - knowledge/wiki/architecture/system-viz.md
---

# PRISM Layer Stack — single-page overview

> Visual one-page index of the 13-layer architecture rendered from \`system-graph.json\`.
> This is the entry point for any chat/agent exploring PRISM structure.

**Total graph:** ${totalNodes.toLocaleString()} nodes · ${totalEdges.toLocaleString()} edges
**Headline:** ${headline.built ?? "?"} engines wired · ${headline.unwired ?? "?"} unwired · ${headline.drift ?? 0} drift · ${headline.pendingFE ?? 0} frontend merges pending · ${headline.wikiEntries ?? "?"} wiki entries

## Layer diagram

${renderMermaid(counts)}

## Layer counts (with wiki links)

${renderCountTable(counts)}

## Atomic-first build doctrine

Tier 0 (foundation) — build/fix first. One Tier-0 primitive cascades upward:
- Unlocks 5–20 Tier-1 engines that consume it
- Which become callable through 1–4 Tier-2 dispatchers
- Which expose new actions on Tier-3 transport
- Which power N Tier-4 pages
- Which serve every Tier-5 persona

**Never start a higher-tier feature while its lower-tier blocks are missing.**

| Tier | Layers | Why first? |
|------|--------|------------|
| 0 | L6, L7, L8, L9, L10, L11 | Atomic primitives — physics constants, schemas, registries, knowledge, filesystem |
| 1 | L5 | Engines (3,243) — must wire to ≥1 dispatcher or be deleted |
| 2 | L3, L4, L4a | AI tiers (12), dispatchers (97), actions (9,228) |
| 3 | L2 | Transport — REST/WS/MCP/auth/telemetry |
| 4 | L1 | Frontends (165 pages) — dead pixels if Tier-1 unwired |
| 5 | L0 | Personas — UX validation last |

## Engine domains (per-domain wiki)

Each L5 engine domain has its own wiki entry: see \`knowledge/wiki/architecture/domain-*.md\`.
Top-leverage domains: \`mill\`, \`cad\`, \`cam\`, \`fusion\`, \`hyper\`, \`wedm\`, \`lathe\`, \`ai\`, \`five\`, \`swiss\`.

## Dispatcher index (per-dispatcher wiki)

Each L4 dispatcher has its own wiki entry: see \`knowledge/wiki/architecture/dispatcher-*.md\`.
Sorted by action count in \`knowledge/wiki/index.md\` → ### Dispatchers section.

## See also

- Live viewer: \`/system-viz\` slash command (port 8765)
- Directive: \`state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md\` (authoritative rules)
- Adapter: \`node scripts/system-viz-query.mjs roadmap-candidates\`
- Generators that produced this brain:
  - \`scripts/generate-layer-wiki.mjs\` — 13 per-layer entries
  - \`scripts/generate-domain-wiki.mjs\` — 38 per-domain entries
  - \`scripts/generate-dispatcher-wiki.mjs\` — 97 per-dispatcher entries
  - \`scripts/generate-layer-stack-overview.mjs\` — this entry
`;
}

function main() {
  if (!existsSync(GRAPH_PATH)) {
    process.stderr.write("graph missing\n");
    process.exit(2);
  }
  const G = readJson(GRAPH_PATH);
  ensureDir(WIKI_ARCH_DIR);
  const md = render(G);
  writeFileSync(OUT_PATH, md, "utf8");
  process.stdout.write(`wrote ${OUT_PATH} (${md.length}b)\n`);
}

main();
