/**
 * RealTimeFinancialSnapshotEngine.test.ts — HOTEL/U-REALTIME-FINANCIAL-SNAPSHOT (iter11)
 */
import { describe, it, expect } from "vitest";
import { realTimeFinancialSnapshotEngine } from "../engines/RealTimeFinancialSnapshotEngine.js";

const VALID_INPUT = {
  as_of: "2026-05-25",
  period_start: "2026-05-01",
};

describe("RealTimeFinancialSnapshotEngine", () => {
  describe("snapshot — happy path", () => {
    it("returns the full composite envelope with all required sections", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      expect(r.as_of).toBe("2026-05-25");
      expect(r.period_start).toBe("2026-05-01");
      expect(r.currency).toBe("USD");
      expect(r.source).toBe("RealTimeFinancialSnapshotEngine.v1");
      // Concrete shape assertions on every required section.
      expect(Object.keys(r.ar)).toEqual(
        expect.arrayContaining(["bucket_0_30", "bucket_31_60", "bucket_61_90", "bucket_91_plus", "total_ar", "oldest_invoice_days"]),
      );
      expect(Object.keys(r.ap)).toEqual(
        expect.arrayContaining(["bucket_0_30", "bucket_31_60", "bucket_61_90", "bucket_91_plus", "total_ap", "oldest_po_days"]),
      );
      expect(Object.keys(r.derived)).toEqual(
        expect.arrayContaining(["dso_days", "dpo_days", "cash_conversion_cycle_days", "quick_ratio", "current_ratio"]),
      );
      expect(Object.keys(r.reconciliation)).toEqual(
        expect.arrayContaining(["debits", "credits", "in_balance", "delta_cents"]),
      );
    });

    it("includes burden-rate weighted avg when fleet_machine_ids supplied", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot({
        ...VALID_INPUT,
        fleet_machine_ids: ["vmc_tier2", "vmc_entry"],
      });
      expect(r.burden_rate_weighted).not.toBeNull();
      expect(r.burden_rate_weighted!.weighted_burden_rate).toBeGreaterThan(0);
      expect(r.burden_rate_weighted!.total_period_cost).toBeGreaterThan(0);
    });

    it("burden_rate_weighted null when no fleet provided", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      expect(r.burden_rate_weighted).toBeNull();
    });
  });

  describe("Hotel-soul financial invariants", () => {
    it("returned envelope is frozen + immutable", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.ar)).toBe(true);
      expect(Object.isFrozen(r.ap)).toBe(true);
      expect(Object.isFrozen(r.derived)).toBe(true);
      expect(Object.isFrozen(r.reconciliation)).toBe(true);
    });

    it("ar buckets sum to total_ar (forward reconciliation, ±1¢)", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      const sum = r.ar.bucket_0_30 + r.ar.bucket_31_60 + r.ar.bucket_61_90 + r.ar.bucket_91_plus;
      expect(Math.abs(sum - r.ar.total_ar)).toBeLessThan(0.01);
    });

    it("ap buckets sum to total_ap (forward reconciliation, ±1¢)", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      const sum = r.ap.bucket_0_30 + r.ap.bucket_31_60 + r.ap.bucket_61_90 + r.ap.bucket_91_plus;
      expect(Math.abs(sum - r.ap.total_ap)).toBeLessThan(0.01);
    });

    it("reconciliation reports finite debits/credits + non-negative delta", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      expect(Number.isFinite(r.reconciliation.debits)).toBe(true);
      expect(Number.isFinite(r.reconciliation.credits)).toBe(true);
      expect(typeof r.reconciliation.in_balance).toBe("boolean");
      expect(r.reconciliation.delta_cents).toBeGreaterThanOrEqual(0);
      // in_balance gate: delta ≤ 1¢ ⇒ true
      expect(r.reconciliation.in_balance).toBe(r.reconciliation.delta_cents <= 1);
    });

    it("cents-resolution preserved (cash, total_assets values exact at 2dp)", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      expect(r.cash * 100).toBe(Math.round(r.cash * 100));
      expect(r.total_assets * 100).toBe(Math.round(r.total_assets * 100));
      expect(r.revenue_ptd * 100).toBe(Math.round(r.revenue_ptd * 100));
      expect(r.cogs_ptd * 100).toBe(Math.round(r.cogs_ptd * 100));
    });

    it("gross_margin_pct = 0 when revenue = 0; bounded above 100% when revenue > 0", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      if (r.revenue_ptd > 0) {
        expect(r.gross_margin_pct).toBeLessThanOrEqual(100);
      } else {
        expect(r.gross_margin_pct).toBe(0);
      }
    });

    it("derived metrics are finite (no NaN/Infinity)", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      expect(Number.isFinite(r.derived.dso_days)).toBe(true);
      expect(Number.isFinite(r.derived.dpo_days)).toBe(true);
      expect(Number.isFinite(r.derived.cash_conversion_cycle_days)).toBe(true);
      expect(Number.isFinite(r.derived.quick_ratio)).toBe(true);
      expect(Number.isFinite(r.derived.current_ratio)).toBe(true);
    });

    it("AR oldest_invoice_days is non-negative", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      expect(r.ar.oldest_invoice_days).toBeGreaterThanOrEqual(0);
    });

    it("equity equals total_assets - total_liabilities (accounting identity, ±1¢)", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot(VALID_INPUT);
      // Engine derives equity = assets - liabilities when not explicitly provided.
      expect(Math.abs(r.equity - (r.total_assets - r.total_liabilities))).toBeLessThanOrEqual(0.01);
    });
  });

  describe("R12 fail-loud input validation", () => {
    it("throws on null input", async () => {
      await expect(realTimeFinancialSnapshotEngine.snapshot(null as unknown as { as_of: string; period_start: string })).rejects.toThrow(
        /input required/,
      );
    });

    it("throws on non-ISO as_of date", async () => {
      await expect(
        realTimeFinancialSnapshotEngine.snapshot({ as_of: "May 25, 2026", period_start: "2026-05-01" }),
      ).rejects.toThrow(/as_of must be ISO date/);
    });

    it("throws on non-ISO period_start", async () => {
      await expect(
        realTimeFinancialSnapshotEngine.snapshot({ as_of: "2026-05-25", period_start: "5/1/26" }),
      ).rejects.toThrow(/period_start must be ISO date/);
    });

    it("throws when period_start > as_of (inverted dates)", async () => {
      await expect(
        realTimeFinancialSnapshotEngine.snapshot({ as_of: "2026-05-01", period_start: "2026-05-25" }),
      ).rejects.toThrow(/period_start must be ≤ as_of/);
    });

    it("throws on missing as_of", async () => {
      await expect(
        realTimeFinancialSnapshotEngine.snapshot({ period_start: "2026-05-01" } as { period_start: string; as_of: string }),
      ).rejects.toThrow(/as_of must be ISO date/);
    });
  });

  describe("Variability — 3 different period configurations", () => {
    it("month-to-date period (single calendar month)", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot({
        as_of: "2026-05-25",
        period_start: "2026-05-01",
      });
      expect(r.period_start).toBe("2026-05-01");
      expect(r.as_of).toBe("2026-05-25");
    });

    it("quarter-to-date period (3-month window)", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot({
        as_of: "2026-05-25",
        period_start: "2026-03-01",
      });
      expect(r.period_start).toBe("2026-03-01");
    });

    it("year-to-date period (full year)", async () => {
      const r = await realTimeFinancialSnapshotEngine.snapshot({
        as_of: "2026-12-31",
        period_start: "2026-01-01",
      });
      expect(r.period_start).toBe("2026-01-01");
      expect(r.as_of).toBe("2026-12-31");
    });
  });
});
