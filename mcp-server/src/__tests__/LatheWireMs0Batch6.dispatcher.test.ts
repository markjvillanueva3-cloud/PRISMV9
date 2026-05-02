/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch6:
 *   U-LWB13: lathe_post_process            → LathePostProcessorEngine.process (instance, 2-arg)
 *   U-LWB14: lathe_post_dialect_compare    → LathePostProcessorDialectValidatorEngine.compare (static, 3-string-arg)
 *   U-LWB15: lathe_post_spec_ingest        → LathePostGeneratorSpecIngestEngine.ingest (static)
 *
 * Notable: LWB14 + LWB15 use the singleton-as-class-alias pattern
 * (`export const X = Y` where Y is a class with static methods).
 * Singleton names still callable as `lathePostProcessorDialectValidatorEngine.compare(...)`.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch6 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_post_process"');
    expect(src).toContain('"lathe_post_dialect_compare"');
    expect(src).toContain('"lathe_post_spec_ingest"');
  });

  it("the LATHE-WIRE-MS0/Batch6 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch6: post processor + dialect validator + spec ingest");
  });
});

describe("U-LWB13 — lathe_post_process wiring (instance, 2-arg)", () => {
  it("dispatcher case lazy-imports LathePostProcessorEngine and calls process", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_post_process"');
    expect(src).toContain("LathePostProcessorEngine.js");
    expect(src).toContain("lathePostProcessorEngine.process");
  });

  it("case handler validates input AND config AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_post_process"[\s\S]{0,1000}input required \(LatheInput\)/);
    expect(src).toMatch(/case "lathe_post_process"[\s\S]{0,1000}config required \(LathePostConfig\)/);
    expect(src).toMatch(/case "lathe_post_process"[\s\S]{0,1000}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_post_process with input + config records", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_post_process:");
    expect(src).toMatch(/lathe_post_process:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_post_process:\s*z\.object\(\{[\s\S]{0,500}config:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePostProcessorEngine exports the singleton + process method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePostProcessorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePostProcessorEngine\s*=\s*new LathePostProcessorEngine\(\)/);
    expect(src).toMatch(/process\(\s*input:\s*LatheInput\s*,\s*config:\s*LathePostConfig\s*\):\s*LathePostResult/);
  });
});

describe("U-LWB14 — lathe_post_dialect_compare wiring (static, 3-string-arg)", () => {
  it("dispatcher case lazy-imports LathePostProcessorDialectValidatorEngine and calls compare", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_post_dialect_compare"');
    expect(src).toContain("LathePostProcessorDialectValidatorEngine.js");
    expect(src).toContain("lathePostProcessorDialectValidatorEngine.compare");
  });

  it("case handler validates 3 string args AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_post_dialect_compare"[\s\S]{0,1500}reference_path string required/);
    expect(src).toMatch(/case "lathe_post_dialect_compare"[\s\S]{0,1500}reference_content string required/);
    expect(src).toMatch(/case "lathe_post_dialect_compare"[\s\S]{0,1500}generated_content string required/);
    expect(src).toMatch(/case "lathe_post_dialect_compare"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_post_dialect_compare with 3 z.string() fields", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_post_dialect_compare:");
    expect(src).toMatch(/lathe_post_dialect_compare:\s*z\.object\(\{[\s\S]{0,800}reference_path:\s*z\.string\(\)/);
    expect(src).toMatch(/lathe_post_dialect_compare:\s*z\.object\(\{[\s\S]{0,800}reference_content:\s*z\.string\(\)/);
    expect(src).toMatch(/lathe_post_dialect_compare:\s*z\.object\(\{[\s\S]{0,800}generated_content:\s*z\.string\(\)/);
  });

  it("engine source: dialect validator alias points at class, exposes static compare()", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePostProcessorDialectValidatorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePostProcessorDialectValidatorEngine\s*=\s*LathePostProcessorDialectValidatorEngine/);
    expect(src).toMatch(/static\s+compare\(/);
  });
});

describe("U-LWB15 — lathe_post_spec_ingest wiring (static)", () => {
  it("dispatcher case lazy-imports LathePostGeneratorSpecIngestEngine and calls ingest", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_post_spec_ingest"');
    expect(src).toContain("LathePostGeneratorSpecIngestEngine.js");
    expect(src).toContain("lathePostGeneratorSpecIngestEngine.ingest");
  });

  it("case handler validates input AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_post_spec_ingest"[\s\S]{0,800}input required \(SpecIngestionInput\)/);
    expect(src).toMatch(/case "lathe_post_spec_ingest"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_post_spec_ingest with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_post_spec_ingest:");
    expect(src).toMatch(/lathe_post_spec_ingest:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: spec ingest alias points at class, exposes static ingest()", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePostGeneratorSpecIngestEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePostGeneratorSpecIngestEngine\s*=\s*LathePostGeneratorSpecIngestEngine/);
    expect(src).toMatch(/static\s+ingest\(\s*input:\s*SpecIngestionInput\s*\):\s*IngestionResult/);
  });
});
