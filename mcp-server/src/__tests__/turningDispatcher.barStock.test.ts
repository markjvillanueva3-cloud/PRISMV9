/**
 * turningDispatcher.barStock.test.ts — bar-stock optimization actions E2E
 *
 * Drives the three orphaned bar-stock engines through the real
 * `prism_turning` dispatcher:
 *   - bar_feed_pitch_optimize → BarFeedPitchOptimizerEngine.optimize
 *   - bar_remnant_plan        → BarRemnantManagementEngine.plan
 *   - bar_stock_cut_plan      → BarStockCutPlanEngine.plan
 *
 * Verifies action-enum membership, end-to-end happy paths with realistic
 * Swiss-lathe / job-shop numbers, Zod-rejection of bad inputs, and
 * algebraic invariants (utilisation ≤ 100%, parts × pitch ≤ usable bar,
 * bin-packing yields ≤ requested quantity).
 *
 * @milestone LATHE-PRO-MS6 (engines) + WIRE-MS0/U-WIRE05 (this wiring)
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

describe("turningDispatcher — bar-stock action surface (U-WIRE05)", () => {
  it("advertises bar_feed_pitch_optimize in the tool description", () => {
    expect(toolDescription.includes("bar_feed_pitch_optimize")).toBe(true);
  });

  it("advertises bar_remnant_plan in the tool description", () => {
    expect(toolDescription.includes("bar_remnant_plan")).toBe(true);
  });

  it("advertises bar_stock_cut_plan in the tool description", () => {
    expect(toolDescription.includes("bar_stock_cut_plan")).toBe(true);
  });
});

// ── bar_feed_pitch_optimize — happy path + algebraic invariants ──────────────

describe("turningDispatcher — bar_feed_pitch_optimize (BarFeedPitchOptimizerEngine)", () => {
  it("scores 3 candidate diameters and picks the smallest feasible bar (lowest waste)", async () => {
    // Swiss lathe job: Ø8 mm part max, 50 mm long, 1000 needed, 12-foot bars.
    const out = await invoke("bar_feed_pitch_optimize", {
      part_length_mm: 50,
      quantity_needed: 1000,
      bar_length_mm: 3658, // 12 ft
      cutoff_kerf_mm: 2,
      bar_end_loss_mm: 50,
      bar_head_face_mm: 3,
      candidate_bar_diameters_mm: [8, 12, 16],
      part_max_diameter_mm: 8,
      material_density_kgm3: 7850,
      material_price_per_kg: 2.5,
    });

    const candidates = out["candidates"] as Array<Record<string, unknown>>;
    expect(candidates.length).toBe(3);

    const best = out["best"] as Record<string, unknown>;
    // Smaller bar = less waste mass per unused mm → best should be Ø8
    expect(best["bar_diameter_mm"]).toBe(8);

    const partsPerBar = best["parts_per_bar"] as number;
    const remnantMm = best["remnant_mm"] as number;
    const usable = out["usable_length_mm"] as number;
    const pitch = out["pitch_mm"] as number;

    // Algebraic invariant: parts*pitch + remnant == usable (bar utilisation closure)
    expect(partsPerBar * pitch + remnantMm).toBeCloseTo(usable, 5);
    // Pitch is part_length + kerf
    expect(pitch).toBe(52);
    // Usable is bar_length - end_loss - head_face
    expect(usable).toBe(3605);

    // Cost score should be finite and waste mass ≥ 0
    const wasteCost = best["waste_cost"] as number;
    const wasteMass = best["waste_mass_kg"] as number;
    expect(wasteCost >= 0).toBe(true);
    expect(wasteMass >= 0).toBe(true);
    expect(Number.isFinite(wasteCost)).toBe(true);
  });

  it("rejects bar candidates smaller than part_max_diameter_mm", async () => {
    const out = await invoke("bar_feed_pitch_optimize", {
      part_length_mm: 25,
      quantity_needed: 100,
      bar_length_mm: 3000,
      candidate_bar_diameters_mm: [4, 6, 12], // 4 and 6 below part max
      part_max_diameter_mm: 10,
    });
    const candidates = out["candidates"] as Array<Record<string, unknown>>;
    expect(candidates.length).toBe(1);
    expect(candidates[0]!["bar_diameter_mm"]).toBe(12);
    const reasoning = out["reasoning"] as string[];
    expect(reasoning.some((r) => /Skip.*4mm/.test(r))).toBe(true);
    expect(reasoning.some((r) => /Skip.*6mm/.test(r))).toBe(true);
  });

  it("Zod rejects part_length_mm <= 0 (boundary)", async () => {
    const out = await invoke("bar_feed_pitch_optimize", {
      part_length_mm: 0,
      quantity_needed: 100,
      bar_length_mm: 3000,
      bar_diameter_mm: 12,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/part_length_mm/);
  });

  it("Zod rejects negative quantity_needed (adversarial)", async () => {
    const out = await invoke("bar_feed_pitch_optimize", {
      part_length_mm: 50,
      quantity_needed: -10,
      bar_length_mm: 3000,
      bar_diameter_mm: 12,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/quantity_needed/);
  });

  it("Zod rejects missing required field bar_length_mm", async () => {
    const out = await invoke("bar_feed_pitch_optimize", {
      part_length_mm: 50,
      quantity_needed: 100,
      bar_diameter_mm: 12,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/bar_length_mm/);
  });
});

// ── bar_remnant_plan — happy path + savings closure ──────────────────────────

describe("turningDispatcher — bar_remnant_plan (BarRemnantManagementEngine)", () => {
  it("consumes 2 compatible 4140 remnants before requesting fresh bars", async () => {
    const out = await invoke("bar_remnant_plan", {
      inventory: [
        { id: "RMN-A", material: "4140", diameter_mm: 25.4, length_mm: 800 },
        { id: "RMN-B", material: "4140", diameter_mm: 25.4, length_mm: 600 },
        { id: "RMN-C", material: "1018", diameter_mm: 25.4, length_mm: 1200 }, // wrong mat
        { id: "RMN-D", material: "4140", diameter_mm: 19.0, length_mm: 700 },  // wrong Ø
      ],
      job: {
        part_length_mm: 100,
        quantity_needed: 12,
        diameter_mm: 25.4,
        material: "4140",
        diameter_tol_mm: 0.5,
        cutoff_kerf_mm: 2,
        bar_head_face_mm: 3,
        min_feasible_length_mm: 150,
        material_price_per_kg: 3.0,
        material_density_kgm3: 7850,
      },
    });

    const assignments = out["assignments"] as Array<Record<string, unknown>>;
    // Both 4140 / 25.4mm remnants should appear; 1018 and 19mm rejected.
    expect(assignments.length).toBe(2);
    const ids = assignments.map((a) => a["remnant_id"]);
    expect(ids.includes("RMN-A")).toBe(true);
    expect(ids.includes("RMN-B")).toBe(true);
    expect(ids.includes("RMN-C")).toBe(false);
    expect(ids.includes("RMN-D")).toBe(false);

    const totalFromRemnants = out["total_parts_from_remnants"] as number;
    const remaining = out["quantity_remaining"] as number;
    const fromFresh = out["parts_from_fresh_bar_needed"] as number;

    // Closure: parts_from_remnants + quantity_remaining == quantity_needed
    expect(totalFromRemnants + remaining).toBe(12);
    // fromFresh equals quantity_remaining (engine contract)
    expect(fromFresh).toBe(remaining);

    // Each assignment: parts_from_remnant > 0 and residual_length_mm >= 0
    for (const a of assignments) {
      expect((a["parts_from_remnant"] as number) > 0).toBe(true);
      expect((a["residual_length_mm"] as number) >= 0).toBe(true);
    }

    const savingsCost = out["savings_cost"] as number;
    const savingsMass = out["savings_mass_kg"] as number;
    expect(savingsCost >= 0).toBe(true);
    expect(savingsMass >= 0).toBe(true);
  });

  it("returns zero assignments when inventory has no compatible remnants", async () => {
    const out = await invoke("bar_remnant_plan", {
      inventory: [
        { id: "RMN-X", material: "1018", diameter_mm: 12.0, length_mm: 500 },
      ],
      job: {
        part_length_mm: 50,
        quantity_needed: 20,
        diameter_mm: 25.4,
        material: "4140",
      },
    });
    // slimResponse drops empty arrays from the wire payload, so the contract is
    // "assignments missing OR length 0", with the scalar counters carrying the truth.
    const assignments = (out["assignments"] ?? []) as Array<Record<string, unknown>>;
    expect(assignments.length).toBe(0);
    expect(out["total_parts_from_remnants"]).toBe(0);
    expect(out["quantity_remaining"]).toBe(20);
    expect(out["parts_from_fresh_bar_needed"]).toBe(20);
  });

  it("Zod rejects empty material string in job (boundary)", async () => {
    const out = await invoke("bar_remnant_plan", {
      inventory: [],
      job: {
        part_length_mm: 50,
        quantity_needed: 10,
        diameter_mm: 25.4,
        material: "",
      },
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/material/);
  });
});

// ── bar_stock_cut_plan — happy path + bin-packing invariants ─────────────────

describe("turningDispatcher — bar_stock_cut_plan (BarStockCutPlanEngine)", () => {
  it("packs 3 mixed-length requirements with FFD across 12-ft bars, all fulfilled", async () => {
    const out = await invoke("bar_stock_cut_plan", {
      requirements: [
        { id: "PART-A", part_length_mm: 200, quantity: 10, cutoff_width_mm: 3 },
        { id: "PART-B", part_length_mm: 100, quantity: 20, cutoff_width_mm: 3 },
        { id: "PART-C", part_length_mm: 50, quantity: 15, cutoff_width_mm: 3 },
      ],
      bar_options: [
        { id: "STD-12FT", length_mm: 3658, cost_per_bar_usd: 50, grip_allowance_mm: 20 },
      ],
      kerf_mm: 3,
    });

    const summary = out["summary"] as Record<string, unknown>;
    // slimResponse drops empty `unfulfilled`; absent OR length 0 both mean "all fit".
    const unfulfilled = (out["unfulfilled"] ?? []) as unknown[];
    const assignments = (out["assignments"] ?? []) as Array<Record<string, unknown>>;

    // All requirements fit comfortably in 12-foot bars
    expect(unfulfilled.length).toBe(0);
    expect(summary["total_parts"]).toBe(45); // 10 + 20 + 15
    expect((summary["total_bars"] as number) >= 1).toBe(true);
    expect(assignments.length).toBe(summary["total_bars"]);

    // Yield invariant: 0 < yield ≤ 100%
    const yieldPct = summary["overall_yield_pct"] as number;
    expect(yieldPct > 0).toBe(true);
    expect(yieldPct <= 100).toBe(true);

    // Material closure: used_material_mm ≤ total_material_mm
    const used = summary["used_material_mm"] as number;
    const total = summary["total_material_mm"] as number;
    expect(used <= total).toBe(true);
    // Engine surfaces remnant via (total - used) - (bars * grip); remnant_mm itself is non-negative
    const totalRemnant = summary["total_remnant_mm"] as number;
    expect(totalRemnant >= 0).toBe(true);

    // Cost is computed when cost_per_bar_usd is given
    expect(typeof summary["estimated_cost_usd"]).toBe("number");
    expect((summary["estimated_cost_usd"] as number) > 0).toBe(true);

    // Per-assignment utilisation is between 0 and 100%
    for (const a of assignments) {
      const u = a["utilization_pct"] as number;
      expect(u >= 0).toBe(true);
      expect(u <= 100).toBe(true);
    }
  });

  it("reports unfulfilled when the only bar option is shorter than the longest part", async () => {
    const out = await invoke("bar_stock_cut_plan", {
      requirements: [
        { id: "LONG", part_length_mm: 5000, quantity: 1, cutoff_width_mm: 3 },
      ],
      bar_options: [
        { id: "SHORT", length_mm: 1000, grip_allowance_mm: 20 },
      ],
      kerf_mm: 3,
    });
    const unfulfilled = out["unfulfilled"] as Array<Record<string, unknown>>;
    expect(unfulfilled.length).toBe(1);
    expect(unfulfilled[0]!["requirement_id"]).toBe("LONG");
    expect((unfulfilled[0]!["shortage"] as number) >= 1).toBe(true);
  });

  it("Zod rejects empty requirements array", async () => {
    const out = await invoke("bar_stock_cut_plan", {
      requirements: [],
      bar_options: [{ id: "B", length_mm: 1000 }],
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/requirements/);
  });

  it("Zod rejects empty bar_options array", async () => {
    const out = await invoke("bar_stock_cut_plan", {
      requirements: [{ id: "R", part_length_mm: 100, quantity: 5 }],
      bar_options: [],
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/bar_options/);
  });

  it("Zod rejects negative kerf_mm (adversarial)", async () => {
    const out = await invoke("bar_stock_cut_plan", {
      requirements: [{ id: "R", part_length_mm: 100, quantity: 5 }],
      bar_options: [{ id: "B", length_mm: 1000 }],
      kerf_mm: -1,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/kerf_mm/);
  });
});
