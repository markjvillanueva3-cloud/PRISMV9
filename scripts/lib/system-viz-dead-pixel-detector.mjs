// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G4: dead-pixel detector.
// Pure analyzer: finds edges referencing absent node ids — referenced-but-missing assets.
// Pure: no filesystem touch.

/**
 * Detect dead-pixel edges in a system-graph.
 *
 * Inputs:
 *   { nodes: Array<{id}>, edges: Array<{from|source, to|target, ...}> }
 *
 * Outputs:
 *   {
 *     nodeCount, edgeCount, deadEdgeCount,
 *     deadPixels: [{from, to, missingSide, layer}],
 *     orphanTargets: [{id, inboundCount, sources[]}]   // top-N missing nodes by inbound refs
 *     deadEdgesBySourceLayer: {[layer]: count},
 *     missingByPrefix: {[prefix]: count}
 *   }
 *
 * Edge field tolerance:
 *   - { from, to }        — preferred shape (system-graph format)
 *   - { source, target }  — common alt
 *   - other shapes are skipped silently and counted in `skippedEdges`
 *
 * @param {{nodes?: Array, edges?: Array}} graph
 * @param {object} [opts]
 * @param {number} [opts.topOrphans=50]
 * @returns {object}
 */
/**
 * Edge types that INTENTIONALLY point at a target that may not exist yet — a
 * dead edge of one of these types is advisory "gap-surfacing", NOT an integrity
 * defect. (U-VIZ-G4-DEAD-EDGE-CLASSIFY, 2026-05-31 sierra: ~most of the residual
 * dead edges after the G4 canon fix are pdf-course-bridge knowledge bridges to
 * not-yet-built engines — the bridge's own docstring says these surface the gap.)
 * Any OTHER edge type with a missing endpoint is a structural defect (a wire that
 * SHOULD connect two real nodes — contains/parent/child topology, etc.).
 */
export const ADVISORY_EDGE_TYPES = Object.freeze(new Set([
  "bridge-to-engine", "bridge-to-dispatcher", "enriches-engine",
  "feeds-training", "feeds-dispatcher", "ghost-wire", "proposed-wire", "proposed",
]));

/** Classify a dead edge's type → "advisory" (intentional gap-surfacing) or "defect". */
export function classifyDeadEdgeType(edgeType) {
  return ADVISORY_EDGE_TYPES.has(edgeType) ? "advisory" : "defect";
}

export function detectDeadPixels(graph, opts = {}) {
  const topOrphans = opts.topOrphans ?? 50;
  if (!graph || typeof graph !== "object" || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return {
      error: "invalid-graph",
      nodeCount: 0, edgeCount: 0, deadEdgeCount: 0,
      deadPixels: [], orphanTargets: [],
      deadEdgesBySourceLayer: {}, missingByPrefix: {},
      deadEdgesByType: {}, deadEdgesByClass: { advisory: 0, defect: 0 },
      skippedEdges: 0,
    };
  }

  const nodeIds = new Set();
  const nodeLayer = new Map();
  for (const n of graph.nodes) {
    if (!n || typeof n.id !== "string") continue;
    nodeIds.add(n.id);
    if (typeof n.layer === "string") nodeLayer.set(n.id, n.layer);
  }

  const deadPixels = [];
  const orphanCounts = new Map();         // missing-id → { count, sources:Set<string> }
  const deadBySourceLayer = Object.create(null);
  const missingByPrefix = Object.create(null);
  const deadEdgesByType = Object.create(null);
  const deadEdgesByClass = { advisory: 0, defect: 0 };
  let skippedEdges = 0;
  let deadEdgeCount = 0;

  for (const e of graph.edges) {
    if (!e || typeof e !== "object") { skippedEdges++; continue; }
    const from = typeof e.from === "string" ? e.from
      : typeof e.source === "string" ? e.source : null;
    const to = typeof e.to === "string" ? e.to
      : typeof e.target === "string" ? e.target : null;
    if (!from || !to) { skippedEdges++; continue; }

    const fromMissing = !nodeIds.has(from);
    const toMissing = !nodeIds.has(to);
    if (!fromMissing && !toMissing) continue;
    deadEdgeCount++;

    // Classify by edge type: advisory gap-surfacing bridge vs structural defect.
    const etype = typeof e.type === "string" ? e.type
      : typeof e.kind === "string" ? e.kind : "(untyped)";
    deadEdgesByType[etype] = (deadEdgesByType[etype] || 0) + 1;
    deadEdgesByClass[classifyDeadEdgeType(etype)]++;

    const missingSide = fromMissing && toMissing ? "both"
      : fromMissing ? "from" : "to";

    const sourceLayer = nodeLayer.get(from) || "?";
    deadBySourceLayer[sourceLayer] = (deadBySourceLayer[sourceLayer] || 0) + 1;

    // Only collect the FIRST N concrete dead edges to keep the report bounded;
    // counts (orphanCounts / deadBySourceLayer / missingByPrefix) accumulate fully.
    if (deadPixels.length < (opts.maxDeadPixelExamples ?? 500)) {
      deadPixels.push({ from, to, missingSide, layer: sourceLayer });
    }

    if (toMissing) {
      const existing = orphanCounts.get(to);
      if (existing) {
        existing.count++;
        existing.sources.add(from);
      } else {
        orphanCounts.set(to, { count: 1, sources: new Set([from]) });
      }
      const dotIdx = to.indexOf(".");
      const prefix = dotIdx === -1 ? to : to.slice(0, dotIdx);
      if (prefix) missingByPrefix[prefix] = (missingByPrefix[prefix] || 0) + 1;
    }
    if (fromMissing && !toMissing) {
      // Less common but still worth surfacing — a node that's referenced as a
      // SOURCE but doesn't exist (e.g., generator emitted edge but skipped node).
      const existing = orphanCounts.get(from);
      if (existing) {
        existing.count++;
        existing.sources.add(to);
      } else {
        orphanCounts.set(from, { count: 1, sources: new Set([to]) });
      }
      const dotIdx = from.indexOf(".");
      const prefix = dotIdx === -1 ? from : from.slice(0, dotIdx);
      if (prefix) missingByPrefix[prefix] = (missingByPrefix[prefix] || 0) + 1;
    }
  }

  const orphanTargets = [...orphanCounts.entries()]
    .map(([id, v]) => ({
      id,
      inboundCount: v.count,
      sources: [...v.sources].slice(0, 5),
    }))
    .sort((a, b) => b.inboundCount - a.inboundCount || a.id.localeCompare(b.id))
    .slice(0, topOrphans);

  return {
    nodeCount: nodeIds.size,
    edgeCount: graph.edges.length,
    deadEdgeCount,
    deadPixels,
    orphanTargets,
    deadEdgesBySourceLayer: deadBySourceLayer,
    missingByPrefix,
    deadEdgesByType,
    deadEdgesByClass,
    skippedEdges,
  };
}

