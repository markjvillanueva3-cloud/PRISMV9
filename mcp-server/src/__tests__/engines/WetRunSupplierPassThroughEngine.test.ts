/**
 * WetRunSupplierPassThroughEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-PASSTHROUGH
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunSupplierPassThroughEngine,
  type ShipInput,
} from "../../engines/WetRunSupplierPassThroughEngine.js";

const T0 = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function baseShip(overrides: Partial<ShipInput> = {}): ShipInput {
  return {
    pilot_id: "PILOT-A",
    batch_id: "BATCH-001",
    ts: T0,
    shipped_by: "alice@prism",
    process: "heat_treat",
    supplier_name: "Bodycote",
    supplier_po: "PO-12345",
    traveler_doc_id: "TRAV-0001",
    expected_return_ts: T0 + 3 * DAY,
    quantity: 25,
    grace_hours: 24,
    ...overrides,
  };
}

describe("WetRunSupplierPassThroughEngine", () => {
  let engine: WetRunSupplierPassThroughEngine;
  beforeEach(() => {
    engine = new WetRunSupplierPassThroughEngine();
  });

  describe("ship", () => {
    it("creates an op in in_transit_out", () => {
      const op = engine.ship(baseShip());
      expect(op.state).toBe("in_transit_out");
      expect(op.seq).toBe(1);
      expect(op.id).toBe("pt:PILOT-A:000001");
      expect(op.grace_hours).toBe(24);
    });

    it("rejects expected_return_ts <= ship ts", () => {
      expect(() =>
        engine.ship(baseShip({ expected_return_ts: T0 })),
      ).toThrow(/after ship ts/);
    });

    it("rejects quantity < 1", () => {
      expect(() =>
        engine.ship(baseShip({ quantity: 0 })),
      ).toThrow(/positive integer/);
    });

    it("rejects invalid process", () => {
      expect(() =>
        engine.ship(
          baseShip({
            process: "laser_weld" as unknown as ShipInput["process"],
          }),
        ),
      ).toThrow(/invalid pass-through process/);
    });

    it("rejects negative grace_hours", () => {
      expect(() =>
        engine.ship(baseShip({ grace_hours: -1 })),
      ).toThrow(/non-negative/);
    });

    it("keeps per-pilot seq independent", () => {
      engine.ship(baseShip({ pilot_id: "P1" }));
      const b = engine.ship(baseShip({ pilot_id: "P2" }));
      expect(b.seq).toBe(1);
      expect(b.id).toBe("pt:P2:000001");
    });
  });

  describe("state transitions", () => {
    it("walks in_transit_out → at_supplier → in_transit_back → received", () => {
      const op = engine.ship(baseShip());
      const atSup = engine.markAtSupplier({ op_id: op.id, ts: T0 + HOUR });
      expect(atSup.state).toBe("at_supplier");
      expect(atSup.supplier_received_ts).toBe(T0 + HOUR);
      const transit = engine.markInTransitBack({
        op_id: op.id,
        ts: T0 + 2 * DAY,
      });
      expect(transit.state).toBe("in_transit_back");
      const received = engine.receive({
        op_id: op.id,
        ts: T0 + 3 * DAY - HOUR,
        received_by: "carol@prism",
        coc_doc_id: "COC-0001",
        notes: "HT per AMS 2759/3, lot released, CoC matches traveler",
      });
      expect(received.state).toBe("received");
      expect(received.coc_doc_id).toBe("COC-0001");
    });

    it("rejects at_supplier from non-in_transit_out state", () => {
      const op = engine.ship(baseShip());
      engine.markAtSupplier({ op_id: op.id, ts: T0 + HOUR });
      expect(() =>
        engine.markAtSupplier({ op_id: op.id, ts: T0 + 2 * HOUR }),
      ).toThrow(/cannot mark at_supplier from state at_supplier/);
    });

    it("rejects in_transit_back from wrong state", () => {
      const op = engine.ship(baseShip());
      expect(() =>
        engine.markInTransitBack({ op_id: op.id, ts: T0 + HOUR }),
      ).toThrow(/cannot mark in_transit_back from state in_transit_out/);
    });

    it("rejects backwards ts on at_supplier", () => {
      const op = engine.ship(baseShip());
      expect(() =>
        engine.markAtSupplier({ op_id: op.id, ts: T0 - 1 }),
      ).toThrow(/precedes ship ts/);
    });
  });

  describe("receive", () => {
    it("rejects receiver == shipper (four-eyes)", () => {
      const op = engine.ship(baseShip());
      engine.markAtSupplier({ op_id: op.id, ts: T0 + HOUR });
      engine.markInTransitBack({ op_id: op.id, ts: T0 + 2 * DAY });
      expect(() =>
        engine.receive({
          op_id: op.id,
          ts: T0 + 3 * DAY,
          received_by: "alice@prism",
          coc_doc_id: "COC-0001",
          notes: "HT per AMS 2759/3, lot released, CoC matches traveler",
        }),
      ).toThrow(/four-eyes/);
    });

    it("rejects missing CoC doc id", () => {
      const op = engine.ship(baseShip());
      engine.markAtSupplier({ op_id: op.id, ts: T0 + HOUR });
      engine.markInTransitBack({ op_id: op.id, ts: T0 + 2 * DAY });
      expect(() =>
        engine.receive({
          op_id: op.id,
          ts: T0 + 3 * DAY,
          received_by: "carol@prism",
          coc_doc_id: "",
          notes: "HT per AMS 2759/3, lot released, CoC matches traveler",
        }),
      ).toThrow(/coc_doc_id must be a non-empty string/);
    });

    it("rejects short notes", () => {
      const op = engine.ship(baseShip());
      engine.markAtSupplier({ op_id: op.id, ts: T0 + HOUR });
      engine.markInTransitBack({ op_id: op.id, ts: T0 + 2 * DAY });
      expect(() =>
        engine.receive({
          op_id: op.id,
          ts: T0 + 3 * DAY,
          received_by: "carol@prism",
          coc_doc_id: "COC-0001",
          notes: "ok",
        }),
      ).toThrow(/at least 30/);
    });

    it("rejects receive from non-in_transit_back state", () => {
      const op = engine.ship(baseShip());
      expect(() =>
        engine.receive({
          op_id: op.id,
          ts: T0 + HOUR,
          received_by: "carol@prism",
          coc_doc_id: "COC-0001",
          notes: "HT per AMS 2759/3, lot released, CoC matches traveler",
        }),
      ).toThrow(/cannot receive from state in_transit_out/);
    });
  });

  describe("reject", () => {
    it("marks supplier rejection from in_transit_out", () => {
      const op = engine.ship(baseShip());
      const r = engine.reject({
        op_id: op.id,
        ts: T0 + HOUR,
        notes: "supplier rejected on incoming: wrong alloy callout on traveler",
      });
      expect(r.state).toBe("rejected_returned");
      expect(r.reject_notes).toMatch(/alloy/);
    });

    it("rejects reject from received (terminal)", () => {
      const op = engine.ship(baseShip());
      engine.markAtSupplier({ op_id: op.id, ts: T0 + HOUR });
      engine.markInTransitBack({ op_id: op.id, ts: T0 + 2 * DAY });
      engine.receive({
        op_id: op.id,
        ts: T0 + 3 * DAY,
        received_by: "carol@prism",
        coc_doc_id: "COC-0001",
        notes: "HT per AMS 2759/3, lot released, CoC matches traveler",
      });
      expect(() =>
        engine.reject({
          op_id: op.id,
          ts: T0 + 4 * DAY,
          notes: "cannot reject after receive, this should throw an error here",
        }),
      ).toThrow(/terminal state received/);
    });

    it("rejects short notes", () => {
      const op = engine.ship(baseShip());
      expect(() =>
        engine.reject({
          op_id: op.id,
          ts: T0 + HOUR,
          notes: "nope",
        }),
      ).toThrow(/at least 30/);
    });
  });

  describe("overdueAt", () => {
    it("returns empty when all ops within grace", () => {
      engine.ship(baseShip());
      const nowTs = T0 + 3 * DAY + 12 * HOUR; // under 24h grace
      expect(engine.overdueAt(nowTs)).toEqual([]);
    });

    it("returns overdue ops past grace window", () => {
      engine.ship(baseShip());
      engine.ship(baseShip({ batch_id: "BATCH-002" }));
      const nowTs = T0 + 3 * DAY + 48 * HOUR; // 24h past grace
      const report = engine.overdueAt(nowTs);
      expect(report).toHaveLength(2);
      expect(report[0]?.hours_overdue).toBeCloseTo(24, 1);
    });

    it("excludes received and rejected ops", () => {
      const op1 = engine.ship(baseShip());
      engine.markAtSupplier({ op_id: op1.id, ts: T0 + HOUR });
      engine.markInTransitBack({ op_id: op1.id, ts: T0 + 2 * DAY });
      engine.receive({
        op_id: op1.id,
        ts: T0 + 3 * DAY,
        received_by: "carol@prism",
        coc_doc_id: "COC-0001",
        notes: "HT per AMS 2759/3, lot released, CoC matches traveler",
      });
      const op2 = engine.ship(baseShip({ batch_id: "BATCH-002" }));
      engine.reject({
        op_id: op2.id,
        ts: T0 + HOUR,
        notes: "supplier rejected on incoming: wrong alloy callout on traveler",
      });
      engine.ship(baseShip({ batch_id: "BATCH-003" }));
      const report = engine.overdueAt(T0 + 10 * DAY);
      expect(report).toHaveLength(1);
      expect(report[0]?.batch_id).toBe("BATCH-003");
    });

    it("sorts by most-overdue first", () => {
      engine.ship(
        baseShip({ batch_id: "B1", expected_return_ts: T0 + 2 * DAY }),
      );
      engine.ship(
        baseShip({ batch_id: "B2", expected_return_ts: T0 + 5 * DAY }),
      );
      const report = engine.overdueAt(T0 + 10 * DAY);
      expect(report).toHaveLength(2);
      expect(report[0]?.batch_id).toBe("B1");
      expect(report[0]?.hours_overdue).toBeGreaterThan(
        report[1]?.hours_overdue ?? -1,
      );
    });
  });

  describe("openCountForPilot", () => {
    it("counts only non-terminal ops", () => {
      const op1 = engine.ship(baseShip({ batch_id: "B1" }));
      engine.ship(baseShip({ batch_id: "B2" }));
      const op3 = engine.ship(baseShip({ batch_id: "B3" }));
      engine.markAtSupplier({ op_id: op1.id, ts: T0 + HOUR });
      engine.markInTransitBack({ op_id: op1.id, ts: T0 + 2 * DAY });
      engine.receive({
        op_id: op1.id,
        ts: T0 + 3 * DAY,
        received_by: "carol@prism",
        coc_doc_id: "COC-0001",
        notes: "HT per AMS 2759/3, lot released, CoC matches traveler",
      });
      engine.reject({
        op_id: op3.id,
        ts: T0 + HOUR,
        notes: "supplier rejected on incoming: wrong alloy callout on traveler",
      });
      expect(engine.openCountForPilot("PILOT-A")).toBe(1);
    });
  });

  describe("snapshot", () => {
    it("captures schemaVersion + ops + last_seq_by_pilot", () => {
      engine.ship(baseShip({ pilot_id: "P1", batch_id: "B1" }));
      engine.ship(baseShip({ pilot_id: "P1", batch_id: "B2" }));
      engine.ship(baseShip({ pilot_id: "P2", batch_id: "B1" }));
      const s = engine.snapshot();
      expect(s.schemaVersion).toBe(1);
      expect(s.ops).toHaveLength(3);
      expect(s.last_seq_by_pilot["P1"]).toBe(2);
      expect(s.last_seq_by_pilot["P2"]).toBe(1);
    });

    it("is defensively copied", () => {
      const op = engine.ship(baseShip());
      const s = engine.snapshot();
      s.ops[0]!.supplier_name = "TAMPERED";
      expect(engine.getOp(op.id)?.supplier_name).toBe("Bodycote");
    });
  });
});
