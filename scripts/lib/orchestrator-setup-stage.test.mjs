// scripts/lib/orchestrator-setup-stage.test.mjs
//
// Tests for U-MMO-SETUP-ORCHESTRATION-ENGINE (Stage 5 coarse hub).
// Run: node --test H:/prism/scripts/lib/orchestrator-setup-stage.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createSetupOrchestrationAdapter,
  registerSetupOrchestration,
} from "./orchestrator-setup-stage.mjs";
import { createPipeline, validateStageAdapter, STAGE_IDS } from "./orchestrator-pipeline-shell.mjs";

// ---------------------------------------------------------------------------
// Fixtures — minimal valid implementations of the 4 component engines
// ---------------------------------------------------------------------------

const goodFeatureGraph = {
  features: [
    { id: "hole_1", type: "hole", face: "+Z" },
    { id: "pocket_1", type: "pocket", face: "+Z" },
    { id: "hole_2", type: "hole", face: "-Z" },
  ],
};

function fakeClusterFeatures(_fg) {
  return {
    setup_count: 2,
    setups: [
      { setup_id: "setup-1", feature_ids: ["hole_1", "pocket_1"], datum_face: "-Z", preserved_faces: ["-Z"] },
      { setup_id: "setup-2", feature_ids: ["hole_2"],             datum_face: "+Z", preserved_faces: [] },
    ],
    confidence: 0.90,
  };
}

function fakeSelectFixture(setups, _material, _machine) {
  return {
    fixtures: setups.map((s, i) => ({
      setup_id: s.setup_id,
      fixture_type: i === 0 ? "vise" : "soft-jaws",
      fixture_id: `FX-${i + 1}`,
    })),
    confidence: 0.85,
  };
}

function fakeAssignWCS(setups) {
  return {
    wcs: setups.map((s, i) => ({ setup_id: s.setup_id, wcs: `G5${4 + i}` })),
    warnings: [],
    confidence: 0.95,
  };
}

function fakePlanTombstone(_setups, batchSize) {
  if (batchSize <= 1) return null;
  return { rows: 2, cols: 3, parts_per_layout: 6 };
}

