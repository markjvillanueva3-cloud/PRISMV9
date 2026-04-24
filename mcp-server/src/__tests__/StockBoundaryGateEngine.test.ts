/**
 * StockBoundaryGateEngine Tests — U-LSR06 (LATHE-HARDENED-MS0)
 */

import { describe, it, expect } from "vitest";
import {
  stockBoundaryGateEngine,
  StockBoundaryGateEngine,
  StockBoundaryBlockError,
  StockBoundaryGateResultSchema,
  type StockGeometry,
  type Workholding,
} from "../engines/StockBoundaryGateEngine.js";
import type {
  ToolpathProgram,
  ToolpathMove,
  ToolpathOperation,
} from "../engines/LathePrintToolpathGeneratorEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STOCK_BAR: StockGeometry = { od_mm: 50, length_mm: 100, id_mm: 0 };
const STOCK_TUBE: StockGeometry = { od_mm: 50, length_mm: 100, id_mm: 20 };

const WORKHOLDING: Workholding = { gripping_length_mm: 25 };
// ⇒ grip region z ∈ [75, 100], safe-cut region z ∈ [0, 75 − minClearance]

function move(x: number | undefined, z: number | undefined): ToolpathMove {
  return { move_type: "feed_linear", gcode: "G01", x_mm: x, z_mm: z };
}

function op(opNumber: number, moves: ToolpathMove[]): ToolpathOperation {
  return {
    op_number: opNumber,
    featureId: `F${opNumber}`,
    featureType: "od_turn",
    strategy_id: "OD_ROUGH",
    tool_id: "T01",
    cutting_speed_m_min: 200,
    spindle_rpm: 1800,
    feed_mm_rev: 0.2,
    feed_mm_min: 360,
    depth_of_cut_mm: 1,
    number_of_passes: 1,
    moves,
    cycle_time_sec: 10,
    cutting_force_n: 400,
    material_removal_rate_cm3_min: 40,
    warnings: [],
  };
}

