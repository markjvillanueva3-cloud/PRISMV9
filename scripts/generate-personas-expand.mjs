#!/usr/bin/env node
/**
 * generate-personas-expand.mjs — add the personas the original 5 didn't
 * cover. Each persona becomes an L0 node and gets `uses` edges to the
 * frontend page clusters they actually consume.
 *
 * Original 5 (already in graph): operator, programmer, quoter, boss, admin.
 * Added here:
 *   - maintenance — fleet uptime, PMs, breakdowns, work orders
 *   - customer    — customer portal, RFQ, order status, files
 *   - vendor      — supplier portal, POs, ASN, invoices
 *   - owner       — shop-wide P&L, executive dashboards, capacity
 *   - oncall      — alerts, SPC excursions, controller alarms, safety
 *   - csr         — customer-service rep — order entry, status, RMA
 *   - foreman     — shop-floor lead — schedule, kanban, jobs
 *   - estimator   — quoting + cost analysis (overlaps quoter but distinct)
 *
 * Output: state/shared/system-viz/personas-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const PERSONAS = [
  { id: "p.maintenance", label: "Maintenance",  hue: "#f97316",
    info: "Keeps the 21 machines running. PMs, breakdowns, spindle health, coolant, filter changes.",
    consumes: ["fe.pages.shopfloor", "fe.pages.specialty", "fe.pages.analytics"],
    routes:  ["disp.machinedispatcher", "disp.fleetdispatcher"], },
  { id: "p.customer", label: "Customer",       hue: "#22c55e",
    info: "External buyer. Self-service quote, status, drawing upload, FAI delivery.",
    consumes: ["fe.pages.quoting", "fe.pages.specialty"],
    routes:  ["disp.businessdispatcher", "disp.intakedispatcher"], },
  { id: "p.vendor",   label: "Vendor",         hue: "#a855f7",
    info: "Supplier. ASN, POs, invoices, certifications, raw stock receipt.",
    consumes: ["fe.pages.erp", "fe.pages.specialty"],
    routes:  ["disp.businessdispatcher"], },
  { id: "p.owner",    label: "Owner",          hue: "#fbbf24",
    info: "Shop owner. P&L, capacity utilization, win-rate, runway, executive dashboards.",
    consumes: ["fe.pages.analytics", "fe.pages.erp", "fe.pages.shopfloor", "fe.pages.quality"],
    routes:  ["disp.businessdispatcher", "disp.intelligencedispatcher"], },
  { id: "p.oncall",   label: "On-Call",        hue: "#ef4444",
    info: "First responder for SPC excursions, controller alarms, S(x) safety triggers, fleet incidents.",
    consumes: ["fe.pages.quality", "fe.pages.shopfloor", "fe.pages.analytics"],
    routes:  ["disp.safetydispatcher", "disp.alarmdispatcher", "disp.qualitydispatcher"], },
  { id: "p.csr",      label: "CSR",            hue: "#06b6d4",
    info: "Customer-service rep. Order entry, change orders, status calls, RMAs, expedites.",
    consumes: ["fe.pages.quoting", "fe.pages.erp", "fe.pages.specialty"],
    routes:  ["disp.businessdispatcher", "disp.intakedispatcher"], },
  { id: "p.foreman",  label: "Foreman",        hue: "#10b981",
    info: "Shop-floor lead. Day-by-day schedule, kanban, job priority, machine swaps, operator coverage.",
    consumes: ["fe.pages.shopfloor", "fe.pages.cam", "fe.pages.quality"],
    routes:  ["disp.schedulingdispatcher", "disp.multi_opdispatcher", "disp.feasibilitydispatcher"], },
  { id: "p.estimator",label: "Estimator",      hue: "#fb923c",
    info: "Cost-engineer. Drives the deeper quote build — feasibility, cycle-time, tooling, fixturing, quoted margins.",
    consumes: ["fe.pages.quoting", "fe.pages.cam", "fe.pages.cad_calc", "fe.pages.erp"],
    routes:  ["disp.businessdispatcher", "disp.calcdispatcher", "disp.camdispatcher", "disp.feasibilitydispatcher"], },
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
    personasProposed: PERSONAS.length,
    personasEmitted: 0,
    consumeEdges: 0,
    routeEdges: 0,
    skippedExisting: 0,
    targetMissing: 0,
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  for (const p of PERSONAS) {
    if (existingIds.has(p.id) || seenId.has(p.id)) { stats.skippedExisting++; continue; }
    seenId.add(p.id);
    newNodes.push({
      id: p.id,
      layer: "L0",
      subgroup: "personas",
      label: p.label,
      info: p.info,
      color: p.hue,
      status: "built",
      size: 1.15,
      tier: 5,
    });
    stats.personasEmitted++;

    for (const target of p.consumes) {
      if (!existingIds.has(target)) { stats.targetMissing++; continue; }
      if (pushEdge(p.id, target, "uses", "active", 0.4)) stats.consumeEdges++;
    }
    for (const target of p.routes) {
      if (!existingIds.has(target)) { stats.targetMissing++; continue; }
      // Persona doesn't directly hit dispatcher (transport in between) —
      // emit a "demands" edge as a logical/intent edge for the viz.
      if (pushEdge(p.id, target, "demands", "active", 0.25)) stats.routeEdges++;
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
const outPath = path.join(VIZ_DIR, "personas-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  console.log(`  personas proposed:  ${result.stats.personasProposed}`);
  console.log(`  personas emitted:   ${result.stats.personasEmitted}`);
  console.log(`  consume edges:      ${result.stats.consumeEdges}`);
  console.log(`  route demand edges: ${result.stats.routeEdges}`);
  console.log(`  target missing:     ${result.stats.targetMissing}`);
}
