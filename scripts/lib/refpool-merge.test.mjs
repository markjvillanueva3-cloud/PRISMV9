// scripts/lib/refpool-merge.test.mjs -- shared GNN ref-pool merge (R15 build-once)
import { test } from "node:test";
import assert from "node:assert/strict";
import { ghostContentEqual, mergeGhostsIntoGraph } from "./refpool-merge.mjs";
import { mergeVaultGhosts, nodeContentEqual } from "../vault-to-gnn-refpool.mjs";

// Outcome feeder field set (mirrors OUTCOME_CONTENT_FIELDS in ghost-wire-outcomes-to-refpool.mjs).
// The outcome feeder does not export its local outcomeContentEqual, so we replicate the field list
// here to drive ghostContentEqual directly -- same field set, no duplication of logic.
const OUTCOME_CONTENT_FIELDS = ["proposed_wiring", "confidence", "info", "reason", "sourceLedger", "label", "kind"];
const outcomeEq = (a, b) => ghostContentEqual(a, b, OUTCOME_CONTENT_FIELDS);

const FIELDS = ["proposed_wiring", "confidence", "label", "kind"];
const eq = (a, b) => ghostContentEqual(a, b, FIELDS);
const ghost = (id, w, at) => ({
  node: { id, label: "E", kind: "k", proposed_wiring: w, confidence: 0.85, proposed_at: at },
  edge: { from: id, to: `mcp.${w}`, type: "ghost-wire" },
});

test("ghostContentEqual -- true when only an unlisted (volatile) field differs", () => {
  const a = { proposed_wiring: "prism_calc", confidence: 0.85, label: "E", kind: "k", proposed_at: "t1" };
  assert.equal(ghostContentEqual(a, { ...a, proposed_at: "t2" }, FIELDS), true);
});

test("ghostContentEqual -- false when a listed field differs", () => {
  const a = { proposed_wiring: "prism_calc", confidence: 0.85, label: "E", kind: "k" };
  assert.equal(ghostContentEqual(a, { ...a, proposed_wiring: "prism_dev" }, FIELDS), false);
  assert.equal(ghostContentEqual(a, { ...a, confidence: 0.5 }, FIELDS), false);
});

test("ghostContentEqual -- false (no throw) for null/undefined", () => {
  assert.equal(ghostContentEqual(null, {}, FIELDS), false);
  assert.equal(ghostContentEqual({}, undefined, FIELDS), false);
});

test("mergeGhostsIntoGraph -- adds a new node + edge (changed)", () => {
  const g = { nodes: [], edges: [] };
  const r = mergeGhostsIntoGraph(g, [ghost("g.E", "prism_calc", "t1")], eq);
  assert.equal(r.nodesAdded, 1);
  assert.equal(r.changed, true);
  assert.equal(g.nodes.length, 1);
  assert.equal(g.edges.length, 1);
});

test("mergeGhostsIntoGraph -- NO-OP when only proposed_at differs (the durability invariant)", () => {
  const p = ghost("g.E", "prism_calc", "t1");
  const g = { nodes: [p.node], edges: [p.edge] };
  const r = mergeGhostsIntoGraph(g, [ghost("g.E", "prism_calc", "t2-LATER")], eq);
  assert.equal(r.changed, false, "unchanged ref-pool must not trigger a write");
  assert.deepEqual([r.nodesAdded, r.nodesUpdated, r.edgesAdded], [0, 0, 0]);
  assert.equal(g.nodes.length, 1, "no duplicate node");
  assert.equal(g.nodes[0].proposed_at, "t1", "existing node kept -- NOT re-stamped");
});

test("mergeGhostsIntoGraph -- UPDATES when a significant field changed", () => {
  const p = ghost("g.E", "prism_calc", "t1");
  const g = { nodes: [p.node], edges: [p.edge] };
  const r = mergeGhostsIntoGraph(g, [ghost("g.E", "prism_dev", "t2")], eq);
  assert.equal(r.nodesUpdated, 1);
  assert.equal(r.changed, true);
  assert.equal(g.nodes[0].proposed_wiring, "prism_dev");
});

test("mergeGhostsIntoGraph -- ADD-only adds a missing edge even when the node is content-equal", () => {
  const p = ghost("g.E", "prism_calc", "t1");
  const g = { nodes: [p.node], edges: [] };
  const r = mergeGhostsIntoGraph(g, [ghost("g.E", "prism_calc", "t2")], eq);
  assert.equal(r.nodesUpdated, 0);
  assert.equal(r.edgesAdded, 1);
  assert.equal(r.changed, true);
});

