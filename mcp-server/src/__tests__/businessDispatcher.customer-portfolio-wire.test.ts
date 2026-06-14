/**
 * BRIDGE-WIRING — CustomerPortfolioMinerEngine → prism_business wiring test
 *
 * Round-trips the 6 customer_portfolio_* actions through businessDispatcher's
 * prism_business tool. CustomerPortfolioMinerEngine was a built-but-orphaned
 * engine (no dispatcher reference) — this unit wires it.
 *
 * The engine mines the JM Die CNC LATHE archive from the filesystem. On a host
 * without the archive every FS-backed method degrades gracefully (empty list /
 * empty profile / null), so these tests assert the dispatcher CONTRACT + result
 * SHAPE + the schema guards — never host-specific archive contents.
 *
 * Real-value assertions (no toBeDefined() stubs):
 *   - getSources() returns fixed reference values (118 customers, 15599 programs).
 *   - mineCustomer() of any name returns a well-formed CustomerProfile.
 *   - Schema guards reject missing/empty params, non-positive counts, and
 *     path-traversal customer names.
 *
 * @milestone BRIDGE-WIRING / customer-portfolio
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

let handler:
  | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
      if (_name === "prism_business") handler = fn;
    },
  };
  registerBusinessDispatcher(fakeServer as any);
  if (!handler) throw new Error("businessDispatcher did not register prism_business");
});

async function call(
  action: string,
  params: Record<string, any> = {},
): Promise<{ raw: any; ok: boolean; error?: string }> {
  const r = await handler!({ action, params });
  let parsed: any = r;
  if (r && Array.isArray(r.content) && r.content[0]?.text) {
    try { parsed = JSON.parse(r.content[0].text); } catch { /* keep raw */ }
  } else if (r && r.type === "text" && typeof r.text === "string") {
    try { parsed = JSON.parse(r.text); } catch { /* keep raw */ }
  }
  const error = parsed?.error;
  const ok = !error && parsed?.success !== false;
  return { raw: parsed?.result ?? parsed?.data ?? parsed, ok, error };
}

describe("businessDispatcher → customer_portfolio_* (CustomerPortfolioMinerEngine wiring)", () => {
  it("customer_portfolio_sources → fixed archive reference values", async () => {
    const { raw, ok } = await call("customer_portfolio_sources");
    expect(ok).toBe(true);
    expect(raw.expectedCustomers).toBe(118);
    expect(raw.expectedPrograms).toBe(15599);
    expect(typeof raw.rootPath).toBe("string");
    expect(raw.description).toContain("JM Die");
  });

  it("customer_portfolio_list → { customers: string[] }", async () => {
    const { raw, ok } = await call("customer_portfolio_list");
    expect(ok).toBe(true);
    expect(Array.isArray(raw.customers)).toBe(true);
    raw.customers.forEach((c: unknown) => expect(typeof c).toBe("string"));
  });

  it("customer_portfolio_mine → well-formed CustomerProfile for any name", async () => {
    const { raw, ok } = await call("customer_portfolio_mine", { customer_name: "ALCOA" });
    expect(ok).toBe(true);
    expect(raw.name).toBe("ALCOA");
    expect(typeof raw.programCount).toBe("number");
    expect(raw.programCount).toBeGreaterThanOrEqual(0);
    expect(["platinum", "gold", "silver", "bronze"]).toContain(raw.tier);
    expect(Array.isArray(raw.toolPreferences)).toBe(true);
  });

  it("customer_portfolio_harvest → PortfolioMineResult shape", async () => {
    const { raw, ok } = await call("customer_portfolio_harvest", { max_customers: 2 });
    expect(ok).toBe(true);
    expect(Array.isArray(raw.customers)).toBe(true);
    expect(typeof raw.totalCustomers).toBe("number");
    expect(typeof raw.totalPrograms).toBe("number");
    expect(raw.byTier).toMatchObject({ platinum: expect.any(Number), bronze: expect.any(Number) });
    expect(Array.isArray(raw.topCustomers)).toBe(true);
    expect(typeof raw.timestamp).toBe("string");
  });

  it("customer_portfolio_audit → audit summary shape", async () => {
    const { raw, ok } = await call("customer_portfolio_audit");
    expect(ok).toBe(true);
    expect(typeof raw.totalCustomers).toBe("number");
    expect(typeof raw.sampleSize).toBe("number");
    expect(typeof raw.avgToolsPerProgram).toBe("number");
    expect(raw.byTier).toMatchObject({ gold: expect.any(Number), silver: expect.any(Number) });
  });

  it("customer_portfolio_profile → null for a customer not in the archive", async () => {
    const { raw, ok } = await call("customer_portfolio_profile", {
      name_query: "ZZZNonexistentCustomerXYZ",
    });
    expect(ok).toBe(true);
    expect(raw).toBeNull();
  });

  // ── Failure modes — schema rejection ──

  it("rejects customer_portfolio_mine with missing customer_name", async () => {
    const { ok, error } = await call("customer_portfolio_mine", {});
    expect(ok).toBe(false);
    expect(String(error).toLowerCase()).toContain("invalid");
  });

  it("rejects customer_portfolio_mine with an empty customer_name", async () => {
    const { ok } = await call("customer_portfolio_mine", { customer_name: "" });
    expect(ok).toBe(false);
  });

  it("rejects customer_portfolio_harvest with max_customers = 0", async () => {
    const { ok } = await call("customer_portfolio_harvest", { max_customers: 0 });
    expect(ok).toBe(false);
  });

  it("rejects customer_portfolio_harvest with a negative max_customers", async () => {
    const { ok } = await call("customer_portfolio_harvest", { max_customers: -3 });
    expect(ok).toBe(false);
  });

  // ── Adversarial — path-traversal guard ──

  it("rejects a customer_name with forward-slash path traversal", async () => {
    const { ok } = await call("customer_portfolio_mine", { customer_name: "../../etc/passwd" });
    expect(ok).toBe(false);
  });

  it("rejects a customer_name with backslash path traversal", async () => {
    const { ok } = await call("customer_portfolio_mine", { customer_name: "..\\..\\windows" });
    expect(ok).toBe(false);
  });

  it("rejects a separator-free name that still contains '..'", async () => {
    // passes the character-class regex (dots allowed) but the .refine() blocks "..".
    const { ok } = await call("customer_portfolio_mine", { customer_name: "ACME..CORP" });
    expect(ok).toBe(false);
  });
});
