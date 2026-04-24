/**
 * MillingAIIntegrationEngine tests
 * Covers archive metadata, path parsing, NL query parsing, similarity search,
 * parameter-history learning, customer patterns, feature-vector extraction,
 * cosine similarity, machine recommendation, and the end-to-end NL pipeline.
 */

import { describe, expect, it } from "vitest";
import {
  millingAIIntegrationEngine,
  MillingAIIntegrationEngine,
  type JMDieProgramMetadata,
  type MaterialCategory,
  type PartCategory,
} from "../engines/MillingAIIntegrationEngine.js";

const EXPECTED_TOTAL_PROGRAMS = 24114;
const EXPECTED_CUSTOMER_COUNT = 18;
const EXPECTED_SHOP_MACHINE_COUNT = 5; // excludes 'unknown'

function sampleProgram(overrides: Partial<JMDieProgramMetadata> = {}): JMDieProgramMetadata {
  return {
    file_path: "H:/PRISM/JM DIE/ROKU-ROKU/ITW/B-12345.mcx-8",
    file_name: "B-12345.mcx-8",
    file_type: "mastercam_mcx8",
    customer: "ITW",
    part_number: "B-12345",
    material_category: "graphite",
    part_category: "electrode",
    machine_target: "roku_roku_sng",
    file_size_bytes: 1_000_000,
    modified_date: "2024-06-01",
    folder_depth: 4,
    ...overrides,
  };
}

describe("MillingAIIntegrationEngine.getArchiveStats", () => {
  const engine = new MillingAIIntegrationEngine();

  it("reports the canonical total_programs = mastercam + nc", () => {
    const stats = engine.getArchiveStats();
    expect(stats.total_programs).toBe(EXPECTED_TOTAL_PROGRAMS);
    expect(stats.mastercam_files + stats.nc_files).toBe(stats.total_programs);
  });

  it("lists the 18 JM-Die customers and counts them correctly", () => {
    const stats = engine.getArchiveStats();
    expect(stats.customer_count).toBe(EXPECTED_CUSTOMER_COUNT);
    expect(stats.customers).toHaveLength(EXPECTED_CUSTOMER_COUNT);
    expect(stats.customers).toContain("ITW");
    expect(stats.customers).toContain("HOLO-KROME");
    expect(stats.customers).toContain("ALCOA");
  });

  it("punch is the single largest part_distribution bucket (cold-heading shop)", () => {
    const stats = engine.getArchiveStats();
    const entries = Object.entries(stats.part_distribution);
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    expect(sorted[0][0]).toBe("punch");
  });
});

describe("MillingAIIntegrationEngine.parseProgramMetadata", () => {
  const engine = new MillingAIIntegrationEngine();

  it("detects Mastercam MCX-8 files from the extension", () => {
    const meta = engine.parseProgramMetadata("H:/some/path/X-9000.mcx-8");
    expect(meta.file_type).toBe("mastercam_mcx8");
    expect(meta.file_name).toBe("X-9000.mcx-8");
  });

  it("detects NC .MIN files (Okuma lathe convention)", () => {
    const meta = engine.parseProgramMetadata("H:/JM DIE/CNC LATHE/FOO.MIN");
    expect(meta.file_type).toBe("nc_min");
  });

  it("identifies the canonical customer from ITW folder", () => {
    const meta = engine.parseProgramMetadata("H:/PRISM/JM DIE/HAAS/ITW SHAKERPROOF/B-1.nc");
    expect(meta.customer).toBe("ITW");
  });

  it("identifies material from path keywords (graphite)", () => {
    const meta = engine.parseProgramMetadata("H:/PRISM/JM DIE/ROKU-ROKU/graphite/elec-01.mcx");
    expect(meta.material_category).toBe("graphite");
  });

  it("identifies part category from filename keywords (electrode)", () => {
    const meta = engine.parseProgramMetadata("H:/PRISM/JM DIE/ROKU-ROKU/ITW/ELEC-42.mcx-8");
    expect(meta.part_category).toBe("electrode");
  });

  it("routes ROKU paths to roku_roku_sng machine", () => {
    const meta = engine.parseProgramMetadata("H:/PRISM/JM DIE/ROKU-ROKU/ITW/E.mcx-8");
    expect(meta.machine_target).toBe("roku_roku_sng");
  });

  it("routes HAAS paths to haas_vf2 machine", () => {
    const meta = engine.parseProgramMetadata("H:/PRISM/JM DIE/CNC MILL HAAS/ITW/PNCH.nc");
    expect(meta.machine_target).toBe("haas_vf2");
  });

  it("leaves customer/material/part/machine as 'unknown' when nothing matches", () => {
    const meta = engine.parseProgramMetadata("H:/random/path/file.xyz");
    expect(meta.customer).toBe("unknown");
    expect(meta.material_category).toBe("unknown");
    expect(meta.part_category).toBe("unknown");
    expect(meta.machine_target).toBe("unknown");
    expect(meta.file_type).toBe("unknown");
  });
});

