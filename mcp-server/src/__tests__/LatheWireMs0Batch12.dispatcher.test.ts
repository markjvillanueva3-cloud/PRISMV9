/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch12:
 *   U-LWB31: lathe_workholding_jaw_select   → LatheWorkholdingEngine.selectJaw
 *   U-LWB32: lathe_safety_predicate_verify  → LatheSafetyPredicateEngine.verify (2-arg with optional envelope)
 *   U-LWB33: lathe_proof_carrying_emit      → LatheProofCarryingEmitEngine.emit
 *
 * Three independent safety-track entry points: jaw selection (workholding
 * adequacy), runtime safety-signal verification (predicate gate before
 * emit), and proof-carrying G-code emission (audit-trail for the safety
 * record that backs the emitted program).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch12 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_workholding_jaw_select"');
    expect(src).toContain('"lathe_safety_predicate_verify"');
    expect(src).toContain('"lathe_proof_carrying_emit"');
  });

  it("the LATHE-WIRE-MS0/Batch12 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch12: workholding jaw + safety predicate verify + proof-carrying emit");
  });
});

describe("U-LWB31 — lathe_workholding_jaw_select wiring", () => {
  it("dispatcher case lazy-imports LatheWorkholdingEngine and calls selectJaw", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_workholding_jaw_select"');
    expect(src).toContain("LatheWorkholdingEngine.js");
    expect(src).toContain("latheWorkholdingEngine.selectJaw");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_workholding_jaw_select"[\s\S]{0,800}input required \(JawSelectionInput\)/);
    expect(src).toMatch(/case "lathe_workholding_jaw_select"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_workholding_jaw_select"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_workholding_jaw_select with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_workholding_jaw_select:");
    expect(src).toMatch(/lathe_workholding_jaw_select:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheWorkholdingEngine exports the singleton + selectJaw method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheWorkholdingEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheWorkholdingEngine\s*=\s*new LatheWorkholdingEngine\(\)/);
    expect(src).toMatch(/selectJaw\(\s*input:\s*JawSelectionInput\s*\):\s*JawSelectionResult/);
  });
});

describe("U-LWB32 — lathe_safety_predicate_verify wiring (2-arg with optional envelope)", () => {
  it("dispatcher case lazy-imports LatheSafetyPredicateEngine and calls verify", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_safety_predicate_verify"');
    expect(src).toContain("LatheSafetyPredicateEngine.js");
    expect(src).toContain("latheSafetyPredicateEngine.verify");
  });

  it("case handler validates signals + forwards optional envelope + wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_safety_predicate_verify"[\s\S]{0,1200}signals required \(LatheSafetySignals\)/);
    expect(src).toMatch(/case "lathe_safety_predicate_verify"[\s\S]{0,1200}envelope/);
    expect(src).toMatch(/case "lathe_safety_predicate_verify"[\s\S]{0,1200}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_safety_predicate_verify with signals:record + optional envelope:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_safety_predicate_verify:");
    expect(src).toMatch(/lathe_safety_predicate_verify:\s*z\.object\(\{[\s\S]{0,500}signals:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_safety_predicate_verify:\s*z\.object\(\{[\s\S]{0,800}envelope:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });

  it("engine source: LatheSafetyPredicateEngine exports the singleton + verify(signals, envelope?) method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheSafetyPredicateEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheSafetyPredicateEngine\s*=\s*new LatheSafetyPredicateEngine\(\)/);
    expect(src).toMatch(/verify\(\s*signals:\s*LatheSafetySignals\s*,\s*envelope\?:/);
  });
});

describe("U-LWB33 — lathe_proof_carrying_emit wiring", () => {
  it("dispatcher case lazy-imports LatheProofCarryingEmitEngine and calls emit", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_proof_carrying_emit"');
    expect(src).toContain("LatheProofCarryingEmitEngine.js");
    expect(src).toContain("latheProofCarryingEmitEngine.emit");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_proof_carrying_emit"[\s\S]{0,800}input required \(ProofEmitInput\)/);
    expect(src).toMatch(/case "lathe_proof_carrying_emit"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_proof_carrying_emit"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_proof_carrying_emit with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_proof_carrying_emit:");
    expect(src).toMatch(/lathe_proof_carrying_emit:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheProofCarryingEmitEngine exports the singleton + emit method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheProofCarryingEmitEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheProofCarryingEmitEngine\s*=\s*new LatheProofCarryingEmitEngine\(\)/);
    expect(src).toMatch(/emit\(\s*input:\s*ProofEmitInput\s*\):\s*ProofCarryingEmitResult/);
  });
});
