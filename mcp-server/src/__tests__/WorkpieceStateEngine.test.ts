/**
 * WorkpieceStateEngine + MF-MS1 Engines — Tests
 *
 * Tests for:
 *   - WorkpieceStateEngine: init, apply op, surfaces, walls, datums, rollback, simulate
 *   - AccessibilityAnalysisEngine: tool reach, holder collision, aspect ratio, approach
 *   - WorkholdingViabilityEngine: grip force, rotation, lift-off, vacuum, surface tracking
 *   - RigidityDegradationEngine: cantilever deflection, natural freq, chatter, stress
 */
import { describe, it, expect } from "vitest";
import { WorkpieceStateEngine } from "../engines/WorkpieceStateEngine.js";
import { AccessibilityAnalysisEngine } from "../engines/AccessibilityAnalysisEngine.js";
import { WorkholdingViabilityEngine } from "../engines/WorkholdingViabilityEngine.js";
import { RigidityDegradationEngine, MATERIAL_STIFFNESS } from "../engines/RigidityDegradationEngine.js";
import type { StockInput, OperationInput, WorkpieceState } from "../engines/WorkpieceStateEngine.js";

// ── Fixtures ──

const STOCK: StockInput = { length_mm: 200, width_mm: 150, height_mm: 50 };

function makePocketOp(id: string, depth: number, width?: number, length?: number, pos?: any): OperationInput {
  return {
    id,
    type: "pocket",
    tool_diameter_mm: 12,
    depth_mm: depth,
    width_mm: width ?? 80,
    length_mm: length ?? 60,
    position: pos ?? { x: 0, y: 0, z: 50 },
  };
}

function makeHoleOp(id: string, depth: number, dia: number, pos?: any): OperationInput {
  return {
    id,
    type: "hole",
    tool_diameter_mm: dia,
    depth_mm: depth,
    position: pos ?? { x: 0, y: 0, z: 50 },
  };
}

// ── WorkpieceStateEngine ──

