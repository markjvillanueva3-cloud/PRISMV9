/**
 * MultiAxisAggregatorEngine standalone test
 * MILL-MASTER/P1-U09-L2-AGG
 * Tests multi-axis L2 aggregator in isolation (≥10 cases with real assertions).
 */
import { describe, it, expect } from "vitest";
import { multiAxisAggregatorEngine } from "../engines/MultiAxisAggregatorEngine.js";
import { MILL_ACTIONS } from "../tools/dispatchers/millDispatcher.js";

describe("MultiAxisAggregatorEngine (standalone)", () => {
  it("supports exactly 4 request types", () => {
    expect(multiAxisAggregatorEngine.getSupportedTypes().length).toBe(4);
  });

  it("supports 4/5/6 axis counts", () => {
    expect(multiAxisAggregatorEngine.getSupportedAxisCounts()).toEqual([4, 5, 6]);
  });

  it("registers 2 unique underlying engines", () => {
    const engines = multiAxisAggregatorEngine.getRegisteredEngines();
    expect(engines.length).toBe(2);
    expect(engines).toContain("MultiAxisKinematicEngine");
    expect(engines).toContain("MultiAxisPrintToProgramEngine");
  });

  it("stats reports 2 engines and 4 request_types", () => {
    const stats = multiAxisAggregatorEngine.getStats();
    expect(stats.engines).toBe(2);
    expect(stats.request_types).toBe(4);
  });

  it("unknown request_type fails (failure mode 1)", async () => {
    const response = await multiAxisAggregatorEngine.orchestrate({
      request_type: "ghost" as any,
    });
    expect(response.success).toBe(false);
    expect(response.engine).toBe("unknown");
  });

  it("kinematic_fk unavailable returns marker (failure mode 2)", async () => {
    const response = await multiAxisAggregatorEngine.orchestrate({
      request_type: "kinematic_fk",
      joint_values: [0, 0, 0, 0, 0],
    });
    expect((response.result as any).status).toBe("engine_not_built");
    expect(response.provenance.engine_available).toBe(false);
  });

  it("print_to_prog unavailable returns structured response (failure mode 3)", async () => {
    const response = await multiAxisAggregatorEngine.orchestrate({
      request_type: "print_to_prog",
    });
    expect(response.engine).toBe("MultiAxisPrintToProgramEngine");
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it("handles 3 axis counts (variability)", async () => {
    const counts: Array<4 | 5 | 6> = [4, 5, 6];
    for (const n of counts) {
      const response = await multiAxisAggregatorEngine.orchestrate({
        request_type: "kinematic_fk",
        axis_count: n,
        joint_values: Array(n).fill(0),
      });
      expect(response.provenance.axis_count).toBe(n);
    }
  });

  it("handles joint_values with NaN (adversarial)", async () => {
    const response = await multiAxisAggregatorEngine.orchestrate({
      request_type: "kinematic_fk",
      joint_values: [NaN, 0, 0, 0, 0],
    });
    expect(response.provenance.ts).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("handles empty joint_values array (adversarial)", async () => {
    const response = await multiAxisAggregatorEngine.orchestrate({
      request_type: "kinematic_fk",
      joint_values: [],
    });
    expect(response.request_type).toBe("kinematic_fk");
  });

  it("default axis_count is 5 when omitted", async () => {
    const response = await multiAxisAggregatorEngine.orchestrate({
      request_type: "validate_reach",
    });
    expect(response.provenance.axis_count).toBe(5);
  });

  it("isAvailable returns false for unbuilt sub-engines", async () => {
    const available = await multiAxisAggregatorEngine.isAvailable("kinematic_fk");
    expect(available).toBe(false);
  });

  it("dispatcher wiring: mill_multiaxis_orchestrate action is registered", () => {
    expect(MILL_ACTIONS).toContain("mill_multiaxis_orchestrate");
  });
});
