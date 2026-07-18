/**
 * safetyDispatcher U-WIRE-KILLSWITCH round-trip tests -- TriLevelKillSwitchEngine.
 *
 * Validates the 5 new READ-ONLY actions (killswitch_state / killswitch_gate / killswitch_stats /
 * killswitch_trips / killswitch_compliance) wire through prism_safety, and that the engine's
 * tri-level gate semantics behave per contract. Mutations (trip/reset/setSla/clearAll) are
 * deliberately NOT exposed via MCP (operator-in-the-loop per CLAUDE.md Safety Tier) -- the wiring
 * assertion below pins that the dispatcher only exposes reads + defers the rest.
 *
 * Reference values read from the engine body: a fresh engine is level=OK / gate_open=true / 0 trips;
 * an L3_SOFTWARE trip closes the dispatcher gate; an L1_PHYSICAL trip is the dominant level but does
 * NOT close the L3-only dispatcher gate (the machine blocks, not PRISM output).
 *
 * Wired slot:papa 2026-06-11 /startup-papa /loop /goal (wire-unwired campaign; 3rd engine after
 * U-WIRE-DR + U-WIRE-BACKUP; this one targets the SAFETY dispatcher, read-only by design).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-KILLSWITCH
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  TriLevelKillSwitchEngine,
  triLevelKillSwitchEngine,
} from "../engines/TriLevelKillSwitchEngine.js";

describe("U-WIRE-KILLSWITCH -- fresh state is OK + gate open (happy path)", () => {
  it("getActiveState on a fresh engine is OK with the gate open and no last trip", () => {
    const e = new TriLevelKillSwitchEngine();
    const s = e.getActiveState();
    expect(s.level).toBe("OK");
    expect(s.gate_open).toBe(true);
    expect(s.last_trip).toBeNull();
  });

  it("dispatcherGateOpen is true on a fresh engine", () => {
    const e = new TriLevelKillSwitchEngine();
    expect(e.dispatcherGateOpen()).toBe(true);
  });

  it("listTrips is empty and complianceReport passes on a fresh engine", () => {
    const e = new TriLevelKillSwitchEngine();
    expect(e.listTrips().length).toBe(0);
    const cr = e.complianceReport();
    expect(cr.overall_pass).toBe(true);
    expect(cr.violation_rate).toBe(0);
  });
});

describe("U-WIRE-KILLSWITCH -- tri-level gate semantics (adversarial behavioral)", () => {
  it("an L3_SOFTWARE trip closes the dispatcher gate; reset reopens it", () => {
    const e = new TriLevelKillSwitchEngine();
    e.setSla("L3_SOFTWARE", { ack_sla_ms: 60000, runbook_id: "RB-L3" });
    e.trip({ level: "L3_SOFTWARE", source: "operator", reason: "test trip", tripped_at: 1000, now: 1500 });
    expect(e.getActiveState().level).toBe("L3_SOFTWARE");
    expect(e.getActiveState().gate_open).toBe(false);
    expect(e.dispatcherGateOpen()).toBe(false);
    expect(e.listTrips().length).toBe(1);
    e.reset({ level: "L3_SOFTWARE", authorized_by: "ops", evidence: "condition resolved and verified", runbook_completed: true });
    expect(e.getActiveState().gate_open).toBe(true);
    expect(e.dispatcherGateOpen()).toBe(true);
  });

  it("an L1_PHYSICAL trip is dominant but does NOT close the L3-only dispatcher gate", () => {
    const e = new TriLevelKillSwitchEngine();
    e.setSla("L1_PHYSICAL", { ack_sla_ms: 60000, runbook_id: "RB-L1" });
    e.trip({ level: "L1_PHYSICAL", source: "operator", reason: "physical estop", tripped_at: 1000, now: 1500 });
    expect(e.getActiveState().level).toBe("L1_PHYSICAL");
    expect(e.getActiveState().gate_open).toBe(false); // any active trip => state gate not open
    expect(e.dispatcherGateOpen()).toBe(true);        // dispatcherGateOpen only blocks on L3
  });
});

describe("U-WIRE-KILLSWITCH -- fail-loud validation (R12)", () => {
  it("trip rejects an empty reason (before any SLA access)", () => {
    const e = new TriLevelKillSwitchEngine();
    expect(() => e.trip({ level: "L3_SOFTWARE", source: "operator", reason: "  ", tripped_at: 1000 })).toThrow(/reason required/);
  });

  it("reset rejects when there is no active trip at that level", () => {
    const e = new TriLevelKillSwitchEngine();
    expect(() => e.reset({ level: "L3_SOFTWARE", authorized_by: "ops", evidence: "x".repeat(20), runbook_completed: true })).toThrow(/no active trip/);
  });

  it("trip rejects an acknowledged time before the trip time", () => {
    const e = new TriLevelKillSwitchEngine();
    e.setSla("L3_SOFTWARE", { ack_sla_ms: 1000, runbook_id: "RB" });
    expect(() => e.trip({ level: "L3_SOFTWARE", source: "operator", reason: "x", tripped_at: 5000, now: 1000 })).toThrow(/cannot precede/);
  });
});

describe("U-WIRE-KILLSWITCH -- singleton parity", () => {
  it("the exported singleton (what the dispatcher imports) starts gate-open", () => {
    expect(triLevelKillSwitchEngine.dispatcherGateOpen()).toBe(true);
  });
});

describe("U-WIRE-KILLSWITCH -- dispatcher wiring assertion (round-trip surface)", () => {
  const dispatcherSrc = fs.readFileSync(
    path.resolve(__dirname, "../tools/dispatchers/safetyDispatcher.ts"),
    "utf8",
  );
  const schemaSrc = fs.readFileSync(
    path.resolve(__dirname, "../schemas/safetyActionSchemas.ts"),
    "utf8",
  );

  for (const action of ["killswitch_state", "killswitch_gate", "killswitch_stats", "killswitch_trips", "killswitch_compliance"]) {
    it(`${action} is in the prism_safety action set AND has a handler AND a schema`, () => {
      expect(dispatcherSrc).toMatch(new RegExp(`"${action}"`));
      expect(dispatcherSrc).toMatch(new RegExp(`action === "${action}"`));
      expect(schemaSrc).toMatch(new RegExp(`${action}:`));
    });
  }

  it("the dispatcher references the engine singleton and defers mutations", () => {
    expect(dispatcherSrc).toMatch(/triLevelKillSwitchEngine/);
    expect(dispatcherSrc).toMatch(/DEFERRED/);
  });
});
