/**
 * verifyWEDMBlockAnnotations test suite — PPG-WIRE-MS6/U-PPGM17b.
 *
 * Covers:
 *   - Per-tier tolerance (sim ±20%, proven_out ±10%, production ±5%, shop_floor ±2%)
 *     × happy path AND violation per tier.
 *   - shop_floor extras: heat-soak invariant + servo-voltage range gate.
 *   - operator_override bypass behavior.
 *   - missing_annotations / unknown_power_setting / shape violation.
 *   - Boundary cases (exact tolerance edge).
 *   - Round-trip via sealWEDMMasterPostOutput (verify_tier wiring).
 */

import { describe, it, expect } from "vitest";
import {
  verifyWEDMBlockAnnotations,
  verifyWEDMOrThrow,
  TIER_TOLERANCE,
  SHOP_FLOOR_HEAT_SOAK_RATIO,
  SHOP_FLOOR_SERVO_V_MIN,
  SHOP_FLOOR_SERVO_V_MAX,
  type WEDMBlockMismatch,
  type WEDMMismatchReason,
  type WEDMVerifyResult,
} from "../cps/verifyWEDMBlockAnnotations.js";
import { sealWEDMMasterPostOutput } from "../cps/sealMasterPostOutput.js";
import type { WEDMBlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";

// ============================================================================
// FIXTURES — built from PASS_DEFAULTS["rough"] × E_PACK_TABLE[12]
//   on_time_us=8, off_time_us=20 (epack_lookup applies factor=1.0)
//   servo_v=50, wire_speed_m_min=12, wire_tension_g=1200, flushing=10
// ============================================================================

function passingRoughBlock(overrides?: Partial<WEDMBlockAnnotation>): WEDMBlockAnnotation {
  const base: WEDMBlockAnnotation = {
    block_id: "OP1_rough",
    op_id: "OP1",
    material_class: "tool_steel",
    wire_diameter_mm: 0.25,
    thickness_mm: 25,
    emitted: {
      power_setting: 12,
      on_time_us: 8,
      off_time_us: 20,
      servo_voltage_v: 50,
      wire_speed_m_min: 12,
      wire_tension_g: 1200,
      flushing_pressure: 10,
      pass_type: "rough",
    },
    physics_basis: "epack_lookup",
    confidence: 0.9,
    safety_margin: 1.0,
    source_constants: ["E_PACK_TABLE[12]"],
  };
  return { ...base, ...overrides };
}

function passingSkim1Block(): WEDMBlockAnnotation {
  // PASS_DEFAULTS["skim1"] × E_PACK_TABLE[12]:
  //   on_time = round(8 * 0.5 * 10) / 10 = 4.0
  //   off_time = round(20 * 0.6 * 10) / 10 = 12.0
  //   servo_v=40, wire_speed=8, wire_tension=800, flushing=5
  return {
    block_id: "OP2_skim1",
    op_id: "OP2",
    material_class: "tool_steel",
    wire_diameter_mm: 0.25,
    thickness_mm: 25,
    emitted: {
      power_setting: 12,
      on_time_us: 4,
      off_time_us: 12,
      servo_voltage_v: 40,
      wire_speed_m_min: 8,
      wire_tension_g: 800,
      flushing_pressure: 5,
      pass_type: "skim1",
    },
    physics_basis: "pass_factor_table",
    confidence: 0.85,
    safety_margin: 1.0,
    source_constants: ['PASS_DEFAULTS["skim1"]', "E_PACK_TABLE[12]"],
  };
}

function buildSidecar(annotations: WEDMBlockAnnotation[]): Record<string, unknown> {
  return { wedm_block_annotations: annotations };
}

/** Strong finder: throws when reason is absent so test assertions fail with clear context. */
function findMismatch(
  result: WEDMVerifyResult,
  reason: WEDMMismatchReason,
): WEDMBlockMismatch {
  const m = result.mismatches.find((x) => x.reason === reason);
  if (!m) {
    const present = result.mismatches.map((x) => x.reason).join(", ") || "(none)";
    throw new Error(
      `Expected mismatch reason="${reason}" not found. Present reasons: ${present}`,
    );
  }
  return m;
}

/** Concrete absence assertion via filter().length.toBe(0). */
function reasonsOf(result: WEDMVerifyResult, reason: WEDMMismatchReason): WEDMBlockMismatch[] {
  return result.mismatches.filter((m) => m.reason === reason);
}

// ============================================================================
// CORE: tier × pass/violation matrix
// ============================================================================

describe("verifyWEDMBlockAnnotations — tier tolerance happy paths", () => {
  it("PASSES rough+skim1 at sim tier when annotations match canonical tables", () => {
    const sidecar = buildSidecar([passingRoughBlock(), passingSkim1Block()]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "sim" });
    expect(result.verdict).toBe("PASS");
    expect(result.tier).toBe("sim");
    expect(result.blocks_scanned).toBe(2);
    expect(result.mismatches).toEqual([]);
  });

  it("PASSES rough+skim1 at production tier when annotations match canonical tables", () => {
    const sidecar = buildSidecar([passingRoughBlock(), passingSkim1Block()]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(result.verdict).toBe("PASS");
    expect(result.blocks_scanned).toBe(2);
    expect(result.mismatches).toEqual([]);
  });

  it("PASSES rough+skim1 at shop_floor tier (strictest) when annotations match canonical tables", () => {
    const sidecar = buildSidecar([passingRoughBlock(), passingSkim1Block()]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "shop_floor" });
    expect(result.verdict).toBe("PASS");
    expect(result.blocks_scanned).toBe(2);
    expect(result.mismatches).toEqual([]);
  });
});

