/**
 * Tests for CorrigibilityGateEngine (Phase 0.25.1 U-SAFE3)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CorrigibilityGateEngine,
  DEFAULT_CORRIGIBILITY_CONFIG,
  corrigibilityGateEngine,
} from "../engines/CorrigibilityGateEngine.js";

const NOW = Date.parse("2026-04-16T12:00:00.000Z");

function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString();
}

describe("CorrigibilityGateEngine", () => {
  let e: CorrigibilityGateEngine;

  beforeEach(() => {
    e = new CorrigibilityGateEngine();
  });

  describe("construction / config", () => {
    it("uses default config", () => {
      expect(DEFAULT_CORRIGIBILITY_CONFIG.heartbeatTimeoutMs).toBeGreaterThan(0);
    });

    it("rejects invalid config", () => {
      expect(() =>
        new CorrigibilityGateEngine({ heartbeatTimeoutMs: 0, requireHumanAckOnKill: true })
      ).toThrow(/heartbeatTimeoutMs/);
      expect(() =>
        new CorrigibilityGateEngine({
          heartbeatTimeoutMs: 1000,
          requireHumanAckOnKill: "yes" as unknown as boolean,
        })
      ).toThrow(/requireHumanAckOnKill/);
    });
  });

  describe("tighten() monotonicity", () => {
    it("accepts tighter heartbeat timeouts", () => {
      e.tighten({ heartbeatTimeoutMs: 60_000 });
      expect(e.snapshot().config.heartbeatTimeoutMs).toBe(60_000);
    });

    it("refuses to loosen heartbeat timeout", () => {
      expect(() => e.tighten({ heartbeatTimeoutMs: DEFAULT_CORRIGIBILITY_CONFIG.heartbeatTimeoutMs + 1 })).toThrow(
        /heartbeatTimeoutMs/
      );
    });

    it("refuses to disable human-ack once enabled", () => {
      expect(() => e.tighten({ requireHumanAckOnKill: false })).toThrow(/requireHumanAckOnKill/);
    });
  });

  describe("kill switch", () => {
    it("blocks evaluation while raised", () => {
      e.heartbeat(iso(0));
      e.raiseKillSwitch(iso(0));
      const d = e.evaluate(NOW);
      expect(d.permitted).toBe(false);
      expect(d.reasons.join(" ")).toMatch(/kill switch/);
    });

    it("ack-required config blocks until acknowledgeKill called", () => {
      e.heartbeat(iso(0));
      e.raiseKillSwitch(iso(0));
      expect(e.evaluate(NOW).permitted).toBe(false);
      e.acknowledgeKill(iso(1000));
      expect(e.evaluate(NOW).permitted).toBe(true);
      expect(e.snapshot().lastAckAt).toBe(iso(1000));
    });

    it("when requireHumanAckOnKill=false, ack just clears state", () => {
      const no = new CorrigibilityGateEngine({ heartbeatTimeoutMs: 60_000, requireHumanAckOnKill: false });
      no.heartbeat(iso(0));
      no.raiseKillSwitch(iso(0));
      expect(no.evaluate(NOW).permitted).toBe(false);
      no.acknowledgeKill();
      expect(no.evaluate(NOW).permitted).toBe(true);
      expect(no.snapshot().lastAckAt).toBeNull();
    });

    it("acknowledgeKill on a non-raised switch is a no-op", () => {
      e.acknowledgeKill(iso(0));
      expect(e.snapshot().killSwitchRaised).toBe(false);
    });
  });

  describe("heartbeat", () => {
    it("blocks evaluation when no heartbeat received", () => {
      const d = e.evaluate(NOW);
      expect(d.permitted).toBe(false);
      expect(d.reasons.join(" ")).toMatch(/no heartbeat/);
    });

    it("passes evaluation within the timeout window", () => {
      e.heartbeat(iso(-1000));
      expect(e.evaluate(NOW).permitted).toBe(true);
    });

    it("blocks when heartbeat is older than the timeout", () => {
      e.heartbeat(iso(-(DEFAULT_CORRIGIBILITY_CONFIG.heartbeatTimeoutMs + 5000)));
      const d = e.evaluate(NOW);
      expect(d.permitted).toBe(false);
      expect(d.reasons.join(" ")).toMatch(/heartbeat silent/);
    });
  });

  describe("combined signals", () => {
    it("reports both kill + heartbeat reasons", () => {
      e.raiseKillSwitch(iso(-100));
      const d = e.evaluate(NOW);
      expect(d.reasons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("snapshot()", () => {
    it("returns a decoupled copy", () => {
      e.heartbeat(iso(0));
      const snap = e.snapshot();
      snap.config.heartbeatTimeoutMs = 1;
      expect(e.snapshot().config.heartbeatTimeoutMs).not.toBe(1);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      expect(corrigibilityGateEngine).toBeInstanceOf(CorrigibilityGateEngine);
    });
  });
});
