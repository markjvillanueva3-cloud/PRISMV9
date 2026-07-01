/**
 * turningDispatcher.barRemnantCount-wire.test.ts
 *
 * Round-trip wiring test for prism_turning:bar_remnant_count_feasible
 * (XGAL-WIRE / U-XGAL-BAR-REMNANT). This action is additive on top of the
 * U-WIRE05 bar-stock trio (bar_feed_pitch_optimize / bar_remnant_plan /
 * bar_stock_cut_plan) and is NOT exercised by turningDispatcher.barStock.test.ts,
 * so it carries its own coverage here.
 *
 * Drives BarRemnantManagementEngine.countFeasible THROUGH the real prism_turning
 * dispatcher (normalizeParams + Zod validation + dispatch). countFeasible is a
 * pure filter (material match + diameter within tol + length >= min feasible),
 * so every assertion is a deterministic reference value -- no timestamps, no RNG.
 *
 * @milestone LATHE-PRO-MS10 (engine) + XGAL-WIRE/U-XGAL-BAR-REMNANT (this wiring)
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

// A mixed rack: two feasible 4140/Ø25 remnants, one too short, one wrong material.
const RACK = [
  { id: "RMN-1", material: "4140", diameter_mm: 25, length_mm: 1000 }, // feasible
  { id: "RMN-2", material: "4140", diameter_mm: 25, length_mm: 100 },  // too short (< 150)
  { id: "RMN-3", material: "4140", diameter_mm: 25, length_mm: 500 },  // feasible
  { id: "RMN-4", material: "303SS", diameter_mm: 25, length_mm: 1000 }, // wrong material
];

describe("turningDispatcher - bar_remnant_count_feasible wiring (E2E round-trip)", () => {
  it("advertises bar_remnant_count_feasible in the tool description", () => {
    expect(toolDescription.includes("bar_remnant_count_feasible")).toBe(true);
  });

  it("counts 2 feasible 4140/O25 remnants above the default 150mm floor", async () => {
    const out = await invoke("bar_remnant_count_feasible", {
      inventory: RACK,
      material: "4140",
      diameter_mm: 25,
    });
    // RMN-1 (1000) + RMN-3 (500) qualify; RMN-2 too short, RMN-4 wrong material.
    expect(out["count"]).toBe(2);
  });

  it("raising min_feasible_length_mm to 600 drops the 500mm remnant (count 1)", async () => {
    const out = await invoke("bar_remnant_count_feasible", {
      inventory: RACK,
      material: "4140",
      diameter_mm: 25,
      min_feasible_length_mm: 600,
    });
    // Only RMN-1 (1000 >= 600) survives; RMN-3 (500) now drops out.
    expect(out["count"]).toBe(1);
  });

  it("default diameter tolerance (0.5mm) rejects an off-size request (count 0)", async () => {
    const out = await invoke("bar_remnant_count_feasible", {
      inventory: RACK,
      material: "4140",
      diameter_mm: 26, // |25 - 26| = 1.0 > default tol 0.5 -> no match
    });
    expect(out["count"]).toBe(0);
  });

  it("widening diameter_tol_mm to 1.5 admits the Ø25 remnants for a Ø26 request (count 2)", async () => {
    const out = await invoke("bar_remnant_count_feasible", {
      inventory: RACK,
      material: "4140",
      diameter_mm: 26,
      diameter_tol_mm: 1.5, // |25 - 26| = 1.0 <= 1.5 -> RMN-1 + RMN-3 match
    });
    expect(out["count"]).toBe(2);
  });

  it("empty inventory yields a feasible count of 0 (boundary)", async () => {
    const out = await invoke("bar_remnant_count_feasible", {
      inventory: [],
      material: "4140",
      diameter_mm: 25,
    });
    expect(out["count"]).toBe(0);
  });

  it("Zod rejects an empty material string (boundary)", async () => {
    const out = await invoke("bar_remnant_count_feasible", {
      inventory: RACK,
      material: "",
      diameter_mm: 25,
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/material/);
  });

  it("Zod rejects a missing diameter_mm (adversarial)", async () => {
    const out = await invoke("bar_remnant_count_feasible", {
      inventory: RACK,
      material: "4140",
    });
    expect(out["success"]).toBe(false);
    expect(String(out["error"])).toMatch(/diameter_mm/);
  });
});
