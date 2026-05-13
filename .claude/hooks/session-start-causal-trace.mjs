#!/usr/bin/env node
// tier: T4
/**
 * session-start-causal-trace.mjs — U-AI03 Causal Graph SessionStart Hook
 *
 * Builds a causal graph from REASONING_TRACE_LEDGER.jsonl on session start.
 * Extracts cause-effect relationships from recent reasoning chains.
 *
 * Target: <500ms trace for 10-node graph, ≥20 nodes after 3 sessions.
 */

import * as fs from "fs";
import * as path from "path";

const REASONING_LEDGER = "H:/prism/mcp-server/data/state/REASONING_TRACE_LEDGER.jsonl";
const CAUSAL_GRAPH_FILE = "H:/prism/mcp-server/data/state/CAUSAL_GRAPH.json";
const MAX_ENTRIES = 100;
const MAX_NODES = 20;

function loadReasoningEntries() {
  try {
    if (!fs.existsSync(REASONING_LEDGER)) return [];

    const content = fs.readFileSync(REASONING_LEDGER, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines.slice(-MAX_ENTRIES).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function extractCausalRelations(entries) {
  const relations = [];
  const nodeSet = new Set();

  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];

    // Extract action/dispatcher as nodes
    const prevNode = `${prev.dispatcher || "unknown"}:${prev.action || "unknown"}`;
    const currNode = `${curr.dispatcher || "unknown"}:${curr.action || "unknown"}`;

    nodeSet.add(prevNode);
    nodeSet.add(currNode);

    // Temporal causality: if A precedes B within 5 minutes, A may cause B
    const prevTime = new Date(prev.at || 0).getTime();
    const currTime = new Date(curr.at || 0).getTime();
    const timeDelta = currTime - prevTime;

    if (timeDelta > 0 && timeDelta < 5 * 60 * 1000) {
      relations.push({
        cause: prevNode,
        effect: currNode,
        strength: Math.max(0.1, 1 - timeDelta / (5 * 60 * 1000)),
        evidence: 1,
      });
    }

    // Keyword overlap strengthens causal link
    const prevKeywords = new Set(prev.keywords || []);
    const currKeywords = new Set(curr.keywords || []);
    const overlap = [...prevKeywords].filter((k) => currKeywords.has(k)).length;

    if (overlap > 0) {
      const existing = relations.find(
        (r) => r.cause === prevNode && r.effect === currNode
      );
      if (existing) {
        existing.strength = Math.min(1, existing.strength + overlap * 0.1);
        existing.evidence++;
      }
    }
  }

  return { relations, nodes: Array.from(nodeSet).slice(0, MAX_NODES) };
}

function buildCausalGraph(entries) {
  const { relations, nodes } = extractCausalRelations(entries);

  // Aggregate relations (multiple observations strengthen links)
  const aggregated = new Map();
  for (const rel of relations) {
    const key = `${rel.cause}→${rel.effect}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.strength = Math.min(1, existing.strength + rel.strength * 0.5);
      existing.evidence += rel.evidence;
    } else {
      aggregated.set(key, { ...rel });
    }
  }

  // Filter weak links
  const strongLinks = Array.from(aggregated.values())
    .filter((r) => r.strength > 0.2 || r.evidence > 2)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 30);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: strongLinks.length,
    nodes,
    edges: strongLinks.map((r) => ({
      from: r.cause,
      to: r.effect,
      weight: r.strength,
      observations: r.evidence,
    })),
    summary: generateSummary(nodes, strongLinks),
  };
}

function generateSummary(nodes, edges) {
  if (nodes.length === 0) return "No causal patterns detected yet.";

  // Find most influential nodes (most outgoing edges)
  const outDegree = new Map();
  for (const edge of edges) {
    outDegree.set(edge.from, (outDegree.get(edge.from) || 0) + 1);
  }

  const topCauses = Array.from(outDegree.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([node]) => node);

  // Find most affected nodes (most incoming edges)
  const inDegree = new Map();
  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  }

  const topEffects = Array.from(inDegree.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([node]) => node);

  const parts = [];
  if (topCauses.length > 0) {
    parts.push(`Key drivers: ${topCauses.join(", ")}`);
  }
  if (topEffects.length > 0) {
    parts.push(`Frequent outcomes: ${topEffects.join(", ")}`);
  }

  return parts.join(" | ") || "Building causal model...";
}

function saveCausalGraph(graph) {
  try {
    const dir = path.dirname(CAUSAL_GRAPH_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CAUSAL_GRAPH_FILE, JSON.stringify(graph, null, 2));
  } catch {
    // Ignore save errors
  }
}

async function main() {
  const startTime = Date.now();

  // Load reasoning entries
  const entries = loadReasoningEntries();

  // Build causal graph
  const graph = buildCausalGraph(entries);
  graph.buildTimeMs = Date.now() - startTime;

  // Save graph
  saveCausalGraph(graph);

  // Output summary for context injection (only if meaningful)
  if (graph.nodeCount >= 5 && graph.edgeCount >= 3) {
    console.log(JSON.stringify({
      systemMessage: `[CausalTrace] ${graph.summary} (${graph.nodeCount} nodes, ${graph.edgeCount} edges, ${graph.buildTimeMs}ms)`,
    }));
  }
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
