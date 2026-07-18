import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { DiffTokenEstimatorEngine, parseNumstatOutput } from "../engines/DiffTokenEstimatorEngine.js";

describe("DiffTokenEstimatorEngine", () => {
  const engine = new DiffTokenEstimatorEngine();

  // parseNumstatOutput is the pure core of the large-diff fallback (the path that
  // fires when `git diff` exceeds maxBuffer on a big working tree). Deterministic
  // reference-value tests here — the live-git methods exercise it on real output.
  describe("parseNumstatOutput", () => {
    it("parses normal numstat lines into per-file add/delete counts + token estimate", () => {
      // EST_CHARS_PER_LINE=40, CHARS_PER_TOKEN=4 → tokens = ceil((add+del)*40/4) = (add+del)*10
      const out = "10\t5\tsrc/a.ts\n3\t2\tsrc/b.ts\n";
      const r = parseNumstatOutput(out);
      expect(r.additions).toBe(13);
      expect(r.deletions).toBe(7);
      expect(r.perFile).toHaveLength(2);
      // sorted by tokens desc → a.ts (15 lines → 150 tokens) before b.ts (5 lines → 50 tokens)
      expect(r.perFile[0]).toEqual({ file: "src/a.ts", tokens: 150, additions: 10, deletions: 5 });
      expect(r.perFile[1]).toEqual({ file: "src/b.ts", tokens: 50, additions: 3, deletions: 2 });
      expect(r.totalTokens).toBe(200);
    });

    it("treats a binary file ('-\\t-') as zero add/delete/tokens but still a changed file", () => {
      const r = parseNumstatOutput("-\t-\tassets/logo.png\n8\t0\tsrc/c.ts\n");
      const bin = r.perFile.find((f) => f.file === "assets/logo.png")!;
      expect(bin).toEqual({ file: "assets/logo.png", tokens: 0, additions: 0, deletions: 0 });
      expect(r.perFile).toHaveLength(2);          // binary file is still counted
      expect(r.additions).toBe(8);                // only the text file contributes
      expect(r.deletions).toBe(0);
    });

    it("returns an empty result for empty / non-numstat input (no false files)", () => {
      expect(parseNumstatOutput("")).toEqual({ perFile: [], additions: 0, deletions: 0, totalTokens: 0 });
      // garbage / header lines that are not `<n>\\t<n>\\t<path>` are ignored
      expect(parseNumstatOutput("not a numstat line\n\n  \n").perFile).toHaveLength(0);
    });

    it("sorts per-file by descending token estimate (largest diff first)", () => {
      const r = parseNumstatOutput("1\t1\tsmall.ts\n50\t50\thuge.ts\n10\t10\tmid.ts\n");
      expect(r.perFile.map((f) => f.file)).toEqual(["huge.ts", "mid.ts", "small.ts"]);
      expect(r.totalTokens).toBe(r.perFile.reduce((s, f) => s + f.tokens, 0));
    });
  });

  // Contract invariant that holds across ALL code paths (full-diff analyze, numstat
  // fallback, and the empty estimate): perFile.length always equals filesChanged.
  describe("estimateUncommitted contract", () => {
    it("perFile.length === filesChanged and recommendation is valid (any tree state)", () => {
      const est = engine.estimateUncommitted();
      expect(est.perFile.length).toBe(est.filesChanged);
      expect(["inline", "summarize", "skip"]).toContain(est.recommendation);
      expect(est.totalTokens).toBeGreaterThanOrEqual(0);
    });
  });

  // Regression lock for the numstat-fallback bug caught in review: execFileSync does NOT
  // resolve a bare "git" via PATH on Windows (throws ENOENT), so BOTH the primary diff and
  // the --numstat fallback must spawn the resolved GIT_BIN. The behavioral invariant above
  // cannot catch a bare-"git" fallback (it passes at 0===0 when the fallback dies), so pin
  // it structurally: zero bare-"git" spawns, both call sites via GIT_BIN.
  describe("git binary resolution (no bare-'git' spawn)", () => {
    it("every execFileSync spawns the resolved GIT_BIN, never a bare 'git'", () => {
      const src = readFileSync(new URL("../engines/DiffTokenEstimatorEngine.ts", import.meta.url), "utf-8");
      const bareGitCount = (src.match(/execFileSync\(\s*["']git["']/g) ?? []).length;
      const gitBinCount = (src.match(/execFileSync\(\s*GIT_BIN\b/g) ?? []).length;
      expect(bareGitCount).toBe(0);   // a bare "git" would ENOENT under execFileSync on Windows
      expect(gitBinCount).toBe(2);    // primary `git diff` + `git diff --numstat` fallback
    });
  });

  describe("estimateLastCommits", () => {
    it("estimates token cost of last commit", () => {
      const est = engine.estimateLastCommits(1);
      expect(est).toHaveProperty("totalTokens");
      expect(est).toHaveProperty("additions");
      expect(est).toHaveProperty("deletions");
      expect(est).toHaveProperty("filesChanged");
      expect(est).toHaveProperty("recommendation");
      expect(est.totalTokens).toBeGreaterThanOrEqual(0);
    });

    it("estimates multiple commits", () => {
      const est = engine.estimateLastCommits(3);
      expect(est.totalTokens).toBeGreaterThanOrEqual(0);
    });
  });

  describe("estimateUncommitted", () => {
    it("returns estimate for uncommitted changes", () => {
      const est = engine.estimateUncommitted();
      expect(est).toHaveProperty("totalTokens");
      expect(est).toHaveProperty("recommendation");
      expect(["inline", "summarize", "skip"]).toContain(est.recommendation);
    });
  });

  describe("estimateStaged", () => {
    it("returns estimate for staged changes", () => {
      const est = engine.estimateStaged();
      expect(est).toHaveProperty("totalTokens");
    });
  });

  describe("getCompactSummary", () => {
    it("returns compact string", () => {
      const est = engine.estimateLastCommits(1);
      const summary = engine.getCompactSummary(est);
      expect(typeof summary).toBe("string");
      expect(summary).toContain("files");
      expect(summary).toContain("tokens");
    });
  });

  describe("estimateBetween", () => {
    it("estimates between refs", () => {
      const est = engine.estimateBetween("HEAD~2", "HEAD");
      expect(est.totalTokens).toBeGreaterThanOrEqual(0);
      expect(est.perFile).toBeDefined();
      if (est.filesChanged > 0) {
        expect(est.perFile[0]).toHaveProperty("file");
        expect(est.perFile[0]).toHaveProperty("tokens");
      }
    });
  });
});
