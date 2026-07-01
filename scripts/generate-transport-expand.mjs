#!/usr/bin/env node
/**
 * generate-transport-expand.mjs — add L2 transport surfaces that the base
 * graph didn't enumerate. The original L2 layer has 8 nodes (MCP, REST,
 * gRPC, GraphQL, WebSocket, Auth, Rate, Telemetry). Realistic PRISM has
 * additional transport surfaces — this generator emits them and wires
 * them to consumers/producers.
 *
 * Added nodes:
 *   tr.gateway   — API gateway / routing layer
 *   tr.queue     — background job queue (Redis-backed BullMQ-style)
 *   tr.pubsub    — event bus / streaming
 *   tr.embed     — embedding service (vector encoding)
 *   tr.vector    — vector search / similarity index
 *   tr.cache     — Redis cache layer
 *   tr.cdn       — static asset CDN
 *   tr.s3        — object store (artifacts, prove-outs, screenshots)
 *   tr.dnc       — DNC transfer to shop floor (CNC machines)
 *   tr.mtconnect — MTConnect agent (machine telemetry stream)
 *   tr.opcua     — OPC-UA bridge (PLC / SCADA)
 *   tr.mqtt      — MQTT broker (IoT sensors)
 *
 * Edges:
 *   - frontends (L1) -> gateway        (request)
 *   - gateway -> rest / mcp / ws        (route)
 *   - dispatchers (L4) -> queue/pubsub  (enqueue/publish)
 *   - dispatchers (L4) -> vector/embed  (semantic ops)
 *   - dispatchers (L4) -> cache         (memoize)
 *   - dispatchers (L4) -> dnc/mtconnect/opcua/mqtt (machine I/O)
 *
 * Output: state/shared/system-viz/transport-expand-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const TRANSPORTS = [
  { id: "tr.gateway", label: "API Gateway", hue: "#fbbf24",
    info: "Routes /api/* requests across REST, MCP, WS surfaces. Auth + rate + circuit-break.",
    size: 1.8, kind: "gateway",
    upstream: ["fe.web", "fe.cqask", "fe.cadquery", "fe.cli", "fe.dispatch"],
    downstream: ["tr.rest", "tr.mcp", "tr.ws", "tr.auth", "tr.rate"], },
  { id: "tr.queue", label: "Job Queue", hue: "#a78bfa",
    info: "Background job queue. BullMQ-style. Long-running pipelines (cycle-time sim, batch optimization).",
    size: 1.4, kind: "queue",
    downstream: [], dispatcherDemand: ["disp.orchestratedispatcher", "disp.autopilot_ddispatcher"], },
  { id: "tr.pubsub", label: "Event Bus", hue: "#ec4899",
    info: "Pub/sub stream. Telemetry, drift signals, alarm fan-out, learning events.",
    size: 1.4, kind: "pubsub",
    dispatcherDemand: ["disp.telemetrydispatcher", "disp.alarmdispatcher", "disp.knowledgedispatcher"], },
  { id: "tr.embed", label: "Embedding Service", hue: "#06b6d4",
    info: "Text/code embedding generator. Ollama or remote API. Backs vector search + RAG.",
    size: 1.2, kind: "embedding",
    dispatcherDemand: ["disp.aidispatcher", "disp.knowledgedispatcher", "disp.intelligencedispatcher"], },
  { id: "tr.vector", label: "Vector Search", hue: "#0ea5e9",
    info: "Vector similarity index. Tribal-tip retrieval, similar-jobs, RAG over wiki + memories.",
    size: 1.3, kind: "vector",
    dispatcherDemand: ["disp.knowledgedispatcher", "disp.memorydispatcher", "disp.aidispatcher"], },
  { id: "tr.cache", label: "Redis Cache", hue: "#f97316",
    info: "Memoization + session cache + tool/material lookup hot path.",
    size: 1.3, kind: "cache",
    dispatcherDemand: ["disp.datadispatcher", "disp.calcdispatcher", "disp.sessiondispatcher"], },
  { id: "tr.cdn", label: "Static CDN", hue: "#94a3b8",
    info: "Static frontend assets (JS bundles, fonts, images). Three.js + Vite bundles ship via CDN.",
    size: 1.0, kind: "cdn",
    upstream: ["fe.web", "fe.cqask", "fe.cadquery"], },
  { id: "tr.s3", label: "Object Store",  hue: "#64748b",
    info: "Artifacts: prove-out screenshots, CMM reports, blueprints, generated G-code, audit bundles.",
    size: 1.1, kind: "object_store",
    dispatcherDemand: ["disp.qualitydispatcher", "disp.intakedispatcher", "disp.busidispatcher"], },
  { id: "tr.dnc", label: "DNC Transfer", hue: "#22d3ee",
    info: "G-code DNC drop to shop-floor CNCs. Drip-feed + program comparison + dirty-flag.",
    size: 1.2, kind: "dnc",
    dispatcherDemand: ["disp.camdispatcher", "disp.mill_turn", "disp.turningdispatcher"], },
  { id: "tr.mtconnect", label: "MTConnect Agent", hue: "#84cc16",
    info: "Machine-tool telemetry stream per MTConnect 2.0. Spindle load, axis pos, alarms.",
    size: 1.2, kind: "mtconnect",
    dispatcherDemand: ["disp.machinelivedispatcher", "disp.adaptivecontroldispatcher", "disp.telemetrydispatcher"], },
  { id: "tr.opcua", label: "OPC-UA Bridge", hue: "#10b981",
    info: "PLC / SCADA integration. Read/write to controller variables across the fleet.",
    size: 1.2, kind: "opcua",
    dispatcherDemand: ["disp.machinesetupdispatcher", "disp.machinelivedispatcher"], },
  { id: "tr.mqtt", label: "MQTT Broker", hue: "#f59e0b",
    info: "IoT sensor bus — temperature, vibration, coolant, ambient. Cheap fan-in from sensors.",
    size: 1.1, kind: "mqtt",
    dispatcherDemand: ["disp.machinelivedispatcher", "disp.realtimedispatcher", "disp.telemetrydispatcher"], },
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
    transportsProposed: TRANSPORTS.length,
    transportsEmitted: 0,
    upstreamEdges: 0,
    downstreamEdges: 0,
    dispatcherDemandEdges: 0,
    targetMissing: 0,
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const t of TRANSPORTS) {
    if (existingIds.has(t.id) || seenId.has(t.id)) continue;
    seenId.add(t.id);
    newNodes.push({
      id: t.id,
      layer: "L2",
      subgroup: "transport",
      label: t.label,
      info: t.info,
      color: t.hue,
      status: "built",
      size: t.size,
      tier: 3,
      kind: t.kind,
    });
    stats.transportsEmitted++;
    for (const src of (t.upstream || [])) {
      if (!existingIds.has(src)) { stats.targetMissing++; continue; }
      if (pushEdge(src, t.id, "request", "active", 0.3)) stats.upstreamEdges++;
    }
    for (const dst of (t.downstream || [])) {
      if (!existingIds.has(dst)) { stats.targetMissing++; continue; }
      if (pushEdge(t.id, dst, "route", "active", 0.4)) stats.downstreamEdges++;
    }
    for (const disp of (t.dispatcherDemand || [])) {
      if (!existingIds.has(disp)) { stats.targetMissing++; continue; }
      // Dispatchers reach UP to transport infrastructure (e.g. enqueue / publish / fetch)
      if (pushEdge(disp, t.id, "uses_transport", "active", 0.25)) stats.dispatcherDemandEdges++;
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
const outPath = path.join(VIZ_DIR, "transport-expand-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  transports proposed: ${result.stats.transportsProposed}`);
  console.log(`  emitted:             ${result.stats.transportsEmitted}`);
  console.log(`  upstream edges:      ${result.stats.upstreamEdges}`);
  console.log(`  downstream edges:    ${result.stats.downstreamEdges}`);
  console.log(`  dispatcher demand:   ${result.stats.dispatcherDemandEdges}`);
  console.log(`  target missing:      ${result.stats.targetMissing}`);
}
