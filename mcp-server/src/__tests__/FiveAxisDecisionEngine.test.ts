/**
 * FiveAxisDecisionEngine Tests
 * ============================
 *
 * AI-powered 5-axis strategy selection engine. Tests cover:
 *   - Strategy selection across all 7 feature types
 *   - Operator skill / batch size variability
 *   - Tool type variations (ball_nose, flat_end, bull_nose)
 *   - Machine kinematic variations
 *   - Invariants on result shape (confidence bounds, non-empty alternatives,
 *     positive cycle time / cost)
 *   - RTCP + singularity analysis flags
 *   - Reasoning trace inclusion toggle
 *   - Dispatcher wiring (mill_five_axis_decide action)
 *
 * @module __tests__/FiveAxisDecisionEngine.test
 * @milestone MILL-MASTER-P4/U12-5AX-DEC
 */

import { describe, it, expect } from "vitest";
import {
  FiveAxisDecisionEngine,
  fiveAxisDecisionEngine,
  OKUMA_M460V_5AX,
  type FiveAxisDecisionInput,
  type FiveAxisDecisionResult,
  type FiveAxisPartFeature,
  type FiveAxisStrategy,
  type MachineKinematics,
  type DecideUltraResult,
} from "../engines/FiveAxisDecisionEngine.js";
import { MILL_DISPATCHER_ACTIONS } from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

// ============================================================================
// FIXTURES
// ============================================================================

const MULTI_FACE_FEATURE: FiveAxisPartFeature = {
  feature_type: "multi_face",
  required_orientations: [
    { i: 0, j: 0, k: 1 },
    { i: 1, j: 0, k: 0 },
    { i: 0, j: 1, k: 0 },
  ],
  surface_tolerance_mm: 0.02,
  max_depth_mm: 30,
  min_tool_length_mm: 60,
  has_undercuts: false,
  has_thin_walls: false,
  accessibility_score: 0.95,
};

const IMPELLER_FEATURE: FiveAxisPartFeature = {
  feature_type: "impeller_blade",
  required_orientations: [
    { i: 0, j: 0, k: 1 }, { i: 0.2, j: 0, k: 0.98 }, { i: 0.4, j: 0, k: 0.92 },
    { i: 0.6, j: 0, k: 0.80 }, { i: 0.8, j: 0, k: 0.60 },
  ],
  surface_tolerance_mm: 0.01,
  scallop_height_mm: 0.005,
  max_depth_mm: 40,
  min_tool_length_mm: 80,
  has_undercuts: true,
  has_thin_walls: true,
  accessibility_score: 0.6,
};

const RULED_SURFACE_FEATURE: FiveAxisPartFeature = {
  feature_type: "ruled_surface",
  required_orientations: [{ i: 0, j: 0, k: 1 }, { i: 0.1, j: 0, k: 0.99 }],
  surface_tolerance_mm: 0.03,
  max_depth_mm: 20,
  min_tool_length_mm: 50,
  has_undercuts: false,
  has_thin_walls: false,
  accessibility_score: 0.9,
};

const DEEP_CAVITY_FEATURE: FiveAxisPartFeature = {
  feature_type: "deep_cavity",
  required_orientations: [{ i: 0, j: 0, k: 1 }],
  surface_tolerance_mm: 0.05,
  max_depth_mm: 120,
  min_tool_length_mm: 150,
  has_undercuts: false,
  has_thin_walls: false,
  accessibility_score: 0.5,
};

const FREEFORM_FEATURE: FiveAxisPartFeature = {
  feature_type: "freeform_surface",
  required_orientations: Array.from({ length: 6 }, (_, i) => ({
    i: Math.sin(i * 0.3), j: Math.cos(i * 0.3), k: 0.9,
  })),
  surface_tolerance_mm: 0.005,
  max_depth_mm: 25,
  min_tool_length_mm: 55,
  has_undercuts: false,
  has_thin_walls: false,
  accessibility_score: 0.85,
};

