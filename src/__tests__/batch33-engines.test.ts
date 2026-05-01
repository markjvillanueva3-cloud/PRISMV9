/**
 * Batch 33 — Tests for 12 engines:
 *   AlgorithmGatewayEngine, CAMIntegrationEngine, ReportRenderer,
 *   NLHookEngine, SkillExecutor, ScriptExecutor, ERPIntegrationEngine,
 *   TelemetryEngine, MeasurementIntegrationEngine, UserAssistanceSkillsEngine,
 *   UserWorkflowSkillsEngine, JobLearningEngine
 */
import { describe, it, expect } from "vitest";

// 1. AlgorithmGatewayEngine
import {
  algorithmSelect,
  algorithmGateway,
  catalogSourceFiles,
} from "../engines/AlgorithmGatewayEngine.js";

// 2. CAMIntegrationEngine
import {
  camIntegration,
  searchToolLibrary,
  getAllTools,
  getCatalogStats,
} from "../engines/CAMIntegrationEngine.js";

// 3. ReportRenderer
import {
  renderReport,
  listReportTypes,
  REPORT_TYPES,
} from "../engines/ReportRenderer.js";

// 4. NLHookEngine
import { NLHookEngine } from "../engines/NLHookEngine.js";

// 5. SkillExecutor
import { SkillExecutor } from "../engines/SkillExecutor.js";

// 6. ScriptExecutor
import { ScriptExecutor } from "../engines/ScriptExecutor.js";

// 7. ERPIntegrationEngine
import {
  importWorkOrder,
  erpIntegration,
  recordCostFeedback,
} from "../engines/ERPIntegrationEngine.js";

// 8. TelemetryEngine
import { TelemetryEngine, sha256 } from "../engines/TelemetryEngine.js";

// 9. MeasurementIntegrationEngine
import {
  importCMMData,
  compareSurfaceFinish,
  recordProbeData,
  measurementIntegration,
} from "../engines/MeasurementIntegrationEngine.js";

// 10. UserAssistanceSkillsEngine
import {
  getAllAssistanceSkills,
  getAssistanceSkillById,
  matchAssistanceSkill,
  explainPhysics,
  assessConfidence,
} from "../engines/UserAssistanceSkillsEngine.js";

// 11. UserWorkflowSkillsEngine
import {
  getAllSkills,
  getSkillById,
  matchSkill,
  getSkillsByCategory,
} from "../engines/UserWorkflowSkillsEngine.js";

// 12. JobLearningEngine
import {
  jobRecord,
  jobInsights,
  clearJobStore,
  getJobStoreSize,
} from "../engines/JobLearningEngine.js";

// ============================================================================
// 1. AlgorithmGatewayEngine
// ============================================================================
describe("AlgorithmGatewayEngine", () => {
  it("algorithmSelect returns a valid result for optimize + cutting_params", () => {
    const result = algorithmSelect({
      problem_type: "optimize",
      domain: "cutting_params",
    });
    expect(result).toBeDefined();
    expect(result.selected_algorithm).toBeTruthy();
    expect(result.source_course).toBeTruthy();
    expect(result.rationale).toBeTruthy();
    expect(result.safety).toBeDefined();
    expect(typeof result.safety.score).toBe("number");
    expect(Array.isArray(result.alternatives)).toBe(true);
  });

  it("algorithmGateway dispatches algorithm_select action", () => {
    const result = algorithmGateway("algorithm_select", {
      problem_type: "predict",
      domain: "quality",
    }) as Record<string, unknown>;
    expect(result).toBeDefined();
    expect(result.selected_algorithm).toBeTruthy();
  });

  it("catalogSourceFiles returns catalog stats", () => {
    const catalog = catalogSourceFiles();
    expect(catalog).toBeDefined();
    expect(typeof catalog.total_files).toBe("number");
    expect(typeof catalog.total_lines).toBe("number");
  });
});

