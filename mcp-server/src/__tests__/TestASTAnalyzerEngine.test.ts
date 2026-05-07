import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { TestASTAnalyzerEngine, testASTAnalyzerEngine } from "../engines/TestASTAnalyzerEngine.js";

const ENGINES_DIR = path.resolve(__dirname, "..", "engines");
const SELF_PATH = path.join(ENGINES_DIR, "TestQualityAuditEngine.ts");
const AHP_PATH = path.join(ENGINES_DIR, "AHPEngine.ts");

describe("TestASTAnalyzerEngine — U-INFRA01", () => {
  // Exit condition 1: import from TestASTAnalyzerEngine succeeds
  it("exports a class and a singleton", () => {
    expect(TestASTAnalyzerEngine).toBeDefined();
    expect(testASTAnalyzerEngine).toBeInstanceOf(TestASTAnalyzerEngine);
  });

  it("constructor accepts empty options without crashing", () => {
    const fresh = new TestASTAnalyzerEngine();
    expect(fresh).toBeInstanceOf(TestASTAnalyzerEngine);
  });

  // Exit condition 2: parses TestQualityAuditEngine.ts without error
  it("parses TestQualityAuditEngine.ts with zero errors", () => {
    const result = testASTAnalyzerEngine.analyze(SELF_PATH);
    expect(result.errors).toEqual([]);
    expect(result.filePath).toBe(path.resolve(SELF_PATH));
  });

  // Exit condition 3: extracts singleton export name
  it("extracts the singleton export name for TestQualityAuditEngine", () => {
    const result = testASTAnalyzerEngine.analyze(SELF_PATH);
    expect(result.className).toBe("TestQualityAuditEngine");
    expect(result.singletonName).toBe("testQualityAuditEngine");
    expect(result.singletonMatchesClass).toBe(true);
  });

  it("extracts singleton for a second engine (AHPEngine) to verify generality", () => {
    const result = testASTAnalyzerEngine.analyze(AHP_PATH);
    expect(result.errors).toEqual([]);
    expect(result.className).toBe("AHPEngine");
    expect(result.singletonName).toBe("ahpEngine");
    expect(result.singletonMatchesClass).toBe(true);
  });

  it("lists all named exports from the source", () => {
    const result = testASTAnalyzerEngine.analyze(SELF_PATH);
    expect(result.exportedNames).toContain("TestQualityAuditEngine");
    expect(result.exportedNames).toContain("testQualityAuditEngine");
  });

  it("returns an error record (not throws) for a nonexistent file", () => {
    const result = testASTAnalyzerEngine.analyze("/tmp/does-not-exist-xyz.ts");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/not found/i);
    expect(result.className).toBeNull();
    expect(result.singletonName).toBeNull();
  });

  it("flags singletonMatchesClass=false when the instance class name differs", () => {
    // Write a real file to disk — analyze() uses fs.existsSync. Two classes,
    // singleton instantiates the non-primary one, so mismatch is expected.
    const tmpPath = path.join(os.tmpdir(), `ast-mismatch-${Date.now()}.ts`);
    fs.writeFileSync(
      tmpPath,
      `export class Alpha {}\nexport const alphaEngine = new Beta();\nexport class Beta {}\n`,
    );
    try {
      const engine = new TestASTAnalyzerEngine();
      const result = engine.analyze(tmpPath);
      expect(result.errors).toEqual([]);
      expect(result.className).toBeTruthy();
      // Classes: Alpha first (doesn't end in "Engine"), Beta second. Neither
      // matches our "...Engine" preference, so className falls back to the
      // first exported — Alpha. Singleton instantiates Beta → mismatch.
      expect(result.singletonName).toBe("alphaEngine");
      expect(result.singletonMatchesClass).toBe(false);
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });

});

// ── U-INFRA02: getPublicMethods ─────────────────────────────────────