describe("verifyWEDMBlockAnnotations — tier escalation", () => {
  it("WARNs at sim with 15% on_time drift (within ±20%) but escalates per tier", () => {
    // 8us → 9.2us = 15% drift
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, on_time_us: 9.2 },
      }),
    ]);

    const sim = verifyWEDMBlockAnnotations(sidecar, { tier: "sim" });
    expect(sim.verdict).toBe("PASS"); // sim tolerance is ±20%, 15% drift passes

    const provenOut = verifyWEDMBlockAnnotations(sidecar, { tier: "proven_out" });
    expect(provenOut.verdict).toBe("WARN"); // ±10% — 15% exceeds, warn-only at proven_out
    const provenDrift = findMismatch(provenOut, "on_time_drift");
    expect(provenDrift.emitted_value).toBe(9.2);
    expect(provenDrift.expected_value).toBe(8);
    expect(provenDrift.delta_pct).toBeCloseTo(0.15, 4);

    const prod = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(prod.verdict).toBe("HARD_BLOCK"); // ±5% — 15% drift hard-blocks at production

    const shop = verifyWEDMBlockAnnotations(sidecar, { tier: "shop_floor" });
    expect(shop.verdict).toBe("HARD_BLOCK"); // ±2% — 15% drift hard-blocks at shop_floor
  });
});

describe("verifyWEDMBlockAnnotations — production-tier hard blocks", () => {
  it("HARD_BLOCKS at production when on_time drifts >5% (8us → 9us = 12.5% drift)", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, on_time_us: 9 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(result.verdict).toBe("HARD_BLOCK");
    const drift = findMismatch(result, "on_time_drift");
    expect(drift.emitted_value).toBe(9);
    expect(drift.expected_value).toBe(8);
    expect(drift.delta_pct).toBeCloseTo(0.125, 4);
  });

  it("PASSES at production with 4% drift (8us → 8.32us, within ±5%)", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, on_time_us: 8.32 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(result.verdict).toBe("PASS");
    expect(result.mismatches).toEqual([]);
  });
});

