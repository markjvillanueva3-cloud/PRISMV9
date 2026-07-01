import { describe, it, expect } from "vitest";
import { ResponseCacheEngine } from "../engines/ResponseCacheEngine.js";

describe("ResponseCacheEngine", () => {

  describe("store and lookup", () => {
    it("returns miss for unknown calls", () => {
      const engine = new ResponseCacheEngine();
      const result = engine.lookup("Read", { file_path: "a.ts" });
      expect(result.hit).toBe(false);
    });

    it("returns hit for cached calls", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "a.ts" }, "file content here");
      const result = engine.lookup("Read", { file_path: "a.ts" });
      expect(result.hit).toBe(true);
      expect(result.entry!.result).toBe("file content here");
    });

    it("tracks saved tokens on hit", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Grep", { pattern: "foo" }, "x".repeat(400));
      const result = engine.lookup("Grep", { pattern: "foo" });
      expect(result.hit).toBe(true);
      expect(result.savedTokens).toBe(100);
    });

    it("distinguishes different params", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "a.ts" }, "content a");
      const result = engine.lookup("Read", { file_path: "b.ts" });
      expect(result.hit).toBe(false);
    });

    it("distinguishes different tools", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "a.ts" }, "content");
      const result = engine.lookup("Grep", { file_path: "a.ts" });
      expect(result.hit).toBe(false);
    });
  });

  describe("invalidate", () => {
    it("removes entries matching file path", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "src/a.ts" }, "content a");
      engine.store("Read", { file_path: "src/b.ts" }, "content b");
      const removed = engine.invalidate("src/a.ts");
      expect(removed).toBe(1);
      expect(engine.lookup("Read", { file_path: "src/a.ts" }).hit).toBe(false);
      expect(engine.lookup("Read", { file_path: "src/b.ts" }).hit).toBe(true);
    });

    it("removes all entries for a tool", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "a.ts" }, "a");
      engine.store("Read", { file_path: "b.ts" }, "b");
      engine.store("Grep", { pattern: "foo" }, "grep result");
      const removed = engine.invalidateTool("Read");
      expect(removed).toBe(2);
      expect(engine.lookup("Grep", { pattern: "foo" }).hit).toBe(true);
    });
  });

  describe("TTL expiry", () => {
    it("expires entries after TTL", () => {
      const engine = new ResponseCacheEngine(0.001);
      engine.store("Edit", { file_path: "a.ts" }, "content");
      const start = Date.now();
      while (Date.now() - start < 5) { /* spin */ }
      const result = engine.lookup("Edit", { file_path: "a.ts" });
      expect(result.hit).toBe(false);
    });
  });

  describe("max entries", () => {
    it("evicts oldest when over limit", () => {
      const engine = new ResponseCacheEngine(120, 3);
      engine.store("Read", { file_path: "1.ts" }, "1");
      engine.store("Read", { file_path: "2.ts" }, "2");
      engine.store("Read", { file_path: "3.ts" }, "3");
      engine.store("Read", { file_path: "4.ts" }, "4");
      expect(engine.lookup("Read", { file_path: "1.ts" }).hit).toBe(false);
      expect(engine.lookup("Read", { file_path: "4.ts" }).hit).toBe(true);
    });
  });

  describe("stats", () => {
    it("tracks hits and saved tokens", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "a.ts" }, "x".repeat(200));
      engine.lookup("Read", { file_path: "a.ts" });
      engine.lookup("Read", { file_path: "a.ts" });
      const s = engine.stats();
      expect(s.totalHits).toBe(2);
      expect(s.totalSavedTokens).toBe(100);
    });

    it("shows top tools", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "a.ts" }, "x".repeat(400));
      engine.store("Grep", { pattern: "foo" }, "y".repeat(200));
      engine.lookup("Read", { file_path: "a.ts" });
      engine.lookup("Grep", { pattern: "foo" });
      const s = engine.stats();
      expect(s.topTools.length).toBe(2);
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "a.ts" }, "content");
      const line = engine.oneLiner();
      expect(line).toContain("1 entries");
      expect(line).toContain("Cache");
    });
  });

  describe("setTtl", () => {
    it("allows custom TTL per tool", () => {
      const engine = new ResponseCacheEngine(120);
      engine.setTtl("Read", 0.001);
      engine.store("Read", { file_path: "a.ts" }, "content");
      const start = Date.now();
      while (Date.now() - start < 5) { /* spin */ }
      expect(engine.lookup("Read", { file_path: "a.ts" }).hit).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears cache and stats", () => {
      const engine = new ResponseCacheEngine();
      engine.store("Read", { file_path: "a.ts" }, "content");
      engine.lookup("Read", { file_path: "a.ts" });
      engine.reset();
      expect(engine.lookup("Read", { file_path: "a.ts" }).hit).toBe(false);
      expect(engine.stats().totalHits).toBe(0);
    });
  });
});
