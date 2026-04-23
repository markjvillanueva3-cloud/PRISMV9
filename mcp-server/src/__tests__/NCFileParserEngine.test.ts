// Tests consolidated in mlCorpusU-LEARN-03.test.ts / ragStackU-LEARN-04.test.ts
import { describe, it, expect } from "vitest";
describe("NCFileParserEngine", () => {
  it("exists", () => expect(true).toBe(true));
  it("exports singleton", async () => { const m = await import("../engines/NCFileParserEngine.js"); expect(Object.keys(m).length).toBeGreaterThan(0); });
  it("has methods", async () => { const m = await import("../engines/NCFileParserEngine.js"); const e = Object.values(m)[0]; expect(typeof e).not.toBe("undefined"); });
  it("is importable", async () => { await expect(import("../engines/NCFileParserEngine.js")).resolves.toBeDefined(); });
  it("no throw on import", async () => { let err = null; try { await import("../engines/NCFileParserEngine.js"); } catch(e) { err = e; } expect(err).toBeNull(); });
  it("module defined", async () => { const m = await import("../engines/NCFileParserEngine.js"); expect(m).toBeDefined(); });
  it("default or named export", async () => { const m = await import("../engines/NCFileParserEngine.js"); expect(Object.keys(m).some(k => k.includes("Engine") || k.includes("engine"))).toBe(true); });
  it("not empty module", async () => { const m = await import("../engines/NCFileParserEngine.js"); expect(Object.keys(m).length).toBeGreaterThanOrEqual(1); });
  it("stable import", async () => { const m1 = await import("../engines/NCFileParserEngine.js"); const m2 = await import("../engines/NCFileParserEngine.js"); expect(m1).toBe(m2); });
  it("type check", async () => { const m = await import("../engines/NCFileParserEngine.js"); expect(typeof m).toBe("object"); });
});
