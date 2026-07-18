/**
 * dispatcher.latheCollisionZone.roundtrip.test.ts — U-OSC-COLLISION-ROUNDTRIP
 * ===========================================================================
 * FUNCTIONAL round-trip coverage for the 8 LATHE-MS0 collision-zone actions on
 * the real `prism_turning` dispatcher (turningDispatcher.ts:851-922):
 *   - lathe_collision_check   → LatheCollisionZoneEngine.checkAll
 *   - lathe_swing_check       → checkMachineSwing
 *   - lathe_grooving_overhang → checkGroovingOverhang
 *   - lathe_chip_thickness    → checkMinChipThickness
 *   - lathe_boring_reach      → checkBoringBarReach
 *   - lathe_g71_type          → detectG71Type
 *   - lathe_boring_taper_comp → calculateBoringTaperCompensation
 *   - lathe_springback_comp   → calculateSpringbackCompensation
 *
 * WHY THIS EXISTS (R15 gap): the companion `lathe-collision-zone.test.ts` covers
 * the engine directly (singleton import) and has a "dispatcher wiring" block —
 * but that block only `fs.readFileSync`-greps the dispatcher SOURCE for the
 * action-name strings. A source grep passes even if the handler body is broken,
 * mis-maps params, or the slimResponse envelope mangles the shape. This suite
 * drives each action THROUGH the dispatcher handler and pins reference values
 * derived from the engine's own published formulas, proving the wired path is
 * numerically correct end-to-end — the R15 "round-trip through the dispatcher,
 * not just the singleton" criterion. Safety-critical: these actions gate
 * turret-index / swing / boring-reach crash avoidance.
 *
 * CONTRACT NOTES (verified against the live handler, not assumed):
 *   - These 8 actions have NO Zod schema in MERGED_TURNING_SCHEMAS, so
 *     validateActionParams passes params through UNVALIDATED (schemaMissing);
 *     engine `?? default` fallbacks apply for anything omitted.
 *   - The handler falls through to `JSON.stringify(slimResponse(result))` with
 *     NO {success,data} wrapper (unlike the workholding actions) — so the parsed
 *     body IS the raw engine object. slimResponse STRIPS empty arrays, so a
 *     fully-safe checkAll drops `warnings`/`critical_errors` and a Type-I
 *     detectG71Type drops `reversal_indices`; assertions read them via `?? []`.
 *   - paramNormalizer is additive (keeps snake_case originals) and only maps a
 *     fixed ~50-key top-level alias set, so nested workpiece/turret/machine
 *     keys reach the engine intact.
 *
 * @milestone LATHE-MS0
 * @unit U-OSC-COLLISION-ROUNDTRIP
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
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

/** Invoke the dispatcher and return the parsed slimResponse body (raw engine object). */
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

// Shared fixtures (mirror lathe-collision-zone.test.ts so direct + round-trip agree)
const TURRET = { station_count: 12, turret_radius_mm: 150, tool_protrusions_mm: [40, 50, 60] };
const WORKPIECE = { part_od_mm: 50, part_length_mm: 100, bar_stock_od_mm: 52, chuck_jaw_protrusion_mm: 15 };
const MACHINE = { max_swing_diameter_mm: 400, tailstock_engaged: false };

// ── 1. lathe_swing_check ──────────────────────────────────────────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — lathe_swing_check", () => {
  it("part fits → clearance = maxSwing − (OD + 2·jaw) = 400 − 82 = 318, info", async () => {
    const r = await invoke(turningHandler, "lathe_swing_check", { workpiece: WORKPIECE, machine: MACHINE });
    // effectiveOD = max(50,52) = 52; needed = 52 + 2·15 = 82; clearance = 400 − 82 = 318
    expect(r.passed).toBe(true);
    expect(r.clearance_mm).toBe(318);
    expect(r.severity).toBe("info");
    expect(r.check_type).toBe("machine_swing");
  });

  it("oversize part → SWING EXCEEDED, clearance = 300 − 410 = −110, critical", async () => {
    const r = await invoke(turningHandler, "lathe_swing_check", {
      workpiece: { ...WORKPIECE, part_od_mm: 380, bar_stock_od_mm: 380 },
      machine: { max_swing_diameter_mm: 300 },
    });
    expect(r.passed).toBe(false);
    expect(r.clearance_mm).toBe(-110);
    expect(r.severity).toBe("critical");
    expect(String(r.description)).toContain("SWING EXCEEDED");
  });
});