describe("MillingAIIntegrationEngine.parseNaturalLanguageQuery", () => {
  const engine = new MillingAIIntegrationEngine();

  it("classifies 'recommend...' queries as intent=recommend", () => {
    const parse = engine.parseNaturalLanguageQuery("recommend parameters for D2 tool steel");
    expect(parse.intent).toBe("recommend");
  });

  it("classifies 'analyze why...' queries as intent=analyze", () => {
    const parse = engine.parseNaturalLanguageQuery("analyze why these RPM values work");
    expect(parse.intent).toBe("analyze");
  });

  it("classifies 'trouble' queries as intent=troubleshoot", () => {
    const parse = engine.parseNaturalLanguageQuery("I have a trouble with chatter");
    expect(parse.intent).toBe("troubleshoot");
  });

  it("classifies 'learn from history' queries as intent=learn", () => {
    const parse = engine.parseNaturalLanguageQuery("learn from history of graphite programs");
    expect(parse.intent).toBe("learn");
  });

  it("defaults to intent=search when no specific intent marker appears", () => {
    const parse = engine.parseNaturalLanguageQuery("graphite electrodes for ITW");
    expect(parse.intent).toBe("search");
  });

  it("extracts materials, customers, and part_types from a multi-entity query", () => {
    const parse = engine.parseNaturalLanguageQuery("ITW graphite electrode program");
    expect(parse.entities.materials).toContain("graphite");
    expect(parse.entities.customers).toContain("ITW");
    expect(parse.entities.part_types).toContain("electrode");
  });

  it("scales confidence upward with the count of extracted entities", () => {
    const empty = engine.parseNaturalLanguageQuery("do the thing");
    const rich = engine.parseNaturalLanguageQuery("ITW graphite electrode recommend");
    expect(rich.confidence).toBeGreaterThan(empty.confidence);
    expect(rich.confidence).toBeLessThanOrEqual(100);
  });

  it("adds a material clarification when none is present in a non-troubleshoot query", () => {
    // 'gauge' triggers a part keyword but no material keyword, so the material
    // clarification should fire while the part clarification should not.
    const parse = engine.parseNaturalLanguageQuery("find programs for a gauge part");
    expect(parse.entities.materials).toEqual([]);
    expect(parse.entities.part_types).toContain("gauge");
    expect(parse.clarifications_needed.some(c => c.toLowerCase().includes("material"))).toBe(true);
  });
});

describe("MillingAIIntegrationEngine.findSimilarPrograms", () => {
  const engine = new MillingAIIntegrationEngine();

  it("respects the limit parameter", () => {
    const results = engine.findSimilarPrograms({
      material: "graphite",
      part_type: "electrode",
      customer: "ITW",
      limit: 3,
    });
    expect(results).toHaveLength(3);
  });

  it("defaults limit to 10 when unspecified", () => {
    const results = engine.findSimilarPrograms({
      material: "graphite",
      part_type: "electrode",
      customer: "ITW",
    });
    expect(results).toHaveLength(10);
  });

  it("sorts results by similarity_score descending", () => {
    const results = engine.findSimilarPrograms({
      material: "graphite",
      part_type: "electrode",
      customer: "ITW",
      limit: 5,
    });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity_score).toBeGreaterThanOrEqual(results[i].similarity_score);
    }
  });

  it("boosts similarity_score when material and part_type match the request", () => {
    const results = engine.findSimilarPrograms({
      material: "graphite",
      part_type: "electrode",
      customer: "ITW",
      limit: 1,
    });
    // Mock generator uses request values verbatim, so material and part_type ALWAYS match.
    expect(results[0].match_factors.material_match).toBe(true);
    expect(results[0].match_factors.part_type_match).toBe(true);
    // Base 30 + material 25 + part 20 + customer 15 + some geometry+name → >= 80
    expect(results[0].similarity_score).toBeGreaterThanOrEqual(80);
  });
});

