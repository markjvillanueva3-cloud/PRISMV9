/**
 * MillPatternMinerEngine.mineJMDiePrograms -- ESM require()-fix regression (slot:oscar, 2026-06-21).
 *
 * mineJMDiePrograms used inline CommonJS `require("fs")` / `require("./HaasParserEngine.js")` etc.
 * inside an ESM codebase -> `ReferenceError: require is not defined` was thrown for EVERY program
 * (swallowed by the per-program try/catch) -> 0 tools / 0 chip-load samples. The path was 100%
 * dead under ESM/tsx (reference_oscar_mill_proven_path_broken_2026_06_21). The fix converts the 4
 * require() calls to top-of-file static ESM imports.
 *
 * This test FAILS if require() ever returns: a thrown require error is caught internally and leaves
 * total_tools / total_programs unincremented past the parse, so asserting the parser actually ran
 * (total_tools >= 1 on a real Haas program) is the regression oracle.
 */
import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { millPatternMinerEngine } from "../engines/MillPatternMinerEngine.js";

// Minimal but realistic Haas (haas_ngc) program: 2 tool changes + speeds/feeds + a drill cycle.
const HAAS_PROGRAM = `%
O01234 (REQUIRE FIX REGRESSION)
T1 M06
S1200 M03
G00 G54 X0. Y0.
G43 H01 Z1.
G81 Z-0.5 R0.1 F4.0
G80
T2 M06
S2400 M03
G43 H02 Z1.
G01 Z-0.25 F12.0
G00 Z1.
M05
M30
%
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mill-req-fix-"));
const tmpFile = path.join(tmpDir, "regression.nc");
fs.writeFileSync(tmpFile, HAAS_PROGRAM);

afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe("mineJMDiePrograms ESM require()-fix regression", () => {
  const entries = [{
    filePath: tmpFile, programType: "mill", controller: "haas_ngc",
    customer: "regression", topFolder: "tmp",
  }];

  it("runs the Haas parser without a require error (the path was 100% dead under ESM pre-fix)", () => {
    const res = millPatternMinerEngine.mineJMDiePrograms(entries as never);
    // total_programs counts every mill entry attempted (always 1 here)...
    expect(res.total_programs).toBe(1);
    // ...but total_tools only increments AFTER the parser runs -- which require() prevented pre-fix.
    // 2 tool changes (T1, T2) -> >=2 tool sections. A returning require() bug -> 0 (test fails).
    expect(res.total_tools).toBeGreaterThanOrEqual(2);
  });

  it("extracts at least one chip-load sample (speeds/feeds reached the extractor)", () => {
    const res = millPatternMinerEngine.mineJMDiePrograms(entries as never);
    expect(Array.isArray(res.chip_load_samples)).toBe(true);
    expect(res.chip_load_samples.length).toBeGreaterThanOrEqual(1);
    // the S1200/F4.0 program must surface a real rpm on a sample (not all-null)
    expect(res.chip_load_samples.some((s) => typeof s.rpm === "number" && s.rpm > 0)).toBe(true);
  });

  it("filters non-mill entries out (programType gate)", () => {
    const res = millPatternMinerEngine.mineJMDiePrograms([
      { filePath: tmpFile, programType: "lathe", controller: "haas_ngc", customer: "x", topFolder: "t" },
    ] as never);
    expect(res.total_programs).toBe(0); // lathe entry skipped by the mill filter
  });
});
