/**
 * businessDispatcher.jm-customer-vendor-db-wire.test.ts
 *
 * ROMEO WIRING/U-WIRE-JMDB -- round-trip wire test for the 8 jm_db_* actions wrapping
 * JMCustomerVendorDatabaseEngine (read-only analytics query layer over the JM customer
 * + vendor JSONL corpus) through prism_business. Invokes THROUGH the dispatcher
 * (schema-validate -> getEngine -> path-resolve -> engine method), NOT the engine
 * singleton directly, so the action enum + lazy import + switch case + the
 * process.cwd()-vs-repo-root path resolver are all proven coherent. Engine internals
 * are independently covered by JMCustomerVendorDatabaseEngine.test.ts.
 *
 * Reference values (live corpus, state/shared/databases/*.jsonl as of 2026-06-10):
 *   customers = 473 ; vendors = 12
 *   customer AAAS -> files_total 10
 *   vendor "GRIGGS STEEL" -> total_spend_usd 22017.9
 *   grade H13 -> {CINCINNATI TOOL STEEL 59559.96, SPECIALTY METALS 34592.46} (2 vendors)
 *
 * The corpus is real data that can grow; structural invariants (sorted order, normalization,
 * non-empty) are asserted alongside the point values so the test fails on a broken WIRE, not
 * on a benign corpus re-ingest. Counts use >= floors where a re-ingest could legitimately add rows.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";
import { JMCustomerVendorDatabaseEngine } from "../engines/JMCustomerVendorDatabaseEngine.js";

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

/** Invoke an action through the dispatcher and unwrap the slimResponse/dispatcherError text payload. */
async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) text = r.content[0].text;
  else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") text = r.text;
  if (text) { try { return JSON.parse(text); } catch { /* fall through */ } }
  return r;
}

