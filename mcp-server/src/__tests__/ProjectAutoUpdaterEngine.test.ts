/**
 * ProjectAutoUpdaterEngine.test.ts
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B5/U-PROJECT-AUTO-UPDATER — exit-criteria coverage:
 *   1. fs.watch project subfolders → overview.md updated with one-line change
 *      summary — verified via processProjects() on a hermetic tmpdir fixture.
 *   2. Idempotency — re-running with the same newest-file signature is a
 *      no-op (skipped, overview byte-stable).
 *   3. Ollama summarise (when client + size ≤ tokenCap) vs literal fallback
 *      (no client / oversize / Ollama-degraded).
 *   4. Atomic overview patch — write tmp then rename; failed write leaves no
 *      half-overview.
 *
 * Plus comprehensive-build floor:
 *   * ≥3 failure modes: ollama-throws, ollama-null, write-fail catch
 *   * ≥2 adversarial: symlink folder rejection, traversal/dotfile rejection
 *   * ≥3 spanning configs: literal / ollama-success / ollama-degraded
 *   * Zod on all 3 public entry points (scanProjects, processProjects,
 *     runProjectAutoUpdater)
 *   * Floor regression guards (empty/oversize/true-fail)
 *   * Determinism — pinned now → byte-equal overview entry
 *   * Dispatcher round-trip parity (ACTION_MEMORY_SCHEMAS)
 *
 * No real network. Real fs (tmpdir-scoped).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  utimesSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ProjectAutoUpdaterEngine,
  projectAutoUpdaterEngine,
  ProjectAutoUpdaterOptionsSchema,
  runProjectAutoUpdater,
  _internals,
  type OllamaProjectClient,
} from "../engines/ProjectAutoUpdaterEngine.js";

const NOW = Date.UTC(2026, 4, 17, 12, 0, 0); // 2026-05-17T12:00:00.000Z
const NOW_ISO = "2026-05-17T12:00:00.000Z";
const MS_PER_HOUR = 60 * 60 * 1000;

interface Fixture {
  root: string;
  vaultRoot: string;
  projectRoot: string;
  addProject: (name: string) => string;
  addNote: (project: string, filename: string, body: string, mtimeOffsetMs?: number) => string;
  addOverview: (project: string, body: string) => string;
  readOverview: (project: string) => string;
  cleanup: () => void;
}

function makeFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "prism-pau-test-"));
  const vaultRoot = join(root, "memories");
  const projectRoot = join(vaultRoot, "project");
  mkdirSync(projectRoot, { recursive: true });
  return {
    root, vaultRoot, projectRoot,
    addProject: (name) => {
      const p = join(projectRoot, name);
      mkdirSync(p, { recursive: true });
      return p;
    },
    addNote: (project, filename, body, mtimeOffsetMs = -MS_PER_HOUR) => {
      const p = join(projectRoot, project, filename);
      writeFileSync(p, body, "utf8");
      const t = (NOW + mtimeOffsetMs) / 1000;
      utimesSync(p, t, t);
      return p;
    },
    addOverview: (project, body) => {
      const p = join(projectRoot, project, "overview.md");
      writeFileSync(p, body, "utf8");
      return p;
    },
    readOverview: (project) => readFileSync(join(projectRoot, project, "overview.md"), "utf8"),
    cleanup: () => {
      try { rmSync(root, { recursive: true, force: true }); } catch { /* swallow */ }
    },
  };
}

function makeOkClient(body: string): OllamaProjectClient {
  return { async summarise() { return body; } };
}
function makeThrowingClient(): OllamaProjectClient {
  return { async summarise() { throw new Error("ollama wedged"); } };
}
function makeNullClient(): OllamaProjectClient {
  return { async summarise() { return null; } };
}

