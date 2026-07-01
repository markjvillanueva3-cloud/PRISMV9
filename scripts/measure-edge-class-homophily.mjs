#!/usr/bin/env node
/**
 * measure-edge-class-homophily.mjs -- NON-DESTRUCTIVE per-edge-type dispatcher-class
 * homophily measurement for the GNN tier-5 "edges / message-passing" lever
 * (slot:india 2026-06-21).
 *
 * WHY: the deployed tier-5 classifier is DIRECT-EMBED (pure cosine k-NN over the
 * node embeddings -- see measure-codebase-wired-refpool-auroc.mjs:296-303), NOT the
 * GraphSAGE message-passing model (which is link-prediction *pretext*, not the
 * deployed path). Two independent per-node features (action-surface +0.0018,
 * import-fingerprint +0.0005) both measured marginal on top of GHOST_SOURCE -- the
 * nomic text embedding is at the per-node-FEATURE ceiling (23/43 separable @ 0.0527,
 * [[reference_gnn_import_fingerprint_probe_2026_06_21]]). The strategic redirect names
 * "graph edges / message-passing" as the next real lever -- but that lever is only
 * worth building IF routing the classification through message-passing would BEAT
 * direct-embed, and that hinges entirely on whether the engine<->engine edges are
 * HOMOPHILOUS w.r.t. dispatcher class. A heterophilous graph (same-class engines NOT
 * connected) means vanilla SAGE message-passing AVERAGES IN cross-class noise and
 * HURTS -- the existence of the H2GCN `heterophilyHops` machinery (default-off) in
 * graphsage-train-pipeline.mjs strongly implies the graph is heterophilous. This
 * script answers that decisively, with real numbers, before any edge-build.
 *
 * LEAK DISCIPLINE (india soul -- the fake-0.98 trap): the engine<->engine edge
 * structure must be computable WITHOUT a ghost's own dispatcher label.
 *   - engine_import  (eng.* -> eng.*)          LEAK-FREE: imports are a property of the
 *                                              .ts file, written independent of wiring.
 *   - shared_schema  (eng.* -> schema.*)       LEAK-FREE 2-hop: two engines sharing a
 *   - shared_physics (eng.* -> core.physics.*) schema/constant/test connect indirectly;
 *   - shared_test    (test.* -> eng.*)         none of those carry the dispatcher label.
 *   - action-engine  (disp.<DISPATCHER>.action.* -> eng.*)  >>> EXCLUDED <<< the `from`
 *                    endpoint IS the dispatcher (the class label). An unwired ghost has
 *                    NO action edge (that edge is the very thing tier-5 predicts) -- so
 *                    its homophily is trivially 1.0 and LEAKS. Never measured here.
 *
 * METHOD: for each leak-free edge type, restrict to engines wired to EXACTLY ONE
 * dispatcher (the confidence-1.0 single-class semantics of the deployed refpool;
 * extractWiredEngines drops multi-dispatcher conflicts the same way). Compute the
 * fraction of (engine,engine) adjacencies whose endpoints share dispatcher class, and
 * compare to the random-pair NULL (the expected same-class fraction for a random
 * unordered pair drawn from the participating engine population). lift = ratio / null:
 *   lift >> 1  -> edges concentrate same-class engines -> message-passing adds signal.
 *   lift ~ 1   -> edges are class-agnostic -> message-passing adds noise; direct-embed
 *                 is at ceiling; the remaining levers are ref-pool growth / a different
 *                 embedding model (NOT india-solo).
 *
 * CAVEAT (R12): the null is the unweighted participating-population class distribution,
 * not the full configuration model (degree-preserving rewire). A hub engine imported by
 * many appears in many edges; the configuration-model null would be tighter. The
 * unweighted null is the standard first-pass and is sufficient to distinguish "strongly
 * homophilous" from "class-agnostic" -- a borderline lift (~1.0-1.3) should be re-checked
 * against a degree-preserving null before acting. Stated so the lift is read correctly.
 *
 * NON-DESTRUCTIVE: reads the small per-type edge augmentation JSONs in
 * state/shared/system-viz/ (NOT the 542MB system-graph.json) + the dispatcher sources.
 * Writes NOTHING. Pure-export contract (for tests): extractStem, buildStemToClass,
 * classDistributionBaseline, directHomophily, sharedIntermediateHomophily.
 *
 * Run: node scripts/measure-edge-class-homophily.mjs [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");

// eng.<dom>.<stem> -- an L5 atomic engine node id has exactly 3 dot-separated segments.
const ATOMIC_DEPTH = 3;

// Verdict thresholds: an edge type is "homophilous enough that message-passing adds
// class signal" when its same-class lift over the random-pair null is >= 1.5x AND its
// absolute same-class ratio is >= 0.4 (a high lift over a tiny base is not actionable).
const HOMOPHILY_LIFT_MIN = 1.5;
const HOMOPHILY_RATIO_MIN = 0.4;

/**
 * The leak-free engine<->engine edge sources. `mode`:
 *   "direct" -> both endpoints are engines (1-hop adjacency: GraphSAGE layer-1 sees this).
 *   "shared" -> one endpoint is an engine, the other an intermediate; two engines that
 *               touch the SAME intermediate are 2-hop neighbours (layer-2 reach).
 * action-engine is DELIBERATELY absent (it leaks the dispatcher label; see header).
 */
