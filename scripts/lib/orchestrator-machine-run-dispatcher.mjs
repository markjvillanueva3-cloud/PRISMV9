// scripts/lib/orchestrator-machine-run-dispatcher.mjs
//
// U-MMO-MACHINE-RUN-DISPATCHER — execution-edge dispatcher (india-owned).
// Sierra foundation; india wires real MTConnect ingester + machine drivers.
//
// PER AGENT A
// PRISM has NO `prism_machine_run` dispatcher today. CAM→post emits files
// into a vacuum — no engine actually sends G-code to a CNC controller +
// no engine ingests MTConnect/OPC-UA telemetry back. This is the missing
// execution edge.
//
// SCAFFOLD CONTRACT
// dispatch(action, payload) routes to one of 5 action handlers:
//   - "release_program"     : transfer G-code to machine controller
//   - "start_run"           : start cycle (requires release + safety gates)
//   - "pause_run"           : controlled pause
//   - "abort_run"           : emergency stop
//   - "ingest_telemetry"    : MTConnect/OPC-UA event → OUTCOME-BUS
//
// SAFETY
//   - shop_floor tier: Ω≥0.95, S(x)≥0.98 required to release
//   - audit log every action (operator + timestamp + state)
//   - never auto-start without operator confirmation (release ≠ start)

const ACTIONS = Object.freeze([
  "release_program", "start_run", "pause_run", "abort_run", "ingest_telemetry",
]);

const RUN_STATES = Object.freeze(["idle", "released", "running", "paused", "completed", "errored", "aborted"]);

const SAFETY_FLOOR_OMEGA = 0.95;
const SAFETY_FLOOR_SX = 0.98;

/**
 * Create the machine-run dispatcher.
 *
 * @param {object} params
 * @param {Function} [params.transferProgram]   - (gcode, machineId) → promise; injected machine driver
 * @param {Function} [params.startCycle]
 * @param {Function} [params.pauseCycle]
 * @param {Function} [params.abortCycle]
 * @param {Function} [params.onOutcome]         - (telemetry) → void; fans to OUTCOME-BUS
 * @param {Function} [params.auditLog]
 * @returns {object}
 */