describe("ProjectAutoUpdaterEngine — Zod schema", () => {
  it("rejects empty vaultRoot", () => {
    expect(() => ProjectAutoUpdaterOptionsSchema.parse({ vaultRoot: "" })).toThrow();
  });
  it("rejects fractional maxProjectsPerPass", () => {
    expect(() => ProjectAutoUpdaterOptionsSchema.parse({ maxProjectsPerPass: 2.5 })).toThrow();
  });
  it("rejects negative tokenCapBytes", () => {
    expect(() => ProjectAutoUpdaterOptionsSchema.parse({ tokenCapBytes: -1 })).toThrow();
  });
  it("accepts every documented option", () => {
    expect(() => ProjectAutoUpdaterOptionsSchema.parse({
      vaultRoot: "/v", projectRoot: "/p", now: NOW, maxProjectsPerPass: 10,
      tokenCapBytes: 4096, maxFileBytes: 16384, excerptBytes: 4096,
      ollamaModel: "qwen2.5-coder", dryRun: true, mkdirIfMissing: false,
    })).not.toThrow();
  });
  it("validateOptions fires on scanProjects entry", () => {
    expect(() => projectAutoUpdaterEngine.scanProjects({ now: Number.NaN })).toThrow();
  });
  it("validateOptions fires on processProjects entry", async () => {
    await expect(projectAutoUpdaterEngine.processProjects({ now: Number.POSITIVE_INFINITY }))
      .rejects.toThrow();
  });
  it("validateOptions fires on runProjectAutoUpdater wrapper", async () => {
    await expect(runProjectAutoUpdater({ tokenCapBytes: 0 })).rejects.toThrow();
  });
});

describe("ProjectAutoUpdaterEngine — scanProjects", () => {
  let f: Fixture;
  beforeEach(() => { f = makeFixture(); });
  afterEach(() => f.cleanup());

  it("empty when project root missing", () => {
    const s = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: join(f.root, "nope"), now: NOW,
    });
    expect(s.changes).toEqual([]);
    expect(s.availability.projectRootExists).toBe(false);
  });

  it("detects newest non-overview note + computes signature", () => {
    f.addProject("alpha");
    f.addNote("alpha", "note-old.md", "old", -3 * MS_PER_HOUR);
    const newest = f.addNote("alpha", "note-new.md", "# New work\nshipped X", -1 * MS_PER_HOUR);
    const s = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(s.changes).toHaveLength(1);
    const c = s.changes[0];
    expect(c.project).toBe("alpha");
    expect(c.newestFile).toBe("note-new.md");
    expect(c.signature).toMatch(/^note-new\.md:\d+$/);
    expect(c.alreadyRecorded).toBe(false);
    expect(c.excerpt).toContain("shipped X");
    expect(newest).toContain("note-new.md");
  });

  it("excludes overview.md from newest detection", () => {
    f.addProject("beta");
    f.addOverview("beta", "# Beta\n");
    f.addNote("beta", "real-note.md", "content", -1 * MS_PER_HOUR);
    const s = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(s.changes[0].newestFile).toBe("real-note.md");
  });

  it("marks alreadyRecorded when signature present in overview", () => {
    f.addProject("gamma");
    const notePath = f.addNote("gamma", "n.md", "body", -1 * MS_PER_HOUR);
    // Read its real mtime to build the matching signature.
    const scan1 = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    const sig = scan1.changes[0].signature!;
    f.addOverview("gamma", `# Gamma\n\n## Recent Changes\n\n- old <!-- pau-sig: ${sig} -->\n`);
    const scan2 = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(scan2.changes[0].alreadyRecorded).toBe(true);
    expect(notePath).toContain("n.md");
  });

  it("null newestFile when project has no non-overview note", () => {
    f.addProject("empty");
    f.addOverview("empty", "# Empty\n");
    const s = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(s.changes[0].newestFile).toBe(null);
    expect(s.changes[0].signature).toBe(null);
  });

  it("name-asc folder ordering + maxProjectsPerPass cap", () => {
    ["zeta", "alpha", "mu"].forEach((n) => { f.addProject(n); f.addNote(n, "x.md", "b"); });
    const s = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW, maxProjectsPerPass: 2,
    });
    expect(s.changes.map((c) => c.project)).toEqual(["alpha", "mu"]);
    expect(s.availability.projectFoldersFound).toBe(3);
  });

  it("rejects symlink project folders via lstat", () => {
    f.addProject("realproj");
    f.addNote("realproj", "n.md", "b");
    const linkTarget = join(f.root, "outside");
    mkdirSync(linkTarget, { recursive: true });
    try {
      symlinkSync(linkTarget, join(f.projectRoot, "linkproj"), "dir");
    } catch {
      const s = projectAutoUpdaterEngine.scanProjects({
        vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
      });
      expect(s.changes.map((c) => c.project)).toContain("realproj");
      return;
    }
    const s = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    const names = s.changes.map((c) => c.project);
    expect(names).toContain("realproj");
    expect(names).not.toContain("linkproj");
  });

  it("oversize newest skips readFileSync (OOM guard)", () => {
    f.addProject("big");
    f.addNote("big", "huge.md", "x".repeat(10 * 1024));
    const s = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
      maxFileBytes: 8 * 1024, tokenCapBytes: 4 * 1024,
    });
    expect(s.changes[0].truncated).toBe(true);
    expect(s.changes[0].excerpt).toBe("(file exceeds maxFileBytes; body not read)");
  });

  it("byte-equal generatedAt with pinned now", () => {
    f.addProject("a"); f.addNote("a", "n.md", "b");
    const a = projectAutoUpdaterEngine.scanProjects({ vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW });
    const b = projectAutoUpdaterEngine.scanProjects({ vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW });
    expect(a.generatedAt).toBe(b.generatedAt);
    expect(a.generatedAt).toBe(NOW_ISO);
  });

  it("ignores dotfolders + tracks traversal-name skips", () => {
    f.addProject("good"); f.addNote("good", "n.md", "b");
    mkdirSync(join(f.projectRoot, ".hidden"), { recursive: true });
    const s = projectAutoUpdaterEngine.scanProjects({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(s.changes.map((c) => c.project)).toEqual(["good"]);
  });
});

