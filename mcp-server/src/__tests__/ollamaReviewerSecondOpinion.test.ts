/**
 * ollama-reviewer-second-opinion — synthetic-input tests for U-AF08.
 *
 * Tests the 2 pure functions exposed for the second-opinion review hook:
 *   - parseOllamaReviewVerdict(raw) — Ollama-response → verdict
 *   - decideOllamaReviewSecondOpinion(input) — 9-branch decision
 *
 * The hook script handles I/O glue: reading staged diff, calling Ollama,
 * recording CONCERN/FAIL verdicts to REVIEWER_VERDICTS.json so the U-AF03
 * fail-latch can act if a CONCERN later escalates.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF08
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing pure logic from .mjs lib (no shebang, vitest-safe)
import {
  parseOllamaReviewVerdict,
  decideOllamaReviewSecondOpinion,
} from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

describe("U-AF08 parseOllamaReviewVerdict", () => {
  describe("happy paths", () => {
    it("parses a clean PASS verdict", () => {
      const raw = JSON.stringify({
        verdict: "PASS",
        reason: "Looks good — no concerns.",
        confidence: 0.9,
      });
      const r = parseOllamaReviewVerdict(raw);
      expect(r.ok).toBe(true);
      expect(r.verdict).toBe("PASS");
      expect(r.reason).toBe("Looks good — no concerns.");
      expect(r.confidence).toBe(0.9);
    });

    it("parses a CONCERN verdict", () => {
      const raw = JSON.stringify({
        verdict: "CONCERN",
        reason: "Magic numbers in cutting force calc.",
        confidence: 0.65,
      });
      const r = parseOllamaReviewVerdict(raw);
      expect(r.ok).toBe(true);
      expect(r.verdict).toBe("CONCERN");
    });

    it("parses a FAIL verdict", () => {
      const raw = JSON.stringify({
        verdict: "FAIL",
        reason: "Hardcoded Kienzle constant — violates safety rule.",
        confidence: 0.95,
      });
      const r = parseOllamaReviewVerdict(raw);
      expect(r.ok).toBe(true);
      expect(r.verdict).toBe("FAIL");
    });

    it("uppercases lowercase verdict (Ollama is sloppy)", () => {
      const raw = '{"verdict":"pass","reason":"ok"}';
      const r = parseOllamaReviewVerdict(raw);
      expect(r.ok).toBe(true);
      expect(r.verdict).toBe("PASS");
    });

    it("strips ```json markdown fences", () => {
      const raw =
        "Here's my review:\n" +
        "```json\n" +
        '{"verdict":"PASS","reason":"clean","confidence":0.8}\n' +
        "```";
      const r = parseOllamaReviewVerdict(raw);
      expect(r.ok).toBe(true);
      expect(r.verdict).toBe("PASS");
    });

    it("extracts JSON from prose-wrapped response", () => {
      const raw = 'After reviewing: {"verdict":"FAIL","reason":"Bad."} Hope this helps.';
      const r = parseOllamaReviewVerdict(raw);
      expect(r.ok).toBe(true);
      expect(r.verdict).toBe("FAIL");
    });

    it("defaults missing reason to placeholder", () => {
      const r = parseOllamaReviewVerdict('{"verdict":"PASS"}');
      expect(r.ok).toBe(true);
      expect(r.reason).toBe("(no reason provided)");
    });

    it("defaults missing confidence to 0.5", () => {
      const r = parseOllamaReviewVerdict('{"verdict":"PASS","reason":"ok"}');
      expect(r.ok).toBe(true);
      expect(r.confidence).toBe(0.5);
    });

    it("clamps confidence > 1 to 1", () => {
      const r = parseOllamaReviewVerdict('{"verdict":"PASS","reason":"ok","confidence":1.7}');
      expect(r.ok).toBe(true);
      expect(r.confidence).toBe(1);
    });

    it("clamps negative confidence to 0", () => {
      const r = parseOllamaReviewVerdict('{"verdict":"PASS","reason":"ok","confidence":-0.5}');
      expect(r.ok).toBe(true);
      expect(r.confidence).toBe(0);
    });

    it("truncates long reason strings to 500 chars", () => {
      const longReason = "x".repeat(800);
      const r = parseOllamaReviewVerdict(JSON.stringify({
        verdict: "PASS",
        reason: longReason,
      }));
      expect(r.ok).toBe(true);
      expect(r.reason.length).toBe(500);
    });
  });

  describe("rejection paths", () => {
    it("rejects empty string as empty-response", () => {
      const r = parseOllamaReviewVerdict("");
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("empty-response");
    });

    it("rejects whitespace-only string", () => {
      const r = parseOllamaReviewVerdict("   \n\t  ");
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("empty-response");
    });

    it("rejects null and undefined", () => {
      expect(parseOllamaReviewVerdict(null).ok).toBe(false);
      expect(parseOllamaReviewVerdict(null).reason).toBe("empty-response");
      expect(parseOllamaReviewVerdict(undefined).ok).toBe(false);
    });

    it("rejects response with no JSON object", () => {
      const r = parseOllamaReviewVerdict("Sorry, I can't review this.");
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("no-json-object");
    });

    it("rejects malformed JSON (balanced braces, broken syntax)", () => {
      const r = parseOllamaReviewVerdict('{"verdict": "PASS, reason: "x"}');
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("invalid-json");
    });

    it("rejects unknown verdict literal", () => {
      const r = parseOllamaReviewVerdict('{"verdict":"MAYBE","reason":"unsure"}');
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("invalid-verdict");
    });

    it("rejects non-string verdict", () => {
      const r = parseOllamaReviewVerdict('{"verdict":42,"reason":"weird"}');
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("invalid-verdict");
    });

    it("rejects array-only JSON (extractor wants object)", () => {
      const r = parseOllamaReviewVerdict('["PASS"]');
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("no-json-object");
    });
  });
});

describe("U-AF08 decideOllamaReviewSecondOpinion", () => {
  const passVerdict = { ok: true, verdict: "PASS", reason: "ok", confidence: 0.9 };
  const concernVerdict = { ok: true, verdict: "CONCERN", reason: "magic number", confidence: 0.7 };
  const failVerdict = { ok: true, verdict: "FAIL", reason: "inlined kc1.1", confidence: 0.95 };

  describe("non-commit pass-through", () => {
    it("passes any non-commit invocation", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: false,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("not-a-commit");
    });
  });

  describe("autonomy gate", () => {
    it("does NOT block in non-autonomous mode (manual review owns it)", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: false,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("non-autonomous");
    });
  });

  describe("override switch", () => {
    it("does NOT block when override flag is on", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: true,
        diffLineCount: 100,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("override-active");
    });
  });

  describe("diff size gates", () => {
    it("skips trivially small diffs (<5 lines)", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 2,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("diff-trivially-small");
      expect(r.diff_line_count).toBe(2);
    });

    it("skips mega-diffs (>5000 lines)", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 8000,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("diff-too-large");
      expect(r.diff_line_count).toBe(8000);
    });

    it("treats NaN diffLineCount as 0 → skip-small", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: Number.NaN,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("diff-trivially-small");
    });
  });

  describe("Ollama unavailability (fail-OPEN)", () => {
    it("does NOT block when ollamaVerdict is null", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: null,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("ollama-unavailable");
    });

    it("does NOT block when verdict parse failed", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: { ok: false, reason: "no-json-object" },
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("ollama-parse-failed:no-json-object");
    });
  });

  describe("verdict resolution", () => {
    it("PASS continues without recording", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: passVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("review-pass");
      expect(r.verdict).toBe("PASS");
      // PASS path must NOT record (record_verdict only set for CONCERN/FAIL)
      expect(r.record_verdict === true).toBe(false);
    });

    it("CONCERN continues but records verdict for U-AF03 latch", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: concernVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("review-concern");
      expect(r.record_verdict).toBe(true);
    });

    it("FAIL BLOCKS the commit and records verdict", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
      expect(r.reason).toBe("review-fail");
      expect(r.verdict).toBe("FAIL");
      expect(r.record_verdict).toBe(true);
      expect(r.review_reason).toBe("inlined kc1.1");
    });
  });

  describe("contract guarantees", () => {
    it("never blocks when isAutonomous=false even on FAIL verdict", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: false,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("non-autonomous");
    });

    it("never blocks when isAutonomous=false even on null verdict", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: false,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: null,
      });
      expect(r.continue).toBe(true);
    });

    it("never blocks when overrideEnabled=true (escape hatch holds)", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: true,
        diffLineCount: 100,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("override-active");
    });

    it("BLOCK output always includes verdict, review_reason, record_verdict", () => {
      const r = decideOllamaReviewSecondOpinion({
        isAutonomous: true,
        isCommit: true,
        overrideEnabled: false,
        diffLineCount: 100,
        ollamaVerdict: failVerdict,
      });
      expect(r.continue).toBe(false);
      expect(typeof r.verdict).toBe("string");
      expect(typeof r.review_reason).toBe("string");
      expect(r.record_verdict).toBe(true);
    });
  });
});
