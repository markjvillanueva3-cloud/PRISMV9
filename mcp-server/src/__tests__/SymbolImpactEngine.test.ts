import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { SymbolImpactEngine, symbolImpactEngine } from "../engines/SymbolImpactEngine.js";

describe("SymbolImpactEngine", () => {
  let tmpDir: string;
  let engineFile: string;
  let testFile: string;
  let dispatcherFile: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "symimp-"));
    engineFile = path.join(tmpDir, "MyEngine.ts");
    fs.writeFileSync(engineFile, `export function myFunc(x: number): number {\n  return x * 2;\n}\n`);

    const testsDir = path.join(tmpDir, "__tests__");
    fs.mkdirSync(testsDir);
    testFile = path.join(testsDir, "MyEngine.test.ts");
    fs.writeFileSync(testFile, `import { myFunc } from "../MyEngine";\nmyFunc(5);\n`);

    const dispDir = path.join(tmpDir, "dispatchers");
    fs.mkdirSync(dispDir);
    dispatcherFile = path.join(dispDir, "devDispatcher.ts");
    fs.writeFileSync(dispatcherFile, `import { myFunc } from "../MyEngine";\nexport const r = myFunc(7);\n`);
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("singleton instantiated", () => {
    expect(symbolImpactEngine).toBeInstanceOf(SymbolImpactEngine);
    expect(symbolImpactEngine.name).toBe("SymbolImpactEngine");
  });

  it("classifies test + dispatcher files into buckets", async () => {
    const e = new SymbolImpactEngine();
    const impact = await e.analyze({
      targetFile: engineFile,
      symbolName: "myFunc",
      scopeFiles: [engineFile, testFile, dispatcherFile],
    });
    expect(impact.affectedFiles.some((f) => f.endsWith("MyEngine.test.ts"))).toBe(true);
    expect(impact.testFiles.length).toBeGreaterThan(0);
    expect(impact.dispatcherFiles.length).toBeGreaterThan(0);
  }, 30_000);

  it("risk level = high when dispatcher or test is touched", async () => {
    const e = new SymbolImpactEngine();
    const impact = await e.analyze({
      targetFile: engineFile,
      symbolName: "myFunc",
      scopeFiles: [engineFile, testFile, dispatcherFile],
    });
    expect(impact.riskLevel).toBe("high");
  }, 30_000);

  it("risk level = low when symbol has zero external references", async () => {
    const isoFile = path.join(tmpDir, "Isolated.ts");
    fs.writeFileSync(isoFile, `export function onlyMe() { return 1; }\n`);
    try {
      const e = new SymbolImpactEngine();
      const impact = await e.analyze({
        targetFile: isoFile,
        symbolName: "onlyMe",
        scopeFiles: [isoFile],
      });
      expect(impact.affectedFiles.length).toBe(0);
      expect(impact.riskLevel).toBe("low");
    } finally {
      try { fs.unlinkSync(isoFile); } catch { /* ignore */ }
    }
  }, 30_000);

  it("FAIL: missing input throws", async () => {
    const e = new SymbolImpactEngine();
    await expect(e.analyze(null as unknown as { targetFile: string; symbolName: string }))
      .rejects.toThrow(/input required/);
  });

  it("FAIL: missing targetFile throws", async () => {
    const e = new SymbolImpactEngine();
    await expect(e.analyze({ targetFile: "", symbolName: "x" }))
      .rejects.toThrow(/targetFile required/);
  });

  it("FAIL: missing symbolName throws", async () => {
    const e = new SymbolImpactEngine();
    await expect(e.analyze({ targetFile: engineFile, symbolName: "" }))
      .rejects.toThrow(/symbolName required/);
  });

  it("ADV: unknown symbol returns empty affected", async () => {
    const e = new SymbolImpactEngine();
    const impact = await e.analyze({
      targetFile: engineFile,
      symbolName: "doesNotExist_xyz",
      scopeFiles: [engineFile],
    });
    expect(impact.affectedFiles.length).toBe(0);
    expect(impact.riskLevel).toBe("low");
  }, 30_000);

  it("ADV: totalDeclarations reports at least the engine's own declaration", async () => {
    const e = new SymbolImpactEngine();
    const impact = await e.analyze({
      targetFile: engineFile,
      symbolName: "myFunc",
      scopeFiles: [engineFile, testFile, dispatcherFile],
    });
    expect(impact.totalDeclarations).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it("ADV: testFiles subset is disjoint from dispatcherFiles subset", async () => {
    const e = new SymbolImpactEngine();
    const impact = await e.analyze({
      targetFile: engineFile,
      symbolName: "myFunc",
      scopeFiles: [engineFile, testFile, dispatcherFile],
    });
    const overlap = impact.testFiles.filter((f) => impact.dispatcherFiles.includes(f));
    expect(overlap.length).toBe(0);
  }, 30_000);
});
