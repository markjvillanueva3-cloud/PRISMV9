#!/usr/bin/env node
/**
 * generate-engine-physics-edges.mjs — emit L5.engine → L6.core.physics.X
 * "uses_constant" edges so the viz shows which engines depend on which
 * canonical physics constants (Kienzle, Taylor, AISI material data, etc.).
 *
 * Critical for SAFETY review: shows the blast-radius of any change to
 * physics/constants.ts and surfaces engines that should re-run their
 * validation suite when a constant moves.
 *
 * Signal:
 *   For each engine .ts file, look for two patterns:
 *     1. import { KIENZLE_BY_ISO, TAYLOR_DEFAULTS } from "../physics/constants.js"
 *     2. Free-form references to constant names inside the body
 *        (e.g. `CANONICAL_KIENZLE.P.kc11`)
 *
 *   The constant names (CANONICAL_KIENZLE, KIENZLE_BY_ISO, etc.) are the
 *   L6 rollup ids; the second-level keys (P, M, K, etc.) are the atomic
 *   physics_value ids — connect to either depending on specificity of the
 *   reference.
 *
 * Output: state/shared/system-viz/engine-physics-edges-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENG_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const ATOMIC_DEPTH = 3;
const IMPORT_FROM_PHYSICS = /import\s+\{([^}]+)\}\s+from\s+["'][^"']*physics\/constants(?:\.[jt]s)?["']/g;
const NAMED_IDENT_CLEAN = /^\s*(?:type\s+)?([A-Za-z_$][\w$]*)/;
const SLUG_NONALNUM = /[^a-z0-9._-]/g;

function slugify(s) {
  return s.toLowerCase().replace(SLUG_NONALNUM, "_").replace(/_+/g, "_");
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing", stats: {} };
  const graph = JSON.parse(fs.readFileSync(GRAPH, "utf8"));

  // Build engine-stem → id index
  const engineStemToId = new Map();
  // Build physics-rollup id index (lowercase name → id)
  const physicsRollupByName = new Map();
  // Build physics-value atomic id index (rollup.keyLower → atomic id)
  const physicsAtomic = new Map();

  for (const n of graph.nodes) {
    if (n.layer === "L5" && n.id?.startsWith("eng.") && n.id.split(".").length === ATOMIC_DEPTH) {
      engineStemToId.set(n.id.split(".").pop(), n.id);
    }
    if (n.layer === "L6" && n.subgroup === "physics_constant" && n.id) {
      // id = core.physics.<lowercased-export>
      const stem = n.id.split(".").pop();
      physicsRollupByName.set(stem, n.id);
      physicsRollupByName.set(stem.toUpperCase(), n.id);
      if (n.label) physicsRollupByName.set(n.label, n.id);
    }
    if (n.layer === "L6" && n.subgroup === "physics_value" && n.id) {
      // id = core.physics.<export-lower>.<key-slug>
      physicsAtomic.set(n.id.toLowerCase(), n.id);
    }
  }

  const newEdges = [];
  const seenEdge = new Set();
  function pushEdge(from, to, type, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status: "active", intensity });
    return true;
  }

  const stats = {
    enginesScanned: 0,
    enginesImportingPhysics: 0,
    importStatements: 0,
    rollupEdges: 0,
    atomicEdges: 0,
    perTargetTopRefs: {},
  };

  for (const file of fs.readdirSync(ENG_DIR)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts") || file.endsWith(".d.ts")) continue;
    const stem = file.replace(/\.ts$/, "").toLowerCase();
    const srcId = engineStemToId.get(stem);
    if (!srcId) continue;
    stats.enginesScanned++;

    let content;
    try { content = fs.readFileSync(path.join(ENG_DIR, file), "utf8"); }
    catch { continue; }

    // Pass 1: named imports from physics/constants
    IMPORT_FROM_PHYSICS.lastIndex = 0;
    let m;
    const namedFromImports = new Set();
    while ((m = IMPORT_FROM_PHYSICS.exec(content)) !== null) {
      stats.importStatements++;
      for (const raw of m[1].split(",")) {
        const cleanMatch = raw.match(NAMED_IDENT_CLEAN);
        if (!cleanMatch) continue;
        namedFromImports.add(cleanMatch[1]);
      }
    }
    if (namedFromImports.size > 0) stats.enginesImportingPhysics++;

    // Emit rollup edges for each named import
    for (const name of namedFromImports) {
      const rollupId = physicsRollupByName.get(name) || physicsRollupByName.get(name.toLowerCase());
      if (rollupId) {
        if (pushEdge(srcId, rollupId, "uses_constant", 0.50)) {
          stats.rollupEdges++;
          stats.perTargetTopRefs[rollupId] = (stats.perTargetTopRefs[rollupId] || 0) + 1;
        }
      }
    }

    // Pass 2: search body for ROLLUP.KEY accesses (only for already-imported rollups)
    for (const name of namedFromImports) {
      const rollupId = physicsRollupByName.get(name) || physicsRollupByName.get(name.toLowerCase());
      if (!rollupId) continue;
      // Look for NAME.KEY patterns where KEY is alphanumeric
      const accessRe = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.([A-Za-z_][\\w]*)", "g");
      let am;
      const keysHit = new Set();
      while ((am = accessRe.exec(content)) !== null) {
        keysHit.add(am[1]);
      }
      for (const key of keysHit) {
        const atomicId = `${rollupId}.${slugify(key)}`;
        if (physicsAtomic.has(atomicId.toLowerCase())) {
          if (pushEdge(srcId, atomicId, "uses_value", 0.45)) {
            stats.atomicEdges++;
            stats.perTargetTopRefs[atomicId] = (stats.perTargetTopRefs[atomicId] || 0) + 1;
          }
        }
      }
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes: [],
    newEdges,
    stats,
  };
}

const result = generate();
const out = path.join(VIZ_DIR, "engine-physics-edges-augmentation.json");
fs.writeFileSync(out, JSON.stringify(result));
console.log(`wrote ${out}`);
if (result.error) console.log(`  error: ${result.error}`);
else {
  const s = result.stats;
  console.log(`  engines scanned:           ${s.enginesScanned}`);
  console.log(`  engines importing physics: ${s.enginesImportingPhysics}`);
  console.log(`  import statements:         ${s.importStatements}`);
  console.log(`  rollup-level edges:        ${s.rollupEdges}`);
  console.log(`  atomic-key edges:          ${s.atomicEdges}`);
  console.log(`  total edges:               ${result.newEdges.length}`);
  console.log(`  ── top 10 most-used physics consts ──`);
  for (const [id, n] of Object.entries(s.perTargetTopRefs).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${id.padEnd(50)} ${n}`);
  }
}
