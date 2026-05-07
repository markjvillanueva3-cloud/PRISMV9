/**
 * WetRunScrapLedgerEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SCRAP
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunScrapLedgerEngine,
  type RecordInput,
} from "../../engines/WetRunScrapLedgerEngine.js";

const T0 = 1_700_000_000_000;

function baseRecord(overrides: Partial<RecordInput> = {}): RecordInput {
  return {
    pilot_id: "PILOT-A",
    ts: T0,
    part_number: "P-100",
    quantity: 2,
    material_cost_cents: 1500, // $15.00
    labor_minutes: 30,
    overhead_rate_per_hour_cents: 8000, // $80/h
    category: "in_process",
    salvageable: false,
    notes: "scrap from test-cut setup, cutter chipped during spindle warm-up",
    ...overrides,
  };
}

describe("WetRunScrapLedgerEngine", () => {
  let engine: WetRunScrapLedgerEngine;
  beforeEach(() => {
    engine = new WetRunScrapLedgerEngine();
  });

  describe("record", () => {
    it("computes total_cost_cents correctly (material + prorated overhead)", () => {
      const e = engine.record(baseRecord());
      // 1500 + (30/60) * 8000 = 1500 + 4000 = 5500
      expect(e.total_cost_cents).toBe(5500);
      expect(e.seq).toBe(1);
      expect(e.id).toBe("scrap:PILOT-A:000001");
    });

    it("rounds half-up on labor fraction", () => {
      const e = engine.record(
        baseRecord({ labor_minutes: 7, overhead_rate_per_hour_cents: 7777 }),
      );
      // labor_cents_exact = 7/60 * 7777 = 907.316...  → 907
      expect(e.total_cost_cents).toBe(1500 + 907);
    });

    it("rejects non-integer material cost cents", () => {
      expect(() =>
        engine.record(baseRecord({ material_cost_cents: 15.5 })),
      ).toThrow(/non-negative integer/);
    });

    it("rejects negative labor minutes", () => {
      expect(() =>
        engine.record(baseRecord({ labor_minutes: -1 })),
      ).toThrow(/non-negative/);
    });

    it("rejects quantity < 1", () => {
      expect(() =>
        engine.record(baseRecord({ quantity: 0 })),
      ).toThrow(/positive integer/);
    });

    it("rejects non-monotonic ts per pilot", () => {
      engine.record(baseRecord({ ts: T0 + 100 }));
      expect(() => engine.record(baseRecord({ ts: T0 + 50 }))).toThrow(
        /monotonic/,
      );
    });

    it("rejects equal ts (strict monotonicity)", () => {
      engine.record(baseRecord({ ts: T0 }));
      expect(() => engine.record(baseRecord({ ts: T0 }))).toThrow(
        /monotonic/,
      );
    });

    it("rejects notes shorter than 20 chars", () => {
      expect(() =>
        engine.record(baseRecord({ notes: "short" })),
      ).toThrow(/at least 20/);
    });

    it("rejects invalid category", () => {
      expect(() =>
        engine.record(
          baseRecord({
            category: "meta" as unknown as RecordInput["category"],
          }),
        ),
      ).toThrow(/invalid scrap category/);
    });

    it("keeps per-pilot seq independent", () => {
      engine.record(baseRecord({ pilot_id: "P1", ts: T0 }));
      const b = engine.record(baseRecord({ pilot_id: "P2", ts: T0 }));
      expect(b.seq).toBe(1);
      expect(b.id).toBe("scrap:P2:000001");
    });
  });

  describe("linkNCR", () => {
    it("associates an NCR id", () => {
      const e = engine.record(baseRecord());
      const linked = engine.linkNCR({
        entry_id: e.id,
        ncr_id: "ncr:PILOT-A:000003",
      });
      expect(linked.ncr_id).toBe("ncr:PILOT-A:000003");
    });

    it("allows re-linking same NCR (idempotent)", () => {
      const e = engine.record(baseRecord({ ncr_id: "ncr:X" }));
      const linked = engine.linkNCR({
        entry_id: e.id,
        ncr_id: "ncr:X",
      });
      expect(linked.ncr_id).toBe("ncr:X");
    });

    it("rejects re-link to a different NCR", () => {
      const e = engine.record(baseRecord({ ncr_id: "ncr:X" }));
      expect(() =>
        engine.linkNCR({ entry_id: e.id, ncr_id: "ncr:Y" }),
      ).toThrow(/already linked/);
    });

    it("rejects unknown entry id", () => {
      expect(() =>
        engine.linkNCR({ entry_id: "missing", ncr_id: "ncr:X" }),
      ).toThrow(/scrap entry not found/);
    });
  });

  describe("markSalvaged", () => {
    it("marks a salvageable entry as rescued", () => {
      const e = engine.record(baseRecord({ salvageable: true }));
      const s = engine.markSalvaged({
        entry_id: e.id,
        salvage_ncr_id: "ncr:Y",
      });
      expect(s.salvaged).toBe(true);
      expect(s.salvage_ncr_id).toBe("ncr:Y");
    });

    it("rejects salvage on non-salvageable entry", () => {
      const e = engine.record(baseRecord({ salvageable: false }));
      expect(() =>
        engine.markSalvaged({ entry_id: e.id, salvage_ncr_id: "ncr:Y" }),
      ).toThrow(/not marked salvageable/);
    });

    it("rejects double salvage", () => {
      const e = engine.record(baseRecord({ salvageable: true }));
      engine.markSalvaged({ entry_id: e.id, salvage_ncr_id: "ncr:Y" });
      expect(() =>
        engine.markSalvaged({ entry_id: e.id, salvage_ncr_id: "ncr:Z" }),
      ).toThrow(/already marked salvaged/);
    });
  });

  describe("summariseForPilot", () => {
    it("aggregates total, category breakdown, and salvaged split", () => {
      engine.record(
        baseRecord({ ts: T0, category: "raw_material", quantity: 5 }),
      );
      engine.record(
        baseRecord({
          ts: T0 + 1,
          category: "in_process",
          quantity: 2,
          salvageable: true,
        }),
      );
      const e3 = engine.record(
        baseRecord({ ts: T0 + 2, category: "in_process", quantity: 1 }),
      );
      engine.markSalvaged({
        entry_id: "scrap:PILOT-A:000002",
        salvage_ncr_id: "ncr:rework",
      });

      const s = engine.summariseForPilot("PILOT-A");
      expect(s.entry_count).toBe(3);
      expect(s.total_quantity).toBe(8);
      expect(s.total_cost_cents).toBe(3 * 5500);
      expect(s.salvaged_cost_cents).toBe(5500);
      expect(s.net_loss_cost_cents).toBe(2 * 5500);
      // category sort: in_process (2 entries = 11000) > raw_material (1 = 5500)
      expect(s.by_category[0]?.category).toBe("in_process");
      expect(s.by_category[0]?.entry_count).toBe(2);
      expect(s.by_category[1]?.category).toBe("raw_material");
      // e3 used only to populate in_process count
      expect(e3.category).toBe("in_process");
    });

    it("returns zeroed summary when no entries exist for pilot", () => {
      const s = engine.summariseForPilot("EMPTY");
      expect(s.entry_count).toBe(0);
      expect(s.total_cost_cents).toBe(0);
      expect(s.by_category).toEqual([]);
    });
  });

  describe("scrapRateCentsPerGoodPart", () => {
    it("computes net loss divided by good parts (rounded)", () => {
      engine.record(baseRecord({ ts: T0 })); // 5500 cents
      engine.record(baseRecord({ ts: T0 + 1 })); // another 5500
      // net loss = 11000 cents across 9 good parts → 1222 cents/good part (1222.22 rounded down to 1222)
      expect(engine.scrapRateCentsPerGoodPart("PILOT-A", 9)).toBe(1222);
    });

    it("rejects non-positive good parts", () => {
      engine.record(baseRecord());
      expect(() =>
        engine.scrapRateCentsPerGoodPart("PILOT-A", 0),
      ).toThrow(/positive integer/);
    });
  });

  describe("salvagedShare", () => {
    it("returns 0 when no entries exist", () => {
      expect(engine.salvagedShare("EMPTY")).toBe(0);
    });

    it("returns the fraction of cost salvaged", () => {
      engine.record(baseRecord({ ts: T0, salvageable: true }));
      engine.record(baseRecord({ ts: T0 + 1 }));
      engine.markSalvaged({
        entry_id: "scrap:PILOT-A:000001",
        salvage_ncr_id: "ncr:rework",
      });
      expect(engine.salvagedShare("PILOT-A")).toBeCloseTo(0.5, 6);
    });
  });

  describe("snapshot", () => {
    it("captures schemaVersion + entries + last_seq + last_ts", () => {
      engine.record(baseRecord({ pilot_id: "P1", ts: T0 }));
      engine.record(baseRecord({ pilot_id: "P1", ts: T0 + 5 }));
      engine.record(baseRecord({ pilot_id: "P2", ts: T0 }));
      const s = engine.snapshot();
      expect(s.schemaVersion).toBe(1);
      expect(s.entries).toHaveLength(3);
      expect(s.last_seq_by_pilot["P1"]).toBe(2);
      expect(s.last_ts_by_pilot["P1"]).toBe(T0 + 5);
      expect(s.last_seq_by_pilot["P2"]).toBe(1);
    });

    it("is defensively copied", () => {
      const e = engine.record(baseRecord());
      const s = engine.snapshot();
      s.entries[0]!.notes = "TAMPERED";
      expect(engine.getEntry(e.id)?.notes).toMatch(/cutter chipped/);
    });
  });
});
