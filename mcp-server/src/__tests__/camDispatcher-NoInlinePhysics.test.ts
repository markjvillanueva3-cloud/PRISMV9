/**
 * camDispatcher: NoInlinePhysicsConstants dispatcher wiring (MS0/U-PPGM04).
 */

import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import { NoInlinePhysicsConstantsEngine, noInlinePhysicsConstantsEngine } from "../engines/NoInlinePhysicsConstantsEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

describe("camDispatcher MS0/U-PPGM04 — action registration", () => {
  it("post_check_no_inlined_constants is in ACTIONS enum", () => {
    expect(ACTIONS.includes("post_check_no_inlined_constants" as typeof ACTIONS[number])).toBe(true);
  });

  it("post_check_no_inlined_constants_or_throw is in ACTIONS enum", () => {
    expect(ACTIONS.includes("post_check_no_inlined_constants_or_throw" as typeof ACTIONS[number])).toBe(true);
  });
});

describe("camDispatcher MS0/U-PPGM04 — lazy-import path resolves", () => {
  it("dynamic import path resolves to NoInlinePhysicsConstantsEngine", async () => {
    const mod = await import("../engines/NoInlinePhysicsConstantsEngine.js");
    expect(typeof mod.NoInlinePhysicsConstantsEngine).toBe("function");
    expect(mod.noInlinePhysicsConstantsEngine).toBe(mod.NoInlinePhysicsConstantsEngine);
  });

  it("singleton equals class itself (static-method engine)", () => {
    expect(noInlinePhysicsConstantsEngine).toBe(NoInlinePhysicsConstantsEngine);
  });
});

describe("camDispatcher MS0/U-PPGM04 — method surface", () => {
  it("engine has scan method (called by post_check_no_inlined_constants case)", () => {
    expect(typeof NoInlinePhysicsConstantsEngine.scan).toBe("function");
  });

  it("engine has scanOrThrow method (called by post_check_no_inlined_constants_or_throw case)", () => {
    expect(typeof NoInlinePhysicsConstantsEngine.scanOrThrow).toBe("function");
  });
});

describe("camDispatcher MS0/U-PPGM04 — dispatcher-mirror E2E", () => {
  it("simulating post_check_no_inlined_constants on clean source returns PASS", () => {
    const params = { source: "var safe = sidecar.kienzle.P.kc1_1;", tier: "shop_floor" as const };
    const result = NoInlinePhysicsConstantsEngine.scan(params.source ?? "", { tier: params.tier });
    expect(result.verdict).toBe("PASS");
    expect(result.tier).toBe("shop_floor");
  });

  it("simulating post_check_no_inlined_constants on dirty source returns HARD_BLOCK on shop_floor", () => {
    const params = { source: `var kc1_1 = ${CANONICAL_KIENZLE.P.kc1_1};`, tier: "shop_floor" as const };
    const result = NoInlinePhysicsConstantsEngine.scan(params.source ?? "", { tier: params.tier });
    expect(result.verdict).toBe("HARD_BLOCK");
    expect(result.summary.high).toBeGreaterThanOrEqual(1);
  });

  it("simulating post_check_no_inlined_constants_or_throw on dirty source throws on shop_floor", () => {
    const params = { source: `var kienzle_P = ${CANONICAL_KIENZLE.P.kc1_1};`, tier: "shop_floor" as const };
    expect(() =>
      NoInlinePhysicsConstantsEngine.scanOrThrow(params.source ?? "", { tier: params.tier }),
    ).toThrow(/HARD_BLOCK/);
  });

  it("simulating post_check_no_inlined_constants_or_throw on dirty source DOES NOT throw on sim tier (only WARN)", () => {
    const params = { source: `var kc1_1 = ${CANONICAL_KIENZLE.P.kc1_1};`, tier: "sim" as const };
    expect(() =>
      NoInlinePhysicsConstantsEngine.scanOrThrow(params.source ?? "", { tier: params.tier }),
    ).not.toThrow();
  });

  it("default tier (no params.tier supplied) is shop_floor — fail closed", () => {
    const params = { source: `var kc1_1 = ${CANONICAL_KIENZLE.P.kc1_1};` };
    const result = NoInlinePhysicsConstantsEngine.scan(params.source ?? "", { tier: undefined });
    expect(result.verdict).toBe("HARD_BLOCK");
    expect(result.tier).toBe("shop_floor");
  });

  it("hook re-export at src/hooks/noInlinePhysicsConstants.ts exposes the same engine", async () => {
    const hookMod = await import("../hooks/noInlinePhysicsConstants.js");
    expect(hookMod.NoInlinePhysicsConstantsEngine).toBe(NoInlinePhysicsConstantsEngine);
    expect(hookMod.noInlinePhysicsConstantsEngine).toBe(NoInlinePhysicsConstantsEngine);
  });
});
