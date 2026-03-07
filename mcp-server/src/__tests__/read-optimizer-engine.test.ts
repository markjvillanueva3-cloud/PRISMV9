import { describe, it, expect } from "vitest";
import { ReadOptimizerEngine } from "../engines/ReadOptimizerEngine.js";
import * as path from "path";

describe("ReadOptimizerEngine", () => {
  const engine = new ReadOptimizerEngine();

  describe("recommend", () => {
    it("skips node_modules files", () => {
      const rec = engine.recommend("/project/node_modules/foo/index.js");
      expect(rec.strategy).toBe("skip");
    });

    it("skips lock files", () => {
      const rec = engine.recommend("/project/package-lock.json");
      expect(rec.strategy).toBe("skip");
    });

    it("skips minified files", () => {
      const rec = engine.recommend("/project/dist/bundle.min.js");
      expect(rec.strategy).toBe("skip");
    });

    it("recommends grep for known large files with intent", () => {
      const rec = engine.recommend("C:/PRISM/mcp-server/src/engines/index.ts", "export.*Engine");
      expect(rec.strategy).toBe("grep");
      expect(rec.params).toBeDefined();
    });

    it("recommends digest for known large files without intent", () => {
      const rec = engine.recommend("C:/PRISM/mcp-server/src/engines/index.ts");
      expect(rec.strategy).toBe("digest");
    });

    it("returns full for nonexistent files", () => {
      const rec = engine.recommend("/nonexistent/file.ts");
      expect(rec.strategy).toBe("full");
    });

    it("recommends full read for small real files", () => {
      // Use this test file itself — known to be small
      const thisFile = path.resolve(__dirname, "read-optimizer-engine.test.ts");
      const rec = engine.recommend(thisFile);
      expect(rec.strategy).toBe("full");
      expect(rec.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe("oneLiner", () => {
    it("returns compact recommendation", () => {
      const line = engine.oneLiner("/project/node_modules/foo.js");
      expect(line).toContain("SKIP");
    });
  });

  describe("batchRecommend", () => {
    it("recommends for multiple files", () => {
      const recs = engine.batchRecommend([
        "/project/node_modules/a.js",
        "/project/package-lock.json",
      ]);
      expect(recs.length).toBe(2);
      expect(recs.every(r => r.strategy === "skip")).toBe(true);
    });
  });

  describe("estimateBatchCost", () => {
    it("calculates savings for skip files", () => {
      const cost = engine.estimateBatchCost([
        "/project/node_modules/a.js",
        "/project/package-lock.json",
      ]);
      expect(cost.optimized).toBe(0);
    });
  });
});