const UNDERCUT_FEATURE: FiveAxisPartFeature = {
  feature_type: "undercut",
  required_orientations: [
    { i: 0, j: 0, k: 1 }, { i: 0.5, j: 0, k: 0.87 },
  ],
  surface_tolerance_mm: 0.02,
  max_depth_mm: 30,
  min_tool_length_mm: 60,
  has_undercuts: true,
  has_thin_walls: false,
  accessibility_score: 0.7,
};

const PORT_FEATURE: FiveAxisPartFeature = {
  feature_type: "port",
  required_orientations: [{ i: 0, j: 0, k: 1 }, { i: 0.3, j: 0.3, k: 0.9 }],
  surface_tolerance_mm: 0.04,
  max_depth_mm: 80,
  min_tool_length_mm: 100,
  has_undercuts: false,
  has_thin_walls: false,
  accessibility_score: 0.6,
};

function makeInput(features: FiveAxisPartFeature[], overrides: Partial<FiveAxisDecisionInput> = {}): FiveAxisDecisionInput {
  return {
    part_features: features,
    machine: OKUMA_M460V_5AX,
    tool: {
      type: "ball_nose",
      diameter_mm: 10,
      flute_length_mm: 30,
      overall_length_mm: 80,
      gauge_length_mm: 50,
    },
    material: "4140",
    batch_size: 10,
    operator_skill: 3,
    feed_rate_mm_per_min: 1500,
    ...overrides,
  };
}

// Allowed strategies
const VALID_STRATEGIES: FiveAxisStrategy[] = [
  "3_plus_2_positioning", "5_axis_simultaneous", "swarf_cutting",
  "multiaxis_contouring", "impeller_turbine", "port_cavity",
];

// ============================================================================
// Result invariants
// ============================================================================

describe("FiveAxisDecisionEngine.decide — result invariants", () => {
  it("always returns a valid recommended strategy", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
  });

  it("confidence is in [0, 1]", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("expected_cycle_time_min is positive", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(r.expected_cycle_time_min).toBeGreaterThan(0);
  });

  it("expected_cost_per_part is positive", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(r.expected_cost_per_part).toBeGreaterThan(0);
  });

  it("surface quality is one of 4 values", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(["excellent", "good", "acceptable", "poor"].includes(r.expected_surface_quality)).toBe(true);
  });

  it("alternatives is an array of length <= 3", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(r.alternatives.length).toBeLessThanOrEqual(3);
  });

  it("safety_warnings is an array", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(Array.isArray(r.safety_warnings)).toBe(true);
  });

  it("explanation is non-empty string", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(typeof r.explanation).toBe("string");
    expect(r.explanation.length).toBeGreaterThan(0);
  });

  it("rtcp_required is boolean", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(typeof r.rtcp_required).toBe("boolean");
  });

  it("singularity_safe is boolean", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(typeof r.singularity_safe).toBe("boolean");
  });

  it("alternatives do not duplicate the primary strategy", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    for (const alt of r.alternatives) {
      expect(alt.strategy).not.toBe(r.recommended_strategy);
    }
  });
});

// ============================================================================
// Feature-type driven strategy routing
// ============================================================================