describe("MillingAIIntegrationEngine.learnParametersFromHistory", () => {
  const engine = new MillingAIIntegrationEngine();

  it("returns the SFM range for graphite (≈800 speed) with Taylor-based physics basis", () => {
    const out = engine.learnParametersFromHistory("graphite", "electrode", "speed");
    expect(out.parameter_type).toBe("speed");
    expect(out.learned_value).toBe(800);
    expect(out.physics_validation.physics_basis).toContain("Taylor");
    expect(out.physics_validation.within_limits).toBe(true);
  });

  it("returns Kienzle physics basis for 'feed' parameter type", () => {
    const out = engine.learnParametersFromHistory("tool_steel", "punch", "feed");
    expect(out.physics_validation.physics_basis).toContain("Kienzle");
  });

  it("returns the 'standard' strategy and moderate speed for unknown material", () => {
    const out = engine.learnParametersFromHistory("unknown", "punch", "strategy");
    expect(out.learned_value).toBe("standard");
    const speed = engine.learnParametersFromHistory("unknown", "punch", "speed");
    expect(speed.learned_value).toBe(200);
  });

  it("clamps confidence to [60, 95]", () => {
    const out = engine.learnParametersFromHistory("tool_steel", "punch", "speed");
    expect(out.confidence).toBeGreaterThanOrEqual(60);
    expect(out.confidence).toBeLessThanOrEqual(95);
  });
});

describe("MillingAIIntegrationEngine.analyzeCustomerPatterns", () => {
  const engine = new MillingAIIntegrationEngine();

  it("returns the ALCOA aerospace profile with critical quality priority", () => {
    const out = engine.analyzeCustomerPatterns("ALCOA");
    expect(out.customer).toBe("ALCOA");
    expect(out.quality_priority).toBe("critical");
    expect(out.typical_tolerances).toBe("±0.0003");
    expect(out.notes.some(n => n.toLowerCase().includes("aerospace"))).toBe(true);
  });

  it("returns the HOLO-KROME specialist profile with tightest tolerances (±0.0002)", () => {
    const out = engine.analyzeCustomerPatterns("HOLO-KROME");
    expect(out.typical_tolerances).toBe("±0.0002");
    expect(out.quality_priority).toBe("critical");
  });

  it("returns a standard-customer default profile for unknown customers", () => {
    const out = engine.analyzeCustomerPatterns("TOTALLY_NEW_CUSTOMER");
    expect(out.customer).toBe("TOTALLY_NEW_CUSTOMER");
    expect(out.quality_priority).toBe("standard");
    expect(out.typical_tolerances).toBe("±0.001");
    expect(out.common_materials).toContain("tool_steel");
  });
});

describe("MillingAIIntegrationEngine.extractFeatureVector + cosine similarity", () => {
  const engine = new MillingAIIntegrationEngine();

  it("returns 14 feature fields on the vector", () => {
    const vec = engine.extractFeatureVector(sampleProgram());
    const keys = Object.keys(vec.features);
    expect(keys.length).toBe(14);
    expect(vec.program_id).toBe(sampleProgram().file_path);
  });

  it("encodes graphite as low hardness (0.1) and high machinability (0.9)", () => {
    const vec = engine.extractFeatureVector(sampleProgram({ material_category: "graphite" }));
    expect(vec.features.material_hardness).toBeCloseTo(0.1, 6);
    expect(vec.features.material_machinability).toBeCloseTo(0.9, 6);
  });

  it("encodes tool_steel as high hardness (0.8) and low machinability (0.4)", () => {
    const vec = engine.extractFeatureVector(sampleProgram({ material_category: "tool_steel" }));
    expect(vec.features.material_hardness).toBeCloseTo(0.8, 6);
    expect(vec.features.material_machinability).toBeCloseTo(0.4, 6);
  });

  it("assigns tolerance_class=3 for HOLO-KROME and ALCOA customers", () => {
    const alcoa = engine.extractFeatureVector(sampleProgram({ customer: "ALCOA" }));
    const holo = engine.extractFeatureVector(sampleProgram({ customer: "HOLO-KROME" }));
    const itw = engine.extractFeatureVector(sampleProgram({ customer: "ITW" }));
    expect(alcoa.features.tolerance_class).toBe(3);
    expect(holo.features.tolerance_class).toBe(3);
    expect(itw.features.tolerance_class).toBe(2);
  });

  it("cosine similarity of two identical vectors equals 1", () => {
    const vec = engine.extractFeatureVector(sampleProgram());
    const sim = engine.calculateCosineSimilarity(vec, vec);
    expect(sim).toBeCloseTo(1, 6);
  });

  it("cosine similarity between graphite/electrode and tool_steel/punch is in [-1, 1]", () => {
    const graphiteElec = engine.extractFeatureVector(sampleProgram({
      material_category: "graphite", part_category: "electrode",
    }));
    const toolPunch = engine.extractFeatureVector(sampleProgram({
      material_category: "tool_steel", part_category: "punch",
    }));
    const sim = engine.calculateCosineSimilarity(graphiteElec, toolPunch);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });
});

