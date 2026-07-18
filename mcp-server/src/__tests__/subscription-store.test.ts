import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SubscriptionStore } from "../engines/SubscriptionStore.js";

let dir: string;
let storePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "prism-substore-"));
  storePath = join(dir, "subscription-store.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("SubscriptionStore -- plan resolution", () => {
  it("returns free for unknown / empty userId (fail safe)", () => {
    const s = new SubscriptionStore(storePath);
    expect(s.getPlan("nobody")).toBe("free");
    expect(s.getPlan("")).toBe("free");
    expect(s.getPlan(undefined)).toBe("free");
    expect(s.getPlan(null)).toBe("free");
  });

  it("returns the set plan after setPlan, and persists across instances", () => {
    const s = new SubscriptionStore(storePath);
    s.setPlan("user-1", "pro");
    expect(s.getPlan("user-1")).toBe("pro");
    expect(existsSync(storePath)).toBe(true);

    // Fresh instance reads from disk
    const s2 = new SubscriptionStore(storePath);
    expect(s2.getPlan("user-1")).toBe("pro");
    expect(s2.getRecord("user-1")?.status).toBe("active");
  });

  it("falls back to free entitlements for canceled / past_due", () => {
    const s = new SubscriptionStore(storePath);
    s.setPlan("u-cancel", "shop", "canceled");
    s.setPlan("u-pastdue", "enterprise", "past_due");
    s.setPlan("u-active", "shop", "active");
    expect(s.getPlan("u-cancel")).toBe("free");
    expect(s.getPlan("u-pastdue")).toBe("free");
    expect(s.getPlan("u-active")).toBe("shop");
    // the record still remembers the real plan even when entitlement is downgraded
    expect(s.getRecord("u-cancel")?.plan).toBe("shop");
  });

  it("grants entitlements ONLY for active/trialing; every other status -> free (allowlist)", () => {
    const s = new SubscriptionStore(storePath);
    s.setPlan("u-active", "pro", "active");
    s.setPlan("u-trial", "shop", "trialing");
    s.setPlan("u-none", "pro", "none");
    expect(s.getPlan("u-active")).toBe("pro");
    expect(s.getPlan("u-trial")).toBe("shop");
    expect(s.getPlan("u-none")).toBe("free"); // had a plan but no paying status
    // an unknown/Stripe-extra status (unpaid, incomplete_expired, paused) must NOT grant
    for (const bad of ["unpaid", "incomplete_expired", "paused"]) {
      s.setPlan("u-bad", "enterprise", bad as never);
      expect(s.getPlan("u-bad")).toBe("free");
      expect(s.getRecord("u-bad")?.plan).toBe("enterprise"); // record keeps the real plan
    }
  });

  it("throws on an unknown plan (fail loud, no silent downgrade)", () => {
    const s = new SubscriptionStore(storePath);
    expect(() => s.setPlan("u", "platinum" as never)).toThrow(/unknown plan/);
    expect(() => s.setPlan("", "pro")).toThrow(/userId required/);
  });
});

describe("SubscriptionStore -- Stripe customer linking", () => {
  it("links a customer and resolves userId <-> customerId both ways", () => {
    const s = new SubscriptionStore(storePath);
    s.setPlan("user-7", "starter");
    s.linkCustomer("user-7", "cus_ABC123");
    expect(s.getStripeCustomerId("user-7")).toBe("cus_ABC123");
    expect(s.getUserIdByCustomer("cus_ABC123")).toBe("user-7");
    expect(s.getUserIdByCustomer("cus_NOPE")).toBe(null);
    // setPlan must not drop the linked customer
    s.setPlan("user-7", "pro");
    expect(s.getStripeCustomerId("user-7")).toBe("cus_ABC123");
  });

  it("linkCustomer on a brand-new user creates a free/none record carrying the customer", () => {
    const s = new SubscriptionStore(storePath);
    s.linkCustomer("user-new", "cus_NEW");
    const rec = s.getRecord("user-new");
    expect(rec?.plan).toBe("free");
    expect(rec?.status).toBe("none");
    expect(rec?.stripeCustomerId).toBe("cus_NEW");
  });
});

describe("SubscriptionStore -- corruption safety (no reset-then-clobber)", () => {
  it("throws on an existing-but-corrupt store rather than silently resetting", () => {
    writeFileSync(storePath, "{ this is not json", "utf-8");
    const s = new SubscriptionStore(storePath);
    expect(() => s.getPlan("any")).toThrow(/corrupt store/);
  });

  it("a valid empty store loads as empty (free for all)", () => {
    writeFileSync(storePath, JSON.stringify({ schemaVersion: 1, users: {} }), "utf-8");
    const s = new SubscriptionStore(storePath);
    expect(s.getPlan("any")).toBe("free");
  });
});
