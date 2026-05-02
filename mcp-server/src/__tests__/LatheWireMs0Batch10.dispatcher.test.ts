/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch10:
 *   U-LWB25: lathe_ai_optimize_sequence  → LatheAIReasoningEngine.optimizeSequence (operations[])
 *   U-LWB26: lathe_auto_quote             → LatheAutoQuoteFromPrintEngine.generateQuote
 *   U-LWB27: lathe_orchestrate            → LatheOrchestrationEngine.calculate (action + input)
 *
 * LWB27 is unique: the engine takes (action_tag, input) — case body
 * defaults action_tag to "default" when caller omits it.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch10 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_ai_optimize_sequence"');
    expect(src).toContain('"lathe_auto_quote"');
    expect(src).toContain('"lathe_orchestrate"');
  });

  it("the LATHE-WIRE-MS0/Batch10 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch10: AI sequence + auto quote + orchestration pipeline");
  });
});

describe("U-LWB25 — lathe_ai_optimize_sequence wiring (operations array)", () => {
  it("dispatcher case lazy-imports LatheAIReasoningEngine and calls optimizeSequence", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_ai_optimize_sequence"');
    expect(src).toContain("LatheAIReasoningEngine.js");
    expect(src).toContain("latheAIReasoningEngine.optimizeSequence");
  });

  it("case handler validates operations array AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_ai_optimize_sequence"[\s\S]{0,1000}operations array required/);
    expect(src).toMatch(/case "lathe_ai_optimize_sequence"[\s\S]{0,1000}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_ai_optimize_sequence"[\s\S]{0,1000}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_ai_optimize_sequence with operations:array(≥1)", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_ai_optimize_sequence:");
    expect(src).toMatch(/lathe_ai_optimize_sequence:\s*z\.object\(\{[\s\S]{0,500}operations:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)\.min\(1\)/);
  });

  it("engine source: LatheAIReasoningEngine exports the singleton + optimizeSequence method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheAIReasoningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheAIReasoningEngine\s*=\s*new LatheAIReasoningEngine\(\)/);
    expect(src).toMatch(/optimizeSequence\(/);
  });
});

describe("U-LWB26 — lathe_auto_quote wiring", () => {
  it("dispatcher case lazy-imports LatheAutoQuoteFromPrintEngine and calls generateQuote", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_auto_quote"');
    expect(src).toContain("LatheAutoQuoteFromPrintEngine.js");
    expect(src).toContain("latheAutoQuoteFromPrintEngine.generateQuote");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_auto_quote"[\s\S]{0,800}input required \(AutoQuoteInput\)/);
    expect(src).toMatch(/case "lathe_auto_quote"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_auto_quote"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_auto_quote with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_auto_quote:");
    expect(src).toMatch(/lathe_auto_quote:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheAutoQuoteFromPrintEngine exports the singleton + generateQuote method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheAutoQuoteFromPrintEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheAutoQuoteFromPrintEngine\s*=\s*new LatheAutoQuoteFromPrintEngine\(\)/);
    expect(src).toMatch(/generateQuote\(\s*input:\s*AutoQuoteInput\s*\):\s*QuotePackage/);
  });
});

describe("U-LWB27 — lathe_orchestrate wiring (action + input)", () => {
  it("dispatcher case lazy-imports LatheOrchestrationEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_orchestrate"');
    expect(src).toContain("LatheOrchestrationEngine.js");
    expect(src).toContain("latheOrchestrationEngine.calculate");
  });

  it("case handler validates input AND defaults action tag AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_orchestrate"[\s\S]{0,1500}input required \(LatheOrchestrationInput\)/);
    expect(src).toMatch(/case "lathe_orchestrate"[\s\S]{0,1500}orch_action/);
    expect(src).toMatch(/case "lathe_orchestrate"[\s\S]{0,1500}"default"/);
    expect(src).toMatch(/case "lathe_orchestrate"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_orchestrate with input + optional orch_action", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_orchestrate:");
    expect(src).toMatch(/lathe_orchestrate:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_orchestrate:\s*z\.object\(\{[\s\S]{0,800}orch_action:\s*z\.string\(\)\.optional/);
  });

  it("engine source: LatheOrchestrationEngine exports the singleton + calculate(action, input) method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheOrchestrationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheOrchestrationEngine\s*=\s*new LatheOrchestrationEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*_action:\s*string\s*,\s*input:\s*LatheOrchestrationInput/);
  });
});
