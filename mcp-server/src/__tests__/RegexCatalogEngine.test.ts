/** RegexCatalogEngine tests — HCAP14. */
import { describe, it, expect } from "vitest";
import { RegexCatalogEngine, type RegexEntry } from "../engines/RegexCatalogEngine.js";

const entry = (over: Partial<RegexEntry> & Pick<RegexEntry, "name" | "pattern">): RegexEntry => ({
  flags: "", ...over,
});

describe("RegexCatalogEngine.register / test", () => {
  it("registers a simple pattern and tests it positively", () => {
    let s = RegexCatalogEngine.empty();
    s = RegexCatalogEngine.register(s, entry({ name: "email", pattern: ".+@.+" }));
    expect(RegexCatalogEngine.test(s, "email", "a@b.com")).toBe(true);
    expect(RegexCatalogEngine.test(s, "email", "no-at-sign")).toBe(false);
  });

  it("rejects duplicate name", () => {
    let s = RegexCatalogEngine.empty();
    s = RegexCatalogEngine.register(s, entry({ name: "x", pattern: "a" }));
    expect(() => RegexCatalogEngine.register(s, entry({ name: "x", pattern: "b" }))).toThrow(/duplicate/);
  });

  it("rejects invalid regex pattern at register time", () => {
    const s = RegexCatalogEngine.empty();
    expect(() => RegexCatalogEngine.register(s, entry({ name: "bad", pattern: "[unclosed" }))).toThrow(/invalid/);
  });

  it("rejects flags outside gimsuy (zod)", () => {
    const s = RegexCatalogEngine.empty();
    expect(() => RegexCatalogEngine.register(s, entry({ name: "x", pattern: "a", flags: "Z" }))).toThrow();
  });

  it("test() throws when pattern not registered", () => {
    expect(() => RegexCatalogEngine.test(RegexCatalogEngine.empty(), "missing", "x")).toThrow(/not registered/);
  });
});

describe("RegexCatalogEngine.extractAll", () => {
  it("extracts all global matches even when pattern has no g flag", () => {
    let s = RegexCatalogEngine.empty();
    s = RegexCatalogEngine.register(s, entry({ name: "num", pattern: "\\d+" }));
    expect(RegexCatalogEngine.extractAll(s, "num", "a1 b22 c333")).toEqual(["1", "22", "333"]);
  });

  it("returns empty array when no matches", () => {
    let s = RegexCatalogEngine.empty();
    s = RegexCatalogEngine.register(s, entry({ name: "num", pattern: "\\d+" }));
    expect(RegexCatalogEngine.extractAll(s, "num", "no digits")).toEqual([]);
  });
});

describe("RegexCatalogEngine.deregister / list", () => {
  it("removes the named pattern", () => {
    let s = RegexCatalogEngine.empty();
    s = RegexCatalogEngine.register(s, entry({ name: "x", pattern: "a" }));
    s = RegexCatalogEngine.deregister(s, "x");
    expect(s.entries.size).toBe(0);
  });

  it("deregister throws on missing name", () => {
    expect(() => RegexCatalogEngine.deregister(RegexCatalogEngine.empty(), "nope")).toThrow(/not found/);
  });

  it("list returns registered names + suspicious flag", () => {
    let s = RegexCatalogEngine.empty();
    s = RegexCatalogEngine.register(s, entry({ name: "x", pattern: "a" }));
    const list = RegexCatalogEngine.list(s);
    expect(list).toEqual([{ name: "x", suspicious: false }]);
  });
});

describe("RegexCatalogEngine — backtracking heuristic + render", () => {
  it("flags nested unbounded quantifier as suspicious", () => {
    let s = RegexCatalogEngine.empty();
    s = RegexCatalogEngine.register(s, entry({ name: "evil", pattern: "(a+)+" }));
    expect(RegexCatalogEngine.list(s)[0].suspicious).toBe(true);
  });

  it("renderState empty banner", () => {
    expect(RegexCatalogEngine.renderState(RegexCatalogEngine.empty())).toBe("[REGEX-CATALOG] (empty)");
  });

  it("renderState shows registered + suspicious marker", () => {
    let s = RegexCatalogEngine.empty();
    s = RegexCatalogEngine.register(s, entry({ name: "evil", pattern: "(a+)+" }));
    const md = RegexCatalogEngine.renderState(s);
    expect(md.includes("evil")).toBe(true);
    expect(md.includes("suspicious")).toBe(true);
  });
});
