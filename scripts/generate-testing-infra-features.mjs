#!/usr/bin/env node
/**
 * generate-testing-infra-features.mjs — system-viz augmentation: testing-infra roost.
 *
 * Spec: TESTING-INFRA-MS0/U-AXIS1-VIZ-CLOSURE (slot:tango, 2026-05-26).
 *
 * Closes the Axis 1 gap left open by U-AXIS2-3-4 (handoff
 * HANDOFF-claude-06a24572-tango-testing-infra.md §"Gaps / follow-ups"):
 * "Axis 1 (PSN/system-viz wiring) — PARTIALLY satisfied: 4 prism_dev actions
 *  wired (these ARE PSN Engines/Dispatchers legs). FULL closure = /system-viz
 *  ghost.testing_infra roost surfacing the 4 engines + their pass-rate
 *  dashboards. Future iter."
 *
 * Emits a single ghost.testing_infra roost (L8) + 4 axis children (L9), one
 * per testing-infra engine shipped in commit 68b62b1152 / 2bc580d536. Each
 * child carries pass_count/total + dispatcher action + engine source path,
 * so /system-viz renders the testing infrastructure as a first-class PSN
 * surface (engine + dispatcher + test-count, all visible together).
 *
 * The pass-counts are derived from the source-of-truth at ship time
 * (handoff §"What shipped"); a future iter can pivot to dynamic vitest parsing
 * once a sidecar emits per-engine totals automatically. For now, deterministic
 * hard-coded reflects the engines as committed.
 *
 * Registered in scripts/regen-viz.mjs FAST[] + spliced by merge-augmentations.mjs.
 * Modeled on generate-priority-queue-features.mjs (same augmentation pattern).
 *
 * Usage:  node scripts/generate-testing-infra-features.mjs
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.testing_infra";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 400;

// Axis 1 closure — the 5-axis testing-infra surface from TESTING-INFRA-MS0.
// Axis 1 is THIS roost (PSN/viz wiring); Axes 2-5 are the 4 engines below.
// Pass counts as of commit 68b62b1152 / 2bc580d536 (slot:tango 2026-05-25).
export const AXES = [
  {
    axis: 2,
    id: "ghost.testing_infra.axis2.post_processor_matrix",
    engine: "PostProcessorMatrixTestHarnessEngine",
    enginePath: "mcp-server/src/engines/PostProcessorMatrixTestHarnessEngine.ts",
    testPath: "mcp-server/src/__tests__/PostProcessorMatrixTestHarnessEngine.test.ts",
    dispatcher: "prism_dev",
    action: "post_processor_matrix_test",
    passCount: 24,
    total: 24,
    intent: "(controller × machine_config × cam × units) matrix sweep · dialect-coherence audit · capability gating",
    adapterStatus: "full-api",
  },
  {
    axis: 3,
    id: "ghost.testing_infra.axis3.speed_feed_at_scale",
    engine: "SpeedFeedAtScaleHarnessEngine",
    enginePath: "mcp-server/src/engines/SpeedFeedAtScaleHarnessEngine.ts",
    testPath: "mcp-server/src/__tests__/SpeedFeedAtScaleHarnessEngine.test.ts",
    dispatcher: "prism_dev",
    action: "speed_feed_at_scale_test",
    passCount: 22,
    total: 22,
    intent: "(ISO × op × cut × dia × material × flutes × units) sweep · 6 physics invariants per cell · Kienzle ap-scaling probe",
    adapterStatus: "full-api",
  },
  {
    axis: 4,
    id: "ghost.testing_infra.axis4.domain_wizard_pipeline",
    engine: "DomainWizardPipelineTestEngine",
    enginePath: "mcp-server/src/engines/DomainWizardPipelineTestEngine.ts",
    testPath: "mcp-server/src/__tests__/DomainWizardPipelineTestEngine.test.ts",
    dispatcher: "prism_dev",
    action: "domain_wizard_pipeline_test",
    passCount: 18,
    total: 18,
    intent: "stage-by-stage assertion driver for mill/lathe/wire-EDM print-to-program · S1-S5 axes · adapter-callback API",
    adapterStatus: "echo-needs-binding",
  },
  {
    axis: 5,
    id: "ghost.testing_infra.axis5.cad_cam_generation",
    engine: "CADCAMGenerationTestEngine",
    enginePath: "mcp-server/src/engines/CADCAMGenerationTestEngine.ts",
    testPath: "mcp-server/src/__tests__/CADCAMGenerationTestEngine.test.ts",
    dispatcher: "prism_dev",
    action: "cad_cam_generation_test",
    passCount: 22,
    total: 22,
    intent: "CAD-gen C1-C5 (non-empty/kind/dims/topology/input-invariants) · CAM-gen M1-M5 (coverage/shape/strategy/envelope/finiteness)",
    adapterStatus: "echo-needs-callback-binding",
  },
];

/**
 * Pure: emit roost + 4 axis children + edges to engine nodes (if present).
 * existingNodeIds is a Set/Array of ids currently in the graph; we never
 * re-emit a node that already exists (idempotent re-run).
 */
