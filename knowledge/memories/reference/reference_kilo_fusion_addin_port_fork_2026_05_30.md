---
name: reference_kilo_fusion_addin_port_fork_2026_05_30
description: "Live Fusion CAM drive is blocked by a deployment fork — the bridge targets :18360 (a read-only extractor) but the CAM-capable add-in (PRISMBridge) moved to :18361, and the repo's canonical fusion360_api_server.py (with raw_parameters) isn't installed at all"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.184Z
aliases: reference_kilo_fusion_addin_port_fork_2026_05_30
---


Operator brought Fusion online to test CAM-DRIVE-MS0 ([[reference_kilo_cam_drive_ms0_2026_05_29]]). Live probe (slot:kilo, 2026-05-30) found the drive can't run end-to-end due to a **3-way add-in / port fork** — a real integration blocker, NOT a kilo code bug.

**Live state (probed read-only — a JM production doc is open, did NOT test-mutate):**
- **:18360** ← `PRISM_API_Server.py` (27K, **read-only extractor**, NO `/cam/*` write routes). `/health`→`{status:ok, version:2703.1.11, has_document:true, project_count:11}`. This is what `Fusion360LiveBridgeEngine` defaults to (`F360_URL = "http://127.0.0.1:18360"`, line 16).
- **:18361** ← `PRISMBridge.py` (149K, **CAM-capable**: `/cam/{operations,setups,toolpath,post,operation}`). Moved off :18360 → :18361 on **2026-05-27** ("collides with PRISM_API_Server", per its own comment line 62). Live `/cam/setups`→`{setups:[],count:0}`, `/cam/operations`→`{operations:[],count:0}` (works!). **But `raw_parameters:0`** — older build, lacks my full-param passthrough.
- Repo canonical `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` (115K, `PORT=18360`, HAS `raw_parameters` + `/cam/operation` + `_create_cam_operation`) — **NOT installed** in `%APPDATA%/Autodesk/Autodesk Fusion 360/API/AddIns/` (which holds 4 divergent PRISM add-ins: prism-api-server, PRISMBridge, PRISM_API_Server, PRISM_Copilot).

**The two consequences:**
1. **Port mismatch (regression class):** my bridge (and delta's `cad_class_drive_build`, same engine) default to :18360 = the read-only extractor → NO write/drive works (CAM *or* CAD) against the live seat. The CAM add-in is on :18361 since 2026-05-27; the bridge default was never updated.
2. **Version fork:** even pointing at :18361 (PRISMBridge) wouldn't give full-param drive — it lacks `raw_parameters`. And it's a *different source file* than the repo's canonical `fusion360_api_server.py`.

**Canonical fix (operator + delta-coordinated — the add-in is shared CAD+CAM territory):** install the repo `fusion360_api_server.py` as the `:18360` add-in (it's the design intent: `PORT=18360` + `raw_parameters` + CAM+CAD routes), retire/disable the read-only-extractor squatter on :18360 + reconcile the 4-add-in mess, reload in Fusion (Stop+Run — no hot-reload). Then bridge(:18360) ↔ canonical add-in align and full-param live drive works. **Do NOT unilaterally flip the bridge to :18361** (would average two conflicting states — R7 — and still lack raw_parameters; also breaks delta's CAD drive contract).

**What IS proven:** the live CAM add-in is alive and serves real `adsk.cam` reads end-to-end (:18361). My CAM-DRIVE code (gate + 7 actions + raw_parameters) is correct + tested against the repo contract. The gap is purely deployment alignment. Live drive of a real op must wait for (a) the canonical add-in on the bridge's port, (b) a SCRATCH doc open (not the JM production doc). Memory: [[reference_kilo_cam_live_drive_layer_exists_2026_05_29]].
