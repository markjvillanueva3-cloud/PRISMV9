/**
 * LEARN-MS4: Feedback + Fleet Learning Tests
 *
 * Tests:
 * - MachineLearningFeedbackEngine: record, profile, calibrate, predict, compare
 * - TransferLearningEngine: similarity, scale, validate
 * - FleetDeploymentLearningEngine: status, plan, feedback, summary
 * - Dispatcher wiring verification (13 new actions)
 */

import { describe, it, expect } from "vitest";
import { MachineLearningFeedbackEngine } from "../engines/MachineLearningFeedbackEngine.js";
import { transferLearningEngine } from "../engines/TransferLearningEngine.js";
import { FleetDeploymentLearningEngine } from "../engines/FleetDeploymentLearningEngine.js";

// ═══ MachineLearningFeedbackEngine ═══

describe("LEARN-MS4: MachineLearningFeedbackEngine", () => {
  const engine = new MachineLearningFeedbackEngine();

  it("recordMeasurement stores measurement and returns stats", () => {
    const result = engine.recordMeasurement({
      machineId: "test-vf2-ms4",
      measurementType: "dimension",
      measured: 25.02,
      predicted: 25.00,
      unit: "mm",
      material: "6061-T6",
      operation: "milling",
    });
    expect(result.id).toBeDefined();
    expect(result.residual).toBeCloseTo(0.02, 4);
    expect(result.measurementCount).toBeGreaterThan(0);
    expect(result.message).toContain("dimension");
  });

  it("getMachineProfile returns profile summary", () => {
    // Record a few measurements first
    for (let i = 0; i < 3; i++) {
      engine.recordMeasurement({
        machineId: "test-profile-ms4",
        measurementType: "force",
        measured: 500 + i * 10,
        predicted: 490,
        unit: "N",
        parameters: { depth_mm: 2, feed_mmrev: 0.1 },
      });
    }
    const profile = engine.getMachineProfile({ machineId: "test-profile-ms4" });
    expect(profile.machineId).toBe("test-profile-ms4");
    expect(profile.totalMeasurements).toBeGreaterThanOrEqual(3);
    expect(profile.measurementsByType).toHaveProperty("force");
    expect(profile.recommendations).toBeDefined();
  });

  it("autoCalibrate performs calibration with enough data", () => {
    const machineId = "test-calibrate-ms4";
    for (let i = 0; i < 6; i++) {
      engine.recordMeasurement({
        machineId,
        measurementType: "surface_finish",
        measured: 1.6 + i * 0.05,
        predicted: 1.5,
        unit: "Ra",
      });
    }
    const result = engine.autoCalibrate({ machineId, minSamples: 3 });
    expect(result.calibrated).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it("predict returns corrected prediction", () => {
    const result = engine.predict({
      machineId: "test-predict-ms4",
      predictionType: "dimension",
      parameters: { nominal_mm: 50.0 },
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("predicted");
  });

  it("compareMachines compares multiple machines", () => {
    // Record data on two machines
    for (const mid of ["compare-A-ms4", "compare-B-ms4"]) {
      engine.recordMeasurement({
        machineId: mid,
        measurementType: "dimension",
        measured: 25.01,
        predicted: 25.00,
        unit: "mm",
      });
    }
    const result = engine.compareMachines({
      machineIds: ["compare-A-ms4", "compare-B-ms4"],
    });
    expect(result.comparison).toBeDefined();
    expect(result.comparison.length).toBe(2);
  });
});

// ═══ TransferLearningEngine ═══

describe("LEARN-MS4: TransferLearningEngine", () => {

  const sourceMachine = {
    name: "DMG MORI DMU 50",
    power_kw: 35,
    max_rpm: 14000,
    rigidity_n_per_um: 30,
    accuracy_mm: 0.005,
    axes: 5,
  };

  const targetMachine = {
    name: "Haas VF-2",
    power_kw: 22.4,
    max_rpm: 8100,
    rigidity_n_per_um: 20,
    accuracy_mm: 0.01,
    axes: 3,
  };

  it("machineSimilarity returns similarity score", () => {
    const result = transferLearningEngine.machineSimilarity({
      source: sourceMachine,
      target: targetMachine,
    });
    expect(result.value.similarity_score).toBeGreaterThan(0);
    expect(result.value.similarity_score).toBeLessThanOrEqual(1);
    expect(result.value.transfer_confidence).toBeGreaterThanOrEqual(0);
    expect(result.value.risk_factors).toBeDefined();
  });

  it("scaleParameters scales cutting parameters", () => {
    const result = transferLearningEngine.scaleParameters({
      source_params: { Vc: 200, fz: 0.08, ap: 3, ae: 8 },
      source_machine: sourceMachine,
      target_machine: targetMachine,
    });
    expect(result.value.scaled_params).toBeDefined();
    expect(result.value.scaled_params.Vc).toBeGreaterThan(0);
    expect(result.value.scale_ratios).toBeDefined();
    expect(result.value.confidence).toBeGreaterThan(0);
  });

  it("validateTransfer checks safety of transferred params", () => {
    const result = transferLearningEngine.validateTransfer({
      scaled_params: { Vc: 180, fz: 0.07, ap: 2.5, ae: 6, tool_diameter_mm: 10 },
      target_machine: targetMachine,
      tool_diameter_mm: 10,
      tool_stickout_mm: 40,
    });
    expect(result.value).toBeDefined();
    expect(result.value).toHaveProperty("safe");
    expect(result.value).toHaveProperty("checks");
  });
});

// ═══ FleetDeploymentLearningEngine ═══

describe("LEARN-MS4: FleetDeploymentLearningEngine", () => {
  const fleet = new FleetDeploymentLearningEngine();

  it("fleetStatus returns fleet overview", () => {
    const status = fleet.fleetStatus();
    expect(status.action).toBe("fleet_status");
    expect(status).toHaveProperty("machines");
    expect(status).toHaveProperty("summary");
    expect(status).toHaveProperty("programs_registered");
    expect(status).toHaveProperty("standards_active");
  });

  it("generateUpdatePlan returns update plan", () => {
    const plan = fleet.generateUpdatePlan();
    expect(plan.action).toBe("generate_update_plan");
    expect(plan).toHaveProperty("total_machines");
    expect(plan).toHaveProperty("needing_update");
    expect(plan).toHaveProperty("machines_to_update");
  });

  it("ingestFeedback accepts feedback entry", () => {
    const result = fleet.ingestFeedback({
      machine_serial: "TEST-001",
      program_id: "PRG-001",
      date: new Date().toISOString(),
      type: "cycle_time",
      predicted_value: 120,
      actual_value: 135,
      operator_notes: "Longer than expected",
    });
    expect(result.action).toBe("ingest_feedback");
    expect(result.accepted).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it("fleetSummary returns comprehensive summary", () => {
    const summary = fleet.fleetSummary();
    expect(summary.action).toBe("fleet_summary");
    expect(summary.fleet).toBeDefined();
    expect(summary.fleet).toHaveProperty("total_machines");
    expect(summary.programs).toBeDefined();
    expect(summary.quality).toBeDefined();
    expect(summary.top_issues).toBeDefined();
    expect(summary.recommendations).toBeDefined();
  });
});

// ═══ Dispatcher Wiring Verification ═══

describe("LEARN-MS4: Dispatcher wiring verification", () => {

  it("schema map has all 13 MS4 actions", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const ms4Actions = [
      "learn_feedback_record", "learn_feedback_profile", "learn_feedback_calibrate",
      "learn_feedback_predict", "learn_feedback_compare",
      "learn_transfer_similarity", "learn_transfer_scale",
      "learn_transfer_apply", "learn_transfer_validate",
      "learn_fleet_status", "learn_fleet_plan",
      "learn_fleet_feedback", "learn_fleet_summary",
    ];
    for (const action of ms4Actions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });

  it("learn_feedback_record schema requires machine_id and measured", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_feedback_record"];
    const valid = schema.safeParse({ machine_id: "VF-2", measured: 25.0 });
    expect(valid.success).toBe(true);
    const missing = schema.safeParse({});
    expect(missing.success).toBe(false);
  });

  it("learn_transfer_similarity schema validates machine specs", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_transfer_similarity"];
    const valid = schema.safeParse({
      source: { name: "A", power_kw: 25, max_rpm: 14000, rigidity_n_per_um: 30, accuracy_mm: 0.005, axes: 5 },
      target: { name: "B", power_kw: 22, max_rpm: 8100, rigidity_n_per_um: 20, accuracy_mm: 0.01, axes: 3 },
    });
    expect(valid.success).toBe(true);
  });

  it("learn_fleet_feedback schema validates feedback_type enum", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_fleet_feedback"];
    const valid = schema.safeParse({
      machine_serial: "SN-001",
      feedback_type: "cycle_time",
    });
    expect(valid.success).toBe(true);
    const invalid = schema.safeParse({
      machine_serial: "SN-001",
      feedback_type: "invalid_type",
    });
    expect(invalid.success).toBe(false);
  });

  it("total knowledge schema count >= 65 (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const count = Object.keys(ACTION_KNOWLEDGE_SCHEMAS).length;
    expect(count).toBeGreaterThanOrEqual(65);
  });

  it("MS3 + MS2 + MS1 actions still present (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const priorActions = [
      // MS3
      "learn_course_build", "learn_curriculum_rpm",
      // MS2
      "learn_search_enhanced", "learn_context_recommend",
      // MS1
      "learn_video_process", "learn_session_create",
      // MS0
      "learn_ingest_text", "learn_auto_tag",
    ];
    for (const action of priorActions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });
});