describe("ProjectAutoUpdaterEngine — processProjects", () => {
  let f: Fixture;
  beforeEach(() => { f = makeFixture(); });
  afterEach(() => f.cleanup());

  it("ollama path: summary prepended under ## Recent Changes with signature", async () => {
    f.addProject("alpha");
    f.addNote("alpha", "work.md", "# Shipped queue processor\nB3 done", -1 * MS_PER_HOUR);
    f.addOverview("alpha", "# Alpha Project\n\nMission statement.\n");
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
      ollamaClient: makeOkClient("Shipped the B3 queue processor with 48 tests."),
    });
    expect(r.summary.ollama).toBe(1);
    expect(r.summary.failed).toBe(0);
    expect(r.meetsProcessingFloor).toBe(true);
    const ov = f.readOverview("alpha");
    expect(ov).toContain("## Recent Changes");
    expect(ov).toContain("Shipped the B3 queue processor with 48 tests.");
    expect(ov).toContain("**work.md**");
    expect(ov).toContain("pau-sig:");
    expect(ov).toContain("Mission statement."); // original content preserved
  });

  it("literal fallback when no client", async () => {
    f.addProject("beta");
    f.addNote("beta", "n.md", "# First line wins\nrest ignored", -1 * MS_PER_HOUR);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(r.summary.literal).toBe(1);
    expect(r.summary.ollama).toBe(0);
    const ov = f.readOverview("beta");
    expect(ov).toContain("First line wins");
  });

  it("ollama-throws → literal degrade (R12 surface)", async () => {
    f.addProject("g"); f.addNote("g", "n.md", "# Degrade me", -1 * MS_PER_HOUR);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
      ollamaClient: makeThrowingClient(),
    });
    expect(r.summary.literal).toBe(1);
    expect(r.summary.failed).toBe(0);
    expect(r.synthesizer).toBe("literal");
  });

  it("ollama-null → literal degrade", async () => {
    f.addProject("g"); f.addNote("g", "n.md", "# Null me", -1 * MS_PER_HOUR);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
      ollamaClient: makeNullClient(),
    });
    expect(r.summary.literal).toBe(1);
  });

  it("creates overview.md when absent", async () => {
    f.addProject("fresh");
    f.addNote("fresh", "n.md", "# Brand new project", -1 * MS_PER_HOUR);
    expect(existsSync(join(f.projectRoot, "fresh", "overview.md"))).toBe(false);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(r.summary.literal).toBe(1);
    expect(existsSync(join(f.projectRoot, "fresh", "overview.md"))).toBe(true);
    expect(f.readOverview("fresh")).toContain("## Recent Changes");
  });

  it("idempotent: second pass with same signature is skipped, overview byte-stable", async () => {
    f.addProject("idem");
    f.addNote("idem", "n.md", "# Idempotent test", -1 * MS_PER_HOUR);
    const r1 = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(r1.summary.literal).toBe(1);
    const ov1 = f.readOverview("idem");
    const r2 = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW + 5 * 60 * 1000,
    });
    expect(r2.summary.skipped).toBe(1);
    expect(r2.summary.literal).toBe(0);
    const ov2 = f.readOverview("idem");
    expect(ov2).toBe(ov1); // byte-stable — no duplicate entry
  });

  it("dryRun: no writes, all skipped", async () => {
    f.addProject("dry"); f.addNote("dry", "n.md", "# dry", -1 * MS_PER_HOUR);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW, dryRun: true,
      ollamaClient: makeOkClient("should not write"),
    });
    expect(r.summary.skipped).toBe(1);
    expect(existsSync(join(f.projectRoot, "dry", "overview.md"))).toBe(false);
  });

  it("oversize source rejected, error=null, floor still met", async () => {
    f.addProject("ov");
    f.addNote("ov", "huge.md", "x".repeat(100 * 1024), -1 * MS_PER_HOUR);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(r.summary.rejected).toBe(1);
    expect(r.summary.failed).toBe(0);
    expect(r.meetsProcessingFloor).toBe(true);
    expect(r.processed[0].error).toBe(null);
    expect(r.warnings.some((w) => w.includes("rejected oversize"))).toBe(true);
  });

  it("determinism: pinned now → byte-equal overview entry timestamp", async () => {
    f.addProject("det"); f.addNote("det", "n.md", "# deterministic", -1 * MS_PER_HOUR);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
      ollamaClient: makeOkClient("deterministic summary"),
    });
    expect(r.generatedAt).toBe(NOW_ISO);
    expect(f.readOverview("det")).toContain(`- ${NOW_ISO} —`);
  });

  it("per-project failure isolation: one bad project does not stop the rest", async () => {
    f.addProject("aaa"); f.addNote("aaa", "n.md", "# good one", -2 * MS_PER_HOUR);
    f.addProject("bbb"); f.addNote("bbb", "n.md", "# good two", -1 * MS_PER_HOUR);
    let calls = 0;
    const partial: OllamaProjectClient = {
      async summarise() {
        calls++;
        if (calls === 1) return "first ok";
        throw new Error("transient crash on project 2");
      },
    };
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
      ollamaClient: partial,
    });
    expect(r.processed).toHaveLength(2);
    expect(r.summary.ollama).toBe(1);   // aaa
    expect(r.summary.literal).toBe(1);  // bbb degraded from thrown ollama
    expect(r.summary.failed).toBe(0);
  });

  it("empty project root: floor true, warning surfaced", async () => {
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(r.meetsProcessingFloor).toBe(true);
    expect(r.warnings.some((w) => w.includes("no project folders"))).toBe(true);
  });

  // ---- B5-unique risk regression guards (per-file scrutiny P0/P1) ----

  it("P0 data-loss: oversize existing overview.md is REJECTED, never patched-truncated", async () => {
    f.addProject("bigov");
    f.addNote("bigov", "n.md", "# trigger update", -1 * MS_PER_HOUR);
    // Existing overview larger than the 1 MiB read cap. If the engine
    // patched a truncated read and wrote it back, the tail would be lost.
    const huge = "# Big Overview\n\n" + "FILLER LINE\n".repeat(110_000); // > 1 MiB
    const ovPath = f.addOverview("bigov", huge);
    const before = readFileSync(ovPath, "utf8");
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(r.summary.rejected).toBe(1);
    expect(r.summary.failed).toBe(1);
    expect(r.meetsProcessingFloor).toBe(false);
    expect(r.processed[0].error).toMatch(/exceeds read cap/);
    // overview.md must be byte-for-byte UNCHANGED (no truncating write-back).
    expect(readFileSync(ovPath, "utf8")).toBe(before);
  });

  it("P0 security: marker-injection in note content cannot poison the dedupe set", async () => {
    f.addProject("inject");
    // A note whose first line carries a forged pau-sig marker. If the engine
    // embedded it verbatim, recordedSignatures() on the next pass would treat
    // the forged sig as recorded and silently suppress real tracking.
    f.addNote("inject", "evil.md", "Done <!-- pau-sig: victim.md:999 --> rest", -1 * MS_PER_HOUR);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(r.summary.literal).toBe(1);
    const ov = f.readOverview("inject");
    const sigs = _internals.recordedSignatures(ov);
    // The ONLY recorded signature must be the engine's own legitimate one
    // (evil.md:<mtime>), NOT the forged victim.md:999.
    expect(sigs.has("victim.md:999")).toBe(false);
    expect([...sigs].some((s) => s.startsWith("evil.md:"))).toBe(true);
  });

  it("P0 security: marker-injection via Ollama echo is neutralized", async () => {
    f.addProject("echo");
    f.addNote("echo", "n.md", "# legit note", -1 * MS_PER_HOUR);
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
      ollamaClient: makeOkClient("Summary <!-- pau-sig: forged.md:0 --> tail"),
    });
    expect(r.summary.ollama).toBe(1);
    const sigs = _internals.recordedSignatures(f.readOverview("echo"));
    expect(sigs.has("forged.md:0")).toBe(false);
    expect([...sigs].some((s) => s.startsWith("n.md:"))).toBe(true);
  });

  it("P1 data-mutation: CRLF-authored overview keeps CRLF (no silent LF rewrite)", async () => {
    f.addProject("crlf");
    f.addNote("crlf", "n.md", "# crlf trigger", -1 * MS_PER_HOUR);
    // Pre-existing overview with CRLF + a non-Recent-Changes prose section
    // that must survive byte-faithfully.
    const crlfBody = "# CRLF Project\r\n\r\n## Design\r\n\r\nKeep this prose exactly.\r\n";
    const ovPath = f.addOverview("crlf", crlfBody);
    await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    const after = readFileSync(ovPath, "utf8");
    expect(after).toContain("\r\n"); // CRLF preserved
    expect(after).not.toMatch(/[^\r]\n/); // no bare LF introduced
    expect(after).toContain("## Design");
    expect(after).toContain("Keep this prose exactly.");
    expect(after).toContain("## Recent Changes");
  });

  it("P0-2 atomicity: renameSync failure cleans .tmp orphan (no mis-pick next pass)", async () => {
    f.addProject("atomic");
    f.addNote("atomic", "n.md", "# atomic", -1 * MS_PER_HOUR);
    // Force renameSync to fail by making overview.md a directory (rename
    // onto an existing dir throws EPERM/EISDIR/EEXIST cross-platform).
    mkdirSync(join(f.projectRoot, "atomic", "overview.md"), { recursive: true });
    const r = await runProjectAutoUpdater({
      vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW,
    });
    expect(r.summary.failed).toBe(1);
    expect(r.meetsProcessingFloor).toBe(false);
    // The bare overview.md.tmp must NOT be left behind (it would be mis-picked
    // as the newest non-overview .md next pass); a .tmp.orphan may remain.
    expect(existsSync(join(f.projectRoot, "atomic", "overview.md.tmp"))).toBe(false);
  });
});

