/**
 * muS-A18 — CustomerNormalizer
 *
 * Tests CustomerManagementEngine.normalizeCustomers() and round-trips the
 * customer_normalize action through businessDispatcher's prism_business tool.
 *
 * Real-value assertions (no toBeDefined() stubs):
 *   - Whitespace collapse, email lowercasing, phone canonicalization to
 *     (NNN) NNN-NNNN, state uppercasing, zip trimming.
 *   - Dry-run (apply=false) mutates nothing; apply=true persists.
 *   - Duplicate clusters key off the normalized name (alphanumerics only).
 *
 * @milestone ARC-MS1 / muS-A18
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { customerManagementEngine } from "../engines/CustomerManagementEngine.js";
import type { Customer } from "../engines/CustomerManagementEngine.js";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

// ── Engine isolation: normalizeCustomers() is portfolio-wide over a
//    process-global singleton. Maps cleared before each test. Assumes
//    vitest's default serial in-file execution. ──
function reset(): void {
  (customerManagementEngine as any).customers.clear();
  (customerManagementEngine as any).jobHistory.clear();
  (customerManagementEngine as any).nextId = 1;
}

type CustomerInput = Omit<Customer, "id" | "current_balance" | "created_at" | "status">;

function defaults(): CustomerInput {
  return {
    name: "Acme",
    company: "Acme",
    contact_name: "Contact",
    email: "buyer@example.com",
    phone: "(555) 100-2000",
    address: { street: "1 Main St", city: "Town", state: "XX", zip: "00000" },
    credit_limit: 100_000,
    payment_terms: "NET30",
    pricing_tier: "standard",
    discount_pct: 0,
    tax_exempt: false,
    tags: [],
  };
}

/** Create a customer, overriding any default field (incl. nested address). */
function mk(overrides: Partial<CustomerInput> = {}): string {
  const base = defaults();
  return customerManagementEngine.createCustomer({
    ...base,
    ...overrides,
    address: { ...base.address, ...(overrides.address ?? {}) },
  }).id;
}

beforeEach(reset);

describe("CustomerManagementEngine.normalizeCustomers", () => {
  it("already-clean portfolio → no changes, no clusters", () => {
    mk({ name: "Alpha Co" });
    mk({ name: "Beta Co" });
    const r = customerManagementEngine.normalizeCustomers();
    expect(r.total_changes).toBe(0);
    expect(r.customers_with_changes).toBe(0);
    expect(r.duplicate_clusters).toEqual([]);
    expect(r.applied).toBe(false);
    expect(r.recommendation).toContain("already normalized");
  });

  it("collapses whitespace in name — dry run does NOT mutate the record", () => {
    const id = mk({ name: "  Wide   Spaced  Name  " });
    const r = customerManagementEngine.normalizeCustomers();
    expect(r.total_changes).toBe(1);
    expect(r.customers_with_changes).toBe(1);
    const change = r.changes[0];
    expect(change.field).toBe("name");
    expect(change.to).toBe("Wide Spaced Name");
    // dry run: record unchanged
    expect(customerManagementEngine.getCustomer(id)!.name).toBe("  Wide   Spaced  Name  ");
  });

  it("apply=true persists the normalized fields", () => {
    const id = mk({ name: "  Apply   Me  " });
    const r = customerManagementEngine.normalizeCustomers(true);
    expect(r.applied).toBe(true);
    expect(customerManagementEngine.getCustomer(id)!.name).toBe("Apply Me");
  });

  it("lowercases and trims email", () => {
    mk({ email: "  Buyer@EXAMPLE.COM  " });
    const r = customerManagementEngine.normalizeCustomers();
    const change = r.changes.find((c) => c.field === "email")!;
    expect(change.to).toBe("buyer@example.com");
  });

  it("canonicalizes a 10-digit phone to (NNN) NNN-NNNN", () => {
    mk({ phone: "555.123.4567" });
    const r = customerManagementEngine.normalizeCustomers();
    const change = r.changes.find((c) => c.field === "phone")!;
    expect(change.to).toBe("(555) 123-4567");
  });

  it("canonicalizes an 11-digit phone with leading country code", () => {
    mk({ phone: "1-555-123-4567" });
    const r = customerManagementEngine.normalizeCustomers();
    const change = r.changes.find((c) => c.field === "phone")!;
    expect(change.to).toBe("(555) 123-4567");
  });

  it("leaves a non-standard-length phone untouched (no reformat)", () => {
    const id = mk({ phone: "555-HELP" }); // 3 digits → cannot canonicalize
    const r = customerManagementEngine.normalizeCustomers();
    expect(r.total_changes).toBe(0);
    expect(customerManagementEngine.getCustomer(id)!.phone).toBe("555-HELP");
  });

  it("uppercases the state code and trims the zip", () => {
    mk({ address: { street: "1 Main St", city: "Town", state: "ny", zip: "06010 " } });
    const r = customerManagementEngine.normalizeCustomers();
    const state = r.changes.find((c) => c.field === "address.state")!;
    const zip = r.changes.find((c) => c.field === "address.zip")!;
    expect(state.to).toBe("NY");
    expect(zip.to).toBe("06010");
  });

  it("multiple dirty fields on one customer → one customer, many changes", () => {
    mk({ name: "  X  Y  ", email: "A@B.COM", phone: "5551234567" });
    const r = customerManagementEngine.normalizeCustomers();
    expect(r.customers_with_changes).toBe(1);
    expect(r.total_changes).toBe(3);
  });

  it("detects a duplicate cluster across casing/punctuation variants", () => {
    mk({ name: "Acme Inc" });
    mk({ name: "ACME, Inc." });
    mk({ name: "acme   inc" });
    const r = customerManagementEngine.normalizeCustomers();
    expect(r.duplicate_clusters.length).toBe(1);
    const cluster = r.duplicate_clusters[0];
    expect(cluster.normalized_key).toBe("acmeinc");
    expect(cluster.customer_ids.length).toBe(3);
    expect(r.recommendation).toContain("duplicate cluster");
  });

  it("distinct customer names produce no false-positive cluster", () => {
    mk({ name: "Alcoa" });
    mk({ name: "Optimas" });
    mk({ name: "Holo-Krome" });
    const r = customerManagementEngine.normalizeCustomers();
    expect(r.duplicate_clusters).toEqual([]);
  });
});

describe("businessDispatcher → customer_normalize round-trip", () => {
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

  async function call(action: string, params: Record<string, any> = {}): Promise<any> {
    const r = await handler!({ action, params });
    if (r && Array.isArray(r.content) && r.content[0]?.text) return JSON.parse(r.content[0].text);
    if (r && r.type === "text" && typeof r.text === "string") return JSON.parse(r.text);
    return r;
  }

  it("dry-run via dispatcher reports changes without mutating", async () => {
    reset();
    const id = mk({ name: "  Disp   Co  " });
    const out = await call("customer_normalize");
    const report = out?.result ?? out?.data ?? out;
    expect(report.total_changes).toBe(1);
    expect(report.applied).toBe(false);
    expect(customerManagementEngine.getCustomer(id)!.name).toBe("  Disp   Co  ");
  });

  it("apply=true via dispatcher persists the normalization", async () => {
    reset();
    const id = mk({ name: "  Disp   Apply  " });
    const out = await call("customer_normalize", { apply: true });
    const report = out?.result ?? out?.data ?? out;
    expect(report.applied).toBe(true);
    expect(customerManagementEngine.getCustomer(id)!.name).toBe("Disp Apply");
  });
});
