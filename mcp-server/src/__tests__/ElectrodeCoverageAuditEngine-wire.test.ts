/**
 * ElectrodeCoverageAuditEngine-wire.test.ts
 *
 * Wiring coverage for TRAINING-LEARNING-MS0/U3.
 *
 * Verifies that camDispatcher properly registers + routes the three
 * `electrode_*` actions to ElectrodeCoverageAuditEngine. Engine-direct
 * test coverage lives in ElectrodeCoverageAuditEngine.test.ts; here we
 * cover the wiring contract:
 *
 *   1. ACTIONS enum includes all 3 electrode_* actions
 *   2. camDispatcher.ts has a `case "..."` block for each action
 *   3. Each case-handler lazy-imports ElectrodeCoverageAuditEngine
 *   4. The singleton exposes the 3 methods the case-handlers call
 *   5. Singleton class name is ElectrodeCoverageAuditEngine
 *
 * No round-trip handler call is exercised here — the engine-direct test
 * already covers the happy + error paths. This file locks the wiring
 * surface so a future rename / drop of the actions is caught by CI.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import {
  electrodeCoverageAuditEngine,
  ElectrodeCoverageAuditEngine,
} from "../engines/ElectrodeCoverageAuditEngine.js";

const CAM_DISPATCHER_SRC = path.resolve(
  __dirname,
  "../tools/dispatchers/camDispatcher.ts",
);

const EXPECTED_ELECTRODE_ACTIONS = [
  "electrode_corpus_scan",
  "electrode_xlsm_fingerprint",
  "electrode_coverage_audit",
] as const;

describe("camDispatcher ACTIONS enum — electrode_* registered", () => {
  it.each(EXPECTED_ELECTRODE_ACTIONS)("ACTIONS includes %s", (action) => {
    expect((ACTIONS as ReadonlyArray<string>).includes(action)).toBe(true);
  });

  it("camDispatcher.ts source has a case-handler for each electrode_* action", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    for (const action of EXPECTED_ELECTRODE_ACTIONS) {
      expect(src.includes(`case "${action}":`)).toBe(true);
    }
  });

  it("camDispatcher.ts case-handlers all lazy-import ElectrodeCoverageAuditEngine", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    const importStmt = `await import("../../engines/ElectrodeCoverageAuditEngine.js")`;
    const matches = src.split(importStmt).length - 1;
    // 3 case-handlers × 1 lazy-import each
    expect(matches).toBe(3);
  });
});

describe("ElectrodeCoverageAuditEngine — singleton + method surface", () => {
  it("singleton exposes the 3 methods camDispatcher case-handlers call", () => {
    const m = electrodeCoverageAuditEngine as unknown as Record<string, unknown>;
    expect(typeof m.scanCorpus).toBe("function");
    expect(typeof m.xlsmFingerprint).toBe("function");
    expect(typeof m.report).toBe("function");
  });

  it("singleton class name is ElectrodeCoverageAuditEngine", () => {
    expect(electrodeCoverageAuditEngine.constructor.name).toBe(
      "ElectrodeCoverageAuditEngine",
    );
  });

  it("instanceof ElectrodeCoverageAuditEngine", () => {
    expect(electrodeCoverageAuditEngine).toBeInstanceOf(
      ElectrodeCoverageAuditEngine,
    );
  });
});

describe("camDispatcher — action ordering + bridging convention", () => {
  it("each electrode_* case bridges data.ok → dispatcher success", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    // Each case must contain `data.ok` somewhere in the block + the
    // success/false branch. We anchor on the case start + closing brace.
    for (const action of EXPECTED_ELECTRODE_ACTIONS) {
      const caseIdx = src.indexOf(`case "${action}":`);
      expect(caseIdx).toBeGreaterThan(-1);
      // Find the next `break;` after the case start.
      const breakIdx = src.indexOf("break;", caseIdx);
      expect(breakIdx).toBeGreaterThan(caseIdx);
      const block = src.slice(caseIdx, breakIdx);
      expect(block.includes("data.ok")).toBe(true);
      expect(block.includes("success: true")).toBe(true);
      expect(block.includes("success: false")).toBe(true);
    }
  });

  it("each electrode_* case accepts snake_case AND camelCase param keys", () => {
    const src = fs.readFileSync(CAM_DISPATCHER_SRC, "utf8");
    // electrode_corpus_scan: corpusRoot / corpus_root, maxDepth / max_depth, presetSnapshot / preset_snapshot
    const scanIdx = src.indexOf(`case "electrode_corpus_scan":`);
    const scanBreak = src.indexOf("break;", scanIdx);
    const scanBlock = src.slice(scanIdx, scanBreak);
    expect(scanBlock.includes("corpusRoot")).toBe(true);
    expect(scanBlock.includes("corpus_root")).toBe(true);
    expect(scanBlock.includes("maxDepth")).toBe(true);
    expect(scanBlock.includes("max_depth")).toBe(true);

    // electrode_xlsm_fingerprint: xlsmPath / xlsm_path
    const fpIdx = src.indexOf(`case "electrode_xlsm_fingerprint":`);
    const fpBreak = src.indexOf("break;", fpIdx);
    const fpBlock = src.slice(fpIdx, fpBreak);
    expect(fpBlock.includes("xlsmPath")).toBe(true);
    expect(fpBlock.includes("xlsm_path")).toBe(true);

    // electrode_coverage_audit: baselineOverride / baseline_override
    const auditIdx = src.indexOf(`case "electrode_coverage_audit":`);
    const auditBreak = src.indexOf("break;", auditIdx);
    const auditBlock = src.slice(auditIdx, auditBreak);
    expect(auditBlock.includes("baselineOverride")).toBe(true);
    expect(auditBlock.includes("baseline_override")).toBe(true);
  });
});