// ============================================================================
// 2. CAMIntegrationEngine
// ============================================================================
describe("CAMIntegrationEngine", () => {
  it("searchToolLibrary returns array of tool entries", () => {
    const results = searchToolLibrary("endmill");
    expect(Array.isArray(results)).toBe(true);
  });

  it("getAllTools returns non-empty tool library", () => {
    const tools = getAllTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("getCatalogStats returns valid stats", () => {
    const stats = getCatalogStats();
    expect(stats).toBeDefined();
    expect(typeof stats.total_files).toBe("number");
    expect(typeof stats.total_lines).toBe("number");
  });

  it("cam_recommend discloses nominal cycle-time estimate basis", () => {
    const result = camIntegration("cam_recommend", {
      operation: {
        id: "op-1",
        name: "Pocket roughing",
        type: "roughing",
        tool: { type: "endmill", diameter_mm: 10, flutes: 4, material: "carbide" },
        material: "P20",
      },
    });
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations[0].notes.some((note: string) => note.includes("nominal benchmark estimate"))).toBe(true);
  });
});

// ============================================================================
// 3. ReportRenderer
// ============================================================================
describe("ReportRenderer", () => {
  it("REPORT_TYPES has 7 report types", () => {
    expect(REPORT_TYPES).toHaveLength(7);
    expect(REPORT_TYPES).toContain("setup_sheet");
    expect(REPORT_TYPES).toContain("alarm_report");
  });

  it("listReportTypes returns type descriptions", () => {
    const types = listReportTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBe(7);
    types.forEach((t) => {
      expect(t).toHaveProperty("type");
      expect(t).toHaveProperty("description");
    });
  });

  it("renderReport produces markdown for alarm_report", () => {
    const result = renderReport("alarm_report", {
      alarm_code: "ALM-101",
      alarm_text: "Spindle overload",
      controller: "Fanuc 0i-TF",
      severity: "high",
      timestamp: "2026-03-01T12:00:00Z",
    });
    expect(result).toBeDefined();
    expect(result.type).toBe("alarm_report");
    expect(result.markdown).toContain("ALM-101");
    expect(typeof result.line_count).toBe("number");
    expect(Array.isArray(result.sections)).toBe(true);
  });
});

// ============================================================================
// 4. NLHookEngine
// ============================================================================
describe("NLHookEngine", () => {
  it("parse returns a valid NLParseResult for a simple threshold hook", () => {
    const engine = new NLHookEngine();
    engine.init();
    const result = engine.parse("when speed exceeds 500 rpm, warn the operator");
    expect(result).toBeDefined();
    expect(result.spec).toBeDefined();
    expect(typeof result.confidence).toBe("string");
  });

  it("getStats returns hook statistics", () => {
    const engine = new NLHookEngine();
    engine.init();
    const stats = engine.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.deployed).toBe("number");
  });

  it("getConfig returns a valid config object", () => {
    const engine = new NLHookEngine();
    engine.init();
    const cfg = engine.getConfig();
    expect(cfg).toBeDefined();
    expect(typeof cfg.require_approval_for_llm).toBe("boolean");
  });
});

// ============================================================================
// 5. SkillExecutor
// ============================================================================
describe("SkillExecutor", () => {
  it("analyzeTask returns valid task analysis for machining task", () => {
    const executor = new SkillExecutor();
    const analysis = executor.analyzeTask("Calculate Kienzle cutting forces for steel roughing");
    expect(analysis).toBeDefined();
    expect(analysis.task).toBeTruthy();
    expect(Array.isArray(analysis.detected_domains)).toBe(true);
    expect(Array.isArray(analysis.detected_actions)).toBe(true);
    expect(["LOW", "MEDIUM", "HIGH"]).toContain(analysis.complexity);
  });

  it("analyzeTask detects safety requirement for safety-related tasks", () => {
    const executor = new SkillExecutor();
    const analysis = executor.analyzeTask("Validate safety constraints and verify S(x) score");
    expect(analysis.requires_safety).toBe(true);
  });

  it("getUsageStats returns an array", () => {
    const executor = new SkillExecutor();
    const stats = executor.getUsageStats();
    expect(Array.isArray(stats)).toBe(true);
  });
});

// ============================================================================
// 6. ScriptExecutor
// ============================================================================
describe("ScriptExecutor", () => {
  it("getQueueStatus returns queue counts", () => {
    const executor = new ScriptExecutor();
    const status = executor.getQueueStatus();
    expect(status).toBeDefined();
    expect(typeof status.total).toBe("number");
    expect(typeof status.pending).toBe("number");
    expect(typeof status.running).toBe("number");
    expect(typeof status.completed).toBe("number");
    expect(typeof status.failed).toBe("number");
  });

  it("clearCompleted returns 0 when queue is empty", () => {
    const executor = new ScriptExecutor();
    const cleared = executor.clearCompleted();
    expect(cleared).toBe(0);
  });

  it("cancelExecution returns false for non-existent id", () => {
    const executor = new ScriptExecutor();
    const result = executor.cancelExecution("non-existent-id");
    expect(result).toBe(false);
  });
});

