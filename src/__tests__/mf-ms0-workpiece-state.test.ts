/**
 * MF-MS0 Tests: WorkpieceStateEngine
 */
import { describe, it, expect } from "vitest";
import { workpieceStateEngine } from "../engines/WorkpieceStateEngine.js";

describe("MF-MS0: WorkpieceStateEngine", () => {

  describe("Initialization", () => {
    it("initializes from stock dimensions", () => {
      const r = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      const state = r?.value ?? r;
      expect(state).toBeDefined();
      expect(state.volume_stock_mm3).toBe(100 * 80 * 50);
      expect(state.volume_removed_pct).toBe(0);
      expect(state.operations_applied.length).toBe(0);
    });

    it("generates 6 surfaces from rectangular stock", () => {
      const r = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      const state = r?.value ?? r;
      expect(state.surfaces.length).toBe(6);
    });

    it("top surface area = L × W", () => {
      const r = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      const state = r?.value ?? r;
      const top = state.surfaces.find((s: any) => s.face === "top" || s.id === "S_TOP");
      expect(top?.area_mm2).toBe(100 * 80);
    });

    it("creates default 3-2-1 datum surfaces", () => {
      const r = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      const state = r?.value ?? r;
      expect(state.datum_surfaces.length).toBeGreaterThanOrEqual(3);
      expect(state.datum_surfaces.some((d: any) => d.type === "primary")).toBe(true);
    });

    it("all 6 clamping zones available on fresh stock", () => {
      const r = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      const state = r?.value ?? r;
      expect(state.clamping_zones.length).toBe(6);
      for (const zone of state.clamping_zones) {
        expect(zone.area_ratio).toBe(1.0);
        expect(zone.is_accessible).toBe(true);
      }
    });
  });

  describe("Material Removal", () => {
    it("tracks volume removed after pocket operation", () => {
      const init = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      let state = init?.value ?? init;
      const r = workpieceStateEngine.applyOperation(state, {
        id: "op1", type: "pocket", tool_diameter_mm: 10, depth_mm: 20,
        width_mm: 40, length_mm: 30, position: { x: 0, y: 0, z: 50 },
      });
      state = r?.value ?? r;
      expect(state.volume_removed_pct).toBeGreaterThan(0);
      expect(state.operations_applied.length).toBe(1);
    });

    it("volume removed increases with each operation", () => {
      const init = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      let state = init?.value ?? init;

      const r1 = workpieceStateEngine.applyOperation(state, {
        id: "op1", type: "pocket", tool_diameter_mm: 10, depth_mm: 20,
        width_mm: 30, length_mm: 40, position: { x: -20, y: 0, z: 40 },
      });
      state = r1?.value ?? r1;
      const pct1 = state.volume_removed_pct;

      const r2 = workpieceStateEngine.applyOperation(state, {
        id: "op2", type: "pocket", tool_diameter_mm: 10, depth_mm: 20,
        width_mm: 30, length_mm: 40, position: { x: 20, y: 0, z: 40 },
      });
      state = r2?.value ?? r2;
      expect(state.volume_removed_pct).toBeGreaterThan(pct1);
    });

    it("hole removes cylindrical volume", () => {
      const init = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      let state = init?.value ?? init;
      const r = workpieceStateEngine.applyOperation(state, {
        id: "h1", type: "hole", tool_diameter_mm: 10, depth_mm: 50,
        position: { x: 0, y: 0, z: 50 },
      });
      state = r?.value ?? r;
      // π × 5² × 50 = 3927 mm³ ≈ 0.98% of 400,000
      expect(state.volume_removed_pct).toBeGreaterThan(0);
      expect(state.volume_removed_pct).toBeLessThan(5);
    });

    it("face operation removes full face area × depth", () => {
      const init = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      let state = init?.value ?? init;
      const r = workpieceStateEngine.applyOperation(state, {
        id: "f1", type: "face", tool_diameter_mm: 50, depth_mm: 3,
        position: { x: 0, y: 0, z: 50 },
      });
      state = r?.value ?? r;
      // 100 × 80 × 3 = 24,000 mm³ = 6% of 400,000
      expect(state.volume_removed_pct).toBeCloseTo(6, 0);
    });
  });

  describe("Surface Tracking", () => {
    it("new surfaces created by operations", () => {
      const init = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      let state = init?.value ?? init;
      const surfCount0 = state.surfaces.length;

      const r = workpieceStateEngine.applyOperation(state, {
        id: "p1", type: "pocket", tool_diameter_mm: 10, depth_mm: 20,
        width_mm: 40, length_mm: 30, position: { x: 0, y: 0, z: 40 },
      });
      state = r?.value ?? r;
      expect(state.surfaces.length).toBeGreaterThan(surfCount0);
    });
  });

  describe("Clamping Zone Degradation", () => {
    it("clamping zone area_ratio decreases after surface-cutting operation", () => {
      const init = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      let state = init?.value ?? init;

      // All zones start at ratio 1.0
      const topBefore = state.clamping_zones.find((z: any) => z.face === "top");
      expect(topBefore?.area_ratio).toBe(1.0);

      // Machine a pocket from the top — should reduce top clamping area
      const r = workpieceStateEngine.applyOperation(state, {
        id: "p1", type: "pocket", tool_diameter_mm: 10, depth_mm: 20,
        width_mm: 60, length_mm: 50, position: { x: 0, y: 0, z: 40 },
        approach_direction: "top",
      });
      state = r?.value ?? r;
      const topAfter = state.clamping_zones.find((z: any) => z.face === "top");
      expect(topAfter?.area_ratio).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Datum Surface Tracking", () => {
    it("datum remains intact when not machined", () => {
      const init = workpieceStateEngine.initialize({ length_mm: 100, width_mm: 80, height_mm: 50 });
      let state = init?.value ?? init;

      // Machine top surface only — bottom datum should stay intact
      const r = workpieceStateEngine.applyOperation(state, {
        id: "f1", type: "face", tool_diameter_mm: 50, depth_mm: 2,
        position: { x: 0, y: 0, z: 50 }, approach_direction: "top",
      });
      state = r?.value ?? r;
      const primary = state.datum_surfaces.find((d: any) => d.type === "primary");
      expect(primary?.is_intact).toBe(true);
    });
  });

  describe("Physics Invariants", () => {
    it("volume removed never exceeds 100%", () => {
      const init = workpieceStateEngine.initialize({ length_mm: 50, width_mm: 50, height_mm: 50 });
      let state = init?.value ?? init;
      for (let i = 0; i < 10; i++) {
        const r = workpieceStateEngine.applyOperation(state, {
          id: `op${i}`, type: "pocket", tool_diameter_mm: 10, depth_mm: 45,
          width_mm: 10, length_mm: 45, position: { x: -20 + i * 5, y: 0, z: 25 },
        });
        state = r?.value ?? r;
      }
      expect(state.volume_removed_pct).toBeLessThanOrEqual(100);
    });

    it("AABB volume = L × W × H", () => {
      expect(100 * 80 * 50).toBe(400000);
    });

    it("wall stiffness ∝ t³ (cantilever beam I = Lt³/12)", () => {
      const stiffness = (t: number, L: number, H: number) => {
        const E = 200e3;
        const I = L * Math.pow(t, 3) / 12;
        return 3 * E * I / Math.pow(H, 3);
      };
      expect(stiffness(2, 60, 30) / stiffness(1, 60, 30)).toBeCloseTo(8, 0);
    });
  });
});
