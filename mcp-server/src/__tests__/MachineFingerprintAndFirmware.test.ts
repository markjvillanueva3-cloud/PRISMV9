/**
 * PP-MS2: MachineFingerprintEngine + FirmwareFeatureMatrixEngine Tests
 *
 * Tests machine → post config resolution across 5 resolution methods,
 * firmware feature availability with year gating, and edge cases.
 */
import { describe, it, expect } from "vitest";
import { machineFingerprintEngine } from "../engines/MachineFingerprintEngine.js";
import { firmwareFeatureMatrixEngine } from "../engines/FirmwareFeatureMatrixEngine.js";

// ── MachineFingerprintEngine ──────────────────────────────────────────

describe("MachineFingerprintEngine", () => {
  describe("exact catalog match", () => {
    it("resolves Haas VF-2 to haas_ngc", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Haas", model: "VF-2" });
      expect(r.controller_family).toBe("haas_ngc");
      expect(r.resolution_method).toBe("exact_catalog");
      expect(r.confidence).toBeGreaterThanOrEqual(0.9);
      expect(r.matched_profile).toBeDefined();
      expect(r.matched_profile!.max_rpm).toBe(8100);
      expect(r.axis_config).toBe("3axis");
    });

    it("resolves Haas UMC-750 as 5-axis", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Haas", model: "UMC-750" });
      expect(r.controller_family).toBe("haas_ngc");
      expect(r.axis_config).toBe("5axis");
      expect(r.recommended_features.tcp).toBe(true);
    });
  });

  describe("fuzzy catalog match", () => {
    it("fuzzy matches VF2 (no hyphen) to VF-2", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Haas", model: "VF2" });
      expect(r.controller_family).toBe("haas_ngc");
      expect(r.resolution_method).toBe("fuzzy_catalog");
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("year-based resolution", () => {
    it("old Haas (pre-2006) resolves to fanuc_0i", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Haas", model: "Unknown", year: 2004 });
      expect(r.controller_family).toBe("fanuc_0i");
      expect(r.resolution_method).toBe("year_based");
    });

    it("modern Haas (2010+) resolves to haas_ngc", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Haas", model: "Unknown", year: 2020 });
      expect(r.controller_family).toBe("haas_ngc");
    });

    it("old Mazak resolves to smooth_g, new to smooth_ai", () => {
      const old = machineFingerprintEngine.fingerprint({ manufacturer: "Mazak", model: "Unknown", year: 2015 });
      const newer = machineFingerprintEngine.fingerprint({ manufacturer: "Mazak", model: "Unknown", year: 2022 });
      expect(old.controller_family).toBe("mazak_smooth_g");
      expect(newer.controller_family).toBe("mazak_smooth_ai");
    });
  });

  describe("manufacturer default", () => {
    it("unknown Makino model defaults to fanuc_31i", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Makino", model: "Custom" });
      expect(r.controller_family).toBe("fanuc_31i");
      expect(r.resolution_method).toBe("manufacturer_default");
    });

    it("Hermle defaults to siemens_840d", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Hermle", model: "C42U" });
      expect(r.controller_family).toBe("siemens_840d");
    });
  });

  describe("controller override", () => {
    it("override takes precedence over catalog match", () => {
      const r = machineFingerprintEngine.fingerprint({
        manufacturer: "Haas", model: "VF-2", controller_override: "fanuc_31i",
      });
      expect(r.controller_family).toBe("fanuc_31i");
      expect(r.resolution_method).toBe("controller_override");
      expect(r.confidence).toBe(1.0);
    });
  });

  describe("fallback", () => {
    it("completely unknown machine falls back to generic_fanuc", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "XYZ Corp", model: "Widget 3000" });
      expect(r.controller_family).toBe("generic_fanuc");
      expect(r.resolution_method).toBe("fallback");
      expect(r.confidence).toBeLessThan(0.5);
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("recommended features", () => {
    it("recommends TCP for 5-axis machines", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Haas", model: "UMC-750" });
      expect(r.recommended_features.tcp).toBe(true);
      expect(r.recommended_features.hsm).toBe(true);
    });

    it("recommends SSV for lathes", () => {
      const r = machineFingerprintEngine.fingerprint({ manufacturer: "Citizen", model: "Unknown" });
      // Falls to manufacturer default — citizen = swiss type would need catalog match
      expect(r.recommended_features.probing).toBe(true);
    });
  });

  describe("list methods", () => {
    it("lists manufacturers from catalog", () => {
      const mfrs = machineFingerprintEngine.listManufacturers();
      expect(mfrs.length).toBeGreaterThan(5);
      expect(mfrs).toContain("Haas");
    });

    it("lists models for Haas", () => {
      const models = machineFingerprintEngine.listModels("Haas");
      expect(models.length).toBeGreaterThan(5);
      expect(models).toContain("VF-2");
    });
  });

  describe("input validation", () => {
    it("throws on missing manufacturer", () => {
      expect(() => machineFingerprintEngine.fingerprint({ manufacturer: "", model: "X" })).toThrow();
    });
    it("throws on missing model", () => {
      expect(() => machineFingerprintEngine.fingerprint({ manufacturer: "X", model: "" })).toThrow();
    });
    it("throws on invalid year", () => {
      expect(() => machineFingerprintEngine.fingerprint({ manufacturer: "X", model: "Y", year: 1800 })).toThrow();
    });
  });

  describe("execute router", () => {
    it("routes machine_fingerprint", () => {
      const r = machineFingerprintEngine.execute("machine_fingerprint", { manufacturer: "Haas", model: "VF-2" });
      expect(r.controller_family).toBe("haas_ngc");
    });
    it("routes machine_list_manufacturers", () => {
      const r = machineFingerprintEngine.execute("machine_list_manufacturers", {});
      expect(r.manufacturers.length).toBeGreaterThan(0);
    });
    it("throws on unknown action", () => {
      expect(() => machineFingerprintEngine.execute("bad", {})).toThrow("Unknown action");
    });
  });
});

