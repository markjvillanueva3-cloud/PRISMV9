/**
 * turningDispatcher.hardTurning.test.ts — hard-turning orphan E2E
 *
 * Drives the two orphaned LATHE-PRO-MS5 engines through the real
 * `prism_turning` dispatcher:
 *   - hard_turn_decide   → HardTurningDecisionEngine.decide
 *   - hard_turn_optimize → HardTurningCapstoneEngine.optimize
 *
 * Verifies action-enum membership, end-to-end happy paths with realistic
 * hardened-part numbers (CBN sweet spot 55-62 HRC, grind territory <0.2μm),
 * Zod-rejection of bad inputs (engine throws on hardness ≤ 0), and
 * decision-tree invariants (CBN preferred for 60 HRC + Ra 0.4μm,
 * grind preferred for Ra 0.05μm + tight tolerance).
 *
 * @milestone LATHE-PRO-MS5 (engines) + WIRE-MS0/U-WIRE06 (this wiring)
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];
let toolDescription = "";

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

beforeAll(() => {
  const server = makeStubServer();
  registerTurningDispatcher(
    server as unknown as Parameters<typeof registerTurningDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_turning");
  if (!tool) throw new Error("prism_turning tool was not registered");
  handler = tool.handler;
  toolDescription = tool.description;
});

// ── Action surface — the dispatcher tool description is itself the contract ──

describe("turningDispatcher — hard-turning action surface (U-WIRE06)", () => {
  it("advertises hard_turn_decide in the tool description", () => {
    expect(toolDescription.includes("hard_turn_decide")).toBe(true);
  });

  it("advertises hard_turn_optimize in the tool description", () => {
    expect(toolDescription.includes("hard_turn_optimize")).toBe(true);
  });
});

// ── hard_turn_decide — happy path + decision-tree invariants ────────────────

describe("turningDispatcher — hard_turn_decide (HardTurningDecisionEngine)", () => {
  it("recommends hard_turn_cbn for 60 HRC + Ra 0.4μm + ≥0.01mm tol (CBN sweet spot)", async () => {
    // 60 HRC sits in the 55-62 sweet spot; Ra 0.4μm easily achievable;
    // tolerance 0.012mm comfortably above the 0.01 threshold.
    const out = await invoke("hard_turn_decide", {
      hardness_hrc: 60,
      target_ra_um: 0.4,
      target_tolerance_mm: 0.012,
      feature: "od",
      lot_size: 250,
      diameter_mm: 40,
      length_over_diameter: 2,
      shop_has_grinder: true,
    });

    expect(out["recommendation"]).toBe("hard_turn_cbn");
    expect(out["tool_material"]).toMatch(/CBN/);
    const conf = out["confidence"] as number;
    expect(conf).toBeGreaterThanOrEqual(0.5);
    expect(conf).toBeLessThanOrEqual(1.0);
    // CBN compressive residual is the canonical surface-integrity note
    expect(String(out["surface_integrity_note"])).toMatch(/compressive/i);

    const alts = out["alternatives"] as Array<Record<string, unknown>>;
    expect(alts.length).toBe(3); // 4 choices total → 3 alternatives
    // alternatives must be sorted descending by score
    const scores = alts.map((a) => a["score"] as number);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!);
    }
  });

  it("recommends grind for Ra 0.05μm + 0.002mm tolerance (sub-micron territory)", async () => {
    const out = await invoke("hard_turn_decide", {
      hardness_hrc: 62,
      target_ra_um: 0.05,
      target_tolerance_mm: 0.002,
      feature: "od",
      lot_size: 50,
      diameter_mm: 25,
      shop_has_grinder: true,
    });
    expect(out["recommendation"]).toBe("grind");
    expect(String(out["tool_material"])).toMatch(/Grinding/i);
    expect(out["expected_ra_um"]).toBeLessThan(0.2);
  });

  it("recommends conventional_turn for soft material (35 HRC)", async () => {
    const out = await invoke("hard_turn_decide", {
      hardness_hrc: 35,
      target_ra_um: 1.6,
      target_tolerance_mm: 0.05,
      feature: "od",
      lot_size: 100,
      diameter_mm: 30,
      shop_has_grinder: false,
    });
    expect(out["recommendation"]).toBe("conventional_turn");
    expect(String(out["tool_material"])).toMatch(/Carbide/i);
  });

  it("returns 4 ranked decision choices regardless of inputs", async () => {
    const out = await invoke("hard_turn_decide", {
      hardness_hrc: 50,
      target_ra_um: 0.8,
      target_tolerance_mm: 0.02,
      feature: "od",
      lot_size: 80,
      diameter_mm: 35,
    });
    const alts = out["alternatives"] as Array<Record<string, unknown>>;
    const all = [out["recommendation"], ...alts.map((a) => a["choice"])];
    expect(new Set(all).size).toBe(4);
    expect(new Set(all)).toEqual(new Set([
      "hard_turn_cbn",
      "hard_turn_ceramic",
      "grind",
      "conventional_turn",
    ]));
  });

  it("Zod rejects hardness_hrc <= 0 (boundary; engine throws)", async () => {
    const out = await invoke("hard_turn_decide", {
      hardness_hrc: 0,
      target_ra_um: 0.4,
      target_tolerance_mm: 0.01,
      feature: "od",
      lot_size: 100,
      diameter_mm: 40,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/hardness_hrc/);
  });

  it("Zod rejects negative target_ra_um (adversarial)", async () => {
    const out = await invoke("hard_turn_decide", {
      hardness_hrc: 55,
      target_ra_um: -0.1,
      target_tolerance_mm: 0.01,
      feature: "od",
      lot_size: 100,
      diameter_mm: 40,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/target_ra_um/);
  });

  it("Zod rejects unknown feature enum value", async () => {
    const out = await invoke("hard_turn_decide", {
      hardness_hrc: 55,
      target_ra_um: 0.4,
      target_tolerance_mm: 0.01,
      feature: "spline", // not in od|bore|face|thread|groove
      lot_size: 100,
      diameter_mm: 40,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/feature/);
  });

  it("Zod rejects missing required field diameter_mm", async () => {
    const out = await invoke("hard_turn_decide", {
      hardness_hrc: 55,
      target_ra_um: 0.4,
      target_tolerance_mm: 0.01,
      feature: "od",
      lot_size: 100,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/diameter_mm/);
  });
});

// ── hard_turn_optimize — capstone composition + composite safety ────────────

describe("turningDispatcher — hard_turn_optimize (HardTurningCapstoneEngine)", () => {
  it("returns a 4-stage capstone result (decision + white_layer + residual_stress + composite_safe)", async () => {
    const out = await invoke("hard_turn_optimize", {
      hardness_hrc: 58,
      target_ra_um: 0.6,
      target_tolerance_mm: 0.015,
      feature: "od",
      lot_size: 150,
      diameter_mm: 40,
      length_over_diameter: 2.5,
      shop_has_grinder: true,
      coolant: "flood",
      tool_wear_VB_mm: 0.1,
    });

    // Capstone always returns these top-level fields
    expect(out).toHaveProperty("decision");
    expect(out).toHaveProperty("white_layer");
    expect(out).toHaveProperty("residual_stress");
    expect(out).toHaveProperty("composite_safe");
    expect(out).toHaveProperty("reasoning");
    expect(typeof out["composite_safe"]).toBe("boolean");
    expect(Array.isArray(out["reasoning"])).toBe(true);
    expect(String(out["source"])).toMatch(/HardTurningCapstoneEngine\.optimize/);

    // grinding_replacement is null when no baseline supplied; the response
    // slimmer (slimResponse) strips nulls, so the field is absent or null.
    expect(out["grinding_replacement"] ?? null).toBeNull();
  });

  it("runs grind-replacement stage when grinding_baseline is supplied", async () => {
    const out = await invoke("hard_turn_optimize", {
      hardness_hrc: 60,
      target_ra_um: 0.4,
      target_tolerance_mm: 0.012,
      feature: "od",
      lot_size: 200,
      diameter_mm: 45,
      length_over_diameter: 2,
      shop_has_grinder: true,
      grinding_baseline: {
        achieved_ra_um: 0.2,
        achieved_tolerance_mm: 0.005,
        stock_removal_mm: 0.3,
        grind_cycle_sec: 120,
        grind_cost_per_part_usd: 0.6,
      },
      coolant: "flood",
    });

    expect(out["grinding_replacement"]).not.toBeNull();
    const gr = out["grinding_replacement"] as Record<string, unknown>;
    expect(["replace", "partial", "blocked"]).toContain(gr["feasibility"]);
  });

  it("Zod rejects invalid coolant enum", async () => {
    const out = await invoke("hard_turn_optimize", {
      hardness_hrc: 58,
      target_ra_um: 0.6,
      target_tolerance_mm: 0.015,
      feature: "od",
      lot_size: 150,
      diameter_mm: 40,
      coolant: "soybean", // not in flood|mist|air|dry|cryo
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/coolant/);
  });

  it("Zod rejects invalid forced_tool_material override", async () => {
    const out = await invoke("hard_turn_optimize", {
      hardness_hrc: 58,
      target_ra_um: 0.6,
      target_tolerance_mm: 0.015,
      feature: "od",
      lot_size: 150,
      diameter_mm: 40,
      forced_tool_material: "diamond", // not in CBN|ceramic|carbide
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/forced_tool_material/);
  });

  it("Zod rejects negative grinding_baseline.grind_cycle_sec (adversarial nested)", async () => {
    const out = await invoke("hard_turn_optimize", {
      hardness_hrc: 58,
      target_ra_um: 0.6,
      target_tolerance_mm: 0.015,
      feature: "od",
      lot_size: 150,
      diameter_mm: 40,
      grinding_baseline: {
        achieved_ra_um: 0.2,
        achieved_tolerance_mm: 0.005,
        stock_removal_mm: 0.3,
        grind_cycle_sec: -10, // negative is invalid
        grind_cost_per_part_usd: 0.5,
      },
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/grind_cycle_sec/);
  });

  it("composite_safe correlates with white_layer.safe_to_proceed under flood coolant", async () => {
    // Flood coolant + low VB wear → low white-layer risk → composite safe
    const out = await invoke("hard_turn_optimize", {
      hardness_hrc: 56,
      target_ra_um: 0.8,
      target_tolerance_mm: 0.02,
      feature: "od",
      lot_size: 100,
      diameter_mm: 50,
      coolant: "flood",
      tool_wear_VB_mm: 0.08,
      cutting_speed_mmin: 120,
      feed_per_rev_mm: 0.08,
      depth_of_cut_mm: 0.15,
    });
    const wl = out["white_layer"] as Record<string, unknown>;
    const rs = out["residual_stress"] as Record<string, unknown>;
    const composite = out["composite_safe"] as boolean;
    expect(composite).toBe(
      Boolean(wl["safe_to_proceed"]) && Boolean(rs["meets_requirement"]),
    );
  });
});
