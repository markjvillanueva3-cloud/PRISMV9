/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch26:
 *   U-WWB73: wedm_autonomy_audit_recent          → WEDMAutonomyAuditEngine.recent + stats
 *   U-WWB74: wedm_benchmark_tolerance_classify   → WEDMBenchmarkToleranceEngine.classify + getBand
 *   U-WWB75: wedm_slug_tab_calc                  → WEDMSlugTabRetentionEngine.calculate
 *
 * Three previously-unwired WEDM audit/benchmark/geometry engines:
 *   - Autonomy audit: returns recent audit entries + aggregate stats
 *   - Benchmark tolerance: classifies a deviation_pct against a benchmark band
 *   - Slug tab retention: computes slug-retention tab geometry from profile input
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch26 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_autonomy_audit_recent"');
    expect(src).toContain('"wedm_benchmark_tolerance_classify"');
    expect(src).toContain('"wedm_slug_tab_calc"');
  });

  it("the WEDM-WIRE-MS0/Batch26 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch26: autonomy audit + benchmark tolerance + slug tab");
  });
});

describe("U-WWB73 — wedm_autonomy_audit_recent wiring", () => {
  it("dispatcher case lazy-imports WEDMAutonomyAuditEngine and returns recent + stats", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_autonomy_audit_recent"');
    expect(src).toContain("WEDMAutonomyAuditEngine.js");
    expect(src).toContain("wedmAutonomyAuditEngine.recent");
    expect(src).toMatch(/case "wedm_autonomy_audit_recent"[\s\S]{0,1500}wedmAutonomyAuditEngine\.stats/);
  });

  it("case defaults limit=100 when missing AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_autonomy_audit_recent"[\s\S]{0,1500}input\.limit[\s\S]{0,200}\?\s*input\.limit\s*:\s*100/);
    expect(src).toMatch(/case "wedm_autonomy_audit_recent"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_autonomy_audit_recent with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_autonomy_audit_recent:");
    expect(src).toMatch(/wedm_autonomy_audit_recent:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMAutonomyAuditEngine exports the singleton + recent method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMAutonomyAuditEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmAutonomyAuditEngine\s*=\s*new WEDMAutonomyAuditEngine\(\)/);
    expect(src).toMatch(/recent\(\s*limit\s*=\s*100\s*\):\s*AutonomyAuditEntry\[\]/);
  });
});

describe("U-WWB74 — wedm_benchmark_tolerance_classify wiring", () => {
  it("dispatcher case lazy-imports WEDMBenchmarkToleranceEngine and calls classify + getBand", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_benchmark_tolerance_classify"');
    expect(src).toContain("WEDMBenchmarkToleranceEngine.js");
    expect(src).toContain("wedmBenchmarkToleranceEngine.classify");
    expect(src).toMatch(/case "wedm_benchmark_tolerance_classify"[\s\S]{0,1500}wedmBenchmarkToleranceEngine\.getBand/);
  });

  it("case validates input.deviation_pct (number) AND input.key (string) AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_benchmark_tolerance_classify"[\s\S]{0,2000}input\.deviation_pct \(number\) and input\.key \(BenchmarkKey string\) required/);
    expect(src).toMatch(/case "wedm_benchmark_tolerance_classify"[\s\S]{0,2000}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_benchmark_tolerance_classify with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_benchmark_tolerance_classify:");
    expect(src).toMatch(/wedm_benchmark_tolerance_classify:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMBenchmarkToleranceEngine exports the singleton + classify method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMBenchmarkToleranceEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmBenchmarkToleranceEngine\s*=\s*new WEDMBenchmarkToleranceEngine\(\)/);
    expect(src).toMatch(/classify\(\s*deviation_pct:\s*number,\s*key:\s*BenchmarkKey\s*\):\s*ToleranceClass/);
  });
});

describe("U-WWB75 — wedm_slug_tab_calc wiring", () => {
  it("dispatcher case lazy-imports WEDMSlugTabRetentionEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_slug_tab_calc"');
    expect(src).toContain("WEDMSlugTabRetentionEngine.js");
    expect(src).toContain("wedmSlugTabRetentionEngine.calculate");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_slug_tab_calc"[\s\S]{0,800}input required \(WEDMSlugTabRetentionInput\)/);
    expect(src).toMatch(/case "wedm_slug_tab_calc"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_slug_tab_calc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_slug_tab_calc:");
    expect(src).toMatch(/wedm_slug_tab_calc:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMSlugTabRetentionEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMSlugTabRetentionEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmSlugTabRetentionEngine\s*=\s*new WEDMSlugTabRetentionEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*WEDMSlugTabRetentionInput\s*\):\s*WEDMSlugTabRetentionResult/);
  });
});
