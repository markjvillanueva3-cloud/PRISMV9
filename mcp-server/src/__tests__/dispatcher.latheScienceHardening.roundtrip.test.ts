/**
 * dispatcher.latheScienceHardening.roundtrip.test.ts — U-OSC-SCIENCE-ROUNDTRIP
 * ===========================================================================
 * FUNCTIONAL round-trip coverage for the 9 LATHE-MS7 physics/science-hardening
 * actions on the real `prism_turning` dispatcher (turningDispatcher.ts:924-983,
 * engine LatheScienceHardeningEngine.ts):
 *   - lathe_chatter_analysis → analyzeTurningChatter   (workpiece SLD stiffness)
 *   - lathe_hard_turning     → analyzeHardTurning       (white layer / residual σ)
 *   - lathe_thread_schedule  → generateThreadPassSchedule (√-progression infeed)
 *   - lathe_drill_thrust     → checkDrillThrust          (Kienzle thrust vs quill)
 *   - lathe_parting_force    → partingForceMultiplier    (1.25× tangential)
 *   - lathe_beam_deflection  → calculateBeamDeflection   (cantilever F·a²(3L−a)/6EI)
 *   - lathe_chip_breaking    → chipBreakingOscillation    (ISO P/M feed spike)
 *   - lathe_peck_schedule    → generateDecreasingPeckSchedule (0.8× decay)
 *   - lathe_bore_dwell       → boreDwell                  (G04 by ISO group)
 *
 * WHY THIS EXISTS (R15 gap): `lathe-science-hardening.test.ts` covers the engine
 * directly (singleton import) — nothing drives these 9 actions THROUGH the real
 * dispatcher handler. This suite pins reference values recomputed from the engine
 * formulas so the wired handler path (param mapping + slimResponse envelope) is
 * proven numerically correct end-to-end. Same contract as the sibling collision
 * round-trip: no {success,data} wrapper (parsed body IS the raw engine object),
 * slimResponse strips empty arrays (read via `?? []`), these actions have no Zod
 * schema (pass-through unvalidated), and JSON serializes Infinity/NaN → null.
 *
 * PHYSICS FIXES LANDED (U-OSC-CHATTER-SLD-FIX, 2026-07-04 — both defects below were
 * found by this round-trip, physics-reviewer-CONFIRMED, then CORRECTED in the engine):
 *   (A) FIXED — max_stable_doc_mm was stiffness/(2·kc·overlap·1000): the ÷1000 made b_lim
 *       ~1000× too small (~0.006 mm). Now uses the Altintas–Budak SDOF absolute limit
 *       b_lim = 2·k·ζ·(1+ζ)/Kc (ζ = workpiece damping, Kc from CANONICAL_KIENZLE), which
 *       for the 50×200 mm steel bar gives a physical ~0.97 mm. Assertions now pin the
 *       CORRECT value.
 *   (B) FIXED — fn was (1/2π)·√(k/(m·1000)) (inverted unit conversion → ~0.45 Hz) and also
 *       lumped the FULL bar mass. Now (1/2π)·√(k·1000/m_eff) with the effective modal mass
 *       (0.243·m cantilever / 0.5·m simply supported). A slender L/D=10 bar → fn≈242 Hz and
 *       populated resonance zones (~2.9-7.3k RPM); a stiffer L/D=4 bar → fn≈907 Hz with
 *       resonances above the lathe range (correctly empty). The zone assertion now verifies
 *       the engine warns of resonance instead of the always-empty artifact.
 *   Engine fix + this test update ship together; the earlier regression-lock caught the
 *   fix as the intentional change it was meant to (R9/R12). See reference_chatter_sld_fn_defects.
 *
 * @milestone LATHE-MS7
 * @unit U-OSC-SCIENCE-ROUNDTRIP
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return { tools, tool(name, _desc, _schema, handler) { tools.push({ name, handler }); } };
}

async function invoke(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as { content?: Array<{ text?: string }> };
  if (Array.isArray(res.content)) {
    return JSON.parse(res.content[0]?.text ?? "null") as Record<string, unknown>;
  }
  return res as unknown as Record<string, unknown>;
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

// ── 1. lathe_parting_force (F_parting = 1.25 · F_tangential) ───────────────────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_parting_force", () => {
  it("800 N tangential → 1000 N parting force at 1.25× multiplier", async () => {
    const r = await invoke(turningHandler, "lathe_parting_force", { straight_turning_force_N: 800 });
    expect(r.parting_force_N).toBe(1000);
    expect(r.multiplier).toBe(1.25);
    expect(String(r.recommendation)).toContain("1.25");
  });

  it("default 500 N → 625 N parting", async () => {
    const r = await invoke(turningHandler, "lathe_parting_force", {});
    expect(r.parting_force_N).toBe(625);
  });
});

// ── 2. lathe_bore_dwell (G04 by ISO group) ────────────────────────────────────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_bore_dwell", () => {
  it("ISO S → 0.8 s dwell, recommends G04 P800", async () => {
    const r = await invoke(turningHandler, "lathe_bore_dwell", { iso_group: "S" });
    expect(r.dwell_sec).toBe(0.8);
    expect(r.iso_group).toBe("S");
    expect(String(r.recommendation)).toContain("P800");
  });

  it("ISO P → 0.3 s; unknown group falls back to 0.3 s", async () => {
    expect((await invoke(turningHandler, "lathe_bore_dwell", { iso_group: "P" })).dwell_sec).toBe(0.3);
    expect((await invoke(turningHandler, "lathe_bore_dwell", { iso_group: "ZZ" })).dwell_sec).toBe(0.3);
  });
});

// ── 3. lathe_chip_breaking (ISO P/M continuous chip → oscillation) ─────────────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_chip_breaking", () => {
  it("ISO P (steel) → oscillation recommended, 1.5× spike every 7 revs", async () => {
    const r = await invoke(turningHandler, "lathe_chip_breaking", { iso_group: "P", feed_mm_rev: 0.2 });
    expect(r.oscillation_recommended).toBe(true);
    expect(r.spike_feed_factor).toBe(1.5);
    expect(r.spike_interval_revs).toBe(7);
  });

  it("ISO K (cast iron, discontinuous chip) → no oscillation needed", async () => {
    const r = await invoke(turningHandler, "lathe_chip_breaking", { iso_group: "K", feed_mm_rev: 0.2 });
    expect(r.oscillation_recommended).toBe(false);
    expect(String(r.recommendation).toLowerCase()).toContain("no oscillation");
  });
});

// ── 4. lathe_thread_schedule (constant-chip-area √-progression) ────────────────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_thread_schedule", () => {
  it("6-pass √-progression: infeed decreases, cumulative telescopes to total depth", async () => {
    const r = await invoke(turningHandler, "lathe_thread_schedule", {
      thread_depth_mm: 0.92, pitch_mm: 1.5, passes: 6, method: "constant_chip_area",
    });
    const passes = r.passes as Array<{ pass: number; infeed_mm: number; cumulative_mm: number }>;
    expect(passes.length).toBe(6);
    expect(passes[0].pass).toBe(1);
    // √-progression: first infeed 0.92·(1−0)/√6 ≈ 0.37559, decreasing thereafter
    expect(passes[0].infeed_mm).toBeCloseTo(0.375588, 5);
    expect(passes[0].infeed_mm).toBeGreaterThan(passes[5].infeed_mm);
    // Σ(√n−√(n−1)) = √6 → cumulative telescopes exactly to total depth
    expect(passes[5].cumulative_mm).toBeCloseTo(0.92, 5);
    expect(r.spring_passes).toBe(2);
    expect(r.total_depth_mm).toBe(0.92);
  });
});

// ── 5. lathe_drill_thrust (Kienzle thrust vs tailstock capacity) ───────────────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_drill_thrust", () => {
  const BASE = { drill_diameter_mm: 10, feed_per_rev_mm: 0.15, point_angle_deg: 118, kc1_1: 1800, mc: 0.25 };

  it("Ff = 0.5·kc·(D/2)·f^(1−mc)·sin(θ/2) ≈ 929.7 N; no tailstock → safe, ratio → null", async () => {
    const r = await invoke(turningHandler, "lathe_drill_thrust", { ...BASE });
    // 0.5·1800·5·0.15^0.75·sin(59°) = 4500·0.241029·0.857167 ≈ 929.67 N
    expect(r.thrust_force_N as number).toBeCloseTo(929.67, 1);
    expect(r.tailstock_force_N).toBe(0);
    expect(r.safe).toBe(true); // no tailstock engaged → not gated on ratio
    expect(r.safety_ratio).toBeNull(); // Infinity → null across the JSON boundary
  });

  it("ample tailstock 2000 N → safe, ratio ≈ 2.15", async () => {
    const r = await invoke(turningHandler, "lathe_drill_thrust", { ...BASE, tailstock_force_N: 2000 });
    expect(r.safe).toBe(true);
    expect(r.safety_ratio as number).toBeCloseTo(2.15, 1);
  });

  it("marginal tailstock 1000 N < thrust/0.8 → UNSAFE (thrust exceeds 80% capacity)", async () => {
    const r = await invoke(turningHandler, "lathe_drill_thrust", { ...BASE, tailstock_force_N: 1000 });
    expect(r.safe).toBe(false);
    expect(String(r.recommendation)).toContain("exceeds 80%");
  });
});

// ── 6. lathe_beam_deflection (cantilever workpiece at tool point) ──────────────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_beam_deflection", () => {
  it("cantilever δ = F·a²(3L−a)/6EI ≈ 0.04990 mm; max = FL³/3EI ≈ 0.15968 mm; out of 0.05 tol", async () => {
    const r = await invoke(turningHandler, "lathe_beam_deflection", {
      diameter_mm: 30, length_mm: 200, support_type: "cantilever",
      material_E_GPa: 210, cutting_force_N: 500, tool_z_mm: 100, tolerance_mm: 0.05,
    });
    // I = π·30⁴/64 = 39760.78 mm⁴; δ = 500·100²·(600−100)/(6·210000·I) ≈ 0.049902 mm
    expect(r.deflection_mm as number).toBeCloseTo(0.04990, 4);
    expect(r.max_deflection_mm as number).toBeCloseTo(0.15968, 4);
    expect(r.within_tolerance).toBe(false); // 0.0499 > tol/2 = 0.025
  });

  it("PHYSICS INVARIANT: deflection grows with tool overhang position (a)", async () => {
    const near = await invoke(turningHandler, "lathe_beam_deflection", {
      diameter_mm: 30, length_mm: 200, support_type: "cantilever",
      material_E_GPa: 210, cutting_force_N: 500, tool_z_mm: 50,
    });
    const far = await invoke(turningHandler, "lathe_beam_deflection", {
      diameter_mm: 30, length_mm: 200, support_type: "cantilever",
      material_E_GPa: 210, cutting_force_N: 500, tool_z_mm: 150,
    });
    expect(far.deflection_mm as number).toBeGreaterThan(near.deflection_mm as number);
  });

  it("large diameter (60 mm, 1/d⁴ stiffer) → deflection within tolerance", async () => {
    const r = await invoke(turningHandler, "lathe_beam_deflection", {
      diameter_mm: 60, length_mm: 200, support_type: "cantilever",
      material_E_GPa: 210, cutting_force_N: 500, tool_z_mm: 100, tolerance_mm: 0.05,
    });
    expect(r.within_tolerance).toBe(true);
  });
});

// ── 7. lathe_chatter_analysis (workpiece SLD stiffness) ────────────────────────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_chatter_analysis", () => {
  const BASE = {
    workpiece_diameter_mm: 50, workpiece_length_mm: 200, workpiece_material: "steel",
    cutting_speed_m_min: 150, depth_of_cut_mm: 2, spindle_rpm: 1000,
  };

  it("chuck-only cantilever stiffness k = 3EI/L³ ≈ 24160 N/mm; SDOF b_lim ≈ 0.97 mm < DOC 2 mm → not stable", async () => {
    const r = await invoke(turningHandler, "lathe_chatter_analysis", { ...BASE, support_type: "chuck_only" });
    // I = π·50⁴/64 = 306796.16 mm⁴; k = 3·210000·I/200³ ≈ 24160.2 N/mm
    expect(r.workpiece_stiffness_N_mm as number).toBeCloseTo(24160.2, 0);
    // b_lim = 2·k·ζ·(1+ζ)/Kc = 2·24160.2·0.035·1.035/1800 ≈ 0.9724 mm (ζ=0.035 default, Kc=P 1800)
    expect(r.max_stable_doc_mm as number).toBeCloseTo(0.9724, 3);
    expect(r.stable).toBe(false); // DOC 2 mm > 0.97 mm → chatter risk (physically real for a 4:1 slender bar)
  });

  it("PHYSICS INVARIANT: chuck+tailstock (simply supported, 48EI/L³) is 16× stiffer than chuck-only (3EI/L³)", async () => {
    const cantilever = await invoke(turningHandler, "lathe_chatter_analysis", { ...BASE, support_type: "chuck_only" });
    const supported = await invoke(turningHandler, "lathe_chatter_analysis", { ...BASE, support_type: "chuck_tailstock" });
    const ratio = (supported.workpiece_stiffness_N_mm as number) / (cantilever.workpiece_stiffness_N_mm as number);
    expect(ratio).toBeCloseTo(16, 3); // 48/3 = 16
  });

  it("resonant critical_rpm_zones POPULATE for a slender L/D=10 bar (fn ≈ 242 Hz); 1000 RPM is clear", async () => {
    // Post-fix the fn unit + effective modal mass are correct, so resonance zones land in the
    // practical lathe band for a flexible bar. D30×L300 chuck-only: k≈928 N/mm, m_eff=0.243·m →
    // fn≈242 Hz → criticalRPM = fn·60/n gives lobes n=2..5 inside [100,10000] (~7259/4839/3629/2903
    // RPM). (A stiffer D50×L200 bar has fn≈907 Hz, so its resonances sit above 10 000 RPM and the
    // zone list is correctly empty — a high-frequency mode, not the old always-empty bug.)
    const r = await invoke(turningHandler, "lathe_chatter_analysis", {
      workpiece_diameter_mm: 30, workpiece_length_mm: 300, workpiece_material: "steel",
      support_type: "chuck_only", cutting_speed_m_min: 150, depth_of_cut_mm: 0.5, spindle_rpm: 1000,
    });
    const zones = (r.critical_rpm_zones as Array<{ min_rpm: number; max_rpm: number }> | undefined) ?? [];
    expect(zones.length).toBeGreaterThan(0);
    for (const z of zones) {
      expect(z.max_rpm).toBeGreaterThan(z.min_rpm);
      expect(1000 >= z.min_rpm && 1000 <= z.max_rpm).toBe(false); // 1000 RPM below the resonance band
    }
  });
});

// ── 8. lathe_hard_turning (white layer / residual stress / achievable Ra) ──────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_hard_turning", () => {
  it("negative rake CBN hard turn → compressive residual stress (fatigue-beneficial)", async () => {
    const r = await invoke(turningHandler, "lathe_hard_turning", {
      hardness_hrc: 60, cutting_speed_m_min: 120, feed_mm_rev: 0.08, depth_of_cut_mm: 0.15,
      tool_material: "CBN", rake_angle_deg: -6, tool_nose_radius_mm: 0.8,
    });
    // rake −6° → rakeStress = −300·(6/6) = −300; speedStress = (120/200−1)·200 = −80 → σ = −380 (compressive)
    expect(r.residual_stress_mpa as number).toBeCloseTo(-380, 0);
    expect(r.stress_type).toBe("compressive");
    expect(r.white_layer_depth_um as number).toBeGreaterThan(0);
    expect(r.achievable_Ra_um as number).toBeGreaterThan(0);
  });

  it("positive rake + high speed → tensile residual stress (fatigue-harmful)", async () => {
    const r = await invoke(turningHandler, "lathe_hard_turning", {
      hardness_hrc: 55, cutting_speed_m_min: 300, feed_mm_rev: 0.1, depth_of_cut_mm: 0.2,
      tool_material: "ceramic", rake_angle_deg: 5, tool_nose_radius_mm: 0.8,
    });
    // rake +5 → rakeStress = +150; speedStress = (300/200−1)·200 = +100 → σ = +250 (tensile)
    expect(r.residual_stress_mpa as number).toBeCloseTo(250, 0);
    expect(r.stress_type).toBe("tensile");
  });
});

// ── 9. lathe_peck_schedule (0.8× decreasing peck depth, min-peck floor) ────────
describe("U-OSC-SCIENCE-ROUNDTRIP — lathe_peck_schedule", () => {
  it("depth 30, first peck 5 → 5, 4, 3.2 … decaying; cumulative reaches exactly 30", async () => {
    const r = await invoke(turningHandler, "lathe_peck_schedule", { total_depth_mm: 30, first_peck_mm: 5 });
    const pecks = r.pecks as Array<{ peck_num: number; depth_mm: number; cumulative_mm: number }>;
    expect(pecks[0].depth_mm).toBe(5);
    expect(pecks[1].depth_mm).toBe(4);       // 5 · 0.8
    expect(pecks[2].depth_mm).toBeCloseTo(3.2, 5); // 4 · 0.8
    expect(pecks[2].depth_mm).toBeLessThan(pecks[1].depth_mm); // strictly decaying
    expect(pecks[pecks.length - 1].cumulative_mm).toBeCloseTo(30, 5); // reaches full depth
    expect(r.total_pecks).toBe(pecks.length);
    expect(pecks.every((p) => p.depth_mm <= 5)).toBe(true);
  });

  it("min-peck floor respected: no interior peck below 1.0 mm default (only final remainder may be)", async () => {
    const r = await invoke(turningHandler, "lathe_peck_schedule", { total_depth_mm: 30, first_peck_mm: 5 });
    const pecks = r.pecks as Array<{ depth_mm: number }>;
    // every peck except possibly the last (remainder) is ≥ the 1.0 mm floor
    const interior = pecks.slice(0, -1);
    expect(interior.every((p) => p.depth_mm >= 1.0)).toBe(true);
  });
});

// ── 10. Cross-cutting: reachability + not-blocked + garbage-input boundary ─────
describe("U-OSC-SCIENCE-ROUNDTRIP — dispatcher path integrity", () => {
  it("all 9 science-hardening actions return a real parseable body (functional, not source-grep)", async () => {
    const probes: Array<[string, Record<string, unknown>]> = [
      ["lathe_chatter_analysis", { workpiece_diameter_mm: 40, workpiece_length_mm: 150, workpiece_material: "steel", support_type: "chuck_only", cutting_speed_m_min: 120, depth_of_cut_mm: 1, spindle_rpm: 800 }],
      ["lathe_hard_turning", { hardness_hrc: 58, cutting_speed_m_min: 150, feed_mm_rev: 0.1, depth_of_cut_mm: 0.2, tool_material: "CBN", rake_angle_deg: -6 }],
      ["lathe_thread_schedule", { thread_depth_mm: 1.0, pitch_mm: 1.5, passes: 5, method: "constant_chip_area" }],
      ["lathe_drill_thrust", { drill_diameter_mm: 12, feed_per_rev_mm: 0.12, point_angle_deg: 118, kc1_1: 2100, mc: 0.25 }],
      ["lathe_parting_force", { straight_turning_force_N: 600 }],
      ["lathe_beam_deflection", { diameter_mm: 25, length_mm: 120, support_type: "cantilever", material_E_GPa: 210, cutting_force_N: 400, tool_z_mm: 60 }],
      ["lathe_chip_breaking", { iso_group: "M", feed_mm_rev: 0.15 }],
      ["lathe_peck_schedule", { total_depth_mm: 20, first_peck_mm: 4 }],
      ["lathe_bore_dwell", { iso_group: "H" }],
    ];
    for (const [action, params] of probes) {
      const r = await invoke(turningHandler, action, params);
      expect(r, `${action} returned null/empty`).toBeTruthy();
      expect((r as { blocked?: boolean }).blocked, `${action} was blocked`).not.toBe(true);
    }
  });

  it("garbage input (negative drill feed) degrades without throwing across the boundary", async () => {
    const r = await invoke(turningHandler, "lathe_drill_thrust", {
      drill_diameter_mm: 10, feed_per_rev_mm: -0.1, point_angle_deg: 118, kc1_1: 1800, mc: 0.25,
    });
    // f^(1−mc) of a negative base under a fractional power is NaN → NaN serializes to null
    expect(r).toBeTruthy();
    expect(r.thrust_force_N).toBeNull();
    expect(typeof r.safe).toBe("boolean"); // still a structured verdict, no throw
  });
});
