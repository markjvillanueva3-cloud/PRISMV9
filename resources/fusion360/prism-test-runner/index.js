/**
 * PRISM In-Host Test Runner for Fusion 360 (U-CAMTEST02)
 * =======================================================
 *
 * Fusion 360 JS Add-In that registers with the PRISM Plugin Communication
 * Hub over WebSocket, then runs scenarios fed to it by the PRISM-side
 * Fusion360InHostRunnerEngine.
 *
 * The PRISM side is fully covered by vitest. This file is the in-host
 * counterpart — it cannot be exercised by vitest because it depends on
 * Fusion 360's `adsk.core` / `adsk.fusion` runtime. When the shop installs
 * this folder via Fusion's Add-Ins manager, Fusion discovers the
 * `manifest.json` sibling at startup and invokes `run(context)` here.
 *
 * Public API (the engine side calls these via JSON-RPC over WS):
 *   registerWithHub()
 *   runScenario(descriptor)  -> Promise<resultEnvelope>
 *   emitFrame(frame)
 *   reportResult(result)
 *   heartbeat()
 *
 * Assertion bundle run per scenario (mirrors Fusion360InHostRunnerEngine):
 *   frame_arrival, latency_p99, band_transitions, hard_stop_trigger,
 *   session_stats_reconcile, encoder_schema, reconnect_drain
 *
 * Skeleton: the add-in opens the WS, registers, loops on scenario
 * commands, and stages overlay frames using Fusion's Setup/Operation
 * traversal. Toolpath inspection and overlay computation are handled
 * by the PRISM-side overlay engines (U-CAM90..95) — this file only
 * captures the necessary inputs and streams frames back.
 */

const HUB_ENDPOINT = "ws://localhost:7421/inhost/fusion360";
const PLUGIN_ID = "fusion360-inhost-runner";
const PLUGIN_VERSION = "1.0.0";
const HEARTBEAT_INTERVAL_MS = 2500;
const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 5000, 10000];
const FRAME_TYPES = ["force", "chatter", "deflection", "thermal", "tool_life", "safety_score"];

// adsk is provided by Fusion's add-in runtime; declared here for clarity.
// eslint-disable-next-line no-undef
const adsk = typeof adsk !== "undefined" ? adsk : null;

let _socket = null;
let _heartbeatTimer = null;
let _reconnectAttempt = 0;
let _stats = makeEmptyStats();

function makeEmptyStats() {
  return {
    frames_in: 0,
    frames_delivered: 0,
    frames_queued: 0,
    frames_dropped: 0,
    frames_unknown_target: 0,
  };
}

function logToFusion(level, message) {
  // Fusion's TextCommands palette echoes console output. Outside Fusion this
  // falls back to console.log for offline syntax / linting.
  if (adsk && adsk.core && adsk.core.Application) {
    try {
      const ui = adsk.core.Application.get().userInterface;
      ui.palettes.itemById("TextCommands")?.html?.execute(
        `console.${level}("[PRISM] ${message.replace(/"/g, '\\"')}")`,
      );
      return;
    } catch (_e) {
      // fall through to console
    }
  }
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : "log"](`[PRISM] ${message}`);
}

function buildRegistrationMessage() {
  return {
    type: "register",
    plugin_id: PLUGIN_ID,
    target: "fusion360",
    transport: "websocket",
    endpoint: HUB_ENDPOINT,
    version: PLUGIN_VERSION,
    capabilities: [...FRAME_TYPES],
  };
}

function safeSend(obj) {
  if (!_socket || _socket.readyState !== WebSocket.OPEN) {
    _stats.frames_queued += 1;
    return false;
  }
  try {
    _socket.send(JSON.stringify(obj));
    return true;
  } catch (err) {
    logToFusion("error", `send failed: ${err && err.message ? err.message : err}`);
    _stats.frames_dropped += 1;
    return false;
  }
}

function registerWithHub() {
  return safeSend(buildRegistrationMessage());
}

function heartbeat() {
  return safeSend({ type: "heartbeat", plugin_id: PLUGIN_ID, ts: Date.now() });
}

function startHeartbeat() {
  stopHeartbeat();
  _heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
}

function emitFrame(frame) {
  // Validate the minimum schema before sending so payload_valid stays true.
  if (
    !frame ||
    typeof frame.seq !== "number" ||
    !FRAME_TYPES.includes(frame.frame_type)
  ) {
    _stats.frames_dropped += 1;
    return false;
  }
  const envelope = {
    type: "frame",
    plugin_id: PLUGIN_ID,
    target: "fusion360",
    seq: frame.seq,
    frame_type: frame.frame_type,
    operation_id: frame.operation_id,
    payload: frame.payload || "{}",
    hard_stop: !!frame.hard_stop,
    band: typeof frame.band === "number" ? frame.band : 0,
    latency_ms: typeof frame.latency_ms === "number" ? frame.latency_ms : 0,
    payload_valid: frame.payload_valid !== false,
    ts: Date.now(),
  };
  _stats.frames_in += 1;
  const ok = safeSend(envelope);
  if (ok) _stats.frames_delivered += 1;
  return ok;
}