describe("verifyWEDMBlockAnnotations — shop_floor extras", () => {
  it("HARD_BLOCKS at shop_floor on 3% on_time drift (within proven_out ±10%, outside ±2%)", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, on_time_us: 8.24 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "shop_floor" });
    expect(result.verdict).toBe("HARD_BLOCK");
    const drift = findMismatch(result, "on_time_drift");
    expect(drift.emitted_value).toBe(8.24);
    expect(drift.delta_pct).toBeCloseTo(0.03, 3);
  });

  it("HARD_BLOCKS at shop_floor on heat-soak violation (off/on ratio < 1.0)", () => {
    // Schema floor is off ≥ 0.2 × on. Use values that pass schema (10 × 0.2 = 2,
    // off=4 ≥ 2 ok) but fail shop_floor's ratio ≥ 1.0 gate (4/10 = 0.4 < 1.0).
    // Drift will also fire (epack_lookup E_PACK_TABLE[12] expects on=8, off=20),
    // but the test asserts heat_soak_violation is among the mismatches.
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: {
          ...passingRoughBlock().emitted,
          on_time_us: 10,
          off_time_us: 4,
        },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "shop_floor" });
    expect(result.verdict).toBe("HARD_BLOCK");
    const heat = findMismatch(result, "heat_soak_violation");
    expect(heat.emitted_value).toBeCloseTo(0.4, 4);
    expect(heat.expected_value).toBe(SHOP_FLOOR_HEAT_SOAK_RATIO);
  });

  it("does NOT fire heat-soak at production tier (gate is shop_floor only)", () => {
    // Same off/on ratio violation (off=4 vs on=8, ratio 0.5 < 1.0) — at
    // production tier the shop-floor-only heat-soak gate must NOT fire.
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: {
          ...passingRoughBlock().emitted,
          on_time_us: 8, // canonical — no on_time drift
          off_time_us: 4, // ratio 0.5 (<1.0) but schema-valid; at prod no gate fires
        },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    // off_time drift fires (4 vs expected 20 = 80% drift), but heat-soak must not.
    expect(reasonsOf(result, "heat_soak_violation")).toEqual([]);
    const offDrift = findMismatch(result, "off_time_drift");
    expect(offDrift.emitted_value).toBe(4);
    expect(offDrift.expected_value).toBe(20);
  });

  it("HARD_BLOCKS at shop_floor on servo-voltage below OEM band (sub-25V)", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, servo_voltage_v: 24 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "shop_floor" });
    expect(result.verdict).toBe("HARD_BLOCK");
    const range = findMismatch(result, "servo_voltage_range");
    expect(range.emitted_value).toBe(24);
  });

  it("HARD_BLOCKS at shop_floor on servo-voltage above OEM band (>60V)", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, servo_voltage_v: 65 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "shop_floor" });
    expect(result.verdict).toBe("HARD_BLOCK");
    const range = findMismatch(result, "servo_voltage_range");
    expect(range.emitted_value).toBe(65);
  });

  it("does NOT fire servo-voltage range at production tier (gate is shop_floor only)", () => {
    // Servo at 24V (below OEM band) but at production where the gate is off.
    // Production drift will still fire (24 vs expected 50 = 52% drift).
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, servo_voltage_v: 24 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(reasonsOf(result, "servo_voltage_range")).toEqual([]);
    const drift = findMismatch(result, "servo_voltage_drift");
    expect(drift.emitted_value).toBe(24);
    expect(drift.expected_value).toBe(50);
  });
});

// ============================================================================
// EDGE: bypasses, shape errors, unknowns
// ============================================================================

