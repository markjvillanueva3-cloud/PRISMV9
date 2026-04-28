/**
 * reviewer-fail-latch — synthetic-input tests for U-AF03.
 *
 * Pure decision logic — tests cover all latching/release branches
 * without spawning the hook.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF03
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing decision logic from sibling .mjs lib (no shebang, vitest-safe)
import { decideReviewerFailLatch } from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

const SESSION_A = "session-aaa";
const SESSION_B = "session-bbb";

const ts = (offsetMin: number) =>
  new Date(Date.now() - offsetMin * 60 * 1000).toISOString();

describe("U-AF03 reviewer-fail-latch", () => {
  describe("non-autonomous mode", () => {
    it("passes through regardless of FAILs", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: false,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-X01", verdict: "FAIL", at: ts(5) },
        ],
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("non-autonomous");
    });
  });

  describe("explicit override", () => {
    it("respects PRISM_LATCH_OVERRIDE=1", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: true,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-X01", verdict: "FAIL", at: ts(5) },
        ],
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("override-active");
    });
  });

  describe("happy paths (no block)", () => {
    it("passes through when no session id (loop not initialized)", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: null,
        verdicts: [],
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-session-id");
    });

    it("passes through when verdicts file is missing", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: null,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-verdicts-file");
    });

    it("passes through when only PASS verdicts in current session", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-A01", verdict: "PASS", at: ts(10) },
          { session_id: SESSION_A, unit_id: "U-A02", verdict: "PASS", at: ts(5) },
        ],
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-fails");
      expect(r.verdict_count).toBe(2);
    });

    it("passes when FAIL is in a DIFFERENT session", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_B, unit_id: "U-X01", verdict: "FAIL", at: ts(60) },
          { session_id: SESSION_A, unit_id: "U-A01", verdict: "PASS", at: ts(5) },
        ],
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-fails");
    });

    it("ignores WARN verdicts (not FAIL)", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-A01", verdict: "WARN", at: ts(5) },
        ],
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-fails");
    });
  });

  describe("block paths", () => {
    it("BLOCKS on a single FAIL in current session", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-A03", verdict: "FAIL", at: ts(2),
            summary: "schema enum drift" },
        ],
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
      expect(r.reason).toBe("fail-latched");
      expect(r.fail_count).toBe(1);
      expect(r.first_fail.unit_id).toBe("U-A03");
      expect(r.first_fail.summary).toBe("schema enum drift");
    });

    it("BLOCKS even when subsequent verdicts are PASS (latch is sticky)", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-A03", verdict: "FAIL", at: ts(10) },
          { session_id: SESSION_A, unit_id: "U-A04", verdict: "PASS", at: ts(5) },
          { session_id: SESSION_A, unit_id: "U-A05", verdict: "PASS", at: ts(2) },
        ],
      });
      expect(r.continue).toBe(false);
      expect(r.fail_count).toBe(1);
    });

    it("BLOCKS and counts multiple FAILs", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-A03", verdict: "FAIL", at: ts(10) },
          { session_id: SESSION_A, unit_id: "U-A04", verdict: "FAIL", at: ts(5) },
          { session_id: SESSION_A, unit_id: "U-A05", verdict: "FAIL", at: ts(2) },
        ],
      });
      expect(r.continue).toBe(false);
      expect(r.fail_count).toBe(3);
    });

    it("normalizes verdict casing — 'fail' lowercase still latches", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-A03", verdict: "fail", at: ts(5) },
        ],
      });
      expect(r.continue).toBe(false);
      expect(r.fail_count).toBe(1);
    });
  });

  describe("adversarial inputs", () => {
    it("ignores malformed verdict entries", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          null,
          "string-not-object",
          { session_id: SESSION_A, verdict: "FAIL" }, // valid — will trip
          {},
          { session_id: SESSION_A }, // missing verdict field
        ],
      });
      expect(r.continue).toBe(false);
      expect(r.fail_count).toBe(1);
    });

    it("treats non-array verdicts payload as missing-file", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: "not-an-array" as unknown as null,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-verdicts-file");
    });
  });

  describe("contract guarantees", () => {
    it("never blocks when isAutonomous=false (off-switch)", () => {
      const adversarial = [
        [{ session_id: SESSION_A, unit_id: "X", verdict: "FAIL", at: ts(0) }],
        Array.from({ length: 10 }, (_, i) => ({
          session_id: SESSION_A,
          unit_id: `U-${i}`,
          verdict: "FAIL",
          at: ts(i),
        })),
      ];
      for (const verdicts of adversarial) {
        const r = decideReviewerFailLatch({
          isAutonomous: false,
          overrideEnabled: false,
          currentSessionId: SESSION_A,
          verdicts,
        });
        expect(r.continue).toBe(true);
      }
    });

    it("block decision always includes fail_count + first_fail", () => {
      const r = decideReviewerFailLatch({
        isAutonomous: true,
        overrideEnabled: false,
        currentSessionId: SESSION_A,
        verdicts: [
          { session_id: SESSION_A, unit_id: "U-X", verdict: "FAIL", at: ts(1) },
        ],
      });
      expect(r.continue).toBe(false);
      expect(typeof r.fail_count).toBe("number");
      expect(typeof r.first_fail.unit_id).toBe("string");
    });
  });
});
