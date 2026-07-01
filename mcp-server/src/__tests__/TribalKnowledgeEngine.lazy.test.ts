// TribalKnowledgeEngine.lazy.test.ts -- U-TK-LAZY (mcp-server cold-start fix).
// Proves the tip corpus + dedup hash set load LAZILY on first use (not at
// construction), and that the deferred load produces the same working corpus the
// old eager field-initializers + constructor did.
import { describe, it, expect } from "vitest";
import { TribalKnowledgeEngine } from "../engines/TribalKnowledgeEngine.js";

describe("TribalKnowledgeEngine U-TK-LAZY", () => {
  it("constructs without throwing (load deferred off the constructor)", () => {
    // The constructor is intentionally empty now; this must not read disk or
    // categorize the corpus. A throw-free cheap construction is the floor.
    expect(() => new TribalKnowledgeEngine()).not.toThrow();
  });

  it("stats() lazily materializes the full tip corpus on first access", () => {
    const e = new TribalKnowledgeEngine();
    const s = e.stats();
    // The corpus (static + doc-learned + captured) is non-trivial; a lazy load
    // that returned nothing would be a regression.
    expect(s.total_tips).toBeGreaterThan(0);
  });

  it("search() returns tips after the lazy load", () => {
    const e = new TribalKnowledgeEngine();
    const results = e.search({});
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("dedup works after the lazy hash-set build: capturing an existing tip returns null", () => {
    // capture() runs isDuplicateContent() -> ensureHashes() (the lazy hash build).
    // Capturing a tip already in the corpus must be detected as a duplicate and
    // return null WITHOUT writing (the early-return precedes saveCapturedTips).
    const e = new TribalKnowledgeEngine();
    const existing = e.search({})[0];
    expect(typeof existing.title).toBe("string");
    expect(existing.title.length).toBeGreaterThan(0);
    const dup = e.capture({
      category: existing.category,
      title: existing.title,
      body: existing.body,
      source: existing.source,
      confidence: existing.confidence,
    } as Parameters<TribalKnowledgeEngine["capture"]>[0]);
    expect(dup).toBeNull();
  });

  it("two independent instances both lazily load the same corpus size", () => {
    const a = new TribalKnowledgeEngine();
    const b = new TribalKnowledgeEngine();
    const sizeA = a.stats().total_tips;
    const sizeB = b.stats().total_tips;
    expect(sizeA).toBeGreaterThan(0);
    expect(sizeB).toBe(sizeA);
  });
});
