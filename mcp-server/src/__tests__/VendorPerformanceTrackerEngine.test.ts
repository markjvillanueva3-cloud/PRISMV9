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

  // U-HOTEL-WIRE-VENDOR-SCORECARD: the FE-ready Vendor[] projection backing VendorScorecardPage.
  // Reference values pinned against the engine's documented formulas (0..1 metric -> *100 page field).
  describe("listScorecards — FE Vendor[] adapter (0..100 scale)", () => {
    /** Explicit, deterministic POs so the asserted scores are exact (not seed-roll-dependent). */
    function addPO(v: string, id: string, promised: string, received: string | null, amt: number, ncr: number, turn: number): void {
      vendorPerformanceTrackerEngine.recordPO({
        po_id: id, vendor_id: v, promised_date: promised, received_date: received,
        amount_cents: amt, ncr_count: ncr, quote_turnaround_hours: turn,
      });
    }

    it("happy path — maps 0..1 metrics to the page's 0..100 fields with ncr_count + avg_lead_days", () => {
      // Acme: 3 POs, 2 on-time (p3 2 days late), 1 NCR over 3 POs, all under price benchmark.
      addPO("Acme", "a1", "2026-06-01", "2026-06-01", 40_000, 0, 12);
      addPO("Acme", "a2", "2026-06-05", "2026-06-04", 45_000, 1, 18);
      addPO("Acme", "a3", "2026-06-10", "2026-06-12", 50_000, 0, 24);
      const rows = vendorPerformanceTrackerEngine.listScorecards({ as_of: "2026-06-25", window_days: 180 });
      expect(rows.length).toBe(1);
      const a = rows[0];
      // delivery: 2/3 on-time -> 0.6667 -> 67. quality: ncrRate 1/3 /0.10 tol -> clamped 0. price: under benchmark -> 100.
      expect(a.vendor_id).toBe("Acme");
      expect(a.name).toBe("Acme");
      expect(a.delivery_score).toBe(67);
      expect(a.on_time_pct).toBe(67);
      expect(a.quality_score).toBe(0);
      expect(a.price_score).toBe(100);
      expect(a.composite_score).toBe(57); // 0.40*0.6667 + 0.30*0 + 0.15*resp + 0.15*1 -> 0.567 -> 57
      expect(a.total_orders).toBe(3);
      expect(a.ncr_count).toBe(1);
      expect(a.avg_lead_days).toBeCloseTo(0.33, 1); // (0 + -1 + 2)/3
      expect(a.tier).toBe("probation");
      // every score on the 0..100 scale the page renders
      for (const k of ["quality_score", "delivery_score", "price_score", "composite_score", "on_time_pct"] as const) {
        expect(a[k]).toBeGreaterThanOrEqual(0);
        expect(a[k]).toBeLessThanOrEqual(100);
      }
    });

    it("failure mode — vendor with <3 POs in window is skipped (no stable signal)", () => {
      addPO("Beta", "b1", "2026-06-01", "2026-06-01", 30_000, 0, 10);
      addPO("Beta", "b2", "2026-06-02", "2026-06-02", 30_000, 0, 10);
      const rows = vendorPerformanceTrackerEngine.listScorecards({ as_of: "2026-06-25" });
      expect(rows.find((r) => r.vendor_id === "Beta")).toBeUndefined();
    });

    it("failure mode — empty store returns []", () => {
      expect(vendorPerformanceTrackerEngine.listScorecards()).toEqual([]);
    });

    it("failure mode — POs outside the window are excluded (vendor drops below 3)", () => {
      addPO("Gamma", "g1", "2026-06-01", "2026-06-01", 40_000, 0, 12);
      addPO("Gamma", "g2", "2026-06-05", "2026-06-05", 40_000, 0, 12);
      addPO("Gamma", "g3", "2020-01-01", "2020-01-01", 40_000, 0, 12); // ancient -> out of 180d window
      const rows = vendorPerformanceTrackerEngine.listScorecards({ as_of: "2026-06-25", window_days: 180 });
      expect(rows.find((r) => r.vendor_id === "Gamma")).toBeUndefined();
    });

    it("sorted by composite_score desc + each row frozen", () => {
      // Strong: on-time, no NCR. Weak: late + NCRs.
      for (let i = 0; i < 4; i++) addPO("Strong", `s${i}`, `2026-06-0${i + 1}`, `2026-06-0${i + 1}`, 30_000, 0, 8);
      for (let i = 0; i < 4; i++) addPO("Weak", `w${i}`, `2026-06-0${i + 1}`, `2026-06-1${i + 1}`, 90_000, 3, 96);
      const rows = vendorPerformanceTrackerEngine.listScorecards({ as_of: "2026-06-25" });
      expect(rows.length).toBe(2);
      expect(rows[0].composite_score).toBeGreaterThanOrEqual(rows[1].composite_score);
      expect(rows[0].vendor_id).toBe("Strong");
      expect(Object.isFrozen(rows[0])).toBe(true);
    });

    it("adversarial — bad as_of -> every vendor skipped (computeScorecard throws its own guard) -> []", () => {
      addPO("Delta", "d1", "2026-06-01", "2026-06-01", 40_000, 0, 12);
      addPO("Delta", "d2", "2026-06-05", "2026-06-05", 40_000, 0, 12);
      addPO("Delta", "d3", "2026-06-10", "2026-06-10", 40_000, 0, 12);
      // NaN as_of -> computeScorecard throws (its own guard) -> vendor caught/skipped -> [], NOT a crash.
      let rows: ReadonlyArray<{ vendor_id: string }> = [];
      expect(() => { rows = vendorPerformanceTrackerEngine.listScorecards({ as_of: "not-a-date" }); }).not.toThrow();
      expect(rows).toEqual([]);
    });

    it("PII-free — projection exposes no name/email/phone beyond vendor_id", () => {
      addPO("Echo", "e1", "2026-06-01", "2026-06-01", 40_000, 0, 12);
      addPO("Echo", "e2", "2026-06-05", "2026-06-05", 40_000, 0, 12);
      addPO("Echo", "e3", "2026-06-10", "2026-06-10", 40_000, 0, 12);
      const rows = vendorPerformanceTrackerEngine.listScorecards({ as_of: "2026-06-25" });
      const keys = Object.keys(rows[0]);
      expect(keys).not.toContain("contact_email");
      expect(keys).not.toContain("phone");
    });
  });
});
