---
name: reference_delta_cad_port_18632
description: Port 18632 is the operator-DESIGNATED CAD/delta service port (Fusion live CAD bridge). NOTE live add-in currently runs on :18365 — reconcile before live cycles.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.079Z
aliases: reference_delta_cad_port_18632
---


**Port 18632** is the operator-DESIGNATED **CAD / delta** service port (operator-locked 2026-06-02): the canonical port for the delta-slot CAD service surface — Fusion live CAD bridge / closed-loop CAD generation server. Make connections + service binds use 18632 going forward; distinct from kilo's CAM port.

**Live-state reconciliation (verified 2026-06-02, fail-loud R12):** at the time of designation, **nothing was listening on 18632** (`/health` no response). The live Fusion add-in (`resources/fusion360/prism-api-server/prism_api_server.py`) was up on **:18365** (HTTP 200 — delta's prior exclusive claim, `state/shared/fusion-bridge-claims.json`) and :18361 (kilo/CAM). The add-in default bind is :18360; `PRISM_BRIDGE_CAD_PORT` / launch-arg selects the port BEFORE the add-in runs.

→ **Before any live closed-loop cycle on 18632:** confirm a Fusion instance has the add-in bound to 18632 (`curl http://127.0.0.1:18632/health`). If down, either (a) ask operator to relaunch the Fusion add-in on 18632, or (b) fall back to the live :18365 instance. **Code/route building is port-independent** — build + unit-test bridge routes without a live Fusion; live proof needs a real bound instance.

Note: 18632 ≠ 18365 (not a transposition) — 18632 is the new canonical designation, 18365 was the prior proven port.

Related: [[reference_delta_live_closed_loop_proven_2026_06_01]] (proven on :18365) · [[reference_delta_fusion_isolation_and_live_bridge_2026_06_01]] · [[reference_delta_proven_step_emitter]] · delta galaxy `mcp-server/src/engines/cad-fusion-live/`.
