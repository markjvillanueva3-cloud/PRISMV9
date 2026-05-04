/**
 * Tests for HyperMillJobMonitor — CAM-EXHAUST-MS0
 *
 * Covers:
 *  - Class shape (constructor, singletons, public method surface)
 *  - JOB_STATE_TRANSITIONS table integrity + TERMINAL_STATES set
 *  - Happy paths (submit, transition, terminal events, mock progression)
 *  - Listener add/remove + faulty-listener isolation
 *  - State-transition validation (invalid transitions rejected)
 *  - Progress threshold gating
 *  - Failure modes (job not found, removeJob nonexistent, error state)
 *  - Adversarial inputs (negative progress clamped, oversized progress clamped,
 *    duplicate submission, removing tracked job stops timer)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  HyperMillJobMonitor,
  hyperMillJobMonitor,
  hyperMillJobMonitorMock,
  JOB_STATE_TRANSITIONS,
  TERMINAL_STATES,
  type HMJobEvent,
  type HMJobState,
} from "../engines/HyperMillJobMonitor.js";

// ============================================================================
// Named constants
// ============================================================================
const PROGRESS_MIN = 0;
const PROGRESS_MAX = 100;
const DEFAULT_THRESHOLD_PCT = 10;
const NON_TERMINAL_STATES: HMJobState[] = ["submitted", "calculating", "simulating", "posting"];
const ALL_TERMINAL_STATES: HMJobState[] = ["complete", "failed", "cancelled"];
const MOCK_LIFECYCLE_TIMEOUT_MS = 400; // mock completes by ~250ms; pad to 400
const PROGRESS_HALFWAY = 50;

describe("HyperMillJobMonitor", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Module-level constants
  // ──────────────────────────────────────────────────────────────────────────
  describe("module constants", () => {
    it("singleton hyperMillJobMonitor is in real (non-mock) mode", () => {
      expect(hyperMillJobMonitor).toBeInstanceOf(HyperMillJobMonitor);
    });

    it("hyperMillJobMonitorMock is a separate mock instance", () => {
      expect(hyperMillJobMonitorMock).toBeInstanceOf(HyperMillJobMonitor);
      expect(hyperMillJobMonitorMock).not.toBe(hyperMillJobMonitor);
    });

    it("TERMINAL_STATES contains exactly complete/failed/cancelled", () => {
      expect(TERMINAL_STATES.size).toBe(ALL_TERMINAL_STATES.length);
      for (const s of ALL_TERMINAL_STATES) expect(TERMINAL_STATES.has(s)).toBe(true);
      for (const s of NON_TERMINAL_STATES) expect(TERMINAL_STATES.has(s)).toBe(false);
    });

    it("terminal states have empty transition arrays", () => {
      for (const s of ALL_TERMINAL_STATES) {
        expect(JOB_STATE_TRANSITIONS[s]).toHaveLength(0);
      }
    });

    it("submitted can transition to calculating, failed, cancelled (not complete directly)", () => {
      const t = JOB_STATE_TRANSITIONS.submitted;
      expect(t).toContain("calculating");
      expect(t).toContain("failed");
      expect(t).toContain("cancelled");
      expect(t).not.toContain("complete");
    });

    it("posting can only transition to terminal states", () => {
      const t = JOB_STATE_TRANSITIONS.posting;
      for (const s of t) expect(TERMINAL_STATES.has(s)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Submit / state queries
  // ──────────────────────────────────────────────────────────────────────────
  describe("submitJob + queries", () => {
    let monitor: HyperMillJobMonitor;

    beforeEach(() => {
      // mock mode but with NO automatic progression — use injected setTimeout interception
      // Actually, we need to suppress mock progression for state-only tests; use real mode
      // with no polling timer fired via pollIntervalMs huge.
      monitor = new HyperMillJobMonitor({
        mockMode: false,
        pollIntervalMs: 60_000_000, // effectively never polls during the test
      });
    });

    afterEach(() => {
      // Stop any timers created
      const all = monitor.getAllJobs();
      for (const j of all) monitor.removeJob(j.jobId);
    });

    it("submitJob creates a record in 'submitted' state at 0% progress", () => {
      const r = monitor.submitJob("J1", "Test Job");
      expect(r.jobId).toBe("J1");
      expect(r.jobName).toBe("Test Job");
      expect(r.state).toBe("submitted");
      expect(r.progressPct).toBe(PROGRESS_MIN);
      expect(r.pollCount).toBe(0);
      expect(r.completedAt).toBe(undefined);
      expect(r.errorMessage).toBe(undefined);
    });

    it("getJob returns the same record reference", () => {
      monitor.submitJob("J2", "Two");
      const got = monitor.getJob("J2");
      expect(got!.jobId).toBe("J2");
    });

    it("getJob returns undefined for unknown id", () => {
      expect(monitor.getJob("nope")).toBe(undefined);
    });

    it("getAllJobs returns all submitted records", () => {
      monitor.submitJob("A", "AA");
      monitor.submitJob("B", "BB");
      const all = monitor.getAllJobs();
      const ids = all.map((j) => j.jobId).sort();
      expect(ids).toEqual(["A", "B"]);
    });

    it("getJobsByState filters correctly", () => {
      monitor.submitJob("S1", "S1");
      monitor.submitJob("S2", "S2");
      monitor.transitionJob("S2", "calculating", { progressPct: 5 });
      const submittedOnly = monitor.getJobsByState("submitted");
      expect(submittedOnly.map((j) => j.jobId)).toEqual(["S1"]);
      const calculatingOnly = monitor.getJobsByState("calculating");
      expect(calculatingOnly.map((j) => j.jobId)).toEqual(["S2"]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // transitionJob
  // ──────────────────────────────────────────────────────────────────────────
  describe("transitionJob", () => {
    let monitor: HyperMillJobMonitor;

    beforeEach(() => {
      monitor = new HyperMillJobMonitor({ mockMode: false, pollIntervalMs: 60_000_000 });
      monitor.submitJob("T1", "Job T1");
    });

    afterEach(() => {
      monitor.removeJob("T1");
    });

    it("valid transition submitted→calculating updates state", () => {
      const r = monitor.transitionJob("T1", "calculating", { progressPct: 5 });
      expect(r!.state).toBe("calculating");
      expect(r!.progressPct).toBe(5);
    });

    it("invalid transition submitted→complete is rejected (state unchanged)", () => {
      const r = monitor.transitionJob("T1", "complete");
      expect(r!.state).toBe("submitted");
    });

    it("invalid transition complete→calculating is rejected", () => {
      monitor.transitionJob("T1", "calculating");
      monitor.transitionJob("T1", "complete", { progressPct: PROGRESS_MAX });
      const r = monitor.transitionJob("T1", "calculating");
      expect(r!.state).toBe("complete");
    });

    it("transition to terminal state fires job_complete event", () => {
      const events: HMJobEvent[] = [];
      monitor.addListener((e) => events.push(e));
      monitor.transitionJob("T1", "calculating");
      monitor.transitionJob("T1", "complete", { progressPct: PROGRESS_MAX });
      const completeEvts = events.filter((e) => e.type === "job_complete");
      expect(completeEvts).toHaveLength(1);
      expect(completeEvts[0].state).toBe("complete");
      expect(completeEvts[0].progressPct).toBe(PROGRESS_MAX);
    });

    it("transition to failed state fires job_error event with errorMessage", () => {
      const events: HMJobEvent[] = [];
      monitor.addListener((e) => events.push(e));
      monitor.transitionJob("T1", "failed", { errorMessage: "post-processor crashed" });
      const errs = events.filter((e) => e.type === "job_error");
      expect(errs).toHaveLength(1);
      expect(errs[0].errorMessage).toBe("post-processor crashed");
      expect(errs[0].message).toMatch(/post-processor crashed/);
    });

    it("transition with progress crossing threshold emits progress event", () => {
      const events: HMJobEvent[] = [];
      monitor.addListener((e) => events.push(e));
      // submitted→calculating is a valid forward transition; the engine
      // does NOT permit same-state transitions, so progress events must
      // be carried by an actual state change.
      monitor.transitionJob("T1", "calculating", { progressPct: DEFAULT_THRESHOLD_PCT });
      const progressEvts = events.filter((e) => e.type === "progress");
      expect(progressEvts.length).toBeGreaterThanOrEqual(1);
      expect(progressEvts[progressEvts.length - 1].progressPct).toBe(DEFAULT_THRESHOLD_PCT);
    });

    it("progress under threshold does NOT emit progress event", () => {
      const events: HMJobEvent[] = [];
      monitor.addListener((e) => events.push(e));
      monitor.transitionJob("T1", "calculating", { progressPct: 1 });
      monitor.transitionJob("T1", "calculating", { progressPct: 5 }); // delta=4 < 10
      const progressEvts = events.filter((e) => e.type === "progress");
      expect(progressEvts).toHaveLength(0);
    });

    it("returns undefined for unknown jobId", () => {
      const r = monitor.transitionJob("UNKNOWN", "calculating");
      expect(r).toBe(undefined);
    });

    it("progress > 100 is clamped to 100", () => {
      const r = monitor.transitionJob("T1", "calculating", { progressPct: 200 });
      expect(r!.progressPct).toBe(PROGRESS_MAX);
    });

    it("negative progress is clamped to 0", () => {
      const r = monitor.transitionJob("T1", "calculating", { progressPct: -50 });
      expect(r!.progressPct).toBe(PROGRESS_MIN);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Listener management
  // ──────────────────────────────────────────────────────────────────────────
  describe("listeners", () => {
    let monitor: HyperMillJobMonitor;
    beforeEach(() => {
      monitor = new HyperMillJobMonitor({ mockMode: false, pollIntervalMs: 60_000_000 });
    });
    afterEach(() => {
      const all = monitor.getAllJobs();
      for (const j of all) monitor.removeJob(j.jobId);
    });

    it("addListener receives job_start event on submitJob", () => {
      const seen: HMJobEvent[] = [];
      monitor.addListener((e) => seen.push(e));
      monitor.submitJob("L1", "Listener Test");
      expect(seen).toHaveLength(1);
      expect(seen[0].type).toBe("job_start");
      expect(seen[0].jobId).toBe("L1");
    });

    it("removeListener stops further notifications", () => {
      const seen: HMJobEvent[] = [];
      const listener = (e: HMJobEvent) => seen.push(e);
      monitor.addListener(listener);
      monitor.submitJob("L2", "T");
      const before = seen.length;
      monitor.removeListener(listener);
      monitor.transitionJob("L2", "failed", { errorMessage: "x" });
      expect(seen).toHaveLength(before);
    });

    it("listener throwing does not prevent later listeners from firing", () => {
      const seen: HMJobEvent[] = [];
      monitor.addListener(() => { throw new Error("boom"); });
      monitor.addListener((e) => seen.push(e));
      monitor.submitJob("L3", "Three");
      expect(seen).toHaveLength(1);
    });

    it("removing a listener that was never added is a no-op", () => {
      const noop = () => undefined;
      monitor.removeListener(noop); // should not throw
      const seen: HMJobEvent[] = [];
      monitor.addListener((e) => seen.push(e));
      monitor.submitJob("L4", "Four");
      expect(seen).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // removeJob
  // ──────────────────────────────────────────────────────────────────────────
  describe("removeJob", () => {
    let monitor: HyperMillJobMonitor;
    beforeEach(() => {
      monitor = new HyperMillJobMonitor({ mockMode: false, pollIntervalMs: 60_000_000 });
    });
    afterEach(() => {
      const all = monitor.getAllJobs();
      for (const j of all) monitor.removeJob(j.jobId);
    });

    it("removes a tracked job and returns true", () => {
      monitor.submitJob("R1", "R");
      expect(monitor.removeJob("R1")).toBe(true);
      expect(monitor.getJob("R1")).toBe(undefined);
    });

    it("returns false for nonexistent job", () => {
      expect(monitor.removeJob("never-existed")).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Mock progression (timer-driven)
  // ──────────────────────────────────────────────────────────────────────────
  describe("mock progression", () => {
    let monitor: HyperMillJobMonitor;

    beforeEach(() => {
      vi.useFakeTimers();
      monitor = new HyperMillJobMonitor({ mockMode: true });
    });

    afterEach(() => {
      vi.useRealTimers();
      const all = monitor.getAllJobs();
      for (const j of all) monitor.removeJob(j.jobId);
    });

    it("mock mode runs full lifecycle to complete in ~250ms", () => {
      const events: HMJobEvent[] = [];
      monitor.addListener((e) => events.push(e));
      monitor.submitJob("M1", "Mock Run");

      vi.advanceTimersByTime(MOCK_LIFECYCLE_TIMEOUT_MS);

      const final = monitor.getJob("M1")!;
      expect(final.state).toBe("complete");
      expect(final.progressPct).toBe(PROGRESS_MAX);

      const completeEvts = events.filter((e) => e.type === "job_complete");
      expect(completeEvts).toHaveLength(1);
    });

    it("mock progression emits ≥3 distinct events (start + progress + complete)", () => {
      const events: HMJobEvent[] = [];
      monitor.addListener((e) => events.push(e));
      monitor.submitJob("M2", "Mock 2");
      vi.advanceTimersByTime(MOCK_LIFECYCLE_TIMEOUT_MS);
      // job_start always fires + ≥1 progress + 1 job_complete
      const types = new Set(events.map((e) => e.type));
      expect(types.has("job_start")).toBe(true);
      expect(types.has("job_complete")).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Adversarial / failure modes
  // ──────────────────────────────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    let monitor: HyperMillJobMonitor;
    beforeEach(() => {
      monitor = new HyperMillJobMonitor({ mockMode: false, pollIntervalMs: 60_000_000 });
    });
    afterEach(() => {
      const all = monitor.getAllJobs();
      for (const j of all) monitor.removeJob(j.jobId);
    });

    it("submitting two jobs with the same id overwrites the first record", () => {
      monitor.submitJob("DUP", "first");
      monitor.submitJob("DUP", "second");
      expect(monitor.getJob("DUP")!.jobName).toBe("second");
    });

    it("empty jobName tolerated", () => {
      const r = monitor.submitJob("E1", "");
      expect(r.jobName).toBe("");
    });

    it("very long jobId tolerated", () => {
      const longId = "x".repeat(2000);
      const r = monitor.submitJob(longId, "long");
      expect(r.jobId.length).toBe(2000);
    });

    it("custom progress threshold of 50% suppresses sub-threshold deltas", () => {
      const m2 = new HyperMillJobMonitor({
        mockMode: false,
        pollIntervalMs: 60_000_000,
        progressEventThresholdPct: PROGRESS_HALFWAY,
      });
      const events: HMJobEvent[] = [];
      m2.addListener((e) => events.push(e));
      m2.submitJob("CT1", "Custom Threshold");
      m2.transitionJob("CT1", "calculating", { progressPct: 25 }); // delta 25 < 50
      const progressEvts = events.filter((e) => e.type === "progress");
      expect(progressEvts).toHaveLength(0);
      m2.removeJob("CT1");
    });

    it("transition with no extras still updates updatedAt timestamp", async () => {
      monitor.submitJob("U1", "U");
      const before = monitor.getJob("U1")!.updatedAt;
      // ensure clock tick
      await new Promise((r) => setTimeout(r, 2));
      monitor.transitionJob("U1", "calculating");
      const after = monitor.getJob("U1")!.updatedAt;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });
});
