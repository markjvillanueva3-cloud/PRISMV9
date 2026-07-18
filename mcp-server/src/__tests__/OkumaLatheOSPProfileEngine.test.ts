/**
 * OkumaLatheOSPProfileEngine.test.ts
 * ====================================
 *
 * MIKE /goal session (2026-05-23) — vitest contract for the Okuma OSP-controller
 * capability profile + parameter recommendation engine.
 *
 * Locks the india HURCO-POST-REMEDIATION physics-gate pattern (Kienzle Fc /
 * Taylor T = (C/Vc)^(1/n) / stickout L/D) and the echo LATHE-P2P-CONSENSUS-MS4
 * consensus + Omega/S(x) safety-gate pattern.
 *
 * @milestone MIKE-OSP-PROFILE-MS0
 * @unit U-MIKE-OSP-PROFILE-ENGINE
 * @slot mike
 */

import { describe, it, expect } from "vitest";
import {
  OkumaLatheOSPProfileEngine,
  SafetyGateRejection,
  KienzleGateInputSchema,
  TaylorGateInputSchema,
  StickoutGateInputSchema,
  type ISOGroup,
  type LatheMachineDescriptor,
} from "../engines/OkumaLatheOSPProfileEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

// ============================================================================
// FIXTURES — the 7 JM-Die Okuma lathes
// ============================================================================

