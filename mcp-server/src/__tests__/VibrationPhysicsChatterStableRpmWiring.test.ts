/**
 * prism_vibration_physics — chatter_stable_rpm_recommend wiring verification.
 *
 * PSN-OCTOPUS-FLEET-SYNERGY (slot:bravo, 2026-06-03 dormant-engine activation).
 * Wires the previously-UNWIRED SpeedFeedChatterStabilityAdapterEngine.recommend()
 * (9-axis holder/stickout/material → Altintas stability-lobe peak) onto
 * prism_vibration_physics via the chatter_stable_rpm_recommend action.
 *
 * This test invokes THROUGH the dispatcher (captures the handler registered on a
 * mock MCP server), not only the engine singleton — per CLAUDE.md comprehensive
 * build floor. Coverage: enum membership + schema-map behavior (wiring contract),
 * round-trip happy path (nested + flat input), nominalRpm margin, holder-ranking
 * physics invariant through the dispatcher, unknown-action failure mode, and
 * adversarial/partial input fail-soft.
 */
import { describe, it, expect } from "vitest";
import { registerVibrationPhysicsDispatcher } from "../tools/dispatchers/vibrationPhysicsDispatcher.js";
import { VIBRATION_ACTION_SCHEMAS } from "../schemas/vibrationActionSchemas.js";

const ACTION = "chatter_stable_rpm_recommend";

// A representative NineAxisInput (mirrors the engine's own test fixture).
const MILL_STEEL_12MM = {
  material: { name: "steel", iso_group: "P" },
  tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide", stickout_mm: 48 },
  tool_holder: { type: "cat40" },
  toolpath: { operation: "milling", cut_type: "roughing" },
};

/** Register the dispatcher on a minimal mock server and capture (schema, handler). */
function captureRegistration(): { schema: any; handler: (a: { action: string; params?: any }) => Promise<any> } {
  let schema: any = null;
  let handler: any = null;
  const server = {
    tool(_name: string, _desc: string, s: any, h: any) {
      schema = s;
      handler = h;
    },
  };
  registerVibrationPhysicsDispatcher(server);
  if (!handler) throw new Error("registerVibrationPhysicsDispatcher did not register a handler");
  return { schema, handler };
}

/** Invoke the action through the captured dispatcher handler and parse the JSON payload. */
async function invoke(action: string, params: Record<string, any>): Promise<any> {
  const { handler } = captureRegistration();
  const res = await handler({ action, params });
  const text = res?.content?.[0]?.text;
  expect(typeof text).toBe("string");
  return JSON.parse(text);
}

describe("prism_vibration_physics / chatter_stable_rpm_recommend — wiring contract", () => {
  it("action is a member of the dispatcher's z.enum (registered schema)", () => {
    const { schema } = captureRegistration();
    // zod v4 enum exposes `.options` as the literal tuple.
    const options: string[] = schema?.action?.options ?? [];
    expect(options).toContain(ACTION);
  });

  it("Zod schema accepts a valid input and rejects a non-numeric nominalRpm", () => {
    const sch = VIBRATION_ACTION_SCHEMAS[ACTION];
    expect(typeof sch?.safeParse).toBe("function");
    expect(sch.safeParse({ input: MILL_STEEL_12MM, nominalRpm: 6000 }).success).toBe(true);
    expect(sch.safeParse({ input: MILL_STEEL_12MM, nominalRpm: "fast" }).success).toBe(false);
  });
});

describe("prism_vibration_physics / chatter_stable_rpm_recommend — round-trip through the dispatcher", () => {
  it("nested input → structured StableRpmRecommendation with a positive stable RPM", async () => {
    const r = await invoke(ACTION, { input: MILL_STEEL_12MM });
    expect(r.stable_rpm).toBeGreaterThan(0);
    expect(r.max_stable_ap_mm).toBeGreaterThan(0);
    expect(Array.isArray(r.top_candidates)).toBe(true);
    expect(r.top_candidates.length).toBeGreaterThan(0);
    expect(typeof r.lobe_computed).toBe("boolean");
    expect(Array.isArray(r.notes)).toBe(true);
  });

  it("flat input (params IS the NineAxisInput) routes identically", async () => {
    const r = await invoke(ACTION, { ...MILL_STEEL_12MM });
    expect(r.stable_rpm).toBeGreaterThan(0);
    expect(r.max_stable_ap_mm).toBeGreaterThan(0);
  });

  it("nominalRpm yields a finite stability margin at that RPM", async () => {
    const r = await invoke(ACTION, { input: MILL_STEEL_12MM, nominalRpm: 6000 });
    expect(Number.isFinite(r.margin_at_nominal_pct)).toBe(true);
  });

  it("holder-stiffness physics invariant survives the round-trip (HSK-A63 ≳ CAT40)", async () => {
    const cat = await invoke(ACTION, { input: { ...MILL_STEEL_12MM, tool_holder: { type: "cat40" } } });
    const hsk = await invoke(ACTION, { input: { ...MILL_STEEL_12MM, tool_holder: { type: "hsk_a63" } } });
    // Higher modal stiffness → higher stable RPM at the same lobe family.
    expect(hsk.stable_rpm).toBeGreaterThan(cat.stable_rpm * 0.9);
  });
});

describe("prism_vibration_physics / chatter_stable_rpm_recommend — failure & adversarial modes", () => {
  it("unknown action returns a structured error envelope, never throws", async () => {
    const r = await invoke("not_a_real_vibration_action", {});
    // engineMap[unknown] is undefined → getEngine(undefined) throws → dispatcherError envelope.
    const flat = JSON.stringify(r).toLowerCase();
    expect(flat).toMatch(/error|unknown|invalid|fail/);
  });

  it("tooling present, material absent → real recommendation defaulting to ISO P (explicit note)", async () => {
    const r = await invoke(ACTION, { input: { tooling: { tool_diameter_mm: 10, flutes: 2 } } });
    // material.iso_group is absent → engine defaults to ISO P (carbon/alloy steel) and
    // SAYS SO in notes, still producing a usable stability recommendation (not a throw).
    expect(r.stable_rpm).toBeGreaterThan(0);
    expect(r.notes.some((n: string) => /ISO P/i.test(n))).toBe(true);
  });

  it("missing tool_diameter_mm → fail-loud zeroed recommendation with an explicit note, never throws", async () => {
    const r = await invoke(ACTION, { input: { tooling: { flutes: 2 } } });
    // Tool diameter is the load-bearing geometric input; absent → zeroed result + a
    // named reason, NOT a NaN leak and NOT a thrown TypeError swallowed by the catch-all.
    expect(r.stable_rpm).toBe(0);
    expect(r.max_stable_ap_mm).toBe(0);
    expect(r.lobe_number).toBe(0);
    expect(r.lobe_computed).toBe(false);
    expect(r.notes.some((n: string) => /tool_diameter_mm/i.test(n))).toBe(true);
  });

  it("empty input object → fail-loud zeroed recommendation, never throws", async () => {
    const r = await invoke(ACTION, { input: {} });
    expect(r.stable_rpm).toBe(0);
    expect(r.notes.some((n: string) => /insufficient input/i.test(n))).toBe(true);
  });

  it("lobe_computed is honestly false (fallback SLD path; canonical engine not yet wired)", async () => {
    // R12 honesty: the adapter currently always runs the closed-form fallback SLD.
    // This pins that contract so a future canonical-engine wire must consciously flip it.
    const r = await invoke(ACTION, { input: MILL_STEEL_12MM });
    expect(r.lobe_computed).toBe(false);
  });
});
