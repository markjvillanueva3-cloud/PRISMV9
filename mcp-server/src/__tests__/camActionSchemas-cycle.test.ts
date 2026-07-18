/**
 * camActionSchemas -- op.cycle field parse tests
 * POST-PROCESSOR/U-PP-HURCO-CYCLE (slot:echo)
 *
 * Verifies that the master_post_hurco_v11 Zod schema:
 *   (a) accepts a valid operation WITH a cycle field (all 6 type variants)
 *   (b) accepts a valid operation WITHOUT a cycle field (additive/optional)
 *   (c) rejects an invalid cycle.type value
 *   (d) rejects missing required cycle sub-fields (depth_mm, retract_mm)
 *   (e) accepts cycle with only required fields (peck_mm/dwell_s optional)
 *
 * Tests parse against ACTION_CAM_SCHEMAS["master_post_hurco_v11"] directly
 * (schema-layer unit test) -- no dispatcher round-trip needed for parse tests.
 *
 * R9: every assertion encodes WHY it matters -- a schema that strips 'cycle'
 * silently allows the dispatcher to pass malformed cycle data to the engine,
 * producing wrong G-code (G81 fallback instead of the requested G83 peck cycle).
 */
import { describe, it, expect } from "vitest";
import { ACTION_CAM_SCHEMAS } from "../schemas/camActionSchemas.js";

// ---------------------------------------------------------------------------
// Shared minimal op fixture (coordinates required by schema min(1))
// ---------------------------------------------------------------------------
const BASE_OP = {
  operation_type: "drill" as const,
  tool_number: 3,
  tool_diameter_mm: 8,
  tool_flutes: 2,
  material_iso: "P" as const,
  spindle_rpm: 2500,
  feed_mm_min: 200,
  axial_depth_mm: 20,
  coordinates: [{ x: 10, y: 15, z: -20, type: "linear" as const }],
};

const BASE_CONFIG = {
  program_number: 1,
  units: "metric" as const,
};

function buildInput(op: typeof BASE_OP & { cycle?: Record<string, unknown> | null }) {
  return { operations: [op], config: BASE_CONFIG };
}

const schema = ACTION_CAM_SCHEMAS["master_post_hurco_v11"];
if (!schema) throw new Error("master_post_hurco_v11 schema not found in ACTION_CAM_SCHEMAS");

// ---------------------------------------------------------------------------
// 1. op WITHOUT cycle -- additive/optional (no regression on existing callers)
// ---------------------------------------------------------------------------
describe("master_post_hurco_v11 schema -- op without cycle", () => {
  it("parses a valid op that carries no cycle field", () => {
    const result = schema.safeParse(buildInput(BASE_OP));
    expect(result.success).toBe(true);
    if (!result.success) return;
    // cycle must be absent (undefined) -- not stripped to null or defaulted
    const op = result.data.operations[0] as Record<string, unknown>;
    expect(op.cycle).toBeUndefined();
  });

  it("parsed op without cycle preserves all required numeric fields verbatim", () => {
    const result = schema.safeParse(buildInput(BASE_OP));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const op = result.data.operations[0] as Record<string, unknown>;
    expect(op.operation_type).toBe("drill");
    expect(op.tool_number).toBe(3);
    expect(op.tool_diameter_mm).toBe(8);
    expect(op.spindle_rpm).toBe(2500);
    expect(op.feed_mm_min).toBe(200);
  });

  it("operations array is length 1 and config round-trips program_number", () => {
    const result = schema.safeParse(buildInput(BASE_OP));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.operations).toHaveLength(1);
    const cfg = result.data.config as Record<string, unknown> | undefined;
    expect(cfg?.program_number).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. op WITH cycle -- all 6 type variants accepted
// ---------------------------------------------------------------------------
describe("master_post_hurco_v11 schema -- op with cycle (all 6 types)", () => {
  const cycleTypes = [
    "drill",
    "dwell",
    "peck",
    "chip_break",
    "tap",
    "bore",
  ] as const;

  for (const cycleType of cycleTypes) {
    it(`accepts cycle.type="${cycleType}" with required depth_mm + retract_mm`, () => {
      const input = buildInput({
        ...BASE_OP,
        cycle: {
          type: cycleType,
          depth_mm: -20,
          retract_mm: 2,
        },
      });
      const result = schema.safeParse(input);
      expect(result.success).toBe(true);
      if (!result.success) return;
      const op = result.data.operations[0] as Record<string, unknown>;
      // cycle is preserved through the schema -- not stripped
      const cycle = op.cycle as Record<string, unknown>;
      expect(typeof cycle).toBe("object");
      expect(cycle.type).toBe(cycleType);
      // depth_mm and retract_mm must survive the parse unchanged (R9 -- the
      // engine uses these exact values for G-code Z and R word emission).
      expect(cycle.depth_mm).toBe(-20);
      expect(cycle.retract_mm).toBe(2);
    });
  }

  it("accepts peck cycle with peck_mm supplied (Q parameter round-trips)", () => {
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "peck", depth_mm: -15, retract_mm: 2, peck_mm: 3 },
    }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const cycle = (result.data.operations[0] as Record<string, unknown>).cycle as Record<string, unknown>;
    // peck_mm must round-trip: the engine emits it as the G83 Q word verbatim.
    expect(cycle.peck_mm).toBe(3);
    // dwell_s absent -> undefined (not defaulted to 0)
    expect(cycle.dwell_s).toBeUndefined();
  });

  it("accepts dwell cycle with dwell_s supplied (P parameter round-trips)", () => {
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "dwell", depth_mm: -5, retract_mm: 2, dwell_s: 0.5 },
    }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const cycle = (result.data.operations[0] as Record<string, unknown>).cycle as Record<string, unknown>;
    // dwell_s must round-trip: the engine emits P(dwell_s*1000) ms word.
    expect(cycle.dwell_s).toBe(0.5);
    // peck_mm absent -> undefined
    expect(cycle.peck_mm).toBeUndefined();
  });

  it("accepts chip_break cycle with peck_mm AND dwell_s (all optional fields present)", () => {
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "chip_break", depth_mm: -25, retract_mm: 3, peck_mm: 5, dwell_s: 0.2 },
    }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const cycle = (result.data.operations[0] as Record<string, unknown>).cycle as Record<string, unknown>;
    expect(cycle.type).toBe("chip_break");
    expect(cycle.depth_mm).toBe(-25);
    expect(cycle.retract_mm).toBe(3);
    expect(cycle.peck_mm).toBe(5);
    expect(cycle.dwell_s).toBe(0.2);
  });

  it("accepts bore cycle with only depth_mm + retract_mm (minimal valid cycle)", () => {
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "bore", depth_mm: -10, retract_mm: 1.5 },
    }));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const cycle = (result.data.operations[0] as Record<string, unknown>).cycle as Record<string, unknown>;
    expect(cycle.type).toBe("bore");
    expect(cycle.peck_mm).toBeUndefined();
    expect(cycle.dwell_s).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. invalid cycle.type -- rejected (schema-layer rejection, not engine-layer)