const JM_DIE_LATHES: LatheMachineDescriptor[] = [
  { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M",     controller_model: "OSP-P300L-R",  post_processor: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps",       enhancement_tier: "plain" },
  { machine_id: "LTH-02", machine_name: "Okuma GENOS L200E-M",    controller_model: "OSP-P200LA-R", post_processor: "OKUMA_GENOS_L200E_OSP-P200LA_PRISM.cps",        enhancement_tier: "plain" },
  { machine_id: "LTH-03", machine_name: "Okuma LNC8",             controller_model: "OSP-U10L",     post_processor: "OKUMA_LNC8_OSP-U10L_PRISM.cps",                 enhancement_tier: "plain" },
  { machine_id: "LTH-04", machine_name: "Okuma Crown L1060",      controller_model: "OSP-U10L",     post_processor: "OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps",          enhancement_tier: "plain" },
  { machine_id: "LTH-05", machine_name: "Okuma GENOS L400II-E",   controller_model: "OSP-P300LA-E", post_processor: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps",      enhancement_tier: "partially_enhanced" },
  { machine_id: "LTH-06", machine_name: "Okuma LB 3000EX",        controller_model: "OSP-P500",     post_processor: "OKUMA_LB3000EX_P500-Ai-Enhanced.cps",            enhancement_tier: "partially_enhanced" },
  { machine_id: "LTH-07", machine_name: "Okuma Multus B250II",    controller_model: "OSP-P300SA",   post_processor: "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps",     enhancement_tier: "fully_enhanced" },
];

// ============================================================================
// classifyController
// ============================================================================

describe("classifyController", () => {
  it("classifies each of the 7 JM-Die Okuma controllers", () => {
    const profiles = JM_DIE_LATHES.map((m) => OkumaLatheOSPProfileEngine.classifyController(m.controller_model));
    expect(profiles.filter((p) => p !== null)).toHaveLength(7);
  });

  it("LTH-07 (Multus P300SA) is generation 5 and imachining_capable", () => {
    const p = OkumaLatheOSPProfileEngine.classifyController("OSP-P300SA")!;
    expect(p.family).toBe("P300SA");
    expect(p.generation).toBe(5);
    expect(p.imachining_capable).toBe(true);
    expect(p.live_tooling_capable).toBe(true);
  });

  it("LTH-03/04 (U10L) is generation 1 legacy — NOT imachining_capable", () => {
    const p = OkumaLatheOSPProfileEngine.classifyController("OSP-U10L")!;
    expect(p.family).toBe("U10L");
    expect(p.generation).toBe(1);
    expect(p.imachining_capable).toBe(false);
    expect(p.ai_adaptive_feedrate_capable).toBe(false);
  });

  it("LTH-01 (P300L) is generation 4 with live tooling", () => {
    const p = OkumaLatheOSPProfileEngine.classifyController("OSP-P300L-R")!;
    expect(p.family).toBe("P300L");
    expect(p.generation).toBe(4);
    expect(p.live_tooling_capable).toBe(true);
  });

  it("returns null on non-Okuma controller string", () => {
    expect(OkumaLatheOSPProfileEngine.classifyController("FANUC-31i")).toBeNull();
    expect(OkumaLatheOSPProfileEngine.classifyController("")).toBeNull();
  });
});

// ============================================================================
// applyKienzleGate — INDIA pattern Group D
// ============================================================================

describe("applyKienzleGate", () => {
  it("Fc within bounds for steel + 1.5mm DOC + 0.15mm fz @ 5000N ceiling", () => {
    const r = OkumaLatheOSPProfileEngine.applyKienzleGate({
      iso_group: "P", ap_mm: 1.5, fz_mm: 0.15, max_force_N: 5000,
    });
    // Fc = 1800 * 1 * 0.15^(1-0.25) * 1.5 = 1800 * 0.15^0.75 * 1.5 ~= 643.7 N
    expect(r.fc_N).toBeGreaterThan(500);
    expect(r.fc_N).toBeLessThan(800);
    expect(r.within_bounds).toBe(true);
    expect(r.headroom_pct).toBeGreaterThan(80);
  });

  it("references CANONICAL_KIENZLE constants (no inlining)", () => {
    const r = OkumaLatheOSPProfileEngine.applyKienzleGate({
      iso_group: "M", ap_mm: 1.0, fz_mm: 0.1, max_force_N: 3000,
    });
    expect(r.kc1_1_used).toBe(CANONICAL_KIENZLE.M.kc1_1);
    expect(r.mc_used).toBe(CANONICAL_KIENZLE.M.mc);
  });

  it("flags exceeding force ceiling for aggressive hardened-steel cut", () => {
    const r = OkumaLatheOSPProfileEngine.applyKienzleGate({
      iso_group: "H", ap_mm: 5, fz_mm: 0.4, max_force_N: 1500,
    });
    expect(r.within_bounds).toBe(false);
    expect(r.headroom_pct).toBeLessThan(0);
  });

  it("R12 fail-loud: throws ZodError on out-of-range ap (>50mm)", () => {
    expect(() => OkumaLatheOSPProfileEngine.applyKienzleGate({
      iso_group: "P", ap_mm: 100, fz_mm: 0.15, max_force_N: 5000,
    })).toThrow();
  });

  it("R12 fail-loud: throws on negative max_force_N", () => {
    expect(() => OkumaLatheOSPProfileEngine.applyKienzleGate({
      iso_group: "P", ap_mm: 1.5, fz_mm: 0.15, max_force_N: -100,
    })).toThrow();
  });
});

// ============================================================================
// applyTaylorGate — INDIA pattern Group D
// ============================================================================

describe("applyTaylorGate", () => {
  it("references CANONICAL_TAYLOR constants (no inlining)", () => {
    const r = OkumaLatheOSPProfileEngine.applyTaylorGate({
      iso_group: "P", vc_m_min: 150, target_life_min: 30,
    });
    expect(r.C_used).toBe(CANONICAL_TAYLOR.P.C);
    expect(r.n_used).toBe(CANONICAL_TAYLOR.P.n);
  });

  it("steel @ Vc=150 hits target life in the 20..40 min band", () => {
    const r = OkumaLatheOSPProfileEngine.applyTaylorGate({
      iso_group: "P", vc_m_min: 150, target_life_min: 30,
    });
    // T = (350/150)^(1/0.25) = 2.333^4 ~= 29.66 min
    expect(r.predicted_life_min).toBeGreaterThan(20);
    expect(r.predicted_life_min).toBeLessThan(40);
  });

  it("flags tool life insufficient for too-high Vc", () => {
    const r = OkumaLatheOSPProfileEngine.applyTaylorGate({
      iso_group: "P", vc_m_min: 800, target_life_min: 30,
    });
    expect(r.ok).toBe(false);
    expect(r.life_margin_factor).toBeLessThan(1);
  });

  it("R12 fail-loud: throws on vc_m_min=0", () => {
    expect(() => OkumaLatheOSPProfileEngine.applyTaylorGate({
      iso_group: "P", vc_m_min: 0, target_life_min: 30,
    })).toThrow();
  });
});

// ============================================================================
// applyStickoutGate — INDIA pattern Group D
// ============================================================================

describe("applyStickoutGate", () => {
  it("L/D=2 classifies as rigid", () => {
    const r = OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 20, D_mm: 10 });
    expect(r.LD_ratio).toBe(2);
    expect(r.deflection_class).toBe("rigid");
    expect(r.ok).toBe(true);
  });

  it("L/D=5 classifies as compliant + cubic falloff applied", () => {
    const r = OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 50, D_mm: 10 });
    expect(r.LD_ratio).toBe(5);
    expect(r.deflection_class).toBe("compliant");
    // baseline 1000 at L/D=4 -> 1000 * (4/5)^3 = 512
    expect(r.recommended_max_force_N).toBeGreaterThan(500);
    expect(r.recommended_max_force_N).toBeLessThan(525);
  });

  it("L/D=8 classifies as excessive", () => {
    const r = OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 80, D_mm: 10 });
    expect(r.LD_ratio).toBe(8);
    expect(r.deflection_class).toBe("excessive");
    expect(r.ok).toBe(false);
  });

  it("custom max_LD_ratio overrides default 4.0", () => {
    const r = OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 60, D_mm: 10, max_LD_ratio: 8 });
    expect(r.LD_ratio).toBe(6);
    expect(r.ok).toBe(true);
  });
});