function program(ops: ToolpathOperation[]): ToolpathProgram {
  return {
    program_id: "P-STOCK-TEST",
    source_sequence_plan_id: "S-1",
    operations: ops,
    total_cycle_time_sec: 10 * ops.length,
    total_rapid_time_sec: 0,
    total_feed_time_sec: 10,
    total_cutting_volume_cm3: 40,
    gcode_preview: "",
    machine_envelope_check: {
      max_x_mm: 50, max_z_mm: 100, min_x_mm: 0, min_z_mm: 0, within_envelope: true,
    },
    warnings: [],
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------

describe("StockBoundaryGateEngine", () => {
  describe("Singleton + schema", () => {
    it("exports a singleton that is an instance of the class", () => {
      expect(stockBoundaryGateEngine).toBeInstanceOf(StockBoundaryGateEngine);
    });

    it("result conforms to schema", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 0), move(25, 60)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      const parsed = StockBoundaryGateResultSchema.safeParse(r);
      expect(parsed.success).toBe(true);
    });
  });

  describe("Happy path", () => {
    it("SAFE for a clean OD turn fully inside stock + jaw clearance", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [
          move(25, 0),    // approach at od/2
          move(24, 0),    // feed in 1 mm
          move(24, 60),   // feed Z -60 (well inside safe region 0..70)
          move(25, 60),   // retract radially
        ])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("SAFE");
      expect(r.overall.gate_block).toBe(false);
      expect(r.violations).toHaveLength(0);
      expect(r.warnings).toHaveLength(0);
      expect(r.overall.closest_jaw_clearance_mm).toBeGreaterThan(5);
    });

    it("per_operation summary records x/z bounds and jaw clearance", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 0), move(24, 40)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.per_operation[0].x_min_mm).toBe(24);
      expect(r.per_operation[0].x_max_mm).toBe(25);
      expect(r.per_operation[0].z_min_mm).toBe(0);
      expect(r.per_operation[0].z_max_mm).toBe(40);
      // Jaw clearance: grip starts at 75; tool max z = 40 → clearance = 35 mm
      expect(r.per_operation[0].min_jaw_clearance_mm).toBe(35);
    });
  });

  describe("Hard-block clauses", () => {
    it("CENTERLINE_CROSSED when a move has x_mm < 0", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(10, 0), move(-0.5, 50)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("BLOCKED");
      expect(r.overall.blocking_clauses).toContain("CENTERLINE_CROSSED");
      const v = r.violations.find((x) => x.clause === "CENTERLINE_CROSSED")!;
      expect(v.op_number).toBe(1);
      expect(v.offending_value_mm).toBe(-0.5);
      expect(v.detail).toContain("crosses spindle centreline");
    });

    it("BELOW_ID when tube toolpath drops below id/2", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(5, 0), move(5, 50)])]), // x=5 < id/2=10
        stock: STOCK_TUBE,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("BLOCKED");
      expect(r.overall.blocking_clauses).toContain("BELOW_ID");
      const v = r.violations.find((x) => x.clause === "BELOW_ID")!;
      expect(v.limit_mm).toBe(STOCK_TUBE.id_mm / 2);
      expect(v.detail).toContain("breached bore wall");
    });

    it("JAW_COLLISION when z enters gripping region", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 0), move(25, 80)])]), // z=80 > grip start 75
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("BLOCKED");
      expect(r.overall.blocking_clauses).toContain("JAW_COLLISION");
      const v = r.violations.find((x) => x.clause === "JAW_COLLISION")!;
      expect(v.op_number).toBe(1);
      expect(v.offending_value_mm).toBe(80);
      expect(v.limit_mm).toBe(75);
    });

    it("STOCK_BACK_PENETRATED when z > stock length", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 0), move(25, 150)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("BLOCKED");
      expect(r.overall.blocking_clauses).toContain("STOCK_BACK_PENETRATED");
      const v = r.violations.find((x) => x.clause === "STOCK_BACK_PENETRATED")!;
      expect(v.offending_value_mm).toBe(150);
      expect(v.limit_mm).toBe(100);
    });

    it("NAN_MOVE when a move contains NaN x or z", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(NaN, 0)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("BLOCKED");
      expect(r.overall.blocking_clauses).toContain("NAN_MOVE");
    });

    it("NAN_MOVE with Infinity z", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, Infinity)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("BLOCKED");
      expect(r.overall.blocking_clauses).toContain("NAN_MOVE");
    });

    it("INVALID_STOCK when gripping_length >= stock length", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 0)])]),
        stock: STOCK_BAR,
        workholding: { gripping_length_mm: 100 }, // equals length
      });
      expect(r.overall.status).toBe("BLOCKED");
      expect(r.overall.blocking_clauses).toContain("INVALID_STOCK");
    });

    it("schema rejects stock where id >= od (zod refine)", () => {
      expect(() =>
        stockBoundaryGateEngine.gate({
          program: program([op(1, [move(25, 0)])]),
          stock: { od_mm: 20, length_mm: 100, id_mm: 25 },
          workholding: WORKHOLDING,
        }),
      ).toThrow();
    });
  });

  describe("Warning clauses (no block)", () => {
    it("JAW_CLEARANCE_LOW when tool Z approaches within min_jaw_clearance_mm of grip", () => {
      // grip starts at 75; zGripSafe = 75 − 5 = 70; move at z=72 is within 3 mm of grip
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 0), move(25, 72)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("WARNING");
      expect(r.overall.gate_block).toBe(false);
      expect(r.overall.warning_clauses).toContain("JAW_CLEARANCE_LOW");
    });

    it("OD_EXCEEDED when a move lives beyond od/2 + approach_clearance", () => {
      // od/2 = 25, default approach clearance 10 → limit 35. Use x=40 → warning.
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(40, -5), move(25, 0)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("WARNING");
      expect(r.overall.warning_clauses).toContain("OD_EXCEEDED");
    });

    it("STOCK_FRONT_EXCEEDED when a move lives far ahead of the face", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, -20), move(25, 0)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("WARNING");
      expect(r.overall.warning_clauses).toContain("STOCK_FRONT_EXCEEDED");
    });

    it("tightening min_jaw_clearance_mm promotes previously-safe op to WARNING", () => {
      const loose = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 65)])]), // z=65, grip-safe at zGripSafe=70
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(loose.overall.status).toBe("SAFE");

      const tight = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 65)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
        min_jaw_clearance_mm: 15, // safe edge moves to 75-15=60; z=65 now flags
      });
      expect(tight.overall.status).toBe("WARNING");
      expect(tight.overall.warning_clauses).toContain("JAW_CLEARANCE_LOW");
    });
  });

  describe("gateOrThrow", () => {
    it("returns result on SAFE without throwing", () => {
      const r = stockBoundaryGateEngine.gateOrThrow({
        program: program([op(1, [move(25, 0), move(24, 40)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("SAFE");
    });

    it("returns result on WARNING (does not throw)", () => {
      const r = stockBoundaryGateEngine.gateOrThrow({
        program: program([op(1, [move(25, 72)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("WARNING");
    });

    it("throws StockBoundaryBlockError on BLOCKED with full result + code", () => {
      let caught: unknown = null;
      try {
        stockBoundaryGateEngine.gateOrThrow({
          program: program([op(1, [move(25, 0), move(25, 90)])]),
          stock: STOCK_BAR,
          workholding: WORKHOLDING,
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(StockBoundaryBlockError);
      const err = caught as StockBoundaryBlockError;
      expect(err.code).toBe("STOCK_BOUNDARY_BLOCKED");
      expect(err.name).toBe("StockBoundaryBlockError");
      expect(err.message).toContain("STOCK_BOUNDARY_BLOCKED");
      expect(err.message).toContain("allow_boundary_override=true");
      expect(err.result.overall.gate_block).toBe(true);
      expect(err.result.overall.blocking_clauses).toContain("JAW_COLLISION");
    });
  });

  describe("Recommendations", () => {
    it("happy path includes closest jaw clearance", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 0), move(25, 40)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.recommendations).toHaveLength(1);
      expect(r.overall.recommendations[0]).toContain("within stock/jaw boundaries");
      expect(r.overall.recommendations[0]).toContain("35.00 mm");
    });

    it("JAW_COLLISION produces explicit re-grip recommendation", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(25, 0), move(25, 80)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      const rec = r.overall.recommendations.find((x) => x.includes("gripping region"));
      expect(typeof rec).toBe("string");
      expect(rec!).toContain("75.00");
    });

    it("CENTERLINE_CROSSED recommendation mentions X=0 clip", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([op(1, [move(-1, 0)])]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      const rec = r.overall.recommendations.find((x) => x.includes("clip final move"));
      expect(typeof rec).toBe("string");
      expect(rec!).toContain("X=0");
    });
  });

  describe("Adversarial", () => {
    it("throws on null program", () => {
      expect(() =>
        stockBoundaryGateEngine.gate({
          program: null,
          stock: STOCK_BAR,
          workholding: WORKHOLDING,
        } as never),
      ).toThrow(/missing operations/);
    });

    it("multi-op: violations isolated to offending op_number", () => {
      const r = stockBoundaryGateEngine.gate({
        program: program([
          op(1, [move(25, 40)]),                     // safe
          op(2, [move(25, 0), move(25, 90)]),        // blocked (jaw)
          op(3, [move(25, 30)]),                     // safe
        ]),
        stock: STOCK_BAR,
        workholding: WORKHOLDING,
      });
      expect(r.overall.status).toBe("BLOCKED");
      expect(r.per_operation.find((p) => p.op_number === 1)!.safe).toBe(true);
      expect(r.per_operation.find((p) => p.op_number === 2)!.safe).toBe(false);
      expect(r.per_operation.find((p) => p.op_number === 3)!.safe).toBe(true);
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_stock_boundary_gate", () => {
      expect(camActions).toContain("lathe_stock_boundary_gate");
    });

    it("ACTIONS contains lathe_stock_boundary_gate_or_throw", () => {
      expect(camActions).toContain("lathe_stock_boundary_gate_or_throw");
    });
  });
});
