#!/usr/bin/env node
/**
 * generate-database-surfaces-roost.mjs — system-viz augmentation: database surfaces.
 *
 * Spec: JULIETT-DB-BRIDGE-PLAN-2026-05-25 (slot juliett, claude-f75381c1).
 *
 * Emits `ghost.database_surfaces` L7 roost + one `database-surface` child per
 * known PRISM storage backend, tagged with PSN leg owner, backend type,
 * built/wired/ghost classification, and a bridge-gap count (how many missing
 * cross-leg bridges touch this surface). The viz makes "where do our DBs
 * live, which are similar, which are unbridged" legible at a glance.
 *
 * Source of truth for the inventory: this file. As surfaces evolve, extend
 * SURFACES + BRIDGES below. Future work can promote to a JSON sidecar at
 * state/shared/database-inventory.json once the schema stabilizes.
 *
 * Pattern modeled on generate-priority-queue-features.mjs +
 * generate-bridge-synergy-features.mjs (same augmentation contract).
 *
 * Registered in scripts/regen-viz.mjs FAST[] + scripts/merge-augmentations.mjs.
 *
 * Usage:  node scripts/generate-database-surfaces-roost.mjs
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const DB_ROOST_ID = "ghost.database_surfaces";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L7";
export const SURFACE_LAYER = "L8";
export const MAX_LABEL = 80;
export const MAX_INFO = 320;

// Color palette — by classification (built+wired / built+unwired / ghost).
export const COLOR_WIRED = "#10b981";    // green — built + wired
export const COLOR_UNWIRED = "#f59e0b";  // amber — built but no dispatcher
export const COLOR_GHOST = "#6b7280";    // gray — not built yet
export const COLOR_EXTERNAL = "#3b82f6"; // blue — external (Claude Code .db, etc.)

/**
 * PSN leg ids — must align with feedback_psn_definition.md (canonical 11 legs).
 */
export const PSN_LEGS = {
  OBSIDIAN: { id: 1, name: "Obsidian brain" },
  PRISM_OS: { id: 2, name: "PRISM OS" },
  WIKI: { id: 3, name: "Wiki" },
  MEMORIES: { id: 4, name: "Memories" },
  TRIBAL: { id: 5, name: "Tribal" },
  SYSTEM_VIZ: { id: 6, name: "System Viz" },
  ENGINES: { id: 7, name: "Engines" },
  ALGORITHMS: { id: 8, name: "Algorithms" },
  FORMULAS: { id: 9, name: "Formulas" },
  NN_GNN: { id: 10, name: "NN/GNN" },
  PRISM_AI: { id: 11, name: "PRISM AI" },
};

/**
 * The 11 canonical DB surfaces in PRISM (from JULIETT-DB-BRIDGE-PLAN-2026-05-25).
 * Edit this list as surfaces are added/wired. Keep entries terse — long detail
 * lives in the plan doc and the engine source.
 */
