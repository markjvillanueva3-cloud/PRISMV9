/**
 * Tests for BloomDedupEngine (USSH Phase 0.25)
 *
 * Validates Bloom filter deduplication:
 *   - Basic add/check operations
 *   - False positive rate bounds
 *   - Optimal parameter calculation
 *   - Bulk operations
 *   - Named filters
 *   - Asset-type specific filters
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BloomDedupEngine,
  AssetBloomFilters,
  bloomDedupEngine,
  assetBloomFilters,
} from "../engines/BloomDedupEngine.js";

describe("BloomDedupEngine (USSH P0.25)", () => {
  let engine: BloomDedupEngine;

  beforeEach(() => {
    engine = new BloomDedupEngine();
  });

  // ============================================================================
  // BASIC OPERATIONS
  // ============================================================================

  describe("basic operations", () => {
    it("adds and checks item", () => {
      engine.add("TestEngine");

      expect(engine.mightContain("TestEngine")).toBe(true);
    });

    it("returns false for non-existent item", () => {
      engine.add("ExistingEngine");

      expect(engine.mightContain("NonExistentEngine")).toBe(false);
    });

    it("handles case-insensitive names", () => {
      engine.add("MyEngine");

      expect(engine.mightContain("myengine")).toBe(true);
      expect(engine.mightContain("MYENGINE")).toBe(true);
    });

    it("normalizes Engine suffix", () => {
      engine.add("TestEngine");

      expect(engine.mightContain("Test")).toBe(true);
    });

    it("handles special characters", () => {
      engine.add("My_Special-Engine.v2");

      expect(engine.mightContain("MySpecialEnginev2")).toBe(true);
    });
  });

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  describe("bulk operations", () => {
    it("adds multiple items", () => {
      const names = ["Engine1", "Engine2", "Engine3"];
      const added = engine.addBulk(names);

      expect(added).toBe(3);
      expect(engine.mightContain("Engine1")).toBe(true);
      expect(engine.mightContain("Engine2")).toBe(true);
      expect(engine.mightContain("Engine3")).toBe(true);
    });

    it("bulk checks multiple items", () => {
      engine.addBulk(["Existing1", "Existing2"]);

      const result = engine.checkBulk(["Existing1", "New1", "New2"]);

      expect(result.total).toBe(3);
      expect(result.possible_duplicates).toBeGreaterThanOrEqual(1);
    });

    it("returns dedup check result object", () => {
      engine.add("TestEngine");

      const result = engine.checkDedup("TestEngine");

      expect(result.name).toBe("TestEngine");
      expect(result.might_exist).toBe(true);
      expect(result.checked_at).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // FALSE POSITIVE RATE
  // ============================================================================

  describe("false positive rate", () => {
    it("maintains low FPR for expected load", () => {
      // Add 1000 items
      for (let i = 0; i < 1000; i++) {
        engine.add(`Engine${i}`);
      }

      // Check 1000 non-existent items
      let falsePositives = 0;
      for (let i = 1000; i < 2000; i++) {
        if (engine.mightContain(`Engine${i}`)) {
          falsePositives++;
        }
      }

      // FPR should be < 5% for default config
      const fpr = falsePositives / 1000;
      expect(fpr).toBeLessThan(0.05);
    });

    it("reports estimated FPR in stats", () => {
      for (let i = 0; i < 500; i++) {
        engine.add(`Engine${i}`);
      }

      const stats = engine.getStats();

      expect(stats.estimated_fpr).toBeLessThan(0.01);
      expect(stats.items_added).toBe(500);
    });

    it("fill ratio increases with items", () => {
      const statsBefore = engine.getStats();
      engine.addBulk(Array.from({ length: 100 }, (_, i) => `Engine${i}`));
      const statsAfter = engine.getStats();

      expect(statsAfter.fill_ratio).toBeGreaterThan(statsBefore.fill_ratio);
    });
  });

  // ============================================================================
  // OPTIMAL PARAMETERS
  // ============================================================================

  describe("optimal parameters", () => {
    it("calculates optimal params for given constraints", () => {
      const params = BloomDedupEngine.calculateOptimalParams(1000, 0.01);

      expect(params.size_bits).toBeGreaterThan(0);
      expect(params.num_hashes).toBeGreaterThan(0);
      expect(params.num_hashes).toBeLessThanOrEqual(20);
    });

    it("creates optimized filter", () => {
      const optimized = BloomDedupEngine.createOptimized(1000, 0.01);

      // Add 1000 items
      for (let i = 0; i < 1000; i++) {
        optimized.add(`Engine${i}`);
      }

      const stats = optimized.getStats();
      expect(stats.estimated_fpr).toBeLessThan(0.02); // Allow some margin
    });

    it("larger filter has lower FPR", () => {
      const small = BloomDedupEngine.createOptimized(1000, 0.05);
      const large = BloomDedupEngine.createOptimized(1000, 0.001);

      expect(large.getConfig().size_bits).toBeGreaterThan(
        small.getConfig().size_bits
      );
    });
  });

  // ============================================================================
  // NAMED FILTERS
  // ============================================================================

  describe("named filters", () => {
    it("creates named filter on demand", () => {
      engine.addToFilter("engines", "TestEngine");
      engine.addToFilter("hooks", "TestHook");

      expect(engine.mightContainInFilter("engines", "TestEngine")).toBe(true);
      expect(engine.mightContainInFilter("hooks", "TestHook")).toBe(true);
      expect(engine.mightContainInFilter("engines", "TestHook")).toBe(false);
    });

    it("lists all named filters", () => {
      engine.getFilter("filter1");
      engine.getFilter("filter2");

      const filters = engine.listFilters();

      expect(filters).toContain("filter1");
      expect(filters).toContain("filter2");
    });

    it("gets stats for all filters", () => {
      engine.addToFilter("engines", "TestEngine");
      engine.addToFilter("hooks", "TestHook");

      const stats = engine.getAllFilterStats();

      expect(stats["default"]).toBeDefined();
      expect(stats["engines"]).toBeDefined();
      expect(stats["hooks"]).toBeDefined();
    });

    it("returns false for non-existent filter", () => {
      expect(engine.mightContainInFilter("nonexistent", "Test")).toBe(false);
    });
  });

  // ============================================================================
  // MERGE OPERATIONS
  // ============================================================================

  describe("merge operations", () => {
    it("merges two filters", () => {
      const filter1 = new BloomDedupEngine();
      const filter2 = new BloomDedupEngine();

      filter1.add("Engine1");
      filter2.add("Engine2");

      filter1.merge(filter2);

      expect(filter1.mightContain("Engine1")).toBe(true);
      expect(filter1.mightContain("Engine2")).toBe(true);
    });

    it("rejects merge of different sizes", () => {
      const filter1 = new BloomDedupEngine({ size_bits: 1000 });
      const filter2 = new BloomDedupEngine({ size_bits: 2000 });

      expect(() => filter1.merge(filter2)).toThrow();
    });

    it("estimates union FPR", () => {
      const filter1 = new BloomDedupEngine();
      const filter2 = new BloomDedupEngine();

      filter1.addBulk(Array.from({ length: 500 }, (_, i) => `A${i}`));
      filter2.addBulk(Array.from({ length: 500 }, (_, i) => `B${i}`));

      const unionFpr = filter1.estimateUnionFpr(filter2);

      expect(unionFpr).toBeGreaterThan(0);
      expect(unionFpr).toBeLessThan(1);
    });
  });

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  describe("persistence", () => {
    it("exports and imports filter state", () => {
      engine.add("Engine1");
      engine.add("Engine2");

      const exported = engine.export();

      const newEngine = new BloomDedupEngine();
      newEngine.import(exported);

      expect(newEngine.mightContain("Engine1")).toBe(true);
      expect(newEngine.mightContain("Engine2")).toBe(true);
      expect(newEngine.getStats().items_added).toBe(2);
    });

    it("exported data is JSON-serializable", () => {
      engine.add("TestEngine");

      const exported = engine.export();
      const json = JSON.stringify(exported);
      const parsed = JSON.parse(json);

      expect(parsed.config).toBeDefined();
      expect(parsed.bits).toBeInstanceOf(Array);
      expect(parsed.itemCount).toBe(1);
    });
  });

  // ============================================================================
  // CLEAR OPERATIONS
  // ============================================================================

  describe("clear operations", () => {
    it("clears filter", () => {
      engine.add("Engine1");
      engine.clear();

      expect(engine.mightContain("Engine1")).toBe(false);
      expect(engine.getStats().items_added).toBe(0);
    });

    it("clears all filters", () => {
      engine.add("DefaultEngine");
      engine.addToFilter("named", "NamedEngine");

      engine.clearAll();

      expect(engine.mightContain("DefaultEngine")).toBe(false);
      expect(engine.listFilters().length).toBe(0);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("returns config", () => {
      const config = engine.getConfig();

      expect(config.size_bits).toBeDefined();
      expect(config.num_hashes).toBeDefined();
      expect(config.seed).toBeDefined();
    });

    it("applies custom config", () => {
      const custom = new BloomDedupEngine({
        size_bits: 500000,
        num_hashes: 5,
      });

      const config = custom.getConfig();

      expect(config.size_bits).toBe(500000);
      expect(config.num_hashes).toBe(5);
    });

    it("reports memory usage", () => {
      const stats = engine.getStats();

      expect(stats.memory_bytes).toBe(Math.ceil(engine.getConfig().size_bits / 8));
    });
  });
});

// ============================================================================
// ASSET BLOOM FILTERS
// ============================================================================

describe("AssetBloomFilters", () => {
  let filters: AssetBloomFilters;

  beforeEach(() => {
    filters = new AssetBloomFilters();
  });

  it("has filters for common asset types", () => {
    const stats = filters.getStats();

    expect(stats["engine"]).toBeDefined();
    expect(stats["action"]).toBeDefined();
    expect(stats["skill"]).toBeDefined();
    expect(stats["hook"]).toBeDefined();
    expect(stats["formula"]).toBeDefined();
  });

  it("adds to specific asset type", () => {
    filters.add("engine", "MyEngine");

    expect(filters.mightContain("engine", "MyEngine")).toBe(true);
    expect(filters.mightContain("hook", "MyEngine")).toBe(false);
  });

  it("checks if definitely new", () => {
    filters.add("engine", "ExistingEngine");

    expect(filters.isDefinitelyNew("engine", "NewEngine")).toBe(true);
    expect(filters.isDefinitelyNew("engine", "ExistingEngine")).toBe(false);
  });

  it("loads existing assets", () => {
    const assets = [
      { type: "engine", name: "Engine1" },
      { type: "engine", name: "Engine2" },
      { type: "hook", name: "Hook1" },
    ];

    const loaded = filters.loadExistingAssets(assets);

    expect(loaded).toBe(3);
    expect(filters.mightContain("engine", "Engine1")).toBe(true);
    expect(filters.mightContain("hook", "Hook1")).toBe(true);
  });
});

// ============================================================================
// SINGLETON
// ============================================================================

describe("singleton", () => {
  it("exports singleton instance", () => {
    expect(bloomDedupEngine).toBeDefined();
    expect(bloomDedupEngine).toBeInstanceOf(BloomDedupEngine);
  });

  it("exports asset filters singleton", () => {
    expect(assetBloomFilters).toBeDefined();
    expect(assetBloomFilters).toBeInstanceOf(AssetBloomFilters);
  });
});