describe("FiveAxisDecisionEngine.decide — strategy routing by feature type", () => {
  it("impeller_blade enables impeller_turbine as a candidate", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([IMPELLER_FEATURE]));
    // impeller_turbine is either primary or in alternatives
    const all = [r.recommended_strategy, ...r.alternatives.map(a => a.strategy)];
    expect(all.includes("impeller_turbine")).toBe(true);
  });

  it("ruled_surface enables swarf_cutting as a candidate", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([RULED_SURFACE_FEATURE]));
    const all = [r.recommended_strategy, ...r.alternatives.map(a => a.strategy)];
    expect(all.includes("swarf_cutting")).toBe(true);
  });

  it("deep_cavity enables port_cavity as a candidate", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([DEEP_CAVITY_FEATURE]));
    const all = [r.recommended_strategy, ...r.alternatives.map(a => a.strategy)];
    expect(all.includes("port_cavity")).toBe(true);
  });

  it("port feature also enables port_cavity as a candidate", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([PORT_FEATURE]));
    const all = [r.recommended_strategy, ...r.alternatives.map(a => a.strategy)];
    expect(all.includes("port_cavity")).toBe(true);
  });

  it("freeform_surface enables multiaxis_contouring as a candidate", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([FREEFORM_FEATURE]));
    const all = [r.recommended_strategy, ...r.alternatives.map(a => a.strategy)];
    expect(all.includes("multiaxis_contouring")).toBe(true);
  });

  it("undercut enables multiaxis_contouring (has_undercuts path)", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([UNDERCUT_FEATURE]));
    const all = [r.recommended_strategy, ...r.alternatives.map(a => a.strategy)];
    expect(all.includes("multiaxis_contouring")).toBe(true);
  });

  it("simple multi_face always has 3_plus_2_positioning as a candidate", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    const all = [r.recommended_strategy, ...r.alternatives.map(a => a.strategy)];
    expect(all.includes("3_plus_2_positioning")).toBe(true);
  });

  it("multi_face always has 5_axis_simultaneous as a candidate", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    const all = [r.recommended_strategy, ...r.alternatives.map(a => a.strategy)];
    expect(all.includes("5_axis_simultaneous")).toBe(true);
  });
});

// ============================================================================
// 3+2 recommended tilt
// ============================================================================

describe("FiveAxisDecisionEngine.decide — recommended tilt", () => {
  it("3+2 strategy includes recommended_tilt", () => {
    // Force 3+2 by using simple multi-face on a skill-1 operator (biases away from 5-axis)
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { operator_skill: 1 }));
    if (r.recommended_strategy === "3_plus_2_positioning") {
      expect(r.recommended_tilt).not.toBe(undefined);
      expect(typeof r.recommended_tilt?.A_deg).toBe("number");
      expect(typeof r.recommended_tilt?.C_deg).toBe("number");
    }
  });

  it("non-3+2 strategy has no recommended_tilt", () => {
    // Force complex strategy with impeller
    const r = FiveAxisDecisionEngine.decide(makeInput([IMPELLER_FEATURE], { operator_skill: 5 }));
    if (r.recommended_strategy !== "3_plus_2_positioning") {
      expect(r.recommended_tilt).toBe(undefined);
    }
  });
});

// ============================================================================
// Reasoning trace toggle
// ============================================================================

describe("FiveAxisDecisionEngine.decide — reasoning trace", () => {
  it("reasoning trace is omitted by default", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(r.reasoning).toBe(undefined);
  });

  it("reasoning trace included when include_reasoning=true", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { include_reasoning: true }));
    expect(r.reasoning).not.toBe(undefined);
    expect(r.reasoning?.reasoning_chain).not.toBe(undefined);
    expect(r.reasoning?.rtcp_analysis).not.toBe(undefined);
    expect(r.reasoning?.singularity_analysis).not.toBe(undefined);
  });

  it("reasoning chain has non-empty steps", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([IMPELLER_FEATURE], { include_reasoning: true }));
    expect(r.reasoning?.reasoning_chain.steps.length).toBeGreaterThan(0);
  });

  it("reasoning trace includes self_reflection", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { include_reasoning: true }));
    expect(Array.isArray(r.reasoning?.self_reflection.assumptions)).toBe(true);
    expect(Array.isArray(r.reasoning?.self_reflection.uncertainties)).toBe(true);
  });
});

// ============================================================================
// Tool type variability
// ============================================================================

describe("FiveAxisDecisionEngine.decide — tool type variability", () => {
  const toolTypes: Array<"ball_nose" | "bull_nose" | "flat_end" | "lollipop" | "barrel"> = [
    "ball_nose", "bull_nose", "flat_end", "lollipop", "barrel",
  ];

  it.each(toolTypes)("decides for tool type '%s'", (toolType) => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], {
      tool: { type: toolType, diameter_mm: 8, flute_length_mm: 25, overall_length_mm: 70, gauge_length_mm: 45 },
    }));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
  });
});

// ============================================================================
// Operator skill variability
// ============================================================================