export const LEAK_FREE_EDGE_FILES = Object.freeze([
  { type: "engine_import", file: "engine-import-edges-augmentation.json", mode: "direct" },
  { type: "shared_schema", file: "schema-engine-edges-augmentation.json", mode: "shared" },
  { type: "shared_physics", file: "engine-physics-edges-augmentation.json", mode: "shared" },
  { type: "shared_test", file: "test-coverage-edges-augmentation.json", mode: "shared" },
]);

/**
 * Extract the lowercased engine stem from an `eng.<dom>.<stem>` node id. Returns null
 * for any id that is not a 3-segment `eng.` atomic engine node (a dispatcher id, a
 * schema id, a physics-constant id, a malformed id, or a non-string). Pure.
 *
 * @param {string} nodeId
 * @returns {string|null}
 */
export function extractStem(nodeId) {
  if (typeof nodeId !== "string" || !nodeId.startsWith("eng.")) return null;
  const parts = nodeId.split(".");
  if (parts.length !== ATOMIC_DEPTH) return null;
  const stem = parts[parts.length - 1];
  return stem ? stem.toLowerCase() : null;
}

/**
 * Build Map<engineStemLower, dispatcherNamespace> from the buildEngineDispatcherMap
 * output (Map<PascalClassName, Set<namespace>>), restricted to engines wired to
 * EXACTLY ONE dispatcher -- the confidence-1.0 single-class semantics the deployed
 * reference pool uses (multi-dispatcher engines are an ambiguous label and are dropped,
 * mirroring extractWiredEngines' conflict exclusion). first-wins on a stem collision
 * (two distinct PascalCase classes lowercasing to the same stem -- vanishingly rare).
 * Pure.
 *
 * @param {Map<string, Set<string>>} engineDispatcherMap
 * @returns {Map<string, string>}
 */
export function buildStemToClass(engineDispatcherMap) {
  const out = new Map();
  if (!(engineDispatcherMap instanceof Map)) return out;
  for (const [className, nsSet] of engineDispatcherMap) {
    if (typeof className !== "string" || !className) continue;
    if (!(nsSet instanceof Set) || nsSet.size !== 1) continue; // single-class only
    const ns = [...nsSet][0];
    if (typeof ns !== "string" || !ns) continue;
    const stem = className.toLowerCase();
    if (!out.has(stem)) out.set(stem, ns); // first-wins, deterministic
  }
  return out;
}

/**
 * Random-pair NULL: the expected fraction of a random unordered pair (two DISTINCT
 * members) sharing a class, given the class labels of the population --
 * sum_c [n_c*(n_c-1)] / [N*(N-1)]. This is the homophily a class-agnostic edge set
 * would exhibit by chance. Returns null when N < 2 (a pair is undefined). Pure.
 *
 * @param {string[]} classes per-member class labels (order irrelevant)
 * @returns {number|null}
 */
export function classDistributionBaseline(classes) {
  const arr = Array.isArray(classes) ? classes : [];
  const N = arr.length;
  if (N < 2) return null;
  const counts = new Map();
  for (const c of arr) counts.set(c, (counts.get(c) || 0) + 1);
  let same = 0;
  for (const n of counts.values()) same += n * (n - 1);
  return same / (N * (N - 1));
}

/**
 * Direct (1-hop) engine<->engine homophily over an edge list whose endpoints are both
 * `eng.*` atomic engines. Counts each UNORDERED engine pair once (a mutual import
 * A->B + B->A is one pair), restricted to pairs where BOTH endpoints are classifiable
 * (single-class). Self-edges and unclassifiable endpoints are skipped. Returns
 * { pairs, sameClass, ratio, participants } where participants is the Set of
 * classifiable engine stems that appear in >=1 counted pair (the population for the
 * null). ratio is null when no classifiable pair exists. Pure.
 *
 * @param {Array<{from:string,to:string}>} edges
 * @param {Map<string,string>} stemToClass
 */
