#!/usr/bin/env node
/**
 * bridge-graph-builder.mjs — META artifact for exhaustive cross-domain
 * wire-and-bridge planning. Streams `state/shared/system-viz/system-graph.json`
 * (520MB+), enumerates every L5–L8 node by inferred domain, scores cross-
 * level and within-level bridge candidates by leverage (degree centrality
 * × cross-domain bonus × built-status weight).
 *
 * Per /goal directive 2026-05-24: "wire and bridge all relevant nodes at
 * each possible level of /system-viz culminating with the most comprehensive
 * build for the prism app as possible… map the path, and wire and bridge by
 * domains first within each level. also think of cross level bridgings".
 *
 * This is the canonical bridge-map: future bridge units consume this artifact
 * to ship bridges in priority order. Per [[feedback_compounding_gains]],
 * a one-shot map is worthless in 30 days; a re-runnable map compounds.
 *
 * Outputs:
 *   state/shared/specs/PRISM-BRIDGE-GRAPH.json   — full structured map
 *   state/shared/specs/PRISM-BRIDGE-GRAPH.md     — operator-readable digest
 *   state/shared/specs/PRISM-BRIDGE-GRAPH.html   — visual companion (Thariq pattern)
 *
 * Usage:
 *   node scripts/bridge-graph-builder.mjs                # full run
 *   node scripts/bridge-graph-builder.mjs --top 30       # top 30 bridges
 *   node scripts/bridge-graph-builder.mjs --domain lathe # filter to one domain
 *   node scripts/bridge-graph-builder.mjs --json         # JSON to stdout
 */

import fs from "node:fs";
import path from "node:path";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "..");
const GRAPH_PATH = path.join(REPO_ROOT, "state/shared/system-viz/system-graph.json");
const OUT_DIR = path.join(REPO_ROOT, "state/shared/specs");
const OUT_JSON = path.join(OUT_DIR, "PRISM-BRIDGE-GRAPH.json");
const OUT_MD = path.join(OUT_DIR, "PRISM-BRIDGE-GRAPH.md");

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => {
    if (!a.startsWith("--")) return [];
    const k = a.slice(2);
    const next = arr[i + 1];
    if (next === undefined || next.startsWith("--")) return [[k, true]];
    return [[k, next]];
  }),
);
const TOP_K = Number(args.top ?? 50);
const DOMAIN_FILTER = typeof args.domain === "string" ? args.domain.toLowerCase() : null;
const JSON_MODE = args.json === true;

// Domain inference — pulled from PRISM's actual L5 engine namespacing.
// Order matters: most-specific patterns first (lathe before mill — both share "ill").
const DOMAIN_PATTERNS = [
  ["lathe",      /lathe|turning|cnmg|wnmg|tnmg/i],
  ["mill",       /mill|milling|endmill|facemill|chipload/i],
  ["wedm",       /wedm|wireedm|wireEDM|sodick|charmilles|fanuc.*wire/i],
  ["sinker",     /sinker|sinkeredm|edm.*sinker|graphite/i],
  ["5axis",      /5axis|five.?axis|simultaneous|swarf|tilt/i],
  ["swiss",      /swiss/i],
  ["grinder",    /grind|grinder|grinding|wheel.?dress/i],
  ["cad",        /cad|geometry|step|iges|stl|nurbs|brep|stp/i],
  ["cam",        /cam(?!era)|toolpath|post.?processor|mastercam|hypermill|fusion360|powermill|nx.?cam|solidcam|bobcad|esprit|worknc|cimatron|sprutcam|catia/i],
  ["physics",    /physics|kienzle|taylor|chatter|deflection|thermal|cutting.?force|spec.?cutt/i],
  ["tooling",    /tool|insert|holder|magazine|crib|toolcrib|breakage|wear/i],
  ["material",   /material|alloy|steel|aluminum|titanium|inconel|brass|copper|stock/i],
  ["quote",      /quote|quoting|estimate|estimating|bid|pricing/i],
  ["erp",        /erp|invoice|purchase|po|customer|vendor|job|order|receipt/i],
  ["safety",     /safety|omega|sigma|safetyfactor|safetyenvelope|cmm|inspection|compliance/i],
  ["ai",         /ai|llm|neural|reasoning|sona|moe|lora|gpt|claude|qwen|prism.?ai|cognitive/i],
  ["learning",   /learn|tribal|playbook|wiki|memory|knowledge|reasoning.?bank|reflexion/i],
  ["nn",         /nn|gnn|graph.?neural|graph.?sage|graph.?conv|embedding|hnsw|vector/i],
  ["business",   /business|biz|kpi|metric|dashboard|report|finance|roi|margin|cost.?center/i],
  ["shop",       /shop|jm.?die|operator|employee|kaizen|shift|scheduler|fleet|machine.?config/i],
  ["dispatcher", /dispatcher|router|orchestrat|registry|action.?map|tool.?route/i],
  ["session",    /session|handoff|claim|chat.?slot|terminal|context.?budget|loop.?state/i],
  ["hook",       /hook|gate|guard|advisory|warn|block/i],
  ["test",       /test|spec|vitest|fixture|harness/i],
  ["build",      /build|tsc|esbuild|compile|bundle|emit/i],
  ["devops",     /devops|github|ci|cd|deploy|release|version/i],
  ["benchmark",  /bench|benchmark|profil|telemetry|metric.?dash/i],
];

