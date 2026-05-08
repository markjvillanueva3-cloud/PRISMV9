/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH4 — 6 unwired tribal /
 * science / reasoning lathe engines wired into turningDispatcher.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheTribalInjectorEngine } from "../engines/LatheTribalInjectorEngine.js";
import { latheUnifiedScienceEngine } from "../engines/LatheUnifiedScienceEngine.js";
import { latheKinematicsDeepLearningEngine } from "../engines/LatheKinematicsDeepLearningEngine.js";
import { latheNeuralIntelligenceEngine } from "../engines/LatheNeuralIntelligenceEngine.js";
import { latheJMDieKnowledgeEngine } from "../engines/LatheJMDieKnowledgeEngine.js";

const NEW_ACTIONS = [
  "lathe_tribal_stats",
  "lathe_unified_science_version",
  "lathe_unified_science_recommend",
  "lathe_kinematics_get_machine_specs",
  "lathe_neural_intel_stats",
  "lathe_jmdie_extract_operations",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-LATHE-BATCH4 — engines verified directly", () => {
  describe("LatheTribalInjectorEngine.getStats", () => {
    it("returns {targets_supported, audit_entries, registered_hooks} all numeric", () => {
      const s = latheTribalInjectorEngine.getStats();
      expect(typeof s.targets_supported).toBe("number");
      expect(typeof s.audit_entries).toBe("number");
      expect(typeof s.registered_hooks).toBe("number");
      expect(s.targets_supported).toBeGreaterThanOrEqual(1);
    });
  });

  describe("LatheUnifiedScienceEngine.getVersion / recommendParameters", () => {
    it("getVersion returns non-empty string", () => {
      const v = latheUnifiedScienceEngine.getVersion();
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    });

    it("recommendParameters returns positive cutting_speed for steel ISO P", () => {
      const params = latheUnifiedScienceEngine.recommendParameters(
        {
          iso_group: "P",
          hardness_hrc: 25,
          thermal_conductivity_w_mk: 50,
          specific_heat_j_kg_k: 460,
          density_kg_m3: 7850,
          melting_point_c: 1500,
        },
        { tool_life_min: 30 },
      );
      expect(params.cutting_speed_m_min).toBeGreaterThan(0);
      expect(params.feed_mm_rev).toBeGreaterThan(0);
      expect(params.depth_of_cut_mm).toBeGreaterThan(0);
    });

    it("Taylor inverse: longer target tool life → lower cutting speed", () => {
      const baseMaterial = {
        iso_group: "P" as const,
        thermal_conductivity_w_mk: 50,
        specific_heat_j_kg_k: 460,
        density_kg_m3: 7850,
        melting_point_c: 1500,
      };
      const short = latheUnifiedScienceEngine.recommendParameters(baseMaterial, { tool_life_min: 15 });
      const long = latheUnifiedScienceEngine.recommendParameters(baseMaterial, { tool_life_min: 60 });
      expect(long.cutting_speed_m_min).toBeLessThan(short.cutting_speed_m_min);
    });

    it("tight surface finish target lowers feed and DOC", () => {
      const material = {
        iso_group: "P" as const,
        thermal_conductivity_w_mk: 50,
        specific_heat_j_kg_k: 460,
        density_kg_m3: 7850,
        melting_point_c: 1500,
      };
      const rough = latheUnifiedScienceEngine.recommendParameters(material, { tool_life_min: 30 });
      const finish = latheUnifiedScienceEngine.recommendParameters(material, { tool_life_min: 30, max_ra_um: 0.8 });
      expect(finish.feed_mm_rev).toBeLessThan(rough.feed_mm_rev);
      expect(finish.depth_of_cut_mm).toBeLessThan(rough.depth_of_cut_mm);
    });
  });

  describe("LatheKinematicsDeepLearningEngine.getMachineSpecs", () => {
    it("returns null for unknown machine id (not undefined)", () => {
      const s = latheKinematicsDeepLearningEngine.getMachineSpecs("___totally_bogus_machine_xyz___");
      expect(s).toBeNull();
    });
  });

  describe("LatheNeuralIntelligenceEngine.getStatistics", () => {
    it("returns {architecture, knowledge_graph, training, capabilities} with numeric architecture entries", () => {
      const s = latheNeuralIntelligenceEngine.getStatistics();
      expect(typeof s.architecture).toBe("object");
      expect(typeof s.knowledge_graph).toBe("object");
      expect(typeof s.training).toBe("object");
      expect(Array.isArray(s.capabilities)).toBe(true);
      // architecture is Record<string, number> — every entry must be numeric
      for (const v of Object.values(s.architecture)) {
        expect(typeof v).toBe("number");
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(Object.keys(s.architecture).length).toBeGreaterThan(0);
    });

    it("knowledge_graph nodes/edges are non-negative integers", () => {
      const s = latheNeuralIntelligenceEngine.getStatistics();
      expect(Number.isInteger(s.knowledge_graph.nodes)).toBe(true);
      expect(Number.isInteger(s.knowledge_graph.edges)).toBe(true);
      expect(s.knowledge_graph.nodes).toBeGreaterThanOrEqual(0);
      expect(s.knowledge_graph.edges).toBeGreaterThanOrEqual(0);
    });
  });

  describe("LatheJMDieKnowledgeEngine.extractOperationSequences", () => {
    it("returns an array of operation sequences", () => {
      const seqs = latheJMDieKnowledgeEngine.extractOperationSequences();
      expect(Array.isArray(seqs)).toBe(true);
    });
  });
});

describe("U-WIRE-LATHE-BATCH4 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in turningDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "turningDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in TURNING_ACTION_SCHEMAS", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof (TURNING_ACTION_SCHEMAS as Record<string, { safeParse?: unknown }>)[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schema rejects lathe_kinematics_get_machine_specs with empty machine_id", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_kinematics_get_machine_specs"]!.safeParse({
      machine_id: "",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects lathe_unified_science_recommend with invalid iso_group", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_unified_science_recommend"]!.safeParse({
      material: {
        iso_group: "Z",
        thermal_conductivity_w_mk: 50,
        specific_heat_j_kg_k: 460,
        density_kg_m3: 7850,
        melting_point_c: 1500,
      },
      target: { tool_life_min: 30 },
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects lathe_unified_science_recommend with negative density", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const r = (TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>)["lathe_unified_science_recommend"]!.safeParse({
      material: {
        iso_group: "P",
        thermal_conductivity_w_mk: 50,
        specific_heat_j_kg_k: 460,
        density_kg_m3: -7850,
        melting_point_c: 1500,
      },
      target: { tool_life_min: 30 },
    });
    expect(r.success).toBe(false);
  });

  it("schemas accept zero-input actions (tribal_stats, version, neural_intel_stats, jmdie_extract_operations)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const schemas = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(schemas["lathe_tribal_stats"]!.safeParse({}).success).toBe(true);
    expect(schemas["lathe_unified_science_version"]!.safeParse({}).success).toBe(true);
    expect(schemas["lathe_neural_intel_stats"]!.safeParse({}).success).toBe(true);
    expect(schemas["lathe_jmdie_extract_operations"]!.safeParse({}).success).toBe(true);
  });
});
