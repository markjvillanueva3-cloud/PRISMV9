---
name: reference_delta_cad_drawing_port_18362
description: CAD-drawing live bridge (PRISMBridgeCAD) runs on port 18362 — VERIFIED LIVE 2026-06-18. "18632" is a recurring digit-transposition typo; nothing binds 18632.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.540Z
aliases: reference_delta_cad_drawing_port_18362
---


**The port for CAD drawing is `18362`** — the `PRISMBridgeCAD` live bridge. Verified live 2026-06-18 (slot:delta).

Three independent sources agree:
1. **Operator started PRISMBridgeCAD**, the dialog printed verbatim: "PRISM Bridge started on port **18362**".
2. **Live probe this session:** `127.0.0.1:18362` → HTTP 404 (listener up + serving routes); `127.0.0.1:18632` → HTTP 000 (nothing bound, dead).
3. **Repo + prior confirmation:** `PRISMBridgeCAD.py` default = 18362; operator-confirmed 2026-06-02 ([[reference_fusion_port_assignment_kilo_18361_2026_06_02]]) — ":18362 = delta (CAD), :18361 = kilo (CAM)".

**`18632` is a digit-transposition of `18362`.** The two have circulated interchangeably since 2026-06-02 (the operator's directive was written "18632"; the running bridge has always bound 18362). On 2026-06-18 the operator's message again said "18632" while the dialog it quoted said "18362" — the same transposition. Nothing has ever listened on 18632. This resolves the open question flagged in [[reference_delta_designated_port_18632]] ("if a future probe shows the add-in default binding 18362 … confirm 18632 vs 18362").

**Use 18362 for all CAD-drawing live cycles:** `curl http://127.0.0.1:18362/...`; runner `--port 18362`. Port map: **delta / CAD = 18362**, kilo / CAM = 18361. (`Fusion360LiveBridgeEngine` default :18360 and the legacy `PRISM_Fusion_Drive` :18365 are separate surfaces — not the CAD-drawing bridge.)

If the operator ever genuinely wants the bridge MOVED to 18632, relaunch `PRISMBridgeCAD` on that port and re-verify; until then 18632 binds nothing.

Related: [[reference_delta_designated_port_18632]] + [[reference_delta_cad_port_18632]] (both superseded by this) · [[reference_fusion_port_assignment_kilo_18361_2026_06_02]] · delta galaxy `mcp-server/src/engines/cad-fusion-live/`.