export const SURFACES = [
  { key: "qdrant-vectors", name: "Qdrant Vectors (14 collections)", backend: "vector",
    engine: "QdrantMemoryEngine,QdrantVectorStoreEngine", dispatcher: "prism_memory",
    leg: PSN_LEGS.MEMORIES, status: "wired",
    path: "(remote Qdrant; prism_memory_* collections)" },
  { key: "tiered-memory", name: "Tiered Memory (working/episodic/semantic)", backend: "in-memory+persist",
    engine: "TieredMemoryEngine,CrossProcessEpisodicMemoryEngine", dispatcher: "prism_memory",
    leg: PSN_LEGS.MEMORIES, status: "wired",
    path: "state/shared/ (selective persist)" },
  { key: "coordination-sqlite", name: "Coordination SQLite", backend: "sqlite",
    engine: "CoordinationStoreEngine", dispatcher: "infra",
    leg: PSN_LEGS.PRISM_OS, status: "wired",
    path: "state/shared/coordination.db" },
  { key: "agent-memory-fabric", name: "Agent Memory Fabric", backend: "in-memory",
    engine: "AgentMemoryFabricEngine", dispatcher: "prism_memory (6 actions)",
    leg: PSN_LEGS.MEMORIES, status: "wired",
    path: "(singleton; backed by CrossProcessEpisodicMemoryEngine)" },
  { key: "outcome-episodic-bridge", name: "Outcome Episodic Store", backend: "event-bus+persist",
    engine: "OutcomeEpisodicMemoryBridgeEngine", dispatcher: "prism_memory",
    leg: PSN_LEGS.NN_GNN, status: "wired",
    path: "(FeedbackBusEngine subscription)" },
  { key: "catalog-registries", name: "Catalog Registries (tool/holder/machine/finish/material)", backend: "json+registry",
    engine: "ToolHolderDatabaseEngine,MachineConfigDatabaseEngine,SurfaceFinishDatabaseEngine,MaterialRegistry,registryManager",
    dispatcher: "prism_data (18 actions)",
    leg: PSN_LEGS.ENGINES, status: "wired",
    path: "mcp-server/src/data/, extracted/{materials,tools,machines}/" },
  { key: "box-program-db", name: "BOX Program DB", backend: "(implicit)",
    engine: "(dataDispatcher)", dispatcher: "prism_data:box_db_* (4 actions)",
    leg: PSN_LEGS.ENGINES, status: "wired",
    path: "(dispatcher-level)" },
  { key: "obsidian-vault", name: "Obsidian Vault (MD)", backend: "markdown-vault",
    engine: "ObsidianVaultSyncEngine,MemorySyncEngine",
    dispatcher: "prism_memory:brain_recall",
    leg: PSN_LEGS.OBSIDIAN, status: "wired",
    path: "C:/Users/wompu/.claude/projects/H--prism/memory/*.md → H:/prism/knowledge/memories/" },
  { key: "memory-graph", name: "Memory Graph (in-memory)", backend: "graph-in-memory",
    engine: "MemoryGraphEngine", dispatcher: "prism_memory (6 core + 38 compound)",
    leg: PSN_LEGS.MEMORIES, status: "wired",
    path: "(in-memory; partial persistence)" },
  { key: "feature-store", name: "Feature Store (CAD embeddings)", backend: "vector",
    engine: "FeatureStoreEngine", dispatcher: "(none — UNWIRED)",
    leg: PSN_LEGS.NN_GNN, status: "unwired",
    path: "(only reachable via hardcoded engine imports in NN pipeline)" },
  { key: "system-graph-json", name: "System Graph (system-viz canonical)", backend: "json-graph",
    engine: "(graph I/O lib; readGraphStreaming/writeGraphStreaming)",
    dispatcher: "prism_session:master_index_query",
    leg: PSN_LEGS.SYSTEM_VIZ, status: "wired",
    path: "state/shared/system-viz/system-graph.json (280MB+)" },
  { key: "claude-memory-db", name: ".claude/memory.db (Claude Code)", backend: "sqlite+vector",
    engine: "(Claude harness — external)",
    dispatcher: "prism_memory:consolidation_*",
    leg: PSN_LEGS.MEMORIES, status: "external",
    path: "H:/.claude/memory.db" },
];

/**
 * Cross-leg bridges that ARE MISSING. Each entry names the source + target
 * surfaces (by key) and a 1-line description. We tag each surface with the
 * count of missing bridges that involve it — high counts surface integration
 * leverage in the viz tooltip.
 */
export const BRIDGES_MISSING = [
  { from: "feature-store", to: "qdrant-vectors", what: "NN-graph embeddings → persistent Qdrant collection" },
  { from: "tiered-memory", to: "outcome-episodic-bridge", what: "Unified recall_outcome_pattern across tiered + bus" },
  { from: "catalog-registries", to: "catalog-registries", what: "cross_catalog_match (tool × holder × material × coating)" },
  { from: "memory-graph", to: "obsidian-vault", what: "trace_causal_path — decision↔outcome chains" },
  { from: "feature-store", to: "(mcp)", what: "FeatureStorePublicAccessEngine — expose to MCP layer" },
  { from: "system-graph-json", to: "(index)", what: "Normalized dependency index for blast-radius queries" },
  { from: "(wiki)", to: "(fts)", what: "Wiki → full-text-search index (currently grep-based)" },
  { from: "catalog-registries", to: "(postgres)", what: "Registries → PostgreSQL (enables material × tool × machine JOINs)" },
  { from: "tiered-memory", to: "(timeseries)", what: "Outcome events → time-series DB (SPC/OEE trends)" },
  { from: "(formulas)", to: "(eval-cache)", what: "Formulas → evaluation cache (Kienzle recomputes every call)" },
  { from: "(dispatchers)", to: "(audit-log)", what: "Dispatcher actions → invocation audit log" },
  { from: "(jm-die)", to: "(search-index)", what: "JM Die program archive → indexed search (filesystem crawl today)" },
];

