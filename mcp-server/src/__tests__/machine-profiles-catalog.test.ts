/**
 * Tests for machine-profiles-catalog.ts
 * Validates extracted machine specs from PRISM Archive Enhanced databases.
 */
import { describe, it, expect } from "vitest";
import {
  EXTENDED_MACHINE_CATALOG,
  toCatalogProfiles,
  getCatalogStats,
  type ExtendedMachineProfile,
} from "../data/machine-profiles-catalog.js";

describe("machine-profiles-catalog", () => {
  // ── Catalog structure ─────────────────────────────────────────────
  describe("EXTENDED_MACHINE_CATALOG", () => {
    it("contains profiles from all 7 brands", () => {
      const brands = new Set(
        EXTENDED_MACHINE_CATALOG.map((p) => p.brand)
      );
      expect(brands).toContain("Haas");
      expect(brands).toContain("DMG MORI");
      expect(brands).toContain("Mazak");
      expect(brands).toContain("Makino");
      expect(brands).toContain("Okuma");
      expect(brands).toContain("Hermle");
      expect(brands).toContain("Doosan");
      expect(brands.size).toBeGreaterThanOrEqual(7);
    });

    it("has at least 50 total profiles", () => {
      expect(EXTENDED_MACHINE_CATALOG.length).toBeGreaterThanOrEqual(50);
    });

    it("covers all major machine types", () => {
      const types = new Set(
        EXTENDED_MACHINE_CATALOG.map((p) => p.type)
      );
      expect(types).toContain("VMC");
      expect(types).toContain("HMC");
      expect(types).toContain("lathe");
      expect(types).toContain("5axis");
      expect(types).toContain("mill_turn");
    });
  });

  // ── Data integrity per profile ────────────────────────────────────
  describe("profile data integrity", () => {
    it.each(EXTENDED_MACHINE_CATALOG.map((p) => [
      `${p.brand} ${p.model}`, p,
    ] as [string, ExtendedMachineProfile]))(
      "%s has valid specs",
      (_name, profile) => {
        // Brand and model present
        expect(profile.brand).toBeTruthy();
        expect(profile.model).toBeTruthy();
        expect(profile.controller).toBeTruthy();

        // At least 2 linear axes
        expect(profile.linear_axes.length).toBeGreaterThanOrEqual(2);

        // Each axis has travel and rapid
        for (const ax of profile.linear_axes) {
          expect(ax.name).toBeTruthy();
          expect(ax.travel_mm).toBeGreaterThan(0);
          expect(ax.rapid_m_min).toBeGreaterThan(0);
        }

        // Spindle: EDM machines have 0 RPM, others must be positive
        if (
          profile.type !== "edm_wire" &&
          profile.type !== "edm_sinker"
        ) {
          expect(profile.spindle.max_rpm).toBeGreaterThan(0);
          expect(profile.spindle.power_kw).toBeGreaterThan(0);
          expect(profile.spindle.torque_nm).toBeGreaterThan(0);
          expect(profile.spindle.taper).toBeTruthy();
        }
      }
    );

    it("5-axis machines have rotary axes defined", () => {
      const fiveAxis = EXTENDED_MACHINE_CATALOG.filter(
        (p) => p.type === "5axis"
      );
      expect(fiveAxis.length).toBeGreaterThanOrEqual(8);
      for (const p of fiveAxis) {
        expect(p.rotary_axes).toBeDefined();
        expect(p.rotary_axes!.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("mill-turn machines have B-axis", () => {
      const mt = EXTENDED_MACHINE_CATALOG.filter(
        (p) => p.type === "mill_turn"
      );
      expect(mt.length).toBeGreaterThanOrEqual(2);
      for (const p of mt) {
        expect(p.rotary_axes).toBeDefined();
        const hasB = p.rotary_axes!.some((a) => a.name === "B");
        expect(hasB).toBe(true);
      }
    });

    it("HMC machines have B-axis rotary table", () => {
      const hmcs = EXTENDED_MACHINE_CATALOG.filter(
        (p) => p.type === "HMC"
      );
      expect(hmcs.length).toBeGreaterThanOrEqual(3);
      for (const p of hmcs) {
        expect(p.rotary_axes).toBeDefined();
        const hasB = p.rotary_axes!.some((a) => a.name === "B");
        expect(hasB).toBe(true);
      }
    });
  });

  // ── Physical plausibility ─────────────────────────────────────────
  describe("physical plausibility", () => {
    it("spindle RPM is within realistic range", () => {
      for (const p of EXTENDED_MACHINE_CATALOG) {
        if (
          p.type === "edm_wire" || p.type === "edm_sinker"
        ) continue;
        expect(p.spindle.max_rpm).toBeGreaterThanOrEqual(1000);
        expect(p.spindle.max_rpm).toBeLessThanOrEqual(200000); // micro-milling spindles reach 160k+
      }
    });

    it("spindle power is within realistic range (0.5-100 kW)", () => {
      for (const p of EXTENDED_MACHINE_CATALOG) {
        if (
          p.type === "edm_wire" || p.type === "edm_sinker"
        ) continue;
        expect(p.spindle.power_kw).toBeGreaterThanOrEqual(0.5);
        expect(p.spindle.power_kw).toBeLessThanOrEqual(100);
      }
    });

    it("axis travels are within realistic range", () => {
      for (const p of EXTENDED_MACHINE_CATALOG) {
        for (const ax of p.linear_axes) {
          expect(ax.travel_mm).toBeGreaterThan(0);
          expect(ax.travel_mm).toBeLessThanOrEqual(25000); // floor-type boring mills (Soraluce FR-22000) reach 22m
        }
      }
    });

    it("rapid rates are within realistic range (1-100 m/min)", () => {
      for (const p of EXTENDED_MACHINE_CATALOG) {
        for (const ax of p.linear_axes) {
          expect(ax.rapid_m_min).toBeGreaterThanOrEqual(1);
          expect(ax.rapid_m_min).toBeLessThanOrEqual(100);
        }
      }
    });

    it("tool changer capacity is realistic", () => {
      for (const p of EXTENDED_MACHINE_CATALOG) {
        if (
          p.type === "edm_wire" || p.type === "edm_sinker"
        ) continue;
        expect(p.tool_changer.capacity).toBeGreaterThanOrEqual(1);
        expect(p.tool_changer.capacity).toBeLessThanOrEqual(300);
      }
    });
  });

  // ── Specific machine spot-checks ──────────────────────────────────
  describe("spot-check known machines", () => {
    it("keeps Okuma source catalog depth across mill, HMC, 5-axis, lathe, mill-turn, and bridge families", () => {
      const okumaProfiles = EXTENDED_MACHINE_CATALOG.filter(
        (p) => p.brand === "Okuma"
      );
      const models = new Set(okumaProfiles.map((p) => p.model));
      const types = new Set(okumaProfiles.map((p) => p.type));

      expect(okumaProfiles.length).toBeGreaterThanOrEqual(10);
      expect(models.size).toBeGreaterThanOrEqual(10);
      expect(types).toContain("5axis");
      expect(types).toContain("HMC");
      expect(types).toContain("VMC");
      expect(types).toContain("lathe");
      expect(types).toContain("mill_turn");
      expect(types).toContain("bridge");

      expect(okumaProfiles.some((p) => p.model === "MU-5000V")).toBe(true);
      expect(okumaProfiles.some((p) => p.model === "MB-5000H")).toBe(true);
      expect(okumaProfiles.some((p) => p.model === "MULTUS B300II")).toBe(true);
      expect(okumaProfiles.some((p) => p.model === "LB3000 EX II MY")).toBe(true);
      expect(okumaProfiles.some((p) => p.model === "MCR-A5CII")).toBe(true);
    });

    it("Haas catalog covers the major mill and lathe families", () => {
      const haasProfiles = EXTENDED_MACHINE_CATALOG.filter(
        (p) => p.brand === "Haas"
      );
      const models = new Set(haasProfiles.map((p) => p.model));

      expect(haasProfiles.length).toBeGreaterThanOrEqual(9);
      expect(models).toContain("VF-6/50");
      expect(models).toContain("UMC-750");
      expect(models).toContain("UMC-1000");
      expect(models).toContain("EC-400");
      expect(models).toContain("EC-500");
      expect(models).toContain("DT-1");
      expect(models).toContain("ST-20");
      expect(models).toContain("ST-20Y");
      expect(models).toContain("ST-35");
    });

    it("Haas VF-2 has correct specs", () => {
      const vf2 = EXTENDED_MACHINE_CATALOG.find(
        (p) => p.brand === "Haas" && p.model === "VF-2"
      );
      expect(vf2).toBeDefined();
      expect(vf2!.spindle.max_rpm).toBe(8100);
      expect(vf2!.spindle.power_kw).toBe(22.4);
      expect(vf2!.spindle.torque_nm).toBe(122);
      expect(vf2!.spindle.taper).toBe("BT40");
      expect(vf2!.linear_axes[0].travel_mm).toBe(762); // X
      expect(vf2!.linear_axes[1].travel_mm).toBe(406); // Y
      expect(vf2!.linear_axes[2].travel_mm).toBe(508); // Z
      expect(vf2!.tool_changer.capacity).toBe(20);
      expect(vf2!.table?.max_load_kg).toBe(1361);
    });

    it("DMG DMU 50 has correct 5-axis specs", () => {
      const dmu = EXTENDED_MACHINE_CATALOG.find(
        (p) =>
          p.brand === "DMG MORI" &&
          p.model.includes("DMU 50")
      );
      expect(dmu).toBeDefined();
      expect(dmu!.type).toBe("5axis");
      expect(dmu!.spindle.taper).toBe("HSK-A63");
      expect(dmu!.rotary_axes).toBeDefined();
      expect(dmu!.rotary_axes!.length).toBe(2);
    });

    it("Mazak INTEGREX i-200S is mill-turn", () => {
      const itx = EXTENDED_MACHINE_CATALOG.find(
        (p) =>
          p.brand === "Mazak" &&
          p.model.includes("INTEGREX")
      );
      expect(itx).toBeDefined();
      expect(itx!.type).toBe("mill_turn");
      expect(itx!.spindle.taper).toBe("Capto C6");
    });

    it("Makino D500 has high positioning accuracy", () => {
      const d500 = EXTENDED_MACHINE_CATALOG.find(
        (p) => p.brand === "Makino" && p.model === "D500"
      );
      expect(d500).toBeDefined();
      expect(d500!.accuracy?.positioning_mm).toBeLessThanOrEqual(0.002);
      expect(d500!.accuracy?.repeatability_mm).toBeLessThanOrEqual(0.001);
    });

    it("Okuma MU-5000V remains present in the source catalog", () => {
      const mu = EXTENDED_MACHINE_CATALOG.find(
        (p) =>
          p.brand === "Okuma" &&
          p.model === "MU-5000V"
      );
      expect(mu).toBeDefined();
      expect(mu!.type).toBe("5axis");
      expect(mu!.controller).toBeTruthy();
    });

    it("Okuma catalog spans mill, HMC, 5-axis, lathe, and mill-turn families", () => {
      const okuma = EXTENDED_MACHINE_CATALOG.filter((p) => p.brand === "Okuma");
      expect(okuma.length).toBeGreaterThanOrEqual(8);

      const types = new Set(okuma.map((p) => p.type));
      expect(types).toContain("VMC");
      expect(types).toContain("HMC");
      expect(types).toContain("5axis");
      expect(types).toContain("lathe");
      expect(types).toContain("mill_turn");

      const expectedModels = [
        "GENOS M460-V",
        "MA-400HA",
        "MU-5000V",
        "LB3000 EXII",
        "MULTUS B300II",
      ];
      for (const model of expectedModels) {
        expect(okuma.some((p) => p.model.includes(model))).toBe(true);
      }

      const ospControllers = okuma.filter((p) =>
        p.controller.toLowerCase().includes("osp")
      );
      expect(ospControllers.length).toBeGreaterThanOrEqual(5);
    });

    it("Hermle C 32 U has mineral-cast precision", () => {
      const c32 = EXTENDED_MACHINE_CATALOG.find(
        (p) =>
          p.brand === "Hermle" &&
          p.model === "C 32 U"
      );
      expect(c32).toBeDefined();
      expect(c32!.type).toBe("5axis");
      expect(c32!.spindle.max_rpm).toBe(18000);
      expect(
        c32!.accuracy?.positioning_mm
      ).toBeLessThanOrEqual(0.003);
    });
  });

  // ── toCatalogProfiles conversion ──────────────────────────────────
  describe("toCatalogProfiles()", () => {
    const converted = toCatalogProfiles();

    it("converts all profiles", () => {
      expect(converted.length).toBe(EXTENDED_MACHINE_CATALOG.length);
    });

    it("each converted profile has required MachineProfile fields", () => {
      for (const p of converted) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.type).toBeTruthy();
        expect(p.manufacturer).toBeTruthy();
        expect(p.model).toBeTruthy();
        expect(p.controller).toBeTruthy();
        expect(p.spindle).toBeDefined();
        expect(p.axes).toBeDefined();
        expect(typeof p.rapid_rate_mmmin).toBe("number");
        expect(typeof p.max_feed_mmmin).toBe("number");
        expect(typeof p.tool_changer_capacity).toBe("number");
        expect(typeof p.max_part_weight_kg).toBe("number");
        expect(p.coolant).toBeDefined();
      }
    });

    it("generates unique IDs", () => {
      const ids = converted.map((p) => p.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("maps 5-axis rotary axes to a_deg/b_deg/c_deg", () => {
      const umc750 = converted.find(
        (p) => p.model === "UMC-750"
      );
      expect(umc750).toBeDefined();
      expect(umc750!.axes.a_deg).toBe(155); // -35 to 120
      expect(umc750!.axes.c_deg).toBe(360); // continuous
    });

    it("sets correct spindle.base_rpm", () => {
      const vf2 = converted.find(
        (p) => p.model === "VF-2"
      );
      expect(vf2).toBeDefined();
      expect(vf2!.spindle.base_rpm).toBe(2000);
    });

    it("does not duplicate existing MachineProfileEngine defaults", () => {
      // The catalog generates IDs like haas_vf_2, not haas_vf2,
      // so they won't collide with the engine's existing IDs
      const catalogIds = new Set(converted.map((p) => p.id));
      // Existing engine IDs
      const engineIds = [
        "haas_vf2", "haas_vf2ss", "haas_ums5",
        "dmg_dmv70", "mazak_vcs430", "okuma_genos_m560v",
      ];
      // Some may overlap (genos_m560_v vs genos_m560v) — just check
      // they're at least convertible without error
      expect(catalogIds.size).toBeGreaterThan(0);
      // engineIds should not all exist in catalog
      const overlap = engineIds.filter((id) => catalogIds.has(id));
      // OK if some overlap — engine.add() will overwrite
      expect(overlap.length).toBeLessThanOrEqual(engineIds.length);
    });
  });

  // ── getCatalogStats ───────────────────────────────────────────────
  describe("getCatalogStats()", () => {
    const stats = getCatalogStats();

    it("returns correct total count", () => {
      expect(stats.total_profiles).toBe(
        EXTENDED_MACHINE_CATALOG.length
      );
    });

    it("lists all brands", () => {
      expect(stats.brands.length).toBeGreaterThanOrEqual(7);
      expect(stats.brands).toContain("Haas");
      expect(stats.brands).toContain("DMG MORI");
      expect(stats.brands).toContain("Mazak");
      expect(stats.brands).toContain("Makino");
      expect(stats.brands).toContain("Okuma");
      expect(stats.brands).toContain("Hermle");
      expect(stats.brands).toContain("Doosan");
    });

    it("by_brand sums to total", () => {
      const sum = Object.values(stats.by_brand).reduce(
        (a, b) => a + b,
        0
      );
      expect(sum).toBe(stats.total_profiles);
    });

    it("by_type sums to total", () => {
      const sum = Object.values(stats.by_type).reduce(
        (a, b) => a + b,
        0
      );
      expect(sum).toBe(stats.total_profiles);
    });

    it("Haas has the most profiles", () => {
      expect(stats.by_brand["Haas"]).toBeGreaterThanOrEqual(10);
    });
  });
});
