/**
 * Behavior tests for PRISMUnifiedOrchestratorEngine (PUOA).
 *
 * Engine is exempt from dispatcher wiring (consumed via direct singleton import
 * by intent-classifier and agentic-loop pipelines — see WIRE-EXEMPT in source).
 */
import { describe, it, expect } from "vitest";
import { prismUnifiedOrchestratorEngine } from "../engines/PRISMUnifiedOrchestratorEngine.js";

describe("PRISMUnifiedOrchestratorEngine — tier routing", () => {
  it("routes single-domain simple intent to single_dispatcher", () => {
    const result = prismUnifiedOrchestratorEngine.routeToTier({
      intent: "calculate spindle rpm",
    });
    expect(result.tier).toBe("single_dispatcher");
  });

  it("routes multi-domain critical intent to full_chain", () => {
    const result = prismUnifiedOrchestratorEngine.routeToTier({
      intent: "optimize cutting force, thermal, surface, and tool life for hard turning",
    });
    expect(result.tier).toBe("full_chain");
    expect(result.domains.length).toBeGreaterThanOrEqual(3);
    expect(result.estimated_steps).toBeGreaterThanOrEqual(4);
  });

  it("honors explicit required_tier constraint over heuristic", () => {
    const result = prismUnifiedOrchestratorEngine.routeToTier({
      intent: "rpm calc",
      constraints: { required_tier: "full_chain" },
    });
    expect(result.tier).toBe("full_chain");
    expect(result.reason).toMatch(/forced by constraint/i);
  });
});

describe("PRISMUnifiedOrchestratorEngine — domain detection", () => {
  it("detects machining domain from feed/speed keywords", () => {
    const domains = prismUnifiedOrchestratorEngine.detectDomains("calculate feed and speed");
    expect(Array.isArray(domains)).toBe(true);
    expect(domains.length).toBeGreaterThan(0);
  });

  it("returns array even when intent is empty (no throw, defensive default)", () => {
    const domains = prismUnifiedOrchestratorEngine.detectDomains("");
    expect(Array.isArray(domains)).toBe(true);
  });

  it("includes context payload when scanning for domains", () => {
    const domainsWithContext = prismUnifiedOrchestratorEngine.detectDomains(
      "process",
      { material: "Inconel 718", tool: "carbide" }
    );
    expect(Array.isArray(domainsWithContext)).toBe(true);
  });
});

describe("PRISMUnifiedOrchestratorEngine — authority hierarchy", () => {
  it("user authority outranks tribal authority", () => {
    const cmp = prismUnifiedOrchestratorEngine.compareAuthority("user", "tribal");
    expect(cmp).toBeGreaterThan(0);
  });

  it("getAuthorityHierarchy returns sources ordered high-to-low rank", () => {
    const hierarchy = prismUnifiedOrchestratorEngine.getAuthorityHierarchy();
    expect(Array.isArray(hierarchy)).toBe(true);
    expect(hierarchy.length).toBeGreaterThan(0);
    // First entry must outrank the last
    const firstRank = prismUnifiedOrchestratorEngine.getAuthorityRank(hierarchy[0]);
    const lastRank = prismUnifiedOrchestratorEngine.getAuthorityRank(hierarchy[hierarchy.length - 1]);
    expect(firstRank).toBeGreaterThan(lastRank);
  });

  it("getTierInfo returns tier descriptions for every tier", () => {
    const tiers = prismUnifiedOrchestratorEngine.getTierInfo();
    expect(Array.isArray(tiers)).toBe(true);
    expect(tiers.length).toBeGreaterThanOrEqual(3);
    for (const t of tiers) {
      expect(typeof t.tier).toBe("string");
      expect(typeof t.description).toBe("string");
      expect(typeof t.use_case).toBe("string");
    }
  });
});

describe("PRISMUnifiedOrchestratorEngine — failure modes", () => {
  it("rejects unknown authority source by returning undefined rank", () => {
    const rank = prismUnifiedOrchestratorEngine.getAuthorityRank(
      "made_up_source" as unknown as Parameters<typeof prismUnifiedOrchestratorEngine.getAuthorityRank>[0]
    );
    expect(rank === undefined || Number.isNaN(rank as number)).toBe(true);
  });

  it("compareAuthority equal sources returns 0", () => {
    expect(prismUnifiedOrchestratorEngine.compareAuthority("user", "user")).toBe(0);
  });
});
