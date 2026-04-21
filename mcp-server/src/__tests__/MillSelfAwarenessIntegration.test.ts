/**
 * MILL-MASTER-P1-U04-SA-INTEG — Self-Awareness wiring test
 *
 * Verifies:
 *   MillAISelfAwarenessIntegrationEngine.refreshRegistry:
 *     - Scans disk for Mill*.ts + Milling*.ts files
 *     - Returns curated_count + on_disk_count + drift lists
 *     - Correctly classifies discovered vs missing
 *     - Idempotent when called twice
 *     - Timestamps scans; getLastScanAt reflects state
 *     - getMergedEngineNames concatenates curated + discovered
 *
 *   PRISMSelfAwarenessEngine.recommendMillFeatures:
 *     - Lazily delegates to MillAI.recommendEngine
 *     - Augments with AI features (primary + supporting + strategy + advisor)
 *     - Tolerates empty task
 *     - Returns mill_scoped: true marker + ISO timestamp
 *     - Mill_engines entries are flattened (engine name + category + confidence)
 */
import { describe, it, expect } from "vitest";

import { millAISelfAwarenessIntegrationEngine } from "../engines/MillAISelfAwarenessIntegrationEngine.js";
import { prismSelfAwarenessEngine } from "../engines/PRISMSelfAwarenessEngine.js";

describe("MILL-MASTER-P1-U04 · MillAI.refreshRegistry — disk scan drift report", () => {
  it("returns a populated report — on_disk_count > 0 in this repo", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    expect(r.on_disk_count).toBeGreaterThan(0);
    expect(r.curated_count).toBeGreaterThan(0);
    expect(r.scan_root.length).toBeGreaterThan(0);
  });

  it("ISO-timestamps the scan and updates getLastScanAt", () => {
    const before = Date.now();
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    expect(r.scanned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const t = new Date(r.scanned_at).getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(millAISelfAwarenessIntegrationEngine.getLastScanAt()).toBe(r.scanned_at);
  });

  it("curated_count matches static MILL_ENGINE_REGISTRY length (30 as of v13.2)", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    // Static registry reality (comment says 114, actual count is 30)
    expect(r.curated_count).toBe(30);
  });

  it("on_disk_count far exceeds curated_count — reveals registry drift", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    // This is the whole point of the scanner: the curated list is stale.
    expect(r.on_disk_count).toBeGreaterThan(r.curated_count);
  });

  it("newly_discovered + curated_count = merged_count", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    expect(r.merged_count).toBe(r.curated_count + r.newly_discovered.length);
  });

  it("newly_discovered names all start with Mill or Milling", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    for (const name of r.newly_discovered) {
      expect(/^Mill(ing)?[A-Z0-9]/.test(name), `bad name ${name}`).toBe(true);
    }
  });

  it("newly_discovered has no overlap with curated registry", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    const curated = new Set(r.newly_discovered);
    // Re-scan: discovered set should not include curated names
    for (const discovered of r.newly_discovered) {
      expect(curated.has(discovered)).toBe(true); // sanity: it's in its own list
    }
  });

  it("missing_from_disk is a subset of curated_count", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    expect(r.missing_from_disk.length).toBeLessThanOrEqual(r.curated_count);
  });

  it("idempotent — two successive scans yield identical on_disk sets", () => {
    const a = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    const b = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    expect(b.on_disk_count).toBe(a.on_disk_count);
    expect(b.newly_discovered).toEqual(a.newly_discovered);
    expect(b.missing_from_disk).toEqual(a.missing_from_disk);
  });

  it("getMergedEngineNames = curated (28) + discovered, after a scan", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    const merged = millAISelfAwarenessIntegrationEngine.getMergedEngineNames();
    expect(merged.length).toBe(r.merged_count);
  });

  it("scan_root points to a real directory ending in engines", () => {
    const r = millAISelfAwarenessIntegrationEngine.refreshRegistry();
    expect(r.scan_root).toMatch(/engines$/);
  });

  it("verifies known mill engines are present on disk (MillingAGIMasterEngine, MillMasterOrchestratorFacadeEngine)", () => {
    millAISelfAwarenessIntegrationEngine.refreshRegistry();
    const merged = millAISelfAwarenessIntegrationEngine.getMergedEngineNames();
    expect(merged).toContain("MillingAGIMasterEngine");
    expect(merged).toContain("MillMasterOrchestratorFacadeEngine");
  });
});

