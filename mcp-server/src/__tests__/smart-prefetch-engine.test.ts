import { describe, it, expect } from "vitest";
import { SmartPrefetchEngine } from "../engines/SmartPrefetchEngine.js";

describe("SmartPrefetchEngine", () => {
  describe("recordAccess and suggest", () => {
    it("suggests imports for current file", () => {
      const engine = new SmartPrefetchEngine();
      engine.registerImports("src/a.ts", ["./b.js", "./c.js"]);
      const suggestions = engine.suggest("src/a.ts");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.path.includes("b.js"))).toBe(true);
    });

    it("suggests co-accessed files", () => {
      const engine = new SmartPrefetchEngine();
      engine.recordAccess("src/a.ts", "Read");
      engine.recordAccess("src/b.ts", "Read");
      engine.recordAccess("src/a.ts", "Edit");
      engine.recordAccess("src/b.ts", "Edit");
      // Now a.ts and b.ts are co-accessed
      const suggestions = engine.suggest("src/a.ts");
      expect(suggestions.some((s) => s.path.includes("b.ts"))).toBe(true);
    });

    it("returns empty for unknown files", () => {
      const engine = new SmartPrefetchEngine();
      const suggestions = engine.suggest("unknown/file.ts");
      expect(suggestions.length).toBe(0);
    });

    it("limits suggestions", () => {
      const engine = new SmartPrefetchEngine();
      for (let i = 0; i < 20; i++) {
        engine.registerImports("src/main.ts", [
          "./dep" + i + ".js",
        ]);
      }
      const suggestions = engine.suggest("src/main.ts", 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe("extractImports", () => {
    it("extracts relative imports from TypeScript", () => {
      const engine = new SmartPrefetchEngine();
      const content = [
        'import { foo } from "./foo.js";',
        'import { bar } from "../bar.js";',
        'import { baz } from "external-lib";',
      ].join("\n");
      const imports = engine.extractImports(content);
      expect(imports).toContain("./foo.js");
      expect(imports).toContain("../bar.js");
      expect(imports).not.toContain("external-lib");
    });
  });

  describe("frequentPairs", () => {
    it("identifies frequently co-accessed files", () => {
      const engine = new SmartPrefetchEngine();
      // Access a.ts and b.ts together multiple times
      for (let i = 0; i < 3; i++) {
        engine.recordAccess("src/a.ts", "Read");
        engine.recordAccess("src/b.ts", "Read");
      }
      const pairs = engine.frequentPairs();
      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs[0].count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new SmartPrefetchEngine();
      engine.recordAccess("src/a.ts", "Read");
      const line = engine.oneLiner();
      expect(line).toContain("1 accesses");
      expect(line).toContain("Prefetch");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      const engine = new SmartPrefetchEngine();
      engine.recordAccess("src/a.ts", "Read");
      engine.registerImports("src/a.ts", ["./b.js"]);
      engine.reset();
      expect(engine.suggest("src/a.ts").length).toBe(0);
      expect(engine.oneLiner()).toContain("0 accesses");
    });
  });
});
