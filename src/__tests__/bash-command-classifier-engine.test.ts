import { describe, it, expect, beforeEach } from "vitest";
import { BashCommandClassifierEngine } from "../engines/BashCommandClassifierEngine.js";

describe("BashCommandClassifierEngine", () => {
  let engine: BashCommandClassifierEngine;

  beforeEach(() => {
    engine = new BashCommandClassifierEngine();
  });

  describe("classify", () => {
    it("classifies grep as search with Grep alternative", () => {
      const r = engine.classify("grep -r 'foo' src/");
      expect(r.category).toBe("search");
      expect(r.alternative?.name).toBe("Grep");
      expect(r.wasteRisk).not.toBe("none");
    });

    it("classifies cat as read with Read alternative", () => {
      const r = engine.classify("cat package.json");
      expect(r.category).toBe("read");
      expect(r.alternative?.name).toBe("Read");
    });

    it("classifies sed as edit with Edit alternative", () => {
      const r = engine.classify("sed -i 's/foo/bar/' file.ts");
      expect(r.category).toBe("edit");
      expect(r.alternative?.name).toBe("Edit");
    });

    it("classifies esbuild as build with prism-build.sh alternative", () => {
      const r = engine.classify("node esbuild src/index.ts --bundle --platform=node");
      expect(r.category).toBe("build");
      expect(r.alternative?.name).toBe("prism-build.sh");
    });

    it("classifies vitest as test with /test alternative", () => {
      const r = engine.classify("npx vitest run src/__tests__/foo.test.ts");
      expect(r.category).toBe("test");
      expect(r.alternative?.name).toBe("/test");
    });

    it("classifies grep -c | sort as count with prism-scan.sh detail", () => {
      const r = engine.classify('grep -r "as any" src/ -c | sort -t: -k2 -nr');
      expect(r.category).toBe("count");
      expect(r.alternative?.name).toBe("prism-scan.sh detail");
    });

    it("classifies grep | wc -l as count with prism-scan.sh", () => {
      const r = engine.classify('grep -r "TODO" src/ --include="*.ts" | wc -l');
      expect(r.category).toBe("count");
      expect(r.alternative?.name).toBe("prism-scan.sh");
    });

    it("classifies compound cd && grep | wc as compound/count", () => {
      const r = engine.classify('cd /c/PRISM/mcp-server && grep -r "as any" src/ | wc -l');
      expect(r.category).toBe("count");
      expect(r.alternative).not.toBeNull();
    });

    it("classifies git status as git", () => {
      const r = engine.classify("git status");
      expect(r.category).toBe("git");
      expect(r.wasteRisk).toBe("none");
    });

    it("classifies npm install as install", () => {
      const r = engine.classify("npm install lodash");
      expect(r.category).toBe("install");
    });

    it("classifies find as search with Glob alternative", () => {
      const r = engine.classify("find . -name '*.ts' -type f");
      expect(r.category).toBe("search");
      expect(r.alternative?.name).toBe("Glob");
    });

    it("classifies ls as inspect", () => {
      const r = engine.classify("ls -la /c/PRISM/");
      expect(r.category).toBe("inspect");
    });

    it("classifies running a .sh script", () => {
      const r = engine.classify("bash ~/.claude/hooks/lib/prism-scan.sh 'TODO'");
      expect(r.category).toBe("script");
    });

    it("classifies unknown commands as other", () => {
      const r = engine.classify("whoami");
      expect(r.category).toBe("other");
      expect(r.wasteRisk).toBe("none");
    });

    it("truncates long commands in output", () => {
      const longCmd = "grep -r " + "a".repeat(100) + " src/";
      const r = engine.classify(longCmd);
      expect(r.command.length).toBeLessThanOrEqual(80);
      expect(r.command).toContain("...");
    });
  });

  describe("report", () => {
    it("generates session report from history", () => {
      engine.classify("grep -r 'foo' src/");
      engine.classify("cat file.ts");
      engine.classify("git status");
      engine.classify("npx vitest run foo.test.ts");

      const report = engine.report();
      expect(report.commands).toHaveLength(4);
      expect(report.totalEstimatedTokens).toBeGreaterThan(0);
      expect(report.topCategories.length).toBeGreaterThan(0);
      expect(report.totalSaveable).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("returns empty report with no history", () => {
      const report = engine.report();
      expect(report.commands).toHaveLength(0);
      expect(report.totalEstimatedTokens).toBe(0);
    });

    it("ranks top categories by token cost", () => {
      engine.classify("npx vitest run a.test.ts");
      engine.classify("npx vitest run b.test.ts");
      engine.classify("git status");

      const report = engine.report();
      expect(report.topCategories[0].category).toBe("test");
    });
  });

  describe("reset", () => {
    it("clears history", () => {
      engine.classify("grep foo bar");
      expect(engine.count).toBe(1);
      engine.reset();
      expect(engine.count).toBe(0);
    });
  });
});
