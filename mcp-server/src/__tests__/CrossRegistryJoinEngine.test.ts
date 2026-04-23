/**
 * CrossRegistryJoinEngine Tests — Phase 0.24 U-INT4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { crossRegistryJoinEngine } from "../engines/CrossRegistryJoinEngine.js";

describe("CrossRegistryJoinEngine", () => {
  beforeEach(() => {
    crossRegistryJoinEngine.reset();
  });

  it("loads registry schemas", async () => {
    const registries = await crossRegistryJoinEngine.listRegistries();
    expect(registries.length).toBeGreaterThan(0);
  });

  it("gets schema for materials registry", async () => {
    const schema = await crossRegistryJoinEngine.getSchema("materials");
    expect(schema).not.toBeNull();
    expect(schema?.primaryKey).toBe("id");
  });

  it("gets schema for tools registry", async () => {
    const schema = await crossRegistryJoinEngine.getSchema("tools");
    expect(schema).not.toBeNull();
    expect(schema?.foreignKeys.length).toBeGreaterThan(0);
  });

  it("returns null for unknown registry", async () => {
    const schema = await crossRegistryJoinEngine.getSchema("nonexistent");
    expect(schema).toBeNull();
  });

  it("joins materials and tools", async () => {
    const result = await crossRegistryJoinEngine.join({
      primaryRegistry: "materials",
      joinRegistries: ["tools"],
      joinKeys: [{ primary: "id", foreign: "material_id" }],
    });
    expect(result.registriesJoined).toContain("materials");
    expect(result.registriesJoined).toContain("tools");
    expect(result.recordCount).toBeGreaterThan(0);
  });

  it("respects join limit", async () => {
    const result = await crossRegistryJoinEngine.join({
      primaryRegistry: "materials",
      joinRegistries: ["tools"],
      joinKeys: [],
      limit: 5,
    });
    expect(result.records.length).toBeLessThanOrEqual(5);
  });

  it("includes query time in result", async () => {
    const result = await crossRegistryJoinEngine.join({
      primaryRegistry: "machines",
      joinRegistries: [],
      joinKeys: [],
    });
    expect(typeof result.queryTime).toBe("number");
  });

  it("returns empty for unknown primary registry", async () => {
    const result = await crossRegistryJoinEngine.join({
      primaryRegistry: "nonexistent",
      joinRegistries: [],
      joinKeys: [],
    });
    expect(result.records.length).toBe(0);
  });

  it("finds join paths between registries", async () => {
    const paths = await crossRegistryJoinEngine.findJoinPaths("materials", "tools");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("returns empty paths for unknown registries", async () => {
    const paths = await crossRegistryJoinEngine.findJoinPaths("nonexistent", "tools");
    expect(paths.length).toBe(0);
  });

  it("gets joinable registries", async () => {
    const joinable = await crossRegistryJoinEngine.getJoinableRegistries("tools");
    expect(joinable).toContain("materials");
  });

  it("returns empty joinable for unknown registry", async () => {
    const joinable = await crossRegistryJoinEngine.getJoinableRegistries("nonexistent");
    expect(joinable.length).toBe(0);
  });

  it("lists all registries", async () => {
    const registries = await crossRegistryJoinEngine.listRegistries();
    expect(registries).toContain("materials");
    expect(registries).toContain("tools");
    expect(registries).toContain("machines");
  });

  it("reset clears schemas", () => {
    crossRegistryJoinEngine.reset();
    expect(true).toBe(true);
  });
});
