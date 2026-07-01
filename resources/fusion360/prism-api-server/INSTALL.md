# PRISM API Server for Fusion 360 — Install Guide

## What this is

The host-side **HTTP loopback server** that `Fusion360LiveBridgeEngine`
expects on `http://127.0.0.1:18360`. Without it, every PRISM-side
"live" CAD op fails with connection-refused. Until today that add-in
didn't exist — only the **telemetry-only** WebSocket add-in
(`prism-test-runner/`) was present, which is a different purpose.

This server exposes 17 routes matching exactly what the engine calls:

| Route | Verb | What it does |
|-------|------|--------------|
| `/health` | GET | `{status:"ok"}` — Fusion process alive |
| `/status` | GET | Fusion version + active doc + body/component/timeline counts |
| `/geometry` | GET | Body list with bbox / face / edge / vertex counts |
| `/new` | POST | Create a new untitled design document |
| `/sketch` | POST | Create sketch on XY/XZ/YZ with rectangle/circle/line/polygon shapes |
| `/extrude` | POST | Extrude a sketch profile; operation = new_body/join/cut/intersect |
| `/fillet` | POST | Fillet edges by index (or all of last body) |
| `/chamfer` | POST | Equal-distance chamfer |
| `/revolve` | POST | Revolve a sketch profile around X/Y/Z axis |
| `/hole` | POST | Place a simple hole at XY |
| `/pattern` | POST | Linear / circular pattern of last feature |
| `/combine` | POST | Boolean union / cut / intersect on multi-body |
| `/shell` | POST | Shell a body with face removal |
| `/export` | POST | Export step / iges / stl / dxf / f3d |
| `/undo` | POST | Triggers Fusion's Undo command |
| `/parameter` | POST | action=set/get/list user parameters |
| `/execute` | POST | Raw-code escape hatch (loopback + env kill switch) |

## Install — pick the SAFE Fusion instance only

You said you have two Fusion instances open:
- One is empty → safe target for this add-in
- One is running the extractor → DO NOT install here

The manifest sets `runOnStartup: false`, so dropping the add-in into
`%APPDATA%` does NOT auto-load it. You manually activate it ONLY in
the empty Fusion instance:

### Step 1 — Copy the folder

```powershell
$src  = "H:\PRISM\resources\fusion360\prism-api-server"
$dest = "$env:APPDATA\Autodesk\Autodesk Fusion 360\API\AddIns\prism-api-server"
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -Path "$src\*" -Destination $dest -Recurse -Force
Write-Host "Installed -> $dest"
```

### Step 2 — Activate in the SAFE Fusion instance only

1. Click into the EMPTY Fusion 360 window (NOT the extractor's window)
2. **Tools** → **Add-Ins** → **Scripts and Add-Ins** dialog
3. Top tabs: click **Add-Ins**
4. In the left list find **prism-api-server**
5. Click **Run** (NOT "Run on Startup")
6. A message box appears: `"PRISM API Server started on http://127.0.0.1:18360"`

### Step 3 — Smoke test from PRISM side

```bash
curl http://127.0.0.1:18360/health
# {"status":"ok","version":"1.0.0"}

curl http://127.0.0.1:18360/status
# {"status":"ok","version":"2.0.xxxxx","document":"Untitled","component_count":1, ...}
```

If you see `{status:"ok"}` → connector is live. The training pipeline
can now drive sketches into your real Fusion seat.

## Security model

- **Loopback only** — server binds `127.0.0.1` explicitly. Remote callers cannot connect.
- **CORS allowlist** — only `localhost:7421` / `127.0.0.1:7421` (PRISM Hub) origins get CORS headers.
- **Kill switch for raw code** — `PRISM_FUSION_RAW_DISABLE=1` env var turns `/execute` into a 403. The 16 typed routes still work.
- **Fusion privileges** — add-in runs with your normal Fusion user permissions. No elevation, no machine-level access.

## Stopping the server

1. Tools → Add-Ins → prism-api-server → **Stop**
2. Closing Fusion also shuts down the server cleanly.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `connection refused` on `/health` | Add-in not activated | Tools → Add-Ins → Run on prism-api-server |
| Address already in use (port 18360) | Other Fusion instance bound it first | Stop the other instance's add-in OR change `SERVER_PORT` in `prism_api_server.py` and matching `F360_URL` in `Fusion360LiveBridgeEngine.ts` |
| `no_active_design` on /sketch | No open document | Call `/new` first or open a Fusion doc manually |
| `ui_thread_timeout_60s` | Fusion stuck (modal dialog, slow regen) | Dismiss any open dialog, retry. Long ops (large STL export) may legitimately exceed 60s — bump `UI_THREAD_TIMEOUT_S` |
| `custom_event_not_registered` | Add-in partially started | Stop + Run again from the Add-Ins dialog |

## Architecture

```
PRISM-side                                               Fusion-side (this add-in)
──────────                                               ─────────────────────────
Fusion360LiveBridgeEngine.createSketch({...})
  └─→ POST http://127.0.0.1:18360/sketch
        └─→ PRISMRequestHandler.do_POST
             └─→ _run_on_ui_thread(_handle_sketch, payload)
                  └─→ fireCustomEvent (HTTP thread)
                       └─→ _ui_event_drain (UI thread, drains queue)
                            └─→ _handle_sketch(payload)
                                 └─→ design.rootComponent.sketches.add(plane)
                                 └─→ sketchCurves.sketchLines.addTwoPointRectangle(...)
                                 └─→ return {success:True, sketch_name:..., profile_count:...}
                            └─→ event.set() — HTTP thread wakes up
                       └─→ wfile.write(JSON response)
  └─→ res.json() — bridge gets typed SketchResult
```

Threading is the critical bit: `adsk.fusion` calls MUST run on Fusion's UI thread. The HTTP thread does NOT call `adsk` directly — it marshals via `CustomEvent` + `threading.Event` barrier.

## Cross-references

- PRISM-side bridge: `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts`
- Companion test runner add-in (DIFFERENT purpose — telemetry): `resources/fusion360/prism-test-runner/`
- hyperCAD-S sibling: `resources/OPEN MIND/hyperCAD-S/prism_hypercads_addin.py` (shipped today, electrode focus)
- Offline pytest: `resources/fusion360/prism-api-server/test_prism_api_server.py`
- Milestone: `CAD-FUSION-LIVE-MS0 / U-FUS-APISRV`