// ============================================================================
// consensusParameters — ECHO LATHE-P2P-CONSENSUS-MS4 pattern
// ============================================================================

describe("consensusParameters", () => {
  it("produces exactly 3 candidates (conservative / balanced / aggressive)", () => {
    const machine = JM_DIE_LATHES[6]!;
    const dialect = OkumaLatheOSPProfileEngine.classifyController(machine.controller_model)!;
    const stickout = OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 40, D_mm: 16 });
    const result = OkumaLatheOSPProfileEngine.consensusParameters("P", machine, dialect, stickout, 30);
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.map((c) => c.strategy)).toEqual(["conservative", "balanced", "aggressive"]);
  });

  it("Omega = mean candidate confidence; S(x) in [0, 1] on fully_enhanced + rigid stickout", () => {
    const machine = JM_DIE_LATHES[6]!;
    const dialect = OkumaLatheOSPProfileEngine.classifyController(machine.controller_model)!;
    const stickout = OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 30, D_mm: 16 });
    const result = OkumaLatheOSPProfileEngine.consensusParameters("N", machine, dialect, stickout, 20);
    const expectedOmega = result.candidates.reduce((s, c) => s + c.confidence, 0) / 3;
    expect(result.omega).toBeCloseTo(expectedOmega, 5);
    expect(result.sx).toBeGreaterThan(0);
    expect(result.sx).toBeLessThanOrEqual(1);
  });

  it("U10L legacy dialect produces LOWER S(x) than P300SA modern dialect (same material)", () => {
    const lth03 = JM_DIE_LATHES[2]!;
    const lth07 = JM_DIE_LATHES[6]!;
    const u10l = OkumaLatheOSPProfileEngine.classifyController(lth03.controller_model)!;
    const p300sa = OkumaLatheOSPProfileEngine.classifyController(lth07.controller_model)!;
    const stickout = OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 40, D_mm: 16 });
    const r1 = OkumaLatheOSPProfileEngine.consensusParameters("P", lth03, u10l, stickout, 30);
    const r2 = OkumaLatheOSPProfileEngine.consensusParameters("P", lth07, p300sa, stickout, 30);
    expect(r2.sx).toBeGreaterThan(r1.sx);
  });

  it("recommended candidate has the highest confidence among the 3", () => {
    const machine = JM_DIE_LATHES[6]!;
    const dialect = OkumaLatheOSPProfileEngine.classifyController(machine.controller_model)!;
    const stickout = OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 30, D_mm: 16 });
    const result = OkumaLatheOSPProfileEngine.consensusParameters("K", machine, dialect, stickout, 30);
    const maxConf = Math.max(...result.candidates.map((c) => c.confidence));
    expect(result.recommended.confidence).toBe(maxConf);
  });
});

// ============================================================================
// enforceSafetyGate — ECHO Omega/S(x) gate
// ============================================================================

