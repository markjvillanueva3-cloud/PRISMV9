/**
 * Tests for SchemaQualityAuditEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P8-U05.
 *
 * Builds a synthetic schema/dispatcher fixture in a temp directory, runs the
 * engine against it, and asserts on the report shape: z.any() detection,
 * .describe() coverage math, drift heuristic, healthy/blocked summary.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SchemaQualityAuditEngine } from "../engines/SchemaQualityAuditEngine.js";

let tmpRoot: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "schema-quality-audit-"));
  const schemasDir = join(tmpRoot, "mcp-server", "src", "schemas");
  const toolsSchemasDir = join(tmpRoot, "mcp-server", "src", "tools", "schemas");
  const dispatchersDir = join(tmpRoot, "mcp-server", "src", "tools", "dispatchers");
  mkdirSync(schemasDir, { recursive: true });
  mkdirSync(toolsSchemasDir, { recursive: true });
  mkdirSync(dispatchersDir, { recursive: true });

  // Schema A: clean (referenced by fooDispatcher), 3 fields, 2 with describe.
  writeFileSync(
    join(schemasDir, "fooActionSchemas.ts"),
    [
      "import { z } from 'zod';",
      "export const ACTION_FOO_SCHEMAS = {",
      "  list: z.object({",
      "    id: z.string().describe('Stable id'),",
      "    name: z.string().describe('Display name'),",
      "    count: z.number().int().positive(),",
      "  }).passthrough(),",
      "};",
      "",
    ].join("\n"),
  );

  // Schema B: has 2 z.any() + 1 plain field. Referenced by barDispatcher.
  writeFileSync(
    join(schemasDir, "barActionSchemas.ts"),
    [
      "import { z } from 'zod';",
      "export const ACTION_BAR_SCHEMAS = {",
      "  noisy: z.object({",
      "    blob: z.any(),",
      "    other: z.any().optional(),",
      "    raw: z.string(),",
      "  }).passthrough(),",
      "};",
      "",
    ].join("\n"),
  );

  // Schema C: orphan — no dispatcher imports it.
  writeFileSync(
    join(schemasDir, "orphanActionSchemas.ts"),
    [
      "import { z } from 'zod';",
      "export const ACTION_ORPHAN_SCHEMAS = {",
      "  any: z.object({ x: z.string() }).passthrough(),",
      "};",
      "",
    ].join("\n"),
  );

  // Dispatcher A: imports fooActionSchemas only.
  writeFileSync(
    join(dispatchersDir, "fooDispatcher.ts"),
    [
      "import { ACTION_FOO_SCHEMAS } from '../../schemas/fooActionSchemas.js';",
      "// no-op",
      "",
    ].join("\n"),
  );

  // Dispatcher B: imports barActionSchemas only.
  writeFileSync(
    join(dispatchersDir, "barDispatcher.ts"),
    [
      "import { ACTION_BAR_SCHEMAS } from '../../schemas/barActionSchemas.js';",
      "// no-op",
      "",
    ].join("\n"),
  );

  // Dispatcher C: no matching schema file (bazActionSchemas.ts doesn't exist).
  writeFileSync(
    join(dispatchersDir, "bazDispatcher.ts"),
    [
      "// dispatcher with no matching schema",
      "",
    ].join("\n"),
  );
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("SchemaQualityAuditEngine", () => {
  it("flags exactly the 2 z.any() residues in barActionSchemas.ts", () => {
    const engine = new SchemaQualityAuditEngine();
    const report = engine.audit(tmpRoot);
    expect(report.z_any.total).toBe(2);
    expect(report.z_any.by_file.length).toBe(1);
    expect(report.z_any.by_file[0].file).toMatch(/barActionSchemas\.ts$/);
    expect(report.z_any.by_file[0].count).toBe(2);
  });

  it("counts describe coverage correctly across all schema files", () => {
    const engine = new SchemaQualityAuditEngine();
    const report = engine.audit(tmpRoot);
    // Outer keys (list, noisy, any) ARE field declarations matching the pattern:
    //   foo: list (z.object → skipped), id+name (with describe), count (fixable)
    //        = 4 total, 2 described, 1 fixable, 1 skipped
    //   bar: noisy (z.object → skipped), blob (z.any → skipped), other (z.any → skipped),
    //        raw (fixable)
    //        = 4 total, 0 described, 1 fixable, 3 skipped
    //   orphan: any (z.object → skipped)
    //        = 1 total, 0 described, 0 fixable, 1 skipped
    // Aggregate: 9 / 2 / 2 / 5 (invariant: 9 = 2+2+5).
    expect(report.describe_coverage.total_fields).toBe(9);
    expect(report.describe_coverage.with_describe).toBe(2);
    expect(report.describe_coverage.fixable_candidates).toBe(2);
    expect(report.describe_coverage.skipped_multiline_or_object).toBe(5);
    expect(
      report.describe_coverage.with_describe +
      report.describe_coverage.fixable_candidates +
      report.describe_coverage.skipped_multiline_or_object,
    ).toBe(report.describe_coverage.total_fields);
    // 2/9 ≈ 22.2%
    expect(report.describe_coverage.coverage_pct).toBeCloseTo(22.2, 1);
  });

  it("identifies orphanActionSchemas.ts as orphaned and lists it", () => {
    const engine = new SchemaQualityAuditEngine();
    const report = engine.audit(tmpRoot);
    expect(report.drift.orphan_schemas.some(p => p.endsWith("orphanActionSchemas.ts"))).toBe(true);
    expect(report.drift.orphan_schemas.some(p => p.endsWith("fooActionSchemas.ts"))).toBe(false);
    expect(report.drift.orphan_schemas.some(p => p.endsWith("barActionSchemas.ts"))).toBe(false);
  });

  it("identifies bazDispatcher.ts as a dispatcher without schema", () => {
    const engine = new SchemaQualityAuditEngine();
    const report = engine.audit(tmpRoot);
    expect(report.drift.dispatchers_without_schema.some(p => p.endsWith("bazDispatcher.ts"))).toBe(true);
    expect(report.drift.dispatchers_without_schema.some(p => p.endsWith("fooDispatcher.ts"))).toBe(false);
    expect(report.drift.dispatchers_without_schema.some(p => p.endsWith("barDispatcher.ts"))).toBe(false);
  });

  it("marks the report unhealthy when blockers exist", () => {
    const engine = new SchemaQualityAuditEngine();
    const report = engine.audit(tmpRoot);
    expect(report.summary.healthy).toBe(false);
    expect(report.summary.blockers.length).toBe(2);
    expect(report.summary.blockers.some(b => b.includes("z.any()"))).toBe(true);
    expect(report.summary.blockers.some(b => b.includes("orphan"))).toBe(true);
  });

  it("returns a structurally complete report with non-empty primitive fields", () => {
    const engine = new SchemaQualityAuditEngine();
    const report = engine.audit(tmpRoot);
    expect(typeof report.generated_at).toBe("string");
    expect(report.generated_at.length).toBeGreaterThan(10);
    expect(typeof report.z_any.total).toBe("number");
    expect(Array.isArray(report.z_any.by_file)).toBe(true);
    expect(typeof report.describe_coverage.total_fields).toBe("number");
    expect(typeof report.describe_coverage.coverage_pct).toBe("number");
    expect(Array.isArray(report.drift.orphan_schemas)).toBe(true);
    expect(Array.isArray(report.drift.dispatchers_without_schema)).toBe(true);
    expect(typeof report.summary.healthy).toBe("boolean");
    expect(Array.isArray(report.summary.blockers)).toBe(true);
  });

  it("singleton schemaQualityAuditEngine produces identical structural output to a fresh instance", async () => {
    const { schemaQualityAuditEngine } = await import("../engines/SchemaQualityAuditEngine.js");
    const fresh = new SchemaQualityAuditEngine();
    const a = fresh.audit(tmpRoot);
    const b = schemaQualityAuditEngine.audit(tmpRoot);
    expect(b.z_any.total).toBe(a.z_any.total);
    expect(b.z_any.by_file).toEqual(a.z_any.by_file);
    expect(b.describe_coverage.with_describe).toBe(a.describe_coverage.with_describe);
    expect(b.describe_coverage.fixable_candidates).toBe(a.describe_coverage.fixable_candidates);
    expect(b.drift.orphan_schemas).toEqual(a.drift.orphan_schemas);
    expect(b.drift.dispatchers_without_schema).toEqual(a.drift.dispatchers_without_schema);
    expect(b.summary.healthy).toBe(a.summary.healthy);
    expect(b.summary.blockers).toEqual(a.summary.blockers);
  });

  it("on real PRISM repo: z.any() count is 0 (regression guard)", () => {
    // Fails iff anyone reintroduces z.any() to schema directories.
    const engine = new SchemaQualityAuditEngine();
    const report = engine.audit();
    expect(report.z_any.total).toBe(0);
    expect(report.z_any.by_file).toEqual([]);
  });
});

// P8-U05 dispatcher round-trip exit condition: action enum + schema + case handler.
describe("prism_dev:schema_coverage_audit dispatcher wiring", () => {
  it("devDispatcher.ts has the action in its ACTIONS enum", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const disp = readFileSync(
      join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8",
    );
    expect(disp).toContain('"schema_coverage_audit"');
  });

  it("devDispatcher.ts has the case handler invoking SchemaQualityAuditEngine", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const disp = readFileSync(
      join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8",
    );
    expect(disp).toContain('case "schema_coverage_audit"');
    expect(disp).toContain("SchemaQualityAuditEngine.js");
    expect(disp).toContain("schemaQualityAuditEngine.audit()");
  });

  it("devActionSchemas.ts contains the schema_coverage_audit Zod entry", async () => {
    // Text-grep instead of runtime import — node_modules/zod is missing in this
    // worktree (pre-existing on the base branch; tracked separately). Other
    // dispatcher round-trip tests in this repo use the same text-grep pattern
    // (see BuildAdvisorEngine.test.ts:429 for precedent).
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const sch = readFileSync(
      join(process.cwd(), "src/schemas/devActionSchemas.ts"),
      "utf-8",
    );
    // Match the actual entry — the colon + z.object proves it's a real Zod schema,
    // not just a comment.
    expect(sch).toMatch(/schema_coverage_audit\s*:\s*z\.object\s*\(\s*\{\s*\}\s*\)/);
    // Belt-and-suspenders: confirm the comment header tying it to the milestone is present.
    expect(sch).toContain("INTEL-OLLAMA-OBSIDIAN-MS0/P8-U05");
  });

  it("dispatcher schema and case handler are both present (single source of truth check)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const disp = readFileSync(
      join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8",
    );
    const sch = readFileSync(
      join(process.cwd(), "src/schemas/devActionSchemas.ts"),
      "utf-8",
    );
    // Action name appears in both files — wiring is complete.
    expect(disp.includes('"schema_coverage_audit"')).toBe(true);
    expect(sch.includes("schema_coverage_audit")).toBe(true);
  });
});
