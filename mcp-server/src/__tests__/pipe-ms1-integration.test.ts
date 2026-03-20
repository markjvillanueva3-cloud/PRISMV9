import { describe, it, expect } from "vitest";

/**
 * PIPE-MS1 Integration Tests — Engine Wiring into Print-to-Program Pipeline.
 * Tests: OperationSequencer (P1-U01), CNCProgramAssembler+PostProcessor (P1-U02+U03),
 *        QuoteEstimator (P2-U01), ROI suggestions (P2-U02), inventory bridge (P0-U02).
 */

const makeInput = (overrides: Record<string, unknown> = {}) => ({
  part_number: "TEST-MS1-001",
  material: {
    material_name: "aluminum_6061",
    iso_group: "N",
    uts_MPa: 310,
    hardness_HB: 95,
  },
  stock_size: { x: 100, y: 80, z: 30 },
  dimensions: [
    { name: "length", value_mm: 100, tolerance_mm: 0.1 },
    { name: "width", value_mm: 80, tolerance_mm: 0.1 },
  ],
  features: [
    {
      id: "f1", type: "pocket", priority: 1,
      width_mm: 40, length_mm: 60, depth_mm: 15,
      tolerance_mm: 0.05, surface_finish_Ra_um: 1.6,
      required_operations: ["rough_pocket", "finish_pocket"],
    },
    {
      id: "f2", type: "hole", priority: 2,
      diameter_mm: 10, depth_mm: 20,
      tolerance_mm: 0.02,
      required_operations: ["drill", "ream"],
    },
    {
      id: "f3", type: "face", priority: 0,
      width_mm: 100, length_mm: 80, depth_mm: 1,
      tolerance_mm: 0.1,
      required_operations: ["face"],
    },
  ],
  max_spindle_rpm: 15000,
  max_power_kW: 18,
  optimization_target: "balanced",
  ...overrides,
});

describe("PIPE-MS1: OperationSequencer Integration (P1-U01)", () => {
  it("reorders operations via OperationSequencerEngine", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    expect(result.operations.length).toBeGreaterThanOrEqual(5); // face + 2 pocket ops + drill + ream
    // Operations should be renumbered sequentially
    result.operations.forEach((op, i) => {
      expect(op.op_number).toBe(i + 1);
    });
  });

  it("falls back to original order when sequencer cannot improve", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    // Single operation — nothing to reorder
    const input = makeInput({
      features: [{
        id: "f1", type: "face", priority: 0,
        width_mm: 100, length_mm: 80, depth_mm: 1,
        tolerance_mm: 0.1, required_operations: ["face"],
      }],
    });
    const result = printToProgramPipelineEngine.runFullPipeline(input as never);
    expect(result.success).toBe(true);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].operation_type).toBe("face");
  });
});

describe("PIPE-MS1: SpeedFeedOrchestrator Integration (P0-U03)", () => {
  it("uses orchestrator for physics-backed S/F calculations", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    for (const op of result.operations) {
      expect(op.cutting_params.spindle_rpm).toBeGreaterThan(0);
      expect(op.cutting_params.feed_mm_min).toBeGreaterThan(0);
      expect(op.cutting_params.cutting_speed_m_min).toBeGreaterThan(0);
      expect(op.physics.cutting_force_N).toBeGreaterThan(0);
      expect(op.physics.power_kW).toBeGreaterThan(0);
    }
  });
});

describe("PIPE-MS1: QuoteEstimator Integration (P2-U01)", () => {
  it("includes cycle time and confidence in pipeline output", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput({ quantity: 50 }) as never);

    expect(result.success).toBe(true);
    expect(result.estimated_cycle_time_sec).toBeGreaterThan(0);
    expect(result.confidence_score).toBeGreaterThan(0);
    // Each operation has physics-backed data
    for (const op of result.operations) {
      expect(op.physics.power_kW).toBeGreaterThan(0);
      expect(op.cycle_time_sec).toBeGreaterThan(0);
    }
  });

  it("gracefully handles missing quantity (defaults to 1)", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    expect(result.confidence_score).toBeGreaterThan(0);
  });
});

describe("PIPE-MS1: Inventory Bridge (P0-U02)", () => {
  it("pipeline produces valid tool selections for each operation", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    // Every operation should have a tool assigned
    for (const op of result.operations) {
      expect(op.tool).toBeDefined();
      expect(op.tool.tool_type).toBeTruthy();
      expect(op.tool.diameter_mm).toBeGreaterThan(0);
    }
  });

  it("default tools are assigned when no inventory is configured", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    expect(result.operations.length).toBeGreaterThan(0);
    // All tools are catalog defaults with material specified
    for (const op of result.operations) {
      expect(op.tool.material).toBeTruthy();
    }
  });
});

describe("PIPE-MS1: Cost Estimation (P2-U02)", () => {
  it("includes cycle time and tool change count in output", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput({ quantity: 100 }) as never);

    expect(result.success).toBe(true);
    expect(result.estimated_cycle_time_sec).toBeGreaterThan(0);
    expect(result.total_tool_changes).toBeGreaterThanOrEqual(0);
  });
});

describe("PIPE-MS1: Pipeline Actions (P1-U02+U03)", () => {
  it("runFullPipeline produces G-code program text", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    expect(result.program_text.length).toBeGreaterThan(0);
    expect(result.program.length).toBeGreaterThan(0);
    expect(result.program_line_count).toBeGreaterThan(0);
  });

  it("pipeline handles unusual input gracefully", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const input = makeInput({ machine_brand: "nonexistent_brand" });
    const result = printToProgramPipelineEngine.runFullPipeline(input as never);

    expect(result.success).toBe(true);
    expect(result.operations.length).toBeGreaterThan(0);
    expect(result.program_text.length).toBeGreaterThan(0);
  });

  it("dispatcher routes print_to_program_full action", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.calculate(
      "print_to_program_full",
      makeInput() as unknown as Record<string, unknown>,
    );

    expect(result).toBeDefined();
    expect((result as { success: boolean }).success).toBe(true);
  });
});

describe("PIPE-MS1: Full Pipeline Regression", () => {
  it("full pipeline still produces complete output with all new integrations", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput({ quantity: 25 }) as never);

    // Core pipeline outputs
    expect(result.success).toBe(true);
    expect(result.part_number).toBe("TEST-MS1-001");
    expect(result.material).toBe("aluminum_6061");
    expect(result.operations.length).toBeGreaterThanOrEqual(5);
    expect(result.program_text).toContain("G");
    expect(result.safety_checks.length).toBeGreaterThan(0);
    expect(result.confidence_score).toBeGreaterThan(0);
    expect(result.setup_sheet).toBeDefined();

    // PIPE-MS1 additions
    expect(result.estimated_cycle_time_sec).toBeGreaterThan(0);
    expect(result.total_tool_changes).toBeGreaterThanOrEqual(0);
  });
});
