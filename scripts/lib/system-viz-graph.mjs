/**
 * system-viz-graph — load-once lib for the system-viz graph.
 *
 * Extracted from scripts/system-viz-query.mjs so callers (batch tools,
 * hooks) can load the 324 MB graph ONCE and query it many times without
 * re-parsing per call.
 *
 * Exports:
 *   loadGraph()               — parse graph from disk, return raw object.
 *   findInGraph(G, q, opts)   — case-insensitive node search (same logic as
 *                               the `find` command in system-viz-query.mjs).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib/ → scripts/ → project root
const ROOT = path.resolve(__dirname, "..", "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");

/**
 * Load the system-viz graph from disk and return the parsed object.
 * Throws with a descriptive message if the file cannot be read.
 * Callers should call this once and reuse the returned object.
 */
export function loadGraph() {
  try {
    return JSON.parse(fs.readFileSync(GRAPH, "utf8"));
  } catch (e) {
    throw new Error(
      `Cannot read graph at ${GRAPH}.\n  ${e.message}\n  Run: node scripts/generate-system-viz.mjs`
    );
  }
}

/**
 * Search graph nodes for a query string.
 *
 * Matches against: label + id + info + subgroup (case-insensitive).
 * This is verbatim from the `find` command in system-viz-query.mjs.
 *
 * @param {object} G      - Parsed graph object (from loadGraph()).
 * @param {string} terms  - Query string (space-separated terms joined if array).
 * @param {object} opts
 * @param {number} opts.limit - Maximum hits to return (default 30, matching CLI default).
 * @returns {Array} Matching node objects.
 */
export function findInGraph(G, terms, { limit = 30 } = {}) {
  const q = (Array.isArray(terms) ? terms.join(" ") : terms).toLowerCase();
  return G.nodes
    .filter(n =>
      (n.label + " " + n.id + " " + (n.info ?? "") + " " + (n.subgroup ?? ""))
        .toLowerCase()
        .includes(q)
    )
    .slice(0, limit);
}
