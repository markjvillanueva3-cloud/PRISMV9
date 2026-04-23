import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  TypeFlowTracerEngine,
  typeFlowTracerEngine,
} from "../engines/TypeFlowTracerEngine.js";

describe("TypeFlowTracerEngine", () => {
  let tmpDir: string;
  let propertyFile: string;
  let spreadFile: string;
  let callableFile: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tflow-"));
    propertyFile = path.join(tmpDir, "prop.ts");
    fs.writeFileSync(
      propertyFile,
      `export function readObj(input: { name: string; age: number }): string {\n` +
      `  const label = input.name + "-" + input.age;\n` +
      `  return label;\n` +
      `}\n`,
    );

    spreadFile = path.join(tmpDir, "spread.ts");
    fs.writeFileSync(
      spreadFile,
      `export function merge(input: number[]): number[] {\n` +
      `  const extra = [0, ...input, 99];\n` +
      `  return extra;\n` +
      `}\n`,
    );

    callableFile = path.join(tmpDir, "callable.ts");
    fs.writeFileSync(
      callableFile,
      `export function passed(input: string): number {\n` +
      `  const parsed = parseInt(input);\n` +
      `  return parsed;\n` +
      `}\n`,
    );
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("singleton instantiated", () => {
    expect(typeFlowTracerEngine).toBeInstanceOf(TypeFlowTracerEngine);
    expect(typeFlowTracerEngine.name).toBe("TypeFlowTracerEngine");
  });

  it("property access classified as object-like", async () => {
    const e = new TypeFlowTracerEngine();
    const result = await e.trace({
      file: propertyFile,
      functionName: "readObj",
      parameterName: "input",
    });
    expect(result.usages.some((u) => u.kind === "property_access")).toBe(true);
    expect(result.shape).toBe("object-like");
  }, 30_000);

  it("spread usage classified as array-like", async () => {
    const e = new TypeFlowTracerEngine();
    const result = await e.trace({
      file: spreadFile,
      functionName: "merge",
      parameterName: "input",
    });
    expect(result.usages.some((u) => u.kind === "spread")).toBe(true);
    expect(result.shape).toBe("array-like");
  }, 30_000);

  it("passed to another function classified as callable-like when no property access", async () => {
    const e = new TypeFlowTracerEngine();
    const result = await e.trace({
      file: callableFile,
      functionName: "passed",
      parameterName: "input",
    });
    expect(result.usages.some((u) => u.kind === "passed_to_call")).toBe(true);
    expect(["callable-like", "unknown", "primitive-like"]).toContain(result.shape);
  }, 30_000);

  it("breakage hints generated when property accesses present", async () => {
    const e = new TypeFlowTracerEngine();
    const result = await e.trace({
      file: propertyFile,
      functionName: "readObj",
      parameterName: "input",
    });
    expect(result.breakageHints.length).toBeGreaterThan(0);
    expect(result.breakageHints.some((h) => /property access/i.test(h))).toBe(true);
  }, 30_000);

  it("FAIL: missing file throws", async () => {
    const e = new TypeFlowTracerEngine();
    await expect(e.trace({
      file: path.join(tmpDir, "missing.ts"),
      functionName: "x",
      parameterName: "y",
    })).rejects.toThrow(/file must exist/);
  });

  it("FAIL: missing function name throws", async () => {
    const e = new TypeFlowTracerEngine();
    await expect(e.trace({
      file: propertyFile,
      functionName: "",
      parameterName: "input",
    })).rejects.toThrow(/functionName required/);
  });

  it("FAIL: unknown function throws", async () => {
    const e = new TypeFlowTracerEngine();
    await expect(e.trace({
      file: propertyFile,
      functionName: "doesNotExistXyz",
      parameterName: "input",
    })).rejects.toThrow(/not found/);
  }, 30_000);

  it("FAIL: missing parameter name throws", async () => {
    const e = new TypeFlowTracerEngine();
    await expect(e.trace({
      file: propertyFile,
      functionName: "readObj",
      parameterName: "",
    })).rejects.toThrow(/parameterName required/);
  });

  it("ADV: reset clears project cache", () => {
    const e = new TypeFlowTracerEngine();
    e.reset();
    expect((e as unknown as { project: unknown }).project).toBe(null);
  });

  it("ADV: parameter not used returns zero usages", async () => {
    const unusedFile = path.join(tmpDir, "unused.ts");
    fs.writeFileSync(unusedFile, `export function untouched(dead: number): number {\n  return 42;\n}\n`);
    try {
      const e = new TypeFlowTracerEngine();
      const result = await e.trace({
        file: unusedFile,
        functionName: "untouched",
        parameterName: "dead",
      });
      expect(result.totalUsages).toBe(0);
      expect(result.breakageHints.length).toBe(0);
    } finally {
      try { fs.unlinkSync(unusedFile); } catch { /* ignore */ }
    }
  }, 30_000);
});