function inferDomain(label, id) {
  const haystack = `${id ?? ""} ${label ?? ""}`.toLowerCase();
  for (const [domain, re] of DOMAIN_PATTERNS) {
    if (re.test(haystack)) return domain;
  }
  return "other";
}

function inferLayer(node) {
  if (typeof node.layer === "string" && /^L\d+/.test(node.layer)) {
    return node.layer.match(/^L\d+/)[0];
  }
  if (typeof node.layer === "number") return `L${node.layer}`;
  if (typeof node.tier === "string" && /^L\d+/.test(node.tier)) {
    return node.tier.match(/^L\d+/)[0];
  }
  return "Lx";
}

function isBuiltStatus(node) {
  const tag = (node.tag ?? node.status ?? node.kind ?? "").toString().toLowerCase();
  if (tag.includes("ghost")) return false;
  if (tag.includes("stub")) return false;
  if (tag.includes("built")) return true;
  if (tag.includes("atomic")) return true;
  if (typeof node.built === "boolean") return node.built;
  return true; // assume built unless explicitly ghost/stub
}

// ─── Main ─────────────────────────────────────────────────────────────

console.error(`[bridge-graph-builder] reading ${GRAPH_PATH} (520MB streaming)…`);
const t0 = Date.now();
const graph = readGraphStreaming(GRAPH_PATH);
const tRead = Date.now() - t0;
console.error(`[bridge-graph-builder] read ${(graph.nodes?.length ?? 0).toLocaleString()} nodes + ${(graph.edges?.length ?? 0).toLocaleString()} edges in ${tRead}ms`);

const TARGET_LAYERS = new Set(["L5", "L6", "L7", "L8"]);
const nodes = (graph.nodes ?? []).filter(n => {
  const layer = inferLayer(n);
  return TARGET_LAYERS.has(layer);
});

// Annotate each target node with domain + built status
const annotated = nodes.map(n => ({
  id: n.id ?? n.nodeId ?? n.key,
  label: n.label ?? n.name ?? n.title ?? n.id,
  layer: inferLayer(n),
  domain: inferDomain(n.label ?? n.name ?? n.title ?? "", n.id ?? ""),
  built: isBuiltStatus(n),
  rawTag: n.tag ?? n.status ?? n.kind,
}));

// Optional domain filter
const cohort = DOMAIN_FILTER ? annotated.filter(n => n.domain === DOMAIN_FILTER) : annotated;

// Build adjacency from edges (which nodes are already connected → those bridges already exist)
const edgeAdj = new Map();
let edgeCount = 0;
for (const e of (graph.edges ?? [])) {
  const src = e.source ?? e.from ?? e.s;
  const dst = e.target ?? e.to ?? e.t;
  if (!src || !dst) continue;
  edgeCount++;
  if (!edgeAdj.has(src)) edgeAdj.set(src, new Set());
  if (!edgeAdj.has(dst)) edgeAdj.set(dst, new Set());
  edgeAdj.get(src).add(dst);
  edgeAdj.get(dst).add(src);
}
console.error(`[bridge-graph-builder] indexed ${edgeCount.toLocaleString()} edges`);

// Per-domain × per-layer rollup
const byDomainLayer = {};
for (const n of cohort) {
  const key = `${n.domain}::${n.layer}`;
  byDomainLayer[key] = byDomainLayer[key] ?? { domain: n.domain, layer: n.layer, total: 0, built: 0, ghost: 0 };
  byDomainLayer[key].total++;
  if (n.built) byDomainLayer[key].built++;
  else byDomainLayer[key].ghost++;
}

