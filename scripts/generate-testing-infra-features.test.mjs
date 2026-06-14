// Tests for generate-testing-infra-features.mjs — TESTING-INFRA-MS0/U-AXIS1-VIZ-CLOSURE
//
// Karpathy R9: tests verify intent, not behavior. Each test names WHY the
// invariant matters. The pass-counts come from the source-of-truth at ship
// time (handoff §What shipped); a regression here = drift from canonical state.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  AXES,
  ROOST_ID,
  PLANNED_PARENT,
  ROOST_LAYER,
  CHILD_LAYER,
  SCHEMA_VERSION,
} from "./generate-testing-infra-features.mjs";

describe("generate-testing-infra-features", () => {
  describe("AXES const (source-of-truth contract)", () => {
    it("ships exactly 4 axis engines (Axes 2-5 from TESTING-INFRA-MS0)", () => {
      // Axis 1 is the roost itself (PSN/viz wiring); engines start at Axis 2.
      assert.equal(AXES.length, 4);
      assert.deepEqual(AXES.map(a => a.axis).sort(), [2, 3, 4, 5]);
    });
    it("hard-coded pass counts sum to 86/86 (matches commit 68b62b1152)", () => {
      const totalPass = AXES.reduce((s, a) => s + a.passCount, 0);
      const totalTests = AXES.reduce((s, a) => s + a.total, 0);
      assert.equal(totalPass, 86);
      assert.equal(totalTests, 86);
    });
    it("every axis names a real engine, dispatcher, and action", () => {
      for (const ax of AXES) {
        assert.ok(ax.engine && ax.engine.endsWith("Engine"), `axis ${ax.axis} engine`);
        assert.equal(ax.dispatcher, "prism_dev", `axis ${ax.axis} dispatcher`);
        assert.ok(ax.action && ax.action.endsWith("_test"), `axis ${ax.axis} action`);
        assert.ok(ax.enginePath.includes("/engines/"), `axis ${ax.axis} enginePath`);
        assert.ok(ax.testPath.includes("/__tests__/"), `axis ${ax.axis} testPath`);
      }
    });
    it("adapterStatus is one of the documented three states", () => {
      const valid = new Set(["full-api", "echo-needs-binding", "echo-needs-callback-binding"]);
      for (const ax of AXES) assert.ok(valid.has(ax.adapterStatus), `axis ${ax.axis} adapterStatus=${ax.adapterStatus}`);
    });
  });

  describe("generate() — fresh graph (cold start)", () => {
    const { newNodes, newEdges, stats } = generate([]);

    it("emits 1 roost + 4 axis children = 5 nodes", () => {
      assert.equal(newNodes.length, 5);
      assert.equal(stats.roostEmitted, 1);
      assert.equal(stats.axesEmitted, 4);
    });
    it("emits 4 tests-edges (one per axis → real engine node)", () => {
      assert.equal(newEdges.length, 4);
      for (const e of newEdges) {
        assert.equal(e.type, "tests");
        assert.ok(e.from.startsWith("ghost.testing_infra."));
        assert.ok(e.to.startsWith("engine."));
      }
    });
    it("roost is L8 / parent=ghost.planned_features", () => {
      const roost = newNodes.find(n => n.id === ROOST_ID);
      assert.ok(roost);
      assert.equal(roost.layer, ROOST_LAYER);
      assert.equal(roost.parent, PLANNED_PARENT);
      assert.equal(roost.kind, "ghost-roost");
    });
    it("axis children are L9 / parent=roost / unique ids", () => {
      const axes = newNodes.filter(n => n.kind === "testing-infra-axis");
      assert.equal(axes.length, 4);
      const ids = new Set(axes.map(n => n.id));
      assert.equal(ids.size, 4);
      for (const n of axes) {
        assert.equal(n.layer, CHILD_LAYER);
        assert.equal(n.parent, ROOST_ID);
      }
    });
    it("every node has atomicValues with confidence=1.0 (deterministic source)", () => {
      // R12 fail-loud — these are NOT probabilistic estimates, they are
      // committed-code facts. Confidence < 1.0 would lie about provenance.
      for (const n of newNodes) {
        assert.ok(n.atomicValues, `node ${n.id} missing atomicValues`);
        for (const [k, v] of Object.entries(n.atomicValues)) {
          assert.equal(v.confidence, 1.0, `${n.id}.${k} confidence != 1.0`);
        }
      }
    });
    it("stats.passRate is 1.0 (86/86 = 100% PASS)", () => {
      assert.equal(stats.totalPass, 86);
      assert.equal(stats.totalTests, 86);
      assert.equal(stats.passRate, 1.0);
    });
    it("stats.adapterStatuses tallies all 4 axes by status", () => {
      const sum = Object.values(stats.adapterStatuses).reduce((a, b) => a + b, 0);
      assert.equal(sum, 4);
      assert.ok(stats.adapterStatuses["full-api"] >= 2, "Axes 2 + 3 are full-api");
    });
  });

  describe("generate() — idempotent re-emission (already-present roost)", () => {
    it("skips roost when ROOST_ID already in graph", () => {
      const { newNodes, stats } = generate([ROOST_ID]);
      assert.equal(stats.roostEmitted, 0);
      // The 4 axis children should still be emitted (their ids are not in the set).
      assert.equal(stats.axesEmitted, 4);
      assert.equal(newNodes.find(n => n.id === ROOST_ID), undefined);
    });
    it("skips individual axis when its id is already present", () => {
      const presentAxis = AXES[0].id;
      const { stats } = generate([ROOST_ID, presentAxis]);
      assert.equal(stats.roostEmitted, 0);
      assert.equal(stats.axesEmitted, 3);
      assert.equal(stats.skipped, 1);
    });
    it("re-running with the full output is a no-op (idempotent)", () => {
      const first = generate([]);
      const allIds = first.newNodes.map(n => n.id);
      const second = generate(allIds);
      assert.equal(second.newNodes.length, 0);
      assert.equal(second.stats.skipped, 4);
      assert.equal(second.stats.roostEmitted, 0);
    });
  });

  describe("generate() — accepts Set or Array for existingNodeIds", () => {
    it("Set input is handled identically to Array input", () => {
      const fromArr = generate([ROOST_ID]);
      const fromSet = generate(new Set([ROOST_ID]));
      assert.deepEqual(fromArr.stats, fromSet.stats);
      assert.equal(fromArr.newNodes.length, fromSet.newNodes.length);
    });
  });

  describe("constants (consumer contract)", () => {
    it("SCHEMA_VERSION is semver-shaped", () => {
      assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
    });
    it("ROOST_ID begins with `ghost.` (ghost-layer convention)", () => {
      assert.ok(ROOST_ID.startsWith("ghost."));
    });
  });
});