function buildAdapter(overrides = {}) {
  return createSetupOrchestrationAdapter({
    clusterFeatures: fakeClusterFeatures,
    selectFixture: fakeSelectFixture,
    assignWCS: fakeAssignWCS,
    planTombstone: fakePlanTombstone,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("createSetupOrchestrationAdapter construction", () => {
  it("conforms to the pipeline-shell adapter contract", () => {
    validateStageAdapter(buildAdapter(), "SETUP_PLAN");
  });

  it("rejects missing clusterFeatures", () => {
    assert.throws(
      () => createSetupOrchestrationAdapter({ selectFixture: fakeSelectFixture, assignWCS: fakeAssignWCS }),
      /clusterFeatures fn required/
    );
  });

  it("rejects missing selectFixture", () => {
    assert.throws(
      () => createSetupOrchestrationAdapter({ clusterFeatures: fakeClusterFeatures, assignWCS: fakeAssignWCS }),
      /selectFixture fn required/
    );
  });

  it("rejects missing assignWCS", () => {
    assert.throws(
      () => createSetupOrchestrationAdapter({ clusterFeatures: fakeClusterFeatures, selectFixture: fakeSelectFixture }),
      /assignWCS fn required/
    );
  });

  it("planTombstone is optional", () => {
    const a = createSetupOrchestrationAdapter({
      clusterFeatures: fakeClusterFeatures,
      selectFixture: fakeSelectFixture,
      assignWCS: fakeAssignWCS,
      // no planTombstone
    });
    validateStageAdapter(a, "SETUP_PLAN");
  });

  it("uses custom engineRef when provided", () => {
    const a = buildAdapter({ engineRef: "CustomSetupHub" });
    assert.equal(a.engineRef, "CustomSetupHub");
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("happy path: full 4-engine composition", () => {
  it("produces a complete SetupPlan when all 4 engines succeed", () => {
    const a = buildAdapter();
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.deferred, false);
    assert.equal(r.output.setup_count, 2);
    assert.equal(r.output.setups.length, 2);
    assert.equal(r.output.fixtures.length, 2);
    assert.equal(r.output.wcs.length, 2);
    assert.equal(r.output.wcs[0].wcs, "G54");
    assert.equal(r.output.wcs[1].wcs, "G55");
  });

  it("composite confidence = min of component confidences", () => {
    const a = buildAdapter();
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    // cluster=0.90, fixture=0.85, wcs=0.95 → min = 0.85
    assert.equal(r.confidence, 0.85);
    assert.equal(r.output.confidence, 0.85);
  });

  it("trace summarizes setup count + fixtures + WCS", () => {
    const a = buildAdapter();
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.match(r.trace, /SETUP: 2 setup\(s\)/);
    assert.match(r.trace, /G54\+G55/);
  });

  it("evidence enumerates each setup's feature + datum", () => {
    const a = buildAdapter();
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.ok(r.evidence.some((e) => e.trim().startsWith("setup-1:")));
    assert.ok(r.evidence.some((e) => e.trim().startsWith("setup-2:")));
    assert.ok(r.evidence.some((e) => e.includes("vise") || e.includes("soft-jaws")));
  });

  it("includes tombstone when batchSize > 1", () => {
    const a = buildAdapter();
    const r = a.run({ featureGraph: goodFeatureGraph, batchSize: 6 }, {});
    assert.deepEqual(r.output.tombstone, { rows: 2, cols: 3, parts_per_layout: 6 });
    assert.match(r.trace, /tombstone ×6/);
  });

  it("omits tombstone when batchSize = 1 (single part)", () => {
    const a = buildAdapter();
    const r = a.run({ featureGraph: goodFeatureGraph, batchSize: 1 }, {});
    assert.equal(r.output.tombstone, null);
  });

  it("reads featureGraph from .prior chain (upstream stage output)", () => {
    const a = buildAdapter();
    const r = a.run({ prior: { featureGraph: goodFeatureGraph } }, {});
    assert.equal(r.deferred, false);
    assert.equal(r.output.setup_count, 2);
  });

  it("propagates WCS warnings into evidence", () => {
    const a = buildAdapter({
      assignWCS: (setups) => ({
        wcs: setups.map((s, i) => ({ setup_id: s.setup_id, wcs: `G5${4 + i}` })),
        warnings: ["setup-1 datum may shift after secondary ops"],
        confidence: 0.85,
      }),
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.ok(r.evidence.some((e) => e.startsWith("WCS-WARN:")));
    assert.equal(r.output.warnings.length, 1);
  });
});

// ---------------------------------------------------------------------------
// Failure modes (R12 fail-loud)
// ---------------------------------------------------------------------------

describe("R12 fail-loud: bad input + engine failures", () => {
  it("returns error when featureGraph missing", () => {
    const a = buildAdapter();
    const r = a.run({}, {});
    assert.equal(r.confidence, 0);
    assert.equal(r.output._error, true);
    assert.match(r.trace, /SETUP-PLAN error/);
    assert.match(r.trace, /did not emit featureGraph/);
  });

  it("returns error when clusterFeatures throws", () => {
    const a = buildAdapter({
      clusterFeatures: () => { throw new Error("clustering algo crash"); },
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.confidence, 0);
    assert.ok(r.evidence.some((e) => e.includes("FeatureClusteringEngine")));
    assert.match(r.trace, /clusterFeatures threw/);
  });

  it("returns error when clusterFeatures returns no setups", () => {
    const a = buildAdapter({
      clusterFeatures: () => ({ setup_count: 0, setups: [], confidence: 0.5 }),
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /invalid result/);
  });

  it("returns error when selectFixture throws", () => {
    const a = buildAdapter({
      selectFixture: () => { throw new Error("no fixture in DB"); },
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.confidence, 0);
    assert.ok(r.evidence.some((e) => e.includes("FixtureDesignEngine")));
  });

  it("returns error when selectFixture returns wrong count (R12 invariant)", () => {
    const a = buildAdapter({
      // 2 setups → only 1 fixture returned. Hard catch.
      selectFixture: () => ({ fixtures: [{ setup_id: "setup-1", fixture_type: "vise" }], confidence: 0.9 }),
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /count mismatch/);
  });

  it("returns error when assignWCS throws", () => {
    const a = buildAdapter({
      assignWCS: () => { throw new Error("WCS bank exhausted"); },
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.confidence, 0);
    assert.ok(r.evidence.some((e) => e.includes("WorkCoordinateEngine")));
  });

  it("returns error when assignWCS returns invalid result", () => {
    const a = buildAdapter({
      assignWCS: () => ({ wcs: "not-array" }),
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /invalid result/);
  });

  it("degrades gracefully (NOT errors) when planTombstone throws — tombstone is optional", () => {
    const a = buildAdapter({
      planTombstone: () => { throw new Error("tombstone solver crashed"); },
    });
    const r = a.run({ featureGraph: goodFeatureGraph, batchSize: 10 }, {});
    // Run still succeeds because tombstone is optional
    assert.equal(r.deferred, false);
    assert.notEqual(r.confidence, 0);
    // Tombstone is null in output (failure didn't pollute)
    assert.equal(r.output.tombstone, null);
  });
});

// ---------------------------------------------------------------------------
// Variability — different setup counts (1, 2, 3+) + multiple WCS systems
// ---------------------------------------------------------------------------

describe("variability: setup counts", () => {
  it("handles 1-setup parts (no flip)", () => {
    const a = buildAdapter({
      clusterFeatures: () => ({
        setup_count: 1,
        setups: [{ setup_id: "setup-1", feature_ids: ["hole_1"], datum_face: "-Z", preserved_faces: [] }],
        confidence: 0.95,
      }),
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.output.setup_count, 1);
    assert.equal(r.output.wcs.length, 1);
    assert.equal(r.output.wcs[0].wcs, "G54");
  });

  it("handles 4-setup parts (multi-flip)", () => {
    const a = buildAdapter({
      clusterFeatures: () => ({
        setup_count: 4,
        setups: Array.from({ length: 4 }, (_, i) => ({
          setup_id: `setup-${i + 1}`,
          feature_ids: [`f${i}`],
          datum_face: ["+Z", "-Z", "+X", "-X"][i],
          preserved_faces: [],
        })),
        confidence: 0.75,
      }),
    });
    const r = a.run({ featureGraph: goodFeatureGraph }, {});
    assert.equal(r.output.setup_count, 4);
    assert.equal(r.output.wcs.length, 4);
    assert.deepEqual(r.output.wcs.map((w) => w.wcs), ["G54", "G55", "G56", "G57"]);
  });
});

// ---------------------------------------------------------------------------
// registerSetupOrchestration convenience
// ---------------------------------------------------------------------------

describe("registerSetupOrchestration", () => {
  it("registers on the pipeline + replaces the no-op", () => {
    const p = createPipeline({ mode: "estimate" });
    registerSetupOrchestration(p, {
      clusterFeatures: fakeClusterFeatures,
      selectFixture: fakeSelectFixture,
      assignWCS: fakeAssignWCS,
    });
    const stages = p.listStages();
    const setupStage = stages.find((s) => s.stageId === "SETUP_PLAN");
    assert.equal(setupStage.isNoop, false);
    assert.equal(setupStage.engineRef, "SetupOrchestrationEngine");
  });

  it("rejects null pipeline", () => {
    assert.throws(() => registerSetupOrchestration(null, {}), /pipeline required/);
  });
});

// ---------------------------------------------------------------------------
// End-to-end with the pipeline shell
// ---------------------------------------------------------------------------

describe("end-to-end integration", () => {
  it("contributes a real SETUP_PLAN stage to a full pipeline run", () => {
    const p = createPipeline({ mode: "estimate" });
    registerSetupOrchestration(p, {
      clusterFeatures: fakeClusterFeatures,
      selectFixture: fakeSelectFixture,
      assignWCS: fakeAssignWCS,
      planTombstone: fakePlanTombstone,
    });
    const r = p.run({ rfq_id: "INT-SETUP", featureGraph: goodFeatureGraph, batchSize: 6 });
    const setupStage = r.decomposition.find((s) => s.stage === "SETUP_PLAN");
    assert.equal(setupStage.deferred, false);
    assert.equal(setupStage.confidence, 0.85);
    assert.ok(setupStage.cost > 0);
    assert.equal(r.decomposition.length, STAGE_IDS.length);
  });

  it("deterministic: same input → same SetupPlan", () => {
    const make = () => {
      const p = createPipeline({ mode: "estimate" });
      registerSetupOrchestration(p, {
        clusterFeatures: fakeClusterFeatures,
        selectFixture: fakeSelectFixture,
        assignWCS: fakeAssignWCS,
      });
      return p;
    };
    const a = make().run({ rfq_id: "X", featureGraph: goodFeatureGraph });
    const b = make().run({ rfq_id: "X", featureGraph: goodFeatureGraph });
    const sa = a.decomposition.find((s) => s.stage === "SETUP_PLAN");
    const sb = b.decomposition.find((s) => s.stage === "SETUP_PLAN");
    assert.equal(sa.cost, sb.cost);
    assert.equal(sa.confidence, sb.confidence);
    assert.equal(sa.trace, sb.trace);
  });
});
