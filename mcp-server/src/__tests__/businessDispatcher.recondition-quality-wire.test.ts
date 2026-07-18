/**
 * businessDispatcher.recondition-quality-wire.test.ts
 *
 * UNIT-0010 round-trip wire test for the `tool_recondition_quality` action wrapping
 * ReconditioningQualityEngine through prism_business. Invokes THROUGH the dispatcher
 * (enum -> lazy import -> engine.assess), not the singleton, so the action enum entry +
 * switch case + import are proven coherent. Engine math is independently covered by
 * ReconditioningQualityEngine.test.ts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) { resolve(fn); },
  };
  registerBusinessDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) text = r.content[0].text;
  else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") text = r.text;
  if (text) { try { return JSON.parse(text); } catch { /* fall through */ } }
  return r;
}

describe("prism_business tool_recondition_quality wire (UNIT-0010)", () => {
  let handler: Handler;
  beforeAll(async () => { handler = await createServer().handler; });

  it("happy path: pristine first-regrind carbide endmill -> life 0.90, recondition (through the dispatcher)", async () => {
    const r = await call(handler, "tool_recondition_quality", {
      tool_type: "endmill", substrate: "carbide", was_coated: false, recoated: false,
      regrind_cycle: 1, edge_prep_grade: "sharp", geometry_within_spec: true,
    });
    expect(r.life_multiplier).toBeCloseTo(0.9, 4);
    expect(r.recommendation).toBe("recondition");
    expect(r.life_multiplier_uncertainty).toBeGreaterThan(0); // uncertainty carried across the wire
  });

  it("beyond the regrind ceiling survives the round trip -> retire, life 0", async () => {
    const r = await call(handler, "tool_recondition_quality", {
      tool_type: "endmill", substrate: "carbide", was_coated: false, recoated: false,
      regrind_cycle: 6, edge_prep_grade: "sharp", geometry_within_spec: true,
    });
    expect(r.beyond_regrind_limit).toBe(true);
    expect(r.life_multiplier).toBe(0);
    expect(r.recommendation).toBe("retire");
  });

  it("coated-not-recoated warning propagates through the dispatcher", async () => {
    const r = await call(handler, "tool_recondition_quality", {
      tool_type: "drill", substrate: "hss", was_coated: true, recoated: false,
      regrind_cycle: 1, edge_prep_grade: "honed", geometry_within_spec: true,
    });
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.warnings.some((w: string) => /not recoated/i.test(w))).toBe(true);
  });

  it("never crashes the dispatcher on a partial/garbage tool record (engine clamps)", async () => {
    const r = await call(handler, "tool_recondition_quality", { tool_type: "endmill", substrate: "carbide" });
    expect(Number.isFinite(r.life_multiplier)).toBe(true);
    expect(r.life_multiplier).toBeGreaterThanOrEqual(0);
    expect(r.life_multiplier).toBeLessThanOrEqual(1);
  });
});
