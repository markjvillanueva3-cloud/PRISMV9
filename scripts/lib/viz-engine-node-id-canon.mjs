#!/usr/bin/env node
/**
 * viz-engine-node-id-canon.mjs — canonicalize `engine.<ClassName>` edge targets
 * to the merged-graph engine node id `eng.<domain>.<name>` at assembly time.
 *
 * BACKGROUND (the second G4 dead-edge class, sierra):
 * Several producers emit graph edges to `engine.<ClassName>` (PascalCase) — the
 * scheme minted by `engine-node-extractor.mjs` (NN-GRAPH-MS0), which is wired
 * ONLY into `regen-graph-normalized.mjs`, NOT the live regen-viz FAST[] pipeline.
 * So in the merged `system-graph.json` there are ZERO `engine.<Pascal>` nodes —
 * every such edge target is dead (~10.3K dead edges, e.g. the pdf-course bridge's
 * feeds-training edges to `engine.AIResourceLearningEngine`). The live per-engine
 * nodes use the lowercase, domain-qualified id `eng.<domain>.<name>`.
 *
 * A producer cannot resolve this itself — `engine.<Class>` → `eng.<domain>.<name>`
 * needs the live node set, and the domain is only known from the assembled graph.
 * `merge-augmentations.mjs` is the ONLY place that holds the full post-merge node
 * set in memory (and is the SINGLE writer of system-graph.json — a separate
 * rewriting script would violate one-writer-per-path). So the remap lives there.
 *
 * SAFETY INVARIANT (alias-gated, NOT prefix-gated): an `engine.<X>` endpoint is
 * rewritten ONLY when `X.toLowerCase()` matches an existing `eng.<domain>.<name>`
 * node's last segment. A handful of non-engine ghost/loop/vault nodes also carry
 * an `engine.` prefix (e.g. `engine.validate-command-frontmatter`) — but real
 * engine class names are CamelCase→lowercase with no hyphens, so a kebab-case
 * ghost id can never collide with one, and none of those ghost ids has an `eng.*`
 * alias anyway. So the remap only ever turns a dead `engine.<ClassName>` target
 * into a live `eng.*` node — nothing live is repointed. An `engine.*` endpoint
 * with no alias is left unchanged (a genuinely-missing engine — an honest dead
 * pixel, R12). Reverts exactly with PRISM_VIZ_ENGINE_CANON_DISABLE=1.
 *
 * Pure-export contract (no top-level side effects):
 *   buildEngineAliasIndex(nodes) → Map<lowerClassName, canonicalEngNodeId>
 *   canonicalizeEngineEdgeTargets(graph) → { remapped, dropped, unresolved, distinctMissing }
 *       (mutates graph.edges in place: rewrites engine.* endpoints, drops a remap
 *        that would exactly duplicate an existing edge)
 *
 * @milestone SYSTEM-VIZ-FS-COVERAGE / U-VIZ-G4-DEAD-EDGE-ENG
 * @slot sierra
 */

import { mcpToolToDispNodeId } from "./viz-dispatcher-node-id.mjs";

const ENG_PREFIX = "eng.";
const ENGINE_PREFIX = "engine.";
const DISPATCHER_PREFIX = "dispatcher.";
const DISP_PREFIX = "disp.";

/** True for the L5 domain-CLUSTER nodes (`eng.other`, `eng.mill`) — 2 segments;
 *  real per-engine nodes are `eng.<domain>.<name>` (≥3 segments). */
function isPerEngineId(id) {
  if (typeof id !== "string" || !id.startsWith(ENG_PREFIX)) return false;
  return id.split(".").length >= 3;
}

function isOtherDomain(id) {
  return id.startsWith("eng.other.") ? 1 : 0;
}

/**
 * Build a deterministic lowercase-class-name → canonical engine-node-id index
 * from the graph's `eng.<domain>.<name>` nodes.
 *
 * The same engine class can appear under multiple domains (e.g.
 * `eng.calc.kienzleforcemodelengine`, `eng.physics.…`, `eng.other.…`) and as a
 * nested sub-engine (`eng.ai.agenticloopengine.airesourcelearningengine`). The
 * pick is deterministic and stable:
 *   1. fewest segments (prefer a top-level `eng.<domain>.<name>` over a nested one)
 *   2. then a non-`eng.other` domain (a named domain beats the catch-all)
 *   3. then lexicographically smallest id (total order — never order-dependent)
 * Picking ANY real node for that engine turns the edge from dead → live; the
 * ordering only makes the choice reproducible across runs.
 */
