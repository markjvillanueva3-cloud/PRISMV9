/**
 * cross-substrate-edge-schema.mjs — typed, ADD-only edge contract for the PRISM
 * cross-substrate synergy spine (CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-EDGE-SCHEMA, slot:sierra).
 *
 * The system-viz graph (~548MB) is the fleet search substrate, but its nodes
 * (engines, dispatchers, hooks) are only weakly linked to the OTHER PSN
 * substrates: the Obsidian brain (memories), the wiki, the Hermes slot fleet,
 * and the PRISM-AI consensus layer. This module defines the *typed edge*
 * vocabulary that lets a node in one substrate be discovered/reached from
 * another — the "connect every node to all logical combinations" ask, made
 * finite and falsifiable rather than an O(V^2) soup.
 *
 * Design invariants (per brainstorm-path-forward synthesis 2026-06-03):
 *  - TYPED whitelist only — untyped/freeform edges are rejected, so the
 *    combinatorial space stays bounded and reviewable.
 *  - PROVENANCE required — every edge carries {source, confidence, addedBy,
 *    addedAt}. A low-confidence inference (e.g. GNN tier-5 at AUROC~0.5) can
 *    therefore never be mistaken for ground truth by a downstream consumer.
 *  - ADD-ONLY — assertAddOnly() refuses any merge that DROPS an existing edge.
 *    Closure that "prunes redundant edges" is a deletion and is blocked here,
 *    mirroring the stop_on_content_deletion / leave-a-copy-behind-guard
 *    doctrine for the live graph.
 *
 * Pure module — no FS, no Date.now() (caller supplies addedAt) — so it is
 * trivially testable and safe to import from any edge generator or from the
 * single-writer merge step.
 */

export const SCHEMA_VERSION = "1.0.0";

// Canonical typed-edge whitelist. Each edge maps a node in one PSN substrate to
// a node in another. Extend deliberately — a new type is a schema decision
// (documented in CROSS-SUBSTRATE-SYNERGY-BOUNDED.md), never a freeform string.
export const EDGE_TYPES = Object.freeze({
  "documented-by": {
    desc: "engine/galaxy graph node <- the memory or wiki note that documents it",
    from: "graph-node", // engine / dispatcher / galaxy id
    to: "knowledge-note", // memory or wiki slug
  },
  "owned-by-slot": {
    desc: "graph node / galaxy <- the NATO slot whose soul owns its domain",
    from: "graph-node",
    to: "slot", // alpha..zulu
  },
  embeds: {
    desc: "node <- the embedding vector / index entry that represents it",
    from: "graph-node",
    to: "embedding",
  },
  "consensus-of": {
    desc: "decision/answer node <- the multi-model consensus that produced it",
    from: "decision-node",
    to: "consensus-ledger-entry",
  },
});

export const ALLOWED_TYPES = Object.freeze(Object.keys(EDGE_TYPES));

export const MIN_CONFIDENCE = 0;
export const MAX_CONFIDENCE = 1;

/** Canonical de-dup key for an edge: from|type|to (direction-significant). */
export function edgeKey(edge) {
  if (!edge || typeof edge !== "object") return null;
  const { from, type, to } = edge;
  if (!from || !type || !to) return null;
  return `${from}${type}${to}`;
}

/**
 * Validate one edge against the typed schema. Returns {valid, errors:[]}.
 * Never throws — use assertValidEdge for the fail-loud variant.
 */
export function validateEdge(edge) {
  const errors = [];
  if (!edge || typeof edge !== "object" || Array.isArray(edge)) {
    return { valid: false, errors: ["edge is not an object"] };
  }
  const { from, to, type, source, confidence, addedBy, addedAt } = edge;

  if (typeof from !== "string" || from.length === 0) errors.push("from: non-empty string required");
  if (typeof to !== "string" || to.length === 0) errors.push("to: non-empty string required");
  if (typeof type !== "string" || !ALLOWED_TYPES.includes(type)) {
    errors.push(`type: must be one of [${ALLOWED_TYPES.join(", ")}] (got ${JSON.stringify(type)})`);
  }
  if (typeof from === "string" && typeof to === "string" && from.length > 0 && from === to) {
    errors.push("self-loop: from === to is not a cross-substrate edge");
  }

  // provenance — the load-bearing half of the contract
  if (typeof source !== "string" || source.length === 0) errors.push("source: non-empty provenance string required");
  if (
    typeof confidence !== "number" ||
    Number.isNaN(confidence) ||
    confidence < MIN_CONFIDENCE ||
    confidence > MAX_CONFIDENCE
  ) {
    errors.push(`confidence: number in [${MIN_CONFIDENCE},${MAX_CONFIDENCE}] required (got ${JSON.stringify(confidence)})`);
  }
  if (typeof addedBy !== "string" || addedBy.length === 0) errors.push("addedBy: non-empty string required");
  if (typeof addedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(addedAt)) {
    errors.push("addedAt: ISO-8601 timestamp string required");
  }

  return { valid: errors.length === 0, errors };
}

