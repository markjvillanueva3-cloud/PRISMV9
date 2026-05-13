// tier: T3
/**
 * cad-graph-integrity.mjs — CADCAM-DAGI-MS0/U-DAGI02 guard hook
 *
 * PostToolUse(Write|Edit) hook that checks edits to CAD graph artifacts
 * and persisted graph JSON payloads, blocking the write if:
 *
 *   1. CADKnowledgeGraphEngine edits remove a public method the dispatcher
 *      or tests depend on (build, detectCycles, findOrphans,
 *      ancestors, descendants, toJsonLd, fromJsonLd).
 *   2. A persisted graph JSON (./data/cad-graphs/*.json) contains a
 *      cycle — cycles are an abort-criterion for U-DAGI02.
 *   3. A persisted graph JSON contains dangling edges (from/to ids that
 *      don't resolve to a node).
 *
 * Non-matching files are ignored; the hook exits 0.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ENGINE_REL = "mcp-server/src/engines/CADKnowledgeGraphEngine.ts";
const GRAPH_DIR_REL = "mcp-server/data/cad-graphs";
const REQUIRED_METHODS = [
  "build(",
  "detectCycles(",
  "findOrphans(",
  "ancestors(",
  "descendants(",
  "toJsonLd(",
  "fromJsonLd(",
];

function log(level, msg) {
  const line = `[cad-graph-integrity] ${level}: ${msg}`;
  (level === "ERROR" ? process.stderr : process.stdout).write(line + "\n");
}

function checkEngineSurface(abs) {
  let src = "";
  try { src = fs.readFileSync(abs, "utf8"); } catch { return []; }
  const missing = REQUIRED_METHODS.filter((m) => !src.includes(m));
  return missing;
}

function checkGraphJson(abs) {
  let doc;
  try { doc = JSON.parse(fs.readFileSync(abs, "utf8")); }
  catch (e) { return [`parse failed: ${e.message}`]; }

  const errors = [];
  const nodes = doc?.nodes;
  const edges = doc?.edges;
  if (!Array.isArray(nodes)) errors.push("nodes[] missing or not array");
  if (!Array.isArray(edges)) errors.push("edges[] missing or not array");
  if (errors.length) return errors;

  const nodeIds = new Set(nodes.map((n) => n?.id));
  for (const e of edges) {
    if (!nodeIds.has(e?.from)) errors.push(`dangling edge: from=${e?.from} not in nodes`);
    if (!nodeIds.has(e?.to)) errors.push(`dangling edge: to=${e?.to} not in nodes`);
  }

  // DFS cycle detection (white/gray/black).
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) if (adj.has(e.from)) adj.get(e.from).push(e.to);
  const state = new Map();
  for (const n of nodes) state.set(n.id, "white");
  let foundCycle = false;
  const visit = (u) => {
    state.set(u, "gray");
    for (const v of adj.get(u) ?? []) {
      if (state.get(v) === "gray") { foundCycle = true; return; }
      if (state.get(v) === "white") { visit(v); if (foundCycle) return; }
    }
    state.set(u, "black");
  };
  for (const n of nodes) { if (state.get(n.id) === "white") { visit(n.id); if (foundCycle) break; } }
  if (foundCycle) errors.push("graph contains a cycle — abort per U-DAGI02 criteria");

  return errors;
}

export default async function cadGraphIntegrity({ tool, input, result }) {
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) return;
  if (result?.error) return;
  const target = input?.file_path || input?.path || "";
  if (!target) return;
  const normalized = target.replace(/\\/g, "/");

  const cwd = process.cwd();
  if (normalized.endsWith(ENGINE_REL) || normalized.includes("CADKnowledgeGraphEngine.ts")) {
    const abs = path.isAbsolute(normalized) ? normalized : path.join(cwd, normalized);
    const missing = checkEngineSurface(abs);
    if (missing.length > 0) {
      for (const m of missing) log("ERROR", `CADKnowledgeGraphEngine missing required method: ${m}`);
      process.exitCode = 2;
      return;
    }
    log("INFO", "CADKnowledgeGraphEngine surface intact");
    return;
  }

  if (normalized.includes(GRAPH_DIR_REL) && normalized.endsWith(".json")) {
    const abs = path.isAbsolute(normalized) ? normalized : path.join(cwd, normalized);
    const errs = checkGraphJson(abs);
    if (errs.length > 0) {
      for (const e of errs) log("ERROR", e);
      process.exitCode = 2;
      return;
    }
    log("INFO", "CAD graph JSON integrity ok");
  }
}