describe("TestASTAnalyzerEngine.getPublicMethods — U-INFRA02", () => {
  const RICH_ENGINE = path.join(ENGINES_DIR, "AbstractionHierarchyEngine.ts");
  const AHP = path.join(ENGINES_DIR, "AHPEngine.ts");
  const AUDIT = path.join(ENGINES_DIR, "TestQualityAuditEngine.ts");

  it("returns multiple public methods for a rich engine", () => {
    const methods = testASTAnalyzerEngine.getPublicMethods(RICH_ENGINE);
    expect(methods.length).toBeGreaterThanOrEqual(3);
    expect(methods.every((m) => typeof m.name === "string" && m.name.length > 0)).toBe(true);
  });

  it("extracts the single public method of AHPEngine (calculate)", () => {
    const methods = testASTAnalyzerEngine.getPublicMethods(AHP);
    const names = methods.map((m) => m.name);
    expect(names).toContain("calculate");
  });

  it("includes parameter names and type text", () => {
    const methods = testASTAnalyzerEngine.getPublicMethods(AHP);
    const calc = methods.find((m) => m.name === "calculate");
    expect(calc).toBeTruthy();
    expect(calc?.parameterNames).toEqual(["input"]);
    expect(calc?.parameterTypeText[0]).toMatch(/AHPInput/);
    expect(calc?.returnTypeText).toMatch(/AHPResult/);
  });

  it("excludes private and protected members", () => {
    const tmp = path.join(os.tmpdir(), `exclude-private-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  public pub(): number { return 1; }
  private priv(): number { return 2; }
  protected prot(): number { return 3; }
  alsoPub(x: string): string { return x; }
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const methods = new TestASTAnalyzerEngine().getPublicMethods(tmp);
      const names = methods.map((m) => m.name).sort();
      expect(names).toEqual(["alsoPub", "pub"]);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("flags static vs instance methods", () => {
    const tmp = path.join(os.tmpdir(), `static-flag-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  instance(): number { return 1; }
  static factory(): DemoEngine { return new DemoEngine(); }
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const methods = new TestASTAnalyzerEngine().getPublicMethods(tmp);
      const factory = methods.find((m) => m.name === "factory");
      const instance = methods.find((m) => m.name === "instance");
      expect(factory?.isStatic).toBe(true);
      expect(instance?.isStatic).toBe(false);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("detects async methods", () => {
    const tmp = path.join(os.tmpdir(), `async-detect-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  syncMethod(): number { return 1; }
  async asyncMethod(): Promise<number> { return 1; }
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const methods = new TestASTAnalyzerEngine().getPublicMethods(tmp);
      const sync = methods.find((m) => m.name === "syncMethod");
      const async = methods.find((m) => m.name === "asyncMethod");
      expect(sync?.isAsync).toBe(false);
      expect(async?.isAsync).toBe(true);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("flags optional and default-value parameters", () => {
    const tmp = path.join(os.tmpdir(), `optional-params-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  run(a: number, b?: string, c: boolean = true): void {}
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const methods = new TestASTAnalyzerEngine().getPublicMethods(tmp);
      const run = methods.find((m) => m.name === "run");
      expect(run?.parameterOptional).toEqual([false, true, true]);
      expect(run?.parameterHasDefault).toEqual([false, false, true]);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  // Failure modes
  it("throws for missing file (failure mode 1)", () => {
    expect(() => testASTAnalyzerEngine.getPublicMethods("/tmp/no-such-xyz.ts")).toThrow(/not found/i);
  });

  it("returns empty array when source has no exported class (failure mode 2)", () => {
    const tmp = path.join(os.tmpdir(), `no-class-${Date.now()}.ts`);
    fs.writeFileSync(tmp, `export const x = 1;\nexport function y() { return 2; }\n`);
    try {
      const methods = new TestASTAnalyzerEngine().getPublicMethods(tmp);
      expect(methods).toEqual([]);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("returns empty array for class with no public methods (failure mode 3)", () => {
    const tmp = path.join(os.tmpdir(), `only-private-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  private p1(): number { return 1; }
  protected p2(): number { return 2; }
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const methods = new TestASTAnalyzerEngine().getPublicMethods(tmp);
      expect(methods).toEqual([]);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("handles an empty file without crashing (adversarial 1)", () => {
    const tmp = path.join(os.tmpdir(), `empty-${Date.now()}.ts`);
    fs.writeFileSync(tmp, "");
    try {
      const methods = new TestASTAnalyzerEngine().getPublicMethods(tmp);
      expect(methods).toEqual([]);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("handles a file with syntax errors (adversarial 2)", () => {
    const tmp = path.join(os.tmpdir(), `syntax-err-${Date.now()}.ts`);
    // Half-written method — ts-morph is tolerant of this
    fs.writeFileSync(tmp, `export class BrokenEngine {\n  incomplete(\n}\n`);
    try {
      // Must not throw — analyzer should degrade gracefully
      const methods = new TestASTAnalyzerEngine().getPublicMethods(tmp);
      expect(Array.isArray(methods)).toBe(true);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  // Spanning variability — 3 distinct engines verify generality across the
  // codebase (different method counts, different typing conventions).
  it("variability: exercises ≥3 distinct engines", () => {
    const samples = [AUDIT, AHP, RICH_ENGINE];
    for (const p of samples) {
      const methods = testASTAnalyzerEngine.getPublicMethods(p);
      expect(Array.isArray(methods)).toBe(true);
    }
  });
});

// ── U-INFRA03: getParameterTypes ────────────────────────────────────

describe("TestASTAnalyzerEngine.getParameterTypes — U-INFRA03", () => {
  const AHP = path.join(ENGINES_DIR, "AHPEngine.ts");

  it("resolves an interface-typed parameter to kind=object", () => {
    const types = testASTAnalyzerEngine.getParameterTypes(AHP, "calculate");
    expect(types).toHaveLength(1);
    expect(types[0].name).toMatch(/AHPInput/);
    expect(["object", "union"]).toContain(types[0].kind);
    expect(types[0].nullable).toBe(false);
  });

  it("identifies primitive types: number, string, boolean", () => {
    const tmp = path.join(os.tmpdir(), `prims-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  run(a: number, b: string, c: boolean): void {}
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const types = new TestASTAnalyzerEngine().getParameterTypes(tmp, "run");
      expect(types.map((t) => t.name)).toEqual(["number", "string", "boolean"]);
      expect(types.every((t) => t.kind === "primitive")).toBe(true);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("identifies union and intersection types", () => {
    const tmp = path.join(os.tmpdir(), `unions-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  run(a: number | string, b: { x: number } & { y: string }): void {}
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const types = new TestASTAnalyzerEngine().getParameterTypes(tmp, "run");
      expect(types[0].kind).toBe("union");
      expect(types[1].kind).toBe("intersection");
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("identifies array types", () => {
    const tmp = path.join(os.tmpdir(), `arrays-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  run(a: number[], b: Array<string>): void {}
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const types = new TestASTAnalyzerEngine().getParameterTypes(tmp, "run");
      expect(types[0].kind).toBe("array");
      expect(types[1].kind).toBe("array");
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("flags optional parameters as nullable (failure mode: optional)", () => {
    const tmp = path.join(os.tmpdir(), `opt-nullable-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  run(a: number, b?: string): void {}
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const types = new TestASTAnalyzerEngine().getParameterTypes(tmp, "run");
      expect(types[0].nullable).toBe(false);
      expect(types[1].nullable).toBe(true);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("throws when the method is absent (failure mode: bad method name)", () => {
    expect(() => testASTAnalyzerEngine.getParameterTypes(AHP, "noSuchMethod"))
      .toThrow(/Method not found/);
  });

  it("throws when the file is absent (failure mode: bad path)", () => {
    expect(() => testASTAnalyzerEngine.getParameterTypes("/tmp/does-not-exist.ts", "x"))
      .toThrow(/not found/i);
  });

  it("returns an empty array for zero-param methods (adversarial: empty)", () => {
    const tmp = path.join(os.tmpdir(), `no-params-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  noop(): void {}
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const types = new TestASTAnalyzerEngine().getParameterTypes(tmp, "noop");
      expect(types).toEqual([]);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("handles untyped parameters gracefully (adversarial: implicit any)", () => {
    const tmp = path.join(os.tmpdir(), `implicit-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  run(a: any, b: unknown): void {}
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const types = new TestASTAnalyzerEngine().getParameterTypes(tmp, "run");
      expect(types).toHaveLength(2);
      expect(types[0].name).toBeTruthy();
      expect(types[1].name).toBeTruthy();
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});

// ── U-INFRA04: getReturnShape ───────────────────────────────────────

describe("TestASTAnalyzerEngine.getReturnShape — U-INFRA04", () => {
  const AHP = path.join(ENGINES_DIR, "AHPEngine.ts");
  const RA_PREDICTOR = path.join(ENGINES_DIR, "WEDMRaPredictorEngine.ts");

  it("returns plain type for a sync method", () => {
    const shape = testASTAnalyzerEngine.getReturnShape(AHP, "calculate");
    expect(shape.typeText).toMatch(/AHPResult/);
    expect(shape.isAsync).toBe(false);
    expect(shape.isVoid).toBe(false);
    expect(shape.isAtomicValue).toBe(false);
  });

  it("flags isVoid for void returns", () => {
    const tmp = path.join(os.tmpdir(), `void-return-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  run(): void {}
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const shape = new TestASTAnalyzerEngine().getReturnShape(tmp, "run");
      expect(shape.isVoid).toBe(true);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("unwraps Promise<T> and flags isAsync=true", () => {
    const tmp = path.join(os.tmpdir(), `async-ret-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  async load(): Promise<{ ok: boolean }> { return { ok: true }; }
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const shape = new TestASTAnalyzerEngine().getReturnShape(tmp, "load");
      expect(shape.isAsync).toBe(true);
      expect(shape.innerType).toMatch(/ok/);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("detects AtomicValue<T> wrapper (PRISM physics output convention)", () => {
    // Synthesize — the live WEDMRaPredictorEngine references AtomicValue
    // in a doc comment, not necessarily on a return type node. A synthetic
    // file with the exact shape confirms detection regardless.
    const tmp = path.join(os.tmpdir(), `atomic-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `type AtomicValue<T> = { value: T; confidence: number; source: string };
export class PhysicsEngine {
  calc(): AtomicValue<number> { return { value: 0, confidence: 1, source: "test" }; }
}
export const physicsEngine = new PhysicsEngine();
`,
    );
    try {
      const shape = new TestASTAnalyzerEngine().getReturnShape(tmp, "calc");
      expect(shape.isAtomicValue).toBe(true);
      expect(shape.innerType).toBe("number");
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("detects Promise<AtomicValue<T>> — async + atomic wrapper", () => {
    const tmp = path.join(os.tmpdir(), `promise-atomic-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `type AtomicValue<T> = { value: T; confidence: number; source: string };
export class PhysicsEngine {
  async calc(): Promise<AtomicValue<number>> { return { value: 0, confidence: 1, source: "test" }; }
}
export const physicsEngine = new PhysicsEngine();
`,
    );
    try {
      const shape = new TestASTAnalyzerEngine().getReturnShape(tmp, "calc");
      expect(shape.isAsync).toBe(true);
      expect(shape.isAtomicValue).toBe(true);
      expect(shape.innerType).toBe("number");
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("throws when the file is absent (failure mode: bad path)", () => {
    expect(() => testASTAnalyzerEngine.getReturnShape("/tmp/does-not-exist.ts", "x"))
      .toThrow(/not found/i);
  });

  it("throws when the method is absent (failure mode: bad method)", () => {
    expect(() => testASTAnalyzerEngine.getReturnShape(AHP, "doesNotExist"))
      .toThrow(/Method not found/);
  });

  it("handles no explicit return type annotation (failure mode: inferred)", () => {
    const tmp = path.join(os.tmpdir(), `inferred-${Date.now()}.ts`);
    fs.writeFileSync(
      tmp,
      `export class DemoEngine {
  compute() { return 42; }
}
export const demoEngine = new DemoEngine();
`,
    );
    try {
      const shape = new TestASTAnalyzerEngine().getReturnShape(tmp, "compute");
      expect(shape.typeText).toBeTruthy();
      expect(shape.isVoid).toBe(false);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("handles a live WEDM engine file (adversarial: real file with complex return)", () => {
    // Smoke test — analyzer must not crash on a real engine file from the
    // codebase, regardless of return type shape. Don't assert structure
    // since it may evolve.
    const methods = testASTAnalyzerEngine.getPublicMethods(RA_PREDICTOR);
    expect(methods.length).toBeGreaterThan(0);
    const shape = testASTAnalyzerEngine.getReturnShape(RA_PREDICTOR, methods[0].name);
    expect(shape).toBeDefined();
    expect(typeof shape.typeText).toBe("string");
  });
});
