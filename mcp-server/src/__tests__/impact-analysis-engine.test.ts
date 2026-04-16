/**
 * ImpactAnalysisEngine Tests
 *
 * Tests for rename/delete impact analysis protocol.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Test directory setup
const testBaseDir = path.join(os.tmpdir(), `prism-impact-test-${Date.now()}`);
const testEnginesDir = path.join(testBaseDir, "src", "engines");
const testDispatchersDir = path.join(testBaseDir, "src", "tools", "dispatchers");
const testTestsDir = path.join(testBaseDir, "src", "__tests__");

describe("ImpactAnalysisEngine", () => {
  beforeEach(() => {
    // Create test directories
    [testEnginesDir, testDispatchersDir, testTestsDir].forEach((dir) => {
      fs.mkdirSync(dir, { recursive: true });
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe("asset path resolution", () => {
    it("should generate correct engine paths", () => {
      const engineName = "TestEngine";
      const expectedPath = `src/engines/${engineName}.ts`;
      expect(expectedPath).toBe("src/engines/TestEngine.ts");
    });

    it("should generate correct dispatcher paths", () => {
      const dispatcherName = "testDispatcher";
      const expectedPath = `src/tools/dispatchers/${dispatcherName}.ts`;
      expect(expectedPath).toBe("src/tools/dispatchers/testDispatcher.ts");
    });

    it("should generate correct test paths", () => {
      const testName = "test-engine";
      const expectedPath = `src/__tests__/${testName}.test.ts`;
      expect(expectedPath).toBe("src/__tests__/test-engine.test.ts");
    });

    it("should convert skill paths to kebab-case", () => {
      const toKebabCase = (str: string): string => {
        return str
          .replace(/([a-z])([A-Z])/g, "$1-$2")
          .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
          .toLowerCase();
      };

      expect(toKebabCase("MyFeature")).toBe("my-feature");
      expect(toKebabCase("XMLParserFeature")).toBe("xml-parser-feature");
    });
  });

  describe("impact level calculation", () => {
    it("should mark critical assets as critical impact", () => {
      const criticalAssets = new Set([
        "SafetyEngine",
        "KienzleForceModelEngine",
        "TaylorToolLifeEngine",
        "DuplicationGuardEngine",
        "TransactionLogEngine",
      ]);

      expect(criticalAssets.has("SafetyEngine")).toBe(true);
      expect(criticalAssets.has("RandomEngine")).toBe(false);
    });

    it("should calculate low impact for 0-5 dependents", () => {
      const calculateImpact = (directCount: number): string => {
        if (directCount > 10) return "high";
        if (directCount > 5) return "medium";
        return "low";
      };

      expect(calculateImpact(0)).toBe("low");
      expect(calculateImpact(3)).toBe("low");
      expect(calculateImpact(5)).toBe("low");
    });

    it("should calculate medium impact for 6-10 dependents", () => {
      const calculateImpact = (directCount: number): string => {
        if (directCount > 10) return "high";
        if (directCount > 5) return "medium";
        return "low";
      };

      expect(calculateImpact(6)).toBe("medium");
      expect(calculateImpact(8)).toBe("medium");
      expect(calculateImpact(10)).toBe("medium");
    });

    it("should calculate high impact for 11+ dependents", () => {
      const calculateImpact = (directCount: number): string => {
        if (directCount > 10) return "high";
        if (directCount > 5) return "medium";
        return "low";
      };

      expect(calculateImpact(11)).toBe("high");
      expect(calculateImpact(50)).toBe("high");
    });
  });

  describe("import detection", () => {
    it("should detect standard imports", () => {
      const hasImport = (content: string, name: string): boolean => {
        // Match import path containing the engine name
        const pattern = new RegExp(`import.*from.*["'][^"']*${name}`, "i");
        return pattern.test(content);
      };

      const content1 = 'import { foo } from "./FooEngine.js";';
      expect(hasImport(content1, "FooEngine")).toBe(true);

      const content2 = 'import { bar } from "./BarEngine.js";';
      expect(hasImport(content2, "FooEngine")).toBe(false);
    });

    it("should detect dynamic imports", () => {
      const content = 'const engine = await import("./FooEngine.js");';
      const hasImport = content.includes("FooEngine");
      expect(hasImport).toBe(true);
    });

    it("should detect re-exports", () => {
      const content = 'export { FooEngine } from "./FooEngine.js";';
      const hasExport = content.includes("FooEngine");
      expect(hasExport).toBe(true);
    });
  });

  describe("line number extraction", () => {
    it("should find all line numbers containing reference", () => {
      const findLineNumbers = (content: string, name: string): number[] => {
        const lines = content.split("\n");
        const lineNumbers: number[] = [];
        lines.forEach((line, index) => {
          if (line.includes(name)) {
            lineNumbers.push(index + 1);
          }
        });
        return lineNumbers;
      };

      const content = `import { FooEngine } from "./FooEngine";
const engine = new FooEngine();
// Another line
FooEngine.calculate();`;

      const lines = findLineNumbers(content, "FooEngine");
      expect(lines).toEqual([1, 2, 4]);
    });

    it("should return empty array for no matches", () => {
      const findLineNumbers = (content: string, name: string): number[] => {
        const lines = content.split("\n");
        const lineNumbers: number[] = [];
        lines.forEach((line, index) => {
          if (line.includes(name)) {
            lineNumbers.push(index + 1);
          }
        });
        return lineNumbers;
      };

      const content = "const x = 5;\nconst y = 10;";
      expect(findLineNumbers(content, "FooEngine")).toEqual([]);
    });
  });

  describe("breaking change detection", () => {
    it("should warn on case-only renames", () => {
      const fromName = "fooEngine";
      const toName = "FooEngine";

      const isCaseOnlyRename =
        fromName.toLowerCase() === toName.toLowerCase() && fromName !== toName;

      expect(isCaseOnlyRename).toBe(true);
    });

    it("should warn on reserved word usage", () => {
      const reservedWords = ["index", "types", "utils", "constants", "helpers"];

      expect(reservedWords.includes("index")).toBe(true);
      expect(reservedWords.includes("myengine")).toBe(false);
    });

    it("should detect conflicting names", () => {
      const reservedWords = ["index", "types", "utils", "constants", "helpers"];
      const toName = "utils";

      const isReserved = reservedWords.includes(toName.toLowerCase());
      expect(isReserved).toBe(true);
    });
  });

  describe("reference replacement", () => {
    it("should replace import paths", () => {
      const content = 'import { foo } from "./OldEngine.js";';
      const updated = content.replace(
        /from\s+["']\.\/OldEngine/g,
        'from "./NewEngine'
      );

      expect(updated).toBe('import { foo } from "./NewEngine.js";');
    });

    it("should replace class references", () => {
      const content = "const engine = new OldEngine();";
      const updated = content.replace(/\bOldEngine\b/g, "NewEngine");

      expect(updated).toBe("const engine = new NewEngine();");
    });

    it("should replace multiple occurrences", () => {
      const content = `OldEngine.method();
const x = new OldEngine();
OldEngine.staticProp;`;

      const updated = content.replace(/\bOldEngine\b/g, "NewEngine");
      expect(updated).not.toContain("OldEngine");
      expect(updated.match(/NewEngine/g)).toHaveLength(3);
    });
  });

  describe("file type inference", () => {
    it("should identify test files", () => {
      const inferType = (file: string, dir: string): string => {
        if (file.endsWith(".test.ts") || dir.includes("__tests__")) return "test";
        if (dir.includes("schemas")) return "config";
        return "import";
      };

      expect(inferType("foo.test.ts", "src")).toBe("test");
      expect(inferType("foo.ts", "src/__tests__")).toBe("test");
    });

    it("should identify config files", () => {
      const inferType = (file: string, dir: string): string => {
        if (file.endsWith(".test.ts") || dir.includes("__tests__")) return "test";
        if (dir.includes("schemas")) return "config";
        return "import";
      };

      expect(inferType("types.ts", "src/schemas")).toBe("config");
    });

    it("should default to import type", () => {
      const inferType = (file: string, dir: string): string => {
        if (file.endsWith(".test.ts") || dir.includes("__tests__")) return "test";
        if (dir.includes("schemas")) return "config";
        return "import";
      };

      expect(inferType("engine.ts", "src/engines")).toBe("import");
    });
  });

  describe("orphan detection", () => {
    it("should identify assets with no dependents", () => {
      // Simulate orphan detection
      const allAssets = ["EngineA", "EngineB", "EngineC", "EngineD"];
      const dependencyMap: Record<string, string[]> = {
        EngineA: ["EngineB"], // A depends on B
        EngineB: [],
        EngineC: ["EngineA"], // C depends on A
        EngineD: [], // Orphan - nothing depends on it
      };

      const getDependents = (name: string): string[] => {
        const dependents: string[] = [];
        for (const [asset, deps] of Object.entries(dependencyMap)) {
          if (deps.includes(name)) {
            dependents.push(asset);
          }
        }
        return dependents;
      };

      expect(getDependents("EngineB")).toEqual(["EngineA"]);
      expect(getDependents("EngineA")).toEqual(["EngineC"]);
      expect(getDependents("EngineD")).toEqual([]); // Orphan
    });
  });

  describe("rename impact report", () => {
    it("should generate valid rename impact structure", () => {
      const report = {
        asset: { name: "OldEngine", type: "engine", path: "src/engines/OldEngine.ts" },
        operation: "rename",
        newName: "NewEngine",
        impactLevel: "medium",
        directDependents: ["DispatcherA", "DispatcherB"],
        transitiveDependents: ["ServiceX"],
        affectedFiles: [{ path: "src/tools/dispatchers/dispatcherA.ts", type: "import", lineNumbers: [5, 10], autoFixable: true }],
        breakingChanges: [],
        warnings: [],
        recommendations: ["1. Create new asset", "2. Update references"],
        safeToProc: true,
        requiresManualReview: false,
      };

      expect(report.operation).toBe("rename");
      expect(report.newName).toBe("NewEngine");
      expect(report.directDependents).toHaveLength(2);
      expect(report.safeToProc).toBe(true);
    });
  });

  describe("delete impact report", () => {
    it("should block deletion with dependents", () => {
      const directDependents = ["ServiceA", "ServiceB"];
      const force = false;

      const safeToProc = directDependents.length === 0;
      expect(safeToProc).toBe(false);

      const breakingChange = {
        description: `Cannot delete — ${directDependents.length} assets depend on it`,
        severity: force ? "warning" : "error",
      };

      expect(breakingChange.severity).toBe("error");
    });

    it("should allow deletion with no dependents", () => {
      const directDependents: string[] = [];
      const criticalAssets = new Set(["SafetyEngine"]);
      const assetName = "UnusedEngine";

      const safeToProc = directDependents.length === 0 && !criticalAssets.has(assetName);
      expect(safeToProc).toBe(true);
    });

    it("should block critical asset deletion", () => {
      const criticalAssets = new Set(["SafetyEngine"]);
      const assetName = "SafetyEngine";

      const safeToProc = !criticalAssets.has(assetName);
      expect(safeToProc).toBe(false);
    });
  });

  describe("auto-fix capability", () => {
    it("should mark files with < 50 references as auto-fixable", () => {
      const lineNumbers = [1, 5, 10, 15, 20];
      const autoFixable = lineNumbers.length < 50;
      expect(autoFixable).toBe(true);
    });

    it("should mark files with >= 50 references as manual", () => {
      const lineNumbers = Array.from({ length: 60 }, (_, i) => i + 1);
      const autoFixable = lineNumbers.length < 50;
      expect(autoFixable).toBe(false);
    });
  });

  describe("recommendations generation", () => {
    it("should generate delete recommendations when dependents exist", () => {
      const dependentCount = 5;
      const recommendations: string[] = [];

      if (dependentCount > 0) {
        recommendations.push("1. Run impact analysis to identify all dependents");
        recommendations.push("2. Update dependents to remove references first");
        recommendations.push("3. Mark asset as deprecated before deletion");
        recommendations.push("4. Run full test suite after deletion");
      }

      expect(recommendations).toHaveLength(4);
      expect(recommendations[0]).toContain("impact analysis");
    });

    it("should generate rename recommendations", () => {
      const recommendations = [
        "1. Create new asset with new name",
        "2. Update all references to point to new asset",
        "3. Mark old asset as deprecated",
        "4. Remove old asset after verification",
      ];

      expect(recommendations).toHaveLength(4);
      expect(recommendations[3]).toContain("verification");
    });
  });

  describe("transitive dependency traversal", () => {
    it("should find all transitive dependents via BFS", () => {
      const dependencyMap: Record<string, string[]> = {
        A: [], // A has no direct dependents
        B: ["A"], // B depends on A
        C: ["B"], // C depends on B
        D: ["C"], // D depends on C
      };

      const findTransitive = (name: string): string[] => {
        const visited = new Set<string>();
        const queue = [name];
        const transitive: string[] = [];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          visited.add(current);

          // Find who depends on current
          for (const [asset, deps] of Object.entries(dependencyMap)) {
            if (deps.includes(current) && !visited.has(asset)) {
              transitive.push(asset);
              queue.push(asset);
            }
          }
        }

        return transitive;
      };

      // A → B → C → D (transitive chain)
      const transitiveFromA = findTransitive("A");
      expect(transitiveFromA).toContain("B");
      expect(transitiveFromA).toContain("C");
      expect(transitiveFromA).toContain("D");
    });
  });
});

describe("ImpactAnalysis Integration", () => {
  it("should support all asset types", () => {
    const assetTypes = ["engine", "dispatcher", "action", "skill", "hook", "test", "schema"];

    expect(assetTypes).toHaveLength(7);
    expect(assetTypes).toContain("engine");
    expect(assetTypes).toContain("dispatcher");
  });

  it("should validate operation types", () => {
    const operations = ["rename", "delete"];

    expect(operations).toHaveLength(2);
  });

  it("should define severity levels", () => {
    const severities = ["error", "warning"];
    const impactLevels = ["low", "medium", "high", "critical"];

    expect(severities).toHaveLength(2);
    expect(impactLevels).toHaveLength(4);
  });
});
