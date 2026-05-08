/**
 * ContentBriefEngine.test.ts
 *
 * OBSIDIAN-CONTENT-MS2/U-CONTENT-BRIEF — exit_criteria coverage:
 *   1. Valid seed → 5-field brief written
 *   2. ONE THING > 220 chars rejected (article rule)
 *   3. Compound sentence in ONE THING rejected (article rule)
 *   4. Vague proof (no digit, no source tag) rejected (article rule)
 *   5. Missing audience/transformation rejected
 *   6. Hooks always 3 distinct angles (aggressive/curious/personal)
 *   7. Closers always 3 distinct angles (urgency/memorability/cta)
 *   8. Idempotent on signature
 *
 * 14 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ContentBriefEngine,
  contentBriefEngine,
  type BriefSeed,
} from "../engines/ContentBriefEngine.js";

let briefsDir: string;
const FIXED_NOW_MS = Date.UTC(2026, 4, 8, 12, 0, 0);

const validSeed = (): BriefSeed => ({
  oneThing: "Posts with a specific number in the first line outperform numberless hooks 3:1 across all pillars.",
  proof: "Hook variant A drove 443,000 impressions and 11,678 bookmarks vs variant B at 81,000/210.",
  audience: "builders shipping AI tooling and content who already use Claude Code",
  readerBefore: "I should write better hooks somehow",
  readerAfter: "I should put a specific number in the first line of every hook",
});

beforeEach(() => {
  briefsDir = mkdtempSync(join(tmpdir(), "brief-test-"));
});

afterEach(() => {
  rmSync(briefsDir, { recursive: true, force: true });
});

describe("ContentBriefEngine", () => {
  // -------------------- HAPPY PATHS --------------------

  it("valid seed → action='wrote', file landed with 5-section markdown", () => {
    const r = contentBriefEngine.generate(validSeed(), { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r.action).toBe("wrote");
    const md = readFileSync(r.filePath, "utf8");
    expect(md).toContain("## ONE THING");
    expect(md).toContain("## PROOF");
    expect(md).toContain("## READER TRANSFORMATION");
    expect(md).toContain("## THREE HOOKS");
    expect(md).toContain("## THREE CLOSERS");
  });

  it("brief structure has exactly 3 hooks ranked 1/2/3 with distinct angles", () => {
    const r = contentBriefEngine.generate(validSeed(), { briefsDir, now: FIXED_NOW_MS });
    expect(r.brief).not.toBe(null);
    const hooks = r.brief!.hooks;
    expect(hooks.length).toBe(3);
    expect(hooks.map((h) => h.rank)).toEqual([1, 2, 3]);
    const angles = hooks.map((h) => h.angle);
    expect(new Set(angles).size).toBe(3);
    expect(angles).toContain("aggressive");
    expect(angles).toContain("curious");
    expect(angles).toContain("personal");
  });

  it("brief structure has exactly 3 closers ranked 1/2/3 with distinct angles", () => {
    const r = contentBriefEngine.generate(validSeed(), { briefsDir, now: FIXED_NOW_MS });
    expect(r.brief!.closers.length).toBe(3);
    const angles = r.brief!.closers.map((c) => c.angle);
    expect(new Set(angles).size).toBe(3);
    expect(angles).toContain("urgency");
    expect(angles).toContain("memorability");
    expect(angles).toContain("cta");
  });

  it("dry-run reports markdown but writes no file", () => {
    const r = contentBriefEngine.generate(validSeed(), { briefsDir, apply: false, now: FIXED_NOW_MS });
    expect(r.action).toBe("would-write");
    expect(r.markdown.length).toBeGreaterThan(200);
    expect(readdirSync(briefsDir).length).toBe(0);
  });

  it("readerTransformation field collapses before→after into one line", () => {
    const r = contentBriefEngine.generate(validSeed(), { briefsDir, now: FIXED_NOW_MS });
    expect(r.brief!.readerTransformation).toBe("I should write better hooks somehow → I should put a specific number in the first line of every hook");
  });

  it("source notes appear as wiki-link citations when provided", () => {
    const seed = validSeed();
    seed.sourceNotes = ["connection-hook-numbers--engagement-data", "feedback_first_line_specificity"];
    const r = contentBriefEngine.generate(seed, { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r.action).toBe("wrote");
    const md = readFileSync(r.filePath, "utf8");
    expect(md).toContain("[[connection-hook-numbers--engagement-data]]");
    expect(md).toContain("[[feedback_first_line_specificity]]");
  });

  // -------------------- REJECT CASES (article quality bar) --------------------

  it("rejects oneThing that exceeds 220 chars (article: 'one sentence maximum')", () => {
    const seed = validSeed();
    seed.oneThing = "X ".repeat(120) + "ends.";
    const r = contentBriefEngine.generate(seed, { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r.action).toBe("rejected");
    expect(r.reason).toContain("220");
  });

  it("rejects compound sentence in oneThing (article: single insight)", () => {
    const seed = validSeed();
    seed.oneThing = "Hooks with numbers win. Closers with urgency win.";
    const r = contentBriefEngine.generate(seed, { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r.action).toBe("rejected");
    expect(r.reason).toContain("single sentence");
  });

  it("rejects vague proof (no digit, no source tag)", () => {
    const seed = validSeed();
    seed.proof = "Performed well across the board last week";
    const r = contentBriefEngine.generate(seed, { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r.action).toBe("rejected");
    expect(r.reason).toContain("digit");
  });

  it("accepts proof that has a source tag even without digits", () => {
    const seed = validSeed();
    seed.proof = "Verified by [[reference_first_line_specificity]] across the last month of posts";
    const r = contentBriefEngine.generate(seed, { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r.action).toBe("wrote");
  });

  it("rejects missing audience", () => {
    const seed = validSeed();
    seed.audience = "";
    const r = contentBriefEngine.generate(seed, { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r.action).toBe("rejected");
    expect(r.reason).toContain("audience");
  });

  it("rejects missing readerBefore or readerAfter", () => {
    const seed = validSeed();
    seed.readerAfter = "";
    const r = contentBriefEngine.generate(seed, { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r.action).toBe("rejected");
    expect(r.reason).toContain("readerBefore");
  });

  // -------------------- IDEMPOTENT --------------------

  it("idempotent: same oneThing → same signature → 'already-exists' on second run", () => {
    contentBriefEngine.generate(validSeed(), { briefsDir, apply: true, now: FIXED_NOW_MS });
    const r2 = contentBriefEngine.generate(validSeed(), { briefsDir, apply: true, now: FIXED_NOW_MS });
    expect(r2.action).toBe("already-exists");
    expect(readdirSync(briefsDir).length).toBe(1);
  });

  // -------------------- DETERMINISM + ADVERSARIAL --------------------

  it("singleton == fresh class instance — equivalent results", () => {
    const fresh = new ContentBriefEngine();
    const r1 = contentBriefEngine.generate(validSeed(), { briefsDir, now: FIXED_NOW_MS });
    const r2 = fresh.generate(validSeed(), { briefsDir, now: FIXED_NOW_MS });
    expect(r2.signature).toBe(r1.signature);
    expect(r2.brief!.hooks).toEqual(r1.brief!.hooks);
    expect(r2.brief!.closers).toEqual(r1.brief!.closers);
  });
});
