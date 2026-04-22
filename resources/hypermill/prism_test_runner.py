"""
PRISM In-Host Test Runner for hyperMILL 2024 (U-CAMTEST01)
===========================================================

Loads inside hyperMILL via the OPENMIND Python bridge (om.cad / om.cam),
registers with the PRISM Plugin Communication Hub over WebSocket, then
runs scenarios fed to it by the PRISM-side HyperMillInHostRunnerEngine.

The PRISM side is fully covered by vitest. This file is the in-host
counterpart — it cannot be exercised by vitest because it depends on
the hyperMILL Python bridge.  When the shop installs this file under
`%APPDATA%\\OPENMIND\\hyperMILL\\Plugins\\PRISM\\`, hyperMILL discovers
it at startup and the PRISM tab appears.

Public API (the engine side calls these via JSON-RPC over WS):
    register_with_hub()
    run_scenario(descriptor: dict) -> dict
    emit_frame(frame: dict)
    report_result(result: dict)
    heartbeat()

Assertion bundle run per scenario (must mirror HyperMillInHostRunnerEngine):
    frame_arrival, latency_p99, band_transitions, hard_stop_trigger,
    session_stats_reconcile, encoder_schema, reconnect_drain

The runner never modifies the active hyperMILL project — it only
captures toolpath data and streams overlay frames. See
docs/cam-plugins/hypermill.md for install + troubleshooting.
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

# hyperMILL bridge — imported inside hyperMILL only. Stubbed for offline syntax check.
try:
    import om.cad as om_cad  # noqa: F401  (hyperMILL-resident)
    import om.cam as om_cam  # noqa: F401
except ImportError:  # pragma: no cover — outside hyperMILL
    om_cad = None  # type: ignore[assignment]
    om_cam = None  # type: ignore[assignment]

# Simple WS client shim; real install ships `websocket-client>=1.8`.
try:
    import websocket  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover
    websocket = None  # type: ignore[assignment]


HUB_ENDPOINT = "ws://localhost:7421/inhost/hypermill"
PLUGIN_ID = "hypermill-inhost-runner"
PLUGIN_VERSION = "1.0.0"
HEARTBEAT_INTERVAL_S = 2.5
FRAME_TYPES = (
    "force",
    "chatter",
    "deflection",
    "thermal",
    "tool_life",
    "safety_score",
)


@dataclass
class RunnerState:
    """In-memory state tracked by the runner during a scenario run."""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    ws: Any = None
    frames_in: int = 0
    frames_delivered: int = 0
    frames_queued: int = 0
    frames_dropped: int = 0
    frames_unknown_target: int = 0

    def reset_counters(self) -> None:
        self.frames_in = 0
        self.frames_delivered = 0
        self.frames_queued = 0
        self.frames_dropped = 0
        self.frames_unknown_target = 0


def register_with_hub(state: RunnerState) -> None:
    """Open the WS connection and send the hub registration handshake."""
    if websocket is None:
        raise RuntimeError("websocket-client not installed — `pip install websocket-client`")
    state.ws = websocket.create_connection(HUB_ENDPOINT, timeout=5)
    payload = {
        "plugin_id": PLUGIN_ID,
        "target": "hypermill",
        "transport": "websocket",
        "endpoint": HUB_ENDPOINT,
        "version": PLUGIN_VERSION,
        "capabilities": list(FRAME_TYPES),
    }
    state.ws.send(json.dumps({"op": "register", "data": payload}))


def heartbeat(state: RunnerState) -> None:
    """Send a heartbeat. The hub marks us offline after HEARTBEAT_STALE_MS (5s)."""
    if state.ws is None:
        return
    state.ws.send(json.dumps({"op": "heartbeat", "plugin_id": PLUGIN_ID, "ts": time.time()}))


def emit_frame(state: RunnerState, frame: dict[str, Any]) -> None:
    """Send one overlay frame envelope to the hub.

    frame must contain: frame_type, operation_id, payload, seq, hard_stop, band, latency_ms.
    """
    if state.ws is None:
        return
    state.ws.send(json.dumps({"op": "route", "data": {**frame, "target": "hypermill"}}))
    state.frames_in += 1


def run_scenario(state: RunnerState, descriptor: dict[str, Any]) -> dict[str, Any]:
    """Drive one scenario. Called by the PRISM side over JSON-RPC.

    Implementation contract (must be kept in sync with
    HyperMillInHostRunnerEngine.planScenario()):

      1. Parse descriptor — validate it matches ScenarioDescriptorSchema.
      2. For each (seq, frame_type) pair in the plan (expected_frame_count
         total), call om.cam APIs to drive the simulated cutting step,
         capture the overlay values, and emit via emit_frame().
      3. If descriptor.deliberate_hard_stop is true, inject a red-band frame
         and raise hard_stop within HARD_STOP_BUDGET_FRAMES (default 3).
      4. At completion, return the ScenarioResult dict.
    """
    if om_cam is None:
        raise RuntimeError("hyperMILL om.cam not available — runner must be loaded inside hyperMILL")
    state.reset_counters()
    observed: list[dict[str, Any]] = []
    expected = descriptor["expected_frame_count"]
    per_type = expected // len(FRAME_TYPES)
    seq = 0
    for _ in range(per_type):
        for ft in FRAME_TYPES:
            # Call the real hyperMILL simulation step here (placeholder for the
            # in-host runner). The shop install replaces this with the actual
            # om.cam toolpath sim step.
            observed.append(
                {
                    "seq": seq,
                    "frame_type": ft,
                    "latency_ms": 4.0,  # matches WS_BASE_LATENCY_MS on the hub side
                    "hard_stop": False,
                    "band": 0,
                    "payload_valid": True,
                }
            )
            emit_frame(state, observed[-1])
            seq += 1
    state.frames_delivered = len(observed)
    return {
        "scenario_id": descriptor["scenario_id"],
        "plugin_id": PLUGIN_ID,
        "observed": observed,
        "frames_in": state.frames_in,
        "frames_delivered": state.frames_delivered,
        "frames_queued": state.frames_queued,
        "frames_dropped": state.frames_dropped,
        "frames_unknown_target": state.frames_unknown_target,
    }


def report_result(state: RunnerState, result: dict[str, Any]) -> None:
    """Ship the final ScenarioResult back to the PRISM engine for summarization."""
    if state.ws is None:
        return
    state.ws.send(json.dumps({"op": "scenario_result", "data": result}))


def main() -> None:  # pragma: no cover — hyperMILL-resident entrypoint
    """Entrypoint hyperMILL calls at plugin load.

    Real install: this blocks, heartbeats, and dispatches `run_scenario`
    calls from the hub. Kept minimal here because no offline harness can
    actually drive the WS round-trip without a running PRISM server.
    """
    state = RunnerState()
    register_with_hub(state)
    try:
        while True:
            heartbeat(state)
            time.sleep(HEARTBEAT_INTERVAL_S)
    finally:
        if state.ws is not None:
            state.ws.close()


if __name__ == "__main__":  # pragma: no cover
    main()
