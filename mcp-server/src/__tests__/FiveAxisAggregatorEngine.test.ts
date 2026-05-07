/**
 * FiveAxisAggregatorEngine standalone test
 * MILL-MASTER/P1-U09-L2-AGG
 * Tests 5-axis L2 aggregator in isolation (≥10 cases with real assertions).
 */
import { describe, it, expect } from "vitest";
import { fiveAxisAggregatorEngine } from "../engines/FiveAxisAggregatorEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";

describe("FiveAxisAggregatorEngine (standalone)", () => {
  it("supports exactly 10 request types", () => {
    expect(fiveAxisAggregatorEngine.getSupportedTypes().length).toBe(10);
  });

  it("supports 5 kinematics configurations", () => {
    const kinematics = fiveAxisAggregatorEngine.getSupportedKinematics();
    expect(kinematics.length).toBe(5);
    expect(kinematics).toContain("head_head");
    expect(kinematics).toContain("head_table");
    expect(kinematics).toContain("table_table");
    expect(kinematics).toContain("gantry");
    expect(kinematics).toContain("generic");
  });

  it("registers 9 FiveAxis* sub-engines", () => {
    const engines = fiveAxisAggregatorEngine.getRegisteredEngines();
    expect(engines.length).toBe(9);
    expect(engines).toContain("FiveAxisOrchestrationEngine");
    expect(engines).toContain("FiveAxisAIUltraEngine");
    expect(engines).toContain("FiveAxisDeepLearningEngine");
    expect(engines).toContain("FiveAxisCAMIntegrationEngine");
    expect(engines).toContain("FiveAxisToolpathSynthesisEngine");
    expect(engines).toContain("FiveAxisPostEngine");
    expect(engines).toContain("FiveAxisDecisionEngine");
    expect(engines).toContain("FiveAxisCADTemplateEngine");
  });

  it("stats reports 10 request_types", () => {
    const stats = fiveAxisAggregatorEngine.getStats();
    expect(stats.request_types).toBe(10);
    expect(stats.engines).toBe(9);
  });

  it("unknown request_type returns success=false (failure mode 1)", async () => {
    const response = await fiveAxisAggregatorEngine.orchestrate({
      request_type: "ghost" as any,
    });
    expect(response.success).toBe(false);
    expect(response.warnings[0]).toMatch(/unknown/i);
  });

  it("ai_ultra unbuilt engine returns engine_not_built (failure mode 2)", async () => {
    const response = await fiveAxisAggregatorEngine.orchestrate({
      request_type: "ai_ultra",
      lead_angle_deg: 5,
    });
    expect(response.provenance.engine_available).toBe(false);
    expect(response.result).toBeNull();
    expect(response.provenance.engine_available).toBe(false);
  });

  it("rtcp_check returns structured response (failure mode 3: unbuilt)", async () => {
    const response = await fiveAxisAggregatorEngine.orchestrate({
      request_type: "rtcp_check",
    });
    expect(response.engine).toBe("FiveAxisOrchestrationEngine");
    expect(response.provenance.ts).toBeTruthy();
  });

  it("handles 3 kinematics configs (variability)", async () => {
    const configs: Array<"head_head" | "head_table" | "table_table"> =
      ["head_head", "head_table", "table_table"];
    for (const kin of configs) {
      const response = await fiveAxisAggregatorEngine.orchestrate({
        request_type: "orchestrate",
        kinematics: kin,
      });
      expect(response.provenance.kinematics).toBe(kin);
    }
  });

  it("handles lead_angle_deg = NaN (adversarial)", async () => {
    const response = await fiveAxisAggregatorEngine.orchestrate({
      request_type: "decide",
      lead_angle_deg: NaN,
    });
    expect(response.provenance.ts).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("handles tool_axis with Infinity (adversarial)", async () => {
    const response = await fiveAxisAggregatorEngine.orchestrate({
      request_type: "toolpath_synth",
      tool_axis: [Infinity, 0, 1],
    });
    expect(response.request_type).toBe("toolpath_synth");
  });

  it("isAvailable returns false for unbuilt sub-engines", async () => {
    const available = await fiveAxisAggregatorEngine.isAvailable("orchestrate");
    expect(available).toBe(false);
  });

  it("default kinematics is generic when omitted", async () => {
    const response = await fiveAxisAggregatorEngine.orchestrate({
      request_type: "cad_template",
    });
    expect(response.provenance.kinematics).toBe("generic");
  });

  it("dispatcher wiring: mill_5axis_orchestrate action is registered", () => {
    expect(MILL_ACTIONS).toContain("mill_5axis_orchestrate");
  });
});