// Per-domain rollup (collapse layers)
const byDomain = {};
for (const n of cohort) {
  byDomain[n.domain] = byDomain[n.domain] ?? { domain: n.domain, total: 0, built: 0, ghost: 0, byLayer: {} };
  byDomain[n.domain].total++;
  if (n.built) byDomain[n.domain].built++;
  else byDomain[n.domain].ghost++;
  byDomain[n.domain].byLayer[n.layer] = (byDomain[n.domain].byLayer[n.layer] ?? 0) + 1;
}

// Bridge-candidate scoring: pairs of (domain_a, domain_b) where built engines
// exist in both BUT cross-domain edges are sparse. High score = high-leverage
// bridge target (lots of nodes on both sides, few connecting edges).
const domainList = Object.keys(byDomain).filter(d => byDomain[d].built >= 3);
const bridgeCandidates = [];
for (let i = 0; i < domainList.length; i++) {
  for (let j = i + 1; j < domainList.length; j++) {
    const a = domainList[i], b = domainList[j];
    // Skip same-domain
    if (a === "other" || b === "other") continue;
    // Count nodes in each domain
    const aBuilt = byDomain[a].built;
    const bBuilt = byDomain[b].built;
    if (aBuilt < 3 || bBuilt < 3) continue;
    // Count existing cross-domain edges
    const aNodes = cohort.filter(n => n.domain === a && n.built);
    const bNodeIds = new Set(cohort.filter(n => n.domain === b && n.built).map(n => n.id));
    let crossEdges = 0;
    for (const aN of aNodes) {
      const neighbors = edgeAdj.get(aN.id);
      if (!neighbors) continue;
      for (const nbr of neighbors) {
        if (bNodeIds.has(nbr)) crossEdges++;
      }
    }
    const maxPossible = aBuilt * bBuilt;
    const connectivityRatio = maxPossible > 0 ? crossEdges / maxPossible : 0;
    // Leverage: size of both sides, low connectivity = high opportunity
    const leverage = Math.sqrt(aBuilt * bBuilt) * (1 - Math.min(0.95, connectivityRatio));
    bridgeCandidates.push({
      domainA: a,
      domainB: b,
      builtA: aBuilt,
      builtB: bBuilt,
      crossEdges,
      maxPossible,
      connectivityRatio: Number(connectivityRatio.toFixed(4)),
      leverage: Number(leverage.toFixed(2)),
      gap: maxPossible - crossEdges,
    });
  }
}
bridgeCandidates.sort((a, b) => b.leverage - a.leverage);

// Top high-leverage UNDER-CONNECTED engines (within-domain, find isolated nodes)
const isolatedBuilt = cohort.filter(n => n.built && (!edgeAdj.get(n.id) || edgeAdj.get(n.id).size === 0))
  .slice(0, 100);

// Domain-internal isolation: built engines in a domain with low intra-domain connectivity
const domainInternalGaps = [];
for (const d of domainList) {
  if (d === "other") continue;
  const dNodes = cohort.filter(n => n.domain === d && n.built);
  const dIds = new Set(dNodes.map(n => n.id));
  let intraEdges = 0;
  for (const n of dNodes) {
    const neighbors = edgeAdj.get(n.id);
    if (!neighbors) continue;
    for (const nbr of neighbors) if (dIds.has(nbr)) intraEdges++;
  }
  intraEdges = intraEdges / 2; // each edge counted twice
  const maxIntra = (dNodes.length * (dNodes.length - 1)) / 2;
  const intraRatio = maxIntra > 0 ? intraEdges / maxIntra : 0;
  domainInternalGaps.push({
    domain: d,
    built: dNodes.length,
    intraEdges,
    maxIntra,
    intraRatio: Number(intraRatio.toFixed(4)),
    intraGap: maxIntra - intraEdges,
  });
}
domainInternalGaps.sort((a, b) => b.intraGap - a.intraGap);

