/**
 * OntologyGrowthRegistryEngine.test.ts
 *
 * Tests for cross-CAM field translation using canonical ontology mappings.
 *
 * @unit CAM-UIX-MS0/U-ONTOLOGY-SEED01
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OntologyGrowthRegistryEngine,
  TranslationResult,
  ontologyGrowthRegistryEngine,
} from "../../engines/OntologyGrowthRegistryEngine.js";

describe("OntologyGrowthRegistryEngine", () => {
  beforeEach(() => {
    OntologyGrowthRegistryEngine.resetInstance();
  });

  describe("singleton pattern", () => {
    it("getInstance returns same instance", () => {
      const a = OntologyGrowthRegistryEngine.getInstance();
      const b = OntologyGrowthRegistryEngine.getInstance();
      expect(a).toBe(b);
    });

    it("exported singleton matches getInstance", () => {
      OntologyGrowthRegistryEngine.resetInstance();
      const fresh = OntologyGrowthRegistryEngine.getInstance();
      expect(fresh).toBeInstanceOf(OntologyGrowthRegistryEngine);
    });

    it("resetInstance clears singleton", () => {
      const a = OntologyGrowthRegistryEngine.getInstance();
      OntologyGrowthRegistryEngine.resetInstance();
      const b = OntologyGrowthRegistryEngine.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe("loadOntologies", () => {
    it("loads all 4 ontology domains", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      engine.loadOntologies();
      const domains = engine.getDomains();
      expect(domains).toContain("cutting");
      expect(domains).toContain("workholding");
      expect(domains).toContain("nc-structure");
      expect(domains).toContain("machine-def");
    });

    it("loading is idempotent", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      engine.loadOntologies();
      const stats1 = engine.getOntologyStats();
      engine.loadOntologies();
      const stats2 = engine.getOntologyStats();
      expect(stats1).toEqual(stats2);
    });
  });

  describe("translate - cutting parameters", () => {
    it("translates mastercam max_stepdown to fusion360 maximumStepdown", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "fusion360", "max_stepdown");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("axial_depth");
      expect(result.targetField).toBe("maximumStepdown");
    });

    it("translates fusion360 stepover to hypermill ae", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("fusion360", "hypermill", "stepover");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("radial_width");
      expect(result.targetField).toBe("ae");
    });

    it("translates nx_cam feed_per_tooth to solidcam fz", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("nx_cam", "solidcam", "feed_per_tooth");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("feed_per_tooth");
      expect(result.targetField).toBe("fz");
    });

    it("includes unit_class in translation output", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "fusion360", "rpm");
      expect(result.unitClass).toBe("angular_velocity");
    });
  });

  describe("translate - workholding parameters", () => {
    it("translates mastercam clamp_force to hypermill clamping_force_n", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "hypermill", "clamp_force");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("clamping_force");
      expect(result.targetField).toBe("clamping_force_n");
    });

    it("translates fusion360 jawWidth to nx_cam jawWidth", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("fusion360", "nx_cam", "jawWidth");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("jaw_width");
    });

    it("translates solidcam stickout to okuma_igf projection", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("solidcam", "okuma_igf", "stickout");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("part_stickout");
      expect(result.targetField).toBe("projection");
    });
  });

  describe("translate - NC structure", () => {
    it("translates fanuc O to siemens program_name", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("fanuc", "siemens", "O");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("program_id");
      expect(result.targetField).toBe("program_name");
    });

    it("translates mastercam tool_number to heidenhain TOOL CALL", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "heidenhain", "tool_number");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("tool_number");
      expect(result.targetField).toBe("TOOL CALL");
    });

    it("translates fanuc G41 to heidenhain RL", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("fanuc", "heidenhain", "G41");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("cutter_comp");
      expect(result.targetField).toBe("RL");
    });
  });

  describe("translate - machine definition", () => {
    it("translates mastercam max_spindle_rpm to fusion360 maximumSpindleSpeed", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "fusion360", "max_spindle_rpm");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("max_spindle_speed");
      expect(result.targetField).toBe("maximumSpindleSpeed");
    });

    it("translates hypermill travel_x to nx_cam xTravel", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("hypermill", "nx_cam", "travel_x");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("x_axis_travel");
      expect(result.targetField).toBe("xTravel");
    });
  });

  describe("translate - unsupported cases", () => {
    it("returns UNSUPPORTED for unknown source CAM", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("unknown_cam", "fusion360", "depth");
      expect(result.result).toBe(TranslationResult.UNSUPPORTED);
      expect(result.targetField).toBeNull();
      expect(result.conversionNote).toContain("Source CAM");
    });

    it("returns UNSUPPORTED for unknown field", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "fusion360", "unknown_field_xyz");
      expect(result.result).toBe(TranslationResult.UNSUPPORTED);
      expect(result.targetField).toBeNull();
      expect(result.conversionNote).toContain("not found");
    });

    it("handles case-insensitive CAM names", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("MASTERCAM", "FUSION360", "max_stepdown");
      expect(result.result).toBe(TranslationResult.EXACT);
    });

    it("handles case-insensitive field names", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "fusion360", "MAX_STEPDOWN");
      expect(result.result).toBe(TranslationResult.EXACT);
    });
  });

  describe("getCanonical", () => {
    it("returns canonical for known field", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const canonical = engine.getCanonical("mastercam", "stepover");
      expect(canonical).toBe("radial_width");
    });

    it("returns null for unknown field", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const canonical = engine.getCanonical("mastercam", "not_a_field");
      expect(canonical).toBeNull();
    });

    it("returns null for unknown CAM", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const canonical = engine.getCanonical("not_a_cam", "stepover");
      expect(canonical).toBeNull();
    });
  });

  describe("getAllCanonicals", () => {
    it("returns sorted list of all canonical names", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const canonicals = engine.getAllCanonicals();
      expect(canonicals.length).toBeGreaterThan(30);
      expect(canonicals).toContain("axial_depth");
      expect(canonicals).toContain("radial_width");
      expect(canonicals).toContain("feed_per_tooth");
      expect(canonicals).toContain("clamping_force");
      expect(canonicals).toContain("program_id");
      expect(canonicals).toEqual([...canonicals].sort());
    });
  });

  describe("getAliasesForCanonical", () => {
    it("returns all CAM aliases for a canonical", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const aliases = engine.getAliasesForCanonical("axial_depth");
      expect(aliases).toBeDefined();
      expect((aliases as Record<string, string[]>).mastercam).toContain("max_stepdown");
      expect((aliases as Record<string, string[]>).fusion360).toContain("maximumStepdown");
    });

    it("returns specific CAM aliases when CAM specified", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const aliases = engine.getAliasesForCanonical("axial_depth", "mastercam");
      expect(aliases).toContain("max_stepdown");
      expect(aliases).toContain("step_down");
    });

    it("returns null for unknown canonical", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const aliases = engine.getAliasesForCanonical("not_a_canonical");
      expect(aliases).toBeNull();
    });
  });

  describe("getSupportedCAMs", () => {
    it("returns list of supported CAM systems", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const cams = engine.getSupportedCAMs();
      expect(cams).toContain("mastercam");
      expect(cams).toContain("fusion360");
      expect(cams).toContain("hypermill");
      expect(cams).toContain("solidcam");
      expect(cams).toContain("nx_cam");
      expect(cams).toContain("fanuc");
      expect(cams).toContain("siemens");
      expect(cams).toContain("heidenhain");
    });
  });

  describe("getOntologyStats", () => {
    it("returns valid statistics", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const stats = engine.getOntologyStats();
      expect(stats.domains).toBe(4);
      expect(stats.totalCategories).toBeGreaterThan(30);
      expect(stats.totalAliases).toBeGreaterThan(200);
      expect(stats.camsIndexed).toBeGreaterThan(5);
    });
  });

  describe("translateStrategy", () => {
    it("translates Dynamic Mill to Adaptive Clearing", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translateStrategy("mastercam", "fusion360", "Dynamic Mill");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("adaptive_clearing");
      expect(result.targetField).toBe("Adaptive Clearing");
    });

    it("translates Pocket strategy across CAMs", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translateStrategy("fusion360", "nx_cam", "Pocket");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("pocket_clearing");
      expect(result.targetField).toBe("Planar Mill");
    });

    it("translates Pencil finishing strategy", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translateStrategy("mastercam", "hypermill", "Pencil");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.canonical).toBe("pencil_finishing");
      expect(result.targetField).toBe("Rest Machining");
    });

    it("returns UNSUPPORTED for unknown strategy", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translateStrategy("mastercam", "fusion360", "Not A Strategy");
      expect(result.result).toBe(TranslationResult.UNSUPPORTED);
      expect(result.conversionNote).toContain("not found");
    });
  });

  describe("getTypicalRange", () => {
    it("returns range for cutting parameters", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const range = engine.getTypicalRange("axial_depth");
      expect(range).toBeDefined();
      expect(range!.min).toBe(0.1);
      expect(range!.max).toBe(50);
      expect(range!.unit).toBe("mm");
    });

    it("returns range for spindle speed", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const range = engine.getTypicalRange("spindle_rpm");
      expect(range).toBeDefined();
      expect(range!.min).toBe(100);
      expect(range!.max).toBe(30000);
      expect(range!.unit).toBe("rpm");
    });

    it("returns null for canonical without range", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const range = engine.getTypicalRange("program_id");
      expect(range).toBeNull();
    });
  });

  describe("getValidValues", () => {
    it("returns valid values for machine_type", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const values = engine.getValidValues("machine_type");
      expect(Array.isArray(values)).toBe(true);
      expect(values).toContain("3_axis_vertical");
      expect(values).toContain("5_axis_trunnion");
      expect(values).toContain("mill_turn");
    });

    it("returns valid values map for cutter_comp", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const values = engine.getValidValues("cutter_comp");
      expect(Array.isArray(values)).toBe(true);
      expect(values).toContain("G40_off");
      expect(values).toContain("G41_left");
    });

    it("returns null for canonical without valid_values", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const values = engine.getValidValues("axial_depth");
      expect(values).toBeNull();
    });
  });

  describe("isApplicableTo", () => {
    it("returns true when no applicable_to restriction", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const applicable = engine.isApplicableTo("axial_depth", "3_axis_vertical");
      expect(applicable).toBe(true);
    });

    it("returns true for applicable machine type", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const applicable = engine.isApplicableTo("a_axis_limits", "5_axis_trunnion");
      expect(applicable).toBe(true);
    });

    it("returns false for non-applicable machine type", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const applicable = engine.isApplicableTo("a_axis_limits", "3_axis_vertical");
      expect(applicable).toBe(false);
    });

    it("handles tailstock_force applicability", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      expect(engine.isApplicableTo("tailstock_force", "lathe")).toBe(true);
      expect(engine.isApplicableTo("tailstock_force", "mill_turn")).toBe(true);
      expect(engine.isApplicableTo("tailstock_force", "3_axis_vertical")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty string field name", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "fusion360", "");
      expect(result.result).toBe(TranslationResult.UNSUPPORTED);
    });

    it("handles whitespace field name", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "fusion360", "   ");
      expect(result.result).toBe(TranslationResult.UNSUPPORTED);
    });

    it("handles special characters in field name", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "fusion360", "max<>step");
      expect(result.result).toBe(TranslationResult.UNSUPPORTED);
    });

    it("same source and target CAM returns EXACT", () => {
      const engine = OntologyGrowthRegistryEngine.getInstance();
      const result = engine.translate("mastercam", "mastercam", "max_stepdown");
      expect(result.result).toBe(TranslationResult.EXACT);
      expect(result.targetField).toBe("max_stepdown");
    });
  });
});
