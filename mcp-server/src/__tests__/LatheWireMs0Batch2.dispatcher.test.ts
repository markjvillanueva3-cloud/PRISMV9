/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch2:
 *   U-LWB01: lathe_safety_signals    → LatheSafetySignalEngine.compute
 *   U-LWB02: lathe_multi_op_plan     → LatheMultiOpPlannerEngine.plan
 *   U-LWB03: lathe_sequence_optimize → LatheSequenceOptimizerEngine.optimize
 *
 * Same text-grep pattern as Batch1 (LatheWireMs0.dispatcher.test.ts).
 * Runtime engine-behavior tests deferred to post-merge when zod lands.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch2 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_safety_signals"');
    expect(src).toContain('"lathe_multi_op_plan"');
    expect(src).toContain('"lathe_sequence_optimize"');
  });

  it("the LATHE-WIRE-MS0/Batch2 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch2: safety signals + multi-op planning + sequence optimization");
  });
});

describe("U-LWB01 — lathe_safety_signals wiring", () => {
  it("dispatcher case lazy-imports LatheSafetySignalEngine and calls compute", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_safety_signals"');
    expect(src).toContain("LatheSafetySignalEngine.js");
    expect(src).toContain("latheSafetySignalEngine.compute");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_safety_signals"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_safety_signals"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_safety_signals with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_safety_signals:");
    expect(src).toMatch(/lathe_safety_signals:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: LatheSafetySignalEngine exports the singleton + compute method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheSafetySignalEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheSafetySignalEngine\s*=\s*new LatheSafetySignalEngine\(\)/);
    expect(src).toMatch(/compute\(\s*input:\s*SafetySignalInput\s*\):\s*LatheSafetySignals/);
  });
});

describe("U-LWB02 — lathe_multi_op_plan wiring", () => {
  it("dispatcher case lazy-imports LatheMultiOpPlannerEngine and calls plan", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_multi_op_plan"');
    expect(src).toContain("LatheMultiOpPlannerEngine.js");
    expect(src).toContain("latheMultiOpPlannerEngine.plan");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_multi_op_plan"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_multi_op_plan"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_multi_op_plan with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_multi_op_plan:");
    expect(src).toMatch(/lathe_multi_op_plan:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: LatheMultiOpPlannerEngine exports the singleton + plan method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheMultiOpPlannerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheMultiOpPlannerEngine\s*=\s*new LatheMultiOpPlannerEngine\(\)/);
    expect(src).toMatch(/plan\(\s*input:\s*MultiOpInput\s*\):\s*MultiOpResult/);
  });
});

describe("U-LWB03 — lathe_sequence_optimize wiring", () => {
  it("dispatcher case lazy-imports LatheSequenceOptimizerEngine and calls optimize", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_sequence_optimize"');
    expect(src).toContain("LatheSequenceOptimizerEngine.js");
    expect(src).toContain("latheSequenceOptimizerEngine.optimize");
  });

  it("case handler validates operations array AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_sequence_optimize"[\s\S]{0,800}operations array required/);
    expect(src).toMatch(/case "lathe_sequence_optimize"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_sequence_optimize"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("case handler passes BOTH operations AND constraints to engine.optimize", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    // The 2-arg signature is the unique part of this case (vs single-arg cases above).
    expect(src).toMatch(/latheSequenceOptimizerEngine\.optimize\([\s\S]{0,400}constraints/);
  });

  it("schema map exposes lathe_sequence_optimize with operations:array(≥1) + optional constraints", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_sequence_optimize:");
    expect(src).toMatch(/lathe_sequence_optimize:\s*z\.object\(\{[\s\S]{0,400}operations:\s*z\.array\(z\.unknown\(\)\)\.min\(1\)/);
    expect(src).toMatch(/lathe_sequence_optimize:\s*z\.object\(\{[\s\S]{0,500}constraints:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });

  it("engine source: LatheSequenceOptimizerEngine exports the singleton + optimize method (2-arg)", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheSequenceOptimizerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheSequenceOptimizerEngine\s*=\s*new LatheSequenceOptimizerEngine\(\)/);
    expect(src).toMatch(/optimize\(\s*operations:\s*SequenceOperation\[\]\s*,\s*constraints[\s\S]{0,80}\):\s*SequenceResult/);
  });
});
