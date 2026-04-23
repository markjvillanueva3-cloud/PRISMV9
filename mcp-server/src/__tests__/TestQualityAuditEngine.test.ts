/**
 * TestQualityAuditEngine Tests
 *
 * Verifies classifier correctly grades REAL / SHALLOW / SYNTHETIC test files
 * using in-memory test fixtures (no disk reads against real corpus).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { TestQualityAuditEngine } from "../engines/TestQualityAuditEngine.js";

function writeFixture(dir: string, name: string, content: string): string {
  const full = path.join(dir, name);
  fs.writeFileSync(full, content, "utf8");
  return full;
}

describe("TestQualityAuditEngine", () => {
  let tmpDir: string;
  let engine: TestQualityAuditEngine;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tqae-"));
    engine = new TestQualityAuditEngine(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("classifyFile — SYNTHETIC detection", () => {
    it("flags file with || true suppression as SYNTHETIC", () => {
      const fp = writeFixture(tmpDir, "Foo.test.ts", `
        import { describe, it, expect } from "vitest";
        import { fooEngine } from "../engines/FooEngine.js";
        describe("Foo", () => {
          it("runs", () => {
            expect(fooEngine.compute(1) || true).toBeTruthy();
          });
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.grade).toBe("SYNTHETIC");
      expect(score.signals.orTrueSuppressions).toBeGreaterThan(0);
      expect(score.violations.some(v => v.includes("|| true"))).toBe(true);
    });

    it("flags file with expect(true).toBe(true) as SYNTHETIC", () => {
      const fp = writeFixture(tmpDir, "Bar.test.ts", `
        import { describe, it, expect } from "vitest";
        describe("Bar", () => {
          it("works", () => {
            expect(true).toBe(true);
          });
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.grade).toBe("SYNTHETIC");
      expect(score.signals.trivialAsserts).toBeGreaterThanOrEqual(1);
    });

    it("flags file with only skipped tests as SYNTHETIC", () => {
      const fp = writeFixture(tmpDir, "Baz.test.ts", `
        import { describe, it, expect } from "vitest";
        describe("Baz", () => {
          it.skip("pending", () => { expect(1).toBe(2); });
          it.todo("future");
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.grade).toBe("SYNTHETIC");
      expect(score.signals.skippedTests).toBe(2);
      expect(score.violations.some(v => v.includes("skipped"))).toBe(true);
    });

    it("flags file with zero test cases as SYNTHETIC", () => {
      const fp = writeFixture(tmpDir, "Empty.test.ts", `
        import { describe } from "vitest";
        describe("Empty", () => {
          // no tests
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.grade).toBe("SYNTHETIC");
      expect(score.signals.totalTests).toBe(0);
    });
  });

  describe("classifyFile — SHALLOW detection", () => {
    it("flags file with only toBeDefined asserts as SHALLOW or SYNTHETIC", () => {
      const fp = writeFixture(tmpDir, "DefinedOnly.test.ts", `
        import { describe, it, expect } from "vitest";
        import { myEngine } from "../engines/MyEngine.js";
        describe("MyEngine", () => {
          it("a", () => { expect(myEngine.run()).toBeDefined(); });
          it("b", () => { expect(myEngine.run()).toBeDefined(); });
          it("c", () => { expect(myEngine.run()).toBeDefined(); });
          it("d", () => { expect(myEngine.run()).toBeDefined(); });
        });
      `);
      const score = engine.classifyFile(fp);
      expect(["SHALLOW", "SYNTHETIC"]).toContain(score.grade);
      expect(score.signals.bareDefinedAsserts).toBeGreaterThanOrEqual(4);
      expect(score.violations.some(v => v.includes("bare toBeDefined"))).toBe(true);
    });

    it("assertionDepth score is 0 when only bare toBeDefined is used", () => {
      const fp = writeFixture(tmpDir, "Depth.test.ts", `
        import { describe, it, expect } from "vitest";
        describe("x", () => {
          it("a", () => { expect(x).toBeDefined(); });
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.breakdown.assertionDepth).toBe(0);
    });
  });

  describe("classifyFile — REAL detection", () => {
    it("grades realistic engine test with numeric assertions as REAL", () => {
      const fp = writeFixture(tmpDir, "CuttingForceEngine.test.ts", `
        import { describe, it, expect } from "vitest";
        import { cuttingForceEngine } from "../engines/CuttingForceEngine.js";

        describe("CuttingForceEngine", () => {
          const input = {
            cutting_speed_mpm: 150,
            feed_mm_rev: 0.15,
            depth_of_cut_mm: 2.5,
            tool_diameter_mm: 12,
            material: "steel" as const,
          };

          it("computes force within expected range", () => {
            const r = cuttingForceEngine.compute(input);
            expect(r.force_N).toBeCloseTo(850, -1);
            expect(r.force_N).toBeGreaterThan(500);
            expect(r.force_N).toBeLessThan(1500);
          });

          it("handles zero depth edge case", () => {
            const r = cuttingForceEngine.compute({ ...input, depth_of_cut_mm: 0 });
            expect(r.force_N).toBe(0);
          });

          it("handles negative feed by clamping", () => {
            const r = cuttingForceEngine.compute({ ...input, feed_mm_rev: -0.1 });
            expect(r.force_N).toBeGreaterThanOrEqual(0);
          });

          it("kienzle coefficient matches Sandvik handbook for M-group", () => {
            const r = cuttingForceEngine.compute(input);
            expect(r.kc_Nmm2).toBeCloseTo(2100, -1);
          });

          it("force scales with depth", () => {
            const r1 = cuttingForceEngine.compute({ ...input, depth_of_cut_mm: 1 });
            const r2 = cuttingForceEngine.compute({ ...input, depth_of_cut_mm: 2 });
            expect(r2.force_N).toBeGreaterThan(r1.force_N);
          });

          it("force is dimensionally consistent", () => {
            const r = cuttingForceEngine.compute(input);
            expect(r.unit).toBe("N");
          });

          it("source cites Kienzle", () => {
            const r = cuttingForceEngine.compute(input);
            expect(r.source).toContain("Kienzle");
          });

          it("getCalibration returns material-specific constants", () => {
            const cal = cuttingForceEngine.getCalibration("steel");
            expect(cal.kc11).toBeCloseTo(2100, -1);
          });

          it("reset clears internal cache", () => {
            cuttingForceEngine.reset();
            expect(cuttingForceEngine.cacheSize()).toBe(0);
          });

          it("handles NaN input gracefully", () => {
            const r = cuttingForceEngine.compute({ ...input, feed_mm_rev: NaN });
            expect(Number.isFinite(r.force_N) || r.force_N === 0).toBe(true);
          });
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.grade).toBe("REAL");
      expect(score.score).toBeGreaterThanOrEqual(7);
      expect(score.breakdown.assertionDepth).toBeGreaterThanOrEqual(2);
      expect(score.breakdown.concreteInputs).toBe(2);
      expect(score.signals.hasConcretePhysicsValues).toBe(true);
      expect(score.signals.hasEdgeCases).toBe(true);
    });
  });

  describe("signal extraction", () => {
    it("extracts target engine from import statement", () => {
      const fp = writeFixture(tmpDir, "Thing.test.ts", `
        import { describe, it, expect } from "vitest";
        import { thingEngine } from "../engines/ThingEngine.js";
        describe("x", () => { it("y", () => { expect(1).toBe(2); }); });
      `);
      const score = engine.classifyFile(fp);
      expect(score.targetEngine).toBe("ThingEngine");
    });

    it("extracts target engine from filename when no import matches", () => {
      const fp = writeFixture(tmpDir, "OrphanEngine.test.ts", `
        import { describe, it, expect } from "vitest";
        describe("x", () => { it("y", () => { expect(1).toBe(2); }); });
      `);
      const score = engine.classifyFile(fp);
      expect(score.targetEngine).toBe("OrphanEngine");
    });

    it("counts distinct engine method calls, not total invocations", () => {
      const fp = writeFixture(tmpDir, "Methods.test.ts", `
        import { describe, it, expect } from "vitest";
        import { fooEngine } from "../engines/FooEngine.js";
        describe("x", () => {
          it("y", () => {
            fooEngine.a();
            fooEngine.a(); // repeat
            fooEngine.b();
            fooEngine.c();
          });
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.signals.distinctMethodCalls).toBe(3);
    });

    it("detects edge cases via zero/negative/extreme inputs", () => {
      const fp = writeFixture(tmpDir, "Edges.test.ts", `
        import { describe, it, expect } from "vitest";
        describe("x", () => {
          it("y", () => {
            const input = { depth: 0, feed: -1, speed: 1e6 };
            expect(input).toBeDefined();
          });
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.signals.hasEdgeCases).toBe(true);
    });

    it("detects reference data mentions (handbook, Sandvik, JM Die)", () => {
      const fp = writeFixture(tmpDir, "Ref.test.ts", `
        import { describe, it, expect } from "vitest";
        // Compare against Sandvik handbook values
        describe("x", () => { it("y", () => { expect(1).toBeCloseTo(1.0); }); });
      `);
      const score = engine.classifyFile(fp);
      expect(score.signals.hasReferenceCompare).toBe(true);
    });
  });

  describe("auditAll — corpus summary", () => {
    it("returns zero totals for empty directory", () => {
      const report = engine.auditAll();
      expect(report.totalFiles).toBe(0);
      expect(report.byGrade.REAL).toBe(0);
      expect(report.byGrade.SHALLOW).toBe(0);
      expect(report.byGrade.SYNTHETIC).toBe(0);
    });

    it("aggregates grades across multiple fixtures", () => {
      writeFixture(tmpDir, "S1.test.ts", `
        import { describe, it, expect } from "vitest";
        describe("x", () => { it("y", () => { expect(true).toBe(true); }); });
      `);
      writeFixture(tmpDir, "S2.test.ts", `
        import { describe, it, expect } from "vitest";
        describe("x", () => { it.skip("y", () => {}); });
      `);
      writeFixture(tmpDir, "Good.test.ts", `
        import { describe, it, expect } from "vitest";
        import { e } from "../engines/EEngine.js";
        const speed_mpm = 150;
        describe("x", () => {
          it("a", () => { expect(e.run(speed_mpm)).toBeCloseTo(1.5, 2); });
          it("b", () => { expect(e.run(0)).toBe(0); });
          it("c", () => { expect(e.run(-1)).toBeGreaterThanOrEqual(0); });
          it("d", () => { expect(e.run(1e6)).toBeLessThan(1e9); });
          it("e", () => { expect(e.calibrate()).toBeCloseTo(2.0, 1); });
          it("f", () => { expect(e.reset()).toBeDefined(); });
          it("g", () => { expect(e.getStats()).toMatchObject({ count: 0 }); });
          it("h", () => { expect(e.summary()).toContain("ok"); });
          it("i", () => { expect(e.isReady()).toBe(true); });
          it("j", () => { expect(e.count()).toBeGreaterThan(0); });
        });
      `);
      const report = engine.auditAll();
      expect(report.totalFiles).toBe(3);
      expect(report.byGrade.SYNTHETIC).toBeGreaterThanOrEqual(2);
      expect(report.byGrade.REAL).toBe(1);
    });

    it("persistReport writes valid JSON to disk", () => {
      writeFixture(tmpDir, "S.test.ts", `
        import { describe, it, expect } from "vitest";
        describe("x", () => { it("y", () => { expect(true).toBe(true); }); });
      `);
      const report = engine.auditAll();
      const outPath = path.join(tmpDir, "report.json");
      engine.persistReport(report, outPath);
      expect(fs.existsSync(outPath)).toBe(true);
      const read = JSON.parse(fs.readFileSync(outPath, "utf8"));
      expect(read.totalFiles).toBe(1);
      expect(read.byGrade.SYNTHETIC).toBe(1);
    });
  });

  describe("scoring rubric bounds", () => {
    it("score never exceeds 10", () => {
      const fp = writeFixture(tmpDir, "Max.test.ts", `
        import { describe, it, expect } from "vitest";
        import { e } from "../engines/EEngine.js";
        const feed_mm_rev = 0.1;
        const cutting_speed_mpm = 150;
        const material = "steel";
        const input = { depth: 0, feed: -1, value: 1e9 };
        // reference: sandvik handbook
        describe("x", () => {
          ${Array.from({ length: 15 }, (_, i) =>
            `it("t${i}", () => { expect(e.run(input)).toBeCloseTo(${i}, 2); expect(e.run(input)).toBeGreaterThan(0); expect(e.run(input)).toBeLessThan(1e9); });`
          ).join("\n          ")}
        });
      `);
      const score = engine.classifyFile(fp);
      expect(score.score).toBeLessThanOrEqual(10);
    });

    it("score is never negative", () => {
      const fp = writeFixture(tmpDir, "Min.test.ts", `
        import { describe } from "vitest";
        describe("x", () => {});
      `);
      const score = engine.classifyFile(fp);
      expect(score.score).toBeGreaterThanOrEqual(0);
    });
  });
});