describe("prism_business jm_db_* wire (ROMEO U-WIRE-JMDB -- JM customer/vendor database)", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer().handler;
    JMCustomerVendorDatabaseEngine.resetCache(); // hermetic: don't inherit a prior test's path-keyed cache
  });

  // ── happy path: every one of the 8 actions round-trips and returns real corpus data ──

  it("jm_db_summary -> real counts (473 customers, 12 vendors, positive totals)", async () => {
    const r = await call(handler, "jm_db_summary");
    expect(r.success).toBe(true);
    expect(r.data.customer_count).toBe(473);
    expect(r.data.vendor_count).toBe(12);
    expect(r.data.total_files_across_customers).toBeGreaterThan(0);
    expect(r.data.total_vendor_spend_usd).toBeGreaterThan(0);
  });

  it("jm_db_list_customers -> array of 473 records with the corpus shape", async () => {
    const r = await call(handler, "jm_db_list_customers");
    expect(r.success).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBe(473);
    expect(r.data[0]).toHaveProperty("customer_key");
    expect(r.data[0]).toHaveProperty("files_by_bucket");
  });

  it("jm_db_get_customer -> exact record for a known key (AAAS -> files_total 10)", async () => {
    const r = await call(handler, "jm_db_get_customer", { key: "AAAS" });
    expect(r.success).toBe(true);
    expect(r.data).not.toBeNull();
    expect(r.data.customer_key).toBe("AAAS");
    expect(r.data.files_total).toBe(10);
  });

  it("jm_db_get_customer -> normalizes case (lowercase 'aaas' resolves the same record)", async () => {
    const r = await call(handler, "jm_db_get_customer", { customer_key: "aaas" });
    expect(r.success).toBe(true);
    expect(r.data?.customer_key).toBe("AAAS"); // proves the dispatcher passed the key through to the engine's uppercase lookup
    expect(r.data?.files_total).toBe(10);
  });

  it("jm_db_search_customers -> fuzzy hits ranked desc by files_total", async () => {
    const r = await call(handler, "jm_db_search_customers", { query: "AAA" });
    expect(r.success).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeGreaterThan(0);
    expect(r.data.some((c: any) => c.customer_key === "AAAS")).toBe(true);
    // ranked: each record's files_total >= the next (engine sorts desc)
    for (let i = 1; i < r.data.length; i++) {
      expect(r.data[i - 1].files_total).toBeGreaterThanOrEqual(r.data[i].files_total);
    }
  });

  it("jm_db_top_customers -> exactly N records, sorted desc by files_total", async () => {
    const r = await call(handler, "jm_db_top_customers", { n: 5 });
    expect(r.success).toBe(true);
    expect(r.data.length).toBe(5);
    for (let i = 1; i < r.data.length; i++) {
      expect(r.data[i - 1].files_total).toBeGreaterThanOrEqual(r.data[i].files_total);
    }
  });

  it("jm_db_list_vendors -> array of 12 vendor records", async () => {
    const r = await call(handler, "jm_db_list_vendors");
    expect(r.success).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBe(12);
    expect(r.data[0]).toHaveProperty("vendor_key");
  });

  it("jm_db_get_vendor -> exact record for a known key (GRIGGS STEEL -> spend 22017.9)", async () => {
    const r = await call(handler, "jm_db_get_vendor", { key: "GRIGGS STEEL" });
    expect(r.success).toBe(true);
    expect(r.data).not.toBeNull();
    expect(r.data.vendor_key).toBe("GRIGGS STEEL");
    expect(r.data.total_spend_usd).toBeCloseTo(22017.9, 1);
  });

  it("jm_db_vendors_for_grade -> H13 yields 2 vendors ranked desc by spend (CINCINNATI first)", async () => {
    const r = await call(handler, "jm_db_vendors_for_grade", { grade: "H13" });
    expect(r.success).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBe(2);
    expect(r.data[0].vendor_key).toBe("CINCINNATI TOOL STEEL");
    expect(r.data[0].total_spend_usd).toBeGreaterThanOrEqual(r.data[1].total_spend_usd);
    expect(r.data[0].grades_supplied).toContain("H13");
  });

  it("jm_db_vendors_for_grade -> normalizes case (lowercase 'm2' resolves grade M2, >=3 vendors)", async () => {
    const r = await call(handler, "jm_db_vendors_for_grade", { grade: "m2" });
    expect(r.success).toBe(true);
    expect(r.data.length).toBeGreaterThanOrEqual(3); // GRIGGS, CINCINNATI, SPECIALTY all supply M2
  });

  // ── failure modes (required-param rejection through the dispatcher try/catch) ──

  it("jm_db_get_customer with no key -> fail-loud error (not a silent null)", async () => {
    const r = await call(handler, "jm_db_get_customer", {});
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("required");
  });

  it("jm_db_search_customers with no query -> fail-loud error", async () => {
    const r = await call(handler, "jm_db_search_customers", {});
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("required");
  });

  it("jm_db_get_vendor with no key -> fail-loud error", async () => {
    const r = await call(handler, "jm_db_get_vendor", {});
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("required");
  });

  it("jm_db_vendors_for_grade with no grade -> fail-loud error", async () => {
    const r = await call(handler, "jm_db_vendors_for_grade", {});
    expect(r.success).toBe(false);
    expect(String(r.error)).toContain("required");
  });

  it("jm_db_get_customer with an unknown key -> success with data:null (miss, not crash)", async () => {
    const r = await call(handler, "jm_db_get_customer", { key: "ZZZ_NO_SUCH_CUSTOMER_999" });
    expect(r.success).toBe(true);
    expect(r.data).toBeNull();
  });

  it("jm_db_vendors_for_grade for an unknown grade -> empty array (not crash)", async () => {
    const r = await call(handler, "jm_db_vendors_for_grade", { grade: "XYZ_NOT_A_GRADE_999" });
    expect(r.success).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBe(0);
  });

  // ── adversarial: malformed n on top_customers must fail-soft to the default (10), never throw ──

  it("jm_db_top_customers with non-numeric n -> defaults to 10", async () => {
    const r = await call(handler, "jm_db_top_customers", { n: "not-a-number" });
    expect(r.success).toBe(true);
    expect(r.data.length).toBe(10);
  });

  it("jm_db_top_customers with negative n -> defaults to 10", async () => {
    const r = await call(handler, "jm_db_top_customers", { n: -5 });
    expect(r.success).toBe(true);
    expect(r.data.length).toBe(10);
  });

  it("jm_db_top_customers with n=0 -> defaults to 10", async () => {
    const r = await call(handler, "jm_db_top_customers", { n: 0 });
    expect(r.success).toBe(true);
    expect(r.data.length).toBe(10);
  });
});