/**
 * Render a dead-pixel report as markdown.
 *
 * @param {object} report  — output of detectDeadPixels
 * @returns {string}
 */
export function renderDeadPixelMarkdown(report) {
  const out = [];
  const ts = new Date().toISOString();
  out.push(`# system-viz dead-pixel sweep — ${ts}`);
  out.push("");
  if (report.error) {
    out.push(`ERROR: ${report.error}`);
    return out.join("\n") + "\n";
  }
  out.push(`Nodes: ${report.nodeCount}`);
  out.push(`Edges: ${report.edgeCount}`);
  out.push(`Dead edges: ${report.deadEdgeCount} (${pct(report.deadEdgeCount, report.edgeCount)})`);
  const cls = report.deadEdgesByClass || { advisory: 0, defect: 0 };
  out.push(`  ├─ advisory (intentional gap-surfacing bridges to not-yet-built nodes): ${cls.advisory}`);
  out.push(`  └─ DEFECT (structural edges that should connect real nodes): ${cls.defect}  ← triage these`);
  out.push(`Skipped (malformed) edges: ${report.skippedEdges}`);
  out.push("");

  const typeEntries = Object.entries(report.deadEdgesByType || {}).sort((a, b) => b[1] - a[1]);
  if (typeEntries.length) {
    out.push(`## Dead-edge count by edge type (advisory vs defect)`);
    for (const [t, c] of typeEntries) {
      out.push(`  ${String(c).padStart(6)}  ${t}  [${classifyDeadEdgeType(t)}]`);
    }
    out.push("");
  }

  out.push(`## Top ${report.orphanTargets.length} orphan targets (referenced-but-missing, ranked by inbound count)`);
  if (report.orphanTargets.length === 0) {
    out.push(`  (none — every referenced id exists)`);
  } else {
    for (const o of report.orphanTargets) {
      out.push(`  ${String(o.inboundCount).padStart(6)}  ${o.id}`);
      if (o.sources.length) out.push(`         e.g. from: ${o.sources.slice(0, 3).join(", ")}`);
    }
  }
  out.push("");

  out.push(`## Dead-edge count by source-node layer`);
  const layerEntries = Object.entries(report.deadEdgesBySourceLayer).sort((a, b) => b[1] - a[1]);
  if (layerEntries.length === 0) out.push(`  (none)`);
  for (const [layer, count] of layerEntries) {
    out.push(`  ${String(count).padStart(6)}  layer=${layer}`);
  }
  out.push("");

  out.push(`## Missing ids by prefix (= which generator leaks)`);
  const prefixEntries = Object.entries(report.missingByPrefix).sort((a, b) => b[1] - a[1]).slice(0, 30);
  if (prefixEntries.length === 0) out.push(`  (none)`);
  for (const [prefix, count] of prefixEntries) {
    out.push(`  ${String(count).padStart(6)}  ${prefix}`);
  }
  return out.join("\n") + "\n";
}

function pct(num, denom) {
  if (!denom) return "0.0%";
  return ((num / denom) * 100).toFixed(2) + "%";
}
