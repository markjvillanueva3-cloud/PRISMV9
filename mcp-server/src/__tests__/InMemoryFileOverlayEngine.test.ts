/**
 * InMemoryFileOverlayEngine — dedicated per-engine test file (U-FORE-05 helper).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  InMemoryFileOverlayEngine,
  inMemoryFileOverlayEngine,
} from "../engines/InMemoryFileOverlayEngine.js";

describe("InMemoryFileOverlayEngine — virtual filesystem", () => {
  it("exports a singleton with correct name", () => {
    expect(inMemoryFileOverlayEngine).toBeInstanceOf(InMemoryFileOverlayEngine);
    expect(inMemoryFileOverlayEngine.name).toBe("InMemoryFileOverlayEngine");
  });

  it("write + read round-trips content", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/Foo.ts", "export const x = 1;");
    expect(o.read("src/Foo.ts")).toBe("export const x = 1;");
  });

  it("delete makes read return null", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/a.ts", "x");
    o.delete("src/a.ts");
    expect(o.read("src/a.ts")).toBeNull();
  });

  it("exists tracks overlay state", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/a.ts", "x");
    expect(o.exists("src/a.ts")).toBe(true);
    o.delete("src/a.ts");
    expect(o.exists("src/a.ts")).toBe(false);
  });

  it("countByOp tallies create/modify/delete", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("a.ts", "a");
    o.write("b.ts", "b");
    o.delete("c.ts");
    const c = o.countByOp();
    expect(c.delete).toBe(1);
    expect(c.create + c.modify).toBe(2);
  });

  it("diff reports bytesAdded for creates", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/new-" + Date.now() + ".ts", "x".repeat(500));
    const d = o.diff();
    expect(d.totalBytesAdded).toBeGreaterThanOrEqual(500);
  });

  it("fork() produces an independent overlay", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("a.ts", "1");
    const child = o.fork();
    child.write("a.ts", "2");
    expect(o.read("a.ts")).toBe("1");
    expect(child.read("a.ts")).toBe("2");
  });

  it("reset() clears all entries", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("a.ts", "x");
    o.reset();
    expect(o.has("a.ts")).toBe(false);
  });

  it("impactedTestFiles picks up overlaid sibling test", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src/engines/FooEngine.ts", "export class FooEngine {}");
    o.write("src/engines/FooEngine.test.ts", "it('x', () => {})");
    const files = o.impactedTestFiles();
    expect(files.some((p) => p.endsWith("FooEngine.test.ts"))).toBe(true);
  });

  it("falls through to real disk for non-overlaid paths", () => {
    const o = new InMemoryFileOverlayEngine();
    const real = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(real)) return;
    expect(o.read(real)).toContain("{");
  });

  it("FAIL: non-string content throws", () => {
    const o = new InMemoryFileOverlayEngine();
    expect(() => o.write("x.ts", 42 as any)).toThrow(/must be a string/);
  });

  it("FAIL: empty path throws", () => {
    const o = new InMemoryFileOverlayEngine();
    expect(() => o.write("", "x")).toThrow(/non-empty string/);
  });

  it("ADV: normalizes backslash paths to forward slashes", () => {
    const o = new InMemoryFileOverlayEngine();
    o.write("src\\engines\\Foo.ts", "x");
    expect(o.read("src/engines/Foo.ts")).toBe("x");
  });
});
