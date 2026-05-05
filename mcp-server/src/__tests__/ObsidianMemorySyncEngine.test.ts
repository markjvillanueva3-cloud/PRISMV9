/**
 * ObsidianMemorySyncEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U01.
 *
 * Verifies the Stop-hook engine that mirrors `~/.claude/projects/H--PRISM/memory/`
 * into the H-drive PRISM vault. Tests cover:
 *   - vault file count grows after first sync (exit condition #2 of P1-U01)
 *   - idempotency: rerun with no source change does not rewrite files
 *   - hash-based change detection: edited source triggers rewrite
 *   - frontmatter wrapping: source frontmatter stripped, mirror frontmatter added
 *   - dry-run mode: plans without writing
 *   - missing source dir: returns empty result, never throws
 *   - subfolders: recursive walk
 *   - log line: wiki log gets one line per non-empty sync
 *   - obsidian vault mirror: optional second copy works
 *   - unicode + Windows line endings round-trip cleanly
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ObsidianMemorySyncEngine } from "../engines/ObsidianMemorySyncEngine.js";

function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `prism-mem-sync-${prefix}-`));
}

function writeMd(dir: string, name: string, body: string): string {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body, "utf-8");
  return p;
}

describe("ObsidianMemorySyncEngine", () => {
  let sourceDir: string;
  let vaultRoot: string;
  let logPath: string;
  const engine = new ObsidianMemorySyncEngine();

  beforeEach(() => {
    sourceDir = mkTmp("src");
    vaultRoot = mkTmp("vault");
    logPath = path.join(mkTmp("log"), "log.md");
  });

  afterEach(() => {
    for (const d of [sourceDir, vaultRoot, path.dirname(logPath)]) {
      try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  });

  it("returns empty result when source dir does not exist", () => {
    const r = engine.sync({ sourceDir: "/no/such/dir", vaultRoot, wikiLogPath: logPath });
    expect(r.ok).toBe(true);
    expect(r.filesScanned).toBe(0);
    expect(r.filesMirrored).toBe(0);
    expect(r.errors).toHaveLength(0);
  });

  it("vault file count grows after first sync (exit condition #2 of P1-U01)", () => {
    writeMd(sourceDir, "feedback_a.md", "# A\nrule a");
    writeMd(sourceDir, "feedback_b.md", "# B\nrule b");
    writeMd(sourceDir, "user_role.md", "# role\ndev");

    const before = fs.existsSync(vaultRoot) ? fs.readdirSync(vaultRoot).length : 0;
    const r = engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath });
    const after = fs.readdirSync(vaultRoot).filter((f) => f.endsWith(".md")).length;

    expect(r.ok).toBe(true);
    expect(r.filesScanned).toBe(3);
    expect(r.filesMirrored).toBe(3);
    expect(r.filesSkipped).toBe(0);
    expect(after).toBeGreaterThan(before);
    expect(after).toBe(3);
  });

  it("is idempotent: rerunning with no source change skips every file", () => {
    writeMd(sourceDir, "a.md", "# A\nrule");
    writeMd(sourceDir, "b.md", "# B\nrule");

    const first = engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath });
    expect(first.filesMirrored).toBe(2);

    const second = engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath });
    expect(second.filesScanned).toBe(2);
    expect(second.filesMirrored).toBe(0);
    expect(second.filesSkipped).toBe(2);
  });

  it("rewrites a mirror when source content changes", () => {
    const src = writeMd(sourceDir, "feedback.md", "# v1\nold");
    engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath });

    const mirroredV1 = fs.readFileSync(path.join(vaultRoot, "feedback.md"), "utf-8");
    expect(mirroredV1).toContain("old");

    fs.writeFileSync(src, "# v2\nbrand new content", "utf-8");
    const r2 = engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath });
    expect(r2.filesMirrored).toBe(1);
    expect(r2.filesSkipped).toBe(0);

    const mirroredV2 = fs.readFileSync(path.join(vaultRoot, "feedback.md"), "utf-8");
    expect(mirroredV2).toContain("brand new content");
    expect(mirroredV2).not.toContain("old");
  });

  it("strips source frontmatter and adds mirror frontmatter", () => {
    writeMd(
      sourceDir,
      "user_role.md",
      "---\nname: role\ntype: user\n---\n\n# Role\nMark is a CNC programmer.",
    );

    engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath });

    const out = fs.readFileSync(path.join(vaultRoot, "user_role.md"), "utf-8");

    // Mirror frontmatter present
    expect(out).toMatch(/^---\n/);
    expect(out).toContain("kind: mirrored_memory");
    expect(out).toContain("schema_version: 1.0.0");
    expect(out).toContain("content_hash:");
    expect(out).toContain("mirror_engine: ObsidianMemorySyncEngine");

    // Source body present, source frontmatter stripped
    expect(out).toContain("# Role");
    expect(out).toContain("CNC programmer");
    expect(out).not.toContain("name: role");
    expect(out).not.toContain("type: user");

    // Exactly one frontmatter block
    const fences = out.match(/^---\s*$/gm) ?? [];
    expect(fences.length).toBe(2);
  });

  it("dry-run mode plans but writes nothing", () => {
    writeMd(sourceDir, "a.md", "# A\nrule");
    writeMd(sourceDir, "b.md", "# B\nrule");

    const r = engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath, dryRun: true });
    expect(r.filesMirrored).toBe(2);

    // Vault should still be empty — dry-run doesn't touch disk
    const vaultFiles = fs.existsSync(vaultRoot)
      ? fs.readdirSync(vaultRoot).filter((f) => f.endsWith(".md"))
      : [];
    expect(vaultFiles).toHaveLength(0);
    expect(fs.existsSync(logPath)).toBe(false);
  });

  it("recursively walks subdirectories", () => {
    writeMd(sourceDir, "feedback/feedback_a.md", "# A");
    writeMd(sourceDir, "project/project_x.md", "# X");
    writeMd(sourceDir, "user_role.md", "# role");

    const r = engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath });
    expect(r.filesScanned).toBe(3);
    expect(r.filesMirrored).toBe(3);

    expect(fs.existsSync(path.join(vaultRoot, "feedback", "feedback_a.md"))).toBe(true);
    expect(fs.existsSync(path.join(vaultRoot, "project", "project_x.md"))).toBe(true);
    expect(fs.existsSync(path.join(vaultRoot, "user_role.md"))).toBe(true);
  });

  it("appends one log line per non-empty sync", () => {
    writeMd(sourceDir, "a.md", "# A");
    engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath, logTag: "test_sync" });

    expect(fs.existsSync(logPath)).toBe(true);
    const log = fs.readFileSync(logPath, "utf-8");
    expect(log).toMatch(/^## \[\d{4}-\d{2}-\d{2}\] test_sync \| scanned:1 mirrored:1/m);
  });

  it("does not log when source dir is empty", () => {
    const r = engine.sync({ sourceDir, vaultRoot, wikiLogPath: logPath });
    expect(r.filesScanned).toBe(0);
    expect(fs.existsSync(logPath)).toBe(false);
  });

  it("optionally mirrors into an Obsidian vault as a second copy", () => {
    const obVault = mkTmp("obvault");
    try {
      writeMd(sourceDir, "a.md", "# A\nrule");

      const r = engine.sync({
        sourceDir, vaultRoot, wikiLogPath: logPath,
        obsidianVaultRoot: obVault,
      });

      expect(r.filesMirrored).toBe(1);
      expect(r.obsidianMirrored).toBe(1);
      expect(fs.existsSync(path.join(obVault, "PRISM", "memories", "a.md"))).toBe(true);
    } finally {
      fs.rmSync(obVault, { recursive: true, force: true });
    }
  });

  it("Obsidian mirror failure does not break canonical sync", () => {
    writeMd(sourceDir, "a.md", "# A");
    // Pass an Obsidian path that contains a NUL byte — guaranteed to fail on every fs.
    const r = engine.sync({
      sourceDir, vaultRoot, wikiLogPath: logPath,
      obsidianVaultRoot: "C:\\does\\not\\exist\0bad",
    });
    expect(r.filesMirrored).toBe(1);
    expect(r.obsidianMirrored).toBe(0);
    expect(r.ok).toBe(true);
  });

  it("hashContent normalizes CRLF and trailing whitespace", () => {
    expect(engine.hashContent("hello\nworld\n")).toBe(engine.hashContent("hello\r\nworld\r\n"));
    expect(engine.hashContent("hello\nworld")).toBe(engine.hashContent("hello\nworld   "));
  });

  it("extractContentHash returns null for non-frontmatter content", () => {
    expect(engine.extractContentHash("# just a heading\n")).toBeNull();
    expect(engine.extractContentHash("---\nfoo: bar\n---\nbody")).toBeNull();
  });

  it("extractContentHash returns the hash from frontmatter", () => {
    const sample = "---\nschema_version: 1.0.0\ncontent_hash: deadbeef1234\nmirror_ts: 2026-01-01T00:00:00Z\n---\nbody";
    expect(engine.extractContentHash(sample)).toBe("deadbeef1234");
  });

  it("listMarkdown ignores non-md files", () => {
    writeMd(sourceDir, "keep.md", "x");
    fs.writeFileSync(path.join(sourceDir, "ignore.txt"), "x", "utf-8");
    fs.writeFileSync(path.join(sourceDir, "ignore.json"), "{}", "utf-8");
    const list = engine.listMarkdown(sourceDir);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatch(/keep\.md$/);
  });
});
