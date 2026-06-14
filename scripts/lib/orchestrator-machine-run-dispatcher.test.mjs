// scripts/lib/orchestrator-machine-run-dispatcher.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS, RUN_STATES, SAFETY_FLOOR_OMEGA, SAFETY_FLOOR_SX,
  createMachineRunDispatcher,
} from "./orchestrator-machine-run-dispatcher.mjs";

function makeDispatcher(extra = {}) {
  const log = [];
  return {
    dispatcher: createMachineRunDispatcher({
      transferProgram: async (gcode, machineId) => log.push(`transfer:${machineId}:${gcode.length}`),
      startCycle: async (mid) => log.push(`start:${mid}`),
      pauseCycle: async (mid) => log.push(`pause:${mid}`),
      abortCycle: async (mid) => log.push(`abort:${mid}`),
      onOutcome: (o) => log.push(`outcome:${o.eventType}`),
      ...extra,
    }),
    log,
  };
}

describe("constants", () => {
  it("exports ACTIONS + RUN_STATES + safety floors", () => {
    assert.equal(ACTIONS.length, 5);
    assert.ok(Object.isFrozen(ACTIONS));
    assert.ok(RUN_STATES.includes("idle"));
    assert.equal(SAFETY_FLOOR_OMEGA, 0.95);
    assert.equal(SAFETY_FLOOR_SX, 0.98);
  });
});

describe("dispatch — input validation", () => {
  it("rejects unknown action", async () => {
    const { dispatcher } = makeDispatcher();
    await assert.rejects(dispatcher.dispatch("fly_to_mars", { machineId: "X" }), /unknown action/);
  });
  it("rejects missing payload", async () => {
    const { dispatcher } = makeDispatcher();
    await assert.rejects(dispatcher.dispatch("start_run", null), /payload object required/);
  });
  it("rejects missing machineId", async () => {
    const { dispatcher } = makeDispatcher();
    await assert.rejects(dispatcher.dispatch("start_run", {}), /machineId required/);
  });
});

describe("release_program — safety floor gates", () => {
  it("releases when Ω + S(x) above floors", async () => {
    const { dispatcher, log } = makeDispatcher();
    const r = await dispatcher.dispatch("release_program", {
      machineId: "VMC-1", gcode: "G54\nG0 X0 Y0\n", omega: 0.96, sx: 0.99, operator: "Mark",
    });
    assert.equal(r.released, true);
    assert.equal(dispatcher.state("VMC-1").state, "released");
    assert.ok(log.some((l) => l.startsWith("transfer:")));
  });

  it("BLOCKS release when Ω below 0.95 floor", async () => {
    const { dispatcher } = makeDispatcher();
    const r = await dispatcher.dispatch("release_program", {
      machineId: "VMC-1", gcode: "X", omega: 0.80, sx: 0.99,
    });
    assert.equal(r.released, false);
    assert.match(r.reason, /Ω 0\.8 below floor/);
  });

  it("BLOCKS release when S(x) below 0.98 floor", async () => {
    const { dispatcher } = makeDispatcher();
    const r = await dispatcher.dispatch("release_program", {
      machineId: "VMC-1", gcode: "X", omega: 0.99, sx: 0.85,
    });
    assert.equal(r.released, false);
    assert.match(r.reason, /S\(x\) 0\.85 below floor/);
  });

  it("rejects missing gcode", async () => {
    const { dispatcher } = makeDispatcher();
    await assert.rejects(dispatcher.dispatch("release_program", { machineId: "VMC-1", omega: 0.99, sx: 0.99 }), /gcode/);
  });

  it("surfaces transfer driver failure", async () => {
    const { dispatcher } = makeDispatcher({ transferProgram: async () => { throw new Error("network down"); } });
    const r = await dispatcher.dispatch("release_program", { machineId: "VMC-1", gcode: "X", omega: 0.99, sx: 0.99 });
    assert.equal(r.released, false);
    assert.match(r.reason, /transfer failed: network down/);
  });
});

describe("start_run — requires prior release", () => {
  it("starts when machine in 'released' state", async () => {
    const { dispatcher } = makeDispatcher();
    await dispatcher.dispatch("release_program", { machineId: "VMC-2", gcode: "X", omega: 0.99, sx: 0.99 });
    const r = await dispatcher.dispatch("start_run", { machineId: "VMC-2", operator: "Mark" });
    assert.equal(r.started, true);
    assert.ok(r.runId.startsWith("run-VMC-2-"));
    assert.equal(dispatcher.state("VMC-2").state, "running");
  });

  it("refuses to start when machine state is idle (no release)", async () => {
    const { dispatcher } = makeDispatcher();
    const r = await dispatcher.dispatch("start_run", { machineId: "VMC-3", operator: "Mark" });
    assert.equal(r.started, false);
    assert.match(r.reason, /'idle', expected 'released'/);
  });
});

