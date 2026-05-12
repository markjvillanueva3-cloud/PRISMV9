/**
 * CodeSystemIndexEngine tests
 */
import { describe, it, expect } from "vitest";
import { codeSystemIndexEngine } from "../engines/CodeSystemIndexEngine.js";

describe("CodeSystemIndexEngine", () => {
  it("loads index and has >1000 codes", () => {
    expect(codeSystemIndexEngine.totalCodes()).toBeGreaterThan(1000);
  });

  it("resolves engine code E0001", () => {
    const entry = codeSystemIndexEngine.resolve("E0001");
    expect(entry).not.toBeNull();
    expect(entry!.path).toContain("src/engines/");
  });

  it("resolves dispatcher code D01", () => {
    const entry = codeSystemIndexEngine.resolve("D01");
    expect(entry).not.toBeNull();
    expect(entry!.path).toContain("Dispatcher");
  });

  it("lookup returns code for known path", () => {
    const entry = codeSystemIndexEngine.resolve("E0001");
    if (entry) {
      const code = codeSystemIndexEngine.lookup(entry.path);
      expect(code).toBe("E0001");
    }
  });

  it("search finds engines by name", () => {
    const results = codeSystemIndexEngine.search("Calc");
    expect(results.length).toBeGreaterThan(0);
  });

  it("listCategory returns dispatchers", () => {
    const dispatchers = codeSystemIndexEngine.listCategory("D");
    expect(dispatchers.length).toBeGreaterThan(40);
  });

  it("categories returns all category info", () => {
    const cats = codeSystemIndexEngine.categories();
    expect(Object.keys(cats).length).toBeGreaterThan(10);
    expect(cats["E"]).toBeDefined();
    expect(cats["E"].label).toBe("Engine");
  });

  it("compact returns summary string", () => {
    const summary = codeSystemIndexEngine.compact();
    expect(summary).toContain("PRISM DSL");
    expect(summary.length).toBeLessThan(500);
  });

  it("resolveMany handles multiple codes", () => {
    const result = codeSystemIndexEngine.resolveMany(["E0001", "D01", "INVALID"]);
    expect(result["E0001"]).not.toBeNull();
    expect(result["D01"]).not.toBeNull();
    expect(result["INVALID"]).toBeNull();
  });

  it("external codes resolve", () => {
    const entry = codeSystemIndexEngine.resolve("X06");
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("MEMORY");
  });
});
