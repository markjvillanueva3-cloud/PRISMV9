/**
 * PostProcessorTelemetryEngine — companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * Pure, deterministic PPG conversion-funnel tracker (page_view → ... → download).
 * Stateful singleton, so every test reset()s first. Reference values are hand-computed
 * from the engine source: step_counts are UNIQUE sessions per step (Set-deduped, NOT raw
 * events); conversion rates guard divide-by-zero; avg time is per-session first-page_view →
 * last-download and only counts sessions where download strictly follows the view.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { postProcessorTelemetryEngine as tel, type PPGFunnelStep } from "../engines/PostProcessorTelemetryEngine.js";

const FULL: PPGFunnelStep[] = ["page_view", "machine_select", "feature_toggle", "generate", "validate", "prove_out", "download"];

// The engine is a module-level singleton shared with other test files (e.g. PostProcessorMS7);
// reset before AND after so this file never leaks state to a same-worker neighbor.
beforeEach(() => tel.reset());
afterEach(() => tel.reset());

describe("PostProcessorTelemetryEngine", () => {
  describe("record() + eventCount()", () => {
    it("appends events and returns the running count", () => {
      expect(tel.record({ step: "page_view", timestamp: 1000, session_id: "s1" })).toEqual({ ok: true, event_count: 1 });
      expect(tel.record({ step: "download", timestamp: 2000, session_id: "s1" })).toEqual({ ok: true, event_count: 2 });
      expect(tel.eventCount()).toBe(2);
    });
  });

  describe("funnel()", () => {
    it("computes a complete single-session funnel (all steps 1, overall conversion 1.0, exact avg time)", () => {
      FULL.forEach((step, i) => tel.record({ step, timestamp: 1000 * (i + 1), session_id: "s1" }));
      const f = tel.funnel();
      expect(f.total_sessions).toBe(1);
      for (const step of FULL) expect(f.step_counts[step]).toBe(1);
      expect(f.conversion_rates.page_view_to_machine_select).toBe(1);
      expect(f.conversion_rates.overall).toBe(1);
      // first page_view t=1000 → last download t=7000  ⇒ 6000ms
      expect(f.avg_time_to_download_ms).toBe(6000);
      expect(f.most_popular_controller).toBeNull(); // no metadata
    });

    it("step_counts count UNIQUE sessions, not raw events (Set dedup)", () => {
      tel.record({ step: "page_view", timestamp: 1000, session_id: "s1" });
      tel.record({ step: "page_view", timestamp: 1500, session_id: "s1" }); // duplicate session
      const f = tel.funnel();
      expect(tel.eventCount()).toBe(2); // raw events
      expect(f.step_counts.page_view).toBe(1); // but only 1 unique session
      expect(f.total_sessions).toBe(1);
    });

    it("overall conversion is downloads/page_views across unique sessions (0.5)", () => {
      tel.record({ step: "page_view", timestamp: 1000, session_id: "s1" });
      tel.record({ step: "download", timestamp: 2000, session_id: "s1" });
      tel.record({ step: "page_view", timestamp: 1000, session_id: "s2" }); // never downloads
      const f = tel.funnel();
      expect(f.step_counts.page_view).toBe(2);
      expect(f.step_counts.download).toBe(1);
      expect(f.conversion_rates.overall).toBe(0.5);
    });

    it("avg_time_to_download_ms averages per-session view→download deltas", () => {
      tel.record({ step: "page_view", timestamp: 1000, session_id: "s1" });
      tel.record({ step: "download", timestamp: 3000, session_id: "s1" }); // 2000ms
      tel.record({ step: "page_view", timestamp: 5000, session_id: "s2" });
      tel.record({ step: "download", timestamp: 11000, session_id: "s2" }); // 6000ms
      expect(tel.funnel().avg_time_to_download_ms).toBe(4000); // (2000+6000)/2
    });

    it("surfaces the most popular controller + machine from event metadata", () => {
      for (let i = 0; i < 3; i++) tel.record({ step: "machine_select", timestamp: 1000 + i, session_id: `s${i}`, metadata: { controller: "fanuc", machine: "VMC-01" } });
      tel.record({ step: "machine_select", timestamp: 9000, session_id: "sx", metadata: { controller: "haas", machine: "VF-2" } });
      const f = tel.funnel();
      expect(f.most_popular_controller).toBe("fanuc"); // 3 vs 1
      expect(f.most_popular_machine).toBe("VMC-01");
    });

    it("since_ms filters events to those at/after the threshold", () => {
      tel.record({ step: "page_view", timestamp: 1000, session_id: "old" });
      tel.record({ step: "page_view", timestamp: 5000, session_id: "new" });
      const f = tel.funnel({ since_ms: 3000 });
      expect(f.total_sessions).toBe(1);
      expect(f.step_counts.page_view).toBe(1); // only "new"
    });

    it("CONTRACT: since_ms scopes step_counts but NOT most_popular_* (lifetime maps)", () => {
      // most_popular_controller/machine read the lifetime controllerCounts/machineCounts
      // maps, which record() never filters by time — so an old-but-dominant controller
      // still wins even when since_ms excludes its events from step_counts.
      tel.record({ step: "machine_select", timestamp: 1000, session_id: "old1", metadata: { controller: "fanuc", machine: "VMC-01" } });
      tel.record({ step: "machine_select", timestamp: 1000, session_id: "old2", metadata: { controller: "fanuc", machine: "VMC-01" } });
      tel.record({ step: "machine_select", timestamp: 5000, session_id: "new1", metadata: { controller: "haas", machine: "VF-2" } });
      const f = tel.funnel({ since_ms: 3000 });
      expect(f.step_counts.machine_select).toBe(1); // only "new1" is within the window
      expect(f.most_popular_controller).toBe("fanuc"); // lifetime fanuc(2) > haas(1), window-independent
      expect(f.most_popular_machine).toBe("VMC-01");
    });

    it("EDGE: a non-string metadata.controller is ignored by the typeof guard", () => {
      tel.record({ step: "machine_select", timestamp: 1000, session_id: "s1", metadata: { controller: 123, machine: "VMC-01" } });
      tel.record({ step: "machine_select", timestamp: 2000, session_id: "s2", metadata: { controller: "haas", machine: "VF-2" } });
      // 123 is not counted; haas is the only valid controller observed.
      expect(tel.funnel().most_popular_controller).toBe("haas");
    });

    it("EDGE: empty funnel is fully zeroed, never NaN/undefined", () => {
      const f = tel.funnel();
      expect(f.total_sessions).toBe(0);
      for (const step of FULL) expect(f.step_counts[step]).toBe(0);
      expect(f.conversion_rates.overall).toBe(0); // views=0 guard, not NaN
      expect(f.avg_time_to_download_ms).toBeNull();
      expect(f.most_popular_controller).toBeNull();
      expect(f.most_popular_machine).toBeNull();
    });

    it("FAILURE MODE: downloads with zero page_views → overall conversion guarded to 0", () => {
      tel.record({ step: "download", timestamp: 1000, session_id: "s1" });
      const f = tel.funnel();
      expect(f.step_counts.page_view).toBe(0);
      expect(f.step_counts.download).toBe(1);
      expect(f.conversion_rates.overall).toBe(0); // 1/0 guarded
      expect(f.avg_time_to_download_ms).toBeNull(); // no page_view anchor
    });

    it("ADVERSARIAL: a download timestamped BEFORE the page_view is not counted in avg time", () => {
      tel.record({ step: "download", timestamp: 1000, session_id: "s1" });
      tel.record({ step: "page_view", timestamp: 5000, session_id: "s1" }); // view AFTER download
      // dlTime(1000) > viewTime(5000) is false → session not "completed"
      expect(tel.funnel().avg_time_to_download_ms).toBeNull();
    });
  });

  describe("reset()", () => {
    it("clears events and popularity counts", () => {
      tel.record({ step: "page_view", timestamp: 1000, session_id: "s1", metadata: { controller: "fanuc" } });
      tel.reset();
      expect(tel.eventCount()).toBe(0);
      const f = tel.funnel();
      expect(f.total_sessions).toBe(0);
      expect(f.most_popular_controller).toBeNull();
    });
  });

  describe("process() dispatcher routing", () => {
    it("routes record_event / event_count / funnel_metrics / reset and errors on unknown", async () => {
      const rec = await tel.process({ action: "record_event", step: "page_view", session_id: "s1", timestamp: 1000 });
      expect(rec).toEqual({ ok: true, event_count: 1 });
      expect(await tel.process({ action: "event_count" })).toEqual({ count: 1 });
      const metrics = (await tel.process({ action: "funnel_metrics" })) as any;
      expect(metrics.total_sessions).toBe(1);
      expect(await tel.process({ action: "reset" })).toEqual({ ok: true });
      expect(tel.eventCount()).toBe(0);
      const err = (await tel.process({ action: "bogus" })) as any;
      expect(err.error).toContain("Unknown telemetry action");
    });
  });
});
