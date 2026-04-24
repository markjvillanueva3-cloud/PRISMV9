/**
 * FiveAxisToolpathSynthesisEngine tests
 * Covers the static catalog API (getAllStrategies, getStrategiesByFamily,
 * getNovelStrategies, getStrategyById) and the synthesize() orchestrator
 * over the 35-entry strategy catalog.
 */

import { describe, expect, it } from "vitest";
import {
  FiveAxisToolpathSynthesisEngine,
  FIVE_AXIS_STRATEGY_CATALOG,
  type FiveAxisFamily,
  type FiveAxisSynthesisInput,
  type MachineKinematics5Ax,
  type ToolSpec,
  type MaterialProps,
} from "../engines/FiveAxisToolpathSynthesisEngine.js";

const TOTAL_STRATEGIES = 35;
const NOVEL_PRISM_STRATEGIES = 6;

function makeTool(overrides: Partial<ToolSpec> = {}): ToolSpec {
  return {
    type: "ball_nose",
    diameter_mm: 6,
    flute_length_mm: 20,
    overall_length_mm: 60,
    flute_count: 4,
    helix_angle_deg: 35,
    material: "carbide",
    ...overrides,
  };
}

function makeMachine(overrides: Partial<MachineKinematics5Ax> = {}): MachineKinematics5Ax {
  return {
    machine_id: "TEST_5AX",
    kinematic_type: "table_table",
    primary_axis: "A",
    secondary_axis: "C",
    axis_limits: {
      a_min_deg: -120, a_max_deg: 120,
      c_min_deg: -360, c_max_deg: 360,
    },
    max_rotary_speed_deg_sec: 60,
    pivot_to_gauge_mm: 200,
    pivot_to_table_mm: 400,
    rtcp_enabled: true,
    ...overrides,
  };
}

function makeMaterial(overrides: Partial<MaterialProps> = {}): MaterialProps {
  return {
    name: "P20",
    iso_group: "P",
    kc11_mpa: 2200,
    mc: 0.25,
    density_kg_m3: 7850,
    thermal_conductivity_w_mk: 35,
    specific_heat_j_kgk: 460,
    ...overrides,
  };
}

function makeSynthesisInput(overrides: Partial<FiveAxisSynthesisInput> = {}): FiveAxisSynthesisInput {
  return {
    geometry: "freeform_surface",
    material: makeMaterial(),
    tool: makeTool(),
    machine: makeMachine(),
    batch_size: 10,
    operator_skill: 3,
    prefer_novel: false,
    use_ai_reasoning: false,
    ...overrides,
  };
}