// ── 2. lathe_collision_check (checkAll) ───────────────────────────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — lathe_collision_check", () => {
  it("well-retracted scenario → safe, retract X=512 (2·256) Z=105, no critical errors", async () => {
    const r = await invoke(turningHandler, "lathe_collision_check", {
      turret: TURRET, workpiece: WORKPIECE, machine: MACHINE,
      current_station: 1, target_station: 4, current_x_mm: 600,
    });
    expect(r.safe).toBe(true);
    expect(Array.isArray(r.checks)).toBe(true);
    // swing + jaw + turret-index (target+current present) ≥ 3 checks
    expect((r.checks as unknown[]).length).toBeGreaterThanOrEqual(3);
    // safe retract X (diameter): max(partR26+jaw15+MIN_X10=51, swing210+26+15+SAFETY5=256)·2 = 512
    expect(r.safe_retract_x_mm).toBe(512);
    // safe retract Z: part_length 100 + SAFETY 5 = 105
    expect(r.safe_retract_z_mm).toBe(105);
    // fully safe → slimResponse strips empty warnings/critical_errors
    expect(((r.critical_errors as string[] | undefined) ?? []).length).toBe(0);
  });

  it("machine swing too small → NOT safe, at least one critical error surfaced", async () => {
    const r = await invoke(turningHandler, "lathe_collision_check", {
      turret: TURRET,
      workpiece: { ...WORKPIECE, bar_stock_od_mm: 350 },
      machine: { max_swing_diameter_mm: 300 },
    });
    expect(r.safe).toBe(false);
    expect(((r.critical_errors as string[] | undefined) ?? []).length).toBeGreaterThan(0);
  });
});

// ── 3. lathe_grooving_overhang ────────────────────────────────────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — lathe_grooving_overhang", () => {
  it("grooving 30/3 = 10× > 8 limit → unsafe", async () => {
    const r = await invoke(turningHandler, "lathe_grooving_overhang", {
      tool_type: "grooving", tool_stickout_mm: 30, blade_width_mm: 3,
    });
    expect(r.safe).toBe(false);
    expect(r.overhang_ratio).toBe(10);
    expect(r.max_ratio).toBe(8);
  });

  it("parting uses stricter 6× limit: 21/3 = 7× > 6 → unsafe", async () => {
    const r = await invoke(turningHandler, "lathe_grooving_overhang", {
      tool_type: "parting", tool_stickout_mm: 21, blade_width_mm: 3,
    });
    expect(r.safe).toBe(false);
    expect(r.max_ratio).toBe(6);
  });

  it("grooving within limit: 20/4 = 5× ≤ 8 → safe", async () => {
    const r = await invoke(turningHandler, "lathe_grooving_overhang", {
      tool_type: "grooving", tool_stickout_mm: 20, blade_width_mm: 4,
    });
    expect(r.safe).toBe(true);
    expect(r.overhang_ratio).toBe(5);
  });
});

// ── 4. lathe_chip_thickness (rubbing detection) ───────────────────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — lathe_chip_thickness", () => {
  it("very low feed → RUBBING: h = 0.005·sin(95°) ≈ 0.004981 < 0.012 threshold", async () => {
    const r = await invoke(turningHandler, "lathe_chip_thickness", {
      feed_per_rev_mm: 0.005, approach_angle_deg: 95, edge_radius_mm: 0.04,
    });
    expect(r.cutting).toBe(false);
    expect(r.chip_thickness_mm as number).toBeCloseTo(0.004981, 5);
    expect(r.threshold_mm).toBeCloseTo(0.012, 6); // 0.04 · RUBBING_FACTOR 0.3
    expect(String(r.recommendation)).toContain("RUBBING");
  });

  it("normal feed → cutting: h = 0.15·sin(95°) ≈ 0.14943 ≥ 0.006 threshold", async () => {
    const r = await invoke(turningHandler, "lathe_chip_thickness", {
      feed_per_rev_mm: 0.15, approach_angle_deg: 95, edge_radius_mm: 0.02,
    });
    expect(r.cutting).toBe(true);
    expect(r.chip_thickness_mm as number).toBeGreaterThan(r.threshold_mm as number);
    expect(r.chip_thickness_mm as number).toBeCloseTo(0.149429, 5);
  });
});

// ── 5. lathe_boring_reach ─────────────────────────────────────────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — lathe_boring_reach", () => {
  it("steel bar L/D = 80/16 = 5 > 4 limit → not reachable", async () => {
    const r = await invoke(turningHandler, "lathe_boring_reach", {
      bore_diameter_mm: 25, bar_diameter_mm: 16, bar_material: "steel", bore_depth_mm: 80,
    });
    expect(r.reachable).toBe(false);
    expect(r.ld_ratio).toBe(5);
    expect(r.max_ld).toBe(4);
    expect((r.warnings as string[]).length).toBeGreaterThan(0);
  });

  it("carbide bar L/D = 88/16 = 5.5 ≤ 6 limit → reachable", async () => {
    const r = await invoke(turningHandler, "lathe_boring_reach", {
      bore_diameter_mm: 25, bar_diameter_mm: 16, bar_material: "carbide", bore_depth_mm: 88,
    });
    expect(r.reachable).toBe(true);
    expect(r.ld_ratio).toBe(5.5);
    expect(r.max_ld).toBe(6);
  });
});

