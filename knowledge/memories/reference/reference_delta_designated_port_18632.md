---
name: reference_delta_designated_port_18632
description: Operator-designated CAD/delta Fusion bridge port is 18632 (kilo CAM = 18361). Go-forward canonical port.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.082Z
aliases: reference_delta_designated_port_18632
---


**Operator directive (2026-06-02, in the standing /goal): "18632 is the designated cad/delta port."** This is the canonical go-forward port for delta's Fusion bridge instance. Kilo (CAM) = :18361. One port = one slot ([[reference_delta_fusion_backend_map_2026_06_02]], `state/shared/fusion-instance-claims.json`).

**Reality reconciliation (R12, verified live 2026-06-02):** at the time of the directive, NO add-in was listening on :18632 — the live CAD instance was bound to **:18365** (where the G1 prismatic-build proof ran), kilo on :18361. To honor the designation, the delta Fusion add-in must be (re)launched with env **`PRISM_BRIDGE_CAD_PORT=18632`** before Run (the add-in reads that env at startup; the installed live add-in is `PRISM_Fusion_Drive.py`). Until that relaunch, live closed-loop runs target whichever CAD port actually has a listener (`curl :PORT/health`); the runner port is `--port <N>` / default updated to 18632.

**NOTE (possible typo, surfaced not silently corrected):** the repo `PRISMBridgeCAD.py` default is `18362`; `18632` is a digit-transposition of `18362`. The directive was written `18632` twice and explicitly memorialized, so 18632 is treated as authoritative — but if a future probe shows the add-in default binding 18362 and the operator never relaunched on 18632, confirm whether 18632 vs 18362 was intended.

**Apply:** `node scripts/cad-fusion-correction-loop-live.mjs --port 18632 --part <class>` (override `--port 18365` only while the live instance is still on 18365). Claim surface: `state/shared/fusion-instance-claims.json`.
