/**
 * PRISMContextInjectorEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / U-CODEX-COORD-FIX.
 *
 * Verifies the engine that builds budgeted PRISM context bundles for
 * external reasoners (Codex / Gemini / Grok / Ollama).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PRISMContextInjectorEngine } from "../engines/PRISMContextInjectorEngine.js";

function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `prism-ctx-inj-${prefix}-`));
}

describe("PRISMContextInjectorEngine", () => {
  let projectFile: string;
  let globalFile: string;
  let chunkDir: string;
  const engine = new PRISMContextInjectorEngine();

  beforeEach(() => {
    const root = mkTmp("root");
    projectFile = path.join(root, "AGENTS.md");
    globalFile = path.join(root, "GLOBAL_CLAUDE.md");
    chunkDir = path.join(root, "claude-md");
    fs.mkdirSync(chunkDir, { recursive: true });
  });

  afterEach(() => {
    try { fs.rmSync(path.dirname(projectFile), { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("returns empty bundle when every source path is missing", async () => {
    const r = await engine.buildContext("anything", {
      projectPath: "/no/such/proj.md",
      globalPath: "/no/such/global.md",
      chunkDir: "/no/such/chunks",
      modelBudget: 5_000,
    });
    expect(r.text).toBe("");
    expect(r.sources).toEqual([]);
    expect(r.totalChars).toBe(0);
    expect(r.modelBudget).toBe(5_000);
    expect(r.chunksUsed).toBe(0);
  });

  it("includes project AGENTS.md head when present", async () => {
    fs.writeFileSync(projectFile, "# PRISM Operating Playbook\nLine A\nLine B\n", "utf-8");
    const r = await engine.buildContext("kc1.1 steel", {
      projectPath: projectFile,
      globalPath: "/no/such",
      chunkDir,
      modelBudget: 10_000,
    });
    expect(r.text).toContain("PROJECT (AGENTS.md)");
    expect(r.text).toContain("Line A");
    expect(r.text).toContain("Line B");
    expect(r.sources).toContain("PROJECT (AGENTS.md)");
    expect(r.sources.length).toBeGreaterThanOrEqual(1);
  });

  it("truncates project file when it exceeds the project head budget", async () => {
    const huge = "X".repeat(10_000);
    fs.writeFileSync(projectFile, huge, "utf-8");
    const r = await engine.buildContext("anything", {
      projectPath: projectFile, globalPath: "/no/such", chunkDir, modelBudget: 10_000,
    });
    expect(r.text).toContain("[…truncated]");
    expect(r.text.length).toBeLessThan(huge.length);
    expect(r.text.length).toBeLessThanOrEqual(4_500);
  });

  it("captures only the preamble (before first ##) of global CLAUDE.md", async () => {
    fs.writeFileSync(globalFile, "# GLOBAL\nIntro text body.\n\n## HOOK GATES\nshould not appear", "utf-8");
    const r = await engine.buildContext("anything", {
      projectPath: "/no/such",
      globalPath: globalFile,
      chunkDir,
      modelBudget: 10_000,
    });
    expect(r.text).toContain("Intro text body");
    expect(r.text.includes("HOOK GATES")).toBe(false);
    expect(r.text.includes("should not appear")).toBe(false);
  });

  it("ranks safety chunk first when prompt is about kc1 steel constant", () => {
    fs.writeFileSync(path.join(chunkDir, "global-ai-routing.md"), [
      "---", "schema_version: 1.0.0", "source: global", "section: AI ROUTING", "slug: ai-routing", "---",
      "Default route Claude for reasoning. Ollama qwen for code summary.",
    ].join("\n"));
    fs.writeFileSync(path.join(chunkDir, "global-safety.md"), [
      "---", "schema_version: 1.0.0", "source: global", "section: SAFETY", "slug: safety", "---",
      "Never inline kc1 Kienzle steel constants. Import from constants only.",
    ].join("\n"));
    fs.writeFileSync(path.join(chunkDir, "global-jm-die.md"), [
      "---", "schema_version: 1.0.0", "source: global", "section: TEST SHOP", "slug: test-shop", "---",
      "JM Die is the canonical test shop. 21 machines.",
    ].join("\n"));

    const ranked = engine.rankChunks("kc1 steel constant", chunkDir, 5);
    expect(ranked.length).toBeGreaterThanOrEqual(1);
    expect(ranked[0].slug).toBe("safety");
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it("buildContext picks top-K chunks by relevance for the prompt", async () => {
    fs.writeFileSync(path.join(chunkDir, "global-irrelevant.md"), [
      "---", "schema_version: 1.0.0", "source: global", "section: ROUTING", "slug: routing", "---",
      "Toolpath generation uses CAM dispatcher.",
    ].join("\n"));
    fs.writeFileSync(path.join(chunkDir, "global-physics.md"), [
      "---", "schema_version: 1.0.0", "source: global", "section: PHYSICS", "slug: physics", "---",
      "Kienzle constants kc1 are 1800 for steel ISO group P. Cutting force prediction.",
    ].join("\n"));

    const r = await engine.buildContext("Kienzle steel cutting force", {
      projectPath: "/no/such",
      globalPath: "/no/such",
      chunkDir,
      modelBudget: 5_000,
    });
    expect(r.text).toContain("CHUNK physics (PHYSICS)");
    expect(r.text).toContain("Kienzle constants");
    expect(r.chunksUsed).toBeGreaterThanOrEqual(1);
  });

  it("respects the model budget — total chars stays under cap", async () => {
    fs.writeFileSync(projectFile, "P".repeat(20_000), "utf-8");
    fs.writeFileSync(globalFile, "G".repeat(20_000), "utf-8");
    for (let i = 0; i < 10; i++) {
      fs.writeFileSync(path.join(chunkDir, `c-${i}.md`), [
        "---", "schema_version: 1.0.0", "source: global", `section: SEC${i}`, `slug: sec-${i}`, "---",
        "matching matching matching " + "K".repeat(5_000),
      ].join("\n"));
    }
    const r = await engine.buildContext("matching content", {
      projectPath: projectFile, globalPath: globalFile, chunkDir, modelBudget: 6_000,
    });
    expect(r.text.length).toBeLessThanOrEqual(8_000);
    expect(r.modelBudget).toBe(6_000);
  });

  it("topK=0 returns no chunks even when files exist", async () => {
    fs.writeFileSync(path.join(chunkDir, "any.md"), "---\nslug: a\nsection: A\n---\nbody matching", "utf-8");
    const r = await engine.buildContext("body matching", {
      projectPath: "/no/such", globalPath: "/no/such", chunkDir, modelBudget: 5_000, topK: 0,
    });
    expect(r.chunksUsed).toBe(0);
    expect(r.sources.filter((s) => s.startsWith("CHUNK"))).toEqual([]);
  });

  it("rankChunks returns [] when chunkDir does not exist", () => {
    expect(engine.rankChunks("anything", "/no/such/dir", 5)).toEqual([]);
  });

  it("rankChunks returns [] when prompt has no tokenizable words", () => {
    fs.writeFileSync(path.join(chunkDir, "x.md"), "---\nslug: x\nsection: X\n---\nbody", "utf-8");
    expect(engine.rankChunks("a b c", chunkDir, 5)).toEqual([]);
  });

  it("scoring prefers more-overlapping chunks (variability across 3 docs)", () => {
    fs.writeFileSync(path.join(chunkDir, "a.md"), [
      "---", "slug: a", "section: A", "---", "kienzle steel constant kienzle kienzle",
    ].join("\n"));
    fs.writeFileSync(path.join(chunkDir, "b.md"), [
      "---", "slug: b", "section: B", "---", "kienzle steel only mentioned once",
    ].join("\n"));
    fs.writeFileSync(path.join(chunkDir, "c.md"), [
      "---", "slug: c", "section: C", "---", "completely different topic about lathes",
    ].join("\n"));
    const r = engine.rankChunks("kienzle steel constant", chunkDir, 3);
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r[0].slug).toBe("a");
    expect(r[1].slug).toBe("b");
    expect(r[0].score).toBeGreaterThan(r[1].score);
    expect(r.map((x) => x.slug).includes("c")).toBe(false);
  });

  it("handles unreadable chunks gracefully (skip + continue)", async () => {
    fs.writeFileSync(path.join(chunkDir, "good.md"), [
      "---", "slug: good", "section: G", "---", "matching kienzle text here",
    ].join("\n"));
    fs.mkdirSync(path.join(chunkDir, "broken.md"), { recursive: true });

    const r = await engine.buildContext("matching kienzle", {
      projectPath: "/no/such", globalPath: "/no/such", chunkDir, modelBudget: 5_000,
    });
    expect(r.text).toContain("matching kienzle text here");
    expect(r.chunksUsed).toBe(1);
  });

  it("buildContext is fail-open on global file read failure", async () => {
    fs.writeFileSync(projectFile, "project ok", "utf-8");
    fs.mkdirSync(path.join(chunkDir, "fakeglobal"), { recursive: true });
    const r = await engine.buildContext("anything", {
      projectPath: projectFile,
      globalPath: path.join(chunkDir, "fakeglobal"),
      chunkDir,
      modelBudget: 5_000,
    });
    expect(r.text).toContain("project ok");
  });

  it("custom modelBudget is reflected in the result envelope", async () => {
    const r = await engine.buildContext("anything", {
      projectPath: "/no/such", globalPath: "/no/such", chunkDir, modelBudget: 12_345,
    });
    expect(r.modelBudget).toBe(12_345);
  });

  it("default modelBudget when omitted is 24_000", async () => {
    const r = await engine.buildContext("anything", {
      projectPath: "/no/such", globalPath: "/no/such", chunkDir,
    });
    expect(r.modelBudget).toBe(24_000);
  });
});
