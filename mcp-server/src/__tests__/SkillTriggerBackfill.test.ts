/**
 * SkillTriggerBackfill.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S5/U-SKILL-TRIGGER-META — exit_criteria coverage:
 *   1. Skills lacking trigger get keywords added (≥1 non-empty keyword)
 *   2. Skills already with trigger: are skipped (idempotent)
 *   3. Marker-gated revert reverses only what we wrote
 *   4. Atomic write (no .trigger.tmp leftovers)
 *   5. Top-N cap honored
 *   6. Keyword extraction produces non-trivial keywords from real skill bodies
 *   7. Malformed frontmatter handled
 *
 * 13 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// .../mcp-server/src/__tests__ → 3 up = repo root
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCRIPT_PATH = join(REPO_ROOT, "scripts", "skill-trigger-backfill.mjs");

let tmpRoot: string;
type RunTriggerBackfill = (opts: {
  apply?: boolean;
  revert?: boolean;
  roots?: string[];
  top?: number;
  nowIso?: string;
}) => {
  mode: "backfill" | "revert";
  apply: boolean;
  top: number;
  counters: Record<string, number>;
  results: Array<{ path: string; action: string; reason: string; keywords: string[] }>;
};

let runTriggerBackfill: RunTriggerBackfill;

function writeSkill(rel: string, content: string): string {
  const full = join(tmpRoot, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
  return full;
}

beforeEach(async () => {
  tmpRoot = mkdtempSync(join(tmpdir(), "stb-test-"));
  if (!runTriggerBackfill) {
    const mod = await import(pathToFileURL(SCRIPT_PATH).href);
    runTriggerBackfill = mod.runTriggerBackfill;
  }
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("skill-trigger-backfill", () => {
  // -------------------- HAPPY PATHS --------------------

  it("adds trigger.autoSuggest.keywords to a skill lacking trigger", () => {
    writeSkill("audit-task.md",
      "---\ndescription: Audit completed PRISM tasks for gaps and verify shipped reality.\n---\n\n# /audit-task — Verify completed work\n\nReview, audit, and validate finished PRISM milestones.\n");
    const r = runTriggerBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-05-08T00:00:00.000Z" });
    expect(r.counters.backfilled).toBe(1);
    const after = readFileSync(join(tmpRoot, "audit-task.md"), "utf8");
    expect(after).toContain("trigger:");
    expect(after).toContain("autoSuggest:");
    expect(after).toContain("keywords:");
    expect(after).toContain("_triggerBackfill: 2026-05-08T00:00:00.000Z");
  });

  it("dry-run reports counts but writes nothing", () => {
    const path = writeSkill("dry.md",
      "---\ndescription: Dry run skill.\n---\n\n# /dry — Skill\n\nValidate the harness.\n");
    const before = readFileSync(path, "utf8");
    const r = runTriggerBackfill({ apply: false, roots: [tmpRoot] });
    expect(r.counters.backfilled).toBe(1);
    const after = readFileSync(path, "utf8");
    expect(after).toBe(before);
  });

  it("extracts non-trivial keywords from skill body (no junk like 'the' or 'and')", () => {
    writeSkill("lathe-optimize.md",
      "---\ndescription: Optimize lathe turning programs for speed and tool life.\n---\n\n# /lathe-optimize — CNC lathe program optimization\n\nOptimize CNC lathe programs by analyzing turning toolpaths and applying physics-backed cutting strategies.\n");
    const r = runTriggerBackfill({ apply: false, roots: [tmpRoot] });
    expect(r.results.length).toBe(1);
    const kw = r.results[0].keywords;
    expect(kw.length).toBeGreaterThan(0);
    // Must NOT contain junk stopwords
    for (const k of kw) {
      expect(k).not.toBe("the");
      expect(k).not.toBe("and");
      expect(k).not.toBe("for");
    }
    // Should pull out 'lathe' or 'optimize' from a lathe-optimize skill
    const joined = kw.join(" ");
    expect(joined).toMatch(/lathe|optim|turning/);
  });

  it("idempotent: second --apply on same files is a no-op", () => {
    writeSkill("a.md", "---\ndescription: x\n---\n\n# /a — title\n\nbody\n");
    runTriggerBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-05-08T00:00:00.000Z" });
    const afterFirst = readFileSync(join(tmpRoot, "a.md"), "utf8");
    const r2 = runTriggerBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-06-01T00:00:00.000Z" });
    expect(r2.counters.alreadyHasTrigger).toBe(1);
    expect(r2.counters.backfilled).toBe(0);
    const afterSecond = readFileSync(join(tmpRoot, "a.md"), "utf8");
    expect(afterSecond).toBe(afterFirst);
  });

  it("synthesizes frontmatter when skill file has no frontmatter at all", () => {
    writeSkill("no-fm.md", "# /no-fm — Bare skill\n\nRecognize this minimal pattern.\n");
    const r = runTriggerBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.backfilled).toBe(1);
    const after = readFileSync(join(tmpRoot, "no-fm.md"), "utf8");
    expect(after.startsWith("---\ntrigger:")).toBe(true);
  });

  // -------------------- SKIP CASES --------------------

  it("skips skills that already have a trigger: block (any shape)", () => {
    writeSkill("scout.md",
      "---\ndescription: Discover new tools.\ntrigger:\n  autoSuggest:\n    keywords: [scout, discover]\n---\n\n# /scout — Discovery\n\nbody\n");
    const r = runTriggerBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.alreadyHasTrigger).toBe(1);
    expect(r.counters.backfilled).toBe(0);
  });

  it("skips skills with malformed (unterminated) frontmatter", () => {
    writeSkill("broken.md", "---\ndescription: missing terminator\nno end fence here\n");
    const r = runTriggerBackfill({ apply: true, roots: [tmpRoot] });
    expect(r.counters.malformed).toBe(1);
    expect(r.counters.backfilled).toBe(0);
  });

  // -------------------- TOP-N CAP --------------------

  it("respects --top cap (3 of 10 skills modified)", () => {
    for (let i = 0; i < 10; i++) {
      writeSkill(`s-${i.toString().padStart(2, "0")}.md`,
        `---\ndescription: skill number ${i}.\n---\n\n# /s-${i} — Numbered skill\n\nReview audit topic ${i}.\n`);
    }
    const r = runTriggerBackfill({ apply: true, roots: [tmpRoot], top: 3 });
    expect(r.counters.backfilled).toBe(3);
    expect(r.counters.scanned).toBe(10);
    // Remaining 7 should appear as top-cap-reached
    const capped = r.results.filter((x) => x.reason === "top-cap-reached");
    expect(capped.length).toBe(7);
  });

  // -------------------- ADVERSARIAL --------------------

  it("file with no extractable keywords (all stopwords) is skipped gracefully", () => {
    writeSkill("empty-body.md", "---\ndescription:\n---\n\n# /a -\n\nthe and for with this that have from into.\n");
    const r = runTriggerBackfill({ apply: true, roots: [tmpRoot] });
    // Slug 'empty-body' itself is meaningful → still gets at least 1 keyword.
    // Either backfilled or no-keywords — both are valid; assert no error and no crash.
    expect(r.counters.errored).toBe(0);
    const totalProcessed = r.counters.backfilled + r.counters.noKeywords;
    expect(totalProcessed).toBe(1);
  });

  it("atomic write: no .trigger.tmp leftovers after success", () => {
    for (let i = 0; i < 5; i++) {
      writeSkill(`f-${i}.md`, `---\ndescription: file ${i}.\n---\n\n# /f-${i} — File\n\naudit content ${i}.\n`);
    }
    runTriggerBackfill({ apply: true, roots: [tmpRoot] });
    const left = readdirSync(tmpRoot).filter((n) => n.endsWith(".trigger.tmp"));
    expect(left).toEqual([]);
  });

  // -------------------- REVERT --------------------

  it("revert removes ONLY marker-bearing trigger blocks (preserves pre-existing)", () => {
    // We backfilled this one
    writeSkill("ours.md", "---\ndescription: our skill.\n---\n\n# /ours — Ours\n\nReview audit content here.\n");
    // Pre-existing trigger — must be preserved by revert
    writeSkill("theirs.md", "---\ndescription: their skill.\ntrigger:\n  autoSuggest:\n    keywords: [pre-existing]\n---\n\n# /theirs — Theirs\n\nbody\n");

    runTriggerBackfill({ apply: true, roots: [tmpRoot], nowIso: "2026-05-08T00:00:00.000Z" });
    const ours1 = readFileSync(join(tmpRoot, "ours.md"), "utf8");
    expect(ours1).toContain("_triggerBackfill:");

    const r = runTriggerBackfill({ apply: true, revert: true, roots: [tmpRoot] });
    expect(r.counters.reverted).toBe(1);
    const ours2 = readFileSync(join(tmpRoot, "ours.md"), "utf8");
    expect(ours2).not.toContain("_triggerBackfill");
    expect(ours2).not.toContain("trigger:");

    const theirs2 = readFileSync(join(tmpRoot, "theirs.md"), "utf8");
    expect(theirs2).toContain("trigger:");
    expect(theirs2).toContain("[pre-existing]");
  });

  it("revert dry-run reports without writing", () => {
    writeSkill("a.md", "---\ndescription: x.\n---\n\n# /a — A\n\nbody\n");
    runTriggerBackfill({ apply: true, roots: [tmpRoot] });
    const before = readFileSync(join(tmpRoot, "a.md"), "utf8");
    const r = runTriggerBackfill({ apply: false, revert: true, roots: [tmpRoot] });
    expect(r.counters.reverted).toBe(1);
    const after = readFileSync(join(tmpRoot, "a.md"), "utf8");
    expect(after).toBe(before);
  });

  it("output frontmatter parses (round-trip): re-running --apply does not double-add trigger", () => {
    writeSkill("a.md", "---\ndescription: x.\n---\n\n# /a — A\n\nReview audit body.\n");
    runTriggerBackfill({ apply: true, roots: [tmpRoot] });
    runTriggerBackfill({ apply: true, roots: [tmpRoot] }); // 2nd run
    const after = readFileSync(join(tmpRoot, "a.md"), "utf8");
    // Count occurrences of `trigger:` — must be exactly 1
    const triggerCount = (after.match(/^trigger:/gm) || []).length;
    expect(triggerCount).toBe(1);
  });
});