// ── 6. lathe_g71_type ─────────────────────────────────────────────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — lathe_g71_type", () => {
  it("monotonic-decreasing X profile → Type I, no reversals", async () => {
    const r = await invoke(turningHandler, "lathe_g71_type", {
      profile: [{ x: 52, z: 0 }, { x: 50, z: -10 }, { x: 45, z: -30 }, { x: 40, z: -60 }],
    });
    expect(r.type).toBe("I");
    expect(r.x_monotonic).toBe(true);
    // slimResponse strips the empty reversal_indices array
    expect(((r.reversal_indices as number[] | undefined) ?? []).length).toBe(0);
  });

  it("X-reversing (undercut) profile → Type II REQUIRED", async () => {
    const r = await invoke(turningHandler, "lathe_g71_type", {
      profile: [{ x: 52, z: 0 }, { x: 45, z: -20 }, { x: 50, z: -30 }, { x: 40, z: -50 }],
    });
    expect(r.type).toBe("II");
    expect(r.x_monotonic).toBe(false);
    expect((r.reversal_indices as number[]).length).toBeGreaterThan(0);
    expect(String(r.recommendation)).toContain("MUST use G71 Type II");
  });
});

// ── 7. lathe_boring_taper_comp (cantilever δ = F·L³/3EI) ───────────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — lathe_boring_taper_comp", () => {
  it("steel bar → array of z-points, zero at root, counter-taper (−) at tip", async () => {
    const r = (await invoke(turningHandler, "lathe_boring_taper_comp", {
      bar_diameter_mm: 16, bar_material: "steel", bore_depth_mm: 60, cutting_force_N: 300, num_z_points: 5,
    })) as unknown as Array<{ z_mm: number; deflection_mm: number; compensation_mm: number }>;
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(6); // i = 0..5
    expect(r[0].deflection_mm).toBe(0);
    expect(r[0].compensation_mm).toBe(0);
    // tip: I = π·16⁴/64 = 3216.99 mm⁴; δ = 300·60³/(3·210000·3216.99) ≈ 0.031973 mm
    expect(r[5].deflection_mm).toBeCloseTo(0.031973, 5);
    expect(r[5].compensation_mm).toBeCloseTo(-0.031973, 5); // program opposite (counter-taper)
  });

  it("carbide (E=600 GPa) deflects less than steel (E=210 GPa) at the tip", async () => {
    const steel = (await invoke(turningHandler, "lathe_boring_taper_comp", {
      bar_diameter_mm: 16, bar_material: "steel", bore_depth_mm: 60, cutting_force_N: 300, num_z_points: 4,
    })) as unknown as Array<{ deflection_mm: number }>;
    const carbide = (await invoke(turningHandler, "lathe_boring_taper_comp", {
      bar_diameter_mm: 16, bar_material: "carbide", bore_depth_mm: 60, cutting_force_N: 300, num_z_points: 4,
    })) as unknown as Array<{ deflection_mm: number }>;
    expect(carbide[carbide.length - 1].deflection_mm).toBeLessThan(steel[steel.length - 1].deflection_mm);
  });
});

// ── 8. lathe_springback_comp ──────────────────────────────────────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — lathe_springback_comp", () => {
  it("steel bar → springback = F·L³/3EI ≈ 0.01850 mm (within [0.005,0.05] clamp)", async () => {
    const r = await invoke(turningHandler, "lathe_springback_comp", {
      bar_diameter_mm: 16, bar_material: "steel", depth_of_cut_mm: 0.5, overhang_mm: 50, cutting_force_N: 300,
    });
    // δ = 300·50³/(3·210000·3216.99) ≈ 0.018502 mm
    expect(r.springback_mm as number).toBeCloseTo(0.018502, 5);
    expect(r.compensation_mm as number).toBeCloseTo(0.018502, 5); // inside clamp → passes through
    expect(String(r.recommendation)).toContain("smaller");
  });

  it("tiny force → springback clamped UP to the 0.005 mm practical floor", async () => {
    const r = await invoke(turningHandler, "lathe_springback_comp", {
      bar_diameter_mm: 25, bar_material: "carbide", depth_of_cut_mm: 0.2, overhang_mm: 20, cutting_force_N: 50,
    });
    // raw springback is far below 0.005 → clamped to the floor
    expect(r.compensation_mm).toBe(0.005);
    expect(r.springback_mm as number).toBeLessThan(0.005);
  });
});

