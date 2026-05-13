#!/usr/bin/env node
// tier: T4
/**
 * sessionstart-critical-path.mjs — SessionStart hook
 *
 * Announces the current top critical-path units from the roadmap DAG
 * at session start so the operator knows which slips would blow up the
 * schedule TODAY. Time-budgeted to <=200ms per U-FORE-07 exit criteria.
 *
 * Runs a cheap subset of the graph computation inline (avoids importing
 * the TS engine — this hook has to start fast). If the index is missing
 * or malformed, emits nothing.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const TIME_BUDGET_MS = 200;
const TOP_K = 3;
const DEFAULT_WEIGHT = 3;
const INDEX_PATH = path.join(
  process.cwd(),
  "mcp-server",
  "data",
  "roadmap-index.json"
);

function readStdin() {
  try {
    const data = fs.readFileSync(0, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function loadMilestones() {
  if (!fs.existsSync(INDEX_PATH)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
    return Array.isArray(raw.milestones) ? raw.milestones : [];
  } catch {
    return [];
  }
}

function buildGraph(milestones) {
  const nodes = new Map();
  for (const m of milestones) {
    if (!m || typeof m.id !== "string") continue;
    if (m.status === "complete") continue;
    nodes.set(m.id, {
      id: m.id,
      title: m.title || m.id,
      weight: typeof m.sessions_p50 === "number" ? m.sessions_p50 : DEFAULT_WEIGHT,
      incoming: Array.isArray(m.dependencies) ? [...m.dependencies] : [],
      outgoing: Array.isArray(m.blocks) ? [...m.blocks] : [],
    });
  }
  for (const [aId, a] of nodes) {
    for (const bId of a.outgoing) {
      const b = nodes.get(bId);
      if (b && !b.incoming.includes(aId)) b.incoming.push(aId);
    }
  }
  for (const [, n] of nodes) {
    n.incoming = n.incoming.filter((i) => nodes.has(i));
    n.outgoing = n.outgoing.filter((o) => nodes.has(o));
  }
  return nodes;
}

function topoSort(nodes) {
  const indeg = new Map();
  for (const [id, n] of nodes) indeg.set(id, n.incoming.length);
  const q = [];
  for (const [id] of nodes) if (indeg.get(id) === 0) q.push(id);
  const order = [];
  while (q.length) {
    const id = q.shift();
    order.push(id);
    const n = nodes.get(id);
    for (const o of n.outgoing) {
      const next = indeg.get(o) - 1;
      indeg.set(o, next);
      if (next === 0) q.push(o);
    }
  }
  return order;
}

function computeTopK(nodes, k) {
  let order;
  try {
    order = topoSort(nodes);
  } catch {
    return [];
  }
  if (order.length !== nodes.size) return []; // cycle — skip announce
  const total = new Map();
  for (const id of order) {
    const n = nodes.get(id);
    let best = n.weight;
    for (const inId of n.incoming) {
      const w = (total.get(inId) || 0) + n.weight;
      if (w > best) best = w;
    }
    total.set(id, best);
  }
  const ranked = [...nodes.values()]
    .map((n) => ({ id: n.id, title: n.title, weight: total.get(n.id) || n.weight }))
    .sort((a, b) => b.weight - a.weight);
  return ranked.slice(0, k);
}

async function main() {
  const killer = setTimeout(() => {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }, TIME_BUDGET_MS);

  readStdin();
  const milestones = loadMilestones();
  clearTimeout(killer);
  if (milestones.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const nodes = buildGraph(milestones);
  const top = computeTopK(nodes, TOP_K);
  if (top.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const lines = [
    "📍 Critical path units (slips here cascade downstream):",
    ...top.map((t, i) => `  ${i + 1}. ${t.id} — ${t.title.slice(0, 60)} (${t.weight.toFixed(1)} sessions)`),
  ];
  console.log(
    JSON.stringify({
      continue: true,
      systemMessage: lines.join("\n"),
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
