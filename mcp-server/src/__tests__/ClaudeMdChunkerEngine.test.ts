/**
 * ClaudeMdChunkerEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U05.
 *
 * Verifies the engine that splits CLAUDE.md by `##` headings into
 * per-section vault files for vector indexing.
 *
 * Coverage:
 *   - Happy path: 3-section doc → 3 chunk files + frontmatter check
 *   - Preamble preservation: text before first `##` becomes _preamble
 *   - Idempotency: rerun skips every file
 *   - Hash drift: edit one section, rerun rewrites that one only
 *   - Slug collision: two `## Same Title` sections deduped via -2 suffix
 *   - Slugify: emoji prefixes, special chars, capitalization, length cap
 *   - Source tags: 'global' vs 'project' produce different filenames
 *   - Source missing: ok=false, errors populated, no crash
 *   - Empty file: 0 sections found, ok=true
 *   - Embed callback: invoked per new file, failure isolated
 *   - Adversarial: very long heading (>80 chars), unicode, no headings at all
 *   - Variability: 3+ spanning shapes (preamble-only, single-section, many-section)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ClaudeMdChunkerEngine } from "../engines/ClaudeMdChunkerEngine.js";

function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `prism-claudemd-${prefix}-`));
}

describe("ClaudeMdChunkerEngine", () => {
  let sourcePath: string;
  let vaultRoot: string;
  const engine = new ClaudeMdChunkerEngine();

  beforeEach(() => {
    const tmp = mkTmp("src");
    sourcePath = path.join(tmp, "CLAUDE.md");
    vaultRoot = mkTmp("vault");
  });

  afterEach(() => {
    for (const d of [path.dirname(sourcePath), vaultRoot]) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it("splits a 3-section doc into 3 chunk files with required frontmatter", async () => {
    fs.writeFileSync(sourcePath, [
      "# CLAUDE.md",
      "Top intro.",
      "",
      "## Setup",
      "Setup body.",
      "",
      "## Deployment",
      "Deploy body.",
      "",
      "## Conventions",
      "Conv body.",
    ].join("\n"));

    const r = await engine.chunk({ sourcePath, sourceTag: "project", vaultRoot });
    expect(r.ok).toBe(true);
    expect(r.sectionsFound).toBe(4);
    expect(r.filesWritten).toBe(4);
    expect(r.filesFailed).toBe(0);

    for (const slug of ["preamble", "setup", "deployment", "conventions"]) {
      const f = path.join(vaultRoot, `project-${slug}.md`);
      expect(fs.existsSync(f)).toBe(true);
      const content = fs.readFileSync(f, "utf-8");
      expect(content.startsWith("---\n")).toBe(true);
      expect(content).toContain("source: project");
      expect(content).toContain(`slug: ${slug}`);
      expect(content).toContain("mirror_engine: ClaudeMdChunkerEngine");
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      expect(fm).not.toBeNull();
      expect(fm![1]).toMatch(/content_hash: [a-f0-9]{64}/);
    }
    const setup = fs.readFileSync(path.join(vaultRoot, "project-setup.md"), "utf-8");
    expect(setup).toContain("Setup body.");
  });

  it("preserves preamble text (before first ##) as _preamble section", async () => {
    fs.writeFileSync(sourcePath, [
      "# CLAUDE.md",
      "",
      "Body line 1",
      "Body line 2",
      "",
      "## First section",
      "first body",
    ].join("\n"));

    const r = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    expect(r.sectionsFound).toBe(2);
    const pre = fs.readFileSync(path.join(vaultRoot, "global-preamble.md"), "utf-8");
    expect(pre).toContain("section: _preamble");
    expect(pre).toContain("Body line 1");
    expect(pre).toContain("Body line 2");
    expect(pre).toContain("# CLAUDE.md");
    expect(pre).not.toContain("first body");
  });

  it("is idempotent: rerun with no source change skips every file", async () => {
    fs.writeFileSync(sourcePath, [
      "## A",
      "body a",
      "## B",
      "body b",
    ].join("\n"));

    const first = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    expect(first.filesWritten).toBe(2);
    expect(first.filesSkipped).toBe(0);

    const second = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    expect(second.filesWritten).toBe(0);
    expect(second.filesSkipped).toBe(2);
  });

  it("hash drift on one section rewrites only that file", async () => {
    fs.writeFileSync(sourcePath, ["## A", "v1", "## B", "v1"].join("\n"));
    await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });

    fs.writeFileSync(sourcePath, ["## A", "v2 NEW", "## B", "v1"].join("\n"));
    const r = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    expect(r.filesWritten).toBe(1);
    expect(r.filesSkipped).toBe(1);
    expect(fs.readFileSync(path.join(vaultRoot, "global-a.md"), "utf-8")).toContain("v2 NEW");
  });

  it("slug collisions are deduped with -2, -3 suffix", async () => {
    fs.writeFileSync(sourcePath, [
      "## Setup",
      "first setup",
      "## Setup",
      "second setup",
      "## Setup",
      "third setup",
    ].join("\n"));

    const r = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    expect(r.sectionsFound).toBe(3);
    expect(fs.existsSync(path.join(vaultRoot, "global-setup.md"))).toBe(true);
    expect(fs.existsSync(path.join(vaultRoot, "global-setup-2.md"))).toBe(true);
    expect(fs.existsSync(path.join(vaultRoot, "global-setup-3.md"))).toBe(true);
    const a = fs.readFileSync(path.join(vaultRoot, "global-setup.md"), "utf-8");
    const b = fs.readFileSync(path.join(vaultRoot, "global-setup-2.md"), "utf-8");
    const c = fs.readFileSync(path.join(vaultRoot, "global-setup-3.md"), "utf-8");
    expect(a).toContain("first setup");
    expect(b).toContain("second setup");
    expect(c).toContain("third setup");
  });

  it("slugify strips emoji and special chars, lowercases, trims length", () => {
    expect(engine.slugify("🔥 EXPERT ROLE (ALWAYS ACTIVE)")).toBe("expert-role-always-active");
    expect(engine.slugify("Setup & Deploy / Run!!")).toBe("setup-deploy-run");
    expect(engine.slugify("a".repeat(200)).length).toBe(80);
    expect(engine.slugify("")).toBe("section");
    expect(engine.slugify("!!!")).toBe("section");
  });

  it("different source tags produce non-colliding filenames", async () => {
    fs.writeFileSync(sourcePath, ["## Same", "body"].join("\n"));
    const r1 = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    const r2 = await engine.chunk({ sourcePath, sourceTag: "project", vaultRoot });
    expect(r1.filesWritten).toBe(1);
    expect(r2.filesWritten).toBe(1);
    expect(fs.existsSync(path.join(vaultRoot, "global-same.md"))).toBe(true);
    expect(fs.existsSync(path.join(vaultRoot, "project-same.md"))).toBe(true);
    const g = fs.readFileSync(path.join(vaultRoot, "global-same.md"), "utf-8");
    const p = fs.readFileSync(path.join(vaultRoot, "project-same.md"), "utf-8");
    expect(g).toContain("source: global");
    expect(p).toContain("source: project");
  });

  it("missing source file returns ok=false with error, no crash", async () => {
    const r = await engine.chunk({ sourcePath: "/no/such/CLAUDE.md", sourceTag: "global", vaultRoot });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].error).toMatch(/source missing/);
    expect(r.filesWritten).toBe(0);
  });

  it("empty source file: 0 sections, ok=true", async () => {
    fs.writeFileSync(sourcePath, "");
    const r = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    expect(r.ok).toBe(true);
    expect(r.sectionsFound).toBe(0);
    expect(r.filesWritten).toBe(0);
  });

  it("source with no ## headings gets a single _preamble chunk", async () => {
    fs.writeFileSync(sourcePath, "Just a flat doc with no headings\nLine 2\nLine 3");
    const r = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    expect(r.ok).toBe(true);
    expect(r.sectionsFound).toBe(1);
    const pre = fs.readFileSync(path.join(vaultRoot, "global-preamble.md"), "utf-8");
    expect(pre).toContain("section: _preamble");
    expect(pre).toContain("Line 2");
    expect(pre).toContain("Line 3");
  });

  it("embed callback invoked per newly-written chunk", async () => {
    fs.writeFileSync(sourcePath, ["## A", "body a", "## B", "body b"].join("\n"));
    const calls: string[] = [];
    const r = await engine.chunk({
      sourcePath, sourceTag: "global", vaultRoot,
      embed: (info) => { calls.push(info.section); },
    });
    expect(r.embedAttempts).toBe(2);
    expect(r.embedSuccesses).toBe(2);
    expect(calls.sort()).toEqual(["A", "B"]);
  });

  it("embed failure is isolated and does not break canonical write", async () => {
    fs.writeFileSync(sourcePath, ["## A", "body a"].join("\n"));
    const r = await engine.chunk({
      sourcePath, sourceTag: "global", vaultRoot,
      embed: () => { throw new Error("qdrant down"); },
    });
    expect(r.filesWritten).toBe(1);
    expect(r.embedAttempts).toBe(1);
    expect(r.embedSuccesses).toBe(0);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].error).toMatch(/qdrant down/);
  });

  it("dry-run plans without writing", async () => {
    fs.writeFileSync(sourcePath, ["## A", "body a"].join("\n"));
    const r = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot, dryRun: true });
    expect(r.filesWritten).toBe(1);
    const written = fs.existsSync(vaultRoot)
      ? fs.readdirSync(vaultRoot).filter((f) => f.endsWith(".md"))
      : [];
    expect(written).toHaveLength(0);
  });

  it("very long heading truncates slug at 80 chars", async () => {
    fs.writeFileSync(sourcePath, [
      "## " + "verylongword ".repeat(20),
      "body",
    ].join("\n"));
    const r = await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    expect(r.filesWritten).toBe(1);
    const files = fs.readdirSync(vaultRoot).filter((f) => f.startsWith("global-verylongword"));
    expect(files.length).toBe(1);
    const slug = files[0].replace(/^global-/, "").replace(/\.md$/, "");
    expect(slug.length).toBe(80);
    expect(slug.startsWith("verylongword")).toBe(true);
  });

  it("variability: chunks 3 distinct doc shapes correctly", async () => {
    const v = mkTmp("variability");
    try {
      // shape 1: preamble only
      const a = path.join(v, "a.md");
      fs.writeFileSync(a, "header only\nno sections here");
      const ra = await engine.chunk({ sourcePath: a, sourceTag: "x", vaultRoot });
      expect(ra.sectionsFound).toBe(1);

      // shape 2: single ## section
      const b = path.join(v, "b.md");
      fs.writeFileSync(b, "## Lone\nbody");
      const rb = await engine.chunk({ sourcePath: b, sourceTag: "y", vaultRoot });
      expect(rb.sectionsFound).toBe(1);

      // shape 3: 5+ sections + preamble
      const c = path.join(v, "c.md");
      fs.writeFileSync(c, "intro\n## S1\nb\n## S2\nb\n## S3\nb\n## S4\nb\n## S5\nb");
      const rc = await engine.chunk({ sourcePath: c, sourceTag: "z", vaultRoot });
      expect(rc.sectionsFound).toBe(6);
    } finally {
      fs.rmSync(v, { recursive: true, force: true });
    }
  });

  it("CRLF line endings produce same hash as LF", () => {
    const a = engine.hashContent("## H\nbody\n");
    const b = engine.hashContent("## H\r\nbody\r\n");
    expect(a).toBe(b);
  });

  it("extractContentHash returns the chunked hash for engine output", async () => {
    fs.writeFileSync(sourcePath, "## A\nbody a");
    await engine.chunk({ sourcePath, sourceTag: "global", vaultRoot });
    const out = fs.readFileSync(path.join(vaultRoot, "global-a.md"), "utf-8");
    const expected = engine.hashContent("## A\nbody a");
    expect(engine.extractContentHash(out)).toBe(expected);
  });

  it("extractContentHash returns null for non-frontmatter content", () => {
    expect(engine.extractContentHash("# heading only")).toBe(null);
    expect(engine.extractContentHash("---\nfoo: bar\n---\nbody")).toBe(null);
  });
});
