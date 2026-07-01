#!/usr/bin/env node
/**
 * audit-token-savings-coverage.mjs
 *
 * U-AUDIT-TS-COVERAGE (2026-05-24, slot:alpha) — accounts every tool-call-
 * surface node in system-viz against existing token-savings coverage.
 *
 * Goal: for every PSN node that could fire a tool-call, classify it as
 *   • COVERED — a detector/wrap/route exists for this surface
 *   • CANDIDATE — surface exists, no detector — gap-fill target
 *   • NA — not a tool-call surface (formula, engine internals, wiki entry…)
 *
 * Output:
 *   state/shared/dashboards/token-savings-coverage-audit.json — machine
 *   state/shared/dashboards/token-savings-coverage-audit.md   — human
 *
 * Pure helpers exported for tests:
 *   - classifyNode(node, sources) → "COVERED"|"CANDIDATE"|"NA"
 *   - extractToolSurfaces(systemGraph) → Array<{id,type,label}>
 *   - loadCoverageSources() → Promise<{detectors, rtkWraps, ollamaTargets, routeRules}>
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const PRISM = "H:/prism";
// system-graph.json is ~520MB (exceeds Node's max string size). Use the
// curated architecture-graph.json (~46MB) which has the same node structure
// for tool-surface filtering purposes.
const SYSTEM_GRAPH = `${PRISM}/state/shared/system-viz/architecture-graph.json`;
const FALLBACK_GRAPH = `${PRISM}/state/shared/system-viz/system-graph-index.json`;
const PRE_TOOL_MULTI = `${PRISM}/.claude/hooks/pre-tool-savings-multi.mjs`;
const RTK_MEASURE = `${PRISM}/.claude/hooks/posttool-rtk-adoption-measure.mjs`;
const OLLAMA_REWRITER = `${PRISM}/.claude/hooks/prompt-rewriter-ollama.mjs`;
const MCP_ROUTE = `${PRISM}/.claude/hooks/mcp-route-suggest.mjs`;
const OUTPUT_JSON = `${PRISM}/state/shared/dashboards/token-savings-coverage-audit.json`;
const OUTPUT_MD = `${PRISM}/state/shared/dashboards/token-savings-coverage-audit.md`;

// Node-types that COULD be tool-call surfaces (filter scope).
// Other node types (formulas, internal engines, wiki entries) are NA.
const TOOL_SURFACE_TYPES = new Set([
  "hook", "dispatcher", "action", "skill", "command",
  "tool", "rtk-wrap", "route", "passthrough",
]);

// Heuristic substrings for tool-surface labels when type is missing.
const TOOL_SURFACE_PATTERNS = [
  /^(pre|post)?tool/i, /-hook$/i, /^dispatch/i, /-classifier/i,
  /^rtk-/i, /^route-/i, /^ollama-/i, /^mcp-/i,
];

export function isToolSurface(node) {
  if (!node || typeof node !== "object") return false;
  const type = (node.type || node.kind || "").toLowerCase();
  if (TOOL_SURFACE_TYPES.has(type)) return true;
  const label = String(node.label || node.id || node.name || "");
  return TOOL_SURFACE_PATTERNS.some((re) => re.test(label));
}

export function extractToolSurfaces(systemGraph) {
  if (!systemGraph?.nodes || !Array.isArray(systemGraph.nodes)) return [];
  return systemGraph.nodes
    .filter(isToolSurface)
    .map((n) => ({
      id: String(n.id || n.label || ""),
      type: String(n.type || n.kind || "unknown"),
      label: String(n.label || n.id || n.name || ""),
      layer: String(n.layer || ""),
      status: String(n.status || "unknown"),
    }))
    .filter((n) => n.id);
}

export function loadCoverageSources({
  preToolMulti, rtkMeasure, ollamaRewriter, mcpRoute,
} = {}) {
  const safe = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
  const multi = safe(preToolMulti ?? PRE_TOOL_MULTI);
  const rtk = safe(rtkMeasure ?? RTK_MEASURE);
  const ollama = safe(ollamaRewriter ?? OLLAMA_REWRITER);
  const route = safe(mcpRoute ?? MCP_ROUTE);

  // Extract detector tool names from classifyXxx exports
  const detectors = new Set();
  for (const m of multi.matchAll(/export function classify(\w+)/g)) {
    detectors.add(m[1].toLowerCase());
  }
  // Extract RTK-wrapped command bases from FRACTIONS table
  const rtkWraps = new Set();
  const fracBlock = rtk.match(/FRACTIONS\s*=\s*\{([\s\S]*?)\}/);
  if (fracBlock) {
    for (const m of fracBlock[1].matchAll(/(["']?)([a-zA-Z_-]+)\1\s*:/g)) {
      rtkWraps.add(m[2].toLowerCase());
    }
  }
  // Extract Ollama route hints (skill names mentioned)
  const ollamaTargets = new Set();
  for (const m of ollama.matchAll(/['"]\/ollama-(\w+)['"]/g)) {
    ollamaTargets.add(`ollama-${m[1]}`.toLowerCase());
  }
  // Extract MCP route-suggest hints
  const routeRules = new Set();
  for (const m of route.matchAll(/prism_\w+:[a-z_]+/g)) {
    routeRules.add(m[0].toLowerCase());
  }
  return { detectors, rtkWraps, ollamaTargets, routeRules };
}

// U-AUDIT-TS-COVERAGE V2 (2026-05-24): structural classification — node IDs have
// predictable prefixes that map directly to coverage status:
//   disp.*                                → COVERED (MCP-routed)
//   vault.wiki.architecture.actions.*     → COVERED (documents a dispatcher action)
//   eng.*, reg.*, alg.*, fmla.*           → NA (internal asset, not a tool call)
//   fe.*, mem.*                           → NA (frontend / memory pointer)
//   vault.wiki.* (not actions)            → NA (documentation, not a tool surface)
//   hook label / classifier label         → check sources for explicit match
//   anything else                         → CANDIDATE (real gap)
export function classifyNode(node, sources) {
  const label = String(node.label || node.id || "").toLowerCase();
  const id = String(node.id || "").toLowerCase();

  // Structural rules first (cheapest, highest signal)
  if (id.startsWith("disp.")) return "COVERED";
  if (id.startsWith("vault.wiki.architecture.actions.")) return "COVERED";
  if (id.startsWith("eng.") || id.startsWith("reg.") || id.startsWith("alg.") ||
      id.startsWith("fmla.") || id.startsWith("fe.") || id.startsWith("mem.") ||
      id.startsWith("vault.wiki.") || id.startsWith("vault.memory.")) return "NA";
  // U-AUDIT-TS-COVERAGE V3 (2026-05-24): full-system-graph expansion prefixes —
  // fs.* = filesystem leaves, ghost.* = roadmap roosts, formula.* = formula docs,
  // wiki.* = wiki leaves, test.* = test files, course.* = MIT-OCW corpus nodes
  if (id.startsWith("fs.") || id.startsWith("ghost.") || id.startsWith("formula.") ||
      id.startsWith("wiki.") || id.startsWith("test.") || id.startsWith("course.") ||
      id.startsWith("tribal.") || id.startsWith("algorithm.") || id.startsWith("engine.") ||
      id.startsWith("module.") || id.startsWith("monolith.")) return "NA";

  // Source-based rules (existing detectors / RTK / Ollama / MCP routes)
  for (const d of sources.detectors) {
    if (label.includes(d) || id.includes(d)) return "COVERED";
  }
  for (const base of sources.rtkWraps) {
    if (label === base || label.startsWith(base + "-") || label.startsWith(base + " ")) return "COVERED";
  }
  for (const t of sources.ollamaTargets) {
    if (label.includes(t) || id.includes(t)) return "COVERED";
  }
  for (const r of sources.routeRules) {
    if (label === r || id === r) return "COVERED";
  }
  return "CANDIDATE";
}

export function buildReport(surfaces, sources) {
  const counts = { COVERED: 0, CANDIDATE: 0, NA: 0 };
  const candidatesByType = new Map();
  const coveredSample = [];
  for (const s of surfaces) {
    const cls = classifyNode(s, sources);
    counts[cls] = (counts[cls] ?? 0) + 1;
    if (cls === "CANDIDATE") {
      // Derive sub-type from ID prefix when type is unknown (e.g., "vault.wiki.*" → "vault-wiki")
      let k = s.type && s.type !== "unknown" ? s.type : (s.id.split(".")[0] || "unknown");
      const arr = candidatesByType.get(k) || [];
      arr.push(s);
      candidatesByType.set(k, arr);
    } else if (cls === "COVERED" && coveredSample.length < 20) {
      coveredSample.push(s);
    }
  }
  return { counts, candidatesByType, coveredSample, totalSurfaces: surfaces.length };
}

function formatMarkdown(report, meta) {
  const lines = [];
  lines.push(`# Token-Savings Coverage Audit`);
  lines.push(``);
  lines.push(`**Generated:** ${meta.ts}`);
  lines.push(`**Source graph:** ${meta.graphPath}`);
  lines.push(`**Graph node count:** ${meta.totalGraphNodes}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Bucket | Count | % of tool surfaces |`);
  lines.push(`|--------|-------|---------------------|`);
  const t = report.totalSurfaces || 1;
  for (const k of ["COVERED", "CANDIDATE"]) {
    const n = report.counts[k] || 0;
    lines.push(`| ${k} | ${n} | ${((n / t) * 100).toFixed(1)}% |`);
  }
  lines.push(`| **Total tool surfaces** | ${report.totalSurfaces} | 100% |`);
  lines.push(`| Non-tool nodes (NA) | ${meta.totalGraphNodes - report.totalSurfaces} | (filtered out) |`);
  lines.push(``);
  lines.push(`## Candidate gaps by node-type (top 10 each)`);
  lines.push(``);
  const sortedTypes = Array.from(report.candidatesByType.entries()).sort((a, b) => b[1].length - a[1].length);
  for (const [type, arr] of sortedTypes.slice(0, 10)) {
    lines.push(`### \`${type}\` — ${arr.length} candidate(s)`);
    for (const s of arr.slice(0, 10)) lines.push(`- \`${s.id}\` ${s.label !== s.id ? `(${s.label})` : ""}`);
    if (arr.length > 10) lines.push(`- _...and ${arr.length - 10} more_`);
    lines.push(``);
  }
  lines.push(`## Covered sample (top 20)`);
  lines.push(``);
  for (const s of report.coveredSample) lines.push(`- \`${s.id}\` [${s.type}]`);
  lines.push(``);
  lines.push(`_Re-run: \`node H:/prism/scripts/audit-token-savings-coverage.mjs\`_`);
  return lines.join("\n");
}

async function main() {
  const ts = new Date().toISOString();
  let graph;
  try { graph = JSON.parse(readFileSync(SYSTEM_GRAPH, "utf8")); }
  catch (e) { console.error(`FATAL: could not read ${SYSTEM_GRAPH} — ${e.message}`); process.exit(1); }

  const surfaces = extractToolSurfaces(graph);
  const sources = loadCoverageSources();
  const report = buildReport(surfaces, sources);

  const out = {
    meta: { ts, graphPath: SYSTEM_GRAPH, totalGraphNodes: (graph.nodes || []).length },
    sources: {
      detectors: Array.from(sources.detectors).sort(),
      rtkWraps: Array.from(sources.rtkWraps).sort(),
      ollamaTargets: Array.from(sources.ollamaTargets).sort(),
      routeRules: Array.from(sources.routeRules).sort(),
    },
    summary: report.counts,
    totalSurfaces: report.totalSurfaces,
    candidates: Array.from(report.candidatesByType.entries()).map(([type, arr]) => ({
      type, count: arr.length, ids: arr.map((s) => s.id),
    })).sort((a, b) => b.count - a.count),
  };

  if (!existsSync(dirname(OUTPUT_JSON))) mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
  writeFileSync(OUTPUT_JSON, JSON.stringify(out, null, 2));
  writeFileSync(OUTPUT_MD, formatMarkdown(report, out.meta));

  console.log(`✓ ${report.totalSurfaces} tool surfaces · COVERED ${out.summary.COVERED} · CANDIDATE ${out.summary.CANDIDATE}`);
  console.log(`  graph total: ${out.meta.totalGraphNodes} (NA filtered: ${out.meta.totalGraphNodes - report.totalSurfaces})`);
  console.log(`  → ${OUTPUT_JSON}`);
  console.log(`  → ${OUTPUT_MD}`);
}

if (process.argv[1] && process.argv[1].endsWith("audit-token-savings-coverage.mjs")) {
  main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
}