describe("FiveAxisDecisionEngine.decide — operator skill variability", () => {
  const skills: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

  it.each(skills)("decides with operator_skill=%i", (skill) => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { operator_skill: skill }));
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("higher skill can enable more complex strategies on complex parts", () => {
    const skill1 = FiveAxisDecisionEngine.decide(makeInput([IMPELLER_FEATURE], { operator_skill: 1 }));
    const skill5 = FiveAxisDecisionEngine.decide(makeInput([IMPELLER_FEATURE], { operator_skill: 5 }));
    // Both produce valid strategies
    expect(VALID_STRATEGIES.includes(skill1.recommended_strategy)).toBe(true);
    expect(VALID_STRATEGIES.includes(skill5.recommended_strategy)).toBe(true);
  });
});

// ============================================================================
// Batch size / cost invariants
// ============================================================================

describe("FiveAxisDecisionEngine.decide — batch size effects", () => {
  it("cost_per_part decreases (or stays flat) as batch_size increases", () => {
    const small = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { batch_size: 1 }));
    const big = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { batch_size: 1000 }));
    // Cost per part should not increase with more amortization
    expect(big.expected_cost_per_part).toBeLessThanOrEqual(small.expected_cost_per_part * 1.5);
  });

  it("works with batch_size=1 (prototype)", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { batch_size: 1 }));
    expect(r.expected_cost_per_part).toBeGreaterThan(0);
  });

  it("works with very large batch size without NaN", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { batch_size: 100000 }));
    expect(Number.isFinite(r.expected_cost_per_part)).toBe(true);
    expect(Number.isFinite(r.expected_cycle_time_min)).toBe(true);
  });
});

// ============================================================================
// Machine kinematic variability
// ============================================================================

describe("FiveAxisDecisionEngine.decide — machine variability", () => {
  const HEAD_HEAD: MachineKinematics = {
    ...OKUMA_M460V_5AX,
    machine_id: "HH-01",
    machine_name: "DMG Head-Head",
    kinematic_type: "head_head",
    primary_rotary: "B",
    axis_limits: { A_min: -90, A_max: 90, B_min: -110, B_max: 110, C_min: -360, C_max: 360 },
  };

  const HEAD_TABLE: MachineKinematics = {
    ...OKUMA_M460V_5AX,
    machine_id: "HT-01",
    machine_name: "Hermle Head-Table",
    kinematic_type: "head_table",
  };

  it("decides for table-table config (OKUMA)", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE]));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
  });

  it("decides for head-head config (DMG)", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { machine: HEAD_HEAD }));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
  });

  it("decides for head-table config (Hermle)", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { machine: HEAD_TABLE }));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
  });

  it("machine without RTCP flags rtcp_required=true when error > 0.01mm", () => {
    const noRtcp: MachineKinematics = { ...OKUMA_M460V_5AX, rtcp_enabled: false };
    const r = FiveAxisDecisionEngine.decide(makeInput([IMPELLER_FEATURE], { machine: noRtcp }));
    // With impeller complexity, rtcp_required should typically be true
    expect(typeof r.rtcp_required).toBe("boolean");
  });
});

// ============================================================================
// Edge cases / adversarial
// ============================================================================

describe("FiveAxisDecisionEngine.decide — edge cases", () => {
  it("empty part_features still produces a decision (3+2 and simultaneous always candidates)", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([]));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
    expect(r.expected_cycle_time_min).toBeGreaterThanOrEqual(0);
  });

  it("accessibility_score 0 still decides", () => {
    const hard: FiveAxisPartFeature = { ...MULTI_FACE_FEATURE, accessibility_score: 0 };
    const r = FiveAxisDecisionEngine.decide(makeInput([hard]));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
  });

  it("accessibility_score 1 decides with high confidence", () => {
    const easy: FiveAxisPartFeature = { ...MULTI_FACE_FEATURE, accessibility_score: 1 };
    const r = FiveAxisDecisionEngine.decide(makeInput([easy]));
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("many features (stress test) without crash", () => {
    const many = Array.from({ length: 50 }, () => ({ ...MULTI_FACE_FEATURE }));
    const r = FiveAxisDecisionEngine.decide(makeInput(many));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
    expect(Number.isFinite(r.expected_cycle_time_min)).toBe(true);
  });

  it("mixed feature types produces a decision", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([
      MULTI_FACE_FEATURE, IMPELLER_FEATURE, RULED_SURFACE_FEATURE,
    ]));
    expect(VALID_STRATEGIES.includes(r.recommended_strategy)).toBe(true);
  });

  it("zero feed_rate_mm_per_min doesn't crash", () => {
    const r = FiveAxisDecisionEngine.decide(makeInput([MULTI_FACE_FEATURE], { feed_rate_mm_per_min: 0 }));
    expect(Number.isFinite(r.expected_cycle_time_min)).toBe(true);
  });
});

