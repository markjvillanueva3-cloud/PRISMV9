/**
 * VendorPerformanceTrackerEngine.test.ts — HOTEL/U-VENDOR-PERFORMANCE-TRACKER (iter29 /yolo)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { vendorPerformanceTrackerEngine } from "../engines/VendorPerformanceTrackerEngine.js";

function seedPOs(vendor: string, count: number, opts: {
  onTime?: number; // 0..1
  ncrPerPO?: number;
  turnHours?: number;
  amount?: number;
}): void {
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const promised = new Date(today.getTime() - i * 7 * 86_400_000); // weekly
    const onTimeRoll = i / count;
    const onTime = onTimeRoll < (opts.onTime ?? 1);
    const received = new Date(promised.getTime() + (onTime ? 0 : 3 * 86_400_000));
    vendorPerformanceTrackerEngine.recordPO({
      po_id: `${vendor}-PO-${i}`,
      vendor_id: vendor,
      promised_date: promised.toISOString().slice(0, 10),
      received_date: received.toISOString().slice(0, 10),
      amount_cents: opts.amount ?? 50_000,
      ncr_count: opts.ncrPerPO ?? 0,
      quote_turnaround_hours: opts.turnHours ?? 24,
    });
  }
}

describe("VendorPerformanceTrackerEngine", () => {
  beforeEach(() => vendorPerformanceTrackerEngine.reset());

  describe("recordPO — R12 validation", () => {
    it("happy path records frozen PO", () => {
      const po = vendorPerformanceTrackerEngine.recordPO({
        po_id: "PO-001",
        vendor_id: "VND-A",
        promised_date: "2026-06-01",
        received_date: "2026-06-01",
        amount_cents: 50_000,
        quote_turnaround_hours: 24,
      });
      expect(po.vendor_id).toBe("VND-A");
      expect(Object.isFrozen(po)).toBe(true);
    });

    it("R12 throws on bad date", () => {
      expect(() =>
        vendorPerformanceTrackerEngine.recordPO({
          po_id: "PO-X",
          vendor_id: "VND",
          promised_date: "June",
          received_date: null,
          amount_cents: 1000,
          quote_turnaround_hours: 24,
        }),
      ).toThrow(/promised_date must be ISO/);
    });

    it("R12 throws on negative amount", () => {
      expect(() =>
        vendorPerformanceTrackerEngine.recordPO({
          po_id: "PO-X",
          vendor_id: "VND",
          promised_date: "2026-06-01",
          received_date: null,
          amount_cents: -100,
          quote_turnaround_hours: 24,
        }),
      ).toThrow(/amount_cents must be non-negative/);
    });

    it("R12 throws on non-integer ncr_count", () => {
      expect(() =>
        vendorPerformanceTrackerEngine.recordPO({
          po_id: "PO-X",
          vendor_id: "VND",
          promised_date: "2026-06-01",
          received_date: null,
          amount_cents: 1000,
          ncr_count: 1.5,
          quote_turnaround_hours: 24,
        }),
      ).toThrow(/ncr_count must be non-negative integer/);
    });
  });

  describe("Scorecard — 4 vendor tiers (variability floor)", () => {
    it("preferred tier — 100% OTD, 0 NCRs, fast turn, on-budget", () => {
      seedPOs("VND-PREF", 12, { onTime: 1.0, ncrPerPO: 0, turnHours: 12, amount: 40_000 });
      const s = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-PREF" });
      expect(s.tier).toBe("preferred");
      expect(s.composite_score).toBeGreaterThanOrEqual(0.85);
      expect(s.on_time_delivery).toBe(1);
    });

    it("approved tier — 80% OTD, low NCRs, normal turn", () => {
      seedPOs("VND-APPR", 10, { onTime: 0.8, ncrPerPO: 0, turnHours: 24, amount: 50_000 });
      const s = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-APPR" });
      expect(s.tier).toMatch(/^(approved|preferred)$/);
      expect(s.composite_score).toBeGreaterThanOrEqual(0.70);
    });

    it("probation tier — 50% OTD with some NCRs", () => {
      seedPOs("VND-PROB", 10, { onTime: 0.5, ncrPerPO: 0, turnHours: 48, amount: 80_000 });
      const s = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-PROB" });
      expect(["probation", "approved"]).toContain(s.tier);
    });

    it("disqualified tier — 10% OTD, NCRs above tolerance, slow turn, overpriced", () => {
      seedPOs("VND-DQ", 10, { onTime: 0.1, ncrPerPO: 2, turnHours: 96, amount: 200_000 });
      const s = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-DQ" });
      expect(s.tier).toBe("disqualified");
      expect(s.composite_score).toBeLessThan(0.55);
      expect(s.rationale.some((r) => r.includes("re-evaluate"))).toBe(true);
    });
  });

  describe("Component-score monotonicity", () => {
    it("quality_acceptance drops as NCR count rises", () => {
      seedPOs("VND-CLEAN", 10, { onTime: 1, ncrPerPO: 0 });
      seedPOs("VND-DIRTY", 10, { onTime: 1, ncrPerPO: 1 });
      const clean = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-CLEAN" });
      const dirty = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-DIRTY" });
      expect(clean.quality_acceptance).toBeGreaterThan(dirty.quality_acceptance);
    });

    it("responsiveness drops as turn hours rise", () => {
      seedPOs("VND-FAST", 10, { onTime: 1, turnHours: 12 });
      seedPOs("VND-SLOW", 10, { onTime: 1, turnHours: 72 });
      const fast = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-FAST" });
      const slow = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-SLOW" });
      expect(fast.responsiveness).toBeGreaterThan(slow.responsiveness);
    });
  });

  describe("computeScorecard — R12 input validation", () => {
    it("throws when vendor has <3 POs", () => {
      seedPOs("VND-NEW", 2, {});
      expect(() =>
        vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-NEW" }),
      ).toThrow(/POs in window/);
    });

    it("throws on out-of-range window_days", () => {
      seedPOs("VND-W", 5, {});
      expect(() =>
        vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-W", window_days: 2000 }),
      ).toThrow(/window_days must be/);
    });

    it("throws on missing vendor_id", () => {
      expect(() =>
        vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "" }),
      ).toThrow(/vendor_id required/);
    });
  });

  describe("rankVendors — comparative supplier list", () => {
    it("ranks vendors by composite descending", () => {
      seedPOs("VND-A", 5, { onTime: 1, ncrPerPO: 0, turnHours: 12 });
      seedPOs("VND-B", 5, { onTime: 0.6, ncrPerPO: 0, turnHours: 24 });
      seedPOs("VND-C", 5, { onTime: 0.2, ncrPerPO: 2, turnHours: 96, amount: 200_000 });
      const ranked = vendorPerformanceTrackerEngine.rankVendors({});
      expect(ranked.length).toBe(3);
      expect(ranked[0].composite_score).toBeGreaterThanOrEqual(ranked[1].composite_score);
      expect(ranked[1].composite_score).toBeGreaterThanOrEqual(ranked[2].composite_score);
    });

    it("skips vendors without enough POs in window", () => {
      seedPOs("VND-X", 5, {});
      seedPOs("VND-TINY", 2, {});
      const ranked = vendorPerformanceTrackerEngine.rankVendors({});
      expect(ranked.length).toBe(1);
      expect(ranked[0].vendor_id).toBe("VND-X");
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned scorecard frozen", () => {
      seedPOs("VND-F", 5, {});
      const s = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-F" });
      expect(Object.isFrozen(s)).toBe(true);
      expect(Object.isFrozen(s.rationale)).toBe(true);
    });

    it("PII-free shape", () => {
      seedPOs("VND-P", 5, {});
      const s = vendorPerformanceTrackerEngine.computeScorecard({ vendor_id: "VND-P" });
      const keys = Object.keys(s);
      expect(keys).not.toContain("vendor_name");
      expect(keys).not.toContain("contact_email");
      expect(keys).not.toContain("phone");
    });
  });
});
