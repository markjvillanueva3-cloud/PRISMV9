// scripts/lib/orchestrator-setup-stage.mjs
//
// U-MMO-SETUP-ORCHESTRATION-ENGINE — Stage 5 coarse hub.
//
// PURPOSE
// PRISM today has FeatureClusteringEngine, FixtureDesignEngine,
// WorkCoordinateEngine, TombstoneLayoutEngine — but no coarse hub that
// composes them into a complete setup plan (per Agent N's finding: SETUP-
// PLAN stage has NO coarse hub today). This adapter is the missing hub.
//
// COMPOSITION (dependency-injected engines)
//   - clusterFeatures(featureGraph)       → setup_count + setup_assignments
//   - selectFixture(setupAssignments)     → fixture per setup
//   - assignWCS(setupAssignments)         → G54/55/... per setup
//   - planTombstone(setupAssignments, n)  → multi-part layout if batch>1
//
// The output is a SetupPlan that downstream stages consume:
//   - METHOD_ROUTER reads setup_count to bias toward CAM vs macro
//   - CAM_STRATEGY reads per-setup feature lists for toolpath generation
//   - POST reads per-setup WCS for G-code emit
//
// DOCTRINE
//   - R8: cite the 4 underlying engines via engineRef + sub-refs in evidence.
//   - R12: any engine failure → confidence=0 + errored output. Never fake
//     a setup plan — a wrong plan crashes the part.

/**
 * @typedef {object} FeatureCluster
 * @property {string} setup_id              - e.g. "setup-1"
 * @property {string[]} feature_ids
 * @property {string} datum_face            - which face is the WCS reference
 * @property {string[]} preserved_faces     - what must NOT be machined this setup
 *                                            (to leave material for the next clamp)
 */

/**
 * @typedef {object} SetupPlan
 * @property {number} setup_count
 * @property {FeatureCluster[]} setups
 * @property {object[]} fixtures            - [{ setup_id, fixture_type, fixture_id }]
 * @property {object[]} wcs                 - [{ setup_id, wcs: 'G54'|... }]
 * @property {object} [tombstone]           - { rows, cols, parts_per_layout }
 * @property {number} confidence
 * @property {string[]} warnings
 */

/**
 * Create a stage adapter for SETUP_PLAN that composes the 4 component
 * engines into a unified setup plan.
 *
 * @param {object} params
 * @param {Function} params.clusterFeatures
 *   - (featureGraph) → { setup_count, setups: FeatureCluster[], confidence }
 * @param {Function} params.selectFixture
 *   - (setups, material, machine) → { fixtures: {...}[], confidence }
 * @param {Function} params.assignWCS
 *   - (setups) → { wcs: {...}[], warnings: string[] }
 * @param {Function} [params.planTombstone]
 *   - (setups, batchSize) → { rows, cols, parts_per_layout } | null
 * @param {string} [params.engineRef="SetupOrchestrationEngine"]
 * @param {number} [params.estimatedCost=18]   - $ for setup planning labor
 * @param {number} [params.estimatedDurationSec=180]
 * @returns {{ engineRef: string, run: Function }}
 */
