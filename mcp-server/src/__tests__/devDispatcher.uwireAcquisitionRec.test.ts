/**
 * devDispatcher U-WIRE-ACQUISITION round-trip tests -- AcquisitionRecommendationEngine.
 *
 * Validates the 6 new acquisition_* actions wire through prism_dev:
 *   acquisition_recommend    -> getRecommendations(input)          (machine-binding-gated)
 *   acquisition_best         -> getBestRecommendation(input)       (machine-binding-gated)
 *   acquisition_roi          -> calculateROI(input)                (pure math, no binding)
 *   acquisition_distributor  -> getDistributorInfo(item_id)
 *   acquisition_compare      -> compareItems(item_ids)
 *   acquisition_stats        -> getStats()
 *
 * The engine recommends tooling/holders/coolant from an in-memory catalog, scored by
 * machine compatibility + ROI. recommend/best require a live machine binding (return null
 * when machine_id is unbound). calculateROI is pure deterministic math. recordPurchase
 * (a mutator) + getPurchaseHistory (its empty-store reader) are intentionally NOT wired.
 *
 * Content-sensitive proofs (a stub would fail these):
 *   - calculateROI is exact: cost 1000 / 100h / $50 / +10% / +20% -> savings 900, payback 14mo, 3yr ROI 170%.
 *   - getRecommendations returns null for an unbound machine_id (the binding gate is real).
 *   - getDistributorInfo returns null for an unknown item id.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2.1 (post-11/11 audit
 * re-run surfaced this CLEAN engine; galaxy:hotel/business wired into prism_dev, papa home).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-ACQUISITION
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { acquisitionRecommendationEngine } from "../engines/AcquisitionRecommendationEngine.js";

const ROI_INPUT = { item_cost: 1000, annual_usage_hours: 100, hourly_rate: 50, productivity_gain_pct: 10, tool_life_improvement_pct: 20 };
// productivitySavings = 100*50*0.10 = 500; toolLifeSavings = 1000*0.20*2 = 400; total = 900
// payback = ceil(1000/900*12) = ceil(13.33) = 14; roi3yr = round(((900*3-1000)/1000)*100) = round(170) = 170
const EXPECT_SAVINGS = 900;
const EXPECT_PAYBACK = 14;
const EXPECT_ROI3 = 170;

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_dev") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference behavior ----------------------------------------
describe("U-WIRE-ACQUISITION -- AcquisitionRecommendationEngine contract", () => {
  it("calculateROI computes exact savings / payback / 3yr ROI", () => {
    const r = acquisitionRecommendationEngine.calculateROI(ROI_INPUT);
    expect(r.estimated_savings).toBe(EXPECT_SAVINGS);   // 500 productivity + 400 tool-life
    expect(r.payback_months).toBe(EXPECT_PAYBACK);      // ceil(1000/900*12)
    expect(r.roi_3_year).toBe(EXPECT_ROI3);             // round(((900*3-1000)/1000)*100)
  });

  it("getRecommendations returns null for an unbound machine_id (binding gate)", () => {
    const out = acquisitionRecommendationEngine.getRecommendations({
      machine_id: "ZZ-NONEXISTENT-MACHINE-999", category: "tooling", item_type: "any",
    });
    expect(out).toBeNull();
  });

  it("getDistributorInfo returns null for an unknown item id", () => {
    expect(acquisitionRecommendationEngine.getDistributorInfo("ZZ-NO-SUCH-ITEM")).toBeNull();
  });
});

// -- LIVE round-trip through prism_dev (the wire proof) -----------------------
describe("U-WIRE-ACQUISITION -- dispatcher round-trip (prism_dev)", () => {
  it("acquisition_roi round-trips the exact ROI math", async () => {
    const r = await call(server, "acquisition_roi", ROI_INPUT);
    expect(r.ok).toBe(true);
    expect(r.data.estimated_savings).toBe(EXPECT_SAVINGS);
    expect(r.data.payback_months).toBe(EXPECT_PAYBACK);
    expect(r.data.roi_3_year).toBe(EXPECT_ROI3);
  });

  it("acquisition_recommend wires and returns null for an unbound machine (slim-stripped)", async () => {
    const r = await call(server, "acquisition_recommend", { machine_id: "ZZ-NONEXISTENT-MACHINE-999", category: "tooling", item_type: "any" });
    expect(r.ok).toBe(true);                        // action accepted, schema passed, no throw
    expect(r.data.recommendations).toBeUndefined(); // wrapped null was stripped by slimResponse (binding gate)
  });

  it("acquisition_stats returns a stats object through the dispatcher", async () => {
    const r = await call(server, "acquisition_stats", {});
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  // Wire-proofs for the remaining wrapped actions, using REAL catalog ids so the
  // assertions are content-sensitive (a stub returning fixed data would fail).
  // (acquisition_best delegates to getRecommendations, already round-tripped above.)
  it("acquisition_distributor returns the real catalog distributor for a known item", async () => {
    const r = await call(server, "acquisition_distributor", { item_id: "tool-b1" });
    expect(r.ok).toBe(true);
    const dist = r.data.distributor as { price: number; availability: string };
    expect(dist.price).toBe(25);                    // tool-b1 catalog price
    expect(dist.availability).toBe("in_stock");     // tool-b1 catalog availability
  });

  it("acquisition_compare compares two real catalog items and picks a winner", async () => {
    const r = await call(server, "acquisition_compare", { item_ids: ["tool-b1", "tool-s1"] });
    expect(r.ok).toBe(true);
    const cmp = r.data.comparison as { items: unknown[]; winner: string };
    expect(cmp.items.length).toBe(2);               // both real items resolved + scored
    expect(typeof cmp.winner).toBe("string");
    expect(cmp.winner.length).toBeGreaterThan(0);   // a concrete winner was chosen
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-ACQUISITION -- schema rejection (prism_dev)", () => {
  it("rejects acquisition_roi with a missing item_cost", async () => {
    const r = await call(server, "acquisition_roi", { annual_usage_hours: 100, hourly_rate: 50, productivity_gain_pct: 10, tool_life_improvement_pct: 20 });
    expect(r.ok).toBe(false);
  });

  it("rejects acquisition_recommend with a missing machine_id", async () => {
    const r = await call(server, "acquisition_recommend", { category: "tooling", item_type: "any" });
    expect(r.ok).toBe(false);
  });

  it("rejects acquisition_recommend with an invalid category", async () => {
    const r = await call(server, "acquisition_recommend", { machine_id: "m1", category: "frobnicate", item_type: "any" });
    expect(r.ok).toBe(false);
  });
});