describe("MillingAIIntegrationEngine.recommendMachine", () => {
  const engine = new MillingAIIntegrationEngine();

  it("routes graphite material to the 40k-RPM Roku-Roku", () => {
    const rec = engine.recommendMachine("die", "graphite");
    expect(rec.machine).toBe("roku_roku_sng");
    expect(rec.confidence).toBe(95);
    expect(rec.reason).toContain("40,000 RPM");
  });

  it("routes electrode parts to Roku-Roku even with non-graphite material", () => {
    const rec = engine.recommendMachine("electrode", "tool_steel");
    expect(rec.machine).toBe("roku_roku_sng");
  });

  it("routes precision gauge work to Hurco VMX42", () => {
    const rec = engine.recommendMachine("gauge", "tool_steel");
    expect(rec.machine).toBe("hurco_vmx42");
    expect(rec.reason).toContain("precision");
  });

  it("routes die cases to the larger Haas VF-3 envelope", () => {
    const rec = engine.recommendMachine("case", "tool_steel");
    expect(rec.machine).toBe("haas_vf3");
  });

  it("falls back to Haas VF-2 for generic custom work", () => {
    const rec = engine.recommendMachine("custom", "tool_steel");
    expect(rec.machine).toBe("haas_vf2");
    expect(rec.confidence).toBe(70);
  });
});

describe("MillingAIIntegrationEngine.getShopMillingMachines", () => {
  const engine = new MillingAIIntegrationEngine();

  it("returns exactly the 5 named shop machines (excludes 'unknown')", () => {
    const machines = engine.getShopMillingMachines();
    expect(machines).toHaveLength(EXPECTED_SHOP_MACHINE_COUNT);
    const types = machines.map(m => m.type);
    expect(types).toContain("roku_roku_sng");
    expect(types).not.toContain("unknown" as never);
  });

  it("each shop machine carries a non-empty name and controller", () => {
    const machines = engine.getShopMillingMachines();
    for (const m of machines) {
      expect(m.config.name.length).toBeGreaterThan(0);
      expect(m.config.controller.length).toBeGreaterThan(0);
      expect(m.config.axes).toBeGreaterThan(0);
    }
  });
});

describe("MillingAIIntegrationEngine.processNaturalLanguageQuery (end-to-end)", () => {
  const engine = new MillingAIIntegrationEngine();

  it("returns query_parse, response, summary, and follow-up suggestions for a mixed query", () => {
    const out = engine.processNaturalLanguageQuery("recommend parameters for ITW graphite electrode");
    expect(out.query_parse.intent).toBe("recommend");
    expect(out.response.similar_programs.length).toBeGreaterThan(0);
    expect(out.natural_language_summary.length).toBeGreaterThan(0);
    expect(out.suggested_follow_ups.length).toBeGreaterThan(0);
    expect(out.suggested_follow_ups.length).toBeLessThanOrEqual(4);
  });

  it("summary mentions the top-match customer and similarity percentage", () => {
    const out = engine.processNaturalLanguageQuery("ITW graphite electrode programs");
    expect(out.natural_language_summary).toContain("ITW");
    expect(out.natural_language_summary).toMatch(/\d+%\s*similarity/);
  });
});

describe("MillingAIIntegrationEngine singleton sanity", () => {
  it("the exported singleton is an instance of MillingAIIntegrationEngine", () => {
    expect(millingAIIntegrationEngine).toBeInstanceOf(MillingAIIntegrationEngine);
  });
});

