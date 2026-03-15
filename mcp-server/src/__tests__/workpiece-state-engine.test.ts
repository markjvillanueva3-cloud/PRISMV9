import { describe, it, expect, beforeEach } from "vitest";
import { WorkpieceStateEngine } from "../engines/WorkpieceStateEngine.js";
import type { OperationInput, StockInput } from "../engines/WorkpieceStateEngine.js";

describe("WorkpieceStateEngine", () => {
  let engine: WorkpieceStateEngine;
  const stock: StockInput = { length_mm: 100, width_mm: 80, height_mm: 25 };

  beforeEach(() => {
    engine = new WorkpieceStateEngine();
  });

  // ── Initialization ──

  it("initializes stock with correct dimensions", () => {
    const r = engine.initialize(stock);
    expect(r.value.volume_stock_mm3).toBe(100 * 80 * 25);
    expect(r.value.volume_remaining_mm3).toBe(200000);
    expect(r.value.volume_removed_pct).toBe(0);
    expect(r.value.operations_applied).toHaveLength(0);
  });

  it("creates 6 stock surfaces", () => {
    const r = engine.initialize(stock);
    expect(r.value.surfaces).toHaveLength(6);
    const faces = r.value.surfaces.map(s => s.face);
    expect(faces).toContain("top");
    expect(faces).toContain("bottom");
    expect(faces).toContain("front");
    expect(faces).toContain("back");
    expect(faces).toContain("left");
    expect(faces).toContain("right");
  });

  it("creates 6 clamping zones all at 100%", () => {
    const r = engine.initialize(stock);
    expect(r.value.clamping_zones).toHaveLength(6);
    for (const zone of r.value.clamping_zones) {
      expect(zone.area_ratio).toBe(1.0);
      expect(zone.is_accessible).toBe(true);
    }
  });

  it("creates 3 datum surfaces (3-2-1)", () => {
    const r = engine.initialize(stock);
    expect(r.value.datum_surfaces).toHaveLength(3);
    expect(r.value.datum_surfaces[0].type).toBe("primary");
    expect(r.value.datum_surfaces[1].type).toBe("secondary");
    expect(r.value.datum_surfaces[2].type).toBe("tertiary");
    expect(r.value.datum_surfaces.every(d => d.is_intact)).toBe(true);
  });

  // ── Operation Application ──

  it("applyOperation reduces volume correctly for pocket", () => {
    const r = engine.initialize(stock);
    const op: OperationInput = { id: "OP1", type: "pocket", tool_diameter_mm: 10, depth_mm: 5, width_mm: 40, length_mm: 30, position: { x: 0, y: 0, z: 25 } };
    const result = engine.applyOperation(r.value, op);
    expect(result.value.volume_removed_pct).toBeGreaterThan(0);
    expect(result.value.volume_remaining_mm3).toBeLessThan(200000);
    expect(result.value.operations_applied).toHaveLength(1);
  });

  it("applyOperation reduces volume correctly for hole (cylindrical)", () => {
    const r = engine.initialize(stock);
    const op: OperationInput = { id: "H1", type: "hole", tool_diameter_mm: 10, depth_mm: 25, position: { x: 0, y: 0, z: 25 } };
    const result = engine.applyOperation(r.value, op);
    // π × 5² × 25 ≈ 1963.5mm³
    const expectedVol = Math.PI * 25 * 25;
    expect(result.value.volume_stock_mm3 - result.value.volume_remaining_mm3).toBeCloseTo(expectedVol, -1);
  });

  it("applyOperation creates new surfaces", () => {
    const r = engine.initialize(stock);
    const op: OperationInput = { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 5, width_mm: 30, length_mm: 20 };
    const result = engine.applyOperation(r.value, op);
    // Should have original 6 + 2 new (wall + floor)
    expect(result.value.surfaces.length).toBeGreaterThan(6);
    const opSurfaces = result.value.surfaces.filter(s => s.created_by_op === "P1");
    expect(opSurfaces.length).toBe(2);
  });

  it("multiple operations accumulate volume removal", () => {
    const r = engine.initialize(stock);
    let state = r.value;
    state = engine.applyOperation(state, { id: "OP1", type: "pocket", tool_diameter_mm: 10, depth_mm: 3, width_mm: 20, length_mm: 20, position: { x: -20, y: 0, z: 25 } }).value;
    state = engine.applyOperation(state, { id: "OP2", type: "pocket", tool_diameter_mm: 10, depth_mm: 3, width_mm: 20, length_mm: 20, position: { x: 20, y: 0, z: 25 } }).value;
    expect(state.operations_applied).toHaveLength(2);
    expect(state.volume_removed_pct).toBeGreaterThan(0);
    // Two 20×20×3 pockets = 2400mm³ out of 200000
    expect(state.volume_removed_pct).toBeCloseTo(1.2, 0);
  });

  // ── Wall Thickness Detection ──

  it("detects thin wall near stock edge", () => {
    const r = engine.initialize(stock);
    // Stock goes from x=-50 to x=50. Pocket 30mm wide centered at x=-30 goes from x=-45 to x=-15. Wall to left = 50-45 = 5mm
    const op: OperationInput = { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 10, width_mm: 30, length_mm: 30, position: { x: -30, y: 0, z: 25 } };
    const result = engine.applyOperation(r.value, op);
    const wallThickness = engine.getMinWallThickness(result.value);
    expect(wallThickness.value.thickness_mm).toBeLessThan(10);
  });

  it("detects inter-feature thin wall", () => {
    const r = engine.initialize(stock);
    let state = r.value;
    // Two pockets close together
    // P1: center x=-13, width 20 → extends from -23 to -3
    // P2: center x=13, width 20 → extends from 3 to 23
    // Wall between: 3 - (-3) = 6mm
    state = engine.applyOperation(state, { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 10, width_mm: 20, length_mm: 20, position: { x: -13, y: 0, z: 25 } }).value;
    state = engine.applyOperation(state, { id: "P2", type: "pocket", tool_diameter_mm: 10, depth_mm: 10, width_mm: 20, length_mm: 20, position: { x: 13, y: 0, z: 25 } }).value;
    const walls = state.wall_sections.filter(w => w.adjacent_features.length === 2);
    expect(walls.length).toBeGreaterThanOrEqual(1);
    expect(walls.some(w => w.thickness_mm < 10)).toBe(true);
  });

  // ── Clamping Zone Updates ──

  it("reduces clamping area after top-approach operation", () => {
    const r = engine.initialize(stock);
    const op: OperationInput = { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 5, width_mm: 40, length_mm: 40, position: { x: 0, y: 0, z: 25 }, approach_direction: "top" };
    const result = engine.applyOperation(r.value, op);
    const topZone = result.value.clamping_zones.find(z => z.face === "top")!;
    expect(topZone.area_ratio).toBeLessThan(1.0);
    expect(topZone.available_area_mm2).toBeLessThan(topZone.original_area_mm2);
  });

  it("non-top operations don't affect top clamping zone", () => {
    const r = engine.initialize(stock);
    const op: OperationInput = { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 5, width_mm: 20, length_mm: 20, position: { x: 0, y: 0, z: 0 }, approach_direction: "bottom" };
    const result = engine.applyOperation(r.value, op);
    const topZone = result.value.clamping_zones.find(z => z.face === "top")!;
    expect(topZone.area_ratio).toBe(1.0);
  });

  // ── Datum Integrity ──

  it("bottom-approach operation compromises primary datum", () => {
    const r = engine.initialize(stock);
    const op: OperationInput = { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 5, width_mm: 20, length_mm: 20, position: { x: 0, y: 0, z: 0 }, approach_direction: "bottom" };
    const result = engine.applyOperation(r.value, op);
    const datumCheck = engine.checkDatumIntegrity(result.value);
    expect(datumCheck.value.all_intact).toBe(false);
    expect(datumCheck.value.compromised.some(d => d.type === "primary")).toBe(true);
  });

  it("top-approach operations preserve all datums", () => {
    const r = engine.initialize(stock);
    const op: OperationInput = { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 5, width_mm: 20, length_mm: 20, position: { x: 0, y: 0, z: 25 }, approach_direction: "top" };
    const result = engine.applyOperation(r.value, op);
    const datumCheck = engine.checkDatumIntegrity(result.value);
    expect(datumCheck.value.all_intact).toBe(true);
  });

  // ── State History & Rollback ──

  it("getState returns correct snapshot by index", () => {
    const r = engine.initialize(stock);
    let state = r.value;
    state = engine.applyOperation(state, { id: "OP1", type: "pocket", tool_diameter_mm: 10, depth_mm: 3, width_mm: 20, length_mm: 20 }).value;
    state = engine.applyOperation(state, { id: "OP2", type: "hole", tool_diameter_mm: 8, depth_mm: 25 }).value;

    const initial = engine.getState(-1);
    expect(initial.value!.operations_applied).toHaveLength(0);

    const afterOp1 = engine.getState(0);
    expect(afterOp1.value!.operations_applied).toHaveLength(1);

    const afterOp2 = engine.getState(1);
    expect(afterOp2.value!.operations_applied).toHaveLength(2);
  });

  it("rollback restores previous state correctly", () => {
    const r = engine.initialize(stock);
    let state = r.value;
    state = engine.applyOperation(state, { id: "OP1", type: "pocket", tool_diameter_mm: 10, depth_mm: 3, width_mm: 20, length_mm: 20 }).value;
    const volAfterOp1 = state.volume_remaining_mm3;
    state = engine.applyOperation(state, { id: "OP2", type: "hole", tool_diameter_mm: 8, depth_mm: 25 }).value;
    expect(state.volume_remaining_mm3).toBeLessThan(volAfterOp1);

    const rolled = engine.rollback(0);
    expect(rolled.value!.operations_applied).toHaveLength(1);
    expect(rolled.value!.volume_remaining_mm3).toBeCloseTo(volAfterOp1, 0);
  });

  it("rollback to -1 returns initial stock", () => {
    const r = engine.initialize(stock);
    engine.applyOperation(r.value, { id: "OP1", type: "hole", tool_diameter_mm: 10, depth_mm: 25 });
    const rolled = engine.rollback(-1);
    expect(rolled.value!.operations_applied).toHaveLength(0);
    expect(rolled.value!.volume_removed_pct).toBe(0);
  });

  // ── Simulate Sequence ──

  it("simulateSequence runs full sequence and produces warnings", () => {
    const ops: OperationInput[] = [
      { id: "F1", type: "face", tool_diameter_mm: 50, depth_mm: 1, position: { x: 0, y: 0, z: 25 } },
      { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 15, width_mm: 40, length_mm: 30, position: { x: 0, y: 0, z: 24 } },
      { id: "H1", type: "hole", tool_diameter_mm: 8, depth_mm: 25, position: { x: -30, y: -25, z: 24 } },
      { id: "H2", type: "hole", tool_diameter_mm: 8, depth_mm: 25, position: { x: 30, y: -25, z: 24 } },
      { id: "H3", type: "hole", tool_diameter_mm: 8, depth_mm: 25, position: { x: -30, y: 25, z: 24 } },
      { id: "H4", type: "hole", tool_diameter_mm: 8, depth_mm: 25, position: { x: 30, y: 25, z: 24 } },
    ];
    const result = engine.simulateSequence(stock, ops);
    expect(result.value.snapshots).toHaveLength(7); // initial + 6 ops
    expect(result.value.final_state.operations_applied).toHaveLength(6);
    expect(result.value.final_state.volume_removed_pct).toBeGreaterThan(0);
  });

  it("simulateSequence warns about thin walls", () => {
    // Create two deep pockets very close together to create a thin wall
    const ops: OperationInput[] = [
      { id: "P1", type: "pocket", tool_diameter_mm: 10, depth_mm: 20, width_mm: 35, length_mm: 60, position: { x: -22, y: 0, z: 25 } },
      { id: "P2", type: "pocket", tool_diameter_mm: 10, depth_mm: 20, width_mm: 35, length_mm: 60, position: { x: 22, y: 0, z: 25 } },
    ];
    const result = engine.simulateSequence(stock, ops);
    // P1 from x=-22-17.5=-39.5 to -22+17.5=-4.5; P2 from x=22-17.5=4.5 to 22+17.5=39.5
    // Wall between = 4.5 - (-4.5) = 9mm at depth 20mm
    expect(result.value.final_state.wall_sections.length).toBeGreaterThanOrEqual(1);
  });

  // ── Feature-based Initialization ──

  it("initializeFromFeatures creates planned operations from features", () => {
    const features = [
      { id: "F1", type: "pocket", dimensions: { width_mm: 30, length_mm: 20, depth_mm: 5 } },
      { id: "F2", type: "hole", dimensions: { diameter_mm: 8, depth_mm: 25 } },
    ];
    const result = engine.initializeFromFeatures(stock, features);
    expect(result.value.planned_operations).toHaveLength(2);
    expect(result.value.planned_operations[0].type).toBe("pocket");
    expect(result.value.planned_operations[1].type).toBe("hole");
    expect(result.value.state.volume_removed_pct).toBe(0);
  });

  // ── Edge Cases ──

  it("face operation removes correct volume", () => {
    const r = engine.initialize(stock);
    const op: OperationInput = { id: "FACE", type: "face", tool_diameter_mm: 63, depth_mm: 2, position: { x: 0, y: 0, z: 25 } };
    const result = engine.applyOperation(r.value, op);
    // Face removes full top: 100 × 80 × 2 = 16000mm³
    expect(result.value.volume_stock_mm3 - result.value.volume_remaining_mm3).toBeCloseTo(16000, -1);
  });

  it("getState with invalid index returns null", () => {
    engine.initialize(stock);
    const r = engine.getState(99);
    expect(r.value).toBeNull();
  });

  it("rollback with invalid index returns null", () => {
    engine.initialize(stock);
    const r = engine.rollback(99);
    expect(r.value).toBeNull();
  });

  it("volume never goes negative", () => {
    const smallStock: StockInput = { length_mm: 10, width_mm: 10, height_mm: 5 };
    const r = engine.initialize(smallStock);
    const op: OperationInput = { id: "BIG", type: "pocket", tool_diameter_mm: 8, depth_mm: 100, width_mm: 100, length_mm: 100 };
    const result = engine.applyOperation(r.value, op);
    expect(result.value.volume_remaining_mm3).toBeGreaterThanOrEqual(0);
    expect(result.value.volume_removed_pct).toBeLessThanOrEqual(100);
  });

  it("confidence is set appropriately", () => {
    const r = engine.initialize(stock);
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
    const op: OperationInput = { id: "OP1", type: "pocket", tool_diameter_mm: 10, depth_mm: 5, width_mm: 20, length_mm: 20 };
    const result = engine.applyOperation(r.value, op);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
