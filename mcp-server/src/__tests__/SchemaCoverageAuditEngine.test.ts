/**
 * SchemaCoverageAuditEngine tests — P8-U05.
 * Real-data integration: runs against the live mcp-server/src/schemas/ tree.
 */
import { describe, it, expect } from "vitest";
import { schemaCoverageAuditEngine } from "../engines/SchemaCoverageAuditEngine.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve PRISM root from this test file's URL — same pattern as the engine so
// cwd at test invocation time does not matter (vitest may run from mcp-server/).
const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..", "..", "..");
const OUT_PATH = path.join(PROJECT_ROOT, "state", "shared", "specs", "SCHEMA-COVERAGE-AUDIT.json");

describe("SchemaCoverageAuditEngine", () => {
  it("audits the live schemas directory and finds real files", () => {
    const result = schemaCoverageAuditEngine.audit();
    expect(result).toBeTruthy();
    expect(result.totalFiles).toBeGreaterThan(50);
    expect(result.totalSchemaCount).toBeGreaterThan(100);
  });

  it("counts z.any() instances against the live tree (matches grep baseline)", () => {
    const result = schemaCoverageAuditEngine.audit();
    // Baseline observed 2026-05-17: 183 z.any() across 277 schema files.
    // Regression guard: count should stay in a sensible range, not drop to 0
    // (which would indicate the regex broke) or balloon (which means refactor regression).
    expect(result.totalZAny).toBeGreaterThan(50);
    expect(result.totalZAny).toBeLessThan(500);
    expect(result.filesWithZAny).toBeGreaterThan(5);
    expect(result.filesWithZAny).toBeLessThan(result.totalFiles);
  });

  it("computes coverage ratios as finite numbers", () => {
    const result = schemaCoverageAuditEngine.audit();
    expect(Number.isFinite(result.coverage.describePerSchema)).toBe(true);
    expect(Number.isFinite(result.coverage.zAnyPerSchema)).toBe(true);
    expect(result.coverage.zAnyEliminationTarget).toBe(result.totalZAny);
  });

  it("ranks topZAnyFiles by zAnyCount descending", () => {
    const result = schemaCoverageAuditEngine.audit();
    if (result.topZAnyFiles.length >= 2) {
      for (let i = 1; i < result.topZAnyFiles.length; i++) {
        expect(result.topZAnyFiles[i - 1].zAnyCount).toBeGreaterThanOrEqual(result.topZAnyFiles[i].zAnyCount);
      }
    }
    expect(result.topZAnyFiles.length).toBeLessThanOrEqual(20);
  });

  it("persists output to state/shared/specs/SCHEMA-COVERAGE-AUDIT.json", () => {
    schemaCoverageAuditEngine.audit();
    expect(fs.existsSync(OUT_PATH)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
    expect(parsed.totalFiles).toBeGreaterThan(50);
    expect(typeof parsed.generated_at).toBe("string");
  });

  it("read() returns the persisted result", () => {
    schemaCoverageAuditEngine.audit();
    const cached = schemaCoverageAuditEngine.read();
    expect(cached).not.toBeNull();
    expect(cached!.totalFiles).toBeGreaterThan(50);
  });

  it("summary() returns a non-trivial multiline report", () => {
    schemaCoverageAuditEngine.audit();
    const s = schemaCoverageAuditEngine.summary();
    expect(s).toContain("Schema Coverage Audit");
    expect(s).toContain("z.any() instances");
    expect(s.split("\n").length).toBeGreaterThan(5);
  });
});