// ---------------------------------------------------------------------------
describe("master_post_hurco_v11 schema -- invalid cycle.type rejected", () => {
  it("rejects an unrecognized cycle type string", () => {
    // A schema that passes 'gun_drill' would silently produce a G81 fallback
    // in the engine with no error surfaced to the caller (R12 violation).
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "gun_drill", depth_mm: -20, retract_mm: 2 },
    }));
    expect(result.success).toBe(false);
    if (result.success) return;
    // Zod error must cite the 'type' field
    const issues = result.error.issues;
    expect(issues.length).toBeGreaterThan(0);
    // at least one issue path reaches the cycle.type field
    const hasCyclePath = issues.some(
      (iss) => iss.path.includes("type") && iss.path.includes("cycle"),
    );
    expect(hasCyclePath).toBe(true);
  });

  it("rejects an empty string cycle type", () => {
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "", depth_mm: -20, retract_mm: 2 },
    }));
    expect(result.success).toBe(false);
  });

  it("rejects a numeric cycle type (wrong Zod type -- must be string enum)", () => {
    // G-code cycle G-number (83) is not the same as the PRISM cycle type string
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: 83, depth_mm: -20, retract_mm: 2 },
    }));
    expect(result.success).toBe(false);
  });

  it("rejects a cycle missing depth_mm (required field)", () => {
    // depth_mm is not optional -- a cycle with no depth produces Z0
    // which is either a no-cut no-op or a machine crash at Z0.
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "drill", retract_mm: 2 },
    }));
    expect(result.success).toBe(false);
  });

  it("rejects a cycle missing retract_mm (required field)", () => {
    // retract_mm is the R-plane; absent means no safe retract between holes.
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "drill", depth_mm: -20 },
    }));
    expect(result.success).toBe(false);
  });

  it("rejects a cycle where type is missing entirely", () => {
    // Without a type, the engine cannot select the G-code (G81/G83/...) to emit.
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { depth_mm: -20, retract_mm: 2 },
    }));
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Adversarial inputs -- case sensitivity + null handling
// ---------------------------------------------------------------------------
describe("master_post_hurco_v11 schema -- adversarial cycle inputs", () => {
  it("rejects cycle.type='DRILL' (enum is case-sensitive, must be lowercase)", () => {
    // The engine's CYCLE_GCODE map keys are lowercase; an uppercase value would
    // silently fall through to the G81 default or throw -- both are wrong.
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "DRILL", depth_mm: -20, retract_mm: 2 },
    }));
    expect(result.success).toBe(false);
  });

  it("rejects cycle.type='Peck' (mixed-case variant)", () => {
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "Peck", depth_mm: -15, retract_mm: 2, peck_mm: 3 },
    }));
    expect(result.success).toBe(false);
  });

  it("rejects cycle.type='TAP' (all-uppercase tap variant)", () => {
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "TAP", depth_mm: -15, retract_mm: 2 },
    }));
    expect(result.success).toBe(false);
  });

  it("rejects cycle=null (null is not the same as absent/undefined for optional fields)", () => {
    // Callers must omit the field or pass undefined, not null.
    // The engine receives the parsed value and type-guards against HurcoDrillCycle;
    // null would bypass the guard and cause a runtime property access on null.
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: null as unknown as Record<string, unknown>,
    }));
    // Zod z.object(...).optional() rejects null (null !== undefined).
    expect(result.success).toBe(false);
  });

  it("rejects peck_mm as a string (must be number, not string '3')", () => {
    // Zod must reject type coercion -- a string '3' would pass as-is to the
    // engine, making peck_mm a string, so toFixed(3) would throw at emit time.
    const result = schema.safeParse(buildInput({
      ...BASE_OP,
      cycle: { type: "peck", depth_mm: -15, retract_mm: 2, peck_mm: "3" },
    }));
    expect(result.success).toBe(false);
  });
});