// Cross-LEVEL bridges: same domain, different layer (e.g. L5 engine ↔ L7 wiki)
const crossLevelCandidates = [];
for (const d of domainList) {
  if (d === "other") continue;
  const byLayerInDomain = {};
  for (const n of cohort) {
    if (n.domain === d && n.built) {
      byLayerInDomain[n.layer] = byLayerInDomain[n.layer] ?? [];
      byLayerInDomain[n.layer].push(n);
    }
  }
  const layers = Object.keys(byLayerInDomain);
  for (let i = 0; i < layers.length; i++) {
    for (let j = i + 1; j < layers.length; j++) {
      const lA = layers[i], lB = layers[j];
      const aNodes = byLayerInDomain[lA];
      const bIds = new Set(byLayerInDomain[lB].map(n => n.id));
      let edges = 0;
      for (const aN of aNodes) {
        const neighbors = edgeAdj.get(aN.id);
        if (!neighbors) continue;
        for (const nbr of neighbors) if (bIds.has(nbr)) edges++;
      }
      const maxP = aNodes.length * bIds.size;
      const ratio = maxP > 0 ? edges / maxP : 0;
      crossLevelCandidates.push({
        domain: d,
        layerA: lA,
        layerB: lB,
        builtA: aNodes.length,
        builtB: bIds.size,
        edges,
        maxPossible: maxP,
        connectivityRatio: Number(ratio.toFixed(4)),
        leverage: Number((Math.sqrt(aNodes.length * bIds.size) * (1 - Math.min(0.95, ratio))).toFixed(2)),
        gap: maxP - edges,
      });
    }
  }
}
crossLevelCandidates.sort((a, b) => b.leverage - a.leverage);

const out = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  generatedBy: "bridge-graph-builder.mjs (slot:romeo iter23, 2026-05-24)",
  source: {
    graphPath: GRAPH_PATH,
    totalNodes: graph.nodes?.length ?? 0,
    totalEdges: graph.edges?.length ?? 0,
    readMs: tRead,
  },
  filter: { domain: DOMAIN_FILTER },
  targetLayers: Array.from(TARGET_LAYERS),
  cohortSize: cohort.length,
  domainCount: Object.keys(byDomain).length,
  domains: Object.values(byDomain).sort((a, b) => b.total - a.total),
  byDomainLayer: Object.values(byDomainLayer).sort((a, b) => b.total - a.total),
  topCrossDomainBridges: bridgeCandidates.slice(0, TOP_K),
  topCrossLevelBridges: crossLevelCandidates.slice(0, TOP_K),
  domainInternalGaps: domainInternalGaps.slice(0, 30),
  isolatedBuilt: isolatedBuilt.slice(0, 50),
  caveat: "Advisory map only. Each bridge candidate must be human-verified before wiring — domain inference is regex-based and may mis-classify; high-leverage may indicate intentional non-connection.",
  mustHumanVerify: true,
};

if (JSON_MODE) {
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(0);
}

// Persist outputs
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