describe("enforceSafetyGate", () => {
  it("PASS on shop_floor when omega>=0.95 + sx>=0.98", () => {
    expect(() => OkumaLatheOSPProfileEngine.enforceSafetyGate({ omega: 0.97, sx: 0.99 })).not.toThrow();
  });

  it("REJECT (throws SafetyGateRejection) on shop_floor when omega=0.94", () => {
    expect(() => OkumaLatheOSPProfileEngine.enforceSafetyGate({ omega: 0.94, sx: 0.99 })).toThrow(SafetyGateRejection);
  });

  it("REJECT (throws SafetyGateRejection) on shop_floor when sx=0.96", () => {
    expect(() => OkumaLatheOSPProfileEngine.enforceSafetyGate({ omega: 0.97, sx: 0.96 })).toThrow(SafetyGateRejection);
  });

  it("PASS on lab tier with omega=0.86 (relaxed threshold)", () => {
    expect(() => OkumaLatheOSPProfileEngine.enforceSafetyGate({ omega: 0.86, sx: 0.92, tier: "lab" })).not.toThrow();
  });

  it("SafetyGateRejection exposes the actual thresholds + actuals for the caller's audit log", () => {
    try {
      OkumaLatheOSPProfileEngine.enforceSafetyGate({ omega: 0.90, sx: 0.99 });
      throw new Error("Expected SafetyGateRejection but got no throw");
    } catch (e) {
      const err = e as SafetyGateRejection;
      expect(err.name).toBe("SafetyGateRejection");
      expect(err.omega_threshold).toBe(0.95);
      expect(err.sx_threshold).toBe(0.98);
      expect(err.omega).toBe(0.90);
      expect(err.sx).toBe(0.99);
    }
  });
});

// ============================================================================
// buildMaterialStickoutMatrix — user-named matrix
// ============================================================================

describe("buildMaterialStickoutMatrix", () => {
  it("enumerates every (material x stickout) cell with key shape `<ISO>_<L>x<D>`", () => {
    const machine = JM_DIE_LATHES[6]!;
    const dialect = OkumaLatheOSPProfileEngine.classifyController(machine.controller_model)!;
    const materials: ISOGroup[] = ["P", "M", "N"];
    const stickouts = [
      { L_mm: 25, D_mm: 16 },
      { L_mm: 50, D_mm: 16 },
    ];
    const matrix = OkumaLatheOSPProfileEngine.buildMaterialStickoutMatrix(machine, dialect, materials, stickouts);
    expect(Object.keys(matrix)).toHaveLength(materials.length * stickouts.length);
    expect(matrix.P_25x16!.candidates).toHaveLength(3);
    expect(matrix.M_50x16!.candidates).toHaveLength(3);
    expect(matrix.N_25x16!.candidates).toHaveLength(3);
  });

  it("each cell's recommended strategy is one of the three valid options", () => {
    const machine = JM_DIE_LATHES[0]!;
    const dialect = OkumaLatheOSPProfileEngine.classifyController(machine.controller_model)!;
    const matrix = OkumaLatheOSPProfileEngine.buildMaterialStickoutMatrix(
      machine, dialect, ["P"], [{ L_mm: 30, D_mm: 16 }],
    );
    const strategy = matrix.P_30x16!.recommended.strategy;
    expect(["conservative", "balanced", "aggressive"]).toContain(strategy);
  });
});

// ============================================================================
// Zod schema R12 fail-loud surface tests
// ============================================================================

describe("Zod input schemas (R12 fail-loud)", () => {
  it("KienzleGateInputSchema rejects negative ap_mm", () => {
    expect(() => KienzleGateInputSchema.parse({ iso_group: "P", ap_mm: -1, fz_mm: 0.1, max_force_N: 1000 })).toThrow();
  });
  it("TaylorGateInputSchema rejects vc=0", () => {
    expect(() => TaylorGateInputSchema.parse({ iso_group: "P", vc_m_min: 0, target_life_min: 30 })).toThrow();
  });
  it("StickoutGateInputSchema rejects D_mm=0", () => {
    expect(() => StickoutGateInputSchema.parse({ L_mm: 30, D_mm: 0 })).toThrow();
  });
});
