import { describe, it, expect } from "vitest";
import { ContextDigestEngine } from "../engines/ContextDigestEngine.js";
import { join } from "path";

describe("ContextDigestEngine", () => {
  const digest = new ContextDigestEngine();
  const enginesDir = join(__dirname, "../engines");

  describe("digestFile", () => {
    it("digests a TypeScript file", () => {
      const result = digest.digestFile(join(enginesDir, "QuickCalcEngine.ts"));
      expect(result).not.toBeNull();
      expect(result!.lines).toBeGreaterThan(50);
      expect(result!.type).toBe(".ts");
      expect(result!.classes).toContain("QuickCalcEngine");
      expect(result!.exports.length).toBeGreaterThan(0);
    });

    it("returns null for nonexistent file", () => {
      expect(digest.digestFile("/nonexistent/file.ts")).toBeNull();
    });

    it("captures import count", () => {
      const result = digest.digestFile(join(enginesDir, "QuickCalcEngine.ts"));
      expect(result!.imports).toBeGreaterThanOrEqual(0);
    });

    it("captures interfaces", () => {
      const result = digest.digestFile(join(enginesDir, "QuickCalcEngine.ts"));
      expect(result!.interfaces.length).toBeGreaterThan(0);
    });
  });

  describe("digestDirectory", () => {
    it("digests the engines directory", () => {
      const result = digest.digestDirectory(enginesDir, 0);
      expect(result).not.toBeNull();
      expect(result!.totalFiles).toBeGreaterThan(100);
      expect(result!.totalLines).toBeGreaterThan(10000);
      expect(result!.byExtension[".ts"]).toBeGreaterThan(100);
    });

    it("returns null for nonexistent directory", () => {
      expect(digest.digestDirectory("/nonexistent/dir")).toBeNull();
    });

    it("includes largest files", () => {
      const result = digest.digestDirectory(enginesDir, 0);
      expect(result!.largestFiles.length).toBeGreaterThan(0);
      expect(result!.largestFiles[0].lines).toBeGreaterThan(
        result!.largestFiles[result!.largestFiles.length - 1].lines
      );
    });

    it("generates a summary string", () => {
      const result = digest.digestDirectory(enginesDir, 0);
      expect(result!.summary).toContain("files");
      expect(result!.summary).toContain("lines");
    });
  });

  describe("oneLiner", () => {
    it("generates compact one-line digest", () => {
      const line = digest.oneLiner(join(enginesDir, "QuickCalcEngine.ts"));
      expect(line).toContain("QuickCalcEngine.ts");
      expect(line).toContain("L");
    });

    it("handles missing files gracefully", () => {
      const line = digest.oneLiner("/missing/file.ts");
      expect(line).toContain("not found");
    });
  });

  describe("batchDigest", () => {
    it("digests multiple files into compact block", () => {
      const files = [
        join(enginesDir, "QuickCalcEngine.ts"),
        join(enginesDir, "ToolRouterEngine.ts"),
        join(enginesDir, "OutputBudgetEngine.ts"),
      ];
      const block = digest.batchDigest(files);
      const lines = block.split("\n");
      expect(lines.length).toBe(3);
      lines.forEach(line => expect(line).toContain("|"));
    });
  });
});
