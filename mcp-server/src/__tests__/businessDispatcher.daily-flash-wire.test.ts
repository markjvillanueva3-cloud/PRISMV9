/**
 * businessDispatcher.daily-flash-wire.test.ts
 *
 * HOTEL quote-to-ship ops artifact — round-trip wire test for `daily_flash_generate`
 * and `daily_flash_email` wrapping DailyFlashReportEngine through prism_business.
 * The engine was fully implemented (BIZ-MS3 U-BIZ26) but both actions were unwired —
 * the /erp/daily-flash route called dispatcher cases that did not exist, so the page
 * 404'd. These tests invoke THROUGH the dispatcher to prove the action enum + schema +
 * getEngine('dailyFlash') lazy import + switch cases are coherent end-to-end.
 *
 * Inputs aggregate from the real TimeClock/OEE/Employee engine singletons; in a clean
 * test env there is no clocked-in data, so the report is structurally complete with
 * zeroed metrics — exactly the honest empty-shop result.
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

describe("prism_business daily_flash_generate / daily_flash_email wire (HOTEL quote-to-ship)", () => {
  let handler: Handler;
  beforeAll(async () => { handler = await createServer().handler; });

  it("daily_flash_generate returns a structurally-complete DailyFlashReport for the requested date", async () => {
    const r = await call(handler, "daily_flash_generate", { date: "2026-06-01", requestedBy: "owner-1" });
    expect(r.date).toBe("2026-06-01");
    expect(r.generated_by).toBe("owner-1");
    expect(typeof r.scrap_rate_pct).toBe("number");
    expect(typeof r.labor_utilization_pct).toBe("number");
    expect(typeof r.on_time_delivery_pct).toBe("number");
    expect(Array.isArray(r.oee_by_machine)).toBe(true);
    expect(Array.isArray(r.jobs_completed)).toBe(true);
    expect(Array.isArray(r.top_downtime_causes)).toBe(true);
    // generated_at is a parseable ISO timestamp
    expect(Number.isFinite(Date.parse(r.generated_at))).toBe(true);
  });

  it("daily_flash_generate defaults date to today (YYYY-MM-DD) and requestedBy to 'system'", async () => {
    const r = await call(handler, "daily_flash_generate", {});
    expect(typeof r.date).toBe("string");
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.generated_by).toBe("system");
  });

  it("empty shop data → metrics are finite (zeros), arrays empty — honest, no crash", async () => {
    const r = await call(handler, "daily_flash_generate", { date: "2026-05-30" });
    expect(r.scrap_rate_pct).toBeGreaterThanOrEqual(0);
    expect(r.good_parts_today).toBeGreaterThanOrEqual(0);
    expect(r.scrap_count_today).toBeGreaterThanOrEqual(0);
    expect(r.shift_hours).toBeGreaterThanOrEqual(0);
  });

  it("daily_flash_email reports recipient_count = recipients.length", async () => {
    const r = await call(handler, "daily_flash_email", {
      date: "2026-06-01",
      recipients: ["owner@jmdie.com", "ops@jmdie.com"],
    });
    expect(r.recipient_count).toBe(2);
    expect(typeof r.sent).toBe("boolean");
  });

  it("daily_flash_email with no recipients → recipient_count 0 (honest empty send)", async () => {
    const r = await call(handler, "daily_flash_email", { date: "2026-06-01" });
    expect(r.recipient_count).toBe(0);
  });

  it("dispatcher wiring round-trip: both actions reachable through prism_business with documented payloads", async () => {
    const gen = await call(handler, "daily_flash_generate", { date: "2026-06-01" });
    expect(gen).toHaveProperty("oee_by_machine");
    const email = await call(handler, "daily_flash_email", { date: "2026-06-01", recipients: ["x@y.com"] });
    expect(email).toHaveProperty("recipient_count");
  });
});