export function createSetupOrchestrationAdapter({
  clusterFeatures,
  selectFixture,
  assignWCS,
  planTombstone,
  engineRef = "SetupOrchestrationEngine",
  estimatedCost = 18,
  estimatedDurationSec = 180,
} = {}) {
  if (typeof clusterFeatures !== "function") {
    throw new Error("createSetupOrchestrationAdapter: clusterFeatures fn required");
  }
  if (typeof selectFixture !== "function") {
    throw new Error("createSetupOrchestrationAdapter: selectFixture fn required");
  }
  if (typeof assignWCS !== "function") {
    throw new Error("createSetupOrchestrationAdapter: assignWCS fn required");
  }
  return {
    engineRef,
    run(input, _context) {
      // R12: explicit error envelope helper
      const failResult = (message, sub = null) => ({
        cost: estimatedCost,
        duration_estimate_sec: estimatedDurationSec,
        confidence: 0,
        evidence: [`SETUP-PLAN error: ${message}`, ...(sub ? [`sub-engine: ${sub}`] : [])],
        gdnt_passthrough: null,
        trace: `SETUP-PLAN error: ${message}`,
        output: { _error: true },
        deferred: false,
      });

      const featureGraph =
        input.featureGraph || input.feature_graph || input.prior?.featureGraph || input.prior?.feature_graph;
      if (!featureGraph) {
        return failResult("upstream stage (CAD) did not emit featureGraph in stage input");
      }
      const material = input.prior?.canonical_id ? input.prior : (input.material || null);
      const machine = input.machine || input.prior?.machine_recommended?.machine_id || null;
      const batchSize = input.batchSize || input.batch_size || 1;

      // 1) Cluster features into setups
      let clusters;
      try {
        clusters = clusterFeatures(featureGraph);
      } catch (err) {
        return failResult(`clusterFeatures threw: ${err.message}`, "FeatureClusteringEngine");
      }
      if (!clusters || !Array.isArray(clusters.setups) || clusters.setups.length === 0) {
        return failResult("clusterFeatures returned invalid result", "FeatureClusteringEngine");
      }

      // 2) Select fixture per setup
      let fixtureResult;
      try {
        fixtureResult = selectFixture(clusters.setups, material, machine);
      } catch (err) {
        return failResult(`selectFixture threw: ${err.message}`, "FixtureDesignEngine");
      }
      if (!fixtureResult || !Array.isArray(fixtureResult.fixtures)) {
        return failResult("selectFixture returned invalid result", "FixtureDesignEngine");
      }
      if (fixtureResult.fixtures.length !== clusters.setups.length) {
        return failResult(
          `selectFixture: setup/fixture count mismatch (${clusters.setups.length} setups, ${fixtureResult.fixtures.length} fixtures)`,
          "FixtureDesignEngine"
        );
      }

      // 3) Assign WCS per setup
      let wcsResult;
      try {
        wcsResult = assignWCS(clusters.setups);
      } catch (err) {
        return failResult(`assignWCS threw: ${err.message}`, "WorkCoordinateEngine");
      }
      if (!wcsResult || !Array.isArray(wcsResult.wcs)) {
        return failResult("assignWCS returned invalid result", "WorkCoordinateEngine");
      }

      // 4) Tombstone layout (optional; only batch>1)
      let tombstoneLayout = null;
      if (batchSize > 1 && typeof planTombstone === "function") {
        try {
          tombstoneLayout = planTombstone(clusters.setups, batchSize);
        } catch (err) {
          // Tombstone is optional — failure degrades to single-part fixturing
          tombstoneLayout = { _error: true, message: err.message };
        }
      }

      // Compose evidence + trace
      const evidence = [
        `setups: ${clusters.setups.length}`,
        ...clusters.setups.map((s, i) =>
          `  setup-${i + 1}: ${s.feature_ids?.length || 0} features on datum ${s.datum_face || "(unspecified)"}`
        ),
        `fixtures: ${fixtureResult.fixtures.map((f) => f.fixture_type || f.fixture_id || "?").join(", ")}`,
        `WCS: ${wcsResult.wcs.map((w) => w.wcs).join(", ")}`,
      ];
      if (wcsResult.warnings) {
        for (const w of wcsResult.warnings) evidence.push(`WCS-WARN: ${w}`);
      }
      if (tombstoneLayout && !tombstoneLayout._error) {
        evidence.push(`tombstone: ${tombstoneLayout.parts_per_layout} parts/layout`);
      }

      // Composite confidence: min of components (chain is only as strong as weakest)
      const componentConfidences = [
        typeof clusters.confidence === "number" ? clusters.confidence : 0.85,
        typeof fixtureResult.confidence === "number" ? fixtureResult.confidence : 0.85,
        typeof wcsResult.confidence === "number" ? wcsResult.confidence : 0.90,
      ];
      const compositeConfidence = Math.min(...componentConfidences);

      const setupPlan = {
        setup_count: clusters.setups.length,
        setups: clusters.setups,
        fixtures: fixtureResult.fixtures,
        wcs: wcsResult.wcs,
        tombstone: tombstoneLayout && !tombstoneLayout._error ? tombstoneLayout : null,
        confidence: compositeConfidence,
        warnings: wcsResult.warnings || [],
      };

      return {
        cost: estimatedCost,
        duration_estimate_sec: estimatedDurationSec,
        confidence: compositeConfidence,
        evidence,
        gdnt_passthrough: null,
        trace: `SETUP: ${clusters.setups.length} setup(s), ${fixtureResult.fixtures.length} fixture(s), WCS ${wcsResult.wcs.map((w) => w.wcs).join("+")}${tombstoneLayout && !tombstoneLayout._error ? ` (tombstone ×${tombstoneLayout.parts_per_layout})` : ""}`,
        output: setupPlan,
        deferred: false,
      };
    },
  };
}

/**
 * Convenience: register the setup-orchestration adapter on a pipeline.
 *
 * @param {object} pipeline
 * @param {Parameters<typeof createSetupOrchestrationAdapter>[0]} engines
 */
export function registerSetupOrchestration(pipeline, engines) {
  if (!pipeline || typeof pipeline.registerStage !== "function") {
    throw new Error("registerSetupOrchestration: pipeline required");
  }
  pipeline.registerStage("SETUP_PLAN", createSetupOrchestrationAdapter(engines));
}
