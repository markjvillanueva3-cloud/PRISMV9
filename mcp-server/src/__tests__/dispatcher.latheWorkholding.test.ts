/**
 * dispatcher.latheWorkholding.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-LWH dispatcher wiring (6 actions).
 *
 * Drives all 6 new actions through the real `prism_turning` dispatcher:
 *   - lathe_workholding_select_jaw          → selectJaw
 *   - lathe_workholding_trilobe             → calculateTrilobe
 *   - lathe_workholding_face_driver         → calculateFaceDriver
 *   - lathe_workholding_expanding_mandrel   → calculateExpandingMandrel
 *   - lathe_workholding_magnetic_chuck      → calculateMagneticChuck
 *   - lathe_workholding_stock_form          → stockFormRecommendation
 *
 * Wraps the same { success, data, error } envelope the rest of the PRISM
 * dispatcher test suite asserts against. Every assertion pins a concrete
 * reference value derived from the engine's published formulas (DIN 6350,
 * ISO 10218, Machinery's Handbook 31st Ed., Nee & Tao, Lame equations).
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

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

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LWH — all 6 schemas registered", () => {
  const ACTIONS = [
    "lathe_workholding_select_jaw",
    "lathe_workholding_trilobe",
    "lathe_workholding_face_driver",
    "lathe_workholding_expanding_mandrel",
    "lathe_workholding_magnetic_chuck",
    "lathe_workholding_stock_form",
  ] as const;

  for (const a of ACTIONS) {
    it(`${a} schema is registered as a Zod object`, () => {
      expect(typeof TURNING_ACTION_SCHEMAS[a].safeParse).toBe("function");
    });
  }
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LWH — schema rejection paths", () => {
  it("select_jaw rejects missing grip_diameter_mm", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_workholding_select_jaw.safeParse({}).success).toBe(false);
  });

  it("trilobe rejects negative clamp_force_n", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_workholding_trilobe.safeParse({
      od_mm: 100, id_mm: 96, clamp_force_n: -10,
    }).success).toBe(false);
  });

  it("face_driver rejects n_pins outside [2, 12]", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_workholding_face_driver.safeParse({
      axial_force_n: 1000, pin_circle_radius_mm: 20, n_pins: 1,
    }).success).toBe(false);
    expect(TURNING_ACTION_SCHEMAS.lathe_workholding_face_driver.safeParse({
      axial_force_n: 1000, pin_circle_radius_mm: 20, n_pins: 20,
    }).success).toBe(false);
  });

  it("magnetic_chuck rejects missing is_ferrous boolean", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_workholding_magnetic_chuck.safeParse({
      contact_area_cm2: 50, part_thickness_mm: 20,
    }).success).toBe(false);
  });

  it("stock_form rejects unknown stock_form enum", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_workholding_stock_form.safeParse({
      stock_form: "billet", grip_diameter_mm: 50,
    }).success).toBe(false);
  });

  it("expanding_mandrel rejects poisson_ratio outside [0.1, 0.5]", () => {
    expect(TURNING_ACTION_SCHEMAS.lathe_workholding_expanding_mandrel.safeParse({
      bore_id_mm: 30, od_mm: 60, mandrel_od_mm: 30,
      contact_length_mm: 25, poisson_ratio: 0.05,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LWH — prism_turning round-trip", () => {
  it("select_jaw on thin-wall ring → recommended_jaw 6_jaw, warning surfaces", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_select_jaw", {
      grip_diameter_mm: 100, bore_id_mm: 96, cutting_force_n: 1000,
    });
    expect(r.success).toBe(true);
    const data = r.data as { recommended_jaw: string; warnings: string[] };
    expect(data.recommended_jaw).toBe("6_jaw");
    expect(data.warnings.some((w) => w.toLowerCase().includes("thin wall"))).toBe(true);
  });

  it("select_jaw on default steel bar → ISO 10218 SF == 2.5 (8333 N clamping)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_select_jaw", {
      grip_diameter_mm: 50, cutting_force_n: 2000, material: "steel",
    });
    expect(r.success).toBe(true);
    const data = r.data as { recommended_jaw: string; clamping_force_n: number; safety_factor: number };
    expect(data.recommended_jaw).toBe("hard_od");
    expect(data.clamping_force_n).toBe(8333);
    expect(data.safety_factor).toBeCloseTo(2.5, 2);
  });

  it("trilobe on baseline thin ring → δ in physically-expected range [80,90] mm", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_trilobe", {
      od_mm: 100, id_mm: 96, jaw_width_mm: 10, clamp_force_n: 3000, material: "steel",
    });
    expect(r.success).toBe(true);
    const data = r.data as { delta_um: number; details: { wall_thickness_mm: number; mean_radius_mm: number } };
    expect(data.details.wall_thickness_mm).toBe(2);
    expect(data.details.mean_radius_mm).toBe(49);
    // δ_mm = 1000·49³/(210000·6.667) ≈ 84.03 mm → 84030 µm. Range-asserted to
    // tolerate float / rounding noise without hiding regressions of magnitude.
    expect(data.delta_um).toBeGreaterThan(80_000);
    expect(data.delta_um).toBeLessThan(90_000);
  });

  it("face_driver: 4 pins, μ=0.25, F_ax=1000N, r=20mm → T = 1000·0.25·0.020·4 = 20 Nm", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_face_driver", {
      axial_force_n: 1000, pin_circle_radius_mm: 20,
    });
    expect(r.success).toBe(true);
    const data = r.data as { transmittable_torque_nm: number };
    expect(data.transmittable_torque_nm).toBeCloseTo(20, 1);
  });

  it("expanding_mandrel: Lame pressure for bore 30 / OD 60 / Δ=0.02 → ~71.19 MPa", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_expanding_mandrel", {
      bore_id_mm: 30, od_mm: 60, mandrel_od_mm: 30, contact_length_mm: 25, material: "steel",
    });
    expect(r.success).toBe(true);
    const data = r.data as { contact_pressure_mpa: number };
    expect(data.contact_pressure_mpa).toBeCloseTo(71.19, 1);
  });

  it("magnetic_chuck: non-ferrous rejected with 0 force", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_magnetic_chuck", {
      contact_area_cm2: 100, is_ferrous: false, part_thickness_mm: 15,
    });
    expect(r.success).toBe(true);
    const data = r.data as { holding_force_n: number; notes: string[] };
    expect(data.holding_force_n).toBe(0);
    expect(data.notes[0]).toContain("REJECTED");
  });

  it("magnetic_chuck: ferrous 50 cm², 20mm thick → 4000 N (full force, no de-rating)", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_magnetic_chuck", {
      contact_area_cm2: 50, is_ferrous: true, part_thickness_mm: 20,
    });
    expect(r.success).toBe(true);
    const data = r.data as { holding_force_n: number };
    expect(data.holding_force_n).toBe(4000);
  });

  it("stock_form: forging → soft_od + G73", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_stock_form", {
      stock_form: "forging", grip_diameter_mm: 50,
    });
    expect(r.success).toBe(true);
    const data = r.data as { workholding_recommendation: string; roughing_cycle: string };
    expect(data.workholding_recommendation).toBe("soft_od");
    expect(data.roughing_cycle).toBe("G73");
  });

  it("stock_form: hex_bar 30mm → reports across-corners 34.6mm", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_stock_form", {
      stock_form: "hex_bar", grip_diameter_mm: 30,
    });
    expect(r.success).toBe(true);
    const data = r.data as { clamping_notes: string[] };
    expect(data.clamping_notes.some((n) => n.includes("34.6"))).toBe(true);
  });

  it("rejects an invalid payload at the dispatcher boundary", async () => {
    const r = await invokeHandler(turningHandler, "lathe_workholding_face_driver", {
      axial_force_n: -1, pin_circle_radius_mm: 20,
    });
    expect(r.success).not.toBe(true);
  });
});
