/**
 * WetRunChangeFreezeEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-CHANGE-FREEZE
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunChangeFreezeEngine,
  type WindowInput,
} from "../../engines/WetRunChangeFreezeEngine.js";

const T0 = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function baseWindow(overrides: Partial<WindowInput> = {}): WindowInput {
  return {
    id: "FRZ-Q1",
    name: "Q1 Close Freeze",
    kind: "quarter_end",
    start_ts: T0 + DAY,
    end_ts: T0 + 3 * DAY,
    declared_by: "ops-manager",
    approved_by: "director",
    reason:
      "quarter-end financial close requires no production-affecting changes",
    declared_at: T0,
    ...overrides,
  };
}

describe("WetRunChangeFreezeEngine", () => {
  let engine: WetRunChangeFreezeEngine;
  beforeEach(() => {
    engine = new WetRunChangeFreezeEngine();
  });

  describe("declareWindow", () => {
    it("schedules a future window in 'scheduled' state", () => {
      const w = engine.declareWindow(baseWindow());
      expect(w.state).toBe("scheduled");
      expect(w.kind).toBe("quarter_end");
    });

    it("marks current-time windows active immediately", () => {
      const w = engine.declareWindow(
        baseWindow({
          start_ts: T0,
          end_ts: T0 + DAY,
          declared_at: T0 + 60_000,
        }),
      );
      expect(w.state).toBe("active");
    });

    it("rejects four-eyes violation", () => {
      expect(() =>
        engine.declareWindow(
          baseWindow({ approved_by: "ops-manager" }),
        ),
      ).toThrow(/four-eyes/);
    });

    it("rejects reason shorter than 40 chars", () => {
      expect(() =>
        engine.declareWindow(baseWindow({ reason: "short" })),
      ).toThrow(/at least 40/);
    });

    it("rejects end_ts <= start_ts", () => {
      expect(() =>
        engine.declareWindow(baseWindow({ end_ts: T0 + DAY })),
      ).toThrow(/strictly greater/);
    });

    it("rejects duplicate window id", () => {
      engine.declareWindow(baseWindow());
      expect(() =>
        engine.declareWindow(
          baseWindow({
            start_ts: T0 + 10 * DAY,
            end_ts: T0 + 12 * DAY,
          }),
        ),
      ).toThrow(/duplicate window id/);
    });

    it("rejects overlapping non-emergency windows", () => {
      engine.declareWindow(baseWindow());
      expect(() =>
        engine.declareWindow(
          baseWindow({
            id: "AUDIT-1",
            kind: "audit",
            name: "ISO audit",
            start_ts: T0 + 2 * DAY, // overlaps Q1 freeze
            end_ts: T0 + 4 * DAY,
          }),
        ),
      ).toThrow(/overlaps/);
    });

    it("accepts adjacent (non-overlapping) windows", () => {
      engine.declareWindow(baseWindow());
      const w2 = engine.declareWindow(
        baseWindow({
          id: "AUDIT-1",
          kind: "audit",
          name: "ISO audit",
          start_ts: T0 + 3 * DAY, // starts exactly when Q1 ends
          end_ts: T0 + 4 * DAY,
        }),
      );
      expect(w2.id).toBe("AUDIT-1");
    });

    it("allows emergency windows to overlap existing ones", () => {
      engine.declareWindow(baseWindow());
      const emergency = engine.declareWindow(
        baseWindow({
          id: "EMG-1",
          kind: "emergency",
          name: "Tool-crash incident",
          start_ts: T0 + 2 * DAY,
          end_ts: T0 + 2 * DAY + HOUR,
          reason: "emergency lockdown after uncontrolled axis incident",
          declared_at: T0 + DAY + HOUR,
        }),
      );
      expect(emergency.kind).toBe("emergency");
    });

    it("rejects invalid kind", () => {
      expect(() =>
        engine.declareWindow(
          baseWindow({
            kind: "spiritual" as unknown as WindowInput["kind"],
          }),
        ),
      ).toThrow(/invalid freeze kind/);
    });
  });

  describe("closeWindow", () => {
    it("closes an active window early with a reason", () => {
      const w = engine.declareWindow(baseWindow());
      const closed = engine.closeWindow({
        window_id: w.id,
        closed_at: T0 + DAY + HOUR,
        closed_by: "ops-manager",
        reason:
          "audit finished early, resuming normal production change cadence",
      });
      expect(closed.state).toBe("closed");
      expect(closed.end_ts).toBeLessThanOrEqual(T0 + DAY + HOUR);
    });

    it("rejects double close", () => {
      const w = engine.declareWindow(baseWindow());
      engine.closeWindow({
        window_id: w.id,
        closed_at: T0 + DAY + HOUR,
        closed_by: "ops-manager",
        reason:
          "audit finished early, resuming normal production change cadence",
      });
      expect(() =>
        engine.closeWindow({
          window_id: w.id,
          closed_at: T0 + DAY + 2 * HOUR,
          closed_by: "ops-manager",
          reason:
            "second closure attempt that should fail because already closed",
        }),
      ).toThrow(/already closed/);
    });

    it("rejects closed_at before start_ts", () => {
      const w = engine.declareWindow(baseWindow());
      expect(() =>
        engine.closeWindow({
          window_id: w.id,
          closed_at: T0 + HOUR,
          closed_by: "ops-manager",
          reason:
            "closing a window before it starts is a logical impossibility",
        }),
      ).toThrow(/cannot precede start_ts/);
    });

    it("rejects short closure reason", () => {
      const w = engine.declareWindow(baseWindow());
      expect(() =>
        engine.closeWindow({
          window_id: w.id,
          closed_at: T0 + DAY + HOUR,
          closed_by: "ops-manager",
          reason: "fin",
        }),
      ).toThrow(/at least 40/);
    });
  });

  describe("cancelWindow", () => {
    it("cancels a scheduled window", () => {
      const w = engine.declareWindow(baseWindow());
      const cancelled = engine.cancelWindow({
        window_id: w.id,
        cancelled_at: T0 + HOUR,
        cancelled_by: "ops-manager",
        approver: "director",
        reason: "rescheduled to next quarter per management decision record",
      });
      expect(cancelled.state).toBe("cancelled");
    });

    it("rejects cancelling an active window", () => {
      const w = engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + DAY, declared_at: T0 + 1 }),
      );
      expect(() =>
        engine.cancelWindow({
          window_id: w.id,
          cancelled_at: T0 + HOUR,
          cancelled_by: "ops-manager",
          approver: "director",
          reason: "cannot cancel an already-active window without close path",
        }),
      ).toThrow(/only scheduled/);
    });

    it("rejects four-eyes violation on cancel", () => {
      const w = engine.declareWindow(baseWindow());
      expect(() =>
        engine.cancelWindow({
          window_id: w.id,
          cancelled_at: T0 + HOUR,
          cancelled_by: "ops-manager",
          approver: "ops-manager",
          reason: "self-approved cancellation violates four-eyes principle",
        }),
      ).toThrow(/four-eyes/);
    });
  });

  describe("grantOverride", () => {
    it("grants a scoped override inside a window", () => {
      const w = engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + 2 * DAY, declared_at: T0 }),
      );
      const o = engine.grantOverride({
        window_id: w.id,
        change_kinds: ["wet_run_authorization", "program_release"],
        granted_by: "director",
        granted_to: "engineering-manager",
        expires_at: T0 + DAY,
        reason:
          "critical customer-visible issue requires targeted wet-run authorization during freeze window per executive approval",
        granted_at: T0 + HOUR,
      });
      expect(o.change_kinds).toEqual([
        "wet_run_authorization",
        "program_release",
      ]);
    });

    it("rejects override extending past window end", () => {
      const w = engine.declareWindow(baseWindow());
      expect(() =>
        engine.grantOverride({
          window_id: w.id,
          change_kinds: ["wet_run_authorization"],
          granted_by: "director",
          granted_to: "engineering-manager",
          expires_at: T0 + 10 * DAY, // past window end (3d)
          reason:
            "override expiration extending past window end would outlast the freeze itself",
          granted_at: T0 + HOUR,
        }),
      ).toThrow(/extends past window end/);
    });

    it("rejects four-eyes violation on override", () => {
      const w = engine.declareWindow(baseWindow());
      expect(() =>
        engine.grantOverride({
          window_id: w.id,
          change_kinds: ["wet_run_authorization"],
          granted_by: "director",
          granted_to: "director",
          expires_at: T0 + 2 * DAY,
          reason:
            "director cannot self-grant override — four-eyes must split grantor and grantee",
          granted_at: T0 + HOUR,
        }),
      ).toThrow(/four-eyes/);
    });

    it("rejects empty change_kinds", () => {
      const w = engine.declareWindow(baseWindow());
      expect(() =>
        engine.grantOverride({
          window_id: w.id,
          change_kinds: [],
          granted_by: "director",
          granted_to: "engineering-manager",
          expires_at: T0 + 2 * DAY,
          reason:
            "override with empty scope is meaningless and must be rejected",
          granted_at: T0 + HOUR,
        }),
      ).toThrow(/non-empty array/);
    });

    it("rejects duplicate change_kinds", () => {
      const w = engine.declareWindow(baseWindow());
      expect(() =>
        engine.grantOverride({
          window_id: w.id,
          change_kinds: ["deviation", "deviation"],
          granted_by: "director",
          granted_to: "engineering-manager",
          expires_at: T0 + 2 * DAY,
          reason:
            "duplicate change_kinds suggest an authoring mistake and are rejected",
          granted_at: T0 + HOUR,
        }),
      ).toThrow(/duplicate change_kind/);
    });

    it("rejects override reason shorter than 60 chars", () => {
      const w = engine.declareWindow(baseWindow());
      expect(() =>
        engine.grantOverride({
          window_id: w.id,
          change_kinds: ["wet_run_authorization"],
          granted_by: "director",
          granted_to: "engineering-manager",
          expires_at: T0 + 2 * DAY,
          reason: "too brief for an override reason",
          granted_at: T0 + HOUR,
        }),
      ).toThrow(/at least 60/);
    });

    it("rejects grant on closed or cancelled window", () => {
      const w = engine.declareWindow(baseWindow());
      engine.cancelWindow({
        window_id: w.id,
        cancelled_at: T0 + HOUR,
        cancelled_by: "ops-manager",
        approver: "director",
        reason: "rescheduled to later in the quarter per management decision",
      });
      expect(() =>
        engine.grantOverride({
          window_id: w.id,
          change_kinds: ["wet_run_authorization"],
          granted_by: "director",
          granted_to: "engineering-manager",
          expires_at: T0 + 2 * DAY,
          reason:
            "granting an override on a cancelled window is nonsensical and must fail",
          granted_at: T0 + 2 * HOUR,
        }),
      ).toThrow(/cancelled window/);
    });
  });

  describe("revokeOverride + sweepExpiredOverrides", () => {
    beforeEach(() => {
      engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + 2 * DAY, declared_at: T0 }),
      );
    });

    it("revokes an override manually", () => {
      const o = engine.grantOverride({
        window_id: "FRZ-Q1",
        change_kinds: ["deviation"],
        granted_by: "director",
        granted_to: "engineering-manager",
        expires_at: T0 + DAY,
        reason:
          "temporary deviation window for emergency customer issue per exec approval",
        granted_at: T0 + HOUR,
      });
      const r = engine.revokeOverride({
        override_id: o.override_id,
        revoked_at: T0 + 2 * HOUR,
        revoked_by: "director",
        reason: "emergency resolved, returning to freeze posture immediately",
      });
      expect(r.revoked).toBe(true);
    });

    it("sweepExpiredOverrides flips expired overrides to revoked", () => {
      const o = engine.grantOverride({
        window_id: "FRZ-Q1",
        change_kinds: ["deviation"],
        granted_by: "director",
        granted_to: "engineering-manager",
        expires_at: T0 + HOUR,
        reason:
          "short-window override for immediate incident response authorized by exec",
        granted_at: T0,
      });
      const swept = engine.sweepExpiredOverrides(T0 + 2 * HOUR);
      expect(swept).toHaveLength(1);
      expect(swept[0]?.override_id).toBe(o.override_id);
      expect(engine.getOverride(o.override_id)?.revoked).toBe(true);
      expect(engine.getOverride(o.override_id)?.revocation_reason).toBe(
        "auto-expired",
      );
    });

    it("sweepExpiredOverrides is idempotent", () => {
      engine.grantOverride({
        window_id: "FRZ-Q1",
        change_kinds: ["deviation"],
        granted_by: "director",
        granted_to: "engineering-manager",
        expires_at: T0 + HOUR,
        reason:
          "short-window override for immediate incident response authorized by exec",
        granted_at: T0,
      });
      engine.sweepExpiredOverrides(T0 + 2 * HOUR);
      expect(engine.sweepExpiredOverrides(T0 + 3 * HOUR)).toHaveLength(0);
    });
  });

  describe("checkAt", () => {
    it("allows changes when no window is active", () => {
      engine.declareWindow(baseWindow()); // starts at T0+DAY
      const r = engine.checkAt(T0 + HOUR, "wet_run_authorization");
      expect(r.allowed).toBe(true);
      expect(r.reason).toMatch(/no active freeze window/);
    });

    it("blocks changes when inside an active freeze window", () => {
      engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + DAY, declared_at: T0 }),
      );
      const r = engine.checkAt(T0 + HOUR, "wet_run_authorization");
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/blocks wet_run_authorization/);
      expect(r.active_window_id).toBe("FRZ-Q1");
    });

    it("allows with override that covers the change_kind", () => {
      engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + 2 * DAY, declared_at: T0 }),
      );
      const o = engine.grantOverride({
        window_id: "FRZ-Q1",
        change_kinds: ["wet_run_authorization"],
        granted_by: "director",
        granted_to: "engineering-manager",
        expires_at: T0 + DAY,
        reason:
          "critical wet-run needs authorization during freeze per exec approval, scoped narrowly",
        granted_at: T0,
      });
      const r = engine.checkAt(T0 + HOUR, "wet_run_authorization");
      expect(r.allowed).toBe(true);
      expect(r.override_id).toBe(o.override_id);
    });

    it("blocks change_kind not covered by the override", () => {
      engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + 2 * DAY, declared_at: T0 }),
      );
      engine.grantOverride({
        window_id: "FRZ-Q1",
        change_kinds: ["wet_run_authorization"],
        granted_by: "director",
        granted_to: "engineering-manager",
        expires_at: T0 + DAY,
        reason:
          "critical wet-run needs authorization during freeze per exec approval, scoped narrowly",
        granted_at: T0,
      });
      const r = engine.checkAt(T0 + HOUR, "program_release");
      expect(r.allowed).toBe(false);
    });

    it("blocks when override has expired", () => {
      engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + 2 * DAY, declared_at: T0 }),
      );
      engine.grantOverride({
        window_id: "FRZ-Q1",
        change_kinds: ["wet_run_authorization"],
        granted_by: "director",
        granted_to: "engineering-manager",
        expires_at: T0 + HOUR,
        reason:
          "short-window override for immediate incident response authorized by exec",
        granted_at: T0,
      });
      const r = engine.checkAt(T0 + 2 * HOUR, "wet_run_authorization");
      expect(r.allowed).toBe(false);
    });

    it("requires overrides for BOTH when emergency stacks on top", () => {
      engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + 2 * DAY, declared_at: T0 }),
      );
      engine.declareWindow(
        baseWindow({
          id: "EMG",
          kind: "emergency",
          name: "tool crash",
          start_ts: T0 + HOUR,
          end_ts: T0 + 3 * HOUR,
          reason: "emergency lockdown after axis runaway in pilot machine",
          declared_at: T0 + HOUR,
        }),
      );
      engine.grantOverride({
        window_id: "FRZ-Q1",
        change_kinds: ["wet_run_authorization"],
        granted_by: "director",
        granted_to: "engineering-manager",
        expires_at: T0 + DAY,
        reason:
          "override on Q1 freeze only — emergency still blocks wet-run authorization",
        granted_at: T0,
      });
      const r = engine.checkAt(T0 + 2 * HOUR, "wet_run_authorization");
      expect(r.allowed).toBe(false);
      expect(r.active_window_id).toBe("EMG");
    });
  });

  describe("readers + snapshot", () => {
    it("getWindow returns defensive copy", () => {
      const w = engine.declareWindow(baseWindow());
      const got = engine.getWindow(w.id);
      expect(got?.id).toBe(w.id);
    });

    it("getWindow returns undefined for unknown id", () => {
      expect(engine.getWindow("missing")).toBeUndefined();
    });

    it("listActive returns only currently-active windows", () => {
      engine.declareWindow(
        baseWindow({ start_ts: T0, end_ts: T0 + DAY, declared_at: T0 }),
      );
      engine.declareWindow(
        baseWindow({
          id: "AUD",
          kind: "audit",
          name: "ISO audit next week",
          start_ts: T0 + 7 * DAY,
          end_ts: T0 + 8 * DAY,
        }),
      );
      expect(engine.listActive(T0 + HOUR).map((w) => w.id)).toEqual(["FRZ-Q1"]);
    });

    it("snapshot captures schemaVersion + windows + overrides", () => {
      engine.declareWindow(baseWindow());
      const snap = engine.snapshot();
      expect(snap.schemaVersion).toBe(1);
      expect(snap.windows).toHaveLength(1);
      expect(snap.overrides).toHaveLength(0);
    });

    it("snapshot is defensively copied", () => {
      const w = engine.declareWindow(baseWindow());
      const snap = engine.snapshot();
      snap.windows[0]!.name = "HACKED";
      expect(engine.getWindow(w.id)?.name).toBe("Q1 Close Freeze");
    });
  });
});
