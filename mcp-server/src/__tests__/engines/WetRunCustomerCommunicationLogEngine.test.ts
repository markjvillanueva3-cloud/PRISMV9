/**
 * WetRunCustomerCommunicationLogEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-CUST-COMMS
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunCustomerCommunicationLogEngine,
  type RecordInput,
  type TopicKind,
} from "../../engines/WetRunCustomerCommunicationLogEngine.js";

const T0 = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function baseInput(overrides: Partial<RecordInput> = {}): RecordInput {
  return {
    pilot_id: "PILOT-A",
    ts: T0,
    direction: "outbound",
    channel: "email",
    topic: "general",
    author: "alice@shop",
    recipients: ["buyer@customer"],
    summary:
      "Kickoff notes shared including machine assignment and schedule window.",
    ...overrides,
  };
}

describe("WetRunCustomerCommunicationLogEngine", () => {
  let engine: WetRunCustomerCommunicationLogEngine;
  beforeEach(() => {
    engine = new WetRunCustomerCommunicationLogEngine();
  });

  describe("record", () => {
    it("assigns a monotonic sequence starting at 1 for a new pilot", () => {
      const a = engine.record(baseInput({ ts: T0 }));
      const b = engine.record(baseInput({ ts: T0 + 1 }));
      expect(a.seq).toBe(1);
      expect(b.seq).toBe(2);
      expect(a.id).toBe("comms:PILOT-A:000001");
      expect(b.id).toBe("comms:PILOT-A:000002");
    });

    it("keeps sequences independent per pilot", () => {
      engine.record(baseInput({ pilot_id: "PILOT-A", ts: T0 }));
      const b = engine.record(baseInput({ pilot_id: "PILOT-B", ts: T0 }));
      expect(b.seq).toBe(1);
      expect(b.id).toBe("comms:PILOT-B:000001");
    });

    it("rejects non-monotonic timestamp within the same pilot", () => {
      engine.record(baseInput({ ts: T0 + 10 }));
      expect(() => engine.record(baseInput({ ts: T0 + 5 }))).toThrow(
        /not strictly monotonic/,
      );
    });

    it("rejects duplicate timestamp within the same pilot", () => {
      engine.record(baseInput({ ts: T0 }));
      expect(() => engine.record(baseInput({ ts: T0 }))).toThrow(
        /not strictly monotonic/,
      );
    });

    it("rejects summary shorter than 40 characters", () => {
      expect(() =>
        engine.record(baseInput({ summary: "too short to be useful" })),
      ).toThrow(/summary must be at least 40/);
    });

    it("rejects empty recipients", () => {
      expect(() => engine.record(baseInput({ recipients: [] }))).toThrow(
        /non-empty array/,
      );
    });

    it("rejects duplicate recipients (case-insensitive)", () => {
      expect(() =>
        engine.record(
          baseInput({
            recipients: ["Buyer@Customer.com", "buyer@customer.com"],
          }),
        ),
      ).toThrow(/duplicate recipient/);
    });

    it("rejects invalid channel", () => {
      expect(() =>
        engine.record(
          baseInput({ channel: "slack" as unknown as RecordInput["channel"] }),
        ),
      ).toThrow(/invalid channel/);
    });

    it("rejects invalid topic", () => {
      expect(() =>
        engine.record(
          baseInput({ topic: "gossip" as unknown as TopicKind }),
        ),
      ).toThrow(/invalid topic/);
    });

    it("rejects non-finite timestamp", () => {
      expect(() => engine.record(baseInput({ ts: Number.NaN }))).toThrow(
        /finite/,
      );
    });

    it("returns a defensive copy of recipients", () => {
      const recipients = ["a@c", "b@c"];
      const entry = engine.record(baseInput({ recipients }));
      entry.recipients.push("c@c");
      const fetched = engine.getEntry(entry.id);
      expect(fetched?.recipients).toEqual(["a@c", "b@c"]);
    });
  });

  describe("acknowledge", () => {
    it("marks an outbound entry acknowledged", () => {
      const e = engine.record(
        baseInput({ topic: "sev1_incident", ts: T0 }),
      );
      const ack = engine.acknowledge({
        entry_id: e.id,
        ack_ts: T0 + HOUR,
        acknowledged_by: "CustomerBuyer",
      });
      expect(ack.state).toBe("acknowledged");
      expect(ack.acknowledgment?.acknowledged_by).toBe("CustomerBuyer");
      expect(ack.acknowledgment?.ack_ts).toBe(T0 + HOUR);
    });

    it("rejects acknowledging an inbound entry", () => {
      const e = engine.record(baseInput({ direction: "inbound" }));
      expect(() =>
        engine.acknowledge({
          entry_id: e.id,
          ack_ts: T0 + 1,
          acknowledged_by: "buyer",
        }),
      ).toThrow(/only outbound/);
    });

    it("rejects acknowledgment with ts prior to entry ts", () => {
      const e = engine.record(baseInput({ ts: T0 + 10 }));
      expect(() =>
        engine.acknowledge({
          entry_id: e.id,
          ack_ts: T0 + 5,
          acknowledged_by: "buyer",
        }),
      ).toThrow(/cannot precede entry/);
    });

    it("rejects double acknowledgment", () => {
      const e = engine.record(baseInput());
      engine.acknowledge({
        entry_id: e.id,
        ack_ts: T0 + 1,
        acknowledged_by: "buyer",
      });
      expect(() =>
        engine.acknowledge({
          entry_id: e.id,
          ack_ts: T0 + 2,
          acknowledged_by: "buyer2",
        }),
      ).toThrow(/already acknowledged/);
    });

    it("rejects acknowledgment of a closed entry", () => {
      const e = engine.record(baseInput());
      engine.close({
        entry_id: e.id,
        closed_at: T0 + 1,
        closed_by: "alice",
        reason: "superseded by follow-up thread",
      });
      expect(() =>
        engine.acknowledge({
          entry_id: e.id,
          ack_ts: T0 + 2,
          acknowledged_by: "buyer",
        }),
      ).toThrow(/already closed/);
    });

    it("rejects acknowledged_by shorter than minimum", () => {
      const e = engine.record(baseInput());
      expect(() =>
        engine.acknowledge({
          entry_id: e.id,
          ack_ts: T0 + 1,
          acknowledged_by: "a",
        }),
      ).toThrow(/at least 2/);
    });

    it("rejects unknown entry id", () => {
      expect(() =>
        engine.acknowledge({
          entry_id: "comms:missing:000001",
          ack_ts: T0,
          acknowledged_by: "buyer",
        }),
      ).toThrow(/entry not found/);
    });
  });

  describe("close", () => {
    it("closes an entry with a reason and named closer", () => {
      const e = engine.record(baseInput());
      const closed = engine.close({
        entry_id: e.id,
        closed_at: T0 + 1,
        closed_by: "alice",
        reason: "topic superseded by subsequent email",
      });
      expect(closed.state).toBe("closed");
      expect(closed.closure_reason).toBe(
        "topic superseded by subsequent email",
      );
    });

    it("rejects closure reason shorter than 20 characters", () => {
      const e = engine.record(baseInput());
      expect(() =>
        engine.close({
          entry_id: e.id,
          closed_at: T0 + 1,
          closed_by: "alice",
          reason: "dupe",
        }),
      ).toThrow(/at least 20/);
    });

    it("rejects closed_at before entry ts", () => {
      const e = engine.record(baseInput({ ts: T0 + 100 }));
      expect(() =>
        engine.close({
          entry_id: e.id,
          closed_at: T0 + 50,
          closed_by: "alice",
          reason: "closing out stale communication record",
        }),
      ).toThrow(/cannot precede entry/);
    });

    it("rejects double close", () => {
      const e = engine.record(baseInput());
      engine.close({
        entry_id: e.id,
        closed_at: T0 + 1,
        closed_by: "alice",
        reason: "closing out as duplicate thread entry",
      });
      expect(() =>
        engine.close({
          entry_id: e.id,
          closed_at: T0 + 2,
          closed_by: "alice",
          reason: "attempting a second close for audit purposes",
        }),
      ).toThrow(/already closed/);
    });

    it("rejects closed_by shorter than 2 characters", () => {
      const e = engine.record(baseInput());
      expect(() =>
        engine.close({
          entry_id: e.id,
          closed_at: T0 + 1,
          closed_by: "x",
          reason: "closing after topic resolved externally in meeting",
        }),
      ).toThrow(/named human/);
    });
  });

  describe("listBreached", () => {
    it("reports outbound sev1 entries unacknowledged past 24h", () => {
      const e = engine.record(
        baseInput({ topic: "sev1_incident", ts: T0 }),
      );
      const now = T0 + 25 * HOUR;
      const breaches = engine.listBreached(now);
      expect(breaches).toHaveLength(1);
      expect(breaches[0]?.entry_id).toBe(e.id);
      expect(breaches[0]?.hours_over_sla).toBeCloseTo(1, 2);
    });

    it("does not report inbound entries", () => {
      engine.record(baseInput({ topic: "sev1_incident", direction: "inbound" }));
      expect(engine.listBreached(T0 + 48 * HOUR)).toHaveLength(0);
    });

    it("does not report acknowledged entries", () => {
      const e = engine.record(baseInput({ topic: "sev1_incident", ts: T0 }));
      engine.acknowledge({
        entry_id: e.id,
        ack_ts: T0 + 12 * HOUR,
        acknowledged_by: "buyer",
      });
      expect(engine.listBreached(T0 + 48 * HOUR)).toHaveLength(0);
    });

    it("does not report closed entries", () => {
      const e = engine.record(baseInput({ topic: "sev1_incident", ts: T0 }));
      engine.close({
        entry_id: e.id,
        closed_at: T0 + HOUR,
        closed_by: "alice",
        reason: "customer confirmed verbally in follow-up call",
      });
      expect(engine.listBreached(T0 + 48 * HOUR)).toHaveLength(0);
    });

    it("never reports topics with no SLA (general)", () => {
      engine.record(baseInput({ topic: "general", ts: T0 }));
      expect(engine.listBreached(T0 + 365 * DAY)).toHaveLength(0);
    });

    it("respects per-topic SLA windows", () => {
      const e1 = engine.record(
        baseInput({ topic: "quality_issue", ts: T0, pilot_id: "P1" }),
      );
      const e2 = engine.record(
        baseInput({ topic: "schedule_slip", ts: T0, pilot_id: "P2" }),
      );
      // At T0+49h: quality_issue (48h) is breached, schedule_slip (72h) is not
      const breaches = engine.listBreached(T0 + 49 * HOUR);
      const ids = breaches.map((b) => b.entry_id);
      expect(ids).toContain(e1.id);
      expect(ids).not.toContain(e2.id);
    });

    it("filters by pilot_id when provided", () => {
      engine.record(
        baseInput({ topic: "sev1_incident", ts: T0, pilot_id: "P1" }),
      );
      engine.record(
        baseInput({ topic: "sev1_incident", ts: T0, pilot_id: "P2" }),
      );
      const now = T0 + 48 * HOUR;
      expect(engine.listBreached(now, "P1")).toHaveLength(1);
      expect(engine.listBreached(now, "P2")).toHaveLength(1);
      expect(engine.listBreached(now)).toHaveLength(2);
    });

    it("rejects non-finite nowTs", () => {
      expect(() => engine.listBreached(Number.POSITIVE_INFINITY)).toThrow(
        /finite/,
      );
    });
  });

  describe("summariseByTopic", () => {
    it("aggregates counts across directions and states", () => {
      const e1 = engine.record(
        baseInput({ topic: "sev1_incident", ts: T0 }),
      );
      engine.record(
        baseInput({
          topic: "sev1_incident",
          ts: T0 + 1,
          direction: "inbound",
        }),
      );
      engine.record(baseInput({ topic: "quality_issue", ts: T0 + 2 }));
      engine.acknowledge({
        entry_id: e1.id,
        ack_ts: T0 + 3,
        acknowledged_by: "buyer",
      });

      const summary = engine.summariseByTopic(T0 + 100 * HOUR);
      const sev1 = summary.find((s) => s.topic === "sev1_incident");
      const qi = summary.find((s) => s.topic === "quality_issue");
      expect(sev1?.total).toBe(2);
      expect(sev1?.outbound).toBe(1);
      expect(sev1?.inbound).toBe(1);
      expect(sev1?.acknowledged).toBe(1);
      expect(sev1?.open).toBe(1);
      // qi outbound unacknowledged past 48h → breached
      expect(qi?.breached).toBe(1);
    });

    it("returns entries sorted by topic name", () => {
      engine.record(baseInput({ topic: "sev1_incident", ts: T0 }));
      engine.record(baseInput({ topic: "kickoff", ts: T0 + 1 }));
      engine.record(baseInput({ topic: "general", ts: T0 + 2 }));
      const topics = engine.summariseByTopic(T0 + 1000).map((s) => s.topic);
      expect(topics).toEqual(["general", "kickoff", "sev1_incident"]);
    });

    it("filters by pilot_id", () => {
      engine.record(baseInput({ pilot_id: "P1", topic: "general", ts: T0 }));
      engine.record(baseInput({ pilot_id: "P2", topic: "general", ts: T0 }));
      const p1 = engine.summariseByTopic(T0 + 1, "P1");
      expect(p1).toHaveLength(1);
      expect(p1[0]?.total).toBe(1);
    });
  });

  describe("readers + snapshot", () => {
    it("getEntry returns undefined for unknown ids", () => {
      expect(engine.getEntry("comms:nope:000001")).toBeUndefined();
    });

    it("listEntries returns a defensive copy", () => {
      const e = engine.record(baseInput());
      const list = engine.listEntries();
      list[0]!.recipients.push("inject@x");
      const again = engine.getEntry(e.id);
      expect(again?.recipients).toEqual(["buyer@customer"]);
    });

    it("openCount tracks unacknowledged entries", () => {
      const a = engine.record(baseInput({ ts: T0 }));
      engine.record(baseInput({ ts: T0 + 1 }));
      expect(engine.openCount()).toBe(2);
      engine.acknowledge({
        entry_id: a.id,
        ack_ts: T0 + 2,
        acknowledged_by: "buyer",
      });
      expect(engine.openCount()).toBe(1);
    });

    it("breachedCount mirrors listBreached length", () => {
      engine.record(baseInput({ topic: "sev1_incident", ts: T0 }));
      engine.record(baseInput({ topic: "quality_issue", ts: T0 + 1 }));
      const now = T0 + 49 * HOUR;
      expect(engine.breachedCount(now)).toBe(engine.listBreached(now).length);
    });

    it("snapshot captures schemaVersion + last_seq_by_pilot + last_ts_by_pilot", () => {
      engine.record(baseInput({ pilot_id: "P1", ts: T0 }));
      engine.record(baseInput({ pilot_id: "P1", ts: T0 + 1 }));
      engine.record(baseInput({ pilot_id: "P2", ts: T0 + 5 }));
      const snap = engine.snapshot();
      expect(snap.schemaVersion).toBe(1);
      expect(snap.entries).toHaveLength(3);
      expect(snap.last_seq_by_pilot["P1"]).toBe(2);
      expect(snap.last_seq_by_pilot["P2"]).toBe(1);
      expect(snap.last_ts_by_pilot["P1"]).toBe(T0 + 1);
      expect(snap.last_ts_by_pilot["P2"]).toBe(T0 + 5);
    });

    it("snapshot is defensively copied", () => {
      const e = engine.record(baseInput());
      const snap = engine.snapshot();
      snap.entries[0]!.recipients.push("inject@x");
      const again = engine.getEntry(e.id);
      expect(again?.recipients).toEqual(["buyer@customer"]);
    });

    it("slaWindowMs exposes configured windows", () => {
      expect(
        WetRunCustomerCommunicationLogEngine.slaWindowMs("sev1_incident"),
      ).toBe(24 * HOUR);
      expect(
        WetRunCustomerCommunicationLogEngine.slaWindowMs("general"),
      ).toBeNull();
    });
  });
});