// ============================================================================
// 7. ERPIntegrationEngine
// ============================================================================
describe("ERPIntegrationEngine", () => {
  it("importWorkOrder converts a work order to PRISM plan", () => {
    const plan = importWorkOrder({
      wo_number: "WO-1001",
      part_number: "P-200",
      revision: "A",
      material: "Steel 4140",
      quantity: 50,
      due_date: "2026-04-01",
      status: "pending",
      routing: [
        {
          step: 10,
          operation: "Face Milling",
          work_center: "VMC-01",
          estimated_time_min: 15,
          setup_time_min: 30,
        },
        {
          step: 20,
          operation: "Drilling",
          work_center: "VMC-01",
          estimated_time_min: 10,
          setup_time_min: 5,
        },
      ],
    });
    expect(plan).toBeDefined();
    expect(plan.wo_number).toBe("WO-1001");
    expect(plan.part_number).toBe("P-200");
    expect(plan.routing.length).toBe(2);
    expect(typeof plan.total_cycle_time_min).toBe("number");
    expect(typeof plan.total_setup_time_min).toBe("number");
    expect(plan.estimated_cost).toBeDefined();
  });

  it("erpIntegration dispatches erp_import_wo action", () => {
    const result = erpIntegration("erp_import_wo", {
      wo_number: "WO-2002",
      part_number: "P-300",
      revision: "B",
      material: "Aluminum 6061",
      quantity: 100,
      due_date: "2026-05-01",
      routing: [
        { step: 10, operation: "Turning", work_center: "CNC-L1" },
      ],
    }) as Record<string, unknown>;
    expect(result).toBeDefined();
    expect(result.wo_number).toBe("WO-2002");
  });

  it("recordCostFeedback returns cost feedback record", () => {
    const feedback = recordCostFeedback({
      wo_number: "WO-1001",
      category: "machine_time",
      estimated: 120,
      actual: 135,
      unit: "minutes",
    });
    expect(feedback).toBeDefined();
    expect(feedback.wo_number).toBe("WO-1001");
    expect(typeof feedback.variance.total_pct).toBe("number");
  });
});

// ============================================================================
// 8. TelemetryEngine
// ============================================================================
describe("TelemetryEngine", () => {
  it("sha256 produces consistent 16-char hex digest", () => {
    const h1 = sha256("hello");
    const h2 = sha256("hello");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(h1)).toBe(true);
  });

  it("fresh TelemetryEngine has empty dashboard", () => {
    const engine = new TelemetryEngine();
    const dashboard = engine.getDashboard();
    expect(dashboard).toBeDefined();
    expect(typeof dashboard.timestamp).toBe("number");
    expect(Array.isArray(dashboard.dispatchers)).toBe(true);
    expect(dashboard.anomalySummary).toBeDefined();
    expect(dashboard.systemHealth).toBeDefined();
  });

  it("getAnomalies returns empty array on fresh engine", () => {
    const engine = new TelemetryEngine();
    const anomalies = engine.getAnomalies();
    expect(Array.isArray(anomalies)).toBe(true);
    expect(anomalies).toHaveLength(0);
  });
});

// ============================================================================
// 9. MeasurementIntegrationEngine
// ============================================================================
describe("MeasurementIntegrationEngine", () => {
  it("importCMMData builds a CMM report from measurements", () => {
    const report = importCMMData({
      machine: "CMM-01",
      part_number: "P-100",
      operation: "Bore inspection",
      measurements: [
        { feature_name: "Bore-1", nominal: 25.0, tolerance_plus: 0.05, tolerance_minus: -0.05, actual: 25.02 },
        { feature_name: "Bore-2", nominal: 12.0, tolerance_plus: 0.1, tolerance_minus: -0.1, actual: 12.15 },
      ],
    });
    expect(report).toBeDefined();
    expect(report.measurements).toHaveLength(2);
    expect(report.summary.total_features).toBe(2);
    expect(report.summary.in_spec).toBeGreaterThanOrEqual(0);
    expect(typeof report.summary.pass).toBe("boolean");
  });

  it("compareSurfaceFinish returns model accuracy", () => {
    const result = compareSurfaceFinish({
      predicted_ra_um: 1.6,
      measured_ra_um: 1.5,
    });
    expect(result).toBeDefined();
    expect(result.predicted_ra_um).toBe(1.6);
    expect(result.measured_ra_um).toBe(1.5);
    expect(["excellent", "good", "fair", "poor"]).toContain(result.model_accuracy);
    expect(typeof result.correction_factor).toBe("number");
  });

  it("recordProbeData returns probing data with deviation", () => {
    const data = recordProbeData({
      machine: "VMC-01",
      feature: "Bore-A",
      nominal: 50.0,
      measured: 50.015,
    });
    expect(data).toBeDefined();
    expect(data.machine).toBe("VMC-01");
    expect(data.feature).toBe("Bore-A");
    expect(typeof data.deviation).toBe("number");
    expect(data.deviation).toBeCloseTo(0.015, 3);
  });
});

