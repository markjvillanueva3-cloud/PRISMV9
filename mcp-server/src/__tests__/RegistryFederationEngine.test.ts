/**
 * RegistryFederationEngine Tests — Phase 0.23 U-UTL6
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registryFederationEngine } from "../engines/RegistryFederationEngine.js";

describe("RegistryFederationEngine", () => {
  beforeEach(() => {
    registryFederationEngine.reset();
  });

  it("initializes with seeded registries", async () => {
    const stats = await registryFederationEngine.getStats();
    expect(stats.totalRegistries).toBeGreaterThan(0);
  });

  it("federated query returns results", async () => {
    const results = await registryFederationEngine.query({
      query: "material",
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("federated query filters by registries", async () => {
    const results = await registryFederationEngine.query({
      query: "test",
      registries: ["engines", "formulas"],
    });
    expect(results.every(r => ["engines", "formulas"].includes(r.registryId))).toBe(true);
  });

  it("results include match scores", async () => {
    const results = await registryFederationEngine.query({ query: "code" });
    expect(results.every(r => typeof r.matchScore === "number")).toBe(true);
  });

  it("results include metadata", async () => {
    const results = await registryFederationEngine.query({ query: "data" });
    expect(results.every(r => typeof r.metadata === "object")).toBe(true);
  });

  it("gets registry by id", async () => {
    const registry = await registryFederationEngine.getRegistry("engines");
    expect(registry).not.toBeNull();
    expect(registry?.id).toBe("engines");
  });

  it("returns null for unknown registry id", async () => {
    const registry = await registryFederationEngine.getRegistry("nonexistent");
    expect(registry).toBeNull();
  });

  it("lists all registries", async () => {
    const registries = await registryFederationEngine.listRegistries();
    expect(registries.length).toBeGreaterThan(0);
  });

  it("respects query limit", async () => {
    const results = await registryFederationEngine.query({
      query: "test",
      limit: 3,
    });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("stats include total entries", async () => {
    const stats = await registryFederationEngine.getStats();
    expect(typeof stats.totalEntries).toBe("number");
    expect(stats.totalEntries).toBeGreaterThan(0);
  });

  it("stats include type breakdown", async () => {
    const stats = await registryFederationEngine.getStats();
    expect(stats.byType).toBeDefined();
  });

  it("reset clears state", async () => {
    await registryFederationEngine.getStats();
    registryFederationEngine.reset();
    const stats = await registryFederationEngine.getStats();
    expect(stats.totalRegistries).toBeGreaterThan(0);
  });
});
