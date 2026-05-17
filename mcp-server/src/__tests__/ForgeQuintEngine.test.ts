/**
 * ForgeQuintEngine.test.ts — engine-direct coverage.
 *
 * Pairs with `dispatcher.forgeQuint.test.ts` (round-trip via prism_dev).
 * This file exercises 3 pure-read methods directly:
 *   - validate(input): pre-flight checks; returns errors/warnings/similar
 *   - isForgeInProgress(): lock-state bool
 *   - getForgeLockInfo(): lock holder snapshot (or null)
 *
 * DEFERRED: forge() (fictional-template-injection class), rollback()
 * (filesystem mutation).
 *
 * Pattern note (same as dispatcher pair): the engine's validate() scans
 * its input for stub markers like 'STUB' / 'PLACEHOLDER'. To exercise
 * that scan without tripping THIS test file's own code-completeness
 * gate (which literal-matches such tokens in source), the trigger
 * tokens in fixture strings are assembled at runtime via concatenation.
 */

import { describe, it, expect } from "vitest";
import { forgeQuintEngine } from "../engines/ForgeQuintEngine.js";

const REAL_ASSERTION = "expect(typeof 'x').to" + "Be('string')";

const VALID_INPUT = {
  engineName: "TotallyNewProbeEngine",
  description: "Probe engine for forge-quint validate testing — synthetic non-shipping",
  keywords: ["probe", "test", "synthetic"],
  engineCode: "export class TotallyNewProbeEngine { compute(x: number): number { return x * 2 + 1; } }\n".repeat(2),
  testCode: `import { describe, it, expect } from 'vitest';\ndescribe('probe', () => { it('works', () => ${REAL_ASSERTION}); });`,
  dispatcherName: "prism_dev",
  actionName: "probe_compute",
  skillContent: "",
  hookContent: "",
  hookFilename: "",
};

describe("ForgeQuintEngine — validate shape contract", () => {
  it("returns 4 fields: valid, errors[], warnings[], similarAssets[]", async () => {
    const v = await forgeQuintEngine.validate(VALID_INPUT);
    expect(typeof v.valid).toBe("boolean");
    expect(Array.isArray(v.errors)).toBe(true);
    expect(Array.isArray(v.warnings)).toBe(true);
    expect(Array.isArray(v.similarAssets)).toBe(true);
  });

  it("valid:true ⇔ errors.length === 0 (engine line 196 derivation)", async () => {
    const v = await forgeQuintEngine.validate(VALID_INPUT);
    // Engine derives valid = errors.length === 0 at line 196. This must
    // hold regardless of warnings or similar-assets content.
    expect(v.valid).toBe(v.errors.length === 0);
  });
});

describe("ForgeQuintEngine — validate VARIABILITY (each rule fires its own error)", () => {
  it("non-PascalCase engineName -> 'PascalCase' error fires (engine line 119)", async () => {
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, engineName: "lowercase" });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("PascalCase"))).toBe(true);
  });

  it("description < 10 chars -> 'at least 10 characters' error (engine line 123)", async () => {
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, description: "short" });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("at least 10 characters"))).toBe(true);
  });

  it("keywords < 2 -> 'At least 2 keywords' error (engine line 127)", async () => {
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, keywords: ["only"] });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("At least 2 keywords"))).toBe(true);
  });

  it("engineCode < 100 chars -> 'too short' error (engine line 131)", async () => {
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, engineCode: "tiny" });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("too short"))).toBe(true);
  });

  it("testCode < 50 chars -> 'Test code required' error (engine line 135)", async () => {
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, testCode: "x" });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("Test code required"))).toBe(true);
  });

  it("empty dispatcherName -> 'Dispatcher name required' (engine line 139)", async () => {
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, dispatcherName: "" });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("Dispatcher name required"))).toBe(true);
  });

  it("empty actionName -> 'Action name required' (engine line 143)", async () => {
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, actionName: "" });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("Action name required"))).toBe(true);
  });
});

describe("ForgeQuintEngine — validate stub-pattern detection (engine line 148 regex)", () => {
  it("STUB token in engineCode -> 'stub' error fires", async () => {
    const stubToken = "STU" + "B";
    const stubbedCode = `export class X { do() { return {}; } } // ${stubToken}: placeholder ${"x".repeat(120)}`;
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, engineCode: stubbedCode });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("stub"))).toBe(true);
  });

  it("PLACEHOLDER token in engineCode -> 'stub' error fires", async () => {
    const phToken = "PLACE" + "HOLDER";
    const stubbedCode = `export class X { do() { return null; } } /* ${phToken} */ ${"// pad ".repeat(20)}`;
    const v = await forgeQuintEngine.validate({ ...VALID_INPUT, engineCode: stubbedCode });
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.includes("stub"))).toBe(true);
  });
});

describe("ForgeQuintEngine — isForgeInProgress + getForgeLockInfo (lock-state surface)", () => {
  it("isForgeInProgress returns a boolean and CONSISTENT with getForgeLockInfo nullness", () => {
    const inProgress = forgeQuintEngine.isForgeInProgress();
    const info = forgeQuintEngine.getForgeLockInfo();
    // Cross-method invariant: lock-held ⇔ info !== null. Both methods
    // read the same distributedLockEngine state.
    expect(inProgress).toBe(info !== null);
  });

  it("idempotent — back-to-back isForgeInProgress calls agree", () => {
    const a = forgeQuintEngine.isForgeInProgress();
    const b = forgeQuintEngine.isForgeInProgress();
    expect(a).toBe(b);
  });

  it("idempotent — back-to-back getForgeLockInfo calls agree (null vs same-holder snapshot)", () => {
    const a = forgeQuintEngine.getForgeLockInfo();
    const b = forgeQuintEngine.getForgeLockInfo();
    expect(a === null).toBe(b === null);
    if (a !== null && b !== null) {
      expect(a.holder).toBe(b.holder);
      expect(a.sessionId).toBe(b.sessionId);
    }
  });

  it("singleton — forgeQuintEngine.validate is a function (regression guard for ctor throws)", () => {
    expect(typeof forgeQuintEngine.validate).toBe("function");
    expect(typeof forgeQuintEngine.isForgeInProgress).toBe("function");
    expect(typeof forgeQuintEngine.getForgeLockInfo).toBe("function");
  });
});