test("mergeGhostsIntoGraph -- tolerates a ghost with no edge (node-only)", () => {
  const g = { nodes: [], edges: [] };
  const r = mergeGhostsIntoGraph(g, [{ node: { id: "g.E", proposed_wiring: "prism_calc", confidence: 0.85, label: "E", kind: "k" } }], eq);
  assert.equal(r.nodesAdded, 1);
  assert.equal(r.edgesAdded, 0);
  assert.equal(r.changed, true);
});

test("mergeGhostsIntoGraph -- empty ghost list -> changed:false (nothing to write)", () => {
  const r = mergeGhostsIntoGraph({ nodes: [], edges: [] }, [], eq);
  assert.equal(r.changed, false);
});

// ---- 4 required behavioral tests (U-INDIA-REFPOOL-MERGE-LIB plan) ----

// Helper: build a minimal vault-shaped ghost node + edge (matches vault feeder's VAULT_CONTENT_FIELDS).
function vaultGhost(engine, dispatcher, at = "2026-01-01T00:00:00.000Z") {
  const id = `ghost.vault-wired.${engine}`;
  return {
    node: {
      id,
      layer: "L13",
      subgroup: "unwired-engine",
      label: engine,
      info: `Vault-confirmed wiring: ${dispatcher} (confidence 0.85, vault: 'wired into' confirmation, src test.md)`,
      status: "proposed",
      size: 4,
      tier: 2,
      kind: "ghost.unwired-engine",
      ghost: true,
      proposed_at: at,
      proposed_by: "vault-to-gnn-refpool.mjs",
      proposed_wiring: dispatcher,
      confidence: 0.85,
      reason: "vault: 'wired into' confirmation",
      sourceMemory: "test.md",
    },
    edge: { from: id, to: `mcp.${dispatcher}`, type: "ghost-wire", relation: "proposed-wire", status: "proposed", intensity: 0.85 },
  };
}

// Helper: build a minimal outcome-shaped ghost node + edge (matches outcome feeder's OUTCOME_CONTENT_FIELDS).
function outcomeGhost(engine, dispatcher, at = "2026-01-01T00:00:00.000Z") {
  const id = `ghost.outcome-wired.${engine}`;
  return {
    node: {
      id,
      layer: "L13",
      subgroup: "unwired-engine",
      label: engine,
      info: `Confirmed ghost-wire outcome: ${dispatcher} (confidence 0.85, validated correct, src ghost-wire-outcomes.jsonl)`,
      status: "proposed",
      size: 4,
      tier: 2,
      kind: "ghost.unwired-engine",
      ghost: true,
      proposed_at: at,
      proposed_by: "ghost-wire-outcomes-to-refpool.mjs",
      proposed_wiring: dispatcher,
      confidence: 0.85,
      reason: "ghost-wire-outcome: validation confirmed",
      sourceLedger: "ghost-wire-outcomes.jsonl",
    },
    edge: { from: id, to: `mcp.${dispatcher}`, type: "ghost-wire", relation: "proposed-wire", status: "proposed", intensity: 0.85 },
  };
}

// Test 1: Vault feeder -- idempotent apply via exported mergeVaultGhosts + nodeContentEqual.
// A re-apply of an UNCHANGED vault ghost must be a true no-op (changed:false, no re-stamp).
// This is the drift-gate mitigation: periodic/post-regen re-applies must not churn the 542MB graph.
test("mergeVaultGhosts (vault feeder) -- idempotent re-apply of unchanged ghost is a no-op", () => {
  const p = vaultGhost("FooEngine", "prism_calc", "t1");
  const g = { nodes: [{ ...p.node }], edges: [{ ...p.edge }] };
  // Re-apply identical ghost but with a different proposed_at (volatile field -- must not trigger update)
  const newer = vaultGhost("FooEngine", "prism_calc", "t2-LATER");
  const r = mergeVaultGhosts(g, [newer]);
  assert.equal(r.changed, false, "unchanged vault ref must not trigger a graph write");
  assert.deepEqual([r.nodesAdded, r.nodesUpdated, r.edgesAdded], [0, 0, 0]);
  assert.equal(g.nodes[0].proposed_at, "t1", "existing vault node must NOT be re-stamped");
  assert.equal(g.nodes.length, 1, "no duplicate node injected");
});

