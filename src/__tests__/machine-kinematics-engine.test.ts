/**
 * Tests for MachineKinematicsEngine — kinematic inference + collision checking.
 */
import { describe, it, expect } from "vitest";
import {
  getKinematicModel,
  checkCollision,
  getKinematicCoverage,
} from "../engines/MachineKinematicsEngine.js";
import type { ExtendedMachineProfile } from "../data/machine-profiles-catalog.js";
import { EXTENDED_MACHINE_CATALOG } from "../data/machine-profiles-catalog.js";

// Helper to find profiles
function findProfile(brand: string, model: string) {
  return EXTENDED_MACHINE_CATALOG.find(
    p => p.brand === brand && p.model.includes(model),
  )!;
}

describe("MachineKinematicsEngine", () => {
  // ── getKinematicModel ──────────────────────────────────────────────────
  describe("getKinematicModel", () => {
    it("generates serial_XYZ for 3-axis VMC", () => {
      const vf2 = findProfile("Haas", "VF-2");
      const km = getKinematicModel(vf2);
      expect(km.kinematic_type).toBe("serial_XYZ");
      expect(km.chain).toContain("spindle");
      expect(km.chain).toContain("table_X");
      expect(km.transformations.length).toBeGreaterThanOrEqual(3);
      expect(km.collision_zones.length).toBeGreaterThanOrEqual(2);
    });

    it("generates table_table for 5-axis trunnion", () => {
      const umc = findProfile("Haas", "UMC-750");
      const km = getKinematicModel(umc);
      expect(km.kinematic_type).toBe("table_table");
      expect(km.five_axis_topology).toBe("table-table");
      expect(km.chain).toContain("a_tilt");
      expect(km.chain).toContain("c_rotary");
      expect(km.tcpc_supported).toBe(true);
    });

    it("generates table_table for Okuma MU-5000V with trunnion topology", () => {
      const mu = findProfile("Okuma", "MU-5000V");
      const km = getKinematicModel(mu);
      expect(km.kinematic_type).toBe("table_table");
      expect(km.five_axis_topology).toBe("table-table");
      expect(km.structure).toBe("okuma_MU_AC_trunnion");
      expect(km.chain).toContain("trunnion_A");
      expect(km.chain).toContain("rotary_C");
      expect(km.tcpc_supported).toBe(true);
      expect(km.work_envelope.x_range[1]).toBe(762);
      expect(km.work_envelope.y_range[1]).toBe(460);
      expect(km.work_envelope.z_range[1]).toBe(460);
      expect(km.source).toBe("level5");
    });

    it("generates T_configuration for HMC", () => {
      const hmcs = EXTENDED_MACHINE_CATALOG.filter(
        p => p.type === "HMC",
      );
      if (hmcs.length > 0) {
        const km = getKinematicModel(hmcs[0]);
        expect(km.kinematic_type).toBe("T_configuration");
        expect(km.structure).toBe("HMC_pallet");
      }
    });

    it("generates lathe_CZ for 2-axis lathe", () => {
      const lathes = EXTENDED_MACHINE_CATALOG.filter(
        p => p.type === "lathe" &&
             (!p.rotary_axes || p.rotary_axes.length === 0),
      );
      if (lathes.length > 0) {
        const km = getKinematicModel(lathes[0]);
        expect(km.kinematic_type).toBe("lathe_CZ");
        expect(km.chain).toContain("turret");
        expect(km.chain).toContain("headstock");
      }
    });

    it("generates mill_turn for mill-turn machines", () => {
      const mt = EXTENDED_MACHINE_CATALOG.filter(
        p => p.type === "mill_turn",
      );
      if (mt.length > 0) {
        const km = getKinematicModel(mt[0]);
        expect(km.kinematic_type).toContain("mill_turn");
        expect(km.tcpc_supported).toBeDefined();
      }
    });

    it("uses LEVEL5 data when available (VF-2)", () => {
      const vf2 = findProfile("Haas", "VF-2");
      const km = getKinematicModel(vf2);
      // VF-2 exists in CAD_ENRICHMENTS
      expect(km.source).toBe("level5");
      expect(km.machine_id).toBe("HAAS_VF_2");
    });

    it("falls back to inferred for unknown machines", () => {
      const custom: ExtendedMachineProfile = {
        brand: "Custom", model: "Test-500",
        type: "VMC", controller: "FANUC 0i",
        linear_axes: [
          { name: "X", travel_mm: 500, rapid_m_min: 30 },
          { name: "Y", travel_mm: 400, rapid_m_min: 30 },
          { name: "Z", travel_mm: 350, rapid_m_min: 30 },
        ],
        spindle: { max_rpm: 12000, power_kw: 15, torque_nm: 70, taper: "BT40" },
        tool_changer: { type: "side_mount", capacity: 20, change_time_sec: 3 },
      };
      const km = getKinematicModel(custom);
      expect(km.source).toBe("inferred");
      expect(km.kinematic_type).toBe("serial_XYZ");
      expect(km.collision_zones.length).toBeGreaterThanOrEqual(3);
    });

    it("always has valid work envelope", () => {
      const profiles = EXTENDED_MACHINE_CATALOG.slice(0, 20);
      for (const p of profiles) {
        const km = getKinematicModel(p);
        expect(km.work_envelope.x_range[1]).toBeGreaterThan(0);
        expect(km.work_envelope.z_range[1]).toBeGreaterThan(0);
      }
    });

    it("includes trunnion collision zone for 5-axis", () => {
      const umc = findProfile("Haas", "UMC-750");
      const km = getKinematicModel(umc);
      const trunnion = km.collision_zones.find(
        z => z.name === "trunnion",
      );
      expect(trunnion).toBeDefined();
      expect(trunnion!.type).toBe("cylinder");
    });
  });

  // ── checkCollision ─────────────────────────────────────────────────────
  describe("checkCollision", () => {
    it("reports safe for tool within envelope", () => {
      const vf2 = findProfile("Haas", "VF-2");
      const km = getKinematicModel(vf2);
      const result = checkCollision(km, { x: 400, y: 200, z: 250 }, 12, 80);
      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("detects X out of range", () => {
      const vf2 = findProfile("Haas", "VF-2");
      const km = getKinematicModel(vf2);
      const result = checkCollision(km, { x: 900, y: 200, z: 250 }, 12, 80);
      expect(result.safe).toBe(false);
      expect(result.violations.some(v => v.includes("X=900"))).toBe(true);
    });

    it("detects negative position violation", () => {
      const vf2 = findProfile("Haas", "VF-2");
      const km = getKinematicModel(vf2);
      const result = checkCollision(km, { x: -10, y: 200, z: 250 }, 12, 80);
      expect(result.safe).toBe(false);
    });
  });

  // ── getKinematicCoverage ───────────────────────────────────────────────
  describe("getKinematicCoverage", () => {
    it("reports LEVEL5 model count", () => {
      const cov = getKinematicCoverage();
      expect(cov.level5_models).toBeGreaterThanOrEqual(60);
      expect(cov.with_kinematic_chain).toBeGreaterThan(0);
      expect(cov.inferrable_types.length).toBe(9);
    });
  });
});