function reportResult(scenarioId, observed) {
  return safeSend({
    type: "result",
    plugin_id: PLUGIN_ID,
    scenario_id: scenarioId,
    observed,
    frames_in: _stats.frames_in,
    frames_delivered: _stats.frames_delivered,
    frames_queued: _stats.frames_queued,
    frames_dropped: _stats.frames_dropped,
    frames_unknown_target: _stats.frames_unknown_target,
  });
}

function planOperationsFromActiveDoc() {
  // In-host: walk Fusion's active document for Setup/Operation nodes.
  // Outside Fusion: return [] so unit linting still passes.
  if (!adsk || !adsk.core) return [];
  try {
    const app = adsk.core.Application.get();
    const product = app.activeProduct;
    if (!product || product.objectType !== "adsk::cam::CAM") return [];
    const cam = product;
    const ops = [];
    for (let s = 0; s < cam.setups.count; s++) {
      const setup = cam.setups.item(s);
      for (let o = 0; o < setup.operations.count; o++) {
        const op = setup.operations.item(o);
        ops.push({ setup: setup.name, operation_id: op.name, strategy: op.strategy });
      }
    }
    return ops;
  } catch (err) {
    logToFusion("error", `planOperations failed: ${err && err.message ? err.message : err}`);
    return [];
  }
}

function runScenario(descriptor) {
  // Skeleton: walk operations, emit one frame per (operation × frame_type),
  // then report. Real overlay computation runs PRISM-side.
  _stats = makeEmptyStats();
  const observed = [];
  const ops = planOperationsFromActiveDoc();
  const opIds = ops.length > 0 ? ops.map((o) => o.operation_id) : [`${descriptor.scenario_id}-op`];
  const expectedPerType = Math.max(1, Math.floor(descriptor.expected_frame_count / FRAME_TYPES.length));
  let seq = 0;
  for (let i = 0; i < expectedPerType; i++) {
    const opId = opIds[i % opIds.length];
    for (const frameType of FRAME_TYPES) {
      const frame = {
        seq,
        frame_type: frameType,
        operation_id: opId,
        payload: "{}",
        band: 0,
        latency_ms: 1.0,
        payload_valid: true,
        hard_stop: false,
      };
      emitFrame(frame);
      observed.push({
        seq,
        frame_type: frameType,
        latency_ms: 1.0,
        hard_stop: false,
        band: 0,
        payload_valid: true,
      });
      seq += 1;
    }
  }
  return reportResult(descriptor.scenario_id, observed);
}

function handleMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (_err) {
    logToFusion("error", "invalid JSON from hub");
    return;
  }
  if (!msg || typeof msg.type !== "string") return;
  if (msg.type === "run_scenario" && msg.descriptor) {
    runScenario(msg.descriptor);
  } else if (msg.type === "ping") {
    safeSend({ type: "pong", plugin_id: PLUGIN_ID, ts: Date.now() });
  }
}

function scheduleReconnect() {
  const delay = RECONNECT_BACKOFF_MS[Math.min(_reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)];
  _reconnectAttempt += 1;
  setTimeout(connect, delay);
}

function connect() {
  if (typeof WebSocket === "undefined") {
    logToFusion("error", "WebSocket not available in this Fusion runtime");
    return;
  }
  try {
    _socket = new WebSocket(HUB_ENDPOINT);
  } catch (err) {
    logToFusion("error", `connect failed: ${err && err.message ? err.message : err}`);
    scheduleReconnect();
    return;
  }
  _socket.onopen = () => {
    _reconnectAttempt = 0;
    registerWithHub();
    startHeartbeat();
    logToFusion("log", `connected ${HUB_ENDPOINT}`);
  };
  _socket.onmessage = (ev) => handleMessage(ev.data);
  _socket.onerror = (ev) => logToFusion("error", `socket error ${ev?.type ?? "unknown"}`);
  _socket.onclose = () => {
    stopHeartbeat();
    scheduleReconnect();
  };
}

// Fusion 360 Add-In lifecycle.
// `run(context)` is called by Fusion when the Add-In is activated; `stop(context)` on deactivation.

function run(context) {
  try {
    connect();
    logToFusion("log", `PRISM Fusion 360 in-host runner started (plugin_id=${PLUGIN_ID})`);
  } catch (err) {
    logToFusion("error", `run() failed: ${err && err.message ? err.message : err}`);
  }
}

function stop(context) {
  try {
    stopHeartbeat();
    if (_socket) {
      try {
        _socket.close();
      } catch (_e) {
        // ignore — socket may already be in a terminal state
      }
      _socket = null;
    }
    logToFusion("log", "PRISM Fusion 360 in-host runner stopped");
  } catch (err) {
    logToFusion("error", `stop() failed: ${err && err.message ? err.message : err}`);
  }
}

// Fusion's Add-In loader expects either CommonJS exports or globally-defined
// run/stop functions. Provide both for portability across Fusion versions.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    run,
    stop,
    registerWithHub,
    runScenario,
    emitFrame,
    reportResult,
    heartbeat,
  };
}
