/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch3:
 *   U-LWB04: lathe_partoff_safety_eval → LathePartoffSafetyRailEngine.evaluate
 *   U-LWB05: lathe_slo_evaluate        → LathePerformanceSLORegistryEngine.evaluate
 *   U-LWB06: lathe_job_schedule        → LatheJobSchedulingEngine.schedule
 *
 * Same text-grep pattern as Batch1/Batch2 (no zod runtime in worktree).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch3 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_partoff_safety_eval"');
    expect(src).toContain('"lathe_slo_evaluate"');
    expect(src).toContain('"lathe_job_schedule"');
  });

  it("the LATHE-WIRE-MS0/Batch3 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch3: partoff safety rail + SLO registry + job scheduling");
  });
});

describe("U-LWB04 — lathe_partoff_safety_eval wiring", () => {
  it("dispatcher case lazy-imports LathePartoffSafetyRailEngine and calls evaluate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_partoff_safety_eval"');
    expect(src).toContain("LathePartoffSafetyRailEngine.js");
    expect(src).toContain("lathePartoffSafetyRailEngine.evaluate");
  });

  it("case handler validates op param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_partoff_safety_eval"[\s\S]{0,800}op required \(PartoffOpSpec\)/);
    expect(src).toMatch(/case "lathe_partoff_safety_eval"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_partoff_safety_eval"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_partoff_safety_eval with op:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_partoff_safety_eval:");
    expect(src).toMatch(/lathe_partoff_safety_eval:\s*z\.object\(\{[\s\S]{0,400}op:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePartoffSafetyRailEngine exports the singleton + evaluate method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePartoffSafetyRailEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePartoffSafetyRailEngine\s*=\s*new LathePartoffSafetyRailEngine\(\)/);
    expect(src).toMatch(/evaluate\(\s*op:\s*PartoffOpSpec\s*\):\s*PartoffSafetyVerdict/);
  });
});

describe("U-LWB05 — lathe_slo_evaluate wiring", () => {
  it("dispatcher case lazy-imports LathePerformanceSLORegistryEngine and calls evaluate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_slo_evaluate"');
    expect(src).toContain("LathePerformanceSLORegistryEngine.js");
    expect(src).toContain("lathePerformanceSLORegistryEngine.evaluate");
  });

  it("case handler validates metric param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_slo_evaluate"[\s\S]{0,800}metric required \(LatheSLOMetric\)/);
    expect(src).toMatch(/case "lathe_slo_evaluate"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_slo_evaluate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_slo_evaluate with metric:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_slo_evaluate:");
    expect(src).toMatch(/lathe_slo_evaluate:\s*z\.object\(\{[\s\S]{0,400}metric:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePerformanceSLORegistryEngine exports the singleton + evaluate method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePerformanceSLORegistryEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePerformanceSLORegistryEngine\s*=\s*new LathePerformanceSLORegistryEngine\(\)/);
    expect(src).toMatch(/evaluate\(\s*metric:\s*LatheSLOMetric\s*\):\s*SLOVerdict/);
  });
});

describe("U-LWB06 — lathe_job_schedule wiring", () => {
  it("dispatcher case lazy-imports LatheJobSchedulingEngine and calls schedule", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_job_schedule"');
    expect(src).toContain("LatheJobSchedulingEngine.js");
    expect(src).toContain("latheJobSchedulingEngine.schedule");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_job_schedule"[\s\S]{0,800}input required \(ScheduleInput\)/);
    expect(src).toMatch(/case "lathe_job_schedule"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_job_schedule"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_job_schedule with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_job_schedule:");
    expect(src).toMatch(/lathe_job_schedule:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheJobSchedulingEngine exports the singleton + schedule method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheJobSchedulingEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/schedule\(\s*input:\s*ScheduleInput\s*\):\s*ScheduleReport/);
  });
});