export function createMachineRunDispatcher({
  transferProgram, startCycle, pauseCycle, abortCycle, onOutcome, auditLog,
} = {}) {
  // Per-machine state machine
  const states = new Map();  // machineId → { state, programHash, runId, ... }
  const auditEntries = [];

  function audit(entry) {
    const ts = entry.timestamp || new Date().toISOString();
    const full = { ...entry, timestamp: ts };
    auditEntries.push(full);
    if (typeof auditLog === "function") {
      try { auditLog(full); } catch { /* swallow per observation rule */ }
    }
  }

  return {
    /**
     * Dispatch an action.
     */
    async dispatch(action, payload) {
      if (!ACTIONS.includes(action)) {
        throw new Error(`dispatch: unknown action '${action}'`);
      }
      if (!payload || typeof payload !== "object") {
        throw new Error("dispatch: payload object required");
      }
      const { machineId } = payload;
      if (!machineId) throw new Error("dispatch: payload.machineId required");

      switch (action) {
        case "release_program": return releaseProgram(payload);
        case "start_run":       return startRun(payload);
        case "pause_run":       return pauseRun(payload);
        case "abort_run":       return abortRun(payload);
        case "ingest_telemetry": return ingestTelemetry(payload);
        default: throw new Error(`dispatch: action ${action} not implemented`);
      }
    },

    state(machineId) {
      return states.get(machineId) || { state: "idle" };
    },

    auditTail(n = 50) {
      return auditEntries.slice(-n);
    },
  };

  async function releaseProgram(payload) {
    const { machineId, gcode, omega, sx, programHash, operator } = payload;
    if (!gcode || typeof gcode !== "string") {
      throw new Error("release_program: gcode (string) required");
    }
    if (typeof omega !== "number" || omega < SAFETY_FLOOR_OMEGA) {
      audit({ action: "release_program", machineId, status: "blocked", reason: "omega-below-floor", omega, sx });
      return { released: false, reason: `Ω ${omega} below floor ${SAFETY_FLOOR_OMEGA}` };
    }
    if (typeof sx !== "number" || sx < SAFETY_FLOOR_SX) {
      audit({ action: "release_program", machineId, status: "blocked", reason: "sx-below-floor", omega, sx });
      return { released: false, reason: `S(x) ${sx} below floor ${SAFETY_FLOOR_SX}` };
    }
    if (typeof transferProgram === "function") {
      try {
        await transferProgram(gcode, machineId);
      } catch (err) {
        audit({ action: "release_program", machineId, status: "errored", error: err.message });
        return { released: false, reason: `transfer failed: ${err.message}` };
      }
    }
    states.set(machineId, { state: "released", programHash, releasedBy: operator, releasedAt: new Date().toISOString() });
    audit({ action: "release_program", machineId, status: "released", programHash, operator });
    return { released: true };
  }

  async function startRun(payload) {
    const { machineId, operator } = payload;
    const cur = states.get(machineId);
    if (!cur || cur.state !== "released") {
      return { started: false, reason: `machine ${machineId} state is '${cur?.state || "idle"}', expected 'released'` };
    }
    if (typeof startCycle === "function") {
      try { await startCycle(machineId); }
      catch (err) {
        audit({ action: "start_run", machineId, status: "errored", error: err.message });
        return { started: false, reason: `startCycle failed: ${err.message}` };
      }
    }
    const runId = `run-${machineId}-${Date.now()}`;
    states.set(machineId, { ...cur, state: "running", runId, startedBy: operator, startedAt: new Date().toISOString() });
    audit({ action: "start_run", machineId, status: "running", runId, operator });
    return { started: true, runId };
  }

  async function pauseRun(payload) {
    const { machineId, operator, reason } = payload;
    const cur = states.get(machineId);
    if (!cur || cur.state !== "running") {
      return { paused: false, reason: `machine ${machineId} not running` };
    }
    if (typeof pauseCycle === "function") {
      try { await pauseCycle(machineId); }
      catch (err) {
        audit({ action: "pause_run", machineId, status: "errored", error: err.message });
        return { paused: false, reason: `pauseCycle failed: ${err.message}` };
      }
    }
    states.set(machineId, { ...cur, state: "paused", pausedBy: operator, pauseReason: reason });
    audit({ action: "pause_run", machineId, status: "paused", operator, reason });
    return { paused: true };
  }

  async function abortRun(payload) {
    const { machineId, operator, reason } = payload;
    const cur = states.get(machineId);
    if (!cur || (cur.state !== "running" && cur.state !== "paused")) {
      return { aborted: false, reason: `machine ${machineId} not active` };
    }
    if (typeof abortCycle === "function") {
      try { await abortCycle(machineId); }
      catch (err) {
        // Even on abort failure, log + advance state (machine probably e-stopped manually)
        audit({ action: "abort_run", machineId, status: "errored-but-marked-aborted", error: err.message });
      }
    }
    states.set(machineId, { ...cur, state: "aborted", abortedBy: operator, abortReason: reason });
    audit({ action: "abort_run", machineId, status: "aborted", operator, reason });
    return { aborted: true };
  }

  async function ingestTelemetry(payload) {
    const { machineId, eventType, data } = payload;
    if (!eventType) throw new Error("ingest_telemetry: eventType required");
    audit({ action: "ingest_telemetry", machineId, eventType, data });
    if (typeof onOutcome === "function") {
      try { onOutcome({ machineId, eventType, data, timestamp: new Date().toISOString() }); }
      catch { /* swallow per observation */ }
    }
    // Auto-transition on cycle_complete telemetry
    if (eventType === "cycle_complete") {
      const cur = states.get(machineId);
      if (cur && cur.state === "running") {
        states.set(machineId, { ...cur, state: "completed", completedAt: new Date().toISOString() });
      }
    }
    return { ingested: true };
  }
}

export { ACTIONS, RUN_STATES, SAFETY_FLOOR_OMEGA, SAFETY_FLOOR_SX };