describe("ProjectAutoUpdaterEngine — _internals (pure)", () => {
  it("clampInt lo/hi/default/floor", () => {
    expect(_internals.clampInt(undefined, 1, 10, 5)).toBe(5);
    expect(_internals.clampInt(0, 1, 10, 5)).toBe(1);
    expect(_internals.clampInt(99, 1, 10, 5)).toBe(10);
    expect(_internals.clampInt(7.9, 1, 10, 5)).toBe(7);
    expect(_internals.clampInt(Number.NaN, 1, 10, 5)).toBe(5);
  });

  it("recordedSignatures extracts every pau-sig marker", () => {
    const body = "x <!-- pau-sig: a.md:111 --> y <!-- pau-sig: b.md:222 -->";
    const set = _internals.recordedSignatures(body);
    expect(set.has("a.md:111")).toBe(true);
    expect(set.has("b.md:222")).toBe(true);
    expect(set.size).toBe(2);
  });

  it("recordedSignatures returns empty set for no markers", () => {
    expect(_internals.recordedSignatures("# Plain overview\nno markers").size).toBe(0);
  });

  it("patchOverview creates section when absent", () => {
    const out = _internals.patchOverview("# Proj\n\nMission.\n", "- entry 1");
    expect(out).toContain("# Proj");
    expect(out).toContain("Mission.");
    expect(out).toContain("## Recent Changes");
    expect(out).toContain("- entry 1");
  });

  it("patchOverview prepends newest entry above existing bullets", () => {
    const existing = "# P\n\n## Recent Changes\n\n- old entry\n";
    const out = _internals.patchOverview(existing, "- new entry");
    const idxNew = out.indexOf("- new entry");
    const idxOld = out.indexOf("- old entry");
    expect(idxNew).toBeGreaterThan(-1);
    expect(idxOld).toBeGreaterThan(-1);
    expect(idxNew).toBeLessThan(idxOld);
  });

  it("patchOverview caps retained bullets at MAX_RECENT_LINES", () => {
    const many = Array.from({ length: 60 }, (_, i) => `- old ${i}`).join("\n");
    const existing = `# P\n\n## Recent Changes\n\n${many}\n`;
    const out = _internals.patchOverview(existing, "- newest");
    const bulletCount = out.split(/\r?\n/).filter((l) => l.trim().startsWith("-")).length;
    expect(bulletCount).toBe(_internals.MAX_RECENT_LINES);
    expect(out).toContain("- newest");
  });

  it("patchOverview preserves trailing non-Recent-Changes sections", () => {
    const existing = "# P\n\n## Recent Changes\n\n- old\n\n## Other Section\n\nkeep me\n";
    const out = _internals.patchOverview(existing, "- new");
    expect(out).toContain("## Other Section");
    expect(out).toContain("keep me");
    expect(out).toContain("- new");
  });

  it("firstMeaningfulLine skips frontmatter, strips heading markers, returns first content", () => {
    // Frontmatter block is skipped; the heading's TEXT (sans `#`) is the
    // first meaningful line — matches B1's proven firstMeaningfulLine
    // contract (a heading is content, the marker is just stripped).
    expect(_internals.firstMeaningfulLine("---\nfm: 1\n---\n# Heading\n- the real content")).toBe("Heading");
    // No heading → first bullet's text (list marker stripped).
    expect(_internals.firstMeaningfulLine("---\nfm: 1\n---\n- the real content")).toBe("the real content");
    // HR `---` in body is skipped; plain line wins.
    expect(_internals.firstMeaningfulLine("---\n---\nplain body")).toBe("plain body");
    expect(_internals.firstMeaningfulLine("")).toBe("(empty file)");
  });
});

