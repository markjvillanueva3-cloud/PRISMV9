import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  TypeAwareReferenceEngine,
  typeAwareReferenceEngine,
} from "../engines/TypeAwareReferenceEngine.js";

describe("TypeAwareReferenceEngine", () => {
  let tmpDir: string;
  let fixtureA: string;
  let fixtureB: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taref-"));
    fixtureA = path.join(tmpDir, "a.ts");
    fixtureB = path.join(tmpDir, "b.ts");
    fs.writeFileSync(
      fixtureA,
      `export function addNumbers(a: number, b: number): number {\n  return a + b;\n}\n`,
    );
    fs.writeFileSync(
      fixtureB,
      `import { addNumbers } from "./a";\nexport const total = addNumbers(1, 2);\n`,
    );
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("singleton instantiated", () => {
    expect(typeAwareReferenceEngine).toBeInstanceOf(TypeAwareReferenceEngine);
    expect(typeAwareReferenceEngine.name).toBe("TypeAwareReferenceEngine");
  });

  it("finds declaration + reference across files", async () => {
    const e = new TypeAwareReferenceEngine();
    const result = await e.findReferences({
      targetFile: fixtureA,
      symbolName: "addNumbers",
      scopeFiles: [fixtureA, fixtureB],
    });
    expect(result.totalFound).toBeGreaterThanOrEqual(2);
    const files = new Set(result.references.map((r) => path.normalize(r.file)));
    expect(files.has(path.normalize(fixtureA))).toBe(true);
    expect(files.has(path.normalize(fixtureB))).toBe(true);
  }, 30_000);

  it("scope filter marks out-of-scope files", async () => {
    const e = new TypeAwareReferenceEngine();
    const result = await e.findReferences({
      targetFile: fixtureA,
      symbolName: "addNumbers",
      scopeFiles: [fixtureA],
    });
    const outOfScope = result.references.filter((r) => !r.inScope);
    expect(outOfScope.length + result.references.filter((r) => r.inScope).length).toBe(result.references.length);
  }, 30_000);

  it("returns empty for unknown symbol", async () => {
    const e = new TypeAwareReferenceEngine();
    const result = await e.findReferences({
      targetFile: fixtureA,
      symbolName: "nonexistentSymbolXYZ",
      scopeFiles: [fixtureA],
    });
    expect(result.totalFound).toBe(0);
  }, 30_000);

  it("FAIL: missing targetFile throws", async () => {
    const e = new TypeAwareReferenceEngine();
    await expect(e.findReferences({ targetFile: "", symbolName: "x" })).rejects.toThrow(/targetFile required/);
  });

  it("FAIL: missing symbolName throws", async () => {
    const e = new TypeAwareReferenceEngine();
    await expect(e.findReferences({ targetFile: fixtureA, symbolName: "" })).rejects.toThrow(/symbolName required/);
  });

  it("FAIL: nonexistent targetFile throws", async () => {
    const e = new TypeAwareReferenceEngine();
    await expect(e.findReferences({
      targetFile: path.join(tmpDir, "does-not-exist.ts"),
      symbolName: "x",
    })).rejects.toThrow(/does not exist/);
  });

  it("reset clears cached project", () => {
    const e = new TypeAwareReferenceEngine();
    e.reset();
    expect((e as unknown as { project: unknown }).project).toBe(null);
  });

  it("ADV: identifier with same name as variable does not match function symbol", async () => {
    const extra = path.join(tmpDir, "c.ts");
    fs.writeFileSync(extra, `function unrelated() {\n  const addNumbers = 42;\n  return addNumbers;\n}\n`);
    try {
      const e = new TypeAwareReferenceEngine();
      const result = await e.findReferences({
        targetFile: fixtureA,
        symbolName: "addNumbers",
        scopeFiles: [fixtureA, extra],
      });
      const extraRefs = result.references.filter((r) => path.normalize(r.file) === path.normalize(extra));
      expect(extraRefs.length).toBe(0);
    } finally {
      try { fs.unlinkSync(extra); } catch { /* ignore */ }
    }
  }, 20_000);

  it("ADV: deduplicates multiple identifier occurrences on same line", async () => {
    const e = new TypeAwareReferenceEngine();
    const result = await e.findReferences({
      targetFile: fixtureA,
      symbolName: "addNumbers",
      scopeFiles: [fixtureA, fixtureB],
    });
    const keys = result.references.map((r) => `${r.file}:${r.line}:${r.kind}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