export function directHomophily(edges, stemToClass) {
  const list = Array.isArray(edges) ? edges : [];
  const map = stemToClass instanceof Map ? stemToClass : new Map();
  const seenPair = new Set();
  const participants = new Set();
  let pairs = 0;
  let sameClass = 0;
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    const a = extractStem(e.from);
    const b = extractStem(e.to);
    if (!a || !b || a === b) continue;
    const ca = map.get(a);
    const cb = map.get(b);
    if (ca === undefined || cb === undefined) continue;
    const key = a < b ? a + " " + b : b + " " + a;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    participants.add(a);
    participants.add(b);
    pairs++;
    if (ca === cb) sameClass++;
  }
  return { pairs, sameClass, ratio: pairs > 0 ? sameClass / pairs : null, participants };
}

/**
 * Shared-intermediate (2-hop) engine<->engine homophily: two engines that touch the
 * SAME non-engine intermediate node (a schema, a physics constant, a test) are 2-hop
 * neighbours. For each intermediate with >=2 distinct classifiable engines, every
 * unordered engine pair under it is counted (k choose 2 total; sum_c (count_c choose 2)
 * same-class). An edge whose endpoints are BOTH engines or NEITHER an engine is skipped
 * (not a shared-intermediate edge). The engine endpoint may be `from` (schema/physics:
 * eng->intermediate) or `to` (test-coverage: test->eng) -- detected by which endpoint
 * is an `eng.*` atomic id. Returns { sharedIntermediates, pairs, sameClass, ratio,
 * participants }. ratio is null when no qualifying pair exists. Pure.
 *
 * @param {Array<{from:string,to:string}>} edges
 * @param {Map<string,string>} stemToClass
 */
export function sharedIntermediateHomophily(edges, stemToClass) {
  const list = Array.isArray(edges) ? edges : [];
  const map = stemToClass instanceof Map ? stemToClass : new Map();
  const byIntermediate = new Map(); // intermediateId -> Map<engineStem, class>
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    const fromStem = extractStem(e.from);
    const toStem = extractStem(e.to);
    let engStem;
    let interId;
    if (fromStem && !toStem) {
      engStem = fromStem;
      interId = e.to;
    } else if (toStem && !fromStem) {
      engStem = toStem;
      interId = e.from;
    } else {
      continue; // both engines (direct) or neither -- not a shared-intermediate edge
    }
    if (typeof interId !== "string" || !interId) continue;
    const cls = map.get(engStem);
    if (cls === undefined) continue;
    let m = byIntermediate.get(interId);
    if (!m) {
      m = new Map();
      byIntermediate.set(interId, m);
    }
    if (!m.has(engStem)) m.set(engStem, cls);
  }
  let sharedIntermediates = 0;
  let pairs = 0;
  let sameClass = 0;
  const participants = new Set();
  for (const m of byIntermediate.values()) {
    if (m.size < 2) continue;
    sharedIntermediates++;
    const counts = new Map();
    for (const [stem, cls] of m) {
      counts.set(cls, (counts.get(cls) || 0) + 1);
      participants.add(stem);
    }
    const k = m.size;
    pairs += (k * (k - 1)) / 2;
    for (const n of counts.values()) sameClass += (n * (n - 1)) / 2;
  }
  return { sharedIntermediates, pairs, sameClass, ratio: pairs > 0 ? sameClass / pairs : null, participants };
}

/** Per-type lift = observed ratio / random-pair null over that type's participants. */
function liftFor(result, stemToClass) {
  const classes = [];
  for (const stem of result.participants) {
    const c = stemToClass.get(stem);
    if (c !== undefined) classes.push(c);
  }
  const baseline = classDistributionBaseline(classes);
  const lift = result.ratio != null && baseline != null && baseline > 0 ? result.ratio / baseline : null;
  return { baseline, lift, participantCount: result.participants.size };
}

/** Read a `{ newEdges: [...] }` augmentation file; [] on any failure (fail-soft, R12). */
function readEdges(file) {
  try {
    const obj = JSON.parse(fs.readFileSync(path.join(VIZ_DIR, file), "utf8"));
    if (Array.isArray(obj.newEdges)) return obj.newEdges;
    if (Array.isArray(obj.edges)) return obj.edges;
    return [];
  } catch {
    return [];
  }
}

const fmt = (x) => (x == null ? "n/a" : Number(x).toFixed(4));

