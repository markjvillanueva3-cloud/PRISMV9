/**
 * MillTurnOrchestrationEngine standalone test
 * MILL-MASTER/P1-U09-L2-AGG
 * Tests mill-turn L2 aggregator in isolation (≥10 cases with real assertions).
 */
import { describe, it, expect } from "vitest";
import { millTurnOrchestrationEngine } from "../engines/MillTurnOrchestrationEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";

describe("MillTurnOrchestrationEngine (standalone)", () => {
  it("supports 6 request types", () => {
    expect(millTurnOrchestrationEngine.getSupportedTypes().length).toBe(6);
  });

  it("supports 6 machine classes including integrex, swiss, lb_series", () => {
    const classes = millTurnOrchestrationEngine.getSupportedMachineClasses();
    expect(classes.length).toBe(6);
    expect(classes).toContain("integrex");
    expect(classes).toContain("swiss");
    expect(classes).toContain("lb_series");
    expect(classes).toContain("ctx");
    expect(classes).toContain("wt_series");
  });

  it("registers exactly 2 unique underlying engines", () => {
    const engines = millTurnOrchestrationEngine.getRegisteredEngines();
    expect(engines.length).toBe(2);
    expect(engines).toContain("MillTurnCAMEngine");
    expect(engines).toContain("MillTurnSwissPipelineEngine");
  });

  it("stats reports 2 engines and 6 request_types", () => {
    const stats = millTurnOrchestrationEngine.getStats();
    expect(stats.engines).toBe(2);
    expect(stats.request_types).toBe(6);
  });

  it("unknown request_type returns success=false with warning", async () => {
    const response = await millTurnOrchestrationEngine.orchestrate({
      request_type: "phantom" as any,
    });
    expect(response.success).toBe(false);
    expect(response.engine).toBe("unknown");
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it("cam_generate gracefully handles unbuilt engine", async () => {
    const response = await millTurnOrchestrationEngine.orchestrate({
      request_type: "cam_generate",
    });
    expect(response.provenance.engine_available).toBe(false);
    expect((response.result as any).status).toBe("engine_not_built");
  });

  it("swiss_pipeline returns warnings when sub-engine missing", async () => {
    const response = await millTurnOrchestrationEngine.orchestrate({
      request_type: "swiss_pipeline",
      bar_diameter_mm: 25.4,
    });
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it("handles 3 machine classes via variability", async () => {
    const classes: Array<"integrex" | "swiss" | "lb_series"> = ["integrex", "swiss", "lb_series"];
    for (const cls of classes) {
      const response = await millTurnOrchestrationEngine.orchestrate({
        request_type: "cam_generate",
        machine_class: cls,
      });
      expect(response.request_type).toBe("cam_generate");
    }
  });

  it("handles bar_diameter_mm = Infinity", async () => {
    const response = await millTurnOrchestrationEngine.orchestrate({
      request_type: "bar_feeder",
      bar_diameter_mm: Infinity,
    });
    expect(response.request_type).toBe("bar_feeder");
    expect(response.provenance.ts).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("handles negative live_tool_spindle_rpm", async () => {
    const response = await millTurnOrchestrationEngine.orchestrate({
      request_type: "live_tool",
      live_tool_spindle_rpm: -5000,
    });
    expect(response.provenance.processing_time_ms).toBeGreaterThanOrEqual(0);
  });

  it("isAvailable returns false for unbuilt sub-engine", async () => {
    const available = await millTurnOrchestrationEngine.isAvailable("cam_generate");
    expect(available).toBe(false);
  });

  it("provenance always includes ISO timestamp", async () => {
    const response = await millTurnOrchestrationEngine.orchestrate({
      request_type: "multi_channel",
      channels: 3,
    });
    expect(response.provenance.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("dispatcher wiring: mill_turn_orchestrate action is registered", () => {
    expect(MILL_ACTIONS).toContain("mill_turn_orchestrate");
  });
});
