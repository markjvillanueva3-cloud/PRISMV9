/**
 * WeeklySynthesis.test.ts — fixture-driven deterministic tests for
 * OBSIDIAN-INTELLIGENCE-MS3 / B4 (U-WEEKLY-SYNTHESIS).
 *
 * Strategy: the E2E tests use the REAL `defaultLoader` against an
 * os.tmpdir()-scoped vault (so the generated/ -> 7-day-window -> load
 * filesystem path is genuinely exercised) but inject a `SummarizerFn` so the
 * suite never touches Ollama and runs fast. Pure helpers are tested directly
 * with reference values / invariants (no toBeDefined() stubs).
 *
 * Exit-condition coverage (spec): "dry-run on a 7-day fixture produces all 4
 * sections". Plus the comprehensive-build floor: happy path + >=3 failure
 * modes (invalid-vault-root, invalid-date incl. impossible 2026-02-30,
 * no-sources, summarizer-failed, incomplete-synthesis, write-failed) + >=2
 * adversarial (neutralizeHeadings heading-injection, stripFences
 * unterminated-fence header trap) + >=3 spanning configs (1-source minimum,
 * full 7-day week, window-boundary exclusion).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  WeeklySynthesisEngine,
  WEEKLY_SECTIONS,
  DAYS_PER_WEEK,
  MIN_SOURCES_FOR_RETRO,
  MAX_SOURCE_BYTES,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  isoDateUTC,
  truncateBody,
  parseDailyContextDate,
  stripFences,
  hasAllSections,
  missingSections,
  neutralizeHeadings,
  buildSummarizerPrompt,
  formatRetro,
  defaultLoader,
  defaultOllamaSummarizer,
  type WeeklySource,
  type SummarizerFn,
} from "../engines/WeeklySynthesisEngine.js";
import { weekIsoUTC } from "../engines/ConnectionFinderEngine.js";

/* ---------- vault scaffolding ---------- */

/** A vault with `generated/` present (the normal case). */
async function mkVault(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "prism-wse-"));
  await fs.mkdir(path.join(root, "generated"), { recursive: true });
  return root;
}

/** A vault dir with NO `generated/` subdir — exercises the loader fail-soft. */
async function mkBareVault(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "prism-wse-bare-"));
}

async function seedDaily(root: string, date: string, body: string): Promise<void> {
  await fs.writeFile(path.join(root, "generated", `DAILY-CONTEXT-${date}.md`), body, "utf8");
}

async function ls(dir: string): Promise<string[]> {
  try {
    return (await fs.readdir(dir)).sort();
  } catch {
    return [];
  }
}

/** Build an in-memory WeeklySource for pure-helper tests (path never touched). */
function mkSource(date: string, body: string): WeeklySource {
  return {
    date,
    path: `/fake/generated/DAILY-CONTEXT-${date}.md`,
    body,
    bytes: Buffer.byteLength(body, "utf8"),
  };
}

/** A structurally complete 4-section retro (all WEEKLY_SECTIONS headers). */
const VALID_RETRO = [
  "## Moved",
  "- shipped the B-track loader",
  "## Didn't move",
  "- the E2 ontology spike stalled",
  "## Emerging patterns",
  "- per-file scrutiny keeps catching fence bugs",
  "## Top-3 next-week leverage",
  "1. wire the cron",
  "2. close the envelope",
  "3. start Track G",
].join("\n");

/** Summarizer that always returns a valid retro — never hits the network. */
const okSummarizer: SummarizerFn = async () => ({
  ok: true,
  text: VALID_RETRO,
  model: "test-fake",
});

/**
 * The 7 dates inside the loader's plain 7-day lookback window ending on the
 * anchor (anchor-6 .. anchor inclusive). NOTE: the window is a flat 7-day
 * lookback, NOT ISO-week-aligned — see defaultLoader's doc-comment.
 */
const WEEK_DATES = [
  "2026-05-04",
  "2026-05-05",
  "2026-05-06",
  "2026-05-07",
  "2026-05-08",
  "2026-05-09",
  "2026-05-10",
];
const ANCHOR = "2026-05-10";

/* ===================================================================== */
/* Pure helpers                                                          */
/* ===================================================================== */

