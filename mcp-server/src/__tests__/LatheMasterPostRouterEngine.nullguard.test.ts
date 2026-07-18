/**
 * LatheMasterPostRouterEngine -- findMachine null-guard regression
 * (U-PP-LATHE-ROUTER-NULLGUARD, slot:echo 2026-06-27)
 *
 * The post-training harness driving the `lathe_master_post_route` dispatcher action with an
 * operations-shaped job (no machine_id) CRASHED the router: route() passes `params.machine_id`
 * via an unsound `as string` cast, so `findMachine(undefined)` hit `undefined.trim()` ->
 * "Cannot read properties of undefined (reading 'trim')". A router must FAIL LOUD (return the
 * clean fallback route), not crash on bad input. The guard returns undefined for a non-string
 * identifier, so route() takes its existing `fallbackRoute` path.
 *
 * These run at the SOURCE level (vitest imports src) -- the live :3100 server caches the prior
 * build, so it cannot validate a fresh engine edit; this test is the authoritative proof.
 */
import { describe, it, expect } from "vitest";
import { latheMasterPostRouterEngine } from "../engines/LatheMasterPostRouterEngine.js";

describe("LatheMasterPostRouterEngine -- findMachine null-guard (R12 fail-loud, not fail-crash)", () => {
  it("does NOT crash on an undefined machineId -- returns the clean fallback route", () => {
    // Pre-fix this threw "Cannot read properties of undefined (reading 'trim')".
    expect(() => latheMasterPostRouterEngine.route({ machineId: undefined as unknown as string })).not.toThrow();
    const r = latheMasterPostRouterEngine.route({ machineId: undefined as unknown as string });
    expect(r.postPath).toBe("fallback");
    expect(r.warnings.some((w) => /Machine not found/i.test(w))).toBe(true);
  });

  it("does NOT crash on a non-string machineId (e.g. a number) -- clean fallback", () => {
    expect(() => latheMasterPostRouterEngine.route({ machineId: 123 as unknown as string })).not.toThrow();
    const r = latheMasterPostRouterEngine.route({ machineId: 123 as unknown as string });
    expect(r.postPath).toBe("fallback");
  });

  it("still resolves a VALID machineId end-to-end (the guard does not break real lookups)", () => {
    const r = latheMasterPostRouterEngine.route({ machineId: "okuma-lb3000" });
    expect(r.success).toBe(true);
    expect(r.postPath).toBe("direct");
    expect(r.controllerFamily).toBe("okuma");
  });
});