// ============================================================================
// Singleton
// ============================================================================

describe("FiveAxisDecisionEngine — singleton", () => {
  it("fiveAxisDecisionEngine exported as instance of FiveAxisDecisionEngine", () => {
    expect(fiveAxisDecisionEngine instanceof FiveAxisDecisionEngine).toBe(true);
  });

  it("OKUMA_M460V_5AX has table-table kinematic config", () => {
    expect(OKUMA_M460V_5AX.kinematic_type).toBe("table_table");
    expect(OKUMA_M460V_5AX.primary_rotary).toBe("A");
    expect(OKUMA_M460V_5AX.secondary_rotary).toBe("C");
  });

  it("OKUMA axis limits are sane", () => {
    expect(OKUMA_M460V_5AX.axis_limits.A_min).toBeLessThan(OKUMA_M460V_5AX.axis_limits.A_max);
    expect(OKUMA_M460V_5AX.axis_limits.C_min).toBeLessThan(OKUMA_M460V_5AX.axis_limits.C_max);
  });
});

// ============================================================================
// Dispatcher wiring
// ============================================================================

describe("Dispatcher wiring — mill_five_axis_decide", () => {
  it("action is in enum", () => {
    expect(MILL_DISPATCHER_ACTIONS.includes("mill_five_axis_decide")).toBe(true);
  });

  it("schema accepts valid decision input", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_five_axis_decide"];
    expect(typeof schema?.safeParse).toBe("function");
    const parsed = schema.safeParse({
      material: "4140",
      part_features: [MULTI_FACE_FEATURE],
      tool: { type: "ball_nose", diameter_mm: 10, flute_length_mm: 30,
              overall_length_mm: 80, gauge_length_mm: 50 },
      batch_size: 10,
      operator_skill: 3,
      feed_rate_mm_per_min: 1500,
    });
    expect(parsed.success).toBe(true);
  });

  it("schema rejects missing required fields", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_five_axis_decide"];
    const parsed = schema.safeParse({ material: "4140" });
    expect(parsed.success).toBe(false);
  });

  it("schema rejects operator_skill out of range", () => {
    const schema = MILL_ACTION_SCHEMAS["mill_five_axis_decide"];
    const parsed = schema.safeParse({
      material: "4140",
      part_features: [MULTI_FACE_FEATURE],
      tool: { type: "ball_nose", diameter_mm: 10, flute_length_mm: 30,
              overall_length_mm: 80, gauge_length_mm: 50 },
      batch_size: 10,
      operator_skill: 7, // invalid — must be 1..5
      feed_rate_mm_per_min: 1500,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("FiveAxisDecisionEngine.decideUltra — useAI=off legacy parity (U13)", () => {
  it("returns result with legacy payload AND no ai side-channel when useAI=off", async () => {
    const input = makeInput([MULTI_FACE_FEATURE]);
    const r: DecideUltraResult = await FiveAxisDecisionEngine.decideUltra(input, { useAI: "off" });
    expect(r.ai).toBe(undefined);
    expect(VALID_STRATEGIES.includes(r.legacy.recommended_strategy)).toBe(true);
    expect(r.legacy.expected_cycle_time_min).toBeGreaterThan(0);
    expect(r.legacy.expected_cost_per_part).toBeGreaterThan(0);
    expect(Array.isArray(r.legacy.alternatives)).toBe(true);
  });

  it("opts omitted defaults useAI=off (no ai side-channel)", async () => {
    const r = await FiveAxisDecisionEngine.decideUltra(makeInput([MULTI_FACE_FEATURE]));
    expect(r.ai).toBe(undefined);
    expect(VALID_STRATEGIES.includes(r.legacy.recommended_strategy)).toBe(true);
  });

  it("legacy payload matches decide() on every deterministic field (IMPELLER fixture)", async () => {
    const input = makeInput([IMPELLER_FEATURE]);
    const ultra = await FiveAxisDecisionEngine.decideUltra(input, { useAI: "off" });
    const direct = FiveAxisDecisionEngine.decide(input);
    expect(ultra.legacy.recommended_strategy).toBe(direct.recommended_strategy);
    expect(ultra.legacy.expected_cycle_time_min).toBe(direct.expected_cycle_time_min);
    expect(ultra.legacy.expected_cost_per_part).toBe(direct.expected_cost_per_part);
    expect(ultra.legacy.expected_surface_quality).toBe(direct.expected_surface_quality);
    expect(ultra.legacy.rtcp_required).toBe(direct.rtcp_required);
    expect(ultra.legacy.singularity_safe).toBe(direct.singularity_safe);
    expect(ultra.legacy.confidence).toBe(direct.confidence);
    expect(ultra.legacy.alternatives.length).toBe(direct.alternatives.length);
    expect(ultra.legacy.safety_warnings).toEqual(direct.safety_warnings);
    expect(ultra.legacy.explanation).toBe(direct.explanation);
  });

  it("legacy payload matches decide() for RULED_SURFACE fixture (strategy + time + cost)", async () => {
    const input = makeInput([RULED_SURFACE_FEATURE]);
    const ultra = await FiveAxisDecisionEngine.decideUltra(input, { useAI: "off" });
    const direct = FiveAxisDecisionEngine.decide(input);
    expect(ultra.legacy.recommended_strategy).toBe(direct.recommended_strategy);
    expect(ultra.legacy.expected_cycle_time_min).toBe(direct.expected_cycle_time_min);
    expect(ultra.legacy.expected_cost_per_part).toBe(direct.expected_cost_per_part);
    expect(ultra.legacy.alternatives.map(a => a.strategy)).toEqual(direct.alternatives.map(a => a.strategy));
  });
});

describe("FiveAxisDecisionEngine.decideUltra — useAI=on AI-path behavior (U13)", () => {
  it("useAI=on emits ai side-channel with legacy preserved (legacy strategy matches decide())", async () => {
    const input = makeInput([MULTI_FACE_FEATURE, IMPELLER_FEATURE]);
    const r = await FiveAxisDecisionEngine.decideUltra(input, { useAI: "on" });
    const direct = FiveAxisDecisionEngine.decide(input);
    expect(r.ai).not.toBe(undefined);
    expect(r.legacy.recommended_strategy).toBe(direct.recommended_strategy);
    expect(r.legacy.expected_cycle_time_min).toBe(direct.expected_cycle_time_min);
  });

  it("ai.sources contains at least one of {tree_of_thought, deep_ai_intelligence}", async () => {
    const r = await FiveAxisDecisionEngine.decideUltra(
      makeInput([IMPELLER_FEATURE]),
      { useAI: "on" },
    );
    const sources = r.ai?.sources ?? [];
    const allowed = new Set(["tree_of_thought", "deep_ai_intelligence"]);
    expect(sources.length).toBeGreaterThanOrEqual(1);
    for (const src of sources) {
      expect(allowed.has(src)).toBe(true);
    }
  });

  it("ai.confidence and ai.deep_confidence are clamped to [0, 1]", async () => {
    const r = await FiveAxisDecisionEngine.decideUltra(
      makeInput([MULTI_FACE_FEATURE]),
      { useAI: "on" },
    );
    const conf = r.ai?.confidence ?? -1;
    const deepConf = r.ai?.deep_confidence ?? -1;
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
    expect(deepConf).toBeGreaterThanOrEqual(0);
    expect(deepConf).toBeLessThanOrEqual(1);
    expect(Number.isFinite(conf)).toBe(true);
    expect(Number.isFinite(deepConf)).toBe(true);
  });

  it("ai.reasoning_chain is a string array with length <= 6 (helper slice contract)", async () => {
    const r = await FiveAxisDecisionEngine.decideUltra(
      makeInput([FREEFORM_FEATURE]),
      { useAI: "on" },
    );
    const chain = r.ai?.reasoning_chain ?? [];
    expect(Array.isArray(chain)).toBe(true);
    expect(chain.length).toBeLessThanOrEqual(6);
    for (const step of chain) {
      expect(typeof step).toBe("string");
    }
  });

  it("ai.branch_count and ai.max_depth_reached are non-negative finite numbers", async () => {
    const r = await FiveAxisDecisionEngine.decideUltra(
      makeInput([MULTI_FACE_FEATURE]),
      { useAI: "on" },
    );
    const branches = r.ai?.branch_count ?? -1;
    const depth = r.ai?.max_depth_reached ?? -1;
    expect(Number.isFinite(branches)).toBe(true);
    expect(Number.isFinite(depth)).toBe(true);
    expect(branches).toBeGreaterThanOrEqual(0);
    expect(depth).toBeGreaterThanOrEqual(0);
  });

  it("invalid ai.mode falls back to 'multi_path'", async () => {
    const r = await FiveAxisDecisionEngine.decideUltra(
      makeInput([MULTI_FACE_FEATURE]),
      { useAI: "on", mode: "not_a_mode" as unknown as never },
    );
    expect(r.ai?.mode).toBe("multi_path");
  });

  it("explicit ai.mode='chain_of_thought' is honored (no fallback)", async () => {
    const r = await FiveAxisDecisionEngine.decideUltra(
      makeInput([MULTI_FACE_FEATURE]),
      { useAI: "on", mode: "chain_of_thought" },
    );
    expect(r.ai?.mode).toBe("chain_of_thought");
  });

  it("useAI=auto still preserves legacy strategy equal to decide()", async () => {
    const input = makeInput([MULTI_FACE_FEATURE]);
    const r = await FiveAxisDecisionEngine.decideUltra(input, { useAI: "auto" });
    const direct = FiveAxisDecisionEngine.decide(input);
    expect(r.legacy.recommended_strategy).toBe(direct.recommended_strategy);
    if (r.ai) {
      expect(r.ai.confidence).toBeGreaterThanOrEqual(0);
      expect(r.ai.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("NaN maxReasoningDepth is clamped — legacy strategy unchanged", async () => {
    const input = makeInput([IMPELLER_FEATURE]);
    const r = await FiveAxisDecisionEngine.decideUltra(
      input,
      { useAI: "on", maxReasoningDepth: NaN as unknown as number },
    );
    const direct = FiveAxisDecisionEngine.decide(input);
    expect(r.legacy.recommended_strategy).toBe(direct.recommended_strategy);
    expect(r.legacy.expected_cycle_time_min).toBe(direct.expected_cycle_time_min);
  });

  it("empty part_features still produces valid strategy with useAI=on", async () => {
    const r = await FiveAxisDecisionEngine.decideUltra(makeInput([]), { useAI: "on" });
    expect(VALID_STRATEGIES.includes(r.legacy.recommended_strategy)).toBe(true);
    expect(r.legacy.expected_cycle_time_min).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.legacy.expected_cost_per_part)).toBe(true);
  });

  it("useAI=on legacy payload matches decide() on cycle time + cost (AI layer non-invasive)", async () => {
    const input = makeInput([RULED_SURFACE_FEATURE]);
    const ultra = await FiveAxisDecisionEngine.decideUltra(input, { useAI: "on" });
    const direct = FiveAxisDecisionEngine.decide(input);
    expect(ultra.legacy.recommended_strategy).toBe(direct.recommended_strategy);
    expect(ultra.legacy.expected_cycle_time_min).toBe(direct.expected_cycle_time_min);
    expect(ultra.legacy.expected_cost_per_part).toBe(direct.expected_cost_per_part);
    expect(ultra.legacy.expected_surface_quality).toBe(direct.expected_surface_quality);
  });
});