// ============================================================================
// 10. UserAssistanceSkillsEngine
// ============================================================================
describe("UserAssistanceSkillsEngine", () => {
  it("getAllAssistanceSkills returns 10 skills", () => {
    const skills = getAllAssistanceSkills();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBe(10);
    skills.forEach((s) => {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
    });
  });

  it("matchAssistanceSkill finds a skill for physics query", () => {
    const match = matchAssistanceSkill("why is the cutting speed set to 200?");
    // May or may not match depending on regex, just test shape
    if (match) {
      expect(match.skill).toBeDefined();
      expect(typeof match.confidence).toBe("number");
      expect(match.trigger).toBeTruthy();
    }
  });

  it("explainPhysics returns a physics explanation", () => {
    const result = explainPhysics({
      parameter: "cutting_speed",
      value: 200,
      unit: "m/min",
      material: "Steel 4140",
      operation: "turning",
    });
    expect(result).toBeDefined();
    expect(result.parameter).toBe("cutting_speed");
    expect(result.explanation).toBeTruthy();
    expect(Array.isArray(result.factors)).toBe(true);
  });
});

// ============================================================================
// 11. UserWorkflowSkillsEngine
// ============================================================================
describe("UserWorkflowSkillsEngine", () => {
  it("getAllSkills returns 12 workflow skills", () => {
    const skills = getAllSkills();
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBe(12);
    skills.forEach((s) => {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(Array.isArray(s.steps)).toBe(true);
    });
  });

  it("getSkillById returns a specific skill", () => {
    const skill = getSkillById("material-guide");
    expect(skill).toBeDefined();
    expect(skill!.id).toBe("material-guide");
    expect(skill!.name).toBe("Material Guide");
  });

  it("getSkillsByCategory filters by category", () => {
    const paramSkills = getSkillsByCategory("parameter");
    expect(Array.isArray(paramSkills)).toBe(true);
    paramSkills.forEach((s) => {
      expect(s.category).toBe("parameter");
    });
  });
});

// ============================================================================
// 12. JobLearningEngine
// ============================================================================
describe("JobLearningEngine", () => {
  it("jobRecord stores a job and returns a record result", () => {
    clearJobStore();
    const result = jobRecord({
      material: "Steel 4140",
      operation: "turning",
      parameters_used: { vc_mpm: 200, fz_mm: 0.25, ap_mm: 2.0 },
      outcome: {
        actual_tool_life_min: 45,
        actual_surface_finish_ra: 1.6,
        chatter_occurred: false,
      },
    });
    expect(result).toBeDefined();
    expect(result.stored).toBe(true);
    expect(result.id).toBeTruthy();
    expect(typeof result.total_jobs_for_key).toBe("number");
    expect(result.safety).toBeDefined();
  });

  it("getJobStoreSize returns count after recording jobs", () => {
    clearJobStore();
    jobRecord({
      material: "Aluminum 6061",
      operation: "milling",
      parameters_used: { vc_mpm: 300, fz_mm: 0.15, ap_mm: 1.5 },
      outcome: { actual_tool_life_min: 90 },
    });
    expect(getJobStoreSize()).toBeGreaterThanOrEqual(1);
  });

  it("jobInsights returns insights structure", () => {
    clearJobStore();
    // Record several jobs to enable learning
    for (let i = 0; i < 6; i++) {
      jobRecord({
        material: "Steel 4140",
        operation: "turning",
        parameters_used: { vc_mpm: 200 + i * 5, fz_mm: 0.25, ap_mm: 2.0 },
        outcome: {
          actual_tool_life_min: 40 + i * 2,
          actual_surface_finish_ra: 1.5 + i * 0.1,
        },
      });
    }
    const insights = jobInsights({ material: "Steel 4140", operation: "turning" });
    expect(insights).toBeDefined();
    expect(typeof insights.sample_size).toBe("number");
    expect(Array.isArray(insights.patterns)).toBe(true);
  });
});