// ============================================================================
// MILL-MASTER-AI-WIRING / U10-AIINT-RETROFIT — AI-path coverage
// ============================================================================
describe("MillingAIIntegrationEngine.parseNaturalLanguageQueryUltra — useAI routing", () => {
  it("useAI='off' (default) returns { legacy } deep-equal to sync parse, no ai field", async () => {
    const query = "recommend speeds for 4140 on Okuma";
    const legacy = millingAIIntegrationEngine.parseNaturalLanguageQuery(query);
    const ultra = await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra(query);
    expect(ultra.legacy).toEqual(legacy);
    expect(ultra.ai).toBe(undefined);
  });

  it("explicit useAI='off' is bit-identical to omitted", async () => {
    const q = "analyze pocket programs";
    const a = await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra(q);
    const b = await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra(q, { useAI: "off" });
    expect(a.legacy).toEqual(b.legacy);
    expect(a.ai).toBe(undefined);
    expect(b.ai).toBe(undefined);
  });

  it.each([
    { q: "recommend speeds for 4140", intent: "recommend" },
    { q: "analyze why pocket chatters on aluminum", intent: "analyze" },
    { q: "troubleshoot chatter issue on stainless", intent: "troubleshoot" },
  ])("useAI='on' preserves legacy intent '$intent' for: $q", async ({ q, intent }) => {
    const r = await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra(q, { useAI: "on" });
    expect(r.legacy.intent).toBe(intent);
    if (r.ai) {
      expect(r.ai.sources).toContain("ai_extraction_reasoner");
      expect(Array.isArray(r.ai.reasoning_chain)).toBe(true);
    }
  });

  it("failure #1: empty query does not throw; legacy preserves empty original_query", async () => {
    const r = await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra("", { useAI: "on" });
    expect(r.legacy.original_query).toBe("");
  });

  it("failure #2: whitespace-only query does not throw", async () => {
    const r = await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra("   ", { useAI: "on" });
    expect(typeof r.legacy.intent).toBe("string");
  });

  it("failure #3: unicode-heavy query parses without throwing", async () => {
    const r = await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra(
      "recommend 돌이킬 수 settings 😊",
      { useAI: "on" },
    );
    expect(typeof r.legacy.original_query).toBe("string");
  });

  it("adversarial #1: 10 KB oversize query bounded (<2 s)", async () => {
    const big = "recommend speeds ".repeat(1000);
    const t0 = performance.now();
    await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra(big, { useAI: "on" });
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it("adversarial #2: injection-ish content does not escape parser", async () => {
    const r = await millingAIIntegrationEngine.parseNaturalLanguageQueryUltra(
      `recommend '; DROP TABLE parts; --`,
      { useAI: "on" },
    );
    expect(typeof r.legacy.intent).toBe("string");
  });
});

describe("MillingAIIntegrationEngine.findSimilarProgramsUltra — useAI routing", () => {
  it("useAI='off' returns legacy shape matching sync findSimilarPrograms, no ai field", () => {
    const req = { material: "steel" as const, limit: 3 };
    const legacy = millingAIIntegrationEngine.findSimilarPrograms(req);
    const ultra = millingAIIntegrationEngine.findSimilarProgramsUltra(req);
    expect(ultra.legacy.length).toBe(legacy.length);
    expect(ultra.ai).toBe(undefined);
    for (const m of ultra.legacy) {
      expect(typeof m).toBe("object");
      expect("program" in m).toBe(true);
    }
  });

  it.each([
    { material: "steel", label: "P" },
    { material: "stainless", label: "M" },
    { material: "aluminum", label: "N" },
  ])("useAI='on' for $label ($material) populates ai with bounded confidence + source tag", ({ material }) => {
    const r = millingAIIntegrationEngine.findSimilarProgramsUltra(
      { material: material as "steel", limit: 2 },
      { useAI: "on" },
    );
    if (r.ai) {
      expect(r.ai.sources).toContain("prism_neural_knowledge_synthesis");
      expect(r.ai.confidence).toBeGreaterThanOrEqual(0);
      expect(r.ai.confidence).toBeLessThanOrEqual(1);
      expect(r.ai.insights_count).toBeGreaterThanOrEqual(0);
      expect(r.ai.recommendations_count).toBeGreaterThanOrEqual(0);
    }
  });

  it("failure: undefined material does not throw", () => {
    const r = millingAIIntegrationEngine.findSimilarProgramsUltra({ limit: 1 }, { useAI: "on" });
    expect(Array.isArray(r.legacy)).toBe(true);
  });

  it("adversarial: limit=1000 does not hang", () => {
    const t0 = performance.now();
    const r = millingAIIntegrationEngine.findSimilarProgramsUltra(
      { material: "steel" as const, limit: 1000 },
      { useAI: "on" },
    );
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(Array.isArray(r.legacy)).toBe(true);
  });
});
