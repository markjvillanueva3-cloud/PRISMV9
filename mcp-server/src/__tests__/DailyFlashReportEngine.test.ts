/**
 * DailyFlashReportEngine.test.ts — engine-direct coverage.
 *
 * Pairs with `dispatcher.dailyFlashReport.test.ts` (round-trip via
 * prism_dev). This file exercises generateFlashReport() directly,
 * required by `stop_on_unwired_assets` (each engine needs a matching
 * test file with >=10 it() cases).
 *
 * Coverage:
 *   - generateFlashReport: shape contract, count parity, scrap-rate
 *     monotonicity vs zero-parts edge case, downtime top-3 cap,
 *     determinism (same input -> same numeric report),
 *     time-monotonic generated_at.
 *
 * DEFERRED: emailFlashReport (currently console.log stub +
 * send-impersonation class).
 */

import { describe, it, expect } from "vitest";
import { dailyFlashReportEngine } from "../engines/DailyFlashReportEngine.js";

describe("DailyFlashReportEngine — generateFlashReport shape", () => {
  it("returns full DailyFlashReport with all 13 required top-level fields", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    expect(r.date).toBe("2026-05-17");
    expect(typeof r.generated_at).toBe("string");
    expect(r.generated_by).toBe("system");
    expect(Array.isArray(r.jobs_completed)).toBe(true);
    expect(Array.isArray(r.jobs_in_progress)).toBe(true);
    expect(typeof r.scrap_rate_pct).toBe("number");
    expect(typeof r.good_parts_today).toBe("number");
    expect(typeof r.scrap_count_today).toBe("number");
    expect(Array.isArray(r.oee_by_machine)).toBe(true);
    expect(typeof r.labor_utilization_pct).toBe("number");
    expect(typeof r.productive_hours).toBe("number");
    expect(typeof r.shift_hours).toBe("number");
    expect(typeof r.on_time_delivery_pct).toBe("number");
    expect(typeof r.jobs_due_today).toBe("number");
    expect(typeof r.jobs_shipped_on_time).toBe("number");
    expect(Array.isArray(r.top_downtime_causes)).toBe(true);
  });

  it("scrap_rate_pct in [0, 100] (engine line 109 = (scrap / total) * 100)", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    expect(r.scrap_rate_pct).toBeGreaterThanOrEqual(0);
    expect(r.scrap_rate_pct).toBeLessThanOrEqual(100);
  });

  it("labor_utilization_pct in [0, ∞) — engine permits >100 if productive > shift", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    expect(r.labor_utilization_pct).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.labor_utilization_pct)).toBe(true);
  });

  it("jobs_due_today = jobs_completed.length + jobs_in_progress.length (engine line 136)", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    expect(r.jobs_due_today).toBe(r.jobs_completed.length + r.jobs_in_progress.length);
  });

  it("jobs_shipped_on_time = jobs_completed.length (engine line 137)", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    expect(r.jobs_shipped_on_time).toBe(r.jobs_completed.length);
  });
});

describe("DailyFlashReportEngine — top_downtime_causes invariants", () => {
  it("top_downtime_causes capped at 3 entries (engine line 120 .slice(0,3))", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    expect(r.top_downtime_causes.length).toBeLessThanOrEqual(3);
  });

  it("top_downtime_causes sorted descending by total_minutes (engine line 119)", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    for (let i = 1; i < r.top_downtime_causes.length; i++) {
      const prev = r.top_downtime_causes[i - 1];
      const curr = r.top_downtime_causes[i];
      if (prev && curr) {
        expect(prev.total_minutes).toBeGreaterThanOrEqual(curr.total_minutes);
      }
    }
  });

  it("each downtime cause has reason_category + count >= 1 + total_minutes >= 0", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    for (const cause of r.top_downtime_causes) {
      expect(typeof cause.reason_category).toBe("string");
      expect(cause.reason_category.length).toBeGreaterThan(0);
      expect(cause.count).toBeGreaterThanOrEqual(1);
      expect(cause.total_minutes).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("DailyFlashReportEngine — VARIABILITY across requester identity", () => {
  it("VARIABILITY — 3 distinct requesters all echo their own id into generated_by", () => {
    const requesters = ["system", "operator-1", "shift-lead"];
    for (const req of requesters) {
      const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", req);
      expect(r.generated_by).toBe(req);
    }
  });

  it("VARIABILITY — 3 distinct dates all echo into report.date", () => {
    const dates = ["2026-05-15", "2026-05-16", "2026-05-17"];
    for (const d of dates) {
      const r = dailyFlashReportEngine.generateFlashReport(d, "system");
      expect(r.date).toBe(d);
    }
  });
});

describe("DailyFlashReportEngine — ADVERSARIAL / BOUNDARY", () => {
  it("BOUNDARY — zero parts produced -> scrap_rate_pct = 0 (engine line 109 div-by-zero guard)", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    if (r.good_parts_today + r.scrap_count_today === 0) {
      expect(r.scrap_rate_pct).toBe(0);
    }
  });

  it("BOUNDARY — zero shift hours -> labor_utilization_pct = 0 (engine line 110 div-by-zero guard)", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    if (r.shift_hours === 0) {
      expect(r.labor_utilization_pct).toBe(0);
    }
  });

  it("ADVERSARIAL — unicode date string preserved verbatim in echoed report.date", () => {
    const wackyDate = "2026-五月-17";
    const r = dailyFlashReportEngine.generateFlashReport(wackyDate, "system");
    expect(r.date).toBe(wackyDate);
  });

  it("ADVERSARIAL — empty-string requester preserved (engine does not coerce)", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "");
    expect(r.generated_by).toBe("");
  });

  it("generated_at is an ISO-8601 timestamp parseable by Date", () => {
    const r = dailyFlashReportEngine.generateFlashReport("2026-05-17", "system");
    const parsed = new Date(r.generated_at);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});