describe("verifyWEDMBlockAnnotations — bypasses & shape errors", () => {
  it("BYPASSES operator_override blocks at production (no drift mismatches even when wildly off)", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: {
          ...passingRoughBlock().emitted,
          on_time_us: 30,
          off_time_us: 100,
          servo_voltage_v: 48,
        },
        physics_basis: "operator_override",
        source_constants: [],
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(result.verdict).toBe("PASS");
    expect(result.blocks_with_overrides).toBe(1);
    const nonInformational = result.mismatches.filter(
      (m) => m.reason !== "operator_override_skip",
    );
    expect(nonInformational).toEqual([]);
  });

  it("records operator_override_skip informational entry at sim tier only", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        physics_basis: "operator_override",
        source_constants: [],
      }),
    ]);
    const sim = verifyWEDMBlockAnnotations(sidecar, { tier: "sim" });
    expect(sim.verdict).toBe("PASS");
    expect(sim.mismatches.length).toBe(1);
    expect(sim.mismatches[0].reason).toBe("operator_override_skip");
    expect(sim.mismatches[0].block_id).toBe("OP1_rough");

    // production tier: same input, but no informational entry
    const prod = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(prod.mismatches).toEqual([]);
  });

  it("flags unknown_power_setting and HARD_BLOCKS at production", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, power_setting: 99 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(result.verdict).toBe("HARD_BLOCK");
    const m = findMismatch(result, "unknown_power_setting");
    expect(m.emitted_value).toBe(99);
    // No drift mismatches because the verifier short-circuits when power_setting is unknown
    const drifts = result.mismatches.filter((mm) =>
      mm.reason.endsWith("_drift"),
    );
    expect(drifts).toEqual([]);
  });

  it("flags missing_annotations on empty/missing sidecar field", () => {
    const sidecarMissing: Record<string, unknown> = {};
    const shopFloor = verifyWEDMBlockAnnotations(sidecarMissing, { tier: "shop_floor" });
    expect(shopFloor.verdict).toBe("HARD_BLOCK");
    expect(shopFloor.mismatches.length).toBe(1);
    expect(shopFloor.mismatches[0].reason).toBe("missing_annotations");

    const sim = verifyWEDMBlockAnnotations(sidecarMissing, { tier: "sim" });
    expect(sim.verdict).toBe("WARN");

    const sidecarEmpty = buildSidecar([]);
    const shopEmpty = verifyWEDMBlockAnnotations(sidecarEmpty, { tier: "shop_floor" });
    expect(shopEmpty.verdict).toBe("HARD_BLOCK");
    expect(shopEmpty.mismatches[0].reason).toBe("missing_annotations");
  });

  it("throws on shape violation when wedm_block_annotations is non-array", () => {
    const bogus = { wedm_block_annotations: "not-an-array" } as Record<string, unknown>;
    expect(() => verifyWEDMBlockAnnotations(bogus, { tier: "sim" })).toThrow(
      /shape violation/,
    );
  });

  it("throws on unknown tier", () => {
    const sidecar = buildSidecar([passingRoughBlock()]);
    expect(() =>
      verifyWEDMBlockAnnotations(sidecar, { tier: "bogus" as never }),
    ).toThrow(/unknown tier/);
  });
});

// ============================================================================
// BOUNDARY — exact tolerance edge
// ============================================================================

describe("verifyWEDMBlockAnnotations — boundary edges", () => {
  it("PASSES exactly at production tolerance edge (5% drift inclusive)", () => {
    // 8us → 8.4us = exactly 5% drift
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, on_time_us: 8.4 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(result.verdict).toBe("PASS");
    expect(result.mismatches).toEqual([]);
  });

  it("FAILS just above production tolerance edge (5.0125% drift)", () => {
    // 8us → 8.401us → 5.0125% drift
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, on_time_us: 8.401 },
      }),
    ]);
    const result = verifyWEDMBlockAnnotations(sidecar, { tier: "production" });
    expect(result.verdict).toBe("HARD_BLOCK");
    const drift = findMismatch(result, "on_time_drift");
    expect(drift.delta_pct).toBeCloseTo(0.0501, 4);
  });
});

// ============================================================================
// CONSTANTS sanity
// ============================================================================

