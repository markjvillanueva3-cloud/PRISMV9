/**
 * FileSystemNavigatorEngine tests
 */
import { describe, it, expect } from "vitest";
import { fileSystemNavigatorEngine } from "../engines/FileSystemNavigatorEngine.js";

describe("FileSystemNavigatorEngine", () => {
  it("finds engines directory for cutting query", () => {
    const r = fileSystemNavigatorEngine.find("cutting force calculation");
    expect(r).not.toBeNull();
    expect(r!.directory).toContain("engines");
  });

  it("finds dispatchers for action routing query", () => {
    const r = fileSystemNavigatorEngine.find("dispatcher action routing");
    expect(r).not.toBeNull();
    expect(r!.directory).toContain("dispatchers");
  });

  it("finds tests directory for test query", () => {
    const results = fileSystemNavigatorEngine.navigate({ topic: "vitest test suite", type: "test" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].directory).toContain("__tests__");
  });

  it("finds data directory for tool catalog query", () => {
    const r = fileSystemNavigatorEngine.find("tool catalog manufacturer");
    expect(r).not.toBeNull();
    expect(r!.directory).toContain("data");
  });

  it("finds schemas for validation query", () => {
    const r = fileSystemNavigatorEngine.find("zod schema validation params");
    expect(r).not.toBeNull();
    expect(r!.directory).toContain("schemas");
  });

  it("navigate returns multiple results ranked by confidence", () => {
    const results = fileSystemNavigatorEngine.navigate({ topic: "machine profile kinematic" });
    expect(results.length).toBeGreaterThan(1);
    // Should be sorted by confidence descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
  });

  it("domains returns all registered directories", () => {
    const domains = fileSystemNavigatorEngine.domains();
    expect(domains.length).toBeGreaterThan(10);
    expect(domains).toContain("src/engines/");
    expect(domains).toContain("src/tools/dispatchers/");
  });

  it("routeCount returns total routes", () => {
    expect(fileSystemNavigatorEngine.routeCount()).toBeGreaterThan(20);
  });

  it("finds welding engines for weld query", () => {
    const r = fileSystemNavigatorEngine.find("welding laser FSW");
    expect(r).not.toBeNull();
    expect(r!.purpose.toLowerCase()).toContain("weld");
  });

  it("finds token optimization for context query", () => {
    const r = fileSystemNavigatorEngine.find("token context session budget");
    expect(r).not.toBeNull();
    expect(r!.purpose.toLowerCase()).toContain("token");
  });

  it("returns null for completely irrelevant query", () => {
    const r = fileSystemNavigatorEngine.find("xyzzy plugh");
    expect(r).toBeNull();
  });

  it("type filter prioritizes correct directory", () => {
    const engineResult = fileSystemNavigatorEngine.navigate({ topic: "formula", type: "engine" });
    const registryResult = fileSystemNavigatorEngine.navigate({ topic: "formula", type: "any" });
    // Engine type filter should boost engines
    expect(engineResult[0].directory).toContain("engines");
  });
});
