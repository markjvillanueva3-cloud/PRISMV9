/**
 * ContentWriterEngine.test.ts
 *
 * OBSIDIAN-CONTENT-MS2/U-VOICE-SPEC — exit_criteria coverage:
 *   1. ban_words detected with phrase matching
 *   2. ban_punctuation (semicolon) flagged
 *   3. max_sentence_length warns on long sentences
 *   4. require_specific_number errors on no-digit drafts
 *   5. min_screenshot_line warns when no quotable line
 *   6. Voice-spec frontmatter parsed correctly
 *   7. Override rules path works for tests
 *
 * 13 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ContentWriterEngine,
  contentWriterEngine,
  type VoiceRules,
} from "../engines/ContentWriterEngine.js";

let tmpDir: string;
const STRICT_RULES: VoiceRules = {
  banWords: ["leverage", "utilize", "in conclusion"],
  banPunctuation: [";"],
  maxSentenceLengthChars: 100,
  requireSpecificNumber: true,
  minScreenshotLine: false,
  requireCloserFirst: false,
};

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "voice-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("ContentWriterEngine", () => {
  // -------------------- HAPPY PATHS --------------------

  it("clean draft passes with zero violations", () => {
    const draft = "Most second brains capture and retrieve. This one learns. After 30 days you have 12 ready briefs in queue.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    expect(r.passed).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it("flags ban_word 'leverage' with line number + reason", () => {
    const draft = "Posts that leverage AI tooling drove 443,000 impressions last month.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    expect(r.passed).toBe(false);
    const viol = r.violations.find((v) => v.rule === "ban_words");
    expect(viol).not.toBe(undefined);
    expect(viol!.severity).toBe("error");
    expect(viol!.reason).toContain("leverage");
  });

  it("flags multi-word ban phrase 'in conclusion'", () => {
    const draft = "We tested 5 hooks. In conclusion, numbers won 3:1.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    const viol = r.violations.find((v) => v.rule === "ban_words" && v.reason.includes("in conclusion"));
    expect(viol).not.toBe(undefined);
  });

  it("flags semicolon punctuation", () => {
    const draft = "Hooks matter; closers matter more. We measured 15,000 bookmarks.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    const viol = r.violations.find((v) => v.rule === "ban_punctuation");
    expect(viol).not.toBe(undefined);
    expect(viol!.severity).toBe("error");
  });

  // -------------------- SENTENCE LENGTH --------------------

  it("warns on sentence exceeding maxSentenceLengthChars", () => {
    // 110-char sentence, cap is 100
    const longSentence = "This is a deliberately long sentence with many words and additional clauses that pushes well past the cap.";
    const draft = `${longSentence} 42 followers.`;
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    const viol = r.violations.find((v) => v.rule === "max_sentence_length_chars");
    expect(viol).not.toBe(undefined);
    expect(viol!.severity).toBe("warn");
  });

  it("does NOT warn on short sentences below cap", () => {
    const draft = "Short. Snappy. Real number 42.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    expect(r.violations.find((v) => v.rule === "max_sentence_length_chars")).toBe(undefined);
  });

  // -------------------- REQUIRE SPECIFIC NUMBER --------------------

  it("errors when draft contains no digits and require_specific_number is true", () => {
    const draft = "Most posts perform poorly. The exception is when you write with care.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    const viol = r.violations.find((v) => v.rule === "require_specific_number");
    expect(viol).not.toBe(undefined);
    expect(viol!.severity).toBe("error");
  });

  it("passes the digit check when even one number is present", () => {
    const draft = "We measured 1 thing. Bookmarks dropped.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    expect(r.violations.find((v) => v.rule === "require_specific_number")).toBe(undefined);
  });

  it("require_specific_number=false bypasses the digit check", () => {
    const draft = "No numbers anywhere. Vague but allowed.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: { ...STRICT_RULES, requireSpecificNumber: false } });
    expect(r.violations.find((v) => v.rule === "require_specific_number")).toBe(undefined);
  });

  // -------------------- SCREENSHOT LINE --------------------

  it("warns when min_screenshot_line=true and no quotable line exists", () => {
    const draft = "tiny.\n42.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: { ...STRICT_RULES, minScreenshotLine: true } });
    const viol = r.violations.find((v) => v.rule === "min_screenshot_line");
    expect(viol).not.toBe(undefined);
    expect(viol!.severity).toBe("warn");
  });

  it("passes screenshot check when at least one ~80-char standalone sentence exists", () => {
    const draft = "Most second brains capture and retrieve. This vault learns from 443,000 impressions.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: { ...STRICT_RULES, minScreenshotLine: true } });
    expect(r.violations.find((v) => v.rule === "min_screenshot_line")).toBe(undefined);
  });

  // -------------------- VOICE SPEC PARSING --------------------

  it("loads rules from voice-spec.md frontmatter (override file)", () => {
    const specPath = join(tmpDir, "voice-spec.md");
    writeFileSync(specPath,
      "---\n" +
      "ban_words:\n" +
      "  - \"foo-banned\"\n" +
      "  - \"another\"\n" +
      "ban_punctuation: [\";\"]\n" +
      "max_sentence_length_chars: 80\n" +
      "require_specific_number: false\n" +
      "min_screenshot_line: false\n" +
      "---\n\n# Body\n",
      "utf8");
    const rules = contentWriterEngine.loadRules({ voiceSpecPath: specPath });
    expect(rules.banWords).toEqual(["foo-banned", "another"]);
    expect(rules.banPunctuation).toEqual([";"]);
    expect(rules.maxSentenceLengthChars).toBe(80);
    expect(rules.requireSpecificNumber).toBe(false);
    expect(rules.minScreenshotLine).toBe(false);
  });

  // -------------------- ADVERSARIAL --------------------

  it("violations sorted stably by line then severity", () => {
    const draft = "Line 1 has utilize and a semicolon; bad.\nLine 2 in conclusion summarizes 7 items.";
    const r = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    // Line 1 should appear before line 2 in the output.
    const lines = r.violations.map((v) => v.line);
    for (let i = 1; i < lines.length; i++) expect(lines[i]).toBeGreaterThanOrEqual(lines[i - 1]);
  });

  it("singleton == fresh class instance — equivalent results", () => {
    const fresh = new ContentWriterEngine();
    const draft = "Posts leverage AI to drive 443,000 impressions. Numbers win.";
    const r1 = contentWriterEngine.validate(draft, { rulesOverride: STRICT_RULES });
    const r2 = fresh.validate(draft, { rulesOverride: STRICT_RULES });
    expect(r2.passed).toBe(r1.passed);
    expect(r2.violations).toEqual(r1.violations);
  });
});