/** Fail-loud variant — throws on an invalid edge. Returns the edge on success. */
export function assertValidEdge(edge) {
  const { valid, errors } = validateEdge(edge);
  if (!valid) throw new Error(`invalid cross-substrate edge: ${errors.join("; ")} | edge=${JSON.stringify(edge)}`);
  return edge;
}

/**
 * Validate a batch. Returns {valid, errors:[{index,errors}], validEdges, duplicates}.
 * Dedups by edgeKey (keeps first occurrence), reports duplicate indices. Never throws.
 */
export function validateEdgeBatch(edges) {
  if (!Array.isArray(edges)) {
    return { valid: false, errors: [{ index: -1, errors: ["batch is not an array"] }], validEdges: [], duplicates: [] };
  }
  const errors = [];
  const seen = new Set();
  const validEdges = [];
  const duplicates = [];
  edges.forEach((edge, index) => {
    const res = validateEdge(edge);
    if (!res.valid) {
      errors.push({ index, errors: res.errors });
      return;
    }
    const key = edgeKey(edge);
    if (seen.has(key)) {
      duplicates.push(index);
      return;
    }
    seen.add(key);
    validEdges.push(edge);
  });
  return { valid: errors.length === 0, errors, validEdges, duplicates };
}

/**
 * ADD-only guard. Given the edge keys that already exist and the proposed
 * post-merge keys, throw if ANY existing key is missing from the proposal
 * (i.e. a deletion). Returns {added, addedCount} on success. Accepts Set or
 * iterable for both arguments.
 */
export function assertAddOnly(existingKeys, proposedKeys) {
  const existing = existingKeys instanceof Set ? existingKeys : new Set(existingKeys || []);
  const proposed = proposedKeys instanceof Set ? proposedKeys : new Set(proposedKeys || []);
  const dropped = [];
  for (const k of existing) if (!proposed.has(k)) dropped.push(k);
  if (dropped.length > 0) {
    throw new Error(
      `ADD-only violation: ${dropped.length} existing edge(s) would be dropped (e.g. ${dropped.slice(0, 3).join(", ")}). Cross-substrate overlays are append-only.`,
    );
  }
  const added = [];
  for (const k of proposed) if (!existing.has(k)) added.push(k);
  return { added, addedCount: added.length };
}

/**
 * Edge-type DRIFT/COLLAPSE detector (U-XSUB-DRIFT-DETECT, slot:sierra). Compares
 * the current per-type edge counts against the last-known-good baseline and flags
 * a sharp unexpected drop -- the exact silent-collapse class that left
 * `documented-by` at 0 for ~8h undetected (it confirmed against a volatile source).
 * This makes the spine SELF-MONITORING: a future collapse trips a loud signal on
 * the very run it happens, instead of going unnoticed until a test or a human reads
 * the graph.
 *
 * Pure -- no FS, no Date. Caller supplies baseline + current count maps.
 *   detected: any drop >= dropThreshold (default 0.4 = 40%) OR a type going to 0.
 *   severity: "collapse" when current===0 (or drop >= 0.9), else "drift".
 * A type ABSENT from the baseline is never flagged (new edge types are not drift).
 * A baseline type of 0/non-number is skipped (cannot drop from nothing).
 */
export function detectEdgeDrift(baseline, current, opts = {}) {
  const dropThreshold = typeof opts.dropThreshold === "number" ? opts.dropThreshold : 0.4;
  const cur = current && typeof current === "object" ? current : {};
  if (!baseline || typeof baseline !== "object") {
    return { detected: false, events: [], reason: "no-baseline" };
  }
  const events = [];
  for (const [type, base] of Object.entries(baseline)) {
    if (typeof base !== "number" || base <= 0) continue;
    const now = typeof cur[type] === "number" && !Number.isNaN(cur[type]) ? cur[type] : 0;
    if (now >= base) continue; // grew or held -- healthy
    const dropPct = (base - now) / base;
    if (now === 0) {
      events.push({ type, baseline: base, current: 0, dropPct: 1, severity: "collapse" });
    } else if (dropPct >= dropThreshold) {
      events.push({
        type,
        baseline: base,
        current: now,
        dropPct: Math.round(dropPct * 1000) / 1000,
        severity: dropPct >= 0.9 ? "collapse" : "drift",
      });
    }
  }
  return { detected: events.length > 0, events };
}