export function colorFor(status) {
  if (status === "wired") return COLOR_WIRED;
  if (status === "unwired") return COLOR_UNWIRED;
  if (status === "external") return COLOR_EXTERNAL;
  return COLOR_GHOST;
}

export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "").slice(0, 80);
  return (!s || s.includes("..")) ? "x" : s;
}

/**
 * Count missing bridges that touch a given surface key (by from or to).
 * @param {string} key
 * @returns {number}
 */
export function bridgeGapCountFor(key, bridges = BRIDGES_MISSING) {
  if (!key) return 0;
  return bridges.filter((b) => b && (b.from === key || b.to === key)).length;
}

/**
 * Pure: emit ghost-roost + one node per surface. Returns {newNodes,newEdges,stats}.
 */
export function generate(surfaces = SURFACES, bridges = BRIDGES_MISSING, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  let roostEmitted = 0;

  // Roost.
  const counts = surfaces.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  if (!ids.has(DB_ROOST_ID)) {
    newNodes.push({
      id: DB_ROOST_ID,
      label: `Database Surfaces (${surfaces.length} backends · ${bridges.length} bridges missing)`,
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${surfaces.length} PRISM storage backends across PSN. wired=${counts.wired||0} · unwired=${counts.unwired||0} · external=${counts.external||0} · ghost=${counts.ghost||0}. Source: scripts/generate-database-surfaces-roost.mjs.`,
    });
    ids.add(DB_ROOST_ID);
    roostEmitted = 1;
  }

  // Sort: status (wired→unwired→external→ghost), then leg.id, then name.
  const STATUS_ORDER = { wired: 0, unwired: 1, external: 2, ghost: 3 };
  const decorated = surfaces.map((s, i) => ({ s, i }));
  decorated.sort((a, b) =>
    (STATUS_ORDER[a.s.status] - STATUS_ORDER[b.s.status]) ||
    ((a.s.leg && a.s.leg.id) - (b.s.leg && b.s.leg.id)) ||
    String(a.s.name || "").localeCompare(String(b.s.name || "")) ||
    (a.i - b.i));

  let emitted = 0, skipped = 0;
  for (const { s } of decorated) {
    const nid = "ghost.db." + safeId(s.key);
    if (ids.has(nid)) { skipped++; continue; }
    const gap = bridgeGapCountFor(s.key, bridges);
    const legLabel = s.leg ? `leg ${s.leg.id} ${s.leg.name}` : "leg ?";
    const infoBits = [
      `[${s.status} · ${s.backend} · ${legLabel} · gaps=${gap}]`,
      `engine: ${s.engine || "?"}`,
      `dispatcher: ${s.dispatcher || "?"}`,
      `path: ${s.path || "?"}`,
    ].join(" · ").slice(0, MAX_INFO);
    newNodes.push({
      id: nid,
      label: `[db] ${s.name}`.slice(0, MAX_LABEL),
      layer: SURFACE_LAYER,
      ghost: true,
      status: "ghost",
      kind: "database-surface",
      parent: DB_ROOST_ID,
      color: colorFor(s.status),
      surfaceStatus: s.status,
      backend: s.backend,
      legId: s.leg && s.leg.id,
      legName: s.leg && s.leg.name,
      dispatcher: s.dispatcher,
      bridgeGaps: gap,
      info: infoBits,
    });
    ids.add(nid);
    emitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted,
      totalSurfaces: surfaces.length,
      totalBridgesMissing: bridges.length,
      emitted,
      skipped,
      byStatus: counts,
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "database-surfaces-augmentation.json");

export function main() {
  let result;
  try {
    const { newNodes, newEdges, stats } = generate(SURFACES, BRIDGES_MISSING, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "scripts/generate-database-surfaces-roost.mjs",
      newNodes, newEdges, stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try {
    if (!fs.existsSync(VIZ_DIR)) fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:            ${result.stats.roostEmitted}`);
  console.log(`  total surfaces:   ${result.stats.totalSurfaces}`);
  console.log(`  bridges missing:  ${result.stats.totalBridgesMissing}`);
  console.log(`  emitted:          ${result.stats.emitted}`);
  console.log(`  by status:        ${JSON.stringify(result.stats.byStatus)}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
