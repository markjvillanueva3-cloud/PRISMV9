/**
 * LatheFormTurning.test.ts -- U-LW-FORM-TURN (slot:whiskey, 2026-07-01)
 * ============================================================================
 * Coverage-audit gap #3: form turning had a title in the engine header but NO method/formula.
 * A ground form tool engages its FULL width at once, so radial force scales with engaged width via
 * Kienzle: Fc = kc1.1 * b * fn^(1-mc). These tests lock the force to CANONICAL_KIENZLE (R9 -- if the
 * canonical kc1.1/mc change, the reference updates), verify feed de-rating to a force ceiling, material
 * -> ISO normalization, fail-loud guards, and the dispatcher round-trip.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { latheAdvancedOperationsEngine } from "../engines/LatheAdvancedOperationsEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

const eng = latheAdvancedOperationsEngine;

// Reference force straight from the canonical constant (not a hard-coded literal).
const refFc = (iso: "P" | "M" | "K" | "N" | "S" | "H", b: number, fn: number): number => {
  const { kc1_1, mc } = CANONICAL_KIENZLE[iso];
  return Math.round(kc1_1 * b * Math.pow(fn, 1 - mc));
};
const refFnMax = (iso: "P" | "M" | "K" | "N" | "S" | "H", b: number, ceiling: number): number => {
  const { kc1_1, mc } = CANONICAL_KIENZLE[iso];
  return Math.round(Math.pow(ceiling / (kc1_1 * b), 1 / (1 - mc)) * 1e4) / 1e4;
};

describe("LatheAdvancedOperationsEngine.getFormTurningParams -- Kienzle full-width form force", () => {
  it("computes radial force = kc1.1*b*fn^(1-mc) from CANONICAL_KIENZLE (P steel)", () => {
    const r = eng.getFormTurningParams({ form_width_mm: 12, material: "P", feed_mm_rev: 0.1 });
    expect(r.iso_group).toBe("P");
    expect(r.radial_force_N).toBe(refFc("P", 12, 0.1)); // 1800*12*0.1^0.75 ~= 3841 N
    expect(r.radial_force_N).toBeGreaterThan(3000); // sanity: a 12mm form in steel is a heavy radial load
  });

  it("de-rates feed to hold the radial-force ceiling on a wide form (high chatter risk)", () => {
    const r = eng.getFormTurningParams({ form_width_mm: 12, material: "P", feed_mm_rev: 0.1 });
    expect(r.derated).toBe(true);
    expect(r.recommended_feed_mm_rev).toBe(refFnMax("P", 12, 1500)); // fn* = (1500/(1800*12))^(1/0.75)
    expect(r.recommended_feed_mm_rev).toBeLessThan(0.1); // reduced below the nominal
    expect(r.chatter_risk).toBe("high"); // b > 6 mm
  });

  it("does NOT de-rate a narrow low-force form; classifies chatter low", () => {
    const r = eng.getFormTurningParams({ form_width_mm: 2, material: "aluminum", feed_mm_rev: 0.05 });
    expect(r.iso_group).toBe("N"); // aluminum -> ISO N
    expect(r.radial_force_N).toBe(refFc("N", 2, 0.05));
    expect(r.derated).toBe(false);
    expect(r.recommended_feed_mm_rev).toBe(0.05);
    expect(r.chatter_risk).toBe("low");
  });

  it("MATERIAL-SENSITIVE: higher kc1.1 (S titanium) yields higher force than N aluminum at the same cut", () => {
    const ti = eng.getFormTurningParams({ form_width_mm: 6, material: "titanium", feed_mm_rev: 0.08 });
    const al = eng.getFormTurningParams({ form_width_mm: 6, material: "6061 aluminum", feed_mm_rev: 0.08 });
    expect(ti.iso_group).toBe("S");
    expect(al.iso_group).toBe("N");
    expect(ti.radial_force_N).toBeGreaterThan(al.radial_force_N); // kc1.1 S(2800) >> N(700)
  });

  it("normalizes common material names + ISO letters to the right group", () => {
    expect(eng.getFormTurningParams({ form_width_mm: 3, material: "304 stainless", feed_mm_rev: 0.08 }).iso_group).toBe("M");
    expect(eng.getFormTurningParams({ form_width_mm: 3, material: "gray cast iron", feed_mm_rev: 0.08 }).iso_group).toBe("K");
    expect(eng.getFormTurningParams({ form_width_mm: 3, material: "H", feed_mm_rev: 0.08 }).iso_group).toBe("H");
    expect(eng.getFormTurningParams({ form_width_mm: 3, material: "unobtainium", feed_mm_rev: 0.08 }).iso_group).toBe("P"); // default steel
  });

  it("FAIL-LOUD: non-positive / non-finite width or feed throws", () => {
    expect(() => eng.getFormTurningParams({ form_width_mm: 0, material: "P" })).toThrow(/form_width_mm/);
    expect(() => eng.getFormTurningParams({ form_width_mm: -5, material: "P" })).toThrow(/form_width_mm/);
    expect(() => eng.getFormTurningParams({ form_width_mm: NaN, material: "P" })).toThrow(/form_width_mm/);
    expect(() => eng.getFormTurningParams({ form_width_mm: 5, material: "P", feed_mm_rev: 0 })).toThrow(/feed/);
    expect(() => eng.getFormTurningParams({ form_width_mm: 5, material: "P", feed_mm_rev: Infinity })).toThrow(/feed/);
  });

  it("honors a custom force ceiling (higher ceiling -> less/no de-rating)", () => {
    const low = eng.getFormTurningParams({ form_width_mm: 8, material: "P", feed_mm_rev: 0.1, max_radial_force_N: 1000 });
    const high = eng.getFormTurningParams({ form_width_mm: 8, material: "P", feed_mm_rev: 0.1, max_radial_force_N: 6000 });
    expect(low.recommended_feed_mm_rev).toBeLessThan(high.recommended_feed_mm_rev);
  });
});

// ---- Dispatcher round-trip --------------------------------------------------
interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return { tools: captured, tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) { captured.push({ name, description, schema, handler }); } };
}

describe("lathe_advanced_form_turning via prism_turning dispatcher", () => {
  let handler: CapturedTool["handler"];
  beforeAll(() => {
    const server = makeStubServer();
    registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    if (!tool) throw new Error("prism_turning tool was not registered");
    handler = tool.handler;
  });
  async function invoke(action: string, params: Record<string, unknown>) {
    const res = await handler({ action, params });
    const text = res.content[0]?.text ?? "";
    try { return JSON.parse(text) as Record<string, unknown>; } catch { return { __raw: text }; }
  }

  it("round-trips to a form-turning result matching the direct engine", async () => {
    const input = { form_width_mm: 12, material: "P", feed_mm_rev: 0.1 };
    const direct = eng.getFormTurningParams(input);
    const res = await invoke("lathe_advanced_form_turning", input);
    const r = (res.result ?? res.data ?? res) as Record<string, unknown>;
    expect(r.radial_force_N).toBe(direct.radial_force_N);
    expect(r.iso_group).toBe("P");
  });

  it("schema rejects a non-numeric form_width_mm", async () => {
    const res = await invoke("lathe_advanced_form_turning", { form_width_mm: "wide", material: "P" });
    expect(JSON.stringify(res).toLowerCase()).toMatch(/invalid|number|expected/);
  });
});