describe("isoDateUTC", () => {
  it("formats a Date as UTC YYYY-MM-DD", () => {
    expect(isoDateUTC(new Date("2026-05-10T13:45:00Z"))).toBe("2026-05-10");
  });
  it("zero-pads single-digit month and day", () => {
    expect(isoDateUTC(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
  it("uses the UTC calendar day at an end-of-day instant", () => {
    expect(isoDateUTC(new Date("2026-05-10T23:59:59Z"))).toBe("2026-05-10");
  });
});

describe("truncateBody", () => {
  it("returns the body unchanged when within the byte cap", () => {
    expect(truncateBody("short", 100)).toBe("short");
  });

  it("caps an ASCII body at max bytes + the full marker", () => {
    const out = truncateBody("a".repeat(500), 100);
    expect(out.startsWith("a".repeat(100))).toBe(true);
    expect(out.endsWith("\n\n[truncated]\n")).toBe(true);
  });

  it("a multibyte body never exceeds the byte cap and leaves no dangling U+FFFD", () => {
    // 2000 wrench emoji = 8000 UTF-8 bytes; a char-slice would keep ~3x the cap
    const out = truncateBody("\u{1F6E0}".repeat(2000), 300);
    const marker = "\n\n[truncated]\n";
    const content = out.slice(0, out.length - marker.length);
    expect(Buffer.byteLength(content, "utf8")).toBeLessThanOrEqual(300);
    expect(content.endsWith("�")).toBe(false);
    expect(out.endsWith(marker)).toBe(true);
  });

  it("default cap is MAX_SOURCE_BYTES", () => {
    const out = truncateBody("x".repeat(MAX_SOURCE_BYTES + 50));
    expect(Buffer.byteLength(out, "utf8")).toBeLessThanOrEqual(
      MAX_SOURCE_BYTES + "\n\n[truncated]\n".length,
    );
  });
});

describe("parseDailyContextDate", () => {
  it("extracts the ISO date from a well-formed filename", () => {
    expect(parseDailyContextDate("DAILY-CONTEXT-2026-05-10.md")).toBe("2026-05-10");
  });
  it("is case-insensitive on prefix and extension", () => {
    expect(parseDailyContextDate("daily-context-2026-05-10.MD")).toBe("2026-05-10");
  });
  it("returns null for sibling vault files (WEEKLY / CONNECTIONS)", () => {
    expect(parseDailyContextDate("WEEKLY-2026-W20.md")).toBeNull();
    expect(parseDailyContextDate("CONNECTIONS-2026-05-10.md")).toBeNull();
  });
  it("returns null for an unpadded / malformed / wrong-extension name", () => {
    expect(parseDailyContextDate("DAILY-CONTEXT-2026-5-1.md")).toBeNull();
    expect(parseDailyContextDate("DAILY-CONTEXT-2026-05-10.txt")).toBeNull();
    expect(parseDailyContextDate("DAILY-CONTEXT-.md")).toBeNull();
  });
});

describe("stripFences", () => {
  it("removes a terminated fenced block", () => {
    const out = stripFences("before\n```\nhidden code\n```\nafter");
    expect(out).not.toContain("hidden code");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });
  it("swallows an UNTERMINATED fence all the way to EOF", () => {
    const out = stripFences("keep\n```\ntrapped to the end of file");
    expect(out).not.toContain("trapped to the end of file");
    expect(out).toContain("keep");
  });
  it("leaves fence-free text unchanged", () => {
    const t = "## Moved\nplain prose\n## Didn't move";
    expect(stripFences(t)).toBe(t);
  });
  it("a header inside a fence is removed (so it cannot count as a section)", () => {
    expect(stripFences("```\n## Moved\n```")).not.toContain("## Moved");
  });
  it("strips an indented fence", () => {
    const out = stripFences("  ```\n  indented code\n  ```\ntail");
    expect(out).not.toContain("indented code");
    expect(out).toContain("tail");
  });
});

describe("hasAllSections / missingSections", () => {
  const full = WEEKLY_SECTIONS.map((s) => `## ${s}\nbody`).join("\n");

  it("true + no gaps when every mandatory section header is present", () => {
    expect(hasAllSections(full)).toBe(true);
    expect(missingSections(full)).toEqual([]);
  });
  it("false + names the gap when a section is missing", () => {
    const noPatterns = "## Moved\na\n## Didn't move\nb\n## Top-3 next-week leverage\nc";
    expect(hasAllSections(noPatterns)).toBe(false);
    expect(missingSections(noPatterns)).toEqual(["Emerging patterns"]);
  });
  it("is case-insensitive on the header label", () => {
    const lower = WEEKLY_SECTIONS.map((s) => `## ${s.toLowerCase()}`).join("\n");
    expect(hasAllSections(lower)).toBe(true);
  });
  it("does not count a header that only appears inside a code fence", () => {
    const fenced =
      "## Moved\n## Didn't move\n## Emerging patterns\n```\n## Top-3 next-week leverage\n```";
    expect(hasAllSections(fenced)).toBe(false);
    expect(missingSections(fenced)).toEqual(["Top-3 next-week leverage"]);
  });
  it("requires the header on its own line — an inline ## does not count", () => {
    const inline =
      "## Moved\n## Didn't move\n## Emerging patterns\ntext ## Top-3 next-week leverage here";
    expect(hasAllSections(inline)).toBe(false);
  });
});

describe("neutralizeHeadings", () => {
  it("escapes the leading # of every heading depth", () => {
    expect(neutralizeHeadings("# H1")).toBe("\\# H1");
    expect(neutralizeHeadings("## H2")).toBe("\\## H2");
    expect(neutralizeHeadings("### H3")).toBe("\\### H3");
  });
  it("leaves non-heading lines untouched", () => {
    expect(neutralizeHeadings("plain line\n- bullet")).toBe("plain line\n- bullet");
  });
  it("escapes headings on every line of a multi-line body", () => {
    expect(neutralizeHeadings("intro\n## Moved\nmid\n## Didn't move")).toBe(
      "intro\n\\## Moved\nmid\n\\## Didn't move",
    );
  });
});

describe("buildSummarizerPrompt", () => {
  const srcs = [mkSource("2026-05-09", "monday note"), mkSource("2026-05-10", "tuesday note")];
  it("embeds the 4 instruction headers, the ISO week, and each source brief", () => {
    const p = buildSummarizerPrompt(srcs, "2026-W20");
    for (const s of WEEKLY_SECTIONS) expect(p).toContain(`## ${s}`);
    expect(p).toContain("ISO WEEK: 2026-W20");
    expect(p).toContain("--- DAILY-CONTEXT 2026-05-09 ---");
    expect(p).toContain("--- DAILY-CONTEXT 2026-05-10 ---");
    expect(p).toContain("monday note");
    expect(p.endsWith("WEEKLY RETRO:")).toBe(true);
  });
});

describe("formatRetro", () => {
  it("emits YAML-safe frontmatter with single-quoted, forward-slashed source paths", () => {
    const md = formatRetro({
      synthesis: VALID_RETRO,
      sources: [
        {
          date: "2026-05-10",
          path: "C:\\vault\\generated\\DAILY-CONTEXT-2026-05-10.md",
          body: "b",
          bytes: 1,
        },
      ],
      weekIso: "2026-W20",
      date: "2026-05-10",
      model: "qwen2.5-coder:7b",
    });
    expect(md).toContain("kind: weekly-synthesis");
    expect(md).toContain("week: 2026-W20");
    expect(md).toContain("sources_count: 1");
    expect(md).toContain("summarizer_model: qwen2.5-coder:7b");
    expect(md).toContain("path: 'C:/vault/generated/DAILY-CONTEXT-2026-05-10.md'");
    expect(md).toContain(VALID_RETRO.trim());
    expect(md).toContain("## Source briefs");
  });
  it("omits the summarizer_model frontmatter line when no model is given", () => {
    const md = formatRetro({
      synthesis: VALID_RETRO,
      sources: [mkSource("2026-05-10", "b")],
      weekIso: "2026-W20",
      date: "2026-05-10",
    });
    expect(md).not.toContain("summarizer_model:");
  });
});

describe("exported constants", () => {
  it("WEEKLY_SECTIONS is the canonical 4-section list in document order", () => {
    expect(WEEKLY_SECTIONS).toEqual([
      "Moved",
      "Didn't move",
      "Emerging patterns",
      "Top-3 next-week leverage",
    ]);
  });
  it("DAYS_PER_WEEK is 7 and MIN_SOURCES_FOR_RETRO is 1", () => {
    expect(DAYS_PER_WEEK).toBe(7);
    expect(MIN_SOURCES_FOR_RETRO).toBe(1);
  });
  it("default Ollama model + url match the token-economy canon", () => {
    expect(DEFAULT_OLLAMA_MODEL).toBe("qwen2.5-coder:7b");
    expect(DEFAULT_OLLAMA_URL).toBe("http://127.0.0.1:11434/api/generate");
    expect(typeof defaultOllamaSummarizer).toBe("function");
  });
});

/* ===================================================================== */
/* defaultLoader — real fs over an os.tmpdir vault                        */
/* ===================================================================== */

describe("defaultLoader — 7-day window over generated/", () => {
  it("loads only in-window DAILY-CONTEXT files, sorted ascending by date", async () => {
    const root = await mkVault();
    await seedDaily(root, "2026-05-04", "a");
    await seedDaily(root, "2026-05-10", "b");
    await seedDaily(root, "2026-05-03", "OUT-before-window-start");
    await seedDaily(root, "2026-05-11", "OUT-after-anchor");
    const got = await defaultLoader({ vaultRoot: root, date: ANCHOR });
    expect(got.map((s) => s.date)).toEqual(["2026-05-04", "2026-05-10"]);
  });

  it("skips non-DAILY-CONTEXT files in generated/", async () => {
    const root = await mkVault();
    await seedDaily(root, "2026-05-10", "real");
    await fs.writeFile(path.join(root, "generated", "WEEKLY-2026-W19.md"), "x", "utf8");
    await fs.writeFile(path.join(root, "generated", "notes.txt"), "y", "utf8");
    const got = await defaultLoader({ vaultRoot: root, date: ANCHOR });
    expect(got.map((s) => s.date)).toEqual(["2026-05-10"]);
  });

  it("returns [] when generated/ does not exist (fail-soft)", async () => {
    const root = await mkBareVault();
    expect(await defaultLoader({ vaultRoot: root, date: ANCHOR })).toEqual([]);
  });

  it("keeps the whole week when exactly DAYS_PER_WEEK files are in-window", async () => {
    const root = await mkVault();
    for (const d of WEEK_DATES) await seedDaily(root, d, d);
    const got = await defaultLoader({ vaultRoot: root, date: ANCHOR });
    expect(got).toHaveLength(DAYS_PER_WEEK);
    expect(got.map((s) => s.date)).toEqual(WEEK_DATES);
  });

  it("populates body + bytes + path accurately for each source", async () => {
    const root = await mkVault();
    await seedDaily(root, "2026-05-10", "exact body");
    const got = await defaultLoader({ vaultRoot: root, date: ANCHOR });
    expect(got).toHaveLength(1);
    expect(got[0].body).toBe("exact body");
    expect(got[0].bytes).toBe(Buffer.byteLength("exact body", "utf8"));
    expect(got[0].path).toBe(path.join(root, "generated", "DAILY-CONTEXT-2026-05-10.md"));
  });
});

/* ===================================================================== */
/* Engine E2E — real loader + injected summarizer                        */
/* ===================================================================== */

describe("WeeklySynthesisEngine.runWeekly — EXIT CONDITION: 7-day fixture -> all 4 sections", () => {
  it("synthesizes a 7-day week into WEEKLY-<weekIso>.md carrying every mandatory section", async () => {
    const root = await mkVault();
    for (const d of WEEK_DATES) await seedDaily(root, d, `daily brief for ${d}`);

    // before-state: exactly the 7 daily-context files, no WEEKLY yet
    expect(await ls(path.join(root, "generated"))).toEqual(
      WEEK_DATES.map((d) => `DAILY-CONTEXT-${d}.md`).sort(),
    );

    // capturing summarizer proves the real loader handed the briefs through
    let received = 0;
    const capturing: SummarizerFn = async (opts) => {
      received = opts.sources.length;
      return { ok: true, text: VALID_RETRO, model: "test-fake" };
    };
    const engine = new WeeklySynthesisEngine({ summarizer: capturing });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(received).toBe(7);
    expect(r.sources_used).toBe(7);

    const expectedWeek = weekIsoUTC(new Date(`${ANCHOR}T00:00:00Z`));
    expect(r.weekIso).toBe(expectedWeek);
    expect(r.path).toBe(path.join(root, "generated", `WEEKLY-${expectedWeek}.md`));

    // the spec exit condition: the written file contains ALL 4 sections
    const written = await fs.readFile(r.path, "utf8");
    expect(hasAllSections(written)).toBe(true);
    for (const section of WEEKLY_SECTIONS) {
      expect(written).toContain(`## ${section}`);
    }
    expect(written).toContain("kind: weekly-synthesis");
    expect(written).toContain("## Source briefs");
    expect(written).toContain("DAILY-CONTEXT-2026-05-04.md");
    expect(r.bytes_written).toBe(Buffer.byteLength(written, "utf8"));
  });
});

describe("WeeklySynthesisEngine.runWeekly — spanning configs", () => {
  it("the 7-day window excludes a brief before window-start and one after the anchor", async () => {
    const root = await mkVault();
    for (const d of WEEK_DATES) await seedDaily(root, d, `in: ${d}`);
    await seedDaily(root, "2026-05-03", "BEFORE window start");
    await seedDaily(root, "2026-05-11", "AFTER the anchor");

    let receivedDates: string[] = [];
    const cap: SummarizerFn = async (opts) => {
      receivedDates = opts.sources.map((s) => s.date);
      return { ok: true, text: VALID_RETRO };
    };
    const engine = new WeeklySynthesisEngine({ summarizer: cap });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sources_used).toBe(7);
    expect(receivedDates).toEqual(WEEK_DATES); // no 05-03 / 05-11
  });

  it("a single in-window brief satisfies MIN_SOURCES_FOR_RETRO", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "the only brief this week");
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sources_used).toBe(MIN_SOURCES_FOR_RETRO);
  });

  it("honors an explicit outputDir distinct from generated/", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "brief");
    const outDir = path.join(root, "retros");
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR, outputDir: outDir });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path.startsWith(outDir)).toBe(true);
    expect(await ls(outDir)).toHaveLength(1);
  });
});

