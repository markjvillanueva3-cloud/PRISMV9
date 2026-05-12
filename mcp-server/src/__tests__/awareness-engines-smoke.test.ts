/**
 * Smoke tests for the other 4 Phase 0.2 awareness engines.
 *
 * TestCoverageIndexEngine — maps engine.ts → engine.test.ts
 * DependencyGraphEngine — TS AST import graph + impact analysis
 * SemanticSimilarityGuardEngine — embedding-based dedup (may stub until U-MIT04)
 * CrossTerminalBroadcastEngine — EventEmitter + FS-watch for cross-session sync
 *
 * Intent: prove each engine's public API doesn't throw on standard inputs.
 * Deeper behavior tests live in per-engine test files (to be added once
 * MIT foundations ship and the engines are wired into dispatchers).
 */

import { describe, it, expect } from "vitest";
import { testCoverageIndexEngine } from "../engines/TestCoverageIndexEngine.js";
import { dependencyGraphEngine } from "../engines/DependencyGraphEngine.js";
import { semanticSimilarityGuardEngine } from "../engines/SemanticSimilarityGuardEngine.js";
import { crossTerminalBroadcastEngine } from "../engines/CrossTerminalBroadcastEngine.js";

describe("TestCoverageIndexEngine (Phase 0.2)", () => {
  it("hasCoverage() returns a boolean", async () => {
    const r = await testCoverageIndexEngine.hasCoverage("KienzleForceModelEngine");
    expect(typeof r).toBe("boolean");
  });

  it("coverageFor() returns entry or null", async () => {
    const r = await testCoverageIndexEngine.coverageFor("NonExistentEngineXyz");
    expect(r === null || typeof r === "object").toBe(true);
  });

  it("uncoveredEngines() returns string[]", async () => {
    const r = await testCoverageIndexEngine.uncoveredEngines();
    expect(Array.isArray(r)).toBe(true);
  });

  it("getStats() returns coverage stats object", async () => {
    const r = await testCoverageIndexEngine.getStats();
    expect(typeof r).toBe("object");
    expect(r).not.toBeNull();
  });

  it("findTestFor() returns string or null", async () => {
    const r = await testCoverageIndexEngine.findTestFor("KienzleForceModelEngine");
    expect(r === null || typeof r === "string").toBe(true);
  });

  it("enginesCoveredBy() returns string[]", async () => {
    const r = await testCoverageIndexEngine.enginesCoveredBy("src/__tests__/KienzleForceModelEngine.test.ts");
    expect(Array.isArray(r)).toBe(true);
  });

  it("getCompactSummary() returns a string", async () => {
    const r = await testCoverageIndexEngine.getCompactSummary();
    expect(typeof r).toBe("string");
  });

  it("rebuildIndex() completes without throwing", async () => {
    await expect(testCoverageIndexEngine.rebuildIndex()).resolves.not.toThrow();
  });

  it("recordTestRun() completes without throwing", async () => {
    await expect(testCoverageIndexEngine.recordTestRun("SmokeProbeEngine")).resolves.not.toThrow();
  });

  it("stats object has numeric totals", async () => {
    const r = await testCoverageIndexEngine.getStats();
    // Type shape varies; accept any object with at least one numeric field
    const hasNumeric = Object.values(r).some((v) => typeof v === "number");
    expect(hasNumeric).toBe(true);
  });
});

describe("DependencyGraphEngine (Phase 0.2)", () => {
  it("dependentsOf() returns string[]", async () => {
    const r = await dependencyGraphEngine.dependentsOf("src/engines/KienzleForceModelEngine.ts");
    expect(Array.isArray(r)).toBe(true);
  });

  it("dependenciesOf() returns string[]", async () => {
    const r = await dependencyGraphEngine.dependenciesOf("src/engines/KienzleForceModelEngine.ts");
    expect(Array.isArray(r)).toBe(true);
  });

  it("impactedBy() returns ImpactAnalysis object", async () => {
    const r = await dependencyGraphEngine.impactedBy("src/engines/KienzleForceModelEngine.ts");
    expect(typeof r).toBe("object");
    expect(r).not.toBeNull();
  });

  it("isCritical() returns boolean", async () => {
    const r = await dependencyGraphEngine.isCritical("src/engines/KienzleForceModelEngine.ts");
    expect(typeof r).toBe("boolean");
  });

  it("getStats() returns object", async () => {
    const r = await dependencyGraphEngine.getStats();
    expect(typeof r).toBe("object");
  });

  it("rebuildGraph() completes without throwing", async () => {
    await expect(dependencyGraphEngine.rebuildGraph()).resolves.not.toThrow();
  });

  it("updateFile() completes without throwing for existing file", async () => {
    await expect(
      dependencyGraphEngine.updateFile("src/engines/KienzleForceModelEngine.ts")
    ).resolves.not.toThrow();
  });

  it("dependentsOf() handles non-existent path without throwing", async () => {
    const r = await dependencyGraphEngine.dependentsOf("does/not/exist.ts");
    expect(Array.isArray(r)).toBe(true);
  });

  it("impactedBy() for unknown path returns object with expected shape", async () => {
    const r = await dependencyGraphEngine.impactedBy("does/not/exist.ts");
    expect(typeof r).toBe("object");
  });

  it("getStats() has numeric members after rebuild", async () => {
    const r = await dependencyGraphEngine.getStats();
    const hasNumeric = Object.values(r).some((v) => typeof v === "number");
    expect(hasNumeric).toBe(true);
  });
});

