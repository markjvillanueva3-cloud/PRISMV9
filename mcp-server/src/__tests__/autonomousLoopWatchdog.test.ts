/**
 * autonomous-loop-watchdog — synthetic-input tests for U-AF01.
 *
 * The hook is .mjs and reads stdin. Pure decision logic is exported
 * as `decideWatchdog` for testability — tests cover all branches of
 * the state machine without spawning a subprocess.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF01
 */

import { describe, it, expect } from "vitest";
// @ts-expect-error - importing decision logic from sibling .mjs lib (no shebang, vitest-safe)
import { decideWatchdog } from "../../../.claude/hooks/lib/autonomous-foolproof-logic.mjs";

const FIVE_MIN_MS = 5 * 60 * 1000;
const TWENTY_MIN_MS = 20 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

const NOW = new Date("2026-04-28T03:00:00Z").getTime();
const FIVE_MIN_AGO = new Date(NOW - FIVE_MIN_MS).toISOString();
const TWENTY_MIN_AGO = new Date(NOW - TWENTY_MIN_MS).toISOString();
const FIFTEEN_MIN_ONE_SEC_AGO = new Date(NOW - (FIFTEEN_MIN_MS + 1000)).toISOString();

describe("U-AF01 autonomous-loop-watchdog", () => {
  describe("non-autonomous mode (PRISM_AUTONOMOUS not set)", () => {
    it("passes through when isAutonomous=false", () => {
      const r = decideWatchdog({
        isAutonomous: false,
        state: { last_commit_at: TWENTY_MIN_AGO },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("non-autonomous");
    });
  });

  describe("autonomous mode — happy paths (no block)", () => {
    it("passes through when no state file exists", () => {
      const r = decideWatchdog({ isAutonomous: true, state: null, nowMs: NOW });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-state");
    });

    it("passes through when state has no timestamps", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: { schemaVersion: "1.0.0" },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-timestamp");
    });

    it("passes through when last commit was 5 minutes ago", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: { last_commit_at: FIVE_MIN_AGO },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("active");
      expect(r.elapsed_ms).toBe(FIVE_MIN_MS);
    });

    it("falls back to started_at when last_commit_at is null", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: { started_at: FIVE_MIN_AGO, last_commit_at: null },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.elapsed_ms).toBe(FIVE_MIN_MS);
    });
  });

  describe("autonomous mode — block paths", () => {
    it("BLOCKS when 20 minutes idle (default 15min threshold)", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: { last_commit_at: TWENTY_MIN_AGO },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
      expect(r.reason).toBe("idle-exceeded");
      expect(r.elapsed_ms).toBe(TWENTY_MIN_MS);
      expect(r.threshold_ms).toBe(FIFTEEN_MIN_MS);
      expect(r.last_commit_at).toBe(TWENTY_MIN_AGO);
    });

    it("BLOCKS exactly 1 second past threshold", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: { last_commit_at: FIFTEEN_MIN_ONE_SEC_AGO },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
    });

    it("does NOT block exactly at threshold (boundary)", () => {
      // elapsed === threshold; spec uses strict greater-than
      const exactlyAtThreshold = new Date(NOW - FIFTEEN_MIN_MS).toISOString();
      const r = decideWatchdog({
        isAutonomous: true,
        state: { last_commit_at: exactlyAtThreshold },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
    });

    it("respects a custom idle_threshold_ms cap (5min)", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: {
          last_commit_at: new Date(NOW - 6 * 60 * 1000).toISOString(),
          caps: { idle_threshold_ms: 5 * 60 * 1000 },
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
      expect(r.threshold_ms).toBe(5 * 60 * 1000);
    });
  });

  describe("autonomous mode — adversarial / malformed state", () => {
    it("passes through when last_commit_at is non-string garbage", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: { last_commit_at: "not-a-real-date" },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("bad-timestamp");
    });

    it("passes through when state is a non-object", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: "garbage",
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      expect(r.reason).toBe("no-state");
    });

    it("passes through when caps.idle_threshold_ms is NaN (uses default)", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: {
          last_commit_at: FIVE_MIN_AGO,
          caps: { idle_threshold_ms: Number.NaN },
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(true);
      // 5min < 15min default
      expect(r.elapsed_ms).toBe(FIVE_MIN_MS);
    });

    it("BLOCKS when state has fail_count but old timestamp (no escape via field absence)", () => {
      // Field count or extras must NOT bypass the gate
      const r = decideWatchdog({
        isAutonomous: true,
        state: {
          last_commit_at: TWENTY_MIN_AGO,
          fail_count: 0,
          commits_made: 5,
        },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(r.decision).toBe("block");
    });
  });

  describe("U-AF01 contract guarantees", () => {
    it("never blocks when isAutonomous=false (autonomous off-switch)", () => {
      const adversarial = [
        { last_commit_at: TWENTY_MIN_AGO },
        { started_at: TWENTY_MIN_AGO },
        { last_commit_at: TWENTY_MIN_AGO, caps: { idle_threshold_ms: 1 } },
      ];
      for (const state of adversarial) {
        const r = decideWatchdog({ isAutonomous: false, state, nowMs: NOW });
        expect(r.continue).toBe(true);
      }
    });

    it("block decision always includes elapsed_ms, threshold_ms, last_commit_at", () => {
      const r = decideWatchdog({
        isAutonomous: true,
        state: { last_commit_at: TWENTY_MIN_AGO },
        nowMs: NOW,
      });
      expect(r.continue).toBe(false);
      expect(typeof r.elapsed_ms).toBe("number");
      expect(typeof r.threshold_ms).toBe("number");
      expect(typeof r.last_commit_at).toBe("string");
    });
  });
});
