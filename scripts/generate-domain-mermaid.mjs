#!/usr/bin/env node
/**
 * generate-domain-mermaid.mjs
 *
 * Generates one Mermaid sub-diagram per top-N engine domain at
 *   H:/prism/knowledge/wiki/architecture/diagrams/<domain>-flow.md
 *
 * Each diagram visualizes the domain's L5 engine rollup, its drilled atomic
 * engines (sample), the L4 dispatcher it routes through, and the L4a actions
 * the dispatcher exposes. Provides a per-domain narrow lens for chats whose
 * work concentrates in one domain (e.g. lathe-master, mill-master).
 *
 * Top-N is sorted by atomic engine count to maximize information density.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const GRAPH_PATH = resolve(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const WIKI_ARCH_DIR = resolve(PRISM_ROOT, "knowledge/wiki/architecture");
const DIAGRAMS_DIR = join(WIKI_ARCH_DIR, "diagrams");

const TOP_N_DOMAINS = 12;
const SAMPLE_ATOMICS = 6;
const SAMPLE_ACTIONS = 6;

const args = new Set(process.argv.slice(2));
const FLAGS = { dryRun: args.has("--dry-run") };

function readJson(p) { return JSON.parse(readFileSync(p, "utf8")); }
function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }
function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function indexGraph(G) {
  const nodeById = new Map();
  for (const n of G.nodes) nodeById.set(n.id, n);
  const outFrom = new Map();
  for (const e of G.edges) {
    const arr = outFrom.get(e.from) || [];
    arr.push(e.to);
    outFrom.set(e.from, arr);
  }
  return { nodeById, outFrom };
}

function analyzeDomain(G, domain, idx) {
  const atomics = [];
  for (const n of G.nodes) {
    if (n.layer !== "L5") continue;
    if ((n.subgroup || n.kind) !== "atomic_engine") continue;
    if (!new RegExp(`^eng\\.${domain}\\.`).test(n.id)) continue;
    atomics.push(n);
  }
  // Best-match dispatcher: L4 node whose label === domain
  let dispatcher = null;
  for (const n of G.nodes) {
    if (n.layer !== "L4") continue;
    if ((n.label || "").toLowerCase() === domain || (n.id || "").toLowerCase().includes(domain)) {
      dispatcher = n;
      break;
    }
  }
  // Sample actions for that dispatcher
  const actions = [];
  if (dispatcher) {
    const out = idx.outFrom.get(dispatcher.id) || [];
    for (const toId of out) {
      const node = idx.nodeById.get(toId);
      if (node && node.layer === "L4a") actions.push(node);
      if (actions.length >= SAMPLE_ACTIONS) break;
    }
  }
  return { atomics, dispatcher, actions };
}

function renderMermaid(domain, analysis) {
  const dispLabel = analysis.dispatcher ? analysis.dispatcher.label || domain : `(no dispatcher)`;
  const lines = ["```mermaid", "flowchart LR"];
  // Persona → L1 → L2 → L3 simplified header
  lines.push(`    P0["Persona<br/>(operator/planner)"]:::tier5`);
  lines.push(`    L1F["Frontend page<br/>(consuming ${domain})"]:::tier4`);
  lines.push(`    TR["Transport<br/>(MCP :3100)"]:::tier3`);
  lines.push(`    D["${dispLabel} dispatcher<br/>L4"]:::tier2`);
  // Actions
  const actSlugs = analysis.actions.map((a) => `A_${slug(a.label || a.id)}`);
  analysis.actions.forEach((a, i) => {
    lines.push(`    ${actSlugs[i]}["${a.label || a.id}<br/>L4a"]:::tier2a`);
  });
  // Engine rollup + atomic samples
  lines.push(`    ER["${domain} engines (${analysis.atomics.length})<br/>L5 rollup"]:::tier1`);
  const atomSlugs = analysis.atomics.slice(0, SAMPLE_ATOMICS).map((a) => `E_${slug(a.label || a.id)}`);
  analysis.atomics.slice(0, SAMPLE_ATOMICS).forEach((a, i) => {
    lines.push(`    ${atomSlugs[i]}["${a.label || a.id}"]:::tier1`);
  });
  // Foundation tier
  lines.push(`    F["Tier-0 foundation<br/>(physics, schemas, registries)"]:::tier0`);
  // Edges
  lines.push("    P0 --> L1F --> TR --> D");
  for (const s of actSlugs) lines.push(`    D --> ${s}`);
  for (const s of actSlugs) lines.push(`    ${s} --> ER`);
  for (const s of atomSlugs) lines.push(`    ER --> ${s}`);
  for (const s of atomSlugs) lines.push(`    ${s} --> F`);
  // Tier coloring
  lines.push("    classDef tier0 fill:#0f4c5c,color:#fff,stroke:#5fb3c4");
  lines.push("    classDef tier1 fill:#6a5a3a,color:#fff,stroke:#d9b365");
  lines.push("    classDef tier2 fill:#3a4a6a,color:#fff,stroke:#7a9ad9");
  lines.push("    classDef tier2a fill:#2a3a5a,color:#fff,stroke:#5a7ab9");
  lines.push("    classDef tier3 fill:#5a3a6a,color:#fff,stroke:#b07ad9");
  lines.push("    classDef tier4 fill:#6a3a4a,color:#fff,stroke:#d97a9a");
  lines.push("    classDef tier5 fill:#4a3a3a,color:#fff,stroke:#d99a7a");
  lines.push("```");
  return lines.join("\n");
}

function renderEntry(domain, analysis, generatedAt) {
  return `---
title: Domain flow — ${domain}
type: architecture
domain: ${domain}
generated_by: scripts/generate-domain-mermaid.mjs
last_verified: ${generatedAt}
tags: [architecture, system-viz, mermaid, domain-${slug(domain)}, sub-diagram]
related:
  - knowledge/wiki/architecture/domain-${slug(domain)}.md
  - knowledge/wiki/architecture/layer-stack-overview.md
---

# Domain flow — \`${domain}\`

> Narrow lens on the \`${domain}\` engine domain — atomic engines + dispatcher + actions in one Mermaid diagram. Use this when working concentrates in one domain.

**Atomic engines indexed:** ${analysis.atomics.length} (sample of ${SAMPLE_ATOMICS} shown)
**Dispatcher:** ${analysis.dispatcher ? `\`${analysis.dispatcher.label}\`` : "_(no L4 match)_"}
**Sample actions:** ${analysis.actions.length}

## Flow diagram

${renderMermaid(domain, analysis)}

## See also

- Full domain entry: [[domain-${slug(domain)}]]
- Stack overview: [[layer-stack-overview]]
- Per-engine: \`knowledge/wiki/architecture/engines/${domain}/\`
${analysis.dispatcher ? `- Dispatcher entry: [[dispatcher-${slug(analysis.dispatcher.label || analysis.dispatcher.id)}]]` : ""}
`;
}

function main() {
  if (!existsSync(GRAPH_PATH)) { console.error("graph missing"); process.exit(2); }
  const G = readJson(GRAPH_PATH);
  const idx = indexGraph(G);
  const generatedAt = new Date().toISOString().split("T")[0];
  ensureDir(DIAGRAMS_DIR);

  // Rank domains by atomic engine count
  const domainCounts = {};
  for (const n of G.nodes) {
    if (n.layer !== "L5") continue;
    if ((n.subgroup || n.kind) !== "atomic_engine") continue;
    const m = /^eng\.([a-z0-9_]+)\./.exec(n.id);
    if (!m) continue;
    domainCounts[m[1]] = (domainCounts[m[1]] || 0) + 1;
  }
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N_DOMAINS)
    .map(([d]) => d);

  let written = 0;
  for (const domain of topDomains) {
    const analysis = analyzeDomain(G, domain, idx);
    const outPath = join(DIAGRAMS_DIR, `${slug(domain)}-flow.md`);
    const md = renderEntry(domain, analysis, generatedAt);
    if (!FLAGS.dryRun) writeFileSync(outPath, md, "utf8");
    written++;
  }
  console.log(`generated ${written} Mermaid sub-diagrams (top ${TOP_N_DOMAINS} domains): ${topDomains.join(", ")}`);
}

main();