/* ===================================================================== */
/* Failure modes                                                         */
/* ===================================================================== */

describe("WeeklySynthesisEngine.runWeekly — failure modes", () => {
  it("invalid-vault-root when the vault dir does not exist", async () => {
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({
      vaultRoot: path.join(os.tmpdir(), `prism-wse-missing-${Date.now()}`),
      date: ANCHOR,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid-vault-root");
  });

  it("invalid-vault-root when vaultRoot is a file, not a directory", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-wse-f-"));
    const file = path.join(dir, "afile");
    await fs.writeFile(file, "x", "utf8");
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: file, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid-vault-root");
  });

  it("invalid-date for a non-date string", async () => {
    const root = await mkVault();
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: "not-a-date" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid-date");
  });

  it("invalid-date for an impossible calendar date (2026-02-30 is NOT normalized to Mar 2)", async () => {
    const root = await mkVault();
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: "2026-02-30" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid-date");
    expect(r.detail).toContain("2026-02-30");
  });

  it("invalid-date for a digit-shaped but out-of-range month", async () => {
    const root = await mkVault();
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: "2026-13-01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid-date");
  });

  it("no-sources when generated/ holds zero DAILY-CONTEXT files", async () => {
    const root = await mkVault(); // generated/ exists but empty
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("no-sources");
  });

  it("no-sources when generated/ holds only non-DAILY-CONTEXT files", async () => {
    const root = await mkVault();
    await fs.writeFile(path.join(root, "generated", "WEEKLY-2026-W19.md"), "x", "utf8");
    await fs.writeFile(path.join(root, "generated", "CONNECTIONS-2026-05-10.md"), "y", "utf8");
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("no-sources");
  });

  it("no-sources when every brief is OUTSIDE the 7-day window", async () => {
    const root = await mkVault();
    await seedDaily(root, "2026-04-01", "way too old");
    await seedDaily(root, "2026-05-30", "in the future");
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("no-sources");
  });

  it("summarizer-failed surfaces the summarizer's error verbatim", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "brief");
    const failing: SummarizerFn = async () => ({ ok: false, error: "http-503" });
    const engine = new WeeklySynthesisEngine({ summarizer: failing });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("summarizer-failed");
    expect(r.detail).toContain("http-503");
  });

  it("incomplete-synthesis when the retro is missing a section (the gap is named)", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "brief");
    const partial: SummarizerFn = async () => ({
      ok: true,
      text: "## Moved\nx\n## Didn't move\ny\n## Top-3 next-week leverage\n1. a",
    });
    const engine = new WeeklySynthesisEngine({ summarizer: partial });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("incomplete-synthesis");
    expect(r.detail).toContain("Emerging patterns");
    // a partial retro is NEVER written to disk
    expect(await ls(path.join(root, "generated"))).toEqual(["DAILY-CONTEXT-2026-05-10.md"]);
  });

  it("incomplete-synthesis when a section header is trapped inside a terminated code fence", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "brief");
    // all 4 headers are textually present, but the 4th sits INSIDE a fence ->
    // stripFences removes it -> the gate must NOT false-pass
    const fenced: SummarizerFn = async () => ({
      ok: true,
      text: [
        "## Moved",
        "x",
        "## Didn't move",
        "y",
        "## Emerging patterns",
        "z",
        "```",
        "## Top-3 next-week leverage",
        "1. a",
        "```",
      ].join("\n"),
    });
    const engine = new WeeklySynthesisEngine({ summarizer: fenced });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("incomplete-synthesis");
    expect(r.detail).toContain("Top-3 next-week leverage");
  });

  it("summarizer-failed when an injected summarizer THROWS (not just returns ok:false)", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "brief");
    // a SummarizerFn is an injected DI boundary — one that throws (vs. returning
    // {ok:false}) must be contained, not allowed to reject runWeekly's promise
    const thrower: SummarizerFn = async () => {
      throw new Error("ollama socket exploded mid-stream");
    };
    const engine = new WeeklySynthesisEngine({ summarizer: thrower });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("summarizer-failed");
    expect(r.detail).toContain("ollama socket exploded mid-stream");
  });

  it("write-failed when the output dir cannot be created (mkdir branch)", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "brief");
    // a FILE at <root>/blocker makes mkdir(<root>/blocker/nested) fail ENOTDIR
    const blocker = path.join(root, "blocker");
    await fs.writeFile(blocker, "x", "utf8");
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({
      vaultRoot: root,
      date: ANCHOR,
      outputDir: path.join(blocker, "nested"),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("write-failed");
  });

  it("write-failed when the target WEEKLY file path is already a directory (writeFile branch)", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "brief");
    // mkdir(outputDir) succeeds (generated/ already exists), but a DIRECTORY
    // pre-occupies the exact WEEKLY-<weekIso>.md path -> fs.writeFile fails
    // EISDIR. This exercises the writeFile branch of the step-4 try/catch,
    // distinct from the mkdir branch covered above.
    const week = weekIsoUTC(new Date(`${ANCHOR}T00:00:00Z`));
    await fs.mkdir(path.join(root, "generated", `WEEKLY-${week}.md`), { recursive: true });
    const engine = new WeeklySynthesisEngine({ summarizer: okSummarizer });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("write-failed");
  });
});