function main() {
  const asJson = process.argv.slice(2).includes("--json");

  const engineDispatcherMap = buildEngineDispatcherMap(DISPATCHERS_DIR);
  const stemToClass = buildStemToClass(engineDispatcherMap);
  if (stemToClass.size === 0) {
    console.error("measure-edge-class-homophily: no single-class engines resolved from dispatchers -- cannot measure");
    return 1;
  }

  // Global class distribution null (over ALL single-class engines) for context.
  const globalNull = classDistributionBaseline([...stemToClass.values()]);

  const rows = [];
  for (const spec of LEAK_FREE_EDGE_FILES) {
    const edges = readEdges(spec.file);
    const result = spec.mode === "direct"
      ? directHomophily(edges, stemToClass)
      : sharedIntermediateHomophily(edges, stemToClass);
    const { baseline, lift, participantCount } = liftFor(result, stemToClass);
    rows.push({
      type: spec.type,
      mode: spec.mode,
      edges: edges.length,
      pairs: result.pairs,
      sameClass: result.sameClass,
      ratio: result.ratio,
      baseline,
      lift,
      participantCount,
      sharedIntermediates: result.sharedIntermediates,
    });
  }

  // Verdict: the DIRECT engine_import lift is what GraphSAGE layer-1 message-passing
  // sees; it is the decision driver. >=1.5 with ratio>=0.4 => homophilous enough that
  // message-passing would add class signal.
  const directRow = rows.find((r) => r.type === "engine_import");
  const directHomophilous = !!(directRow && directRow.lift != null && directRow.lift >= HOMOPHILY_LIFT_MIN && directRow.ratio != null && directRow.ratio >= HOMOPHILY_RATIO_MIN);
  const anyShared2hopHomophilous = rows.some((r) => r.mode === "shared" && r.lift != null && r.lift >= HOMOPHILY_LIFT_MIN && r.ratio != null && r.ratio >= HOMOPHILY_RATIO_MIN);
  const verdict = directHomophilous
    ? "EDGES-CARRY-CLASS-SIGNAL"
    : anyShared2hopHomophilous
      ? "ONLY-2HOP-HOMOPHILOUS"
      : "EDGES-CLASS-AGNOSTIC";

  if (asJson) {
    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(),
      singleClassEngines: stemToClass.size,
      globalNull,
      rows,
      verdict,
      directHomophilous,
      anyShared2hopHomophilous,
    }, null, 2));
    return 0;
  }

  console.log("measure-edge-class-homophily -- per-edge-type dispatcher-class homophily (leak-free engine<->engine)");
  console.log(`  single-class engines: ${stemToClass.size}  | global random-pair null: ${fmt(globalNull)}`);
  console.log("  (action-engine edges EXCLUDED -- the dispatcher endpoint IS the class label, leaks the ghost target)");
  console.log("");
  console.log("  type            mode    edges   pairs  sameClass   ratio   null    lift   participants");
  for (const r of rows) {
    console.log(
      `  ${r.type.padEnd(14)} ${r.mode.padEnd(6)} ${String(r.edges).padStart(6)} ${String(r.pairs).padStart(7)} ${String(r.sameClass).padStart(10)}  ${fmt(r.ratio).padStart(6)} ${fmt(r.baseline).padStart(6)} ${fmt(r.lift).padStart(6)}   ${r.participantCount}`
      + (r.mode === "shared" ? `  (sharedIntermediates=${r.sharedIntermediates})` : "")
    );
  }
  console.log("");
  console.log(`  VERDICT: ${verdict}`);
  if (verdict === "EDGES-CARRY-CLASS-SIGNAL") {
    console.log("    direct engine_import edges are HOMOPHILOUS (lift >= 1.5, ratio >= 0.4) -> message-passing over them");
    console.log("    would add dispatcher-class signal. NEXT UNIT: wire a message-passing classification path and");
    console.log("    measure it vs the deployed direct-embed cosine k-NN.");
  } else if (verdict === "ONLY-2HOP-HOMOPHILOUS") {
    console.log("    direct import edges are NOT homophilous, but a 2-hop shared-intermediate type is -> a 2-layer");
    console.log("    SAGE (or an explicit shared-intermediate edge) could help; direct 1-hop import edges would not.");
  } else {
    console.log("    engine<->engine edges are ~class-agnostic (lift ~ 1) -> vanilla message-passing would AVERAGE IN");
    console.log("    cross-class noise, not add signal. Direct-embed cosine k-NN is at the structural ceiling. The");
    console.log("    remaining leg-#10 levers are ref-pool growth (domain-owner labeling) / a different embedding");
    console.log("    model -- NOT a node-feature and NOT a vanilla-SAGE edges build. (Consistent with the heterophily");
    console.log("    machinery shipping default-off and the per-node-feature ceiling at 23/43 @ 0.0527.)");
  }
  return 0;
}

const isMain = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (isMain) process.exit(main());