export function buildEngineAliasIndex(nodes) {
  const byName = new Map(); // lowerClassName → [{ id, nseg }]
  for (const n of nodes || []) {
    const id = n && n.id;
    if (!isPerEngineId(id)) continue;
    const segs = id.split(".");
    const last = segs[segs.length - 1];
    if (!last) continue;
    let arr = byName.get(last);
    if (!arr) { arr = []; byName.set(last, arr); }
    arr.push({ id, nseg: segs.length });
  }
  const out = new Map();
  for (const [name, cands] of byName) {
    cands.sort((a, b) =>
      a.nseg - b.nseg ||
      isOtherDomain(a.id) - isOtherDomain(b.id) ||
      a.id.localeCompare(b.id));
    out.set(name, cands[0].id);
  }
  return out;
}

/** Canonical edge identity (mirrors merge-augmentations' edgeKey). */
function edgeKey(e) {
  return `${e.from || e.source}|${e.to || e.target}|${e.type ?? ""}`;
}

const ENDPOINT_FIELDS = ["from", "source", "to", "target"];

/**
 * Rewrite every `engine.<ClassName>` edge endpoint to its canonical
 * `eng.<domain>.<name>` node id. Mutates `graph.edges` in place. A remapped edge
 * that would exactly duplicate an already-present edge is dropped (so the remap
 * never inflates the edge set). Endpoints whose class has no alias are left as-is.
 *
 * @returns {{ remapped:number, dropped:number, unresolved:number, distinctMissing:number }}
 *   remapped  — edges with ≥1 endpoint rewritten and kept
 *   dropped   — remapped edges removed because they collided with an existing edge
 *   unresolved— engine.* endpoints with no `eng.*` alias (genuinely-missing engines)
 *   distinctMissing — distinct missing class names (the honest dead-pixel residue)
 */
export function canonicalizeEngineEdgeTargets(graph) {
  const nodes = (graph && graph.nodes) || [];
  const edges = (graph && graph.edges) || [];
  const alias = buildEngineAliasIndex(nodes);

  const seen = new Set(edges.map(edgeKey));
  const distinctMissing = new Set();
  let remapped = 0, dropped = 0, unresolved = 0;
  // `keep` is allocated lazily — only once a drop actually happens — so the
  // common no-drop path never builds a ~1M-ref duplicate array at the peak
  // merge-memory moment (the SIGKILL-prone regime, [[reference_u_regen_viz_merge_faillod]]).
  let keep = null;

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    let changed = false;
    for (const f of ENDPOINT_FIELDS) {
      const v = e[f];
      if (typeof v !== "string" || !v.startsWith(ENGINE_PREFIX)) continue;
      const cls = v.slice(ENGINE_PREFIX.length).toLowerCase();
      const canon = alias.get(cls);
      if (canon) { e[f] = canon; changed = true; }
      else { unresolved++; distinctMissing.add(cls); }
    }
    if (changed) {
      const k = edgeKey(e);
      if (seen.has(k)) {                 // remap would duplicate an existing edge
        if (keep === null) keep = edges.slice(0, i); // first drop → snapshot survivors
        dropped++;
        continue;
      }
      seen.add(k);
      remapped++;
    }
    if (keep !== null) keep.push(e);
  }

  if (keep !== null && graph) graph.edges = keep;
  return { remapped, dropped, unresolved, distinctMissing: distinctMissing.size };
}

/**
 * Unified single-pass canonicalization of BOTH `engine.<ClassName>` AND
 * `dispatcher.<mcp_tool>` edge targets. Used by merge-augmentations (one loop
 * over ~1M edges instead of two — the merge runs at peak memory).
 *
 * WHY dispatcher canon is needed at merge (not just at the producer):
 * the merged system-graph.json is CUMULATIVE — merge reads the persistent graph,
 * adds augmentation edges (dedup by key), and never removes stale-target edges.
 * So fixing a producer to emit `disp.*` only affects NEW edges; the ~2.7K
 * `dispatcher.prism_*` edges already accumulated from prior merges persist
 * forever. This pass rewrites them in the assembled graph.
 *
 *   - engine.<X>     → eng.<domain>.<name>  via the graph-derived alias index
 *                      (alias-gated → strictly dead→live; see above).
 *   - dispatcher.<X> → disp.<file-id>       via mcpToolToDispNodeId (static SSOT
 *                      table), but ONLY when the resolved disp.* node actually
 *                      EXISTS in the graph (node-existence-gated). A dispatcher
 *                      with no node (e.g. dispatcher.prism_shop → disp.prism_shop)
 *                      is left unchanged — an honest dead pixel (R12), never a
 *                      newly-minted dead target.
 *
 * A remapped edge that would exactly duplicate an existing edge is dropped (the
 * common case once the producer ALSO emits the canonical form — the old
 * dispatcher.* edge remaps onto the new disp.* edge's key and is de-duplicated).
 * Mutates graph.edges in place.
 *
 * @returns {{ engRemapped:number, dispRemapped:number, dropped:number,
 *             engUnresolved:number, dispUnresolved:number,
 *             distinctEngMissing:number, distinctDispMissing:number }}
 *   *Remapped counts are ENDPOINT-level (an edge with 2 remappable endpoints
 *   counts 2); dropped is EDGE-level.
 */
