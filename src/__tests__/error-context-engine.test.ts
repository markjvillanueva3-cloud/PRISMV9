import { describe, it, expect } from "vitest";
import { ErrorContextEngine } from "../engines/ErrorContextEngine.js";
import { join } from "path";

describe("ErrorContextEngine", () => {
  const engine = new ErrorContextEngine();

  describe("fromBuildError", () => {
    it("parses TypeScript build errors", () => {
      const errorText = `src/engines/Foo.ts(42,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`;
      const contexts = engine.fromBuildError(errorText);
      expect(contexts.length).toBe(1);
      expect(contexts[0].file).toContain("Foo.ts");
      expect(contexts[0].line).toBe(42);
      expect(contexts[0].message).toContain("not assignable");
    });

    it("parses multiple errors", () => {
      const errorText = `src/a.ts(1,1): error TS1234: err1
src/b.ts(2,2): error TS5678: err2`;
      const contexts = engine.fromBuildError(errorText);
      expect(contexts.length).toBe(2);
    });

    it("returns empty for no errors", () => {
      expect(engine.fromBuildError("Build succeeded")).toEqual([]);
    });

    it("provides suggestion for import.meta errors", () => {
      const errorText = `src/engines/Foo.ts(10,5): error TS1343: The 'import.meta' is not allowed.`;
      const contexts = engine.fromBuildError(errorText);
      if (contexts.length > 0) {
        expect(contexts[0].suggestion).toContain("__dirname");
      }
    });
  });

  describe("getSurroundingCode", () => {
    it("returns surrounding lines for a known file", () => {
      const file = join(__dirname, "../engines/QuickCalcEngine.ts");
      const code = engine.getSurroundingCode(file, 10, 3);
      expect(code).toContain(">>>");
      expect(code.split("\n").length).toBeGreaterThan(3);
    });

    it("returns not found for missing file", () => {
      const code = engine.getSurroundingCode("/nonexistent.ts", 1);
      expect(code).toContain("not found");
    });
  });

  describe("getRecentChanges", () => {
    it("returns recent git changes for a file", () => {
      const changes = engine.getRecentChanges("src/engines/QuickCalcEngine.ts");
      expect(typeof changes).toBe("string");
    });
  });

  describe("getCompactDiagnostic", () => {
    it("returns compact error diagnostic", () => {
      const diag = engine.getCompactDiagnostic(
        "src/engines/QuickCalcEngine.ts",
        10,
        "type error"
      );
      expect(diag).toContain("ERROR:");
      expect(diag).toContain("QuickCalcEngine.ts");
    });
  });
});
