/**
 * businessDispatcher.commission-wire.test.ts
 *
 * HOTEL quote-to-ship sales-comp leg — round-trip wire test for the `commission_report`
 * action wrapping CommissionReportEngine through prism_business. Invokes THROUGH the
 * dispatcher (schema-validate → getEngine → engine.report → entries), not the engine
 * singleton directly, so the action enum + schema + lazy import + switch case are all
 * proven coherent. Engine math is independently covered by CommissionReportEngine.test.ts.
 *
 * Reference math (default tiers 0:2%, 20:4%, 35:6%, 50:8%):
 *   rev 1000 / cost 600 → 40% margin → 6% → $60
 *   rev 1000 / margin 300 → 30% → 4% → $40
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerBusinessDispatcher(fakeServer);
  return { handler };
}

/** Invoke an action through the dispatcher and unwrap the slimResponse text payload. */
async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) text = r.content[0].text;
  else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") text = r.text;
  if (text) { try { return JSON.parse(text); } catch { /* fall through */ } }
  return r;
}

describe("prism_business commission_report wire (HOTEL quote-to-ship sales-comp)", () => {
  let handler: Handler;
  beforeAll(async () => { handler = await createServer().handler; });

  it("happy path: deals → entries array with correct tiered commission (rev1000/cost600 → 40% → 6% → $60)", async () => {
    const r = await call(handler, "commission_report", { deals: [{ salesperson: "Ana", revenue: 1000, cost: 600 }] });
    expect(Array.isArray(r)).toBe(true);          // returns the entries array directly (page contract)
    expect(r).toHaveLength(1);
    expect(r[0].salesperson).toBe("Ana");
    expect(r[0].margin_pct).toBe(40);
    expect(r[0].commission_rate_pct).toBe(6);
    expect(r[0].commission_amount).toBe(60);
    expect(r[0].deals_closed).toBe(1);
  });

  it("explicit-margin path through the dispatcher: rev1000/margin300 → 30% → 4% → $40", async () => {
    const r = await call(handler, "commission_report", { deals: [{ salesperson: "Bo", revenue: 1000, margin: 300 }] });
    expect(r[0].commission_amount).toBe(40);
  });

  it("multi-rep aggregation + commission-desc sort survives the round trip", async () => {
    const r = await call(handler, "commission_report", {
      deals: [
        { salesperson: "A", revenue: 1000, cost: 900 },  // 10% → 2% → 20
        { salesperson: "A", revenue: 2000, cost: 1000 }, // 50% → 8% → 160
        { salesperson: "B", revenue: 500, cost: 250 },   // 50% → 8% → 40
      ],
    });
    expect(r.map((e: any) => e.salesperson)).toEqual(["A", "B"]); // A($180) before B($40)
    expect(r[0].commission_amount).toBe(180);
    expect(r[0].revenue).toBe(3000);
    expect(r[1].commission_amount).toBe(40);
  });

  it("no deals → empty entries array (honest empty, no crash)", async () => {
    const r = await call(handler, "commission_report", {});
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(0);
  });

  it("custom tiers override flows through the action", async () => {
    const r = await call(handler, "commission_report", {
      deals: [{ salesperson: "Z", revenue: 1000, cost: 0 }], // 100% margin
      tiers: [{ min_margin_pct: 0, rate_pct: 10 }],          // flat 10%
    });
    expect(r[0].commission_amount).toBe(100);
  });

  it("schema rejects a non-numeric revenue (Invalid params) — the zod gate fires before the engine", async () => {
    const r = await call(handler, "commission_report", { deals: [{ salesperson: "x", revenue: "lots" }] });
    expect(String(r.error ?? "")).toMatch(/invalid params/i);
  });

  it("excludes garbage deals but still returns the valid rep (fail-loud exclusion survives the wire)", async () => {
    const r = await call(handler, "commission_report", {
      deals: [
        { salesperson: "Y", revenue: 1000, cost: 600 },  // valid → $60
        { salesperson: "Z", revenue: -5, cost: 0 },       // non-positive revenue → excluded
      ],
    });
    expect(r).toHaveLength(1);
    expect(r[0].salesperson).toBe("Y");
    expect(r[0].commission_amount).toBe(60);
  });
});
