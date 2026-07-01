#!/usr/bin/env node
/**
 * generate-ai-tier-expand.mjs — saturate the L3 AI-tier layer with the
 * missing tier-1 / tier-2 / tier-3 surfaces that PRISM actually exercises
 * (Codex, Gemini, agentic-flow, claude-flow, ruv-swarm, octopus consensus,
 * additional T3 specialists, CAM bridge AIs, etc.).
 *
 * The base graph emits 13 AI tier nodes; this brings the count up to
 * ~30+ so the upper-cascade is dense enough to show the master ↔ specialist
 * routing.
 *
 * Output: state/shared/system-viz/ai-tier-expand-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const TIERS = [
  // ---- Tier 1 — peer master orchestrators (multi-CLI scrutiny consensus) ----
  { id: "ai.t1.codex",   label: "Tier-1: Codex",       hue: "#34d399", tier: 2, kind: "tier1_codex",
    info: "Peer T1 orchestrator from OpenAI Codex CLI. Multi-CLI scrutiny + consensus partner.",
    routes: ["disp.aidispatcher", "disp.intelligencedispatcher"], },
  { id: "ai.t1.gemini",  label: "Tier-1: Gemini",      hue: "#fbbf24", tier: 2, kind: "tier1_gemini",
    info: "Peer T1 orchestrator from Google Gemini CLI. Cross-vendor consensus check.",
    routes: ["disp.aidispatcher", "disp.intelligencedispatcher"], },
  { id: "ai.t1.octopus", label: "Tier-1: Octopus Consensus", hue: "#a855f7", tier: 2, kind: "tier1_consensus",
    info: "3-way Claude+Codex+Gemini consensus router. Cross-vendor verdict gate.",
    routes: ["disp.aidispatcher"], peers: ["ai.t1.claude", "ai.t1.codex", "ai.t1.gemini"], },

  // ---- Tier 2 — coordination layers ----
  { id: "ai.t2.agentic_flow",  label: "T2: agentic-flow",  hue: "#06b6d4", tier: 2, kind: "tier2_flow",
    info: "agentic-flow runtime — multi-agent orchestration + auto-routing across tier-3 specialists.",
    routes: ["disp.orchestratedispatcher", "disp.aidispatcher", "disp.autopilot_ddispatcher"], },
  { id: "ai.t2.claude_flow",   label: "T2: claude-flow",   hue: "#3b82f6", tier: 2, kind: "tier2_flow",
    info: "claude-flow — Claude-native multi-agent swarm with neural coordination.",
    routes: ["disp.orchestratedispatcher", "disp.aidispatcher"], },
  { id: "ai.t2.ruv_swarm",     label: "T2: ruv-swarm",     hue: "#ec4899", tier: 2, kind: "tier2_flow",
    info: "ruv-swarm — DAG-based swarm orchestration with topology optimization.",
    routes: ["disp.orchestratedispatcher", "disp.aidispatcher"], },
  { id: "ai.t2.smart_route",   label: "T2: smart-route",   hue: "#f97316", tier: 2, kind: "tier2_route",
    info: "Smart router — tier/effort/model selection based on task complexity classifier.",
    routes: ["disp.aidispatcher", "disp.contextdispatcher"], },

  // ---- Tier 3 — domain specialists missing from the base 7 ----
  { id: "ai.t3.cad_bridge",      label: "T3: CAD Bridge AI",  hue: "#22c55e", tier: 3, kind: "tier3_bridge",
    info: "CAD-system bridge specialist (Fusion 360 / SolidWorks / Inventor live-execute).",
    routes: ["disp.caddispatcher"], },
  { id: "ai.t3.cam_bridge",      label: "T3: CAM Bridge AI",  hue: "#10b981", tier: 3, kind: "tier3_bridge",
    info: "CAM-system bridge specialist (Mastercam / hyperMILL / SolidCAM / NX / Esprit live-execute).",
    routes: ["disp.camdispatcher"], },
  { id: "ai.t3.grinder",         label: "T3: Grinder AI",     hue: "#84cc16", tier: 3, kind: "tier3_specialist",
    info: "Grinding specialist — wheel selection, dressing, burn detection, surface integrity.",
    routes: ["disp.grindingdispatcher"], },
  { id: "ai.t3.welder",          label: "T3: Welder AI",      hue: "#fb923c", tier: 3, kind: "tier3_specialist",
    info: "Welding specialist — distortion, strength, MIG/TIG/EB parameters.",
    routes: ["disp.weldingdispatcher"], },
  { id: "ai.t3.sinker_edm",      label: "T3: Sinker EDM AI",  hue: "#f0abfc", tier: 3, kind: "tier3_specialist",
    info: "Sinker-EDM specialist — electrode design, flush, wear comp.",
    routes: ["disp.edmdispatcher"], },
  { id: "ai.t3.fixture",         label: "T3: Fixture AI",     hue: "#a78bfa", tier: 3, kind: "tier3_specialist",
    info: "Workholding + fixture-design specialist — clamp force, vacuum seal, moment balance.",
    routes: ["disp.feasibilitydispatcher", "disp.calcdispatcher"], },
  { id: "ai.t3.metrology",       label: "T3: Metrology AI",   hue: "#06b6d4", tier: 3, kind: "tier3_specialist",
    info: "CMM + in-process probing specialist — uncertainty budget, datum alignment, GD&T disposition.",
    routes: ["disp.qualitydispatcher"], },
  { id: "ai.t3.shop_floor",      label: "T3: Shop Floor AI",  hue: "#ef4444", tier: 3, kind: "tier3_specialist",
    info: "Shop-floor automation specialist — OEE, bottleneck, work instructions, shift handoff.",
    routes: ["disp.schedulingdispatcher", "disp.automationdispatcher"], },
  { id: "ai.t3.quoting",         label: "T3: Quoting AI",     hue: "#fb923c", tier: 3, kind: "tier3_specialist",
    info: "Quoting + estimation specialist — should-cost, instant-quote, lead-time, margin analysis.",
    routes: ["disp.businessdispatcher"], },
  { id: "ai.t3.compliance",      label: "T3: Compliance AI",  hue: "#facc15", tier: 3, kind: "tier3_specialist",
    info: "Compliance + legal specialist — NDA lifecycle, export control (ITAR/EAR), retention, OSHA.",
    routes: ["disp.compliancedispatcher"], },

  // ---- Ollama family additions ----
  { id: "ai.ollama.codestral",   label: "Ollama: codestral",  hue: "#06b6d4", tier: 3, kind: "ollama",
    info: "codestral — code-focused open LLM. Used for inline code-rewrite suggestions.",
    routes: ["disp.aidispatcher"], },
  { id: "ai.ollama.deepseek",    label: "Ollama: deepseek-coder", hue: "#3b82f6", tier: 3, kind: "ollama",
    info: "deepseek-coder — strong code generation. Backup for qwen2.5-coder.",
    routes: ["disp.aidispatcher"], },
  { id: "ai.ollama.mxbai_embed", label: "Ollama: mxbai-embed", hue: "#ec4899", tier: 3, kind: "ollama",
    info: "mxbai-embed-large — high-quality embeddings. Backs tr.embed + tr.vector.",
    routes: ["disp.aidispatcher"], },
];

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", newNodes: [], newEdges: [], stats: {} };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    tiersProposed: TIERS.length,
    tiersEmitted: 0,
    routeEdges: 0,
    peerEdges: 0,
    targetMissing: 0,
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const t of TIERS) {
    if (existingIds.has(t.id) || seenId.has(t.id)) continue;
    seenId.add(t.id);
    newNodes.push({
      id: t.id,
      layer: "L3",
      subgroup: t.kind,
      label: t.label,
      info: t.info,
      color: t.hue,
      status: "built",
      size: 1.2,
      tier: t.tier,
      kind: t.kind,
    });
    stats.tiersEmitted++;
    for (const r of (t.routes || [])) {
      if (!existingIds.has(r)) { stats.targetMissing++; continue; }
      if (pushEdge(t.id, r, "route", "active", 0.35)) stats.routeEdges++;
    }
    for (const p of (t.peers || [])) {
      if (!existingIds.has(p)) { stats.targetMissing++; continue; }
      if (pushEdge(t.id, p, "consensus_peer", "active", 0.25)) stats.peerEdges++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "ai-tier-expand-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  tiers proposed:    ${result.stats.tiersProposed}`);
  console.log(`  emitted:           ${result.stats.tiersEmitted}`);
  console.log(`  route edges:       ${result.stats.routeEdges}`);
  console.log(`  consensus peer edges: ${result.stats.peerEdges}`);
  console.log(`  target missing:    ${result.stats.targetMissing}`);
}
