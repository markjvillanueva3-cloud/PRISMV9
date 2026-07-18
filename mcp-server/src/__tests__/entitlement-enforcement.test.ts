import { describe, it, expect, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { requireTier, checkTierAccess } from "../middleware/tierGate.js";
import { getUsageCounterSync } from "../middleware/usageCounter.js";

/**
 * U-COMM-03 round-trip: prove the entitlement gate actually blocks/allows based
 * on req.user.plan + usage (the shape attachUserPlan populates). This is the
 * enforcement that was dormant before the keystone wire.
 */

function mockReqRes(
  plan: string,
  usage: Record<string, number> = {},
  extra: { overrides?: Record<string, boolean>; licenses?: string[] } = {},
) {
  const req = { user: { userId: "u", plan, usage, ...extra } } as unknown as Request;
  let statusCode = 0;
  let body: any = null;
  const res = {
    status(c: number) { statusCode = c; return this; },
    json(b: any) { body = b; return this; },
  } as unknown as Response;
  return { req, res, get code() { return statusCode; }, get body() { return body; } };
}

describe("entitlement enforcement -- requireTier round-trip", () => {
  it("blocks a free user from program_generate (403 TIER_LIMIT)", () => {
    const m = mockReqRes("free");
    let nextCalled = false;
    requireTier("program_generate")(m.req, m.res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(m.code).toBe(403);
    expect(m.body.error.code).toBe("TIER_LIMIT");
  });

  it("allows a pro user to program_generate (within 5/day)", () => {
    const m = mockReqRes("pro", { program_generate: 2 });
    let nextCalled = false;
    requireTier("program_generate")(m.req, m.res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(m.code).toBe(0);
  });

  it("blocks a free user on the 11th speed_feed of the day", () => {
    const atLimit = mockReqRes("free", { speed_feed: 10 });
    let blocked = true;
    requireTier("speed_feed")(atLimit.req, atLimit.res, () => { blocked = false; });
    expect(blocked).toBe(true);
    expect(atLimit.code).toBe(403);

    // ...but the 10th (usage 9) is allowed
    const underLimit = mockReqRes("free", { speed_feed: 9 });
    let allowed = false;
    requireTier("speed_feed")(underLimit.req, underLimit.res, () => { allowed = true; });
    expect(allowed).toBe(true);
  });

  it("allows starter+ unlimited speed_feed regardless of usage", () => {
    const m = mockReqRes("starter", { speed_feed: 9999 });
    let allowed = false;
    requireTier("speed_feed")(m.req, m.res, () => { allowed = true; });
    expect(allowed).toBe(true);
  });

  it("blocks free/starter/pro/shop from api_access; allows enterprise", () => {
    for (const p of ["free", "starter", "pro", "shop"]) {
      expect(checkTierAccess(p as any, "api_access").allowed).toBe(false);
    }
    expect(checkTierAccess("enterprise", "api_access").allowed).toBe(true);
  });

  it("defaults a missing plan to free (fail safe -> blocked on paid features)", () => {
    const req = { user: {} } as unknown as Request;
    let statusCode = 0;
    const res = { status(c: number) { statusCode = c; return this; }, json() { return this; } } as unknown as Response;
    let nextCalled = false;
    requireTier("simulation")(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
  });
});

describe("entitlement enforcement -- U-COMM-08 perpetual license grant (above plan)", () => {
  it("a perpetual license grants speed_feed to a FREE user past the daily cap", () => {
    // free cap is 10/day; this user is at 9999 but holds a perpetual sfc license
    const m = mockReqRes("free", { speed_feed: 9999 }, { licenses: ["speed_feed"] });
    let allowed = false;
    requireTier("speed_feed")(m.req, m.res, () => { allowed = true; });
    expect(allowed).toBe(true);
    expect(m.code).toBe(0);
  });

  it("a license for one feature does NOT unlock a different feature", () => {
    // holds speed_feed perpetual, but program_generate is still plan-gated (free=0)
    const m = mockReqRes("free", {}, { licenses: ["speed_feed"] });
    let blocked = true;
    requireTier("program_generate")(m.req, m.res, () => { blocked = false; });
    expect(blocked).toBe(true);
    expect(m.code).toBe(403);
    expect(m.body.error.code).toBe("TIER_LIMIT");
  });

  it("an admin override-DENY beats a perpetual license grant (deny is the strongest control)", () => {
    const m = mockReqRes("free", { speed_feed: 0 }, { licenses: ["speed_feed"], overrides: { speed_feed: false } });
    let nextCalled = false;
    requireTier("speed_feed")(m.req, m.res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(m.code).toBe(403);
    expect(m.body.error.code).toBe("ENTITLEMENT_REVOKED");
  });

  it("no license + free plan still blocks the gated feature (regression guard)", () => {
    const m = mockReqRes("free", { speed_feed: 9999 }, { licenses: [] });
    let blocked = true;
    requireTier("speed_feed")(m.req, m.res, () => { blocked = false; });
    expect(blocked).toBe(true);
    expect(m.code).toBe(403);
  });
});

describe("entitlement enforcement -- usage counter feeds the gate", () => {
  beforeEach(() => {
    // counter is a process singleton; use unique user ids per assertion
  });

  it("increment accumulates per user/feature/day and getDayCounts reflects it", () => {
    const c = getUsageCounterSync();
    const uid = `u-${Math.floor(Math.random() * 1e9)}`;
    expect(c.getCount(uid, "speed_feed")).toBe(0);
    expect(c.increment(uid, "speed_feed")).toBe(1);
    expect(c.increment(uid, "speed_feed")).toBe(2);
    expect(c.getDayCounts(uid)).toEqual({ speed_feed: 2 });
  });

  it("a free user crosses the cap after 10 real increments -> gate flips to blocked", () => {
    const c = getUsageCounterSync();
    const uid = `u-${Math.floor(Math.random() * 1e9)}`;
    for (let i = 0; i < 10; i++) c.increment(uid, "speed_feed");
    const usage = c.getDayCounts(uid);
    // simulate the next request: attachUserPlan would put usage on req.user
    expect(checkTierAccess("free", "speed_feed", usage.speed_feed).allowed).toBe(false);
  });
});
