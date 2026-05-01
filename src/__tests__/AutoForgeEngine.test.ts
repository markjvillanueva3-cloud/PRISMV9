/**
 * AutoForgeEngine.test.ts — Tests for AutoForgeEngine (SQ1-1-TMPL)
 * Tests template auto-generation: input validation, artifact generation,
 * domain detection, dry-run behavior, and summary output.
 */

import { describe, it, expect } from "vitest";
import { autoForgeEngine } from "../engines/AutoForgeEngine.js";

describe("AutoForgeEngine", () => {
  // ── Input Validation ──

  describe("input validation", () => {
    it("rejects missing name", async () => {
      const result = await autoForgeEngine.forge({
        name: "",
        description: "test",
      });
      expect(result.warnings).toContain("'name' is required and must be a non-empty string");
      expect(result.artifacts).toHaveLength(0);
    });

    it("rejects non-string name", async () => {
      const result = await autoForgeEngine.forge({
        name: 123 as unknown as string,
        description: "test",
      });
      expect(result.warnings).toContain("'name' is required and must be a non-empty string");
      expect(result.artifacts).toHaveLength(0);
    });

    it("rejects name over 100 characters", async () => {
      const result = await autoForgeEngine.forge({
        name: "A".repeat(101),
        description: "test",
      });
      expect(result.warnings).toContain("'name' must be <= 100 characters");
    });

    it("rejects missing description", async () => {
      const result = await autoForgeEngine.forge({
        name: "TestEngine",
        description: "" as string,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("rejects description over 500 characters", async () => {
      const result = await autoForgeEngine.forge({
        name: "TestEngine",
        description: "X".repeat(501),
      });
      expect(result.warnings).toContain("'description' must be <= 500 characters");
    });
  });

  // ── Dry-Run Forge ──

  describe("forge (dry run)", () => {
    it("generates 7 artifacts for a new engine", async () => {
      const result = await autoForgeEngine.forge({
        name: "FooBarAnalysisEngine",
        description: "Analyzes foo bar relationships",
      });

      expect(result.dry_run).toBe(true);
      expect(result.engine_name).toBe("FooBarAnalysisEngine");
      // engine + dispatcher + schema + test + index + api_client + route = 7
      expect(result.artifacts.length).toBeGreaterThanOrEqual(7);

      const types = result.artifacts.map((a) => a.artifact_type);
      expect(types).toContain("engine");
      expect(types).toContain("dispatcher_case");
      expect(types).toContain("schema");
      expect(types).toContain("test");
      expect(types).toContain("index_export");
      expect(types).toContain("api_client");
      expect(types).toContain("route_handler");
    });

    it("no artifacts are applied in dry run", async () => {
      const result = await autoForgeEngine.forge({
        name: "DryRunTestEngine",
        description: "Test dry run behavior",
      });

      expect(result.dry_run).toBe(true);
      for (const a of result.artifacts) {
        expect(a.applied).toBe(false);
      }
      expect(result.summary.applied).toBe(0);
    });

    it("generates valid engine file content", async () => {
      const result = await autoForgeEngine.forge({
        name: "WidgetCalcEngine",
        description: "Calculates widget dimensions",
      });

      const engineArtifact = result.artifacts.find(
        (a) => a.artifact_type === "engine",
      );
      expect(engineArtifact).toBeDefined();
      const content = engineArtifact!.content;

      expect(content).toContain("class WidgetCalcEngine");
      expect(content).toContain("export const widgetCalcEngine");
      expect(content).toContain("Calculates widget dimensions");
      expect(content).toContain('import { log } from "../utils/Logger.js"');
    });

    it("generates dispatcher case with lazy import", async () => {
      const result = await autoForgeEngine.forge({
        name: "WidgetCalcEngine",
        description: "Calculates widget dimensions",
      });

      const dispatcher = result.artifacts.find(
        (a) => a.artifact_type === "dispatcher_case",
      );
      expect(dispatcher).toBeDefined();
      expect(dispatcher!.content).toContain('case "widget_calc"');
      expect(dispatcher!.content).toContain("await import");
      expect(dispatcher!.content).toContain("widgetCalcEngine");
    });

    it("generates Zod schema with passthrough", async () => {
      const result = await autoForgeEngine.forge({
        name: "WidgetCalcEngine",
        description: "Calculates widget dimensions",
      });

      const schema = result.artifacts.find(
        (a) => a.artifact_type === "schema",
      );
      expect(schema).toBeDefined();
      expect(schema!.content).toContain("widget_calc");
      expect(schema!.content).toContain("passthrough()");
    });

    it("generates test file with vitest imports", async () => {
      const result = await autoForgeEngine.forge({
        name: "WidgetCalcEngine",
        description: "Calculates widget dimensions",
      });

      const test = result.artifacts.find(
        (a) => a.artifact_type === "test",
      );
      expect(test).toBeDefined();
      expect(test!.content).toContain('import { describe, it, expect } from "vitest"');
      expect(test!.content).toContain("widgetCalcEngine");
      expect(test!.content).toContain("singleton is defined");
    });

    it("generates index export line", async () => {
      const result = await autoForgeEngine.forge({
        name: "WidgetCalcEngine",
        description: "Calculates widget dimensions",
      });

      const indexExport = result.artifacts.find(
        (a) => a.artifact_type === "index_export",
      );
      expect(indexExport).toBeDefined();
      expect(indexExport!.content).toContain("widgetCalcEngine");
      expect(indexExport!.content).toContain("WidgetCalcEngineResult");
      expect(indexExport!.content).toContain("./WidgetCalcEngine.js");
    });

    it("generates API client function", async () => {
      const result = await autoForgeEngine.forge({
        name: "WidgetCalcEngine",
        description: "Calculates widget dimensions",
      });

      const client = result.artifacts.find(
        (a) => a.artifact_type === "api_client",
      );
      expect(client).toBeDefined();
      expect(client!.content).toContain("async function");
      expect(client!.content).toContain("/dev/widget-calc");
    });

    it("generates route handler", async () => {
      const result = await autoForgeEngine.forge({
        name: "WidgetCalcEngine",
        description: "Calculates widget dimensions",
      });

      const route = result.artifacts.find(
        (a) => a.artifact_type === "route_handler",
      );
      expect(route).toBeDefined();
      expect(route!.content).toContain('router.post("/widget-calc"');
      expect(route!.content).toContain('"widget_calc"');
    });
  });

  // ── Domain Detection ──

  describe("domain detection", () => {
    it("detects physics domain", async () => {
      const result = await autoForgeEngine.forge({
        name: "ThermalStressEngine",
        description: "Thermal stress calculations",
      });
      expect(result.domain).toBe("physics");
    });

    it("detects business domain", async () => {
      const result = await autoForgeEngine.forge({
        name: "QuoteAnalyzerEngine",
        description: "Quote analysis",
      });
      expect(result.domain).toBe("business");
    });

    it("detects quality domain", async () => {
      const result = await autoForgeEngine.forge({
        name: "ValidationCheckEngine",
        description: "Validation checks",
      });
      expect(result.domain).toBe("quality");
    });

    it("falls back to general for unknown", async () => {
      const result = await autoForgeEngine.forge({
        name: "XyzAbcEngine",
        description: "Unknown domain",
      });
      expect(result.domain).toBe("general");
    });

    it("respects explicit domain override", async () => {
      const result = await autoForgeEngine.forge({
        name: "XyzAbcEngine",
        description: "Override test",
        domain: "manufacturing",
      });
      expect(result.domain).toBe("manufacturing");
    });
  });

  // ── Custom Methods ──

  describe("custom methods", () => {
    it("generates artifacts with custom methods", async () => {
      const result = await autoForgeEngine.forge({
        name: "CustomMethodEngine",
        description: "Test custom methods",
        methods: [
          {
            name: "calculate",
            description: "Run calculation",
            params: [
              { name: "value", type: "number" },
              { name: "label", type: "string", optional: true },
            ],
            return_type: "Promise<{ result: number }>",
          },
          {
            name: "validate",
            description: "Validate input",
            params: [{ name: "data", type: "Record<string, unknown>" }],
          },
        ],
      });

      const engine = result.artifacts.find((a) => a.artifact_type === "engine");
      expect(engine!.content).toContain("calculate(");
      expect(engine!.content).toContain("validate(");
      expect(engine!.content).toContain("value: number");
      expect(engine!.content).toContain("label?: string");

      const schema = result.artifacts.find((a) => a.artifact_type === "schema");
      expect(schema!.content).toContain("z.number()");
      expect(schema!.content).toContain("z.string()");
    });
  });

  // ── Summary ──

  describe("summary()", () => {
    it("returns markdown summary", async () => {
      const result = await autoForgeEngine.forge({
        name: "SummaryTestEngine",
        description: "Summary test",
      });

      const text = autoForgeEngine.summary(result);
      expect(text).toContain("# AutoForge: SummaryTestEngine");
      expect(text).toContain("Artifacts:");
      expect(text).toContain("PENDING");
    });

    it("includes warnings in summary", async () => {
      const result = await autoForgeEngine.forge({
        name: 42 as unknown as string,
        description: "bad",
      });

      const text = autoForgeEngine.summary(result);
      expect(text).toContain("Warnings");
    });
  });

  // ── Existing Engine Handling ──

  describe("existing engine detection", () => {
    it("warns when engine file already exists", async () => {
      // AutoWiringEngine exists on disk
      const result = await autoForgeEngine.forge({
        name: "AutoWiringEngine",
        description: "Already exists",
      });

      expect(result.warnings.some((w) => w.includes("already exists"))).toBe(true);
      // Should not generate engine artifact for existing file
      const engineArtifact = result.artifacts.find(
        (a) => a.artifact_type === "engine",
      );
      expect(engineArtifact).toBeUndefined();
    });
  });

  // ── Name Normalization ──

  describe("name normalization", () => {
    it("appends Engine suffix if missing", async () => {
      const result = await autoForgeEngine.forge({
        name: "FooBar",
        description: "Test name normalization",
      });
      expect(result.engine_name).toBe("FooBarEngine");
    });

    it("keeps Engine suffix if present", async () => {
      const result = await autoForgeEngine.forge({
        name: "FooBarEngine",
        description: "Test name normalization",
      });
      expect(result.engine_name).toBe("FooBarEngine");
    });
  });

  // ── Line Count ──

  describe("summary stats", () => {
    it("reports total lines generated", async () => {
      const result = await autoForgeEngine.forge({
        name: "LineCountEngine",
        description: "Test line counting",
      });

      expect(result.summary.lines_generated).toBeGreaterThan(50);
      expect(result.summary.total_artifacts).toBeGreaterThanOrEqual(7);
    });
  });
});
