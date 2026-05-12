/**
 * MCAT-MS0 P1-U02: Machine Vocabulary Normalizer Tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { machineVocabularyNormalizerEngine } from "../engines/MachineVocabularyNormalizerEngine.js";

describe("MachineVocabularyNormalizerEngine", () => {
  beforeEach(() => {
    machineVocabularyNormalizerEngine.resetStats();
  });

  describe("normalizeManufacturer", () => {
    it("should normalize exact canonical name", () => {
      const result = machineVocabularyNormalizerEngine.normalizeManufacturer("Okuma");
      expect(result.normalized.id).toBe("okuma");
      expect(result.normalized.name).toBe("Okuma");
      expect(result.confidence).toBe(1.0);
      expect(result.matchType).toBe("exact");
    });

    it("should normalize uppercase manufacturer", () => {
      const result = machineVocabularyNormalizerEngine.normalizeManufacturer("OKUMA");
      expect(result.normalized.id).toBe("okuma");
      // OKUMA matches via alias lookup (case-insensitive alias match)
      expect(["exact", "alias"]).toContain(result.matchType);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should normalize lowercase manufacturer", () => {
      const result = machineVocabularyNormalizerEngine.normalizeManufacturer("haas");
      expect(result.normalized.id).toBe("haas");
      expect(result.normalized.name).toBe("Haas");
    });

    it("should handle manufacturer with suffix", () => {
      const result = machineVocabularyNormalizerEngine.normalizeManufacturer("Okuma Corporation");
      expect(result.normalized.id).toBe("okuma");
      expect(result.matchType).toBe("alias");
    });

    it("should handle DMG MORI variants", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeManufacturer("DMG MORI");
      const result2 = machineVocabularyNormalizerEngine.normalizeManufacturer("Mori Seiki");
      const result3 = machineVocabularyNormalizerEngine.normalizeManufacturer("Deckel Maho");

      expect(result1.normalized.id).toBe("dmg_mori");
      expect(result2.normalized.id).toBe("dmg_mori");
      expect(result3.normalized.id).toBe("dmg_mori");
    });

    it("should handle DN Solutions / Doosan", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeManufacturer("Doosan");
      const result2 = machineVocabularyNormalizerEngine.normalizeManufacturer("DN Solutions");

      expect(result1.normalized.id).toBe("doosan");
      expect(result2.normalized.id).toBe("doosan");
    });

    it("should handle unknown manufacturer with low confidence", () => {
      const result = machineVocabularyNormalizerEngine.normalizeManufacturer("UnknownMfr123");
      expect(result.matchType).toBe("default");
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.normalized.name).toBe("Unknownmfr123");
    });

    it("should include machine types for known manufacturers", () => {
      const result = machineVocabularyNormalizerEngine.normalizeManufacturer("Mitsubishi");
      expect(result.normalized.machineTypes).toContain("edm");
    });
  });

  describe("normalizeController", () => {
    it("should normalize FANUC 31i variants", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeController("FANUC 31i-B");
      const result2 = machineVocabularyNormalizerEngine.normalizeController("31i-MB");
      const result3 = machineVocabularyNormalizerEngine.normalizeController("Fanuc 31i");

      expect(result1.normalized.vendor).toBe("FANUC");
      expect(result1.normalized.family).toBe("31i");
      expect(result2.normalized.family).toBe("31i");
      expect(result3.normalized.family).toBe("31i");
    });

    it("should normalize Siemens controllers", () => {
      const result = machineVocabularyNormalizerEngine.normalizeController("SINUMERIK 840D");
      expect(result.normalized.vendor).toBe("Siemens");
      expect(result.normalized.family).toBe("840D");
    });

    it("should normalize Haas NGC", () => {
      const result = machineVocabularyNormalizerEngine.normalizeController("Haas NGC");
      expect(result.normalized.vendor).toBe("Haas");
      expect(result.normalized.family).toBe("NGC");
    });

    it("should normalize Okuma OSP variants", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeController("OSP-P300");
      const result2 = machineVocabularyNormalizerEngine.normalizeController("THINC-OSP");

      expect(result1.normalized.vendor).toBe("Okuma");
      expect(result2.normalized.vendor).toBe("Okuma");
    });

    it("should normalize Mazak Mazatrol", () => {
      const result = machineVocabularyNormalizerEngine.normalizeController("SmoothAi");
      expect(result.normalized.vendor).toBe("Mazak");
    });

    it("should handle unknown controller", () => {
      const result = machineVocabularyNormalizerEngine.normalizeController("CustomControl v2");
      expect(result.matchType).toBe("default");
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("should extract FANUC model from pattern", () => {
      const result = machineVocabularyNormalizerEngine.normalizeController("FANUC 30i");
      expect(result.normalized.family).toBe("30i");
      // May match via alias ("Fanuc 30i" in aliases) or pattern
      expect(["alias", "pattern"]).toContain(result.matchType);
    });
  });

  describe("normalizeSpindle", () => {
    it("should identify belt-driven spindle", () => {
      const result = machineVocabularyNormalizerEngine.normalizeSpindle("Belt-driven spindle", 6000);
      expect(result.normalized.type).toBe("belt");
      expect(result.normalized.maxRpm).toBe(6000);
    });

    it("should identify direct-drive spindle", () => {
      const result = machineVocabularyNormalizerEngine.normalizeSpindle("Direct drive", 15000, 22);
      expect(result.normalized.type).toBe("direct");
      expect(result.normalized.powerKw).toBe(22);
    });

    it("should identify motorized spindle", () => {
      const result = machineVocabularyNormalizerEngine.normalizeSpindle("Built-in motorized spindle", 30000);
      expect(result.normalized.type).toBe("motorized");
    });

    it("should identify gear-driven spindle", () => {
      const result = machineVocabularyNormalizerEngine.normalizeSpindle("Geared head", 4000);
      expect(result.normalized.type).toBe("gear");
    });

    it("should infer type from high RPM when no description", () => {
      const result = machineVocabularyNormalizerEngine.normalizeSpindle("", 20000);
      expect(result.normalized.type).toBe("direct");
    });

    it("should default to belt for low RPM", () => {
      const result = machineVocabularyNormalizerEngine.normalizeSpindle("", 4000);
      expect(result.normalized.type).toBe("belt");
    });
  });

  describe("normalizeCoolant", () => {
    it("should normalize flood coolant variants", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCoolant("flood");
      const result2 = machineVocabularyNormalizerEngine.normalizeCoolant("FLOOD");
      const result3 = machineVocabularyNormalizerEngine.normalizeCoolant("wet");
      const result4 = machineVocabularyNormalizerEngine.normalizeCoolant("emulsion");

      expect(result1.normalized.type).toBe("flood");
      expect(result2.normalized.type).toBe("flood");
      expect(result3.normalized.type).toBe("flood");
      expect(result4.normalized.type).toBe("flood");
    });

    it("should normalize MQL variants", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCoolant("MQL");
      const result2 = machineVocabularyNormalizerEngine.normalizeCoolant("minimum quantity");
      const result3 = machineVocabularyNormalizerEngine.normalizeCoolant("near dry");

      expect(result1.normalized.type).toBe("mql");
      expect(result2.normalized.type).toBe("mql");
      expect(result3.normalized.type).toBe("mql");
    });

    it("should normalize through-spindle coolant", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCoolant("through spindle");
      const result2 = machineVocabularyNormalizerEngine.normalizeCoolant("TSC");
      const result3 = machineVocabularyNormalizerEngine.normalizeCoolant("high pressure");

      expect(result1.normalized.type).toBe("through_spindle");
      expect(result2.normalized.type).toBe("through_spindle");
      expect(result3.normalized.type).toBe("through_spindle");
    });

    it("should normalize cryogenic coolant", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCoolant("cryo");
      const result2 = machineVocabularyNormalizerEngine.normalizeCoolant("LN2");
      const result3 = machineVocabularyNormalizerEngine.normalizeCoolant("liquid nitrogen");

      expect(result1.normalized.type).toBe("cryogenic");
      expect(result2.normalized.type).toBe("cryogenic");
      expect(result3.normalized.type).toBe("cryogenic");
    });

    it("should normalize dry machining", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCoolant("dry");
      const result2 = machineVocabularyNormalizerEngine.normalizeCoolant("no coolant");

      expect(result1.normalized.type).toBe("dry");
      expect(result2.normalized.type).toBe("dry");
    });

    it("should default to flood for unknown", () => {
      const result = machineVocabularyNormalizerEngine.normalizeCoolant("mystery liquid");
      expect(result.normalized.type).toBe("flood");
      expect(result.matchType).toBe("default");
    });
  });

  describe("normalizeCapability", () => {
    it("should identify axis capabilities", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCapability("5-axis simultaneous");
      const result2 = machineVocabularyNormalizerEngine.normalizeCapability("4 axis");
      const result3 = machineVocabularyNormalizerEngine.normalizeCapability("Mill-Turn");

      expect(result1.normalized.category).toBe("axis");
      expect(result1.normalized.name).toBe("5-axis");
      expect(result2.normalized.name).toBe("4-axis");
      expect(result3.normalized.name).toBe("Mill-Turn");
    });

    it("should identify automation capabilities", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCapability("pallet changer");
      const result2 = machineVocabularyNormalizerEngine.normalizeCapability("bar feeder");
      const result3 = machineVocabularyNormalizerEngine.normalizeCapability("robot loader");

      expect(result1.normalized.category).toBe("automation");
      expect(result2.normalized.category).toBe("automation");
      expect(result3.normalized.category).toBe("automation");
    });

    it("should identify precision capabilities", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCapability("high precision");
      const result2 = machineVocabularyNormalizerEngine.normalizeCapability("thermal compensation");

      expect(result1.normalized.category).toBe("precision");
      expect(result2.normalized.category).toBe("precision");
    });

    it("should identify special machine types", () => {
      const result1 = machineVocabularyNormalizerEngine.normalizeCapability("Swiss type lathe");
      const result2 = machineVocabularyNormalizerEngine.normalizeCapability("Wire EDM");
      const result3 = machineVocabularyNormalizerEngine.normalizeCapability("Sinker EDM");

      expect(result1.normalized.category).toBe("special");
      expect(result1.normalized.name).toBe("Swiss-Type");
      expect(result2.normalized.name).toBe("Wire EDM");
      expect(result3.normalized.name).toBe("Sinker EDM");
    });

    it("should identify workholding capabilities", () => {
      const result = machineVocabularyNormalizerEngine.normalizeCapability("sub spindle");
      expect(result.normalized.category).toBe("workholding");
      expect(result.normalized.name).toBe("Sub-Spindle");
    });
  });

  describe("normalizeModelId", () => {
    it("should normalize Okuma model names", () => {
      const result = machineVocabularyNormalizerEngine.normalizeModelId("Okuma", "LB3000 EX II");
      expect(result.normalized).toContain("LB3000");
      expect(result.normalized).toContain("EX");
    });

    it("should normalize Haas model names", () => {
      const result = machineVocabularyNormalizerEngine.normalizeModelId("Haas", "VF 2 SS");
      expect(result.normalized).toContain("VF");
    });

    it("should normalize Mazak model names", () => {
      const result = machineVocabularyNormalizerEngine.normalizeModelId("Mazak", "Quick Turn Nexus 250");
      // Model is normalized to uppercase with dashes
      expect(result.normalized).toMatch(/QUICK|TURN|250/);
    });

    it("should remove manufacturer prefix from model", () => {
      const result = machineVocabularyNormalizerEngine.normalizeModelId("Okuma", "Okuma LB3000");
      expect(result.normalized).not.toMatch(/^OKUMA/i);
    });

    it("should uppercase model identifiers", () => {
      const result = machineVocabularyNormalizerEngine.normalizeModelId("Haas", "vf2");
      expect(result.normalized).toBe(result.normalized.toUpperCase());
    });
  });

  describe("normalizeMachineRecord", () => {
    it("should normalize complete machine record", () => {
      const result = machineVocabularyNormalizerEngine.normalizeMachineRecord({
        manufacturer: "okuma",
        model: "LB3000 EX",
        controller: "OSP-P300",
        spindle_type: "direct drive",
        spindle_max_rpm: 5000,
        coolant: "flood",
        capabilities: ["Y-axis", "sub spindle"],
      });

      expect(result.manufacturer?.normalized.id).toBe("okuma");
      expect(result.controller?.normalized.vendor).toBe("Okuma");
      expect(result.spindle?.normalized.type).toBe("direct");
      expect(result.coolant?.normalized.type).toBe("flood");
      expect(result.capabilities?.length).toBe(2);
      expect(result.overallConfidence).toBeGreaterThan(0);
    });

    it("should handle partial records", () => {
      const result = machineVocabularyNormalizerEngine.normalizeMachineRecord({
        manufacturer: "Haas",
      });

      expect(result.manufacturer?.normalized.id).toBe("haas");
      expect(result.controller).toBeUndefined();
      expect(result.spindle).toBeUndefined();
    });

    it("should compute overall confidence", () => {
      const result = machineVocabularyNormalizerEngine.normalizeMachineRecord({
        manufacturer: "Okuma",
        controller: "OSP-P300",
      });

      expect(result.overallConfidence).toBeLessThanOrEqual(1.0);
      expect(result.overallConfidence).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("should track normalization statistics", () => {
      machineVocabularyNormalizerEngine.normalizeManufacturer("Okuma");
      machineVocabularyNormalizerEngine.normalizeManufacturer("UnknownBrand");
      machineVocabularyNormalizerEngine.normalizeController("FANUC 31i");

      const stats = machineVocabularyNormalizerEngine.getStats();

      expect(stats.totalNormalizations).toBe(3);
      expect(stats.byCategory["manufacturer"]).toBe(2);
      expect(stats.byCategory["controller"]).toBe(1);
      expect(stats.unknownValues).toContain("manufacturer:UnknownBrand");
    });

    it("should track match types", () => {
      machineVocabularyNormalizerEngine.normalizeManufacturer("Okuma");
      machineVocabularyNormalizerEngine.normalizeManufacturer("UnknownCo");

      const stats = machineVocabularyNormalizerEngine.getStats();

      expect(stats.byMatchType["exact"]).toBe(1);
      expect(stats.byMatchType["default"]).toBe(1);
    });
  });

  describe("getManufacturers", () => {
    it("should return all canonical manufacturers", () => {
      const manufacturers = machineVocabularyNormalizerEngine.getManufacturers();

      expect(manufacturers.length).toBeGreaterThan(10);
      expect(manufacturers.some(m => m.id === "okuma")).toBe(true);
      expect(manufacturers.some(m => m.id === "haas")).toBe(true);
      expect(manufacturers.some(m => m.id === "mazak")).toBe(true);
    });
  });

  describe("getControllers", () => {
    it("should return all canonical controllers", () => {
      const controllers = machineVocabularyNormalizerEngine.getControllers();

      expect(controllers.length).toBeGreaterThan(5);
      expect(controllers.some(c => c.vendor === "FANUC")).toBe(true);
      expect(controllers.some(c => c.vendor === "Siemens")).toBe(true);
    });
  });

  describe("getCoolantTypes", () => {
    it("should return all canonical coolant types", () => {
      const coolants = machineVocabularyNormalizerEngine.getCoolantTypes();

      expect(coolants.length).toBeGreaterThan(5);
      expect(coolants.some(c => c.type === "flood")).toBe(true);
      expect(coolants.some(c => c.type === "mql")).toBe(true);
      expect(coolants.some(c => c.type === "cryogenic")).toBe(true);
    });
  });

  describe("getSelfAwareness", () => {
    it("should return engine self-awareness info", () => {
      const awareness = machineVocabularyNormalizerEngine.getSelfAwareness();

      expect(awareness.name).toBe("MachineVocabularyNormalizerEngine");
      expect(awareness.capabilities).toContain("normalizeManufacturer");
      expect(awareness.capabilities).toContain("normalizeController");
      expect(awareness.vocabularyCounts.manufacturers).toBeGreaterThan(10);
      expect(awareness.vocabularyCounts.controllers).toBeGreaterThan(5);
    });
  });
});
