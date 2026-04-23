/**
 * WetRunDeviationRegistryEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-DEVIATION
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunDeviationRegistryEngine,
  type RecordInput,
} from "../../engines/WetRunDeviationRegistryEngine.js";

const T0 = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

function baseRecord(overrides: Partial<RecordInput> = {}): RecordInput {
  // Keep recorded_at ≥ occurred_at by default when caller overrides only one.
  const occurred = overrides.occurred_at ?? T0;
  const recorded = overrides.recorded_at ?? occurred;
  return {
    pilot_id: "PILOT-A",
    occurred_at: occurred,
    recorded_at: recorded,
    kind: "tool_substitution",
    severity: "minor",
    requester: "operator-1",
    reason: "swapped to backup insert after edge chip observed mid-run",
    ...overrides,
  };
}

describe("WetRunDeviationRegistryEngine", () => {
  let engine: WetRunDeviationRegistryEngine;
  beforeEach(() => {
    engine = new WetRunDeviationRegistryEngine();
  });

  describe("record", () => {
    it("records a minor deviation in approved state", () => {
      const e = engine.record(baseRecord());
      expect(e.state).toBe("approved");
      expect(e.seq).toBe(1);
      expect(e.id).toBe("dev:PILOT-A:000001");
    });

    it("records a major deviation in approved state", () => {
      const e = engine.record(baseRecord({ severity: "major" }));
      expect(e.state).toBe("approved");
    });

    it("puts critical without pre-approval into pending_justification", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      expect(e.state).toBe("pending_justification");
      expect(e.approver).toBeUndefined();
    });

    it("accepts pre-approved critical with four-eyes", () => {
      const e = engine.record(
        baseRecord({
          severity: "critical",
          pre_approval: { approver: "lead-engineer" },
        }),
      );
      expect(e.state).toBe("approved");
      expect(e.approver).toBe("lead-engineer");
    });

    it("rejects pre-approval by requester (four-eyes violation)", () => {
      expect(() =>
        engine.record(
          baseRecord({
            severity: "critical",
            pre_approval: { approver: "operator-1" },
          }),
        ),
      ).toThrow(/four-eyes/);
    });

    it("rejects recorded_at preceding occurred_at", () => {
      expect(() =>
        engine.record(baseRecord({ occurred_at: T0 + 10, recorded_at: T0 })),
      ).toThrow(/recorded_at cannot precede occurred_at/);
    });

    it("rejects a too-short reason", () => {
      expect(() => engine.record(baseRecord({ reason: "swap" }))).toThrow(
        /at least 30/,
      );
    });

    it("rejects invalid kind", () => {
      expect(() =>
        engine.record(
          baseRecord({
            kind: "unknown_kind" as unknown as RecordInput["kind"],
          }),
        ),
      ).toThrow(/invalid deviation kind/);
    });

    it("rejects invalid severity", () => {
      expect(() =>
        engine.record(
          baseRecord({ severity: "cosmic" as unknown as RecordInput["severity"] }),
        ),
      ).toThrow(/invalid severity/);
    });

    it("assigns per-pilot monotonic seq independently", () => {
      const a = engine.record(baseRecord({ pilot_id: "P1", occurred_at: T0 }));
      const b = engine.record(
        baseRecord({ pilot_id: "P1", occurred_at: T0 + 1 }),
      );
      const c = engine.record(
        baseRecord({ pilot_id: "P2", occurred_at: T0 }),
      );
      expect(a.seq).toBe(1);
      expect(b.seq).toBe(2);
      expect(c.seq).toBe(1);
    });
  });

  describe("justify", () => {
    it("justifies a pending_justification critical", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      const j = engine.justify({
        deviation_id: e.id,
        approver: "lead-engineer",
        justification:
          "Verified via material cert — substitution was appropriate and within spec",
        resolution_at: T0 + HOUR,
      });
      expect(j.state).toBe("justified");
      expect(j.approver).toBe("lead-engineer");
      expect(j.justification).toMatch(/within spec/);
    });

    it("rejects justification by the requester", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      expect(() =>
        engine.justify({
          deviation_id: e.id,
          approver: "operator-1",
          justification:
            "Operator self-approved — this four-eyes violation must be rejected",
          resolution_at: T0 + HOUR,
        }),
      ).toThrow(/four-eyes/);
    });

    it("rejects too-short justification text", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      expect(() =>
        engine.justify({
          deviation_id: e.id,
          approver: "lead-engineer",
          justification: "short text",
          resolution_at: T0 + HOUR,
        }),
      ).toThrow(/at least 40/);
    });

    it("rejects justification for already-approved deviation", () => {
      const e = engine.record(baseRecord({ severity: "major" })); // approved
      expect(() =>
        engine.justify({
          deviation_id: e.id,
          approver: "lead-engineer",
          justification:
            "Attempting to justify an already-approved deviation should fail",
          resolution_at: T0 + HOUR,
        }),
      ).toThrow(/not awaiting justification/);
    });

    it("allows justification of unjustified_overdue deviations (late save)", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      engine.sweepOverdue(T0 + 25 * HOUR);
      const j = engine.justify({
        deviation_id: e.id,
        approver: "lead-engineer",
        justification:
          "Post-incident review confirmed the substitution was within engineering authority",
        resolution_at: T0 + 30 * HOUR,
      });
      expect(j.state).toBe("justified");
    });

    it("rejects resolution_at preceding occurred_at", () => {
      const e = engine.record(
        baseRecord({ severity: "critical", occurred_at: T0 + 100 }),
      );
      expect(() =>
        engine.justify({
          deviation_id: e.id,
          approver: "lead-engineer",
          justification:
            "Resolution timestamp that precedes the event is logically impossible",
          resolution_at: T0 + 50,
        }),
      ).toThrow(/cannot precede/);
    });
  });

  describe("reject", () => {
    it("rejects a pending critical deviation", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      const r = engine.reject({
        deviation_id: e.id,
        approver: "lead-engineer",
        rejection_reason: "substitution is outside approved tool list",
        resolution_at: T0 + HOUR,
      });
      expect(r.state).toBe("rejected");
      expect(r.rejection_reason).toMatch(/outside approved/);
    });

    it("rejects too-short rejection reason", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      expect(() =>
        engine.reject({
          deviation_id: e.id,
          approver: "lead-engineer",
          rejection_reason: "too brief",
          resolution_at: T0 + HOUR,
        }),
      ).toThrow(/at least 30/);
    });

    it("rejects four-eyes violation", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      expect(() =>
        engine.reject({
          deviation_id: e.id,
          approver: "operator-1",
          rejection_reason:
            "operator cannot self-reject — this must fail four-eyes",
          resolution_at: T0 + HOUR,
        }),
      ).toThrow(/four-eyes/);
    });

    it("rejects a deviation not in pending state", () => {
      const e = engine.record(baseRecord({ severity: "major" }));
      expect(() =>
        engine.reject({
          deviation_id: e.id,
          approver: "lead-engineer",
          rejection_reason:
            "cannot reject an already-approved deviation after the fact",
          resolution_at: T0 + HOUR,
        }),
      ).toThrow(/not awaiting review/);
    });
  });

  describe("sweepOverdue", () => {
    it("marks critical pending deviations overdue past 24h", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      const swept = engine.sweepOverdue(T0 + 25 * HOUR);
      expect(swept).toHaveLength(1);
      expect(swept[0]?.id).toBe(e.id);
      expect(engine.getEntry(e.id)?.state).toBe("unjustified_overdue");
    });

    it("does not mark overdue before the 24h window expires", () => {
      engine.record(baseRecord({ severity: "critical" }));
      expect(engine.sweepOverdue(T0 + 23 * HOUR)).toHaveLength(0);
    });

    it("leaves approved/justified/rejected deviations alone", () => {
      engine.record(baseRecord({ severity: "major" })); // approved
      const e = engine.record(baseRecord({ severity: "critical", occurred_at: T0 + 1 }));
      engine.justify({
        deviation_id: e.id,
        approver: "lead",
        justification:
          "post-hoc justification explaining why the critical was necessary",
        resolution_at: T0 + 2,
      });
      expect(engine.sweepOverdue(T0 + 1000 * HOUR)).toHaveLength(0);
    });

    it("is idempotent (second sweep yields nothing)", () => {
      engine.record(baseRecord({ severity: "critical" }));
      const s1 = engine.sweepOverdue(T0 + 25 * HOUR);
      const s2 = engine.sweepOverdue(T0 + 26 * HOUR);
      expect(s1).toHaveLength(1);
      expect(s2).toHaveLength(0);
    });
  });

  describe("promotionReadiness", () => {
    it("returns ready when no deviations exist", () => {
      const v = engine.promotionReadiness("PILOT-A", T0);
      expect(v.ready).toBe(true);
      expect(v.reasons).toHaveLength(0);
    });

    it("blocks on unjustified_overdue critical", () => {
      engine.record(baseRecord({ severity: "critical" }));
      const v = engine.promotionReadiness("PILOT-A", T0 + 25 * HOUR);
      expect(v.ready).toBe(false);
      expect(v.overdue_critical).toBe(1);
      expect(v.reasons.some((r) => /overdue/.test(r))).toBe(true);
    });

    it("blocks on any rejected critical deviation", () => {
      const e = engine.record(baseRecord({ severity: "critical" }));
      engine.reject({
        deviation_id: e.id,
        approver: "lead-engineer",
        rejection_reason:
          "rejected because the tool substitution was outside the approved list",
        resolution_at: T0 + HOUR,
      });
      const v = engine.promotionReadiness("PILOT-A", T0 + HOUR);
      expect(v.ready).toBe(false);
      expect(v.rejected_critical).toBe(1);
    });

    it("blocks when major count exceeds threshold", () => {
      engine.configure({ max_majors: 2 });
      for (let i = 0; i < 3; i++) {
        engine.record(
          baseRecord({
            severity: "major",
            occurred_at: T0 + i,
            recorded_at: T0 + i,
          }),
        );
      }
      const v = engine.promotionReadiness("PILOT-A", T0 + 10);
      expect(v.ready).toBe(false);
      expect(v.major_count).toBe(3);
      expect(v.reasons.some((r) => /major deviation count/.test(r))).toBe(
        true,
      );
    });

    it("ignores minor deviations entirely for promotion", () => {
      for (let i = 0; i < 20; i++) {
        engine.record(
          baseRecord({ occurred_at: T0 + i, recorded_at: T0 + i }),
        );
      }
      expect(engine.promotionReadiness("PILOT-A", T0 + 100).ready).toBe(true);
    });

    it("blocks while critical deviations remain pending_justification", () => {
      engine.record(baseRecord({ severity: "critical" }));
      const v = engine.promotionReadiness("PILOT-A", T0 + HOUR);
      expect(v.ready).toBe(false);
      expect(v.pending_justification).toBe(1);
    });

    it("filters by pilot_id", () => {
      engine.record(baseRecord({ pilot_id: "P1", severity: "critical" }));
      const v = engine.promotionReadiness("P2", T0 + 25 * HOUR);
      expect(v.ready).toBe(true);
    });
  });

  describe("stats", () => {
    it("aggregates counts across all dimensions", () => {
      engine.record(baseRecord({ kind: "tool_substitution" }));
      engine.record(
        baseRecord({
          kind: "feed_override",
          severity: "major",
          occurred_at: T0 + 1,
          recorded_at: T0 + 1,
        }),
      );
      const e3 = engine.record(
        baseRecord({
          kind: "fixture_change",
          severity: "critical",
          occurred_at: T0 + 2,
          recorded_at: T0 + 2,
        }),
      );
      engine.justify({
        deviation_id: e3.id,
        approver: "lead",
        justification:
          "fixture adjusted within approved tolerance to correct part drift",
        resolution_at: T0 + HOUR,
      });

      const s = engine.stats();
      expect(s.total).toBe(3);
      expect(s.by_kind.tool_substitution).toBe(1);
      expect(s.by_kind.feed_override).toBe(1);
      expect(s.by_kind.fixture_change).toBe(1);
      expect(s.by_severity.minor).toBe(1);
      expect(s.by_severity.major).toBe(1);
      expect(s.by_severity.critical).toBe(1);
      expect(s.by_state.approved).toBe(2);
      expect(s.by_state.justified).toBe(1);
    });

    it("filters stats by pilot_id", () => {
      engine.record(baseRecord({ pilot_id: "P1" }));
      engine.record(baseRecord({ pilot_id: "P2" }));
      expect(engine.stats("P1").total).toBe(1);
      expect(engine.stats("P2").total).toBe(1);
    });
  });

  describe("snapshot", () => {
    it("captures schemaVersion + entries + last_seq + max_majors", () => {
      engine.configure({ max_majors: 5 });
      engine.record(baseRecord({ pilot_id: "P1" }));
      engine.record(baseRecord({ pilot_id: "P1", occurred_at: T0 + 1 }));
      engine.record(baseRecord({ pilot_id: "P2" }));
      const s = engine.snapshot();
      expect(s.schemaVersion).toBe(1);
      expect(s.entries).toHaveLength(3);
      expect(s.last_seq_by_pilot["P1"]).toBe(2);
      expect(s.last_seq_by_pilot["P2"]).toBe(1);
      expect(s.max_majors).toBe(5);
    });

    it("is defensively copied", () => {
      const e = engine.record(baseRecord());
      const s = engine.snapshot();
      (s.entries[0] as DeviationEntryMut).reason = "tampered text";
      expect(engine.getEntry(e.id)?.reason).toMatch(/backup insert/);
    });

    it("criticalJustificationWindowMs exposes 24h", () => {
      expect(
        WetRunDeviationRegistryEngine.criticalJustificationWindowMs(),
      ).toBe(24 * HOUR);
    });
  });

  describe("configure", () => {
    it("rejects negative max_majors", () => {
      expect(() => engine.configure({ max_majors: -1 })).toThrow(
        /non-negative integer/,
      );
    });
    it("rejects non-integer max_majors", () => {
      expect(() => engine.configure({ max_majors: 2.5 })).toThrow(
        /non-negative integer/,
      );
    });
    it("exposes the configured value", () => {
      engine.configure({ max_majors: 7 });
      expect(engine.maxMajorsConfigured()).toBe(7);
    });
  });
});

// Narrow helper type for mutation-test scenarios
type DeviationEntryMut = {
  reason: string;
};