// Test 2: Outcome feeder -- idempotent apply via mergeGhostsIntoGraph + outcomeEq.
// Same invariant as Test 1 but for the outcome feeder's field set (sourceLedger vs sourceMemory).
// A re-apply of an UNCHANGED outcome ghost must also be a true no-op (changed:false).
test("mergeGhostsIntoGraph (outcome feeder fields) -- idempotent re-apply of unchanged ghost is a no-op", () => {
  const p = outcomeGhost("BarEngine", "prism_dev", "t1");
  const g = { nodes: [{ ...p.node }], edges: [{ ...p.edge }] };
  const newer = outcomeGhost("BarEngine", "prism_dev", "t2-LATER");
  const r = mergeGhostsIntoGraph(g, [newer], outcomeEq);
  assert.equal(r.changed, false, "unchanged outcome ref must not trigger a graph write");
  assert.deepEqual([r.nodesAdded, r.nodesUpdated, r.edgesAdded], [0, 0, 0]);
  assert.equal(g.nodes[0].proposed_at, "t1", "existing outcome node must NOT be re-stamped");
  assert.equal(g.nodes.length, 1, "no duplicate node injected");
});

// Test 3: Key collision -- same engine appearing twice in a ghost list.
// First-seen dispatcher wins; the second entry (different dispatcher) must be rejected
// by the id-keyed merge (same id = update path, NOT a new insert). The conflict is detected
// by the caller (collectVaultWirings/extractConfirmedOutcomes) before ghosts are built, but
// the merge layer itself must not accidentally duplicate a node when two ghosts share an id.
test("mergeGhostsIntoGraph -- collision on key: two ghosts with same id -> no duplicate, second updates in place", () => {
  const g = { nodes: [], edges: [] };
  const first = vaultGhost("ColEngine", "prism_calc", "t1");
  // Second ghost has same engine -> same id but different dispatcher (significant field change).
  const secondNode = { ...first.node, proposed_wiring: "prism_dev", info: "different dispatcher", proposed_at: "t2" };
  const secondEdge = { ...first.edge, to: "mcp.prism_dev" };
  const r = mergeGhostsIntoGraph(g, [first, { node: secondNode, edge: secondEdge }], (a, b) => nodeContentEqual(a, b));
  // First ghost inserted as ADD; second is an UPDATE (significant field proposed_wiring differs).
  assert.equal(r.nodesAdded, 1, "only one node added (the first)");
  assert.equal(r.nodesUpdated, 1, "second ghost (different dispatcher) triggers an in-place update");
  assert.equal(g.nodes.length, 1, "no duplicate: still exactly one node for this engine id");
  assert.equal(g.nodes[0].proposed_wiring, "prism_dev", "in-place update applied the second dispatcher");
});

// Test 4: Confidence-update -- a re-apply where ONLY the confidence changes (a significant field).
// The old node must be UPDATED (replaced), NOT preserved: confidence is in VAULT_CONTENT_FIELDS,
// so a higher-confidence re-classification must propagate. The old confidence must NOT survive.
test("mergeVaultGhosts -- confidence change (significant field) updates node; old confidence does not survive", () => {
  const p = vaultGhost("ConfEngine", "prism_ai", "t1");
  const g = { nodes: [{ ...p.node }], edges: [{ ...p.edge }] };
  // Re-apply with a raised confidence (e.g. after post-ship+test-verified upgrade).
  const raised = {
    ...p,
    node: {
      ...p.node,
      confidence: 0.92,
      info: `Vault-confirmed wiring: prism_ai (confidence 0.92, vault: 'wired into' confirmation, src test.md)`,
      proposed_at: "t2",
    },
  };
  const r = mergeVaultGhosts(g, [raised]);
  assert.equal(r.nodesUpdated, 1, "confidence change (significant field) must trigger an in-place update");
  assert.equal(r.changed, true);
  assert.equal(g.nodes[0].confidence, 0.92, "raised confidence must be written to the graph node");
  assert.notEqual(g.nodes[0].confidence, 0.85, "old (lower) confidence must not survive a re-apply");
  assert.equal(g.nodes.length, 1, "no duplicate node");
});