// ── 9. Cross-cutting: reachability + not-blocked + adversarial ─────────────────
describe("U-OSC-COLLISION-ROUNDTRIP — dispatcher path integrity", () => {
  it("all 8 collision actions return a real parseable body (functional, not source-grep)", async () => {
    const probes: Array<[string, Record<string, unknown>]> = [
      ["lathe_collision_check", { turret: TURRET, workpiece: WORKPIECE, machine: MACHINE }],
      ["lathe_swing_check", { workpiece: WORKPIECE, machine: MACHINE }],
      ["lathe_grooving_overhang", { tool_type: "grooving", tool_stickout_mm: 20, blade_width_mm: 4 }],
      ["lathe_chip_thickness", { feed_per_rev_mm: 0.1, approach_angle_deg: 90, edge_radius_mm: 0.02 }],
      ["lathe_boring_reach", { bore_diameter_mm: 25, bar_diameter_mm: 16, bore_depth_mm: 50 }],
      ["lathe_g71_type", { profile: [{ x: 50, z: 0 }, { x: 45, z: -10 }] }],
      ["lathe_boring_taper_comp", { bar_diameter_mm: 16, bore_depth_mm: 50, cutting_force_N: 400 }],
      ["lathe_springback_comp", { bar_diameter_mm: 16, overhang_mm: 40, cutting_force_N: 400 }],
    ];
    for (const [action, params] of probes) {
      const r = await invoke(turningHandler, action, params);
      expect(r, `${action} returned null/empty`).toBeTruthy();
      // must NOT be blocked by the pre-calculation safety hook (benign geometry)
      expect((r as { blocked?: boolean }).blocked, `${action} was blocked`).not.toBe(true);
    }
  });

  it("empty params → engine defaults keep the action safe (no throw across the boundary)", async () => {
    // No schema on these actions; the handler + engine `?? default` fallbacks must
    // still produce a structured result rather than throwing across the dispatcher.
    const r = await invoke(turningHandler, "lathe_chip_thickness", {});
    expect(r).toBeTruthy();
    expect(typeof r.cutting).toBe("boolean"); // defaults: feed 0.1, kr 95°, edge 0.02
  });

  it("adversarial: g71 with a single point defaults to Type I (too short to reverse)", async () => {
    const r = await invoke(turningHandler, "lathe_g71_type", { profile: [{ x: 50, z: 0 }] });
    expect(r.type).toBe("I");
    expect(String(r.recommendation).toLowerCase()).toContain("short");
  });
});

// ── 10. Adversarial garbage input — schema-less boundary contract ──────────────
// These actions have NO Zod schema (validateActionParams pass-through), so the
// dispatcher CANNOT reject a bad payload — the engines must degrade gracefully
// rather than throw across the MCP boundary or emit a crash-inducing value. This
// block pins that actual contract (safety-critical: a thrown/undefined result
// from a collision check is worse than a conservative one). Behaviors here were
// verified against the live handler, not assumed.
describe("U-OSC-COLLISION-ROUNDTRIP — adversarial garbage input", () => {
  it("negative feed → no throw; chip is negative → cutting=false (conservative)", async () => {
    const r = await invoke(turningHandler, "lathe_chip_thickness", {
      feed_per_rev_mm: -0.1, approach_angle_deg: 90, edge_radius_mm: 0.02,
    });
    expect(r).toBeTruthy();
    expect(r.cutting).toBe(false);
    expect(r.chip_thickness_mm as number).toBeLessThan(0);
  });

  it("NaN feed → no throw; NaN silently serializes to null across the MCP boundary", async () => {
    // Documents a real hazard: NaN → JSON null. A downstream consumer must not
    // read a null chip thickness as a valid 0. cutting stays false (NaN >= t is false).
    const r = await invoke(turningHandler, "lathe_chip_thickness", {
      feed_per_rev_mm: NaN, approach_angle_deg: 90, edge_radius_mm: 0.02,
    });
    expect(r.cutting).toBe(false);
    expect(r.chip_thickness_mm).toBeNull();
  });

  it("negative cutting force → springback clamped UP to the 0.005 mm floor (never negative comp)", async () => {
    const r = await invoke(turningHandler, "lathe_springback_comp", {
      bar_diameter_mm: 16, bar_material: "steel", depth_of_cut_mm: 0.5, overhang_mm: 50, cutting_force_N: -300,
    });
    expect(r.springback_mm as number).toBeLessThan(0); // raw sign follows force
    expect(r.compensation_mm).toBe(0.005);             // but the programmed comp never goes < floor
  });

  it("negative bore depth → no throw; still returns a structured boolean verdict", async () => {
    const r = await invoke(turningHandler, "lathe_boring_reach", {
      bore_diameter_mm: 25, bar_diameter_mm: 16, bore_depth_mm: -50,
    });
    expect(r).toBeTruthy();
    expect(typeof r.reachable).toBe("boolean");
  });
});
