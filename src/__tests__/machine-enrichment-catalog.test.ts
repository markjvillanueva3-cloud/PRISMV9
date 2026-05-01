/**
 * Tests for machine-enrichment-catalog.ts
 * Validates CORE + LEVEL5 extracted machine data.
 */
import { describe, it, expect } from "vitest";
import {
  POST_DB_PROFILES,
  LATHE_DEEP_PROFILES,
  CONTROLLER_FEATURES,
  CAD_ENRICHMENTS,
  getEnrichmentStats,
} from "../data/machine-enrichment-catalog.js";

describe("machine-enrichment-catalog", () => {
  // ── POST_DB_PROFILES ───────────────────────────────────────────────────
  describe("POST_DB_PROFILES", () => {
    it("has 200+ machines from POST database", () => {
      expect(POST_DB_PROFILES.length).toBeGreaterThanOrEqual(200);
    });

    it("covers multiple manufacturers", () => {
      const brands = new Set(POST_DB_PROFILES.map((p) => p.brand));
      expect(brands.size).toBeGreaterThanOrEqual(8);
      expect(brands).toContain("Haas");
      expect(brands).toContain("Mazak");
      expect(brands).toContain("Okuma");
      expect(brands).toContain("DMG MORI");
      expect(brands).toContain("Makino");
    });

    it("covers mills and lathes", () => {
      const types = new Set(POST_DB_PROFILES.map((p) => p.type));
      expect(types).toContain("VMC");
      expect(types).toContain("lathe");
    });

    it("covers 5-axis and HMC types", () => {
      const types = new Set(POST_DB_PROFILES.map((p) => p.type));
      expect(types).toContain("5axis");
      expect(types).toContain("HMC");
    });

    it("each profile has valid spindle data", () => {
      for (const p of POST_DB_PROFILES) {
        expect(p.spindle.max_rpm).toBeGreaterThan(0);
        expect(p.spindle.power_kw).toBeGreaterThan(0);
        expect(p.spindle.torque_nm).toBeGreaterThan(0);
        expect(p.spindle.taper).toBeTruthy();
      }
    });

    it("each profile has at least 2 linear axes", () => {
      for (const p of POST_DB_PROFILES) {
        expect(p.linear_axes.length).toBeGreaterThanOrEqual(2);
        for (const ax of p.linear_axes) {
          expect(ax.travel_mm).toBeGreaterThan(0);
          expect(ax.rapid_m_min).toBeGreaterThan(0);
        }
      }
    });

    it("spot-check: Haas VF-2 has correct travels", () => {
      const vf2 = POST_DB_PROFILES.find(
        (p) => p.brand === "Haas" && p.model === "VF-2"
      );
      expect(vf2).toBeDefined();
      expect(vf2!.linear_axes[0].travel_mm).toBe(762); // X
      expect(vf2!.linear_axes[1].travel_mm).toBe(406); // Y
      expect(vf2!.linear_axes[2].travel_mm).toBe(508); // Z
    });

    it("spot-check: Haas UMC-750 has rotary axes", () => {
      const umc = POST_DB_PROFILES.find(
        (p) => p.brand === "Haas" && p.model === "UMC-750"
      );
      expect(umc).toBeDefined();
      expect(umc!.type).toBe("5axis");
      expect(umc!.rotary_axes).toBeDefined();
      expect(umc!.rotary_axes!.length).toBe(2);
    });

    it("Haas POST profiles cover the main mill and lathe families", () => {
      const haas = POST_DB_PROFILES.filter((p) => p.brand === "Haas");
      const models = new Set(haas.map((p) => p.model));

      expect(haas.length).toBeGreaterThanOrEqual(20);
      expect(models).toContain("Mini Mill 2");
      expect(models).toContain("VF-7");
      expect(models).toContain("VF-8");
      expect(models).toContain("VF-9");
      expect(models).toContain("UMC-500");
      expect(models).toContain("UMC-750");
      expect(models).toContain("UMC-1000");
      expect(models).toContain("TM-1");
      expect(models).toContain("TM-3P");
      expect(models).toContain("ST-20");
      expect(models).toContain("ST-30");
      expect(models).toContain("TL-1");
    });

    it("spot-check: Mazak INTEGREX is mill_turn", () => {
      const itx = POST_DB_PROFILES.find(
        (p) => p.brand === "Mazak" && p.model.includes("INTEGREX")
      );
      expect(itx).toBeDefined();
      expect(itx!.type).toBe("mill_turn");
    });

    it("spot-check: Makino D200Z has high-RPM spindle", () => {
      const d200 = POST_DB_PROFILES.find(
        (p) => p.brand === "Makino" && p.model === "D200Z"
      );
      expect(d200).toBeDefined();
      expect(d200!.spindle.max_rpm).toBe(45000);
    });

    it("Okuma POST profiles span the expected mill and turning families", () => {
      const okuma = POST_DB_PROFILES.filter((p) => p.brand === "Okuma");
      expect(okuma.length).toBeGreaterThanOrEqual(8);

      const types = new Set(okuma.map((p) => p.type));
      expect(types).toContain("VMC");
      expect(types).toContain("HMC");
      expect(types).toContain("5axis");
      expect(types).toContain("lathe");
      expect(types).toContain("mill_turn");

      expect(okuma.some((p) => p.model.includes("GENOS M560-V"))).toBe(true);
      expect(okuma.some((p) => p.model.includes("MB-46VAE"))).toBe(true);
      expect(okuma.some((p) => p.model.includes("MU-5000V"))).toBe(true);
      expect(okuma.some((p) => p.model.includes("LB3000 EXII"))).toBe(true);
      expect(okuma.some((p) => p.model.includes("MULTUS B300II"))).toBe(true);
    });
  });

  // ── LATHE_DEEP_PROFILES ────────────────────────────────────────────────
  describe("LATHE_DEEP_PROFILES", () => {
    it("has 10+ lathes with deep specs", () => {
      expect(LATHE_DEEP_PROFILES.length).toBeGreaterThanOrEqual(10);
    });

    it("each has torque curve data", () => {
      for (const p of LATHE_DEEP_PROFILES) {
        expect(p.lathe_deep_specs).toBeDefined();
        expect(p.lathe_deep_specs.torque_curve.length).toBeGreaterThanOrEqual(3);
        // Torque curve should be descending (generally)
        const tc = p.lathe_deep_specs.torque_curve;
        expect(tc[0].rpm).toBeLessThanOrEqual(tc[tc.length - 1].rpm);
        expect(tc[0].torque).toBeGreaterThanOrEqual(tc[tc.length - 1].torque);
      }
    });

    it("each has rigidity classification", () => {
      for (const p of LATHE_DEEP_PROFILES) {
        expect(["light", "medium", "heavy"]).toContain(
          p.lathe_deep_specs.rigidity_class
        );
        expect(p.lathe_deep_specs.stability_factor).toBeGreaterThan(0);
        expect(p.lathe_deep_specs.stability_factor).toBeLessThanOrEqual(1);
      }
    });

    it("each has turret and tailstock data", () => {
      for (const p of LATHE_DEEP_PROFILES) {
        expect(p.lathe_deep_specs.turret).toBeDefined();
        expect(p.lathe_deep_specs.tailstock).toBeDefined();
      }
    });

    it("spot-check: Haas ST-30 has correct torque", () => {
      const st30 = LATHE_DEEP_PROFILES.find(
        (p) => p.brand === "Haas" && p.model === "ST-30"
      );
      expect(st30).toBeDefined();
      expect(st30!.lathe_deep_specs.torque_curve[0].torque).toBe(610);
      expect(st30!.spindle.max_rpm).toBe(3400);
      expect(st30!.lathe_deep_specs.rigidity_class).toBe("heavy");
    });

    it("spot-check: Mazak INTEGREX has milling spindle", () => {
      const itx = LATHE_DEEP_PROFILES.find(
        (p) => p.brand === "Mazak" && p.model.includes("INTEGREX")
      );
      expect(itx).toBeDefined();
      expect(itx!.lathe_deep_specs.milling_spindle).toBeDefined();
      expect(itx!.lathe_deep_specs.milling_spindle!.maxRPM).toBe(12000);
    });

    it("Okuma controller features exist for both mill and lathe machines", () => {
      const okumaMill = CONTROLLER_FEATURES.find(
        (f) => f.manufacturer === "Okuma" && f.machine_type === "mill"
      );
      const okumaLathe = CONTROLLER_FEATURES.find(
        (f) => f.manufacturer === "Okuma" && f.machine_type === "lathe"
      );
      expect(okumaMill).toBeDefined();
      expect(okumaLathe).toBeDefined();
      expect(okumaMill!.dialect).toBe("okuma");
      expect(okumaLathe!.dialect).toBe("okuma");
    });
  });

  // ── CONTROLLER_FEATURES ────────────────────────────────────────────────
  describe("CONTROLLER_FEATURES", () => {
    it("has 10+ controller feature sets", () => {
      expect(CONTROLLER_FEATURES.length).toBeGreaterThanOrEqual(10);
    });

    it("covers major manufacturers", () => {
      const mfrs = new Set(CONTROLLER_FEATURES.map((f) => f.manufacturer));
      expect(mfrs).toContain("Haas");
      expect(mfrs).toContain("Okuma");
      expect(mfrs).toContain("Mazak");
      expect(mfrs).toContain("DMG MORI");
    });

    it("Haas mill features include HSM G187", () => {
      const haasMill = CONTROLLER_FEATURES.find(
        (f) => f.manufacturer === "Haas" && f.machine_type === "mill"
      );
      expect(haasMill).toBeDefined();
      expect(haasMill!.features.hsm?.code).toBe("G187");
    });

    it("each has dialect field", () => {
      for (const f of CONTROLLER_FEATURES) {
        expect(f.dialect).toBeTruthy();
      }
    });

    it("Haas lathe features include threading and CSS", () => {
      const haasLathe = CONTROLLER_FEATURES.find(
        (f) => f.manufacturer === "Haas" && f.machine_type === "lathe"
      );
      expect(haasLathe).toBeDefined();
      expect(haasLathe!.features.css?.code).toBe("G96");
      expect(haasLathe!.features.threading?.code).toBe("G76");
    });
  });

  // ── CAD_ENRICHMENTS ────────────────────────────────────────────────────
  describe("CAD_ENRICHMENTS", () => {
    it("has 60+ CAD enrichments", () => {
      expect(CAD_ENRICHMENTS.length).toBeGreaterThanOrEqual(60);
    });

    it("each has a STEP file reference", () => {
      for (const e of CAD_ENRICHMENTS) {
        expect(e.cad_file).toBeDefined();
        expect(e.cad_file!.step_file).toBeTruthy();
        expect(e.cad_file!.step_file).toMatch(/\.step$/i);
      }
    });

    it("each has an ID and model", () => {
      for (const e of CAD_ENRICHMENTS) {
        expect(e.id).toBeTruthy();
        expect(e.model).toBeTruthy();
      }
    });

    it("spot-check: VF-2 has kinematic chain", () => {
      const vf2 = CAD_ENRICHMENTS.find((e) => e.model === "VF-2");
      expect(vf2).toBeDefined();
      expect(vf2!.kinematic_chain).toBeDefined();
      expect(vf2!.kinematic_chain!.type).toBe("serial_XYZ");
    });

    it("5-axis machines have TCPC info", () => {
      const vf2tr = CAD_ENRICHMENTS.find((e) => e.model === "VF-2TR");
      expect(vf2tr).toBeDefined();
      expect(vf2tr!.kinematic_chain!.fiveAxisType).toBe("table-table");
      expect(vf2tr!.kinematic_chain!.tcpcSupported).toBe(true);
    });
  });

  // ── getEnrichmentStats ─────────────────────────────────────────────────
  describe("getEnrichmentStats()", () => {
    const stats = getEnrichmentStats();

    it("returns correct counts", () => {
      expect(stats.post_db_profiles).toBe(POST_DB_PROFILES.length);
      expect(stats.lathe_deep_profiles).toBe(LATHE_DEEP_PROFILES.length);
      expect(stats.controller_feature_sets).toBe(CONTROLLER_FEATURES.length);
      expect(stats.cad_enrichments).toBe(CAD_ENRICHMENTS.length);
    });

    it("total_data_points sums correctly", () => {
      expect(stats.total_data_points).toBe(
        stats.post_db_profiles + stats.lathe_deep_profiles + stats.cad_enrichments
      );
    });

    it("manufacturers list is populated", () => {
      expect(stats.manufacturers.length).toBeGreaterThanOrEqual(8);
    });
  });
});