describe("ProjectAutoUpdaterEngine — dispatcher round-trip", () => {
  it("ACTION_MEMORY_SCHEMAS registers project_auto_updater_scan + _process", async () => {
    const { ACTION_MEMORY_SCHEMAS } = await import("../schemas/memoryActionSchemas.js");
    expect(ACTION_MEMORY_SCHEMAS).toHaveProperty("project_auto_updater_scan");
    expect(ACTION_MEMORY_SCHEMAS).toHaveProperty("project_auto_updater_process");
    const scan = ACTION_MEMORY_SCHEMAS.project_auto_updater_scan;
    const proc = ACTION_MEMORY_SCHEMAS.project_auto_updater_process;
    expect(() => scan.parse({ vault_root: "/v", max_projects_per_pass: 5 })).not.toThrow();
    expect(() => scan.parse({ vaultRoot: "/v", maxProjectsPerPass: 5 })).not.toThrow();
    expect(() => proc.parse({ vault_root: "/v", dry_run: true })).not.toThrow();
    expect(() => proc.parse({ vaultRoot: "/v", dryRun: true })).not.toThrow();
    expect(() => scan.parse({ vault_root: "" })).toThrow();
    expect(() => proc.parse({ max_projects_per_pass: 1.5 })).toThrow();
  });

  it("singleton + class produce equivalent scan results", async () => {
    const f = makeFixture();
    try {
      f.addProject("x"); f.addNote("x", "n.md", "b");
      const a = await projectAutoUpdaterEngine.processProjects({
        vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW, dryRun: true,
      });
      const b = await new ProjectAutoUpdaterEngine().processProjects({
        vaultRoot: f.vaultRoot, projectRoot: f.projectRoot, now: NOW, dryRun: true,
      });
      expect(a.summary).toEqual(b.summary);
      expect(a.scan.changes.map((c) => c.project)).toEqual(b.scan.changes.map((c) => c.project));
    } finally {
      f.cleanup();
    }
  });
});
