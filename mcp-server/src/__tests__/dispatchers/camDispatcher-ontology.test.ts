/**
 * camDispatcher-ontology.test.ts — Dispatcher wiring tests for ontology actions
 *
 * @unit CAM-UIX-MS0/U-ONTOLOGY-SEED01
 */
import { describe, it, expect } from "vitest";
import { ontologyGrowthRegistryEngine } from "../../engines/OntologyGrowthRegistryEngine.js";
import { ACTION_ONTOLOGY_SCHEMAS } from "../../schemas/ontologyActionSchemas.js";

// Define expected actions for wiring verification
const ONTOLOGY_ACTIONS = [
  "ontology_translate", "ontology_translate_strategy", "ontology_get_canonical",
  "ontology_get_aliases", "ontology_list_canonicals", "ontology_list_cams",
  "ontology_stats", "ontology_get_range", "ontology_get_valid_values", "ontology_check_applicable",
] as const;

describe("camDispatcher ontology action wiring", () => {
  describe("schema verification", () => {
    it("all ontology actions have schemas in ACTION_ONTOLOGY_SCHEMAS", () => {
      const schemaKeys = Object.keys(ACTION_ONTOLOGY_SCHEMAS);
      for (const action of ONTOLOGY_ACTIONS) {
        expect(schemaKeys).toContain(action);
      }
    });

    it("ontology_translate schema validates correct input", () => {
      const schema = ACTION_ONTOLOGY_SCHEMAS.ontology_translate;
      const result = schema.safeParse({
        sourceCAM: "mastercam",
        targetCAM: "fusion360",
        fieldName: "max_stepdown",
      });
      expect(result.success).toBe(true);
    });

    it("ontology_translate schema rejects missing fields", () => {
      const schema = ACTION_ONTOLOGY_SCHEMAS.ontology_translate;
      const result = schema.safeParse({ sourceCAM: "mastercam" });
      expect(result.success).toBe(false);
    });

    it("10 ontology actions are defined", () => {
      expect(ONTOLOGY_ACTIONS.length).toBe(10);
      expect(Object.keys(ACTION_ONTOLOGY_SCHEMAS).length).toBe(10);
    });
  });

  describe("engine method existence", () => {
    it("translate method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.translate).toBe("function");
    });

    it("translateStrategy method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.translateStrategy).toBe("function");
    });

    it("getCanonical method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.getCanonical).toBe("function");
    });

    it("getAliasesForCanonical method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.getAliasesForCanonical).toBe("function");
    });

    it("getAllCanonicals method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.getAllCanonicals).toBe("function");
    });

    it("getSupportedCAMs method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.getSupportedCAMs).toBe("function");
    });

    it("getOntologyStats method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.getOntologyStats).toBe("function");
    });

    it("getTypicalRange method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.getTypicalRange).toBe("function");
    });

    it("getValidValues method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.getValidValues).toBe("function");
    });

    it("isApplicableTo method exists", () => {
      expect(typeof ontologyGrowthRegistryEngine.isApplicableTo).toBe("function");
    });
  });

  describe("round-trip dispatcher-style calls", () => {
    it("translate returns proper result structure", () => {
      const result = ontologyGrowthRegistryEngine.translate(
        "mastercam",
        "fusion360",
        "max_stepdown"
      );
      expect(result).toHaveProperty("sourceField");
      expect(result).toHaveProperty("targetField");
      expect(result).toHaveProperty("canonical");
      expect(result).toHaveProperty("result");
      expect(result.canonical).toBe("axial_depth");
    });

    it("translateStrategy returns proper result structure", () => {
      const result = ontologyGrowthRegistryEngine.translateStrategy(
        "mastercam",
        "fusion360",
        "Dynamic Mill"
      );
      expect(result).toHaveProperty("sourceField");
      expect(result).toHaveProperty("targetField");
      expect(result).toHaveProperty("canonical");
      expect(result).toHaveProperty("result");
    });

    it("getOntologyStats returns proper structure", () => {
      const result = ontologyGrowthRegistryEngine.getOntologyStats();
      expect(result).toHaveProperty("domains");
      expect(result).toHaveProperty("totalCategories");
      expect(result).toHaveProperty("totalAliases");
      expect(result).toHaveProperty("camsIndexed");
      expect(result.domains).toBe(4);
    });

    it("getAllCanonicals returns array of strings", () => {
      const result = ontologyGrowthRegistryEngine.getAllCanonicals();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(30);
      expect(typeof result[0]).toBe("string");
    });

    it("getSupportedCAMs returns array of CAM names", () => {
      const result = ontologyGrowthRegistryEngine.getSupportedCAMs();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain("mastercam");
      expect(result).toContain("fusion360");
      expect(result).toContain("hypermill");
    });
  });

  describe("cross-CAM variability coverage", () => {
    it("translates across 3+ CAM systems - mastercam", () => {
      const result = ontologyGrowthRegistryEngine.translate("mastercam", "hypermill", "stepover");
      expect(result.result).toBe("exact");
      expect(result.canonical).toBe("radial_width");
    });

    it("translates across 3+ CAM systems - fusion360", () => {
      const result = ontologyGrowthRegistryEngine.translate("fusion360", "nx_cam", "maximumStepdown");
      expect(result.result).toBe("exact");
      expect(result.canonical).toBe("axial_depth");
    });

    it("translates across 3+ CAM systems - hypermill", () => {
      const result = ontologyGrowthRegistryEngine.translate("hypermill", "solidcam", "fz");
      expect(result.result).toBe("exact");
      expect(result.canonical).toBe("feed_per_tooth");
    });

    it("translates controller dialects - fanuc to siemens", () => {
      const result = ontologyGrowthRegistryEngine.translate("fanuc", "siemens", "G41");
      expect(result.result).toBe("exact");
      expect(result.canonical).toBe("cutter_comp");
    });

    it("translates controller dialects - fanuc to heidenhain", () => {
      const result = ontologyGrowthRegistryEngine.translate("fanuc", "heidenhain", "T");
      expect(result.result).toBe("exact");
      expect(result.canonical).toBe("tool_number");
    });
  });

  describe("failure modes", () => {
    it("returns UNSUPPORTED for unknown CAM", () => {
      const result = ontologyGrowthRegistryEngine.translate("unknown_cam", "fusion360", "stepover");
      expect(result.result).toBe("unsupported");
      expect(result.conversionNote).toContain("Source CAM");
    });

    it("returns UNSUPPORTED for unknown field", () => {
      const result = ontologyGrowthRegistryEngine.translate("mastercam", "fusion360", "not_a_field");
      expect(result.result).toBe("unsupported");
      expect(result.conversionNote).toContain("not found");
    });

    it("returns null for unknown canonical in getTypicalRange", () => {
      const result = ontologyGrowthRegistryEngine.getTypicalRange("not_a_canonical");
      expect(result).toBeNull();
    });

    it("returns null for unknown canonical in getValidValues", () => {
      const result = ontologyGrowthRegistryEngine.getValidValues("not_a_canonical");
      expect(result).toBeNull();
    });
  });

  describe("adversarial inputs", () => {
    it("handles empty string CAM name", () => {
      const result = ontologyGrowthRegistryEngine.translate("", "fusion360", "stepover");
      expect(result.result).toBe("unsupported");
    });

    it("handles empty string field name", () => {
      const result = ontologyGrowthRegistryEngine.translate("mastercam", "fusion360", "");
      expect(result.result).toBe("unsupported");
    });

    it("handles special characters in field name", () => {
      const result = ontologyGrowthRegistryEngine.translate("mastercam", "fusion360", "<script>");
      expect(result.result).toBe("unsupported");
    });

    it("handles very long field name", () => {
      const longName = "a".repeat(1000);
      const result = ontologyGrowthRegistryEngine.translate("mastercam", "fusion360", longName);
      expect(result.result).toBe("unsupported");
    });
  });
});