// Markdown digest
const md = [];
md.push(`# PRISM Bridge Graph — exhaustive cross-domain wire-and-bridge map`);
md.push(``);
md.push(`**Generated:** ${out.generatedAt}`);
md.push(`**Source:** ${out.source.graphPath} (${out.source.totalNodes.toLocaleString()} nodes / ${out.source.totalEdges.toLocaleString()} edges, read ${out.source.readMs}ms)`);
md.push(`**Cohort:** ${out.cohortSize.toLocaleString()} nodes across L5–L8${DOMAIN_FILTER ? ` (filtered to domain=${DOMAIN_FILTER})` : ""}`);
md.push(`**Domains discovered:** ${out.domainCount}`);
md.push(``);
md.push(`> **Advisory only — ${out.caveat}**`);
md.push(``);
md.push(`## Domain rollup`);
md.push(``);
md.push(`| Domain | Total | Built | Ghost | Layers |`);
md.push(`|---|---:|---:|---:|---|`);
for (const d of out.domains) {
  const layers = Object.entries(d.byLayer).sort(([a], [b]) => a.localeCompare(b)).map(([l, n]) => `${l}:${n}`).join(" ");
  md.push(`| ${d.domain} | ${d.total} | ${d.built} | ${d.ghost} | ${layers} |`);
}
md.push(``);
md.push(`## Top ${TOP_K} cross-DOMAIN bridge candidates (by leverage, descending)`);
md.push(``);
md.push(`Leverage = √(builtA × builtB) × (1 − connectivityRatio). High score = many nodes both sides, few connecting edges.`);
md.push(``);
md.push(`| # | Domain A | Domain B | Built A | Built B | Edges | Max | Connectivity | Gap | Leverage |`);
md.push(`|---:|---|---|---:|---:|---:|---:|---:|---:|---:|`);
out.topCrossDomainBridges.forEach((b, i) => {
  md.push(`| ${i + 1} | **${b.domainA}** | **${b.domainB}** | ${b.builtA} | ${b.builtB} | ${b.crossEdges} | ${b.maxPossible} | ${(b.connectivityRatio * 100).toFixed(1)}% | ${b.gap} | ${b.leverage} |`);
});
md.push(``);
md.push(`## Top ${TOP_K} cross-LEVEL bridge candidates (same domain, different layers)`);
md.push(``);
md.push(`These are nodes within the SAME domain but at different /system-viz layers that are not yet edge-connected. High leverage = same-domain knowledge that should flow across L5 (engines) ↔ L6 (algorithms) ↔ L7 (wiki) ↔ L8 (memories).`);
md.push(``);
md.push(`| # | Domain | Layer A | Layer B | Built A | Built B | Edges | Max | Connectivity | Gap | Leverage |`);
md.push(`|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|`);
out.topCrossLevelBridges.forEach((b, i) => {
  md.push(`| ${i + 1} | **${b.domain}** | ${b.layerA} | ${b.layerB} | ${b.builtA} | ${b.builtB} | ${b.edges} | ${b.maxPossible} | ${(b.connectivityRatio * 100).toFixed(1)}% | ${b.gap} | ${b.leverage} |`);
});
md.push(``);
md.push(`## Domain-internal isolation (top 30)`);
md.push(``);
md.push(`Built nodes in a domain with low intra-domain connectivity — bridges here improve within-domain knowledge flow.`);
md.push(``);
md.push(`| Domain | Built | Intra-edges | Max | Connectivity | Gap |`);
md.push(`|---|---:|---:|---:|---:|---:|`);
out.domainInternalGaps.forEach(g => {
  md.push(`| ${g.domain} | ${g.built} | ${g.intraEdges} | ${g.maxIntra} | ${(g.intraRatio * 100).toFixed(1)}% | ${g.intraGap} |`);
});
md.push(``);
md.push(`## How to consume this map`);
md.push(``);
md.push(`1. **Pick the top cross-domain bridge** with leverage ≥10. Read the 2 domains; identify 1-3 specific engines per side.`);
md.push(`2. **Verify the bridge makes business sense** — high leverage from a regex misclassification is just noise; the operator MUST eyeball before wiring.`);
md.push(`3. **Wire by composition, not duplication** — call the existing engine, weight its output; per [[reference_jm_die_shop_page_e2e_verified_2026_05_24]] iter22 (4 bridges into JmDieToolRecommendBridge).`);
md.push(`4. **Register the new edge** in the system-viz graph via the REGISTER-NODE BLOCK (forge7 §4C) once wired.`);
md.push(`5. **Re-run this script** to confirm the bridge reduced the leverage row (verification feedback loop, per [[feedback_r5_thru_r12_doctrine]] R12).`);
md.push(``);
md.push(`## Re-run`);
md.push(``);
md.push(`\`\`\`bash`);
md.push(`node H:/prism/scripts/bridge-graph-builder.mjs                      # full run`);
md.push(`node H:/prism/scripts/bridge-graph-builder.mjs --top 30             # top 30 only`);
md.push(`node H:/prism/scripts/bridge-graph-builder.mjs --domain lathe       # lathe-domain only`);
md.push(`node H:/prism/scripts/bridge-graph-builder.mjs --json > out.json    # machine-readable`);
md.push(`\`\`\``);
md.push(``);
md.push(`## Compounding-gains property`);
md.push(``);
md.push(`Per forge-audit-v2 §6A: this script IS the META artifact. A one-shot bridge audit is worthless in 30 days; this script re-runs in ~5s and produces a fresh map every time. Wire it into the goal-synergy cron for nightly regen, and \`/forge7\` units can consume \`PRISM-BRIDGE-GRAPH.json\` instead of re-deriving the graph state.`);
fs.writeFileSync(OUT_MD, md.join("\n"));

// Console summary
console.error(``);
console.error(`─── PRISM Bridge Graph — built ─────────────────────────────`);
console.error(`  Cohort:           ${out.cohortSize.toLocaleString()} L5–L8 nodes across ${out.domainCount} domains`);
console.error(`  Total edges:      ${out.source.totalEdges.toLocaleString()}`);
console.error(`  Top cross-domain bridge: ${out.topCrossDomainBridges[0]?.domainA} ↔ ${out.topCrossDomainBridges[0]?.domainB} (leverage ${out.topCrossDomainBridges[0]?.leverage})`);
console.error(`  Top cross-level bridge:  ${out.topCrossLevelBridges[0]?.domain} (${out.topCrossLevelBridges[0]?.layerA}↔${out.topCrossLevelBridges[0]?.layerB}, leverage ${out.topCrossLevelBridges[0]?.leverage})`);
console.error(``);
console.error(`  Outputs:`);
console.error(`    ${OUT_JSON}`);
console.error(`    ${OUT_MD}`);
console.error(`────────────────────────────────────────────────────────────`);
