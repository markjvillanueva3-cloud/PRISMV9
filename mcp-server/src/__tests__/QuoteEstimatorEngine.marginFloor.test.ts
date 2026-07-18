/**
 * QuoteEstimatorEngine.marginFloor.test.ts — the margin-floor gate
 * (QUOTING-SYNERGY-MS0/U-QP-MARGIN-FLOOR-GATE, slot:charlie 2026-06-09).
 *
 * Charlie's soul #1 refuse: "emitting-customer-quote-without-margin-floor-gate."
 * The gate flags (never silently emits, never auto-clamps/rejects) a quote whose
 * post-discount margin falls below a config-sourced floor. Behavior is asserted
 * DETERMINISTICALLY via the margin_floor_pct override (not by reverse-engineering
 * the cost model to hit a target margin), so the tests pin the gate's intent —
 * sub-floor → flagged + warned, above-floor → clean — independent of cost internals.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { quoteEstimatorEngine } from "../engines/QuoteEstimatorEngine.js";
import type { QuoteEstimateInput } from "../engines/QuoteEstimatorEngine.js";
import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

const BASE: QuoteEstimateInput = { quantity: 10, material: "aluminum_6061", complexity: "medium" };
const FLOOR_WARN = /below the .*% floor/;

describe("QuoteEstimatorEngine — margin-floor gate", () => {
  it("default floor is 20% and a healthy quote is NOT flagged", () => {
    const q = quoteEstimatorEngine.estimate(BASE);
    expect(q.pricing.margin_floor_pct).toBe(20); // DEFAULT_MARGIN_FLOOR_PCT
    expect(q.pricing.margin_pct).toBeGreaterThanOrEqual(20); // tier-B 35% target, light discounts
    expect(q.pricing.below_margin_floor).toBe(false);
    expect(q.dfm_warnings.some((w) => FLOOR_WARN.test(w))).toBe(false);
  });

  it("an unmeetable floor (99%) flags below_margin_floor + emits exactly one margin warning citing the real margin", () => {
    const q = quoteEstimatorEngine.estimate({ ...BASE, margin_floor_pct: 99 });
    expect(q.pricing.margin_floor_pct).toBe(99);
    expect(q.pricing.below_margin_floor).toBe(true);
    const warns = q.dfm_warnings.filter((w) => w.includes("below the 99% floor"));
    expect(warns.length).toBe(1);
    expect(warns[0]).toContain(`${q.pricing.margin_pct.toFixed(1)}%`); // warning cites the actual margin
  });

  it("a zero floor never flags (margin is always >= 0 with a positive target margin)", () => {
    const q = quoteEstimatorEngine.estimate({ ...BASE, margin_floor_pct: 0 });
    expect(q.pricing.margin_floor_pct).toBe(0);
    expect(q.pricing.below_margin_floor).toBe(false);
    expect(q.dfm_warnings.some((w) => FLOOR_WARN.test(w))).toBe(false);
  });

  it("the default-case floor matches the active ShopConfig profile's declared floor", () => {
    // Honest invariant (NOT a full sourcing proof): the engine reads margin_floor_pct
    // from the active profile via require() mirroring the overhead_pct pattern (~line
    // 371). A direct spy-proof is blocked by vitest's CJS-require/ESM-import instance
    // split (the engine's require resolves a different singleton than this import), and
    // the JM profile floor (20) equals DEFAULT_MARGIN_FLOOR_PCT so value alone cannot
    // distinguish the paths. This asserts the contract -- the default quote floor tracks
    // the profile's declared floor -- and becomes a live divergence guard if they differ.
    const profileFloor = shopConfigurationEngine.getActiveProfile().margin_floor_pct ?? 20;
    const q = quoteEstimatorEngine.estimate(BASE);
    expect(q.pricing.margin_floor_pct).toBe(profileFloor);
  });

  it("boundary: floor exactly equal to the quote's margin does NOT flag (gate is strict <)", () => {
    const base = quoteEstimatorEngine.estimate(BASE);
    const atFloor = quoteEstimatorEngine.estimate({ ...BASE, margin_floor_pct: base.pricing.margin_pct });
    expect(atFloor.pricing.below_margin_floor).toBe(false);
    // One hair above the margin DOES flag — proves the boundary is live, not vacuous.
    const aboveMargin = quoteEstimatorEngine.estimate({ ...BASE, margin_floor_pct: base.pricing.margin_pct + 1 });
    expect(aboveMargin.pricing.below_margin_floor).toBe(true);
  });
});

/**
 * R15 wire-through-dispatcher leg: the engine tests above prove the gate on the
 * SINGLETON; this proves the nested `pricing.below_margin_floor` flag (and the
 * margin warning on `dfm_warnings`) survive the real `prism_business`
 * dispatcher round-trip -- the exact data path a frontend/API consumer reads
 * (POST /api/v1/quote/estimate -> quote_estimate -> quoteEstimator.estimate,
 * returned verbatim). Drives the real registered handler (no network, no mock
 * engine), mirroring CustomerManagementEngine.growth-trends.test.ts.
 */
describe("businessDispatcher -> quote_estimate margin-floor round-trip", () => {
  let handler: ((args: { action: string; params?: Record<string, any> }) => Promise<any>) | null = null;

  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_business") handler = fn;
      },
    };
    registerBusinessDispatcher(fakeServer as any);
    if (!handler) throw new Error("businessDispatcher did not register prism_business");
  });

  async function call(action: string, params: Record<string, any> = {}): Promise<any> {
    const r = await handler!({ action, params });
    if (r && Array.isArray(r.content) && r.content[0]?.text) return JSON.parse(r.content[0].text);
    if (r && r.type === "text" && typeof r.text === "string") return JSON.parse(r.text);
    return r;
  }

  it("a healthy quote round-trips the nested pricing block: below_margin_floor=false + the config floor", async () => {
    const out = await call("quote_estimate", { quantity: 10, material: "aluminum_6061", complexity: "medium" });
    const result = out?.result ?? out?.data ?? out;
    // accessing pricing.* would throw if the block were dropped -- assert a real computed margin, not mere presence
    expect(result.pricing.margin_pct).toBeGreaterThan(0);
    expect(result.pricing.below_margin_floor).toBe(false);
    expect(result.pricing.margin_floor_pct).toBe(20); // ShopConfig active-profile floor, survives the dispatcher
  });

  it("an unmeetable floor override (99%) passes through the .passthrough() schema: below_margin_floor=true + warning on dfm_warnings", async () => {
    const out = await call("quote_estimate", { quantity: 10, material: "aluminum_6061", complexity: "medium", margin_floor_pct: 99 });
    const result = out?.result ?? out?.data ?? out;
    expect(result.pricing.below_margin_floor).toBe(true);
    expect(result.pricing.margin_floor_pct).toBe(99);
    // the operator-facing warning the frontend would surface rides along on dfm_warnings
    expect(result.dfm_warnings.some((w: string) => w.includes("below the 99% floor"))).toBe(true);
  });
});
