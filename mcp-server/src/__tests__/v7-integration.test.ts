import { describe, it, expect } from "vitest";
import { AuthEngineV7 } from "../engines/AuthEngineV7.js";
import { StripeBillingEngine } from "../engines/StripeBillingEngine.js";
import { checkTierAccess } from "../middleware/tierGate.js";

describe("v7 integration: auth → tier → billing", () => {
  const auth = new AuthEngineV7("test-secret-key-must-be-at-least-32-chars!");
  const billing = new StripeBillingEngine({ testMode: true });

  it("free user hits speed_feed limit at 10", async () => {
    const token = await auth.generateToken({ userId: "u1", role: "viewer", plan: "free" });
    const payload = await auth.verifyToken(token);
    expect(checkTierAccess(payload.plan, "speed_feed", 10)).toMatchObject({
      allowed: false,
      reason: expect.any(String),
    });
  });

  it("free user allowed under limit", async () => {
    const token = await auth.generateToken({ userId: "u1", role: "viewer", plan: "free" });
    const payload = await auth.verifyToken(token);
    expect(checkTierAccess(payload.plan, "speed_feed", 5)).toMatchObject({ allowed: true });
  });

  it("pro user can generate programs up to 5/day", async () => {
    const token = await auth.generateToken({ userId: "u2", role: "engineer", plan: "pro" });
    const payload = await auth.verifyToken(token);
    expect(checkTierAccess(payload.plan, "program_generate", 4)).toMatchObject({ allowed: true });
    expect(checkTierAccess(payload.plan, "program_generate", 5)).toMatchObject({
      allowed: false,
      reason: expect.any(String),
    });
  });

  it("enterprise user has unlimited access", async () => {
    const token = await auth.generateToken({ userId: "u3", role: "admin", plan: "enterprise" });
    const payload = await auth.verifyToken(token);
    expect(checkTierAccess(payload.plan, "program_generate", 99999)).toMatchObject({ allowed: true });
    expect(checkTierAccess(payload.plan, "api_access", 0)).toMatchObject({ allowed: true });
  });

  it("post-processor pricing is consistent", () => {
    expect(billing.calculatePostProcessorPrice("monthly", 1)).toBe(900);
    expect(billing.calculatePostProcessorPrice("annual", 1)).toBe(7900);
    expect(billing.calculatePostProcessorPrice("permanent", 1)).toBe(19900);
    expect(billing.calculatePostProcessorPrice("permanent", 5)).toBe(79900);
    expect(billing.calculatePostProcessorPrice("permanent", 20)).toBe(249900);
  });

  it("auth → billing round-trip: token carries plan for tier check", async () => {
    const plans = ["free", "starter", "pro", "shop", "enterprise"] as const;
    for (const plan of plans) {
      const token = await auth.generateToken({ userId: "test", role: "viewer", plan });
      const payload = await auth.verifyToken(token);
      expect(payload.plan).toBe(plan);
    }
  });
});