describe("pause_run + abort_run state machine", () => {
  async function runActiveMachine() {
    const { dispatcher } = makeDispatcher();
    await dispatcher.dispatch("release_program", { machineId: "VMC-X", gcode: "X", omega: 0.99, sx: 0.99 });
    await dispatcher.dispatch("start_run", { machineId: "VMC-X" });
    return dispatcher;
  }

  it("pauses running machine", async () => {
    const d = await runActiveMachine();
    const r = await d.dispatch("pause_run", { machineId: "VMC-X", operator: "Mark", reason: "tool wear check" });
    assert.equal(r.paused, true);
    assert.equal(d.state("VMC-X").state, "paused");
  });

  it("refuses pause on non-running machine", async () => {
    const { dispatcher } = makeDispatcher();
    const r = await dispatcher.dispatch("pause_run", { machineId: "VMC-Y" });
    assert.equal(r.paused, false);
  });

  it("aborts running machine", async () => {
    const d = await runActiveMachine();
    const r = await d.dispatch("abort_run", { machineId: "VMC-X", operator: "Mark", reason: "chatter detected" });
    assert.equal(r.aborted, true);
    assert.equal(d.state("VMC-X").state, "aborted");
  });

  it("aborts even when driver fails (machine likely e-stopped manually)", async () => {
    const { dispatcher } = makeDispatcher({ abortCycle: async () => { throw new Error("comm timeout"); } });
    await dispatcher.dispatch("release_program", { machineId: "VMC-Z", gcode: "X", omega: 0.99, sx: 0.99 });
    await dispatcher.dispatch("start_run", { machineId: "VMC-Z" });
    const r = await dispatcher.dispatch("abort_run", { machineId: "VMC-Z" });
    assert.equal(r.aborted, true);
    assert.equal(dispatcher.state("VMC-Z").state, "aborted");
  });
});

describe("ingest_telemetry → OUTCOME-BUS", () => {
  it("invokes onOutcome with telemetry payload", async () => {
    const outcomes = [];
    const { dispatcher } = makeDispatcher({ onOutcome: (o) => outcomes.push(o) });
    await dispatcher.dispatch("ingest_telemetry", {
      machineId: "VMC-T", eventType: "spindle_load", data: { pct: 78 },
    });
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].eventType, "spindle_load");
    assert.equal(outcomes[0].data.pct, 78);
  });

  it("auto-transitions running → completed on cycle_complete telemetry", async () => {
    const { dispatcher } = makeDispatcher();
    await dispatcher.dispatch("release_program", { machineId: "VMC-C", gcode: "X", omega: 0.99, sx: 0.99 });
    await dispatcher.dispatch("start_run", { machineId: "VMC-C" });
    await dispatcher.dispatch("ingest_telemetry", { machineId: "VMC-C", eventType: "cycle_complete", data: {} });
    assert.equal(dispatcher.state("VMC-C").state, "completed");
  });

  it("R12: rejects missing eventType", async () => {
    const { dispatcher } = makeDispatcher();
    await assert.rejects(dispatcher.dispatch("ingest_telemetry", { machineId: "X" }), /eventType required/);
  });

  it("does not crash when onOutcome throws (observation never breaks control)", async () => {
    const { dispatcher } = makeDispatcher({ onOutcome: () => { throw new Error("bus down"); } });
    const r = await dispatcher.dispatch("ingest_telemetry", { machineId: "X", eventType: "spindle_load", data: {} });
    assert.equal(r.ingested, true);
  });
});

describe("audit trail", () => {
  it("appends to auditTail on every dispatch", async () => {
    const { dispatcher } = makeDispatcher();
    await dispatcher.dispatch("release_program", { machineId: "VMC-A", gcode: "X", omega: 0.99, sx: 0.99 });
    await dispatcher.dispatch("ingest_telemetry", { machineId: "VMC-A", eventType: "started", data: {} });
    const tail = dispatcher.auditTail();
    assert.ok(tail.length >= 2);
    assert.ok(tail.every((e) => typeof e.timestamp === "string"));
  });
});