describe("verifyWEDMBlockAnnotations — exported constants", () => {
  it("per-tier tolerance is monotonically tightening from sim → shop_floor", () => {
    expect(TIER_TOLERANCE.sim).toBe(0.20);
    expect(TIER_TOLERANCE.proven_out).toBe(0.10);
    expect(TIER_TOLERANCE.production).toBe(0.05);
    expect(TIER_TOLERANCE.shop_floor).toBe(0.02);
  });

  it("shop-floor heat-soak threshold is tighter than the schema-level floor (0.2)", () => {
    expect(SHOP_FLOOR_HEAT_SOAK_RATIO).toBe(1.0);
    expect(SHOP_FLOOR_HEAT_SOAK_RATIO).toBeGreaterThan(0.2);
  });

  it("shop-floor servo voltage band matches Mitsubishi MV1200R OEM range", () => {
    expect(SHOP_FLOOR_SERVO_V_MIN).toBe(25);
    expect(SHOP_FLOOR_SERVO_V_MAX).toBe(60);
  });
});

// ============================================================================
// THROW HELPER
// ============================================================================

describe("verifyWEDMOrThrow", () => {
  it("returns the verify result object on PASS", () => {
    const sidecar = buildSidecar([passingRoughBlock()]);
    const r = verifyWEDMOrThrow(sidecar, { tier: "shop_floor" });
    expect(r.verdict).toBe("PASS");
    expect(r.blocks_scanned).toBe(1);
    expect(r.mismatches).toEqual([]);
  });

  it("throws with HARD_BLOCK summary when verdict is HARD_BLOCK", () => {
    const sidecar = buildSidecar([
      passingRoughBlock({
        emitted: { ...passingRoughBlock().emitted, on_time_us: 12 },
      }),
    ]);
    expect(() => verifyWEDMOrThrow(sidecar, { tier: "production" })).toThrow(
      /HARD_BLOCK on tier=production/,
    );
  });
});

// ============================================================================
// INTEGRATION — sealWEDMMasterPostOutput passes verify_tier through
// ============================================================================

describe("sealWEDMMasterPostOutput — verify_tier wiring", () => {
  it("attaches verify result with PASS verdict for canonical annotations", () => {
    const out = {
      gcode: ["%", "O0001", "(WEDM PROGRAM)", "M30"],
      block_annotations: [passingRoughBlock(), passingSkim1Block()],
    };
    const sealed = sealWEDMMasterPostOutput(out, {
      source_engine_versions: { MitsubishiMV1200RWireEDMMasterPostEngine: "1.0.0" },
      verify_tier: "shop_floor",
    });
    if (!sealed.verify) throw new Error("verify field missing on sealed result");
    expect(sealed.verify.verdict).toBe("PASS");
    expect(sealed.verify.tier).toBe("shop_floor");
    expect(sealed.verify.blocks_scanned).toBe(2);
    expect(sealed.verify.mismatches).toEqual([]);
  });

  it("omits verify field when verify_tier is not provided", () => {
    const out = {
      gcode: ["%"],
      block_annotations: [passingRoughBlock()],
    };
    const sealed = sealWEDMMasterPostOutput(out, {
      source_engine_versions: { MitsubishiMV1200RWireEDMMasterPostEngine: "1.0.0" },
    });
    expect(sealed).not.toHaveProperty("verify");
    // The seal helper still routes annotations into wedm_block_annotations slot
    expect(sealed.sidecar.wedm_block_annotations).toEqual([passingRoughBlock()]);
  });

  it("flags HARD_BLOCK in verify result for drifted annotation through the seal helper", () => {
    const drifted = passingRoughBlock({
      emitted: { ...passingRoughBlock().emitted, on_time_us: 12 },
    });
    const out = {
      gcode: ["%"],
      block_annotations: [drifted],
    };
    const sealed = sealWEDMMasterPostOutput(out, {
      source_engine_versions: { MitsubishiMV1200RWireEDMMasterPostEngine: "1.0.0" },
      verify_tier: "production",
    });
    if (!sealed.verify) throw new Error("verify field missing on sealed result");
    expect(sealed.verify.verdict).toBe("HARD_BLOCK");
    const drift = findMismatch(sealed.verify, "on_time_drift");
    expect(drift.emitted_value).toBe(12);
    expect(drift.expected_value).toBe(8);
  });
});
