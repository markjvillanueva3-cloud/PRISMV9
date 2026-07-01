import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "../engines/StripeBillingEngine.js";
import { applyWebhookToStore } from "../routes/billing.js";
import { SubscriptionStore } from "../engines/SubscriptionStore.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Synthetic test signing key (NOT a real credential): assembled at runtime.
const SECRET = ["whsec", "test", "0123456789abcdef0123456789abcdef"].join("_");
const WRONG = ["whsec", "wrong", "ffffffffffffffffffffffffffffffff"].join("_");

function sign(rawBody: string, secret: string, ts: number): string {
  const v1 = createHmac("sha256", secret).update(`${ts}.${rawBody}`, "utf8").digest("hex");
  return `t=${ts},v1=${v1}`;
}

describe("verifyStripeSignature (U-COMM-02 security P0)", () => {
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const now = 1_900_000_000;

  it("accepts a correctly signed payload within tolerance", () => {
    const header = sign(body, SECRET, now);
    expect(verifyStripeSignature(body, header, SECRET, 300, now)).toBe(true);
  });

  it("rejects a tampered body (HMAC mismatch)", () => {
    const header = sign(body, SECRET, now);
    expect(verifyStripeSignature(body + "X", header, SECRET, 300, now)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const header = sign(body, SECRET, now);
    expect(verifyStripeSignature(body, header, WRONG, 300, now)).toBe(false);
  });

  it("rejects a stale timestamp outside tolerance (replay defense)", () => {
    const header = sign(body, SECRET, now - 10_000);
    expect(verifyStripeSignature(body, header, SECRET, 300, now)).toBe(false);
  });

  it("accepts a stale timestamp when tolerance is disabled (0)", () => {
    const header = sign(body, SECRET, now - 10_000);
    expect(verifyStripeSignature(body, header, SECRET, 0, now)).toBe(true);
  });

  it("fails closed on malformed / missing inputs", () => {
    expect(verifyStripeSignature("", sign(body, SECRET, now), SECRET, 300, now)).toBe(false);
    expect(verifyStripeSignature(body, "", SECRET, 300, now)).toBe(false);
    expect(verifyStripeSignature(body, "garbage", SECRET, 300, now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${now}`, SECRET, 300, now)).toBe(false); // no v1
    expect(verifyStripeSignature(body, sign(body, SECRET, now), "", 300, now)).toBe(false); // no secret
  });

  it("accepts when any of multiple v1 signatures matches (secret rotation)", () => {
    const goodV1 = createHmac("sha256", SECRET).update(`${now}.${body}`, "utf8").digest("hex");
    const header = `t=${now},v1=deadbeef,v1=${goodV1}`;
    expect(verifyStripeSignature(body, header, SECRET, 300, now)).toBe(true);
  });
});

describe("applyWebhookToStore (U-COMM-02b persistence)", () => {
  function freshStore() {
    const dir = mkdtempSync(join(tmpdir(), "prism-wh-"));
    const store = new SubscriptionStore(join(dir, "s.json"));
    return { store, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  }

  it("subscription_created sets plan + links customer", () => {
    const { store, cleanup } = freshStore();
    try {
      const r = applyWebhookToStore(
        { action: "subscription_created", data: { userId: "u1", plan: "pro", customerId: "cus_1" } },
        store,
      );
      expect(r.applied).toBe(true);
      expect(store.getPlan("u1")).toBe("pro");
      expect(store.getUserIdByCustomer("cus_1")).toBe("u1");
    } finally { cleanup(); }
  });

  it("subscription_canceled downgrades entitlement to free (keeps record plan)", () => {
    const { store, cleanup } = freshStore();
    try {
      applyWebhookToStore({ action: "subscription_created", data: { userId: "u2", plan: "shop", customerId: "cus_2" } }, store);
      const r = applyWebhookToStore({ action: "subscription_canceled", data: { customerId: "cus_2" } }, store);
      expect(r.applied).toBe(true);
      expect(store.getPlan("u2")).toBe("free");          // entitlement downgraded
      expect(store.getRecord("u2")?.plan).toBe("shop");  // real plan remembered
      expect(store.getRecord("u2")?.status).toBe("canceled");
    } finally { cleanup(); }
  });

  it("payment_failed sets past_due (free entitlements)", () => {
    const { store, cleanup } = freshStore();
    try {
      applyWebhookToStore({ action: "subscription_created", data: { userId: "u3", plan: "pro", customerId: "cus_3" } }, store);
      applyWebhookToStore({ action: "payment_failed", data: { customerId: "cus_3" } }, store);
      expect(store.getPlan("u3")).toBe("free");
      expect(store.getRecord("u3")?.status).toBe("past_due");
    } finally { cleanup(); }
  });

  it("propagates a persist failure (so the route can 500 -> Stripe retries, no silent loss)", () => {
    // A store whose write throws must surface, NOT be swallowed.
    const throwingStore = {
      setPlan() { throw new Error("disk full"); },
      linkCustomer() { /* unused */ },
      getUserIdByCustomer() { return "u"; },
      getRecord() { return { userId: "u", plan: "pro", status: "active", updatedAt: "" }; },
    } as unknown as SubscriptionStore;
    expect(() =>
      applyWebhookToStore({ action: "subscription_created", data: { userId: "u", plan: "pro", customerId: "c" } }, throwingStore),
    ).toThrow(/disk full/);
  });

  it("does not apply on missing metadata or unknown customer (fail safe)", () => {
    const { store, cleanup } = freshStore();
    try {
      expect(applyWebhookToStore({ action: "subscription_created", data: { plan: "pro" } }, store).applied).toBe(false);
      expect(applyWebhookToStore({ action: "subscription_canceled", data: { customerId: "cus_unknown" } }, store).applied).toBe(false);
      expect(applyWebhookToStore({ action: "some.other.event", data: {} }, store).applied).toBe(false);
    } finally { cleanup(); }
  });
});
