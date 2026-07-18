import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Request, Response } from "express";
import { EntitlementOverrideStore } from "../engines/EntitlementOverrideStore.js";
import { requireTier, isGatedFeature, GATED_FEATURES } from "../middleware/tierGate.js";

let dir: string;
let storePath: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "prism-ovr-"));
  storePath = join(dir, "overrides.json");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("EntitlementOverrideStore (U-COMM-05)", () => {
  it("isDenied is true ONLY for an explicit false override", () => {
    const s = new EntitlementOverrideStore(storePath);
    expect(s.isDenied("u1", "quoting")).toBe(false); // absent
    s.setOverride("u1", "quoting", false);
    expect(s.isDenied("u1", "quoting")).toBe(true);
    s.setOverride("u1", "quoting", true); // re-grant clears the denial
    expect(s.isDenied("u1", "quoting")).toBe(false);
  });

  it("persists across instances and lists all", () => {
    const s = new EntitlementOverrideStore(storePath);
    s.setOverride("u1", "simulation", false);
    s.setOverride("u2", "api_access", false);
    const s2 = new EntitlementOverrideStore(storePath);
    expect(s2.isDenied("u1", "simulation")).toBe(true);
    expect(s2.getOverrides("u1")).toEqual({ simulation: false });
    expect(Object.keys(s2.listAll()).sort()).toEqual(["u1", "u2"]);
  });

  it("removeOverride reverts to plan-decides and drops empty user entries", () => {
    const s = new EntitlementOverrideStore(storePath);
    s.setOverride("u1", "quoting", false);
    s.removeOverride("u1", "quoting");
    expect(s.isDenied("u1", "quoting")).toBe(false);
    expect(s.listAll()).toEqual({});
  });

  it("throws on missing userId/feature; never on absent reads", () => {
    const s = new EntitlementOverrideStore(storePath);
    expect(() => s.setOverride("", "x", false)).toThrow(/userId required/);
    expect(() => s.setOverride("u", "", false)).toThrow(/feature required/);
    expect(s.getOverrides("")).toEqual({});
    expect(s.isDenied(null, "x")).toBe(false);
  });

  it("fails loud on a corrupt store (no reset-then-clobber)", () => {
    writeFileSync(storePath, "{ not json", "utf-8");
    const s = new EntitlementOverrideStore(storePath);
    expect(() => s.isDenied("u", "x")).toThrow(/corrupt store/);
  });
});

describe("isGatedFeature -- honesty boundary for override admin endpoint (U-COMM-05)", () => {
  it("accepts only enforceable backend feature keys, rejects product/FE keys that nothing gates", () => {
    // enforced keys -> true
    for (const f of ["speed_feed", "program_generate", "simulation", "api_access", "stochastic", "dfm"]) {
      expect(isGatedFeature(f)).toBe(true);
    }
    // FE product keys with no live route gate -> false (would be a silent no-op revoke)
    for (const f of ["quoting", "sfc.nine_axis", "cadcam", "wizard.mill", "erp", "post.generate", "bogus"]) {
      expect(isGatedFeature(f)).toBe(false);
    }
  });

  it("GATED_FEATURES is the canonical enforceable set (10 keys)", () => {
    expect(GATED_FEATURES.length).toBe(10);
    expect([...GATED_FEATURES].sort()).toEqual(
      ["api_access", "dfm", "edm_program", "laser_program", "print_to_program", "program_generate", "simulation", "speed_feed", "stochastic", "waterjet_program"],
    );
  });
});

describe("requireTier honors per-seat overrides (U-COMM-05 wiring)", () => {
  function mockReqRes(plan: string, overrides: Record<string, boolean>) {
    const req = { user: { userId: "u", plan, usage: {}, overrides } } as unknown as Request;
    let code = 0;
    let body: any = null;
    const res = {
      status(c: number) { code = c; return this; },
      json(b: any) { body = b; return this; },
    } as unknown as Response;
    return { req, res, get code() { return code; }, get body() { return body; } };
  }

  it("blocks a feature the plan allows but the admin revoked (403 ENTITLEMENT_REVOKED)", () => {
    // shop plan includes simulation; admin revoked it for this user
    const m = mockReqRes("shop", { simulation: false });
    let nextCalled = false;
    requireTier("simulation")(m.req, m.res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(m.code).toBe(403);
    expect(m.body.error.code).toBe("ENTITLEMENT_REVOKED");
  });

  it("allows a feature when no override denies it (plan still decides)", () => {
    const m = mockReqRes("shop", { api_access: false }); // unrelated override
    let nextCalled = false;
    requireTier("simulation")(m.req, m.res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(m.code).toBe(0);
  });

  it("an override of true does NOT grant above the plan ceiling", () => {
    // free plan does NOT include simulation; an override=true must not grant it
    const m = mockReqRes("free", { simulation: true });
    let nextCalled = false;
    requireTier("simulation")(m.req, m.res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(m.code).toBe(403);
    expect(m.body.error.code).toBe("TIER_LIMIT"); // plan gate, not override
  });
});
