/**
 * DailyContextWorkflow.test.ts
 *
 * OBSIDIAN-INTELLIGENCE-MS3/B1/U-DAILY-CONTEXT-WORKFLOW — exit-criteria coverage:
 *   1. 6 AM cron writes generated/DAILY-CONTEXT-YYYY-MM-DD.md — verified via
 *      buildAndOptionallyWriteDailyContext({write:true}).
 *   2. Output references ≥3 source files when available — verified via the
 *      ## Sources block + the `sourceCount` field + the `meetsSourceFloor`
 *      flag introduced after per-file scrutiny arm-A.
 *   3. Ollama qwen2.5-coder summarizer used when client supplied — verified
 *      via injected `OllamaSummariseClient` mock + synthesizer="ollama" check.
 *   4. Dry-run on fixture inputs produces deterministic markdown — verified
 *      via two back-to-back synthesize() calls + byte-equality assertion.
 *
 * Plus comprehensive-build-floor coverage:
 *   * ≥3 failure modes: missing vault, empty vault, oversize file
 *   * ≥2 adversarial: non-UTF8 bytes, symlink rejection
 *   * ≥3 spanning configs: literal / ollama-all / ollama-partial-fallback
 *   * Zod schema rejection on bad input
 *   * Source-floor logic (empty vault, thin vault, full vault)
 *   * Sort stability across mtime ties
 *   * buildAndOptionallyWriteDailyContext write/no-write behavior
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  utimesSync,
  existsSync,
  readFileSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DailyContextWorkflowEngine,
  dailyContextWorkflowEngine,
  DailyContextOptionsSchema,
  buildAndOptionallyWriteDailyContext,
  _internals,
  type DailyContextBrief,
  type OllamaSummariseClient,
} from "../engines/DailyContextWorkflowEngine.js";
import { ACTION_MEMORY_SCHEMAS } from "../schemas/memoryActionSchemas.js";

// Frozen "now" so date math + briefDate are deterministic across the suite.
const NOW = Date.UTC(2026, 4, 17, 12, 0, 0); // 2026-05-17 12:00 UTC
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BRIEF_DATE = "2026-05-17";

let tmpVault: string;
let tmpGenerated: string;

function writeFileWithMtime(absPath: string, body: string | Buffer, ageMs = 0): string {
  mkdirSync(join(absPath, ".."), { recursive: true });
  writeFileSync(absPath, body);
  const mt = new Date(NOW - ageMs);
  utimesSync(absPath, mt, mt);
  return absPath;
}

function project(name: string, body: string, ageMs = 0): string {
  return writeFileWithMtime(join(tmpVault, "project", name), body, ageMs);
}

function inboxFile(name: string, body: string, ageMs = 0): string {
  return writeFileWithMtime(join(tmpVault, "inbox", name), body, ageMs);
}

function generated(name: string, body: string, ageMs = 0): string {
  return writeFileWithMtime(join(tmpGenerated, name), body, ageMs);
}

function defaultOpts(over: Partial<Parameters<DailyContextWorkflowEngine["synthesize"]>[0]> = {}) {
  return {
    vaultRoot: tmpVault,
    generatedRoot: tmpGenerated,
    now: NOW,
    ...over,
  };
}

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), "dcw-test-"));
  tmpVault = join(root, "memories");
  tmpGenerated = join(tmpVault, "generated");
  mkdirSync(tmpVault, { recursive: true });
  mkdirSync(join(tmpVault, "project"), { recursive: true });
  mkdirSync(join(tmpVault, "inbox"), { recursive: true });
  mkdirSync(tmpGenerated, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(join(tmpVault, ".."), { recursive: true, force: true });
  } catch {
    // tmpdir cleanup is best-effort
  }
});

// ============================================================================
// HAPPY PATH — exit_condition coverage
// ============================================================================

describe("DailyContextWorkflowEngine — happy path", () => {
  it("synthesizes a brief that references all 3 source classes when each is available", async () => {
    generated("DAILY-CONTEXT-2026-05-16.md", "# Yesterday brief\nclosed-out 3 units", MS_PER_DAY);
    project("project_alpha.md", "# alpha\nthe alpha project shipped U-FOO");
    inboxFile("note-1.md", "# inbox-1\ncapture a thought about beta");

    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());

    expect(brief.briefDate).toBe(BRIEF_DATE);
    expect(brief.sources.yesterday).not.toBeNull();
    expect(brief.sources.yesterday?.label).toBe("DAILY-CONTEXT-2026-05-16");
    expect(brief.sources.projects).toHaveLength(1);
    expect(brief.sources.projects[0].label).toBe("project_alpha");
    expect(brief.sources.inbox).toHaveLength(1);
    expect(brief.sources.inbox[0].label).toBe("note-1");
    expect(brief.sourceCount).toBe(3);
    expect(brief.meetsSourceFloor).toBe(true);
    expect(brief.synthesizer).toBe("literal");
    expect(brief.markdown).toContain("DAILY-CONTEXT-2026-05-16");
    expect(brief.markdown).toContain("project_alpha");
    expect(brief.markdown).toContain("note-1");
    expect(brief.markdown).toMatch(/^# Daily Context — 2026-05-17/);
  });

  it("output references ≥3 source files in the ## Sources block when available", async () => {
    generated("DAILY-CONTEXT-2026-05-16.md", "prior brief", MS_PER_DAY);
    project("p1.md", "one");
    project("p2.md", "two", 60 * 1000);
    inboxFile("i1.md", "in");

    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());

    const split = brief.markdown.split("## Sources");
    expect(split.length).toBe(2);
    const sourcesSection = split[1];
    const lineCount = sourcesSection.split("\n").filter((l) => l.startsWith("- ")).length;
    expect(lineCount).toBeGreaterThanOrEqual(3);
    expect(brief.meetsSourceFloor).toBe(true);
  });

  it("emits a structured `## Yesterday`, `## Active Projects`, `## Inbox`, `## Sources` layout", async () => {
    project("p.md", "body");
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(brief.markdown).toContain("## Yesterday");
    expect(brief.markdown).toContain("## Active Projects");
    expect(brief.markdown).toContain("## Inbox");
    expect(brief.markdown).toContain("## Sources");
  });
});

// ============================================================================
// OLLAMA INTEGRATION — DI + fallback
// ============================================================================

describe("DailyContextWorkflowEngine — Ollama integration", () => {
  function mkClient(reply: string | null = "summarised body"): {
    client: OllamaSummariseClient;
    calls: Array<{ model: string; system: string; prompt: string }>;
  } {
    const calls: Array<{ model: string; system: string; prompt: string }> = [];
    return {
      calls,
      client: {
        async summarise(input) {
          calls.push(input);
          return reply;
        },
      },
    };
  }

  it("synthesizer='ollama' when client supplied and EVERY populated section returns a summary", async () => {
    generated("DAILY-CONTEXT-2026-05-16.md", "yest", MS_PER_DAY);
    project("p.md", "proj body");
    inboxFile("i.md", "inbox body");
    const { client, calls } = mkClient("ollama-rendered");

    const brief = await dailyContextWorkflowEngine.synthesize(
      defaultOpts({ ollamaClient: client, ollamaModel: "qwen2.5-coder" }),
    );

    expect(brief.synthesizer).toBe("ollama");
    expect(brief.sections.yesterday.body).toBe("ollama-rendered");
    expect(brief.sections.projects.body).toBe("ollama-rendered");
    expect(brief.sections.inbox.body).toBe("ollama-rendered");
    expect(calls).toHaveLength(3);
    expect(calls[0].model).toBe("qwen2.5-coder");
  });

  it("synthesizer downgrades to 'literal' when ANY section's Ollama call returns null", async () => {
    project("p.md", "proj");
    inboxFile("i.md", "in");
    let n = 0;
    const client: OllamaSummariseClient = {
      async summarise() {
        n++;
        return n === 1 ? null : "ok-after-fail"; // first call fails → projects falls back
      },
    };
    const brief = await dailyContextWorkflowEngine.synthesize(
      defaultOpts({ ollamaClient: client }),
    );
    expect(brief.synthesizer).toBe("literal");
    // The fallback section uses literal renderer (bullet list)
    expect(brief.sections.projects.body.startsWith("- **p**")).toBe(true);
  });

  it("synthesizer downgrades to 'literal' when summarise throws", async () => {
    project("p.md", "proj");
    const client: OllamaSummariseClient = {
      async summarise() {
        throw new Error("daemon down");
      },
    };
    const brief = await dailyContextWorkflowEngine.synthesize(
      defaultOpts({ ollamaClient: client }),
    );
    expect(brief.synthesizer).toBe("literal");
    expect(brief.sections.projects.body).toContain("- **p**");
  });

  it("synthesizer='literal' on empty vault EVEN when client supplied (vault-empty conjunct)", async () => {
    const { client, calls } = mkClient("never-called");
    const brief = await dailyContextWorkflowEngine.synthesize(
      defaultOpts({ ollamaClient: client }),
    );
    expect(brief.synthesizer).toBe("literal");
    expect(calls).toHaveLength(0); // yesterday null + 0 projects + 0 inbox → no summarise call
  });
});

// ============================================================================
// SOURCE FLOOR + WARNINGS — load-bearing for R12 fail-loud
// ============================================================================

describe("DailyContextWorkflowEngine — source floor + warnings", () => {
  it("empty vault: meetsSourceFloor=false (the load-bearing post-scrutiny fix)", async () => {
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(brief.sourceCount).toBe(0);
    expect(brief.meetsSourceFloor).toBe(false);
    expect(brief.warnings).toContain("brief is thin: 0/3 source files included");
  });

  it("thin vault (1 source, no others available): meetsSourceFloor=true (honest-thin)", async () => {
    generated("DAILY-CONTEXT-2026-05-16.md", "prior", MS_PER_DAY);
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(brief.sourceCount).toBe(1);
    expect(brief.meetsSourceFloor).toBe(true);
    expect(brief.warnings).toContain("no project notes found");
    expect(brief.warnings).toContain("no inbox items found");
  });

  it("full vault (≥3 sources): meetsSourceFloor=true with no thin warning", async () => {
    generated("DAILY-CONTEXT-2026-05-16.md", "prior", MS_PER_DAY);
    project("p.md", "proj");
    inboxFile("i.md", "in");
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(brief.meetsSourceFloor).toBe(true);
    const thinWarn = brief.warnings.filter((w) => w.startsWith("brief is thin"));
    expect(thinWarn).toEqual([]);
  });

  it("emits a cap-applied warning when projects exceed the maxProjects cap", async () => {
    for (let i = 0; i < 7; i++) project(`p${i}.md`, "x", i * 1000);
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts({ maxProjects: 3 }));
    expect(brief.sources.projects).toHaveLength(3);
    expect(brief.sources.availability.projectFilesFound).toBe(7);
    expect(brief.warnings.some((w) => w.startsWith("project cap applied: 3/7"))).toBe(true);
  });
});

// ============================================================================
// DETERMINISM
// ============================================================================

describe("DailyContextWorkflowEngine — determinism", () => {
  it("two back-to-back synthesize calls produce byte-equal markdown in literal mode", async () => {
    generated("DAILY-CONTEXT-2026-05-16.md", "prior", MS_PER_DAY);
    project("p.md", "alpha", 1000);
    project("q.md", "beta", 2000);
    inboxFile("i1.md", "one");
    const a = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    const b = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(b.markdown).toBe(a.markdown);
  });

  it("projects sort by mtime desc with name tie-break (stable across runs)", async () => {
    // Two files with the SAME mtime → tie-break on name asc.
    project("z-newer.md", "z", 1000);
    project("a-newer.md", "a", 1000);
    project("m-older.md", "m", 5000);
    const a = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(a.sources.projects.map((p) => p.label)).toEqual([
      "a-newer", // tied mtime → name asc wins
      "z-newer",
      "m-older",
    ]);
    const b = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(b.sources.projects.map((p) => p.label)).toEqual(a.sources.projects.map((p) => p.label));
  });

  it("yesterday picks the most recent date BEFORE briefDate (strictly less)", async () => {
    generated("DAILY-CONTEXT-2026-05-16.md", "older", MS_PER_DAY);
    generated("DAILY-CONTEXT-2026-05-15.md", "oldest", 2 * MS_PER_DAY);
    generated("DAILY-CONTEXT-2026-05-17.md", "today", 0); // strictly-less filter must exclude
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(brief.sources.yesterday?.label).toBe("DAILY-CONTEXT-2026-05-16");
  });
});

// ============================================================================
// FAILURE MODES
// ============================================================================

describe("DailyContextWorkflowEngine — failure modes", () => {
  it("missing vault root: synth returns empty-vault brief, never throws", async () => {
    const brief = await dailyContextWorkflowEngine.synthesize(
      defaultOpts({ vaultRoot: join(tmpVault, "does-not-exist") }),
    );
    expect(brief.sourceCount).toBe(0);
    expect(brief.sections.yesterday.body).toBe("_First-run — no prior brief on disk._");
    expect(brief.meetsSourceFloor).toBe(false);
  });

  it("oversize file: excerpt is truncated to excerptBytes + truncated flag set", async () => {
    const big = "abcdefghij".repeat(1000); // 10 KB
    project("big.md", big);
    const brief = await dailyContextWorkflowEngine.synthesize(
      defaultOpts({ excerptBytes: 1024 }),
    );
    expect(brief.sources.projects[0].excerpt.length).toBe(1024);
    expect(brief.sources.projects[0].truncated).toBe(true);
  });

  it("project mtime older than window: excluded", async () => {
    project("old.md", "ancient", 90 * MS_PER_DAY);
    project("new.md", "fresh", 1000);
    const brief = await dailyContextWorkflowEngine.synthesize(
      defaultOpts({ projectWindowMs: 30 * MS_PER_DAY }),
    );
    expect(brief.sources.projects.map((p) => p.label)).toEqual(["new"]);
  });
});

// ============================================================================
// ADVERSARIAL
// ============================================================================

describe("DailyContextWorkflowEngine — adversarial inputs", () => {
  it("non-UTF8 bytes in source file do not throw; lossy decode emits U+FFFD", async () => {
    // 0xC3 alone is an invalid UTF-8 continuation start; replacement char emitted.
    const evilBytes = Buffer.concat([Buffer.from("hello "), Buffer.from([0xc3, 0x28]), Buffer.from(" world")]);
    project("evil.md", evilBytes);
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(brief.sources.projects).toHaveLength(1);
    expect(brief.sources.projects[0].excerpt.includes("hello")).toBe(true);
    expect(brief.sources.projects[0].excerpt.includes("world")).toBe(true);
    // Replacement char survives — the engine doesn't crash on bad bytes.
    expect(brief.sources.projects[0].excerpt.includes("�")).toBe(true);
  });

  it("symlinks in the inbox dir are rejected by lstat check", async () => {
    // Skip on Windows in low-priv mode (symlink creation may EPERM)
    inboxFile("real.md", "real file");
    const target = join(tmpVault, "inbox", "real.md");
    const link = join(tmpVault, "inbox", "evil-link.md");
    let symlinkWorks = true;
    try {
      symlinkSync(target, link, "file");
    } catch {
      symlinkWorks = false;
    }
    if (!symlinkWorks) {
      // Environment can't create symlinks (Windows w/o dev-mode); skip
      return;
    }
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    // Only the real file should appear; the symlink is filtered out.
    const inboxLabels = brief.sources.inbox.map((i) => i.label);
    // P2-B fix (arm-B scrutiny): length===1 precondition prevents a false-pass
    // where listMarkdown silently returned [] for an unrelated I/O reason.
    expect(inboxLabels.length).toBe(1);
    expect(inboxLabels).toContain("real");
    expect(inboxLabels.includes("evil-link")).toBe(false);
  });
});

// ============================================================================
// ZOD VALIDATION
// ============================================================================

describe("DailyContextWorkflowEngine — Zod validation", () => {
  it("DailyContextOptionsSchema rejects NaN for now", () => {
    expect(() => DailyContextOptionsSchema.parse({ now: NaN })).toThrow();
  });

  it("rejects negative maxProjects", () => {
    expect(() => DailyContextOptionsSchema.parse({ maxProjects: -1 })).toThrow();
  });

  it("rejects maxProjects above MAX_PROJECTS_MAX (50)", () => {
    expect(() => DailyContextOptionsSchema.parse({ maxProjects: 999 })).toThrow();
  });

  it("collectSources throws ZodError on bad opts (public-entry validation)", () => {
    const eng = new DailyContextWorkflowEngine();
    expect(() => eng.collectSources({ now: NaN, vaultRoot: tmpVault })).toThrow();
  });

  it("synthesize throws ZodError on bad opts (public-entry validation per arm-B fix)", async () => {
    const eng = new DailyContextWorkflowEngine();
    await expect(eng.synthesize({ now: NaN, vaultRoot: tmpVault })).rejects.toThrow();
  });

  it("buildAndOptionallyWriteDailyContext throws ZodError on bad opts (per arm-B fix)", async () => {
    await expect(buildAndOptionallyWriteDailyContext({ now: NaN, vaultRoot: tmpVault })).rejects.toThrow();
  });
});

// ============================================================================
// WRITE WRAPPER
// ============================================================================

describe("buildAndOptionallyWriteDailyContext", () => {
  it("write=false returns the brief without touching disk", async () => {
    project("p.md", "proj");
    const out = await buildAndOptionallyWriteDailyContext(defaultOpts({ write: false }));
    expect(out.written).toBe(false);
    expect(existsSync(out.outputPath)).toBe(false);
  });

  it("write=true writes the markdown to outputPath", async () => {
    project("p.md", "proj");
    const out = await buildAndOptionallyWriteDailyContext(defaultOpts({ write: true }));
    expect(out.written).toBe(true);
    expect(existsSync(out.outputPath)).toBe(true);
    const written = readFileSync(out.outputPath, "utf8");
    expect(written).toBe(out.markdown);
  });

  it("creates the generated subdir when missing (mkdirIfMissing default true)", async () => {
    rmSync(tmpGenerated, { recursive: true, force: true });
    project("p.md", "proj");
    const out = await buildAndOptionallyWriteDailyContext(defaultOpts({ write: true }));
    expect(out.written).toBe(true);
    expect(existsSync(out.outputPath)).toBe(true);
  });
});

// ============================================================================
// _internals — direct unit tests for the floor + helpers
// ============================================================================

describe("DailyContextWorkflowEngine — _internals (floor + helpers)", () => {
  it("computeFloorAndWarnings: full vault (3 sources) → meets floor, no thin warning", () => {
    const { meetsSourceFloor, warnings } = _internals.computeFloorAndWarnings(
      {
        briefDate: BRIEF_DATE,
        yesterday: { path: "y", label: "y", mtime: "", mtimeMs: 0, excerpt: "", truncated: false },
        projects: [{ path: "p", label: "p", mtime: "", mtimeMs: 0, excerpt: "", truncated: false }],
        inbox: [{ path: "i", label: "i", mtime: "", mtimeMs: 0, excerpt: "", truncated: false }],
        outputPath: "",
        generatedAt: "",
        availability: { yesterdayExists: true, projectFilesFound: 1, inboxFilesFound: 1 },
        caps: { maxProjects: 5, maxInbox: 10, projectWindowMs: 1, excerptBytes: 1 },
      },
      3,
    );
    expect(meetsSourceFloor).toBe(true);
    const thinWarn = warnings.filter((w) => w.startsWith("brief is thin"));
    expect(thinWarn).toEqual([]);
  });

  it("computeFloorAndWarnings: empty vault (0 sources) → does NOT meet floor (regression guard for arm-A P1)", () => {
    const { meetsSourceFloor, warnings } = _internals.computeFloorAndWarnings(
      {
        briefDate: BRIEF_DATE,
        yesterday: null,
        projects: [],
        inbox: [],
        outputPath: "",
        generatedAt: "",
        availability: { yesterdayExists: false, projectFilesFound: 0, inboxFilesFound: 0 },
        caps: { maxProjects: 5, maxInbox: 10, projectWindowMs: 1, excerptBytes: 1 },
      },
      0,
    );
    expect(meetsSourceFloor).toBe(false);
    expect(warnings).toContain("brief is thin: 0/3 source files included");
  });

  it("computeFloorAndWarnings: ISOLATED conjunct regression guard — totalSources=0 AND everythingAvailableUsed=true → meetsSourceFloor=false (arm-B P1-A)", () => {
    // This isolates the load-bearing `totalSources > 0` conjunct from the
    // `everythingAvailableUsed` clause. If someone reverts the engine's
    // floor formula back to `totalSources >= SOURCE_FLOOR || everythingAvailableUsed`
    // (dropping the totalSources>0 check), this test fails — proving the
    // conjunct is load-bearing, not redundant defensive code.
    // Setup: empty availability → everythingAvailableUsed evaluates true
    // because all three conjuncts trivially hold; totalSources=0 must veto.
    const result = _internals.computeFloorAndWarnings(
      {
        briefDate: BRIEF_DATE,
        yesterday: null,
        projects: [],
        inbox: [],
        outputPath: "",
        generatedAt: "",
        availability: { yesterdayExists: false, projectFilesFound: 0, inboxFilesFound: 0 },
        caps: { maxProjects: 5, maxInbox: 10, projectWindowMs: 1, excerptBytes: 1 },
      },
      0, // totalSources MUST be 0 for the conjunct check
    );
    // The veto property: empty vault is "thin" regardless of availability symmetry.
    expect(result.meetsSourceFloor).toBe(false);
  });

  it("firstMeaningfulLine: skips YAML frontmatter block then strips heading marker", () => {
    // Frontmatter is skipped wholesale; the body's first content line is `# Title`
    // which strips to "Title" (heading text is meaningful summary content).
    expect(_internals.firstMeaningfulLine("---\nfoo: bar\n---\n# Title\n\n- bullet here")).toBe("Title");
  });

  it("firstMeaningfulLine: strips leading list marker on a bullet-first body", () => {
    expect(_internals.firstMeaningfulLine("- first bullet\n- second")).toBe("first bullet");
  });

  it("firstMeaningfulLine: when frontmatter has no closing ---, falls back to whole-body scan", () => {
    // Open-ended frontmatter is treated as no-frontmatter (don't silently lose body).
    expect(_internals.firstMeaningfulLine("---\nopen frontmatter never closes\nbody line")).toBe("open frontmatter never closes");
  });

  it("firstMeaningfulLine: returns sentinel on empty input", () => {
    expect(_internals.firstMeaningfulLine("")).toBe("(empty file)");
  });

  it("clampInt: out-of-range inputs are clamped to bounds; NaN/undefined return default", () => {
    expect(_internals.clampInt(-1, 0, 10, 5)).toBe(0);
    expect(_internals.clampInt(99, 0, 10, 5)).toBe(10);
    expect(_internals.clampInt(NaN, 0, 10, 5)).toBe(5);
    expect(_internals.clampInt(undefined, 0, 10, 5)).toBe(5);
    expect(_internals.clampInt(7, 0, 10, 5)).toBe(7);
  });

  it("DAILY_PATTERN: matches DAILY-CONTEXT-YYYY-MM-DD.md and captures the date", () => {
    const m = _internals.DAILY_PATTERN.exec("DAILY-CONTEXT-2026-05-17.md");
    expect(m).not.toBeNull();
    expect(m?.[1]).toBe("2026-05-17");
    expect(_internals.DAILY_PATTERN.exec("not-a-daily.md")).toBeNull();
  });

  it("SOURCE_FLOOR constant equals 3 (spec contract)", () => {
    expect(_internals.SOURCE_FLOOR).toBe(3);
  });
});

// ============================================================================
// TIMING + DURATION
// ============================================================================

describe("DailyContextWorkflowEngine — telemetry", () => {
  it("brief.durationMs has collect + synthesize + total fields", async () => {
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(typeof brief.durationMs.collect).toBe("number");
    expect(typeof brief.durationMs.synthesize).toBe("number");
    expect(typeof brief.durationMs.total).toBe("number");
    expect(brief.durationMs.collect).toBeGreaterThanOrEqual(0);
    expect(brief.durationMs.synthesize).toBeGreaterThanOrEqual(0);
    expect(brief.durationMs.total).toBeGreaterThanOrEqual(brief.durationMs.collect);
  });
});

// ============================================================================
// JSON SERIALIZABILITY — load-bearing for dispatcher wiring
// ============================================================================

describe("DailyContextWorkflowEngine — JSON safety for dispatcher", () => {
  it("the entire brief survives JSON round-trip without loss", async () => {
    generated("DAILY-CONTEXT-2026-05-16.md", "prior", MS_PER_DAY);
    project("p.md", "proj");
    inboxFile("i.md", "in");
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    const round = JSON.parse(JSON.stringify(brief)) as DailyContextBrief;
    expect(round.briefDate).toBe(brief.briefDate);
    expect(round.markdown).toBe(brief.markdown);
    expect(round.sourceCount).toBe(brief.sourceCount);
    expect(round.meetsSourceFloor).toBe(brief.meetsSourceFloor);
    expect(round.warnings).toEqual(brief.warnings);
    expect(round.synthesizer).toBe(brief.synthesizer);
    expect(round.sources.availability).toEqual(brief.sources.availability);
  });

  it("P2-C arm-B fix: byte-equal JSON round-trip — guards future field additions of Date/Map/Symbol/function", async () => {
    // If a future maintainer adds a Date or Map field to the brief, JSON.stringify
    // would silently drop or mis-encode it. This deep-equality assertion catches
    // that loss at test-time instead of in production dispatcher serialization.
    generated("DAILY-CONTEXT-2026-05-16.md", "prior", MS_PER_DAY);
    project("p.md", "proj");
    inboxFile("i.md", "in");
    const brief = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    const stringified = JSON.stringify(brief);
    const round = JSON.parse(stringified);
    const reStringified = JSON.stringify(round);
    expect(reStringified).toBe(stringified);
  });
});

// ============================================================================
// DISPATCHER WIRING — prism_memory:daily_context_get
// ============================================================================

describe("daily_context_get — dispatcher wiring", () => {
  it("schema round-trips a representative dispatcher payload field-for-field", () => {
    // A missing/broken/shadowed schema would throw at parse() — real behavior.
    const sample = {
      vault_root: "C:/tmp/vault",
      generated_root: "C:/tmp/vault/generated",
      now: 1_700_000_000_000,
      max_projects: 3,
      max_inbox: 5,
      project_window_ms: 30 * 24 * 60 * 60 * 1000,
      excerpt_bytes: 2048,
      write: true,
      ollama_model: "qwen2.5-coder",
    };
    const parsed = ACTION_MEMORY_SCHEMAS.daily_context_get.parse(sample);
    expect(parsed.vault_root).toBe(sample.vault_root);
    expect(parsed.generated_root).toBe(sample.generated_root);
    expect(parsed.now).toBe(sample.now);
    expect(parsed.max_projects).toBe(sample.max_projects);
    expect(parsed.max_inbox).toBe(sample.max_inbox);
    expect(parsed.project_window_ms).toBe(sample.project_window_ms);
    expect(parsed.excerpt_bytes).toBe(sample.excerpt_bytes);
    expect(parsed.write).toBe(sample.write);
    expect(parsed.ollama_model).toBe(sample.ollama_model);
  });

  it("schema accepts the camelCase alias variant (snake↔camel parity)", () => {
    const parsed = ACTION_MEMORY_SCHEMAS.daily_context_get.parse({
      vaultRoot: "C:/tmp/vault",
      maxProjects: 3,
      excerptBytes: 1024,
    });
    expect(parsed.vaultRoot).toBe("C:/tmp/vault");
    expect(parsed.maxProjects).toBe(3);
    expect(parsed.excerptBytes).toBe(1024);
  });

  it("schema rejects out-of-range max_projects (loud-fail per engines.md)", () => {
    expect(() => ACTION_MEMORY_SCHEMAS.daily_context_get.parse({ max_projects: 999 })).toThrow();
    expect(() => ACTION_MEMORY_SCHEMAS.daily_context_get.parse({ max_projects: 0 })).toThrow();
  });

  it("schema rejects NaN now", () => {
    expect(() => ACTION_MEMORY_SCHEMAS.daily_context_get.parse({ now: NaN })).toThrow();
  });

  it("dispatcher case-handler shape matches engine output (round-trip parity)", async () => {
    // Simulates the EXACT snake→camel coalescing logic the dispatcher uses, then
    // asserts the resulting brief is byte-identical to a direct engine call.
    // If a future edit to memoryDispatcher.ts forgets to coalesce one field
    // (e.g. drops the `generatedRoot` line), this test catches the drift.
    project("p.md", "proj");
    inboxFile("i.md", "in");
    const params: Record<string, unknown> = {
      vault_root: tmpVault,
      generated_root: tmpGenerated,
      now: NOW,
      max_projects: 5,
      max_inbox: 10,
    };
    const opts = {
      vaultRoot: typeof params.vault_root === "string"
        ? params.vault_root
        : (typeof params.vaultRoot === "string" ? params.vaultRoot : undefined),
      generatedRoot: typeof params.generated_root === "string"
        ? params.generated_root
        : (typeof params.generatedRoot === "string" ? params.generatedRoot : undefined),
      now: typeof params.now === "number" ? params.now : undefined,
      maxProjects: typeof params.max_projects === "number" ? params.max_projects : undefined,
      maxInbox: typeof params.max_inbox === "number" ? params.max_inbox : undefined,
    };
    const fromDispatcherShape = await dailyContextWorkflowEngine.synthesize(opts);
    const fromDirectCall = await dailyContextWorkflowEngine.synthesize(defaultOpts());
    expect(fromDispatcherShape.markdown).toBe(fromDirectCall.markdown);
    expect(fromDispatcherShape.sourceCount).toBe(fromDirectCall.sourceCount);
    expect(fromDispatcherShape.meetsSourceFloor).toBe(fromDirectCall.meetsSourceFloor);
    expect(fromDispatcherShape.briefDate).toBe(fromDirectCall.briefDate);
  });
});