export function generate(existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set
    ? new Set(existingNodeIds)
    : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  let roostEmitted = 0;
  let axesEmitted = 0;
  let skipped = 0;

  const totalPass = AXES.reduce((s, a) => s + a.passCount, 0);
  const totalTests = AXES.reduce((s, a) => s + a.total, 0);
  const passRate = totalTests > 0 ? totalPass / totalTests : 0;

  // Roost.
  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `Testing Infrastructure (${AXES.length} axes · ${totalPass}/${totalTests} PASS)`,
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `TESTING-INFRA-MS0 (slot:tango 2026-05-25): ${AXES.length} testing-infrastructure axes · ${totalPass}/${totalTests} vitest PASS (${(passRate * 100).toFixed(1)}%) · all 4 dispatcher actions wired (prism_dev). Axis 1 closure = this roost. Source: handoff HANDOFF-claude-06a24572-tango-testing-infra.md.`,
      atomicValues: {
        total_axes: { value: AXES.length, confidence: 1.0 },
        pass_count: { value: totalPass, confidence: 1.0 },
        total_tests: { value: totalTests, confidence: 1.0 },
        pass_rate: { value: passRate, confidence: 1.0 },
        dispatcher_actions_wired: { value: AXES.length, confidence: 1.0 },
      },
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  // Axis children — sorted by axis number (deterministic).
  const sorted = [...AXES].sort((a, b) => a.axis - b.axis);
  for (const ax of sorted) {
    if (ids.has(ax.id)) { skipped++; continue; }
    const rate = ax.total > 0 ? ax.passCount / ax.total : 0;
    const labelStub = `Axis ${ax.axis} · ${ax.engine}`;
    newNodes.push({
      id: ax.id,
      label: labelStub.slice(0, MAX_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "testing-infra-axis",
      parent: ROOST_ID,
      axis: ax.axis,
      engine: ax.engine,
      enginePath: ax.enginePath,
      testPath: ax.testPath,
      dispatcher: ax.dispatcher,
      action: ax.action,
      adapterStatus: ax.adapterStatus,
      info: `[Axis ${ax.axis} · ${ax.passCount}/${ax.total} PASS · ${ax.dispatcher}:${ax.action} (${ax.adapterStatus})] ${ax.intent}`.slice(0, MAX_INFO),
      atomicValues: {
        pass_count: { value: ax.passCount, confidence: 1.0 },
        total: { value: ax.total, confidence: 1.0 },
        pass_rate: { value: rate, confidence: 1.0 },
      },
    });
    ids.add(ax.id);
    axesEmitted++;

    // Best-effort bridge edge: axis child → real engine node if it exists.
    // Engine node ids in the graph follow `engine.<EngineName>` convention
    // (built via engine-graph-augmentation). Emit speculatively — the merge
    // step will only attach to a node that actually exists; orphans are not
    // an error.
    const engineNodeId = `engine.${ax.engine}`;
    newEdges.push({
      from: ax.id,
      to: engineNodeId,
      type: "tests",
      label: `${ax.passCount}/${ax.total}`,
    });
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted,
      axesEmitted,
      skipped,
      totalPass,
      totalTests,
      passRate,
      adapterStatuses: sorted.reduce((o, a) => {
        o[a.adapterStatus] = (o[a.adapterStatus] || 0) + 1;
        return o;
      }, {}),
    },
  };
}

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "testing-infra-augmentation.json");

export function main() {
  let result;
  try {
    const { newNodes, newEdges, stats } = generate([]);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "handoff: state/shared/handoffs/HANDOFF-claude-06a24572-tango-testing-infra.md (commits 68b62b1152 + 2bc580d536)",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try {
    if (!fs.existsSync(VIZ_DIR)) fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost:           ${result.stats.roostEmitted}`);
  console.log(`  axes emitted:    ${result.stats.axesEmitted}`);
  console.log(`  total pass:      ${result.stats.totalPass}/${result.stats.totalTests} (${(result.stats.passRate * 100).toFixed(1)}%)`);
  console.log(`  adapter status:  ${JSON.stringify(result.stats.adapterStatuses)}`);
  return 0;
}

const isMain = (() => {
  try {
    return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (isMain) process.exit(main());
