// scripts/ghost-wire-outcomes-to-refpool.test.mjs
// Tests for U-GHOST-OUTCOME-REFPOOL: confirmed ghost-wire outcomes -> GNN reference pool.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractConfirmedOutcomes,
  buildGhostFromOutcome,
  shouldReexecForHeap,
} from "./ghost-wire-outcomes-to-refpool.mjs";

const row = (o) => JSON.stringify(o);

describe("extractConfirmedOutcomes", () => {
  it("extracts ONLY confirmed rows with a valid dispatcher (ground truth)", () => {
    const text = [
      row({ engineName: "FooEngine", proposedWiring: "prism_calc", validation: { status: "confirmed" } }),
      row({ engineName: "BarEngine", proposedWiring: "prism_cam", validation: { status: "pending" } }), // not confirmed
      row({ engineName: "BazEngine", proposedWiring: "not_a_dispatcher", validation: { status: "confirmed" } }), // invalid dispatcher
    ].join("\n");
    const { wirings } = extractConfirmedOutcomes(text);
    assert.equal(wirings.length, 1);
    assert.equal(wirings[0].engine, "FooEngine");
    assert.equal(wirings[0].dispatcher, "prism_calc");
  });

  it("dedups by engine (first-seen wins) and records conflicts WITHOUT averaging (R12)", () => {
    const text = [
      row({ engineName: "FooEngine", proposedWiring: "prism_calc", validation: { status: "confirmed" } }),
      row({ engineName: "FooEngine", proposedWiring: "prism_cam", validation: { status: "confirmed" } }), // conflict
    ].join("\n");
    const { wirings, conflicts } = extractConfirmedOutcomes(text);
    assert.equal(wirings.length, 1);
    assert.equal(wirings[0].dispatcher, "prism_calc"); // first-seen kept
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].kept, "prism_calc");
    assert.equal(conflicts[0].alsoSeen, "prism_cam");
  });

  it("adversarial: malformed JSON line + blank line are skipped, never throw", () => {
    const text = ["{ broken", "", row({ engineName: "FooEngine", proposedWiring: "prism_calc", validation: { status: "confirmed" } })].join("\n");
    assert.doesNotThrow(() => {
      const { wirings } = extractConfirmedOutcomes(text);
      assert.equal(wirings.length, 1);
    });
  });

  it("edge: empty / null text -> no wirings", () => {
    assert.deepEqual(extractConfirmedOutcomes("").wirings, []);
    assert.deepEqual(extractConfirmedOutcomes(null).wirings, []);
  });

  it("missing engineName or proposedWiring -> skipped", () => {
    const text = [
      row({ proposedWiring: "prism_calc", validation: { status: "confirmed" } }),       // no engine
      row({ engineName: "FooEngine", validation: { status: "confirmed" } }),            // no wiring
    ].join("\n");
    assert.equal(extractConfirmedOutcomes(text).wirings.length, 0);
  });
});

describe("buildGhostFromOutcome", () => {
  it("builds a ref-pool node above the 0.8 gate, distinct id namespace + valid edge", () => {
    const { node, edge } = buildGhostFromOutcome({ engine: "FooEngine", dispatcher: "prism_calc" });
    assert.equal(node.id, "ghost.outcome-wired.FooEngine");
    assert.equal(node.kind, "ghost.unwired-engine"); // the kind nn-graph-eval buildHoldout selects
    assert.equal(node.proposed_wiring, "prism_calc");
    assert.ok(node.confidence >= 0.8, "must clear the 0.8 ref gate");
    assert.equal(node.proposed_by, "ghost-wire-outcomes-to-refpool.mjs");
    assert.equal(edge.from, node.id);
    assert.equal(edge.type, "ghost-wire");
  });
});

describe("shouldReexecForHeap", () => {
  it("re-execs only the graph-loading modes (--apply/--revert), not dry-run", () => {
    assert.equal(shouldReexecForHeap(["--apply"], {}, []), true);
    assert.equal(shouldReexecForHeap(["--revert"], {}, []), true);
    assert.equal(shouldReexecForHeap([], {}, []), false);       // dry-run: no graph load
    assert.equal(shouldReexecForHeap(["--json"], {}, []), false);
  });

  it("does not double-wrap an already-heap-bumped launch + honors opt-outs", () => {
    assert.equal(shouldReexecForHeap(["--apply"], {}, ["--max-old-space-size=12288"]), false);
    assert.equal(shouldReexecForHeap(["--apply"], { PRISM_OUTCOME_REFPOOL_REEXEC: "1" }, []), false);
    assert.equal(shouldReexecForHeap(["--apply"], { PRISM_OUTCOME_REFPOOL_NO_REEXEC: "1" }, []), false);
  });
});