export function canonicalizeGraphEdgeTargets(graph) {
  const nodes = (graph && graph.nodes) || [];
  const edges = (graph && graph.edges) || [];
  const alias = buildEngineAliasIndex(nodes);
  const nodeIds = new Set();
  for (const n of nodes) { const id = n && n.id; if (typeof id === "string") nodeIds.add(id); }

  const seen = new Set(edges.map(edgeKey));
  const engMissing = new Set(), dispMissing = new Set();
  let engRemapped = 0, dispRemapped = 0, dropped = 0, engUnresolved = 0, dispUnresolved = 0;
  let bareEngRemapped = 0, bareDispRemapped = 0;
  let keep = null;

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    let changed = false;
    for (const f of ENDPOINT_FIELDS) {
      const v = e[f];
      if (typeof v !== "string") continue;
      if (v.startsWith(ENGINE_PREFIX)) {
        const cls = v.slice(ENGINE_PREFIX.length).toLowerCase();
        const canon = alias.get(cls);
        if (canon) { e[f] = canon; changed = true; engRemapped++; }
        else { engUnresolved++; engMissing.add(cls); }
      } else if (v.startsWith(DISPATCHER_PREFIX)) {
        const canon = mcpToolToDispNodeId(v.slice(DISPATCHER_PREFIX.length));
        if (canon !== v && nodeIds.has(canon)) { e[f] = canon; changed = true; dispRemapped++; }
        else { dispUnresolved++; dispMissing.add(v); }
      } else if (v.startsWith(ENG_PREFIX) && !nodeIds.has(v)) {
        // Already eng.-prefixed but MISSING — the wrong/stale domain (e.g.
        // `eng.other.agenticloopengine` when the real node is `eng.ai.…`). Re-resolve
        // by last segment to the canonical eng.* node (invokes/covers/engine_import
        // mis-domain class). NB: `engine.` is checked first above, so this only sees
        // the `eng.<domain>.<name>` form. Counted under engRemapped (any-form engine).
        const seg = v.split(".").pop();
        const canon = alias.get(seg);
        if (canon && canon !== v) { e[f] = canon; changed = true; engRemapped++; }
        else { engUnresolved++; engMissing.add(seg); }
      } else if (v.startsWith(DISP_PREFIX) && !nodeIds.has(v)) {
        // Already disp.-prefixed but MISSING — wrong name (e.g. `disp.prism_data`
        // instead of the file-derived `disp.datadispatcher`). Re-resolve via the MCP
        // table (prepending prism_ for a bare suffix). `dispatcher.` does NOT match
        // DISP_PREFIX (the 5th char differs), so no overlap with the branch above.
        const x = v.slice(DISP_PREFIX.length);
        const canon = mcpToolToDispNodeId(x.startsWith("prism_") ? x : "prism_" + x);
        if (canon !== v && nodeIds.has(canon)) { e[f] = canon; changed = true; dispRemapped++; }
        else { dispUnresolved++; dispMissing.add(v); }
      }
    }
    // Bare-name targets on the extracted-modules edge types (NO engine./dispatcher.
    // prefix): bridge_to_existing → matched_engine (bare PascalCase class name),
    // wire_target → recommended_dispatcher (bare prism_*). EDGE-TYPE-GATED so an
    // unrelated bare-name endpoint is never touched; same dead→live + existence gate
    // (engine alias values are by construction existing node ids; disp goes through
    // the node-existence check). Fixes the G4 id-scheme class for the producer
    // generate-extracted-modules-detail-features.mjs which emits bare names.
    const etype = typeof e.type === "string" ? e.type : (typeof e.kind === "string" ? e.kind : "");
    if (etype === "bridge_to_existing" || etype === "wire_target") {
      const tf = typeof e.to === "string" ? "to" : (typeof e.target === "string" ? "target" : null);
      const v = tf ? e[tf] : null;
      if (v && !nodeIds.has(v) && !v.startsWith(ENGINE_PREFIX) && !v.startsWith(DISPATCHER_PREFIX)) {
        if (etype === "bridge_to_existing") {
          const canon = alias.get(v.toLowerCase());
          if (canon) { e[tf] = canon; changed = true; bareEngRemapped++; }
        } else {
          const canon = mcpToolToDispNodeId(v);
          if (canon !== v && nodeIds.has(canon)) { e[tf] = canon; changed = true; bareDispRemapped++; }
        }
      }
    }
    if (changed) {
      const k = edgeKey(e);
      if (seen.has(k)) { if (keep === null) keep = edges.slice(0, i); dropped++; continue; }
      seen.add(k);
    }
    if (keep !== null) keep.push(e);
  }

  if (keep !== null && graph) graph.edges = keep;
  return {
    engRemapped, dispRemapped, dropped, engUnresolved, dispUnresolved,
    bareEngRemapped, bareDispRemapped,
    distinctEngMissing: engMissing.size, distinctDispMissing: dispMissing.size,
  };
}
