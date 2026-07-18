#!/usr/bin/env node
/**
 * system-viz-ghost-report.mjs
 *
 * Read-only operator lens for the L13 ghost layer of system-graph.json.
 * Companion to scripts/seed-ghost-nodes.mjs (which writes the ghosts).
 *
 * Usage:
 *   node scripts/system-viz-ghost-report.mjs                       # default: human-readable top-15 by ROI
 *   node scripts/system-viz-ghost-report.mjs --json                # machine-readable
 *   node scripts/system-viz-ghost-report.mjs --kind ghost.engine   # filter by kind
 *   node scripts/system-viz-ghost-report.mjs --subgroup wiring     # filter by subgroup
 *   node scripts/system-viz-ghost-report.mjs --min-roi 0.85        # threshold filter
 *   node scripts/system-viz-ghost-report.mjs --unblocks <ms-id>    # what proposes to unblock <ms-id>
 *   node scripts/system-viz-ghost-report.mjs --by-domain           # group by subgroup, count + total effort
 *   node scripts/system-viz-ghost-report.mjs --build-plan          # ordered build sequence (topo-sort by ghost-wires)
 *
 * Safe to run during concurrent graph writers — read-only, single-shot parse.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");

// ── arg parsing ───────────────────────────────────────────────────────────────
const ARG = { kind: null, subgroup: null, minRoi: 0, unblocks: null, byDomain: false, buildPlan: false, json: false, limit: 15 };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--json") ARG.json = true;
  else if (a === "--by-domain") ARG.byDomain = true;
  else if (a === "--build-plan") ARG.buildPlan = true;
  else if (a === "--kind") ARG.kind = process.argv[++i];
  else if (a === "--subgroup") ARG.subgroup = process.argv[++i];
  else if (a === "--min-roi") ARG.minRoi = Number(process.argv[++i]);
  else if (a === "--unblocks") ARG.unblocks = process.argv[++i];
  else if (a === "--limit") ARG.limit = Number(process.argv[++i]);
  else if (a === "--help" || a === "-h") {
    console.error("usage: system-viz-ghost-report [--json] [--kind <k>] [--subgroup <s>] [--min-roi <0..1>] [--unblocks <id>] [--by-domain] [--build-plan] [--limit N]");
    process.exit(0);
  }
}

// ── load graph ────────────────────────────────────────────────────────────────
let G;
try { G = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8"))); }
catch (e) {
  console.error(`ERROR: cannot read ${GRAPH}\n  ${e.message}`);
  process.exit(2);
}

const ghostNodes = (G.nodes || []).filter((n) => n && (n.layer === "L13" || n.ghost === true));
const ghostEdges = (G.edges || []).filter((e) => e && e.type === "ghost-wire");
const seederMeta = (G.meta && G.meta.ghostSeeder) || null;

if (ghostNodes.length === 0) {
  const msg = "No L13 ghost nodes found in graph. Seed with: node scripts/seed-ghost-nodes.mjs --apply";
  if (ARG.json) console.log(JSON.stringify({ ok: true, ghosts: [], message: msg }));
  else console.error(msg);
  process.exit(0);
}

// ── filters ───────────────────────────────────────────────────────────────────
let filtered = ghostNodes.slice();
if (ARG.kind) filtered = filtered.filter((n) => n.kind === ARG.kind);
if (ARG.subgroup) filtered = filtered.filter((n) => n.subgroup === ARG.subgroup);
if (ARG.minRoi > 0) filtered = filtered.filter((n) => (n.roi_score ?? 0) >= ARG.minRoi);
if (ARG.unblocks) {
  const target = ARG.unblocks.startsWith("ghost.milestone.") ? ARG.unblocks : `ghost.milestone.${ARG.unblocks}`;
  filtered = filtered.filter((n) => Array.isArray(n.unblocks) && n.unblocks.some((u) => u === ARG.unblocks || `ghost.milestone.${u}` === target));
}

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtRoi(r) { const n = Number(r ?? 0); return (n * 100).toFixed(0) + "%"; }
function fmtHrs(h) { const n = Number(h ?? 0); return n + "h"; }
function pad(s, n) { s = String(s); return s.length >= n ? s : s + " ".repeat(n - s.length); }
function shortKind(k) { return (k || "").replace(/^ghost\./, ""); }

// ── modes ─────────────────────────────────────────────────────────────────────

if (ARG.byDomain) {
  const groups = {};
  for (const n of filtered) {
    const sg = n.subgroup || "unknown";
    if (!groups[sg]) groups[sg] = { subgroup: sg, count: 0, totalEffortHr: 0, avgRoi: 0, items: [] };
    groups[sg].count++;
    groups[sg].totalEffortHr += Number(n.effort_estimate_hr ?? 0);
    groups[sg].items.push({ id: n.id, label: n.label, roi: n.roi_score, hr: n.effort_estimate_hr, kind: shortKind(n.kind) });
  }
  for (const g of Object.values(groups)) g.avgRoi = g.items.reduce((a, b) => a + (b.roi ?? 0), 0) / g.count;
  const arr = Object.values(groups).sort((a, b) => b.avgRoi * b.count - a.avgRoi * a.count);
  if (ARG.json) { console.log(JSON.stringify({ ok: true, byDomain: arr, ghostCount: ghostNodes.length, wireCount: ghostEdges.length, seederMeta }, null, 2)); process.exit(0); }
  console.log(`Ghost Layer — by subgroup (filtered ${filtered.length}/${ghostNodes.length})\n`);
  console.log(pad("subgroup", 16) + pad("count", 7) + pad("avgROI", 9) + pad("totalHr", 9) + "kinds");
  console.log("-".repeat(70));
  for (const g of arr) {
    const kinds = [...new Set(g.items.map((i) => i.kind))].join(",");
    console.log(pad(g.subgroup, 16) + pad(String(g.count), 7) + pad(fmtRoi(g.avgRoi), 9) + pad(fmtHrs(g.totalEffortHr), 9) + kinds);
  }
  process.exit(0);
}

if (ARG.buildPlan) {
  // Topo-sort: components that unblock milestones must build first.
  // For ghost-wires of relation="unblocks", the FROM node is a prerequisite of TO.
  // For relation="composes", the FROM (pipeline) depends on TO (components).
  const deps = new Map(); // node -> Set of nodes it depends on
  for (const n of ghostNodes) deps.set(n.id, new Set());
  for (const e of ghostEdges) {
    if (e.relation === "unblocks") {
      // FROM is a prerequisite of TO  →  TO depends on FROM
      if (deps.has(e.to)) deps.get(e.to).add(e.from);
    } else if (e.relation === "composes") {
      // FROM (pipeline) depends on TO (components)
      if (deps.has(e.from)) deps.get(e.from).add(e.to);
    }
  }
  // Kahn's algorithm
  const indeg = new Map(); for (const n of ghostNodes) indeg.set(n.id, deps.get(n.id).size);
  const order = [];
  const ready = ghostNodes.filter((n) => indeg.get(n.id) === 0).sort((a, b) => (b.roi_score ?? 0) - (a.roi_score ?? 0)).map((n) => n.id);
  while (ready.length) {
    const id = ready.shift();
    order.push(id);
    for (const [m, dset] of deps.entries()) {
      if (dset.has(id)) { dset.delete(id); indeg.set(m, dset.size); if (dset.size === 0) {
        // insert in ROI-sorted order
        const node = ghostNodes.find((x) => x.id === m);
        let i = 0; while (i < ready.length) { const r = ghostNodes.find((x) => x.id === ready[i]); if ((r.roi_score ?? 0) >= (node.roi_score ?? 0)) i++; else break; }
        ready.splice(i, 0, m);
      } }
    }
  }
  // Cycle-stranded
  const stranded = ghostNodes.filter((n) => !order.includes(n.id));
  const detailed = order.map((id, i) => { const n = ghostNodes.find((x) => x.id === id); return { rank: i + 1, id, label: n.label, kind: shortKind(n.kind), roi: n.roi_score, hr: n.effort_estimate_hr }; });
  if (ARG.json) { console.log(JSON.stringify({ ok: true, buildPlan: detailed, stranded: stranded.map((n) => n.id), seederMeta }, null, 2)); process.exit(0); }
  console.log(`Ghost Build Plan — topo-sort (${detailed.length} sequenced, ${stranded.length} cycle-stranded)\n`);
  console.log(pad("rank", 6) + pad("kind", 12) + pad("ROI", 7) + pad("hr", 5) + "label");
  console.log("-".repeat(80));
  for (const d of detailed.slice(0, Math.max(ARG.limit, 25))) {
    console.log(pad("#" + d.rank, 6) + pad(d.kind, 12) + pad(fmtRoi(d.roi), 7) + pad(fmtHrs(d.hr), 5) + d.label);
  }
  if (stranded.length) console.log(`\n  cycle-stranded: ${stranded.map((n) => n.id).join(", ")}`);
  process.exit(0);
}

// ── DEFAULT: ROI-ranked list ──────────────────────────────────────────────────
const sorted = filtered.slice().sort((a, b) => (b.roi_score ?? 0) - (a.roi_score ?? 0));
const top = sorted.slice(0, ARG.limit);

if (ARG.json) {
  console.log(JSON.stringify({
    ok: true,
    seederMeta,
    ghostCount: ghostNodes.length,
    wireCount: ghostEdges.length,
    filteredCount: filtered.length,
    shown: top.length,
    ghosts: top.map((n) => ({
      id: n.id, label: n.label, kind: n.kind, subgroup: n.subgroup,
      roi: n.roi_score, hr: n.effort_estimate_hr, unblocks: n.unblocks || [],
      rationale: n.info,
    })),
  }, null, 2));
  process.exit(0);
}

// human-readable
const summary = seederMeta ? `seeded ${seederMeta.seededAt} by ${seederMeta.seededBy}` : "(no seederMeta)";
console.log(`L13 Ghost Layer — top ${top.length} by ROI (filtered ${filtered.length}/${ghostNodes.length} · ${ghostEdges.length} wires)`);
console.log(`  ${summary}`);
console.log("");
console.log(pad("rank", 6) + pad("kind", 12) + pad("ROI", 6) + pad("hr", 5) + pad("subgroup", 12) + "label");
console.log("-".repeat(90));
top.forEach((n, i) => {
  console.log(pad("#" + (i + 1), 6) + pad(shortKind(n.kind), 12) + pad(fmtRoi(n.roi_score), 6) + pad(fmtHrs(n.effort_estimate_hr), 5) + pad(n.subgroup || "—", 12) + n.label);
});

// Show top-1 in detail
if (top.length) {
  const t = top[0];
  console.log("\n──── top-ROI detail ────");
  console.log(`  id:        ${t.id}`);
  console.log(`  label:     ${t.label}`);
  console.log(`  kind:      ${t.kind}`);
  console.log(`  ROI:       ${fmtRoi(t.roi_score)}    effort: ${fmtHrs(t.effort_estimate_hr)}`);
  console.log(`  unblocks:  ${(t.unblocks || []).join(", ") || "(none)"}`);
  console.log(`  rationale: ${t.info}`);
}
console.log("\n  flags: --by-domain | --build-plan | --kind ghost.X | --subgroup X | --min-roi 0.85 | --unblocks MS-ID | --json");
