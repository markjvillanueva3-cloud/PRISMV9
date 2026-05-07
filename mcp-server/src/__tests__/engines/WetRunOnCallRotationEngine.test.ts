/**
 * WetRunOnCallRotationEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-ONCALL
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunOnCallRotationEngine,
  type ShiftInput,
} from "../../engines/WetRunOnCallRotationEngine.js";

const T0 = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const WEEK = 7 * 24 * HOUR;

function baseShift(overrides: Partial<ShiftInput> = {}): ShiftInput {
  return {
    shift_id: "W01",
    start_ts: T0,
    end_ts: T0 + WEEK,
    primary: "alice",
    secondary: "bob",
    ladder: ["carol", "dave"],
    ack_window_ms: 15 * MIN,
    secondary_window_ms: 15 * MIN,
    ladder_window_ms: 30 * MIN,
    ...overrides,
  };
}

describe("WetRunOnCallRotationEngine", () => {
  let engine: WetRunOnCallRotationEngine;
  beforeEach(() => {
    engine = new WetRunOnCallRotationEngine();
  });

  describe("configureShift", () => {
    it("registers a single shift", () => {
      const shift = engine.configureShift(baseShift());
      expect(shift.shift_id).toBe("W01");
      expect(shift.ladder).toEqual(["carol", "dave"]);
    });

    it("requires contiguous shifts", () => {
      engine.configureShift(baseShift());
      expect(() =>
        engine.configureShift(
          baseShift({
            shift_id: "W02",
            start_ts: T0 + WEEK + 1000, // gap
            end_ts: T0 + 2 * WEEK,
          }),
        ),
      ).toThrow(/must start where previous ended/);
    });

    it("accepts perfectly contiguous shifts", () => {
      engine.configureShift(baseShift());
      const w2 = engine.configureShift(
        baseShift({
          shift_id: "W02",
          start_ts: T0 + WEEK,
          end_ts: T0 + 2 * WEEK,
          primary: "carol",
          secondary: "dave",
          ladder: ["alice", "bob"],
        }),
      );
      expect(w2.shift_id).toBe("W02");
    });

    it("rejects duplicate shift_id", () => {
      engine.configureShift(baseShift());
      expect(() =>
        engine.configureShift(
          baseShift({ start_ts: T0 + WEEK, end_ts: T0 + 2 * WEEK }),
        ),
      ).toThrow(/duplicate shift_id/);
    });

    it("rejects primary == secondary", () => {
      expect(() =>
        engine.configureShift(baseShift({ secondary: "alice" })),
      ).toThrow(/primary and secondary must differ/);
    });

    it("rejects ladder containing primary or secondary", () => {
      expect(() =>
        engine.configureShift(
          baseShift({ ladder: ["alice", "eve"] }),
        ),
      ).toThrow(/ladder cannot include/);
    });

    it("rejects duplicate ladder entries", () => {
      expect(() =>
        engine.configureShift(baseShift({ ladder: ["carol", "carol"] })),
      ).toThrow(/duplicates/);
    });

    it("rejects end_ts <= start_ts", () => {
      expect(() =>
        engine.configureShift(baseShift({ end_ts: T0 })),
      ).toThrow(/strictly greater/);
    });

    it("rejects ack windows outside bounds", () => {
      expect(() =>
        engine.configureShift(baseShift({ ack_window_ms: 1000 })),
      ).toThrow(/ack_window_ms must be within/);
      expect(() =>
        engine.configureShift(baseShift({ ladder_window_ms: 24 * HOUR })),
      ).toThrow(/ladder_window_ms/);
    });
  });

  describe("currentShift", () => {
    it("returns the active shift", () => {
      engine.configureShift(baseShift());
      engine.configureShift(
        baseShift({
          shift_id: "W02",
          start_ts: T0 + WEEK,
          end_ts: T0 + 2 * WEEK,
          primary: "carol",
          secondary: "dave",
          ladder: ["alice", "bob"],
        }),
      );
      expect(engine.currentShift(T0 + HOUR)?.shift_id).toBe("W01");
      expect(engine.currentShift(T0 + WEEK + HOUR)?.shift_id).toBe("W02");
    });

    it("returns undefined outside any shift", () => {
      engine.configureShift(baseShift());
      expect(engine.currentShift(T0 - 1)).toBeUndefined();
      expect(engine.currentShift(T0 + WEEK)).toBeUndefined(); // end is exclusive
    });
  });

  describe("page", () => {
    it("creates a page assigned to the primary", () => {
      engine.configureShift(baseShift());
      const page = engine.page({
        pilot_id: "PILOT-A",
        reason: "WetRun abort from SessionLog",
        ts: T0 + HOUR,
      });
      expect(page.current_stage).toBe("primary");
      expect(page.current_responder).toBe("alice");
      expect(page.stage_deadline).toBe(T0 + HOUR + 15 * MIN);
    });

    it("rejects pages outside any shift", () => {
      engine.configureShift(baseShift());
      expect(() =>
        engine.page({
          pilot_id: "PILOT-A",
          reason: "late abort page long after shift end",
          ts: T0 + WEEK + HOUR,
        }),
      ).toThrow(/no active shift/);
    });

    it("rejects pages with a too-short reason", () => {
      engine.configureShift(baseShift());
      expect(() =>
        engine.page({
          pilot_id: "PILOT-A",
          reason: "abort",
          ts: T0 + HOUR,
        }),
      ).toThrow(/at least 10/);
    });
  });

  describe("acknowledge", () => {
    beforeEach(() => {
      engine.configureShift(baseShift());
    });

    it("closes a page when the primary acknowledges", () => {
      const p = engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0 + HOUR,
      });
      const ack = engine.acknowledge({
        page_id: p.page_id,
        responder: "alice",
        ts: T0 + HOUR + MIN,
      });
      expect(ack.current_stage).toBe("acknowledged");
      expect(ack.acknowledged_by).toBe("alice");
    });

    it("rejects acknowledgment by the wrong responder", () => {
      const p = engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0 + HOUR,
      });
      expect(() =>
        engine.acknowledge({
          page_id: p.page_id,
          responder: "bob",
          ts: T0 + HOUR + MIN,
        }),
      ).toThrow(/not the current primary responder/);
    });

    it("rejects double acknowledge", () => {
      const p = engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0 + HOUR,
      });
      engine.acknowledge({
        page_id: p.page_id,
        responder: "alice",
        ts: T0 + HOUR + MIN,
      });
      expect(() =>
        engine.acknowledge({
          page_id: p.page_id,
          responder: "alice",
          ts: T0 + HOUR + 2 * MIN,
        }),
      ).toThrow(/already acknowledged/);
    });
  });

  describe("sweepEscalations", () => {
    beforeEach(() => {
      engine.configureShift(baseShift());
    });

    it("escalates primary → secondary after ack window", () => {
      const p = engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0,
      });
      const notes = engine.sweepEscalations(T0 + 16 * MIN);
      expect(notes).toHaveLength(1);
      expect(notes[0]?.previous_stage).toBe("primary");
      expect(notes[0]?.next_stage).toBe("secondary");
      expect(notes[0]?.next_responder).toBe("bob");
      const page = engine.getPage(p.page_id);
      expect(page?.current_responder).toBe("bob");
      expect(page?.stage_deadline).toBe(T0 + 15 * MIN + 15 * MIN);
    });

    it("escalates through secondary → ladder[0] → ladder[1] in one sweep", () => {
      const p = engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0,
      });
      // primary timeout @15m, secondary @30m, ladder[0] @60m. Sweep at
      // T0+65m lands on ladder[1] but not past its 30m window.
      const notes = engine.sweepEscalations(T0 + 65 * MIN);
      expect(notes.map((n) => n.previous_stage)).toEqual([
        "primary",
        "secondary",
        "ladder",
      ]);
      const page = engine.getPage(p.page_id);
      expect(page?.current_responder).toBe("dave");
      expect(page?.ladder_position).toBe(1);
    });

    it("expires a page when the ladder runs out", () => {
      const p = engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0,
      });
      // need to outlast primary + secondary + 2 ladder members
      const notes = engine.sweepEscalations(T0 + 24 * HOUR);
      const expired = notes.find((n) => n.next_stage === "expired");
      expect(expired).toBeDefined();
      const page = engine.getPage(p.page_id);
      expect(page?.current_stage).toBe("expired");
      expect(page?.current_responder).toBeNull();
    });

    it("marks empty-ladder shifts expired right after secondary", () => {
      const engine2 = new WetRunOnCallRotationEngine();
      engine2.configureShift(baseShift({ ladder: [] }));
      const p = engine2.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0,
      });
      const notes = engine2.sweepEscalations(T0 + 120 * MIN);
      expect(notes.at(-1)?.next_stage).toBe("expired");
      expect(engine2.getPage(p.page_id)?.current_stage).toBe("expired");
    });

    it("does not escalate acknowledged pages", () => {
      const p = engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0,
      });
      engine.acknowledge({
        page_id: p.page_id,
        responder: "alice",
        ts: T0 + MIN,
      });
      expect(engine.sweepEscalations(T0 + 24 * HOUR)).toEqual([]);
    });

    it("rejects acknowledge from primary after escalation", () => {
      const p = engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by operator",
        ts: T0,
      });
      engine.sweepEscalations(T0 + 16 * MIN);
      // alice is no longer current responder
      expect(() =>
        engine.acknowledge({
          page_id: p.page_id,
          responder: "alice",
          ts: T0 + 17 * MIN,
        }),
      ).toThrow(/not the current secondary/);
      // but bob can ack now
      const ack = engine.acknowledge({
        page_id: p.page_id,
        responder: "bob",
        ts: T0 + 17 * MIN,
      });
      expect(ack.current_stage).toBe("acknowledged");
    });
  });

  describe("pendingEscalations", () => {
    it("reports pages past deadline", () => {
      engine.configureShift(baseShift());
      engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered",
        ts: T0,
      });
      expect(engine.pendingEscalations(T0 + 16 * MIN)).toHaveLength(1);
    });
    it("excludes pages within deadline", () => {
      engine.configureShift(baseShift());
      engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered",
        ts: T0,
      });
      expect(engine.pendingEscalations(T0 + 5 * MIN)).toHaveLength(0);
    });
  });

  describe("swap", () => {
    beforeEach(() => {
      engine.configureShift(baseShift());
    });

    it("records a valid swap for the primary role", () => {
      const swap = engine.swap({
        shift_id: "W01",
        role: "primary",
        from_person: "alice",
        to_person: "eve",
        initiated_by: "alice",
        approved_by: "manager",
        reason: "Alice on approved sick leave, Eve covering remainder",
        ts: T0 + HOUR,
      });
      expect(swap.swap_id).toMatch(/^swap:/);
      // subsequent page should go to Eve
      const p = engine.page({
        pilot_id: "P",
        reason: "abort triggered",
        ts: T0 + 2 * HOUR,
      });
      expect(p.current_responder).toBe("eve");
    });

    it("rejects swap with wrong from_person", () => {
      expect(() =>
        engine.swap({
          shift_id: "W01",
          role: "primary",
          from_person: "carol",
          to_person: "eve",
          initiated_by: "alice",
          approved_by: "manager",
          reason: "Carol is not primary, this should be rejected",
          ts: T0 + HOUR,
        }),
      ).toThrow(/does not hold primary/);
    });

    it("rejects swap outside the shift window", () => {
      expect(() =>
        engine.swap({
          shift_id: "W01",
          role: "primary",
          from_person: "alice",
          to_person: "eve",
          initiated_by: "alice",
          approved_by: "manager",
          reason: "Swap outside the shift window, should be rejected",
          ts: T0 + WEEK + HOUR,
        }),
      ).toThrow(/outside shift window/);
    });

    it("rejects swap to the same person", () => {
      expect(() =>
        engine.swap({
          shift_id: "W01",
          role: "primary",
          from_person: "alice",
          to_person: "alice",
          initiated_by: "alice",
          approved_by: "manager",
          reason: "Tautological swap that is invalid by construction",
          ts: T0 + HOUR,
        }),
      ).toThrow(/must differ/);
    });

    it("rejects four-eyes violation when approver == initiator", () => {
      expect(() =>
        engine.swap({
          shift_id: "W01",
          role: "primary",
          from_person: "alice",
          to_person: "eve",
          initiated_by: "alice",
          approved_by: "alice",
          reason: "Attempting a self-approved swap, not allowed under four-eyes",
          ts: T0 + HOUR,
        }),
      ).toThrow(/approver must differ/);
    });

    it("rejects reason shorter than 30 chars", () => {
      expect(() =>
        engine.swap({
          shift_id: "W01",
          role: "primary",
          from_person: "alice",
          to_person: "eve",
          initiated_by: "alice",
          approved_by: "manager",
          reason: "too brief",
          ts: T0 + HOUR,
        }),
      ).toThrow(/at least 30/);
    });

    it("rejects swap target who already holds the other role", () => {
      expect(() =>
        engine.swap({
          shift_id: "W01",
          role: "primary",
          from_person: "alice",
          to_person: "bob",
          initiated_by: "alice",
          approved_by: "manager",
          reason: "Rolling alice into bob's secondary role — role collision",
          ts: T0 + HOUR,
        }),
      ).toThrow(/other role/);
    });

    it("rejects swap target already on ladder", () => {
      expect(() =>
        engine.swap({
          shift_id: "W01",
          role: "primary",
          from_person: "alice",
          to_person: "carol",
          initiated_by: "alice",
          approved_by: "manager",
          reason: "Moving alice out, carol in — but carol is on the ladder",
          ts: T0 + HOUR,
        }),
      ).toThrow(/escalation ladder/);
    });
  });

  describe("snapshot", () => {
    it("captures schemaVersion + shifts + swaps + pages", () => {
      engine.configureShift(baseShift());
      engine.page({
        pilot_id: "PILOT-A",
        reason: "abort triggered by session log",
        ts: T0 + HOUR,
      });
      engine.swap({
        shift_id: "W01",
        role: "primary",
        from_person: "alice",
        to_person: "eve",
        initiated_by: "alice",
        approved_by: "manager",
        reason: "Alice on approved sick leave, Eve covering remainder",
        ts: T0 + 2 * HOUR,
      });
      const snap = engine.snapshot();
      expect(snap.schemaVersion).toBe(1);
      expect(snap.shifts).toHaveLength(1);
      expect(snap.pages).toHaveLength(1);
      expect(snap.swaps).toHaveLength(1);
    });

    it("is defensively copied", () => {
      engine.configureShift(baseShift());
      const snap = engine.snapshot();
      snap.shifts[0]!.ladder.push("evil");
      const again = engine.listShifts();
      expect(again[0]?.ladder).toEqual(["carol", "dave"]);
    });
  });
});
