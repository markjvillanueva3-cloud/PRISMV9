// class-name-node-resolver.mjs -- map a bare engine CLASS NAME ("MasterPostProcessorEngine") to its
// live graph node-id ("eng.cam.masterpostprocessorengine"). The reusable core of U-VIZ-ROOST-BRIDGE-
// RESOLVE: ghost-roost generators emit bridge edges to bare class names (the documented
// reference_orphan_augmentation_dangling_diagnosis_2026_06_10 bug); resolving them to node-ids before
// the edge is folded prevents danglers in the fleet search substrate (sierra's #1 refuse).
//
// Two consumers: (1) merge-augmentations foldRoostAug builds the index from the live in-memory graph
// (G.nodes); (2) ghost-roost generators (no in-memory graph) build it from the node-card OFFSET ORACLE
// (state/shared/system-viz/node-card-offsets.json, ~351K ids, cheap -- NEVER the 575MB graph).
//
// Index key = the lowercased LAST id-segment (eng.cam.masterpostprocessorengine -> masterpostprocessorengine);
// a bare class name has no dots so it keys on its whole lowercase. Tiebreak: prefer eng.* ids, then the
// lexicographically smallest (deterministic across regens -- no graph churn).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Build a class-name index: Map(lowercased-last-segment -> node-id). Prefer eng.*, lexicographic tiebreak. */
export function buildClassNameIndex(ids) {
  const idx = new Map();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const key = id.slice(id.lastIndexOf(".") + 1).toLowerCase();
    if (!key) continue;
    const prev = idx.get(key);
    if (
      prev === undefined ||
      (!prev.startsWith("eng.") && id.startsWith("eng.")) ||
      (prev.startsWith("eng.") && id.startsWith("eng.") && id < prev)
    ) {
      idx.set(key, id);
    }
  }
  return idx;
}

/**
 * Build a resolver from a base id set (the class-name index source -- typically the full graph / oracle).
 * @returns {(ref:string, validIds:Set<string>) => (string|null)} resolve(ref, validIds):
 *   pass-through if `ref` is already a valid node-id (handles a roost's own just-added nodes via validIds),
 *   else map a bare class-name via the index and confirm the hit is in validIds, else null (caller drops it).
 */
export function makeClassNameResolver(indexIds) {
  const classIndex = buildClassNameIndex(indexIds);
  const resolve = (ref, validIds) => {
    if (ref == null) return null;
    if (validIds.has(ref)) return ref;
    const hit = classIndex.get(String(ref).toLowerCase());
    return hit && validIds.has(hit) ? hit : null;
  };
  resolve.classIndex = classIndex; // exposed for tests / introspection
  return resolve;
}

/** Load the live node-id list from the node-card offset oracle (cheap; never the 575MB graph). */
export function loadOracleIds(root = REPO_ROOT) {
  const p = path.join(root, "state", "shared", "system-viz", "node-card-offsets.json");
  const off = JSON.parse(fs.readFileSync(p, "utf8"));
  return Object.keys(off.offsets || off);
}

/** Convenience for generators: a resolver + the live id Set, both built from the offset oracle. */
export function makeOracleResolver(root = REPO_ROOT) {
  const ids = loadOracleIds(root);
  const idSet = new Set(ids);
  return { resolve: makeClassNameResolver(ids), idSet };
}
