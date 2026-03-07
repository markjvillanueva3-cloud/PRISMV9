import { describe, it, expect, beforeEach } from "vitest";
import { ResponseCacheEngine } from "../engines/ResponseCacheEngine.js";

describe("ResponseCacheEngine", () => {
  let cache: ResponseCacheEngine;

  beforeEach(() => {
    cache = new ResponseCacheEngine(10, 1000); // 10 entries, 1s TTL
  });

  describe("makeKey", () => {
    it("generates deterministic keys", () => {
      const k1 = cache.makeKey("speed_feed", { material: "4140", dia: 12 });
      const k2 = cache.makeKey("speed_feed", { dia: 12, material: "4140" });
      expect(k1).toBe(k2); // Order-independent
    });

    it("excludes action param", () => {
      const key = cache.makeKey("calc", { action: "calc", x: 1 });
      expect(key).not.toContain("action");
    });

    it("handles empty params", () => {
      const key = cache.makeKey("list");
      expect(key).toBe("list|");
    });
  });

  describe("get/set", () => {
    it("stores and retrieves values", () => {
      cache.set("key1", { value: 42 });
      expect(cache.get("key1")).toEqual({ value: 42 });
    });

    it("returns undefined for missing keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("expires after TTL", async () => {
      cache = new ResponseCacheEngine(10, 50); // 50ms TTL
      cache.set("expires", "data");
      expect(cache.get("expires")).toBe("data");
      await new Promise(r => setTimeout(r, 60));
      expect(cache.get("expires")).toBeUndefined();
    });

    it("custom TTL per entry", async () => {
      cache.set("short", "data", 30);
      cache.set("long", "data", 5000);
      await new Promise(r => setTimeout(r, 50));
      expect(cache.get("short")).toBeUndefined();
      expect(cache.get("long")).toBe("data");
    });
  });

  describe("LRU eviction", () => {
    it("evicts when cache exceeds max size", () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, i);
      }
      expect(cache.getStats().size).toBe(10);
      // Add one more — one must be evicted
      cache.set("key10", 10);
      expect(cache.getStats().size).toBe(10);
      expect(cache.get("key10")).toBe(10); // New entry present
      expect(cache.getStats().evictions).toBe(1);
    });
  });

  describe("getOrCompute", () => {
    it("computes on cache miss", async () => {
      let computed = 0;
      const result = await cache.getOrCompute("calc", async () => {
        computed++;
        return 42;
      });
      expect(result).toBe(42);
      expect(computed).toBe(1);
    });

    it("returns cached value on hit", async () => {
      let computed = 0;
      const compute = async () => { computed++; return 42; };

      await cache.getOrCompute("calc", compute);
      await cache.getOrCompute("calc", compute);

      expect(computed).toBe(1); // Only computed once
    });
  });

  describe("invalidate", () => {
    it("removes specific key", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      expect(cache.invalidate("a")).toBe(true);
      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBe(2);
    });

    it("returns false for missing key", () => {
      expect(cache.invalidate("nonexistent")).toBe(false);
    });
  });

  describe("invalidatePrefix", () => {
    it("removes all keys with prefix", () => {
      cache.set("speed_feed|mat=4140", 1);
      cache.set("speed_feed|mat=316", 2);
      cache.set("thread_calc|size=M10", 3);

      const count = cache.invalidatePrefix("speed_feed|");
      expect(count).toBe(2);
      expect(cache.get("speed_feed|mat=4140")).toBeUndefined();
      expect(cache.get("thread_calc|size=M10")).toBe(3);
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe("getStats", () => {
    it("tracks hits and misses", () => {
      cache.set("x", 1);
      cache.get("x"); // hit
      cache.get("x"); // hit
      cache.get("y"); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe("66.7%");
      expect(stats.size).toBe(1);
    });

    it("reports N/A hit rate when no accesses", () => {
      expect(cache.getStats().hitRate).toBe("N/A");
    });
  });
});
