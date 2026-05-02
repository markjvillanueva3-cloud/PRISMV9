/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch13:
 *   U-LWB34: lathe_masterpost_explain         → LatheMasterPostDeepReasoningEngine.explainSelection (static, alias)
 *   U-LWB35: lathe_masterpost_ensemble        → LatheMasterPostEnsembleCrossCheckEngine.runEnsemble (static, alias)
 *   U-LWB36: lathe_masterpost_unified_output  → LatheMasterPostUnifiedOutputEngine.generateUnifiedOutput (CLASS export, no singleton const)
 *
 * Notable: LWB36 imports the CLASS DIRECTLY (no `lathe...` singleton const)
 * because LatheMasterPostUnifiedOutputEngine.ts uses `export { ClassName }`
 * rather than `export const x = ClassName`. The dispatcher uses
 * `import { LatheMasterPostUnifiedOutputEngine }` (capitalized) and calls
 * static methods on the class itself.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch13 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_masterpost_explain"');
    expect(src).toContain('"lathe_masterpost_ensemble"');
    expect(src).toContain('"lathe_masterpost_unified_output"');
  });

  it("the LATHE-WIRE-MS0/Batch13 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch13: master post explain + ensemble cross-check + unified output");
  });
});

describe("U-LWB34 — lathe_masterpost_explain wiring (static, alias)", () => {
  it("dispatcher case lazy-imports LatheMasterPostDeepReasoningEngine and calls explainSelection", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_masterpost_explain"');
    expect(src).toContain("LatheMasterPostDeepReasoningEngine.js");
    expect(src).toContain("latheMasterPostDeepReasoningEngine.explainSelection");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_masterpost_explain"[\s\S]{0,800}input required \(DeepReasoningInput\)/);
    expect(src).toMatch(/case "lathe_masterpost_explain"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_masterpost_explain"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_masterpost_explain with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_masterpost_explain:");
    expect(src).toMatch(/lathe_masterpost_explain:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheMasterPostDeepReasoningEngine alias points at class with static explainSelection()", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheMasterPostDeepReasoningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheMasterPostDeepReasoningEngine\s*=\s*LatheMasterPostDeepReasoningEngine/);
    expect(src).toMatch(/static\s+explainSelection\(\s*input:\s*DeepReasoningInput\s*\):\s*DeepReasoningResult/);
  });
});

describe("U-LWB35 — lathe_masterpost_ensemble wiring (static, alias)", () => {
  it("dispatcher case lazy-imports LatheMasterPostEnsembleCrossCheckEngine and calls runEnsemble", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_masterpost_ensemble"');
    expect(src).toContain("LatheMasterPostEnsembleCrossCheckEngine.js");
    expect(src).toContain("latheMasterPostEnsembleCrossCheckEngine.runEnsemble");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_masterpost_ensemble"[\s\S]{0,800}input required \(EnsembleInput\)/);
    expect(src).toMatch(/case "lathe_masterpost_ensemble"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_masterpost_ensemble"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_masterpost_ensemble with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_masterpost_ensemble:");
    expect(src).toMatch(/lathe_masterpost_ensemble:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheMasterPostEnsembleCrossCheckEngine alias points at class with static runEnsemble()", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheMasterPostEnsembleCrossCheckEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheMasterPostEnsembleCrossCheckEngine\s*=\s*LatheMasterPostEnsembleCrossCheckEngine/);
    expect(src).toMatch(/static\s+runEnsemble\(\s*input:\s*EnsembleInput\s*\):\s*EnsembleResult/);
  });
});

describe("U-LWB36 — lathe_masterpost_unified_output wiring (CLASS export, no singleton const)", () => {
  it("dispatcher case imports LatheMasterPostUnifiedOutputEngine CLASS (capitalized) and calls generateUnifiedOutput", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_masterpost_unified_output"');
    expect(src).toContain("LatheMasterPostUnifiedOutputEngine.js");
    // Capital-L import (class itself, not `lathe...` singleton):
    expect(src).toMatch(/import\("\.\.\/\.\.\/engines\/LatheMasterPostUnifiedOutputEngine\.js"\)\s*;[\s\S]{0,300}LatheMasterPostUnifiedOutputEngine\.generateUnifiedOutput/);
  });

  it("case handler validates config AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_masterpost_unified_output"[\s\S]{0,800}config required \(UnifiedHeaderConfig\)/);
    expect(src).toMatch(/case "lathe_masterpost_unified_output"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_masterpost_unified_output"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_masterpost_unified_output with config:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_masterpost_unified_output:");
    expect(src).toMatch(/lathe_masterpost_unified_output:\s*z\.object\(\{[\s\S]{0,500}config:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheMasterPostUnifiedOutputEngine uses NAMED class export (no singleton const)", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheMasterPostUnifiedOutputEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    // Named export (not `export const x = ClassName`):
    expect(src).toMatch(/export\s+\{\s*LatheMasterPostUnifiedOutputEngine\s*\}/);
    expect(src).toMatch(/static\s+generateUnifiedOutput\(/);
    // Confirm there is NO `const lathe...UnifiedOutputEngine` alias:
    expect(src).not.toMatch(/export const latheMasterPostUnifiedOutputEngine/);
  });
});
