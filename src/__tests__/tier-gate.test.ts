/**
 * TierGate Middleware — unit tests
 * MIT 6.005: pure function checkTierAccess tested exhaustively as a spec.
 */
import { describe, it, expect } from "vitest";
import { TIER_LIMITS, checkTierAccess } from "../middleware/tierGate.js";

// ============================================================================
// TIER_LIMITS structure
// ============================================================================
describe("TIER_LIMITS", () => {
  it("has all 5 plans", () => {
    const plans = Object.keys(TIER_LIMITS);
    expect(plans).toContain("free");
    expect(plans).toContain("starter");
    expect(plans).toContain("pro");
    expect(plans).toContain("shop");
    expect(plans).toContain("enterprise");
    expect(plans.length).toBe(5);
  });
});

// ============================================================================
// checkTierAccess — return shape
// ============================================================================
describe("checkTierAccess return shape", () => {
  it("returns { allowed, reason } on allowed", () => {
    const result = checkTierAccess("pro", "simulation");
    expect(typeof result.allowed).toBe("boolean");
    expect(typeof result.reason).toBe("string");
  });

  it("returns { allowed, reason } on blocked", () => {
    const result = checkTierAccess("free", "simulation");
    expect(typeof result.allowed).toBe("boolean");
    expect(typeof result.reason).toBe("string");
  });
});

// ============================================================================
// speed_feed
// ============================================================================
describe("speed_feed gating", () => {
  it("free allows speed_feed at usage 9 (below limit of 10)", () => {
    const result = checkTierAccess("free", "speed_feed", 9);
    expect(result.allowed).toBe(true);
  });

  it("free blocks speed_feed at usage 10 (at limit)", () => {
    const result = checkTierAccess("free", "speed_feed", 10);
    expect(result.allowed).toBe(false);
  });

  it("free blocks speed_feed at usage 11 (over limit)", () => {
    const result = checkTierAccess("free", "speed_feed", 11);
    expect(result.allowed).toBe(false);
  });

  it("starter allows unlimited speed_feed at high usage", () => {
    const result = checkTierAccess("starter", "speed_feed", 9999);
    expect(result.allowed).toBe(true);
  });

  it("pro allows unlimited speed_feed", () => {
    const result = checkTierAccess("pro", "speed_feed", 500);
    expect(result.allowed).toBe(true);
  });
});

// ============================================================================
// program_generate
// ============================================================================
describe("program_generate gating", () => {
  it("free blocks program_generate at usage 0 (no allowance)", () => {
    const result = checkTierAccess("free", "program_generate", 0);
    expect(result.allowed).toBe(false);
  });

  it("starter blocks program_generate (0 allowance)", () => {
    const result = checkTierAccess("starter", "program_generate", 0);
    expect(result.allowed).toBe(false);
  });

  it("pro allows program_generate at usage 4 (limit 5)", () => {
    const result = checkTierAccess("pro", "program_generate", 4);
    expect(result.allowed).toBe(true);
  });

  it("pro blocks program_generate at usage 5 (at limit)", () => {
    const result = checkTierAccess("pro", "program_generate", 5);
    expect(result.allowed).toBe(false);
  });

  it("shop allows unlimited program_generate", () => {
    const result = checkTierAccess("shop", "program_generate", 9999);
    expect(result.allowed).toBe(true);
  });

  it("enterprise allows unlimited program_generate", () => {
    const result = checkTierAccess("enterprise", "program_generate", 9999);
    expect(result.allowed).toBe(true);
  });
});

// ============================================================================
// simulation
// ============================================================================
describe("simulation gating", () => {
  it("free blocks simulation", () => {
    const result = checkTierAccess("free", "simulation");
    expect(result.allowed).toBe(false);
  });

  it("starter blocks simulation", () => {
    const result = checkTierAccess("starter", "simulation");
    expect(result.allowed).toBe(false);
  });

  it("pro allows simulation", () => {
    const result = checkTierAccess("pro", "simulation");
    expect(result.allowed).toBe(true);
  });

  it("shop allows simulation", () => {
    const result = checkTierAccess("shop", "simulation");
    expect(result.allowed).toBe(true);
  });
});

// ============================================================================
// stochastic
// ============================================================================
describe("stochastic gating", () => {
  it("free blocks stochastic", () => {
    const result = checkTierAccess("free", "stochastic");
    expect(result.allowed).toBe(false);
  });

  it("pro blocks stochastic", () => {
    const result = checkTierAccess("pro", "stochastic");
    expect(result.allowed).toBe(false);
  });

  it("shop allows stochastic", () => {
    const result = checkTierAccess("shop", "stochastic");
    expect(result.allowed).toBe(true);
  });
});

// ============================================================================
// api_access
// ============================================================================
describe("api_access gating", () => {
  it("enterprise allows api_access", () => {
    const result = checkTierAccess("enterprise", "api_access");
    expect(result.allowed).toBe(true);
  });

  it("shop blocks api_access", () => {
    const result = checkTierAccess("shop", "api_access");
    expect(result.allowed).toBe(false);
  });

  it("free blocks api_access", () => {
    const result = checkTierAccess("free", "api_access");
    expect(result.allowed).toBe(false);
  });
});

// ============================================================================
// print_to_program / variant features (map to program_generate limits)
// ============================================================================
describe("variant program features", () => {
  it("free blocks print_to_program", () => {
    expect(checkTierAccess("free", "print_to_program", 0).allowed).toBe(false);
  });

  it("shop allows edm_program", () => {
    expect(checkTierAccess("shop", "edm_program", 0).allowed).toBe(true);
  });

  it("pro allows laser_program at usage 4", () => {
    expect(checkTierAccess("pro", "laser_program", 4).allowed).toBe(true);
  });
});

// ============================================================================
// unknown feature / plan
// ============================================================================
describe("edge cases", () => {
  it("unknown feature is blocked (fail safe)", () => {
    const result = checkTierAccess("enterprise", "nonexistent_feature" as any);
    expect(result.allowed).toBe(false);
  });

  it("unknown plan is blocked", () => {
    const result = checkTierAccess("unknown" as any, "speed_feed", 0);
    expect(result.allowed).toBe(false);
  });
});