describe("FiveAxisToolpathSynthesisEngine catalog accessors", () => {
  it("getAllStrategies returns the canonical 35-entry catalog (full object, not a copy)", () => {
    const all = FiveAxisToolpathSynthesisEngine.getAllStrategies();
    expect(all).toHaveLength(TOTAL_STRATEGIES);
    expect(all).toBe(FIVE_AXIS_STRATEGY_CATALOG);
  });

  it("all strategy ids are unique across the catalog", () => {
    const ids = FIVE_AXIS_STRATEGY_CATALOG.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every strategy has cam_equivalents[].length >= 1", () => {
    for (const s of FIVE_AXIS_STRATEGY_CATALOG) {
      expect(s.cam_equivalents.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("getStrategiesByFamily('swarf_cutting') returns only members of that family", () => {
    const swarf = FiveAxisToolpathSynthesisEngine.getStrategiesByFamily("swarf_cutting");
    expect(swarf.length).toBeGreaterThan(0);
    for (const s of swarf) {
      expect(s.family).toBe("swarf_cutting");
    }
  });

  it("getStrategiesByFamily returns the catalog-filter-equivalent set for any family value", () => {
    const none = FiveAxisToolpathSynthesisEngine.getStrategiesByFamily("tube_machining" as FiveAxisFamily);
    const expected = FIVE_AXIS_STRATEGY_CATALOG.filter(s => s.family === "tube_machining");
    expect(none).toEqual(expected);
  });

  it("getNovelStrategies returns exactly the 6 novel_prism catalog entries with 'prism_' id prefix", () => {
    const novels = FiveAxisToolpathSynthesisEngine.getNovelStrategies();
    expect(novels).toHaveLength(NOVEL_PRISM_STRATEGIES);
    for (const s of novels) {
      expect(s.family).toBe("novel_prism");
      expect(s.id).toMatch(/^prism_/);
    }
  });

  it("getStrategyById returns the matching entry for a known id", () => {
    const entry = FiveAxisToolpathSynthesisEngine.getStrategyById("hm_5x_shape_offset");
    expect(entry?.id).toBe("hm_5x_shape_offset");
    expect(entry?.name).toBe("5X Shape Offset Finishing");
    expect(entry?.category).toBe("finishing");
  });

  it("getStrategyById returns undefined-typed result for an unknown id (deep equality with undefined)", () => {
    const entry = FiveAxisToolpathSynthesisEngine.getStrategyById("definitely_not_a_real_id");
    // Compare against undefined via strict equality with Object.is semantics
    expect(entry === undefined).toBe(true);
    expect(FIVE_AXIS_STRATEGY_CATALOG.find(s => s.id === "definitely_not_a_real_id")).toEqual(entry);
  });

  it("every strategy has ratings within the 1-5 range", () => {
    for (const s of FIVE_AXIS_STRATEGY_CATALOG) {
      expect(s.surface_quality).toBeGreaterThanOrEqual(1);
      expect(s.surface_quality).toBeLessThanOrEqual(5);
      expect(s.productivity).toBeGreaterThanOrEqual(1);
      expect(s.productivity).toBeLessThanOrEqual(5);
      expect(s.complexity).toBeGreaterThanOrEqual(1);
      expect(s.complexity).toBeLessThanOrEqual(5);
    }
  });
});

describe("FiveAxisToolpathSynthesisEngine.synthesize", () => {
  it("returns a recommended_strategy matching the top candidate by score", () => {
    const result = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput());
    expect(result.recommended_strategy.id).toBe(result.all_candidates[0].strategy.id);
    for (let i = 1; i < result.all_candidates.length; i++) {
      expect(result.all_candidates[i - 1].score).toBeGreaterThanOrEqual(result.all_candidates[i].score);
    }
  });

  it("picks a strategy whose geometry list includes the input geometry", () => {
    const result = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput({
      geometry: "freeform_surface",
    }));
    expect(result.recommended_strategy.geometries).toContain("freeform_surface");
  });

  it("picks a strategy whose tool_types include the tool type requested", () => {
    const result = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput({
      tool: makeTool({ type: "ball_nose" }),
    }));
    expect(result.recommended_strategy.tool_types).toContain("ball_nose");
  });

  it("emits ai_reasoning only when use_ai_reasoning=true", () => {
    const without = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput({
      use_ai_reasoning: false,
    }));
    const withAI = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput({
      use_ai_reasoning: true,
    }));
    expect(without.ai_reasoning === undefined).toBe(true);
    // When present, ai_reasoning must be a populated object with reasoning strings.
    expect(typeof withAI.ai_reasoning).toBe("object");
    expect(withAI.ai_reasoning === null).toBe(false);
  });

  it("alternative candidates beyond the top pick carry a non-empty why_not explanation", () => {
    const result = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput());
    if (result.all_candidates.length >= 2) {
      for (const alt of result.all_candidates.slice(1)) {
        expect(typeof alt.why_not).toBe("string");
        expect(alt.why_not!.length).toBeGreaterThan(0);
      }
    }
  });

  it("produces a recommendations array of non-empty strings", () => {
    const result = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput());
    expect(Array.isArray(result.recommendations)).toBe(true);
    for (const r of result.recommendations) {
      expect(typeof r).toBe("string");
      expect(r.length).toBeGreaterThan(0);
    }
  });

  it("favors a novel_prism strategy when prefer_novel=true and a novel candidate applies", () => {
    const result = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput({
      geometry: "impeller_blade",
      tool: makeTool({ type: "flat_end" }),
      prefer_novel: true,
    }));
    expect(result.recommended_strategy.id.length).toBeGreaterThan(0);
    if (result.all_candidates.some(c => c.strategy.family === "novel_prism")) {
      expect(result.recommended_strategy.family).toBe("novel_prism");
    }
  });

  it("attaches a novel_algorithm payload when the chosen strategy is novel_prism and prefer_novel=true", () => {
    const result = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput({
      geometry: "impeller_blade",
      tool: makeTool({ type: "flat_end" }),
      prefer_novel: true,
    }));
    if (result.recommended_strategy.family === "novel_prism") {
      expect(result.novel_algorithm?.algorithm_id).toBe(result.recommended_strategy.id);
      expect(result.novel_algorithm?.toolpath_points.length).toBeGreaterThan(0);
    } else {
      // If no novel_prism strategy applied, no novel_algorithm should be attached.
      expect(result.novel_algorithm === undefined).toBe(true);
    }
  });

  it("singularity_analysis and rtcp_compensation are always populated objects in the result", () => {
    const result = FiveAxisToolpathSynthesisEngine.synthesize(makeSynthesisInput());
    expect(typeof result.singularity_analysis).toBe("object");
    expect(typeof result.rtcp_compensation).toBe("object");
    // At least one property on each payload should exist (they are non-empty engine outputs)
    expect(Object.keys(result.singularity_analysis as object).length).toBeGreaterThan(0);
    expect(Object.keys(result.rtcp_compensation as object).length).toBeGreaterThan(0);
  });
});