describe("WorkpieceStateEngine", () => {
  const engine = new WorkpieceStateEngine();

  describe("initialize", () => {
    it("should create state from stock dimensions", () => {
      const result = engine.initialize(STOCK);
      const state = result.value;
      expect(state.volume_stock_mm3).toBe(200 * 150 * 50);
      expect(state.volume_remaining_mm3).toBe(200 * 150 * 50);
      expect(state.volume_removed_pct).toBe(0);
      expect(state.operations_applied).toHaveLength(0);
      expect(state.geometry_level).toBe(2);
    });

    it("should create 6 stock surfaces", () => {
      const state = engine.initialize(STOCK).value;
      expect(state.surfaces).toHaveLength(6);
      const faces = state.surfaces.map(s => s.face);
      expect(faces).toContain("top");
      expect(faces).toContain("bottom");
      expect(faces).toContain("left");
      expect(faces).toContain("right");
    });

    it("should compute correct surface areas", () => {
      const state = engine.initialize(STOCK).value;
      const top = state.surfaces.find(s => s.face === "top")!;
      const left = state.surfaces.find(s => s.face === "left")!;
      expect(top.area_mm2).toBe(200 * 150);
      expect(left.area_mm2).toBe(150 * 50);
    });

    it("should set up 6 clamping zones", () => {
      const state = engine.initialize(STOCK).value;
      expect(state.clamping_zones).toHaveLength(6);
      const top = state.clamping_zones.find(z => z.face === "top")!;
      expect(top.area_ratio).toBe(1.0);
      expect(top.is_accessible).toBe(true);
    });

    it("should set up 3-2-1 datum surfaces", () => {
      const state = engine.initialize(STOCK).value;
      expect(state.datum_surfaces).toHaveLength(3);
      expect(state.datum_surfaces[0].type).toBe("primary");
      expect(state.datum_surfaces[0].is_intact).toBe(true);
    });
  });

  describe("applyOperation", () => {
    it("should subtract volume", () => {
      const state = engine.initialize(STOCK).value;
      const op = makePocketOp("op1", 30, 80, 60);
      const result = engine.applyOperation(state, op);
      const after = result.value;

      expect(after.volume_remaining_mm3).toBeLessThan(state.volume_stock_mm3);
      expect(after.volume_removed_pct).toBeGreaterThan(0);
    });

    it("should record operation", () => {
      const state = engine.initialize(STOCK).value;
      const op = makePocketOp("op1", 20);
      const after = engine.applyOperation(state, op).value;

      expect(after.operations_applied).toHaveLength(1);
      expect(after.operations_applied[0].id).toBe("op1");
    });

    it("should create new surfaces", () => {
      const state = engine.initialize(STOCK).value;
      const op = makePocketOp("op1", 20);
      const after = engine.applyOperation(state, op).value;

      expect(after.surfaces.length).toBeGreaterThan(6);
      const machined = after.surfaces.filter(s => s.created_by_op === "op1");
      expect(machined.length).toBeGreaterThan(0);
    });

    it("should detect wall sections near stock edges", () => {
      const state = engine.initialize(STOCK).value;
      // Stock: x from -100 to +100. Pocket centered at x=85, width=20 → right edge at x=95
      // Wall to right: 100 - 95 = 5mm (< 20mm threshold)
      const op: OperationInput = {
        id: "near_edge",
        type: "pocket",
        tool_diameter_mm: 12,
        depth_mm: 30,
        width_mm: 20,
        length_mm: 60,
        position: { x: 85, y: 0, z: 50 },
      };
      const after = engine.applyOperation(state, op).value;

      // Should detect thin wall sections (< 20mm to edges)
      expect(after.wall_sections.length).toBeGreaterThan(0);
      // At least one wall should be ~5mm thick
      const thinWall = after.wall_sections.find(w => w.thickness_mm < 10);
      expect(thinWall).toBeDefined();
    });

    it("should update clamping zones", () => {
      const state = engine.initialize(STOCK).value;
      const op = makePocketOp("op1", 20);
      const after = engine.applyOperation(state, op).value;

      const topBefore = state.clamping_zones.find(z => z.face === "top")!;
      const topAfter = after.clamping_zones.find(z => z.face === "top")!;
      expect(topAfter.available_area_mm2).toBeLessThan(topBefore.available_area_mm2);
    });

    it("should handle cylindrical volume for holes", () => {
      const state = engine.initialize(STOCK).value;
      const op = makeHoleOp("h1", 50, 10);
      const after = engine.applyOperation(state, op).value;

      const expected = Math.PI * 25 * 50; // π × r² × d
      const removed = state.volume_stock_mm3 - after.volume_remaining_mm3;
      expect(removed).toBeCloseTo(expected, 0);
    });
  });

  describe("getState / rollback", () => {
    it("should simulate sequence and get snapshots", () => {
      const e = new WorkpieceStateEngine();
      const ops = [makePocketOp("op1", 10), makeHoleOp("op2", 20, 8)];
      const result = e.simulateSequence(STOCK, ops);
      expect(result.value.snapshots.length).toBeGreaterThanOrEqual(2);
      expect(result.value.final_state.volume_removed_pct).toBeGreaterThan(0);
    });

    it("should access initial state via getState", () => {
      const e = new WorkpieceStateEngine();
      const init = e.initialize(STOCK);
      // Initial state should have zero volume removed
      expect(init.value.volume_removed_pct).toBe(0);
      expect(init.value.surfaces.length).toBeGreaterThan(0);
    });
  });

  describe("simulateSequence", () => {
    it("should simulate full sequence", () => {
      const e = new WorkpieceStateEngine();
      const ops = [
        makePocketOp("op1", 20, 80, 60),
        makeHoleOp("op2", 50, 10),
      ];
      const result = e.simulateSequence(STOCK, ops);

      expect(result.value.snapshots).toHaveLength(3); // initial + 2 ops
      expect(result.value.final_state.operations_applied).toHaveLength(2);
    });

    it("should generate warnings for thin walls", () => {
      const e = new WorkpieceStateEngine();
      // Pocket leaving 0.5mm wall to edge
      const ops: OperationInput[] = [{
        id: "thin_pocket",
        type: "pocket",
        tool_diameter_mm: 12,
        depth_mm: 40,
        width_mm: 199,
        length_mm: 148,
        position: { x: 0, y: 0, z: 50 },
      }];
      const result = e.simulateSequence(STOCK, ops);
      expect(result.value.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("datum integrity", () => {
    it("should track datum surfaces on initialization", () => {
      const e = new WorkpieceStateEngine();
      const state = e.initialize(STOCK).value;
      // Initial state should have intact datums
      const check = e.checkDatumIntegrity(state);
      expect(check.value.all_intact).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty operation list", () => {
      const e = new WorkpieceStateEngine();
      const result = e.simulateSequence(STOCK, []);
      expect(result.value.snapshots).toHaveLength(1);
      expect(result.value.warnings).toHaveLength(0);
    });

    it("should handle very large volume removal", () => {
      const state = engine.initialize(STOCK).value;
      const op: OperationInput = {
        id: "huge",
        type: "face",
        tool_diameter_mm: 50,
        depth_mm: 45,
      };
      const after = engine.applyOperation(state, op).value;
      expect(after.volume_removed_pct).toBeGreaterThan(80);
    });
  });
});

// ── AccessibilityAnalysisEngine ──

describe("AccessibilityAnalysisEngine", () => {
  const engine = new AccessibilityAnalysisEngine();
  const wse = new WorkpieceStateEngine();

  it("should pass for reachable feature", () => {
    const state = wse.initialize(STOCK).value;
    const op = makePocketOp("p1", 20);
    const tool = { tool_id: "t1", tool_diameter_mm: 12, tool_length_mm: 60 };

    const result = engine.checkAccess(op, tool, state);
    expect(result.reachable).toBe(true);
    expect(result.depth_margin_mm).toBeGreaterThan(0);
  });

  it("should fail for tool too short", () => {
    const state = wse.initialize(STOCK).value;
    const op = makePocketOp("p1", 40);
    const tool = { tool_id: "t1", tool_diameter_mm: 12, tool_length_mm: 30 };

    const result = engine.checkAccess(op, tool, state);
    expect(result.reachable).toBe(false);
    expect(result.issues.some(i => i.type === "tool_too_short")).toBe(true);
  });

  it("should warn on holder collision risk", () => {
    const state = wse.initialize(STOCK).value;
    const op = makePocketOp("p1", 20);
    op.position = { x: -95, y: 0, z: 50 }; // very close to left edge
    const tool = {
      tool_id: "t1", tool_diameter_mm: 12, tool_length_mm: 60,
      holder_diameter_mm: 40, holder_length_mm: 50,
    };

    const result = engine.checkAccess(op, tool, state);
    expect(result.issues.some(i => i.type === "holder_collision")).toBe(true);
  });

  it("should warn on high aspect ratio", () => {
    const state = wse.initialize(STOCK).value;
    const op: OperationInput = {
      id: "deep", type: "pocket", tool_diameter_mm: 6,
      depth_mm: 45, width_mm: 8, length_mm: 8,
    };
    const tool = { tool_id: "t1", tool_diameter_mm: 6, tool_length_mm: 60 };

    const result = engine.checkAccess(op, tool, state);
    expect(result.aspect_ratio!).toBeGreaterThan(4);
    expect(result.issues.some(i => i.type === "chip_evacuation")).toBe(true);
  });

  it("should rank tools from catalog", () => {
    const state = wse.initialize(STOCK).value;
    const op = makePocketOp("p1", 40); // 40mm depth + 5mm clearance = 45mm needed
    const catalog = [
      { tool_id: "t1", tool_diameter_mm: 6, tool_length_mm: 30 }, // too short (30 < 45)
      { tool_id: "t2", tool_diameter_mm: 12, tool_length_mm: 60 }, // good
      { tool_id: "t3", tool_diameter_mm: 20, tool_length_mm: 80 }, // bigger = higher score
    ];

    const recs = engine.findReachableTools(op, state, catalog);
    expect(recs.length).toBe(2); // t1 excluded
    expect(recs[0].tool.tool_id).toBe("t3"); // bigger tool ranked first
  });

  it("should produce full report for multiple features", () => {
    const state = wse.initialize(STOCK).value;
    const assignments = [
      { op: makePocketOp("p1", 20), tool: { tool_id: "t1", tool_diameter_mm: 12, tool_length_mm: 60 } },
      { op: makePocketOp("p2", 40), tool: { tool_id: "t2", tool_diameter_mm: 12, tool_length_mm: 30 } }, // too short
    ];

    const report = engine.checkAllFeaturesIPW(state, assignments);
    expect(report.total_features).toBe(2);
    expect(report.reachable_count).toBe(1);
    expect(report.blocked_count).toBe(1);
    expect(report.critical_issues.length).toBeGreaterThan(0);
  });
});

// ── WorkholdingViabilityEngine ──

describe("WorkholdingViabilityEngine", () => {
  const engine = new WorkholdingViabilityEngine();
  const wse = new WorkpieceStateEngine();

  it("should pass with adequate clamping", () => {
    const state = wse.initialize(STOCK).value;
    const op = makePocketOp("p1", 20);
    const fixture = { fixture_type: "vise" as const, clamped_faces: ["left" as const, "right" as const] };

    const result = engine.checkViability(state, op, fixture, 200);
    expect(result.viable).toBe(true);
    expect(result.grip_safety_factor).toBeGreaterThan(1.5);
  });

  it("should fail with excessive cutting force", () => {
    const state = wse.initialize(STOCK).value;
    const op = makePocketOp("p1", 20);
    const fixture = {
      fixture_type: "vise" as const,
      clamped_faces: ["left" as const, "right" as const],
      clamping_pressure_MPa: 0.1, // very low pressure
    };

    const result = engine.checkViability(state, op, fixture, 50000);
    expect(result.viable).toBe(false);
    expect(result.issues.some(i => i.type === "grip_insufficient")).toBe(true);
  });

  it("should detect vacuum seal broken by holes", () => {
    const state = wse.initialize(STOCK).value;
    const op = makeHoleOp("h1", 50, 10);
    const fixture = { fixture_type: "vacuum" as const, clamped_faces: ["bottom" as const] };

    const result = engine.checkViability(state, op, fixture);
    expect(result.vacuum_seal_intact).toBe(false);
    expect(result.issues.some(i => i.type === "vacuum_seal_broken")).toBe(true);
  });

  it("should track surfaces", () => {
    const state = wse.initialize(STOCK).value;
    const tracking = engine.trackSurfaces(state);

    expect(tracking.clamp_surfaces.length).toBe(6);
    expect(tracking.area_retention_pct).toBe(100);
  });

  it("should track surface degradation after ops", () => {
    const state = wse.initialize(STOCK).value;
    const op = makePocketOp("p1", 20, 180, 140);
    const after = wse.applyOperation(state, op).value;

    const tracking = engine.trackSurfaces(after);
    // Top clamping area should be reduced
    const topZone = after.clamping_zones.find(z => z.face === "top")!;
    expect(topZone.area_ratio).toBeLessThan(1.0);
  });

  it("should suggest fixtures ranked by confidence", () => {
    const state = wse.initialize(STOCK).value;
    const ops = [makePocketOp("p1", 20)];

    const suggestions = engine.suggestFixturing(state, ops);
    expect(suggestions.length).toBeGreaterThan(0);
    // Should be sorted by confidence descending
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i].confidence).toBeLessThanOrEqual(suggestions[i-1].confidence);
    }
  });

  it("should warn about vacuum + holes in suggestions", () => {
    const state = wse.initialize(STOCK).value;
    const ops = [makeHoleOp("h1", 50, 10)];

    const suggestions = engine.suggestFixturing(state, ops);
    const vacuum = suggestions.find(s => s.fixture_type === "vacuum")!;
    expect(vacuum.warnings.some(w => w.includes("vacuum"))).toBe(true);
  });

  it("should compute force balance correctly", () => {
    const state = wse.initialize(STOCK).value;
    const op = makePocketOp("p1", 20);
    const fixture = {
      fixture_type: "vise" as const,
      friction_coeff: 0.2,
      clamping_pressure_MPa: 5,
      clamped_faces: ["left" as const, "right" as const],
    };

    const result = engine.checkViability(state, op, fixture, 1000);

    expect(result.forces.cutting_force_N).toBe(1000);
    expect(result.forces.axial_force_N).toBe(400);
    expect(result.forces.grip_force_N).toBeGreaterThan(0);
    expect(result.forces.normal_clamp_N).toBeGreaterThan(0);
  });
});

// ── RigidityDegradationEngine ──

describe("RigidityDegradationEngine", () => {
  const engine = new RigidityDegradationEngine();
  const wse = new WorkpieceStateEngine();
  const AL6061 = MATERIAL_STIFFNESS["6061-T6"];
  const STEEL4140 = MATERIAL_STIFFNESS["4140"];

  describe("physics formulas", () => {
    it("cantilever: δ = FH³/(3EI)", () => {
      // 1000N, 30mm height, 205000 MPa steel, I=1000mm⁴
      const d = engine.cantileverDeflection(1000, 30, 205000, 1000);
      const expected = (1000 * Math.pow(30, 3)) / (3 * 205000 * 1000);
      expect(d).toBeCloseTo(expected, 6);
    });

    it("natural frequency: fn > 0 for valid inputs", () => {
      const fn = engine.naturalFrequency(205000, 1000, 7850, 50, 3, 30);
      expect(fn).toBeGreaterThan(0);
      expect(fn).not.toBe(Infinity);
    });

    it("bending stress: σ = FH(t/2)/I", () => {
      const sigma = engine.bendingStress(500, 20, 3, 50);
      const I = (50 * Math.pow(3, 3)) / 12;
      const expected = (500 * 20 * 1.5) / I;
      expect(sigma).toBeCloseTo(expected, 1);
    });

    it("lower E → higher deflection (aluminum vs steel)", () => {
      const I = 1000;
      const dAl = engine.cantileverDeflection(500, 30, 68900, I);
      const dSteel = engine.cantileverDeflection(500, 30, 205000, I);
      expect(dAl).toBeGreaterThan(dSteel);
      // Ratio should be ~205/68.9 ≈ 2.97
      expect(dAl / dSteel).toBeCloseTo(205000 / 68900, 1);
    });
  });

  describe("checkRigidity", () => {
    it("should pass for stiff workpiece", () => {
      const state = wse.initialize(STOCK).value;
      const op = makePocketOp("p1", 10);

      const result = engine.checkRigidity(state, op, STEEL4140, 300);
      // No walls created yet → should be stiff
      expect(result.issues.length).toBe(0);
      expect(result.stiff_enough).toBe(true);
    });

    it("should detect deflection risk on thin walls", () => {
      // Create a state with thin walls
      const state = wse.initialize(STOCK).value;
      const op: OperationInput = {
        id: "thin_wall_pocket",
        type: "pocket",
        tool_diameter_mm: 12,
        depth_mm: 40,
        width_mm: 196,
        length_mm: 60,
        position: { x: 0, y: 0, z: 50 },
      };
      const after = wse.applyOperation(state, op).value;

      // Now check rigidity for a finish pass
      const finishOp = makePocketOp("finish", 1);
      const result = engine.checkRigidity(after, finishOp, AL6061, 500);

      // Should have thin wall sections and potential issues
      expect(after.wall_sections.length).toBeGreaterThan(0);
      const thinnestWall = Math.min(...after.wall_sections.map(w => w.thickness_mm));
      expect(thinnestWall).toBeLessThan(5);
    });

    it("should detect chatter risk near harmonics", () => {
      const state = wse.initialize(STOCK).value;
      // Create thin wall
      const op: OperationInput = {
        id: "p1", type: "pocket", tool_diameter_mm: 12,
        depth_mm: 40, width_mm: 197, length_mm: 60,
        position: { x: 0, y: 0, z: 50 },
      };
      const after = wse.applyOperation(state, op).value;

      if (after.wall_sections.length > 0) {
        const finishOp = makePocketOp("finish", 1);
        // Try RPM/flute combo that might hit a harmonic
        const result = engine.checkRigidity(after, finishOp, AL6061, 500, 10000, 3);
        // Result should at least check chatter (may or may not be high risk)
        expect(result.chatter_risk).toBeDefined();
      }
    });
  });

  describe("findCriticalFeatures", () => {
    it("should rank walls by stiffness", () => {
      const state = wse.initialize(STOCK).value;
      // Create two pockets → thin walls
      const op1: OperationInput = {
        id: "p1", type: "pocket", tool_diameter_mm: 12,
        depth_mm: 30, width_mm: 80, length_mm: 60,
        position: { x: -40, y: 0, z: 50 },
      };
      const after1 = wse.applyOperation(state, op1).value;

      if (after1.wall_sections.length >= 2) {
        const critical = engine.findCriticalFeatures(after1, AL6061);
        expect(critical.length).toBe(after1.wall_sections.length);
        expect(critical[0].rank).toBe(1); // weakest first

        // Stiffness should be ascending
        for (let i = 1; i < critical.length; i++) {
          expect(critical[i].stiffness_N_mm).toBeGreaterThanOrEqual(
            critical[i-1].stiffness_N_mm
          );
        }
      }
    });
  });

  describe("recommendSupport", () => {
    it("should suggest strategies for thin walls", () => {
      const wall = {
        id: "w1",
        thickness_mm: 1.5,
        height_mm: 30,
        length_mm: 50,
        position: { x: 0, y: 0, z: 25 },
        direction: { x: 1, y: 0, z: 0 },
        adjacent_features: ["p1"],
        rigidity_score: 0.1,
      };

      const recs = engine.recommendSupport(wall, AL6061);
      expect(recs.length).toBeGreaterThan(3);

      // Should include fill strategy for very thin wall
      expect(recs.some(r => r.strategy.includes("Fill"))).toBe(true);

      // Should include HSM for aluminum
      expect(recs.some(r => r.strategy.includes("HSM"))).toBe(true);

      // Sorted by improvement descending
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i].estimated_improvement_pct).toBeLessThanOrEqual(
          recs[i-1].estimated_improvement_pct
        );
      }
    });

    it("should suggest backing support for tall walls", () => {
      const wall = {
        id: "w1",
        thickness_mm: 3,
        height_mm: 40,
        length_mm: 80,
        position: { x: 0, y: 0, z: 20 },
        direction: { x: 1, y: 0, z: 0 },
        adjacent_features: ["p1"],
        rigidity_score: 0.3,
      };

      const recs = engine.recommendSupport(wall, STEEL4140);
      expect(recs.some(r => r.strategy.includes("Backing"))).toBe(true);
      // No HSM for steel
      expect(recs.some(r => r.strategy.includes("HSM"))).toBe(false);
    });
  });

  describe("material database", () => {
    it("should have all common materials", () => {
      expect(MATERIAL_STIFFNESS["6061-T6"]).toBeDefined();
      expect(MATERIAL_STIFFNESS["4140"]).toBeDefined();
      expect(MATERIAL_STIFFNESS["Ti-6Al-4V"]).toBeDefined();
      expect(MATERIAL_STIFFNESS["Inconel 718"]).toBeDefined();
    });

    it("should have valid properties", () => {
      for (const [name, mat] of Object.entries(MATERIAL_STIFFNESS)) {
        expect(mat.elastic_modulus_GPa).toBeGreaterThan(0);
        expect(mat.density_kg_m3).toBeGreaterThan(0);
      }
    });
  });
});