describe("SemanticSimilarityGuardEngine (Phase 0.2)", () => {
  it("checkSimilarity() returns a result object", async () => {
    const r = await semanticSimilarityGuardEngine.checkSimilarity(
      "CuttingForceEngineProbe",
      "Stub description for cutting force calculation"
    );
    expect(typeof r).toBe("object");
    expect(r).not.toBeNull();
  });

  it("mustNotBeSimilar() does not throw for unique asset", async () => {
    await expect(
      semanticSimilarityGuardEngine.mustNotBeSimilar(
        "UniqueXyz999Engine",
        "Entirely novel description with no conceivable overlap"
      )
    ).resolves.not.toThrow();
  });

  it("registerAsset() completes without throwing with full 4-arg signature", async () => {
    await expect(
      semanticSimilarityGuardEngine.registerAsset(
        "SmokeProbeAsset",
        "src/engines/SmokeProbeAsset.ts",
        "description for smoke test",
        "/** Smoke probe content. */\nexport class SmokeProbeAsset { probe() { return 1; } }"
      )
    ).resolves.not.toThrow();
  });

  it("checkSimilarity result has expected SemanticCheckResult shape", async () => {
    const r = await semanticSimilarityGuardEngine.checkSimilarity("Probe", "desc");
    // SemanticCheckResult = {isDuplicate, similarity, matchedAsset?, matchedPath?, explanation, zone}
    expect(typeof r.isDuplicate).toBe("boolean");
    expect(typeof r.similarity).toBe("number");
    expect(typeof r.explanation).toBe("string");
    expect(["green", "yellow", "red"]).toContain(r.zone);
  });

  it("handles empty description gracefully", async () => {
    const r = await semanticSimilarityGuardEngine.checkSimilarity("EmptyDesc", "");
    expect(typeof r).toBe("object");
  });
});

describe("CrossTerminalBroadcastEngine (Phase 0.2)", () => {
  it("broadcast() completes without throwing", async () => {
    await expect(
      crossTerminalBroadcastEngine.broadcast({
        type: "test" as never,
        data: { note: "smoke test" },
      })
    ).resolves.not.toThrow();
  });

  it("notifyAssetAdded() completes without throwing", async () => {
    await expect(
      crossTerminalBroadcastEngine.notifyAssetAdded("engine", "SmokeProbeEngine", "src/engines/SmokeProbeEngine.ts")
    ).resolves.not.toThrow();
  });

  it("forceInvalidateAll() completes without throwing", async () => {
    await expect(crossTerminalBroadcastEngine.forceInvalidateAll()).resolves.not.toThrow();
  });

  it("getRecentEvents() returns array", async () => {
    const r = await crossTerminalBroadcastEngine.getRecentEvents();
    expect(Array.isArray(r)).toBe(true);
  });

  it("getRecentEvents(limit) respects limit", async () => {
    const r = await crossTerminalBroadcastEngine.getRecentEvents(3);
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it("getExternalEvents() returns array", async () => {
    const r = await crossTerminalBroadcastEngine.getExternalEvents();
    expect(Array.isArray(r)).toBe(true);
  });

  it("getExternalEvents(sinceTimestamp) returns array", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const r = await crossTerminalBroadcastEngine.getExternalEvents(future);
    expect(Array.isArray(r)).toBe(true);
  });

  it("is an EventEmitter (has on/emit methods)", () => {
    expect(typeof (crossTerminalBroadcastEngine as unknown as { on: unknown }).on).toBe("function");
    expect(typeof (crossTerminalBroadcastEngine as unknown as { emit: unknown }).emit).toBe("function");
  });
});
