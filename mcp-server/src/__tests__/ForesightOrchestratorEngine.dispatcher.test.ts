import { describe, it, expect } from "vitest";
import {
  foresightOrchestratorEngine,
  ForesightOrchestratorEngine,
} from "../engines/ForesightOrchestratorEngine.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

/**
 * Contract test — mirrors what the prism_dev `foresight_report` dispatcher
 * action does. Validates the schema accepts well-formed input, rejects
 * ill-formed input, and that the engine produces a report with the verdict
 * invariants the caller relies on.
 */
describe("ForesightOrchestratorEngine — dispatcher contract", () => {
  it("schema is registered and parses a minimal input preserving description", () => {
    const schema = ACTION_DEV_SCHEMAS.foresight_report;
    expect(typeof schema.parse).toBe("function");
    const parsed = schema.parse({ description: "Add a new dispatcher action for X" });
    expect(parsed.description).toBe("Add a new dispatcher action for X");
  });

  it("schema preserves all optional fields on full input", () => {
    const schema = ACTION_DEV_SCHEMAS.foresight_report;
    const parsed = schema.parse({
      description: "Refactor FooEngine to use canonical constants",
      unitClass: "physics",
      proposedFiles: ["src/engines/FooEngine.ts"],
      contextTokensUsed: 125_000,
      contextTokensLimit: 1_000_000,
      modelName: "opus_4_7_1m",
    });
    expect(parsed.unitClass).toBe("physics");
    expect(parsed.proposedFiles).toEqual(["src/engines/FooEngine.ts"]);
    expect(parsed.contextTokensUsed).toBe(125_000);
    expect(parsed.contextTokensLimit).toBe(1_000_000);
    expect(parsed.modelName).toBe("opus_4_7_1m");
  });

  it("FAIL: schema rejects missing description", () => {
    const schema = ACTION_DEV_SCHEMAS.foresight_report;
    expect(() => schema.parse({})).toThrow();
  });

  it("FAIL: schema rejects non-string description", () => {
    const schema = ACTION_DEV_SCHEMAS.foresight_report;
    expect(() => schema.parse({ description: 42 })).toThrow();
  });

  it("FAIL: engine rejects empty description with specific message", async () => {
    await expect(
      foresightOrchestratorEngine.reportFor({ description: "" })
    ).rejects.toThrow(/description required/);
  });

  it("FAIL: engine rejects null input with specific message", async () => {
    await expect(
      foresightOrchestratorEngine.reportFor(null as unknown as { description: string })
    ).rejects.toThrow(/input required/);
  });

  it("produces a report with verdict in the documented enum for benign input", async () => {
    const report = await foresightOrchestratorEngine.reportFor({
      description: "Rename a local variable in test helper",
      unitClass: "generic",
      contextTokensUsed: 50_000,
      contextTokensLimit: 1_000_000,
    });
    expect(["go", "caution", "no_go"]).toContain(report.verdict);
    expect(["ok", "warn", "block"]).toContain(report.severity);
    expect(report.summary.startsWith("verdict=")).toBe(true);
    const sectionKeys = Object.keys(report.sections).sort();
    expect(sectionKeys).toContain("risk");
    expect(sectionKeys).toContain("knowledgeGap");
    expect(sectionKeys).toContain("contextBudget");
  });

  it("ADV: summary mirrors verdict field", async () => {
    const report = await foresightOrchestratorEngine.reportFor({
      description: "Benign docstring update",
    });
    expect(report.summary).toContain(`verdict=${report.verdict}`);
  });

  it("ADV: no_go verdict iff severity is block (documented invariant)", async () => {
    const report = await foresightOrchestratorEngine.reportFor({
      description: "Risky change with near-full context",
      contextTokensUsed: 999_000,
      contextTokensLimit: 1_000_000,
      modelName: "opus_4_7_1m",
    });
    // Exact bidirectional invariant stated in the engine comment at
    // ForesightOrchestratorEngine.ts:73
    expect(report.verdict === "no_go").toBe(report.severity === "block");
    // And when not no_go the teachingBlock is explicitly absent
    if (report.verdict !== "no_go") {
      expect("teachingBlock" in report.sections).toBe(false);
    }
  });

  it("ADV: singleton and fresh engine produce the same top-level and section keys", async () => {
    const input = { description: "Benign docstring update" };
    const singletonReport = await foresightOrchestratorEngine.reportFor(input);
    const freshReport = await new ForesightOrchestratorEngine().reportFor(input);
    expect(Object.keys(singletonReport).sort()).toEqual(Object.keys(freshReport).sort());
    expect(Object.keys(singletonReport.sections).sort()).toEqual(
      Object.keys(freshReport.sections).sort(),
    );
  });

  it("ADV: severity→verdict mapping holds across three disjoint inputs", async () => {
    const samples = await Promise.all([
      foresightOrchestratorEngine.reportFor({ description: "Doc change only" }),
      foresightOrchestratorEngine.reportFor({ description: "Update physics constant usage", unitClass: "physics" }),
      foresightOrchestratorEngine.reportFor({ description: "Wire new dispatcher action", unitClass: "wiring" }),
    ]);
    for (const r of samples) {
      const expected = r.severity === "block" ? "no_go" : r.severity === "warn" ? "caution" : "go";
      expect(r.verdict).toBe(expected);
    }
  });
});
