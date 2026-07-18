/**
 * EditImpactPredictorEngine tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  EditImpactPredictorEngine,
  type ImpactPrediction,
  type FileNode,
} from "../engines/EditImpactPredictorEngine.js";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("EditImpactPredictorEngine", () => {
  let engine: EditImpactPredictorEngine;
  const testDir = join(process.cwd(), "test-fixtures-impact");

  beforeEach(() => {
    engine = new EditImpactPredictorEngine();

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "__tests__"), { recursive: true });
  });

  describe("buildGraph", () => {
    it("builds graph from TypeScript files", async () => {
      writeFileSync(join(testDir, "ModuleA.ts"), 'export const a = 1;');
      writeFileSync(join(testDir, "ModuleB.ts"), 'import { a } from "./ModuleA.js";\nexport const b = a + 1;');

      const count = await engine.buildGraph(testDir);

      expect(count).toBe(2);
      const stats = engine.getGraphStats();
      expect(stats.nodeCount).toBe(2);
    });

    it("identifies test files correctly", async () => {
      writeFileSync(join(testDir, "Engine.ts"), 'export class Engine {}');
      writeFileSync(join(testDir, "__tests__", "Engine.test.ts"), 'import { Engine } from "../Engine.js";');

      await engine.buildGraph(testDir);

      const stats = engine.getGraphStats();
      expect(stats.testCount).toBe(1);
    });

    it("identifies engine files correctly", async () => {
      writeFileSync(join(testDir, "MyEngine.ts"), 'export class MyEngine {}');
      writeFileSync(join(testDir, "utils.ts"), 'export const util = 1;');

      await engine.buildGraph(testDir);

      const stats = engine.getGraphStats();
      expect(stats.engineCount).toBe(1);
    });

    it("parses import statements", async () => {
      writeFileSync(join(testDir, "base.ts"), 'export const base = 1;');
      writeFileSync(join(testDir, "derived.ts"), `
        import { base } from "./base.js";
        import type { SomeType } from "./types.js";
        export const derived = base;
      `);

      await engine.buildGraph(testDir);

      const node = engine.getNode(join(testDir, "derived.ts"));
      expect(node).toBeDefined();
      expect(node!.imports.length).toBeGreaterThanOrEqual(1);
    });

    it("parses dynamic imports", async () => {
      writeFileSync(join(testDir, "lazy.ts"), `
        export async function load() {
          const mod = await import("./heavy.js");
          return mod;
        }
      `);
      writeFileSync(join(testDir, "heavy.ts"), 'export const heavy = "data";');

      await engine.buildGraph(testDir);

      const node = engine.getNode(join(testDir, "lazy.ts"));
      expect(node).toBeDefined();
      expect(node!.imports).toContain("./heavy.js");
    });

    it("skips node_modules and dist directories", async () => {
      mkdirSync(join(testDir, "node_modules"), { recursive: true });
      mkdirSync(join(testDir, "dist"), { recursive: true });
      writeFileSync(join(testDir, "node_modules", "pkg.ts"), 'export const x = 1;');
      writeFileSync(join(testDir, "dist", "bundle.ts"), 'export const y = 1;');
      writeFileSync(join(testDir, "src.ts"), 'export const z = 1;');

      const count = await engine.buildGraph(testDir);

      expect(count).toBe(1);
    });
  });

  describe("predict", () => {
    it("returns empty prediction for unknown file", async () => {
      await engine.buildGraph(testDir);

      const prediction = await engine.predict("/nonexistent/file.ts");

      expect(prediction.directTests).toEqual([]);
      expect(prediction.affectedFiles).toEqual([]);
      expect(prediction.impactScore).toBe(0);
      expect(prediction.riskLevel).toBe("low");
    });

    it("finds direct tests for a file", async () => {
      writeFileSync(join(testDir, "Calculator.ts"), 'export class Calculator { add(a: number, b: number) { return a + b; } }');
      writeFileSync(join(testDir, "__tests__", "Calculator.test.ts"), `
        import { Calculator } from "../Calculator.js";
        describe("Calculator", () => { it("adds", () => {}); });
      `);

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "Calculator.ts"));

      expect(prediction.directTests.length).toBeGreaterThanOrEqual(1);
      expect(prediction.directTests.some(t => t.toLowerCase().includes("calculator.test"))).toBe(true);
    });

    it("finds affected files through import chain", async () => {
      writeFileSync(join(testDir, "core.ts"), 'export const core = 1;');
      writeFileSync(join(testDir, "middle.ts"), 'import { core } from "./core.js"; export const mid = core;');
      writeFileSync(join(testDir, "top.ts"), 'import { mid } from "./middle.js"; export const top = mid;');

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "core.ts"));

      expect(prediction.affectedFiles.length).toBeGreaterThanOrEqual(2);
    });

    it("calculates impact score based on dependents", async () => {
      writeFileSync(join(testDir, "shared.ts"), 'export const shared = 1;');
      writeFileSync(join(testDir, "user1.ts"), 'import { shared } from "./shared.js";');
      writeFileSync(join(testDir, "user2.ts"), 'import { shared } from "./shared.js";');
      writeFileSync(join(testDir, "user3.ts"), 'import { shared } from "./shared.js";');

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "shared.ts"));

      expect(prediction.impactScore).toBeGreaterThan(0);
    });

    it("assigns higher risk to engine files", async () => {
      writeFileSync(join(testDir, "MyEngine.ts"), 'export class MyEngine {}');
      writeFileSync(join(testDir, "utils.ts"), 'export const util = 1;');
      writeFileSync(join(testDir, "consumer1.ts"), 'import { MyEngine } from "./MyEngine.js";');
      writeFileSync(join(testDir, "consumer2.ts"), 'import { util } from "./utils.js";');

      await engine.buildGraph(testDir);

      const enginePrediction = await engine.predict(join(testDir, "MyEngine.ts"));
      const utilPrediction = await engine.predict(join(testDir, "utils.ts"));

      expect(enginePrediction.impactScore).toBeGreaterThan(utilPrediction.impactScore);
    });

    it("generates suggestions for missing tests", async () => {
      writeFileSync(join(testDir, "UntestedEngine.ts"), 'export class UntestedEngine {}');

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "UntestedEngine.ts"));

      expect(prediction.suggestions.some(s => s.includes("No direct tests"))).toBe(true);
    });

    it("suggests running tests when they exist", async () => {
      writeFileSync(join(testDir, "Tested.ts"), 'export class Tested {}');
      writeFileSync(join(testDir, "__tests__", "Tested.test.ts"), 'import { Tested } from "../Tested.js";');

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "Tested.ts"));

      expect(prediction.suggestions.some(s => s.includes("Run tests"))).toBe(true);
    });
  });

  describe("risk levels", () => {
    it("returns low risk for isolated files", async () => {
      writeFileSync(join(testDir, "isolated.ts"), 'export const x = 1;');

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "isolated.ts"));

      expect(prediction.riskLevel).toBe("low");
    });

    it("returns medium risk for moderately connected files", async () => {
      writeFileSync(join(testDir, "base.ts"), 'export const base = 1;');
      for (let i = 0; i < 5; i++) {
        writeFileSync(join(testDir, `user${i}.ts`), 'import { base } from "./base.js";');
      }
      writeFileSync(join(testDir, "__tests__", "base.test.ts"), 'import { base } from "../base.js";');

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "base.ts"));

      expect(["medium", "high", "critical"]).toContain(prediction.riskLevel);
    });

    it("returns critical risk for heavily imported engine files", async () => {
      writeFileSync(join(testDir, "CoreEngine.ts"), 'export class CoreEngine {}');
      for (let i = 0; i < 10; i++) {
        writeFileSync(join(testDir, `consumer${i}.ts`), 'import { CoreEngine } from "./CoreEngine.js";');
        writeFileSync(join(testDir, "__tests__", `consumer${i}.test.ts`), `import { CoreEngine } from "../CoreEngine.js";`);
      }

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "CoreEngine.ts"));

      expect(["high", "critical"]).toContain(prediction.riskLevel);
    });
  });

  describe("graph stats", () => {
    it("counts edges correctly", async () => {
      writeFileSync(join(testDir, "a.ts"), 'export const a = 1;');
      writeFileSync(join(testDir, "b.ts"), 'import { a } from "./a.js"; export const b = a;');
      writeFileSync(join(testDir, "c.ts"), 'import { a } from "./a.js"; import { b } from "./b.js";');

      await engine.buildGraph(testDir);
      const stats = engine.getGraphStats();

      expect(stats.edgeCount).toBe(3);
    });

    it("reports freshness correctly", async () => {
      expect(engine.isGraphFresh()).toBe(false);

      await engine.buildGraph(testDir);

      expect(engine.isGraphFresh()).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty directory", async () => {
      const count = await engine.buildGraph(testDir);

      expect(count).toBe(0);
      expect(engine.getGraphStats().nodeCount).toBe(0);
    });

    it("handles circular imports", async () => {
      writeFileSync(join(testDir, "circA.ts"), 'import { b } from "./circB.js"; export const a = 1;');
      writeFileSync(join(testDir, "circB.ts"), 'import { a } from "./circA.js"; export const b = 2;');

      await engine.buildGraph(testDir);
      const prediction = await engine.predict(join(testDir, "circA.ts"));

      expect(prediction.affectedFiles).toBeDefined();
      expect(prediction.impactScore).toBeGreaterThanOrEqual(0);
    });

    it("handles nonexistent source directory", async () => {
      const count = await engine.buildGraph("/nonexistent/path");

      expect(count).toBe(0);
    });

    it("handles files with syntax errors gracefully", async () => {
      writeFileSync(join(testDir, "broken.ts"), 'import { missing from');

      const count = await engine.buildGraph(testDir);

      expect(count).toBe(1);
    });

    it("handles special characters in imports", async () => {
      writeFileSync(join(testDir, "special.ts"), `
        import { x } from "./path-with-dash.js";
        import { y } from "./path_with_underscore.js";
      `);

      await engine.buildGraph(testDir);
      const node = engine.getNode(join(testDir, "special.ts"));

      expect(node).toBeDefined();
      expect(node!.imports).toContain("./path-with-dash.js");
      expect(node!.imports).toContain("./path_with_underscore.js");
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
