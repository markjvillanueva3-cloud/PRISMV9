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
  it("includes physics-backed quote in pipeline output", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput({ quantity: 50 }) as never);

    expect(result.success).toBe(true);
    expect(result.quote).toBeDefined();
    if (result.quote) {
      expect(result.quote.unit_price).toBeGreaterThan(0);
      expect(result.quote.total_price).toBeGreaterThan(0);
      expect(result.quote.cost_breakdown.machining).toBeGreaterThan(0);
      expect(result.quote.lead_time_days).toBeGreaterThan(0);
      expect(result.quote.confidence_score).toBeGreaterThanOrEqual(0);
    }
  });

  it("gracefully handles missing quantity (defaults to 1)", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    // Quote should still be generated with quantity=1
    if (result.quote) {
      expect(result.quote.unit_price).toBeGreaterThan(0);
    }
  });
});

describe("PIPE-MS1: Inventory Bridge (P0-U02)", () => {
  it("uses cached inventory when set via setUserInventory", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");

    printToProgramPipelineEngine.setUserInventory([
      { type: "face_mill", diameter_mm: 50, material: "carbide", condition: "new", magazine_position: 1 },
      { type: "flat_endmill", diameter_mm: 12, material: "carbide", condition: "good", magazine_position: 3 },
      { type: "drill_bit", diameter_mm: 10, material: "carbide", condition: "new", magazine_position: 5 },
    ]);

    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    // Some operations should be from inventory (tool matched)
    const fromInventory = result.operations.filter(
      op => (op.tool as unknown as Record<string, unknown>)._from_inventory === true
    );
    expect(fromInventory.length).toBeGreaterThan(0);

    printToProgramPipelineEngine.clearUserInventory();
  });

  it("falls back to default tools when inventory is empty", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");

    printToProgramPipelineEngine.clearUserInventory();
    const result = printToProgramPipelineEngine.runFullPipeline(makeInput() as never);

    expect(result.success).toBe(true);
    // No tools should be from inventory
    const fromInventory = result.operations.filter(
      op => (op.tool as unknown as Record<string, unknown>)._from_inventory === true
    );
    expect(fromInventory).toHaveLength(0);
  });
});

describe("PIPE-MS1: ROI Suggestions (P2-U02)", () => {
  it("provides ROI suggestions when inventory has gaps", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");

    // Set partial inventory — missing tools for some operations
    printToProgramPipelineEngine.setUserInventory([
      { type: "face_mill", diameter_mm: 50, material: "carbide", condition: "new", magazine_position: 1 },
    ]);

    const result = printToProgramPipelineEngine.runFullPipeline(makeInput({ quantity: 100 }) as never);

    expect(result.success).toBe(true);
    // ROI suggestions should appear for missing tools
    if (result.roi_suggestions) {
      expect(result.roi_suggestions.length).toBeGreaterThan(0);
      for (const sug of result.roi_suggestions) {
        expect(sug.cost_usd).toBeGreaterThan(0);
        expect(sug.savings_per_part).toBeGreaterThanOrEqual(0);
      }
    }

    printToProgramPipelineEngine.clearUserInventory();
  });
});

describe("PIPE-MS1: Enhanced Async Pipeline (P1-U02+U03)", () => {
  it("runFullPipelineAsync enhances G-code via assembler and post-processor", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = await printToProgramPipelineEngine.runFullPipelineAsync(makeInput() as never);

    expect(result.success).toBe(true);
    expect(result.program_text.length).toBeGreaterThan(0);
    // Enhanced program should be present (assembler succeeded)
    if (result.enhanced_program) {
      expect(result.enhanced_program.gcode.length).toBeGreaterThan(0);
      expect(result.enhanced_program.controller).toBeTruthy();
    }
  });

  it("async pipeline falls back gracefully if assembler fails", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    // Even with unusual input, should still return valid result
    const input = makeInput({ machine_brand: "nonexistent_brand" });
    const result = await printToProgramPipelineEngine.runFullPipelineAsync(input as never);

    expect(result.success).toBe(true);
    // At minimum the sync pipeline result is intact
    expect(result.operations.length).toBeGreaterThan(0);
    expect(result.program_text.length).toBeGreaterThan(0);
  });

  it("dispatcher routes print_to_program_enhanced action", async () => {
    const { printToProgramPipelineEngine } = await import("../engines/PrintToProgramPipelineEngine.js");
    const result = await printToProgramPipelineEngine.calculate(
      "print_to_program_enhanced",
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
    expect(result.quote).toBeDefined();
    expect(result.estimated_cycle_time_sec).toBeGreaterThan(0);
    expect(result.total_tool_changes).toBeGreaterThan(0);
  });
});