/* ===================================================================== */
/* Adversarial — heading-injection + fence safety                        */
/* ===================================================================== */

describe("WeeklySynthesisEngine — adversarial: heading-injection + fence traps", () => {
  it("neutralizeHeadings escapes leading #, defeating hasAllSections on injected headers", () => {
    const injected = WEEKLY_SECTIONS.map((s) => `## ${s}`).join("\n");
    expect(hasAllSections(injected)).toBe(true); // raw: all 4 headers count
    const neutralized = neutralizeHeadings(injected);
    expect(hasAllSections(neutralized)).toBe(false); // escaped: none count
    expect(neutralized).toContain("\\## Moved");
  });

  it("buildSummarizerPrompt escapes section headers smuggled inside an untrusted source body", () => {
    // a daily-context body that tries to smuggle all 4 structural headers
    const hostileBody = WEEKLY_SECTIONS.map((s) => `## ${s}`).join("\n");
    const prompt = buildSummarizerPrompt([mkSource(ANCHOR, hostileBody)], "2026-W20");
    // the escaped form can ONLY originate from the body (the instruction block
    // uses bare `## Moved`), so its presence proves the body was neutralized
    expect(prompt).toContain("\\## Moved");
    expect(prompt).toContain("\\## Top-3 next-week leverage");
  });

  it("an UNTERMINATED code fence in the retro swallows a trailing header -> incomplete-synthesis", async () => {
    const root = await mkVault();
    await seedDaily(root, ANCHOR, "brief");
    // 3 real headers, then an unterminated fence that traps the 4th to EOF
    const unterminated: SummarizerFn = async () => ({
      ok: true,
      text: [
        "## Moved",
        "x",
        "## Didn't move",
        "y",
        "## Emerging patterns",
        "z",
        "```",
        "## Top-3 next-week leverage",
        "1. a (fence never closed)",
      ].join("\n"),
    });
    const engine = new WeeklySynthesisEngine({ summarizer: unterminated });
    const r = await engine.runWeekly({ vaultRoot: root, date: ANCHOR });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("incomplete-synthesis");
    expect(r.detail).toContain("Top-3 next-week leverage");
  });
});