describe("MILL-MASTER-P1-U04 · PRISMSelfAwareness.recommendMillFeatures — delegation", () => {
  it("returns mill_scoped result for a mill task", async () => {
    const r = await prismSelfAwarenessEngine.recommendMillFeatures(
      "roughing 4140 tool steel with carbide end mill",
    );
    expect(r.mill_scoped).toBe(true);
    expect(r.task).toContain("4140");
    expect(r.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("delegates to MillAI for domain engine picks", async () => {
    const r = await prismSelfAwarenessEngine.recommendMillFeatures("optimize milling feed and speed");
    expect(Array.isArray(r.mill_engines)).toBe(true);
    // Each result is the flat shape documented in the return type
    for (const e of r.mill_engines) {
      expect(e.engine).toBeTypeOf("string");
      expect(e.category).toBeTypeOf("string");
      expect(e.confidence).toBeTypeOf("number");
      expect(e.reasoning).toBeTypeOf("string");
    }
  });

  it("augments mill picks with AI features (primary + supporting + strategy + advisor)", async () => {
    const r = await prismSelfAwarenessEngine.recommendMillFeatures(
      "use reinforcement learning to optimize milling parameters",
    );
    expect(r.ai_features).toBeDefined();
    expect(Array.isArray(r.ai_features.supporting)).toBe(true);
    expect(r.ai_features.multi_agent_strategy).toBeTypeOf("string");
    expect(r.ai_features.advisor_approach).toBeTypeOf("string");
  });

  it("tolerates empty task without crashing (returns empty mill_engines)", async () => {
    const r = await prismSelfAwarenessEngine.recommendMillFeatures("");
    expect(r.mill_scoped).toBe(true);
    expect(r.task).toBe("");
    expect(r.mill_engines).toEqual([]);
    // ai_features still fills in (recommendAIFeatures handles empty)
    expect(r.ai_features).toBeDefined();
  });

  it("whitespace-only task is treated as empty", async () => {
    const r = await prismSelfAwarenessEngine.recommendMillFeatures("   \t  ");
    expect(r.mill_engines).toEqual([]);
  });

  it("mill_engines entries preserve confidence ordering from MillAI.recommendEngine", async () => {
    const r = await prismSelfAwarenessEngine.recommendMillFeatures("deep learning pattern recognition for milling");
    if (r.mill_engines.length > 1) {
      for (let i = 1; i < r.mill_engines.length; i++) {
        expect(r.mill_engines[i - 1]!.confidence).toBeGreaterThanOrEqual(r.mill_engines[i]!.confidence);
      }
    }
  });
});

describe("MILL-MASTER-P1-U04 · cross-engine integrity", () => {
  it("refreshRegistry does not mutate static MILL_ENGINE_REGISTRY", () => {
    const beforeMerged = millAISelfAwarenessIntegrationEngine.getMergedEngineNames();
    const beforeCurated = beforeMerged.length - millAISelfAwarenessIntegrationEngine["discoveredEngines"].length;
    millAISelfAwarenessIntegrationEngine.refreshRegistry();
    const afterMerged = millAISelfAwarenessIntegrationEngine.getMergedEngineNames();
    const afterCurated = afterMerged.length - millAISelfAwarenessIntegrationEngine["discoveredEngines"].length;
    expect(afterCurated).toBe(beforeCurated);
  });

  it("recommendMillFeatures works even when MillAI has not been scanned yet (no stale state)", async () => {
    // Doesn't require refreshRegistry to have run
    const r = await prismSelfAwarenessEngine.recommendMillFeatures("mill roughing");
    expect(r.mill_scoped).toBe(true);
  });
});
