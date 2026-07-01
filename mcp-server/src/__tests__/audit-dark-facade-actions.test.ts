/**
 * Tests for the dark-facade audit harness (U-DARK-FACADE-AUDIT).
 * Exercises the pure extraction/classification functions with inline fixtures
 * (no real-file dependency -> deterministic).
 */
import { describe, it, expect } from "vitest";
import {
  extractFacadeCases,
  engineMethodNames,
  classifyFacadeCase,
} from "../../scripts/audit-dark-facade-actions.mjs";

const DISPATCHER_FIXTURE = `
        switch (action) {
          case "real_one": {
            const { realEngine } = await import("../../engines/RealEngine.js");
            result = realEngine.compute(params);
            break;
          }
          case "dark_one": {
            const mod = await import("../../engines/DarkEngine.js");
            const eng = (mod as any).darkEngine ?? new ((mod as any).DarkEngine)();
            result = (eng as any).predict?.(params) ?? (eng as any).analyze?.(params) ?? { engine: "DarkEngine", note: "method not callable" };
            break;
          }
          case "multiline_one": {
            const { someEngine } = await import("../../engines/SomeEngine.js");
            result = (someEngine as any).foo?.(params)
              ?? (someEngine as any).bar?.(params)
              ?? { engine: "SomeEngine", note: "method not callable" };
            break;
          }
        }
`;

describe("extractFacadeCases", () => {
  it("extracts only the facade cases (those ending in 'method not callable')", () => {
    const cases = extractFacadeCases(DISPATCHER_FIXTURE);
    const actions = cases.map((c) => c.action).sort();
    expect(actions).toEqual(["dark_one", "multiline_one"]);
  });

  it("captures probed method names + engine path for a single-line facade", () => {
    const cases = extractFacadeCases(DISPATCHER_FIXTURE);
    const dark = cases.find((c) => c.action === "dark_one");
    expect(dark?.probedMethods).toEqual(["predict", "analyze"]);
    expect(dark?.enginePath).toBe("../../engines/DarkEngine.js");
  });

  it("captures probes spanning multiple lines (wrapped ?? chain)", () => {
    const cases = extractFacadeCases(DISPATCHER_FIXTURE);
    const ml = cases.find((c) => c.action === "multiline_one");
    expect(ml?.probedMethods).toEqual(["foo", "bar"]);
    expect(ml?.enginePath).toBe("../../engines/SomeEngine.js");
  });

  it("returns [] for a source with no facade marker", () => {
    expect(extractFacadeCases("const x = 1;\ncase \"y\": { result = e.go(params); }")).toEqual([]);
  });
});

describe("engineMethodNames", () => {
  const ENGINE_FIXTURE = `
export class SomeEngine {
  static decide(input: X): Y {
    if (input) {
      return go(input);
    }
  }
  async run(): Promise<void> {}
  compute(p: P): R { return r; }
  private helper(n: number): number { return n; }
}
`;
  it("collects static, async, instance, and private method names", () => {
    const names = engineMethodNames(ENGINE_FIXTURE);
    expect(names.has("decide")).toBe(true);
    expect(names.has("run")).toBe(true);
    expect(names.has("compute")).toBe(true);
    expect(names.has("helper")).toBe(true);
  });

  it("does NOT capture control-flow keywords as methods", () => {
    const names = engineMethodNames(ENGINE_FIXTURE);
    expect(names.has("if")).toBe(false);
    expect(names.has("return")).toBe(false);
  });
});

describe("classifyFacadeCase", () => {
  const engineSrc = "export class E {\n  decide(x: X): Y { return y; }\n  getStats(): S { return s; }\n}\n";

  it("flags DARK when none of the probed names is a real method", () => {
    const v = classifyFacadeCase({ action: "a", enginePath: "e.js", probedMethods: ["predict", "analyze", "run"] }, engineSrc);
    expect(v.dark).toBe(true);
    expect(v.foundMethods).toEqual([]);
  });

  it("flags LIT (not dark) when a probe hits a real method", () => {
    const v = classifyFacadeCase({ action: "a", enginePath: "e.js", probedMethods: ["predict", "decide"] }, engineSrc);
    expect(v.dark).toBe(false);
    expect(v.foundMethods).toEqual(["decide"]);
  });

  it("does not classify (dark=false) when the engine source is unresolved", () => {
    const v = classifyFacadeCase({ action: "a", enginePath: null, probedMethods: ["predict"] }, null);
    expect(v.dark).toBe(false);
    expect(v.reason).toMatch(/unresolved/i);
  });
});