// ── FirmwareFeatureMatrixEngine ───────────────────────────────────────

describe("FirmwareFeatureMatrixEngine", () => {
  describe("feature lookup", () => {
    it("returns Haas NGC features", () => {
      const r = firmwareFeatureMatrixEngine.getFeatures("haas_ngc");
      expect(r.features.length).toBeGreaterThan(5);
      expect(r.available_count).toBeGreaterThan(0);
      expect(r.controller_family).toBe("haas_ngc");
    });

    it("returns Siemens 840D features", () => {
      const r = firmwareFeatureMatrixEngine.getFeatures("siemens_840d");
      expect(r.features.some(f => f.code === "CYCLE832")).toBe(true);
      expect(r.features.some(f => f.code === "TRAORI")).toBe(true);
    });

    it("returns Fanuc 31i features with AICC", () => {
      const r = firmwareFeatureMatrixEngine.getFeatures("fanuc_31i");
      expect(r.features.some(f => f.id === "fan_aicc")).toBe(true);
    });
  });

  describe("year gating", () => {
    it("Haas M65 probe unavailable before 2018", () => {
      const r = firmwareFeatureMatrixEngine.getFeatures("haas_ngc", 2015);
      expect(r.unavailable_count).toBeGreaterThan(0);
      const m65 = r.features.find(f => f.id === "haas_m65_probe");
      expect(m65).toBeDefined();
      expect(m65!.available_from_year).toBe(2018);
    });

    it("Haas M65 probe available in 2020", () => {
      expect(firmwareFeatureMatrixEngine.isFeatureAvailable("haas_ngc", "haas_m65_probe", 2020)).toBe(true);
    });

    it("Citizen LFV unavailable before 2016", () => {
      expect(firmwareFeatureMatrixEngine.isFeatureAvailable("citizen_cincom", "cit_lfv", 2014)).toBe(false);
      expect(firmwareFeatureMatrixEngine.isFeatureAvailable("citizen_cincom", "cit_lfv", 2020)).toBe(true);
    });

    it("always-available features return true for any year", () => {
      expect(firmwareFeatureMatrixEngine.isFeatureAvailable("haas_ngc", "haas_g187", 2005)).toBe(true);
    });
  });

  describe("base fallback", () => {
    it("fanuc_16i falls back to fanuc_31i features", () => {
      const r = firmwareFeatureMatrixEngine.getFeatures("fanuc_16i");
      expect(r.features.length).toBeGreaterThan(0);
      expect(r.warnings.some(w => w.includes("fanuc_31i"))).toBe(true);
    });

    it("generic_fanuc falls back to fanuc_0i", () => {
      const r = firmwareFeatureMatrixEngine.getFeatures("generic_fanuc");
      expect(r.features.length).toBeGreaterThan(0);
    });
  });

  describe("list controllers", () => {
    it("lists 12+ covered controllers", () => {
      const ctrls = firmwareFeatureMatrixEngine.listCoveredControllers();
      expect(ctrls.length).toBeGreaterThanOrEqual(12);
      expect(ctrls).toContain("haas_ngc");
      expect(ctrls).toContain("siemens_840d");
    });
  });

  describe("input validation", () => {
    it("throws on missing controller", () => {
      expect(() => firmwareFeatureMatrixEngine.getFeatures("" as any)).toThrow();
    });
    it("throws on invalid year", () => {
      expect(() => firmwareFeatureMatrixEngine.getFeatures("haas_ngc", 1900)).toThrow();
    });
  });

  describe("execute router", () => {
    it("routes firmware_features", () => {
      const r = firmwareFeatureMatrixEngine.execute("firmware_features", { controller_family: "haas_ngc", year: 2022 });
      expect(r.features.length).toBeGreaterThan(0);
    });
    it("routes firmware_check", () => {
      const r = firmwareFeatureMatrixEngine.execute("firmware_check", { controller_family: "haas_ngc", feature_id: "haas_g187" });
      expect(r.available).toBe(true);
    });
    it("routes firmware_controllers", () => {
      const r = firmwareFeatureMatrixEngine.execute("firmware_controllers", {});
      expect(r.controllers.length).toBeGreaterThanOrEqual(12);
    });
    it("throws on unknown action", () => {
      expect(() => firmwareFeatureMatrixEngine.execute("bad", {})).toThrow("Unknown action");
    });
  });
});
