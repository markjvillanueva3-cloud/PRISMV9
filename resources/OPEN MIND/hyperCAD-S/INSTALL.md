# PRISM ↔ hyperCAD-S Connector — Install Guide

## What this is

`prism_hypercads_addin.py` is the **host-side add-in** that lives inside
hyperCAD-S 31.0 and lets PRISM drive sketching / extruding / electrode
operations against your real seat — the same pattern as the Fusion 360
connector (`resources/fusion360/prism-test-runner/`) and hyperMILL
connector (`resources/HYPERMILL/prism_test_runner.py`).

Operations the add-in exposes:

| Group | Ops |
|-------|-----|
| Sketching/Modeling (14) | `sketch_create`, `feature_extrude`, `feature_fillet`, `feature_chamfer`, `feature_revolve`, `feature_hole`, `feature_pattern_linear`, `feature_pattern_circular`, `boolean_union`, `boolean_subtract`, `boolean_intersect`, `feature_shell`, `export_step`, `export_iges`, `export_stl`, `export_dxf`, `export_pdf` |
| **Electrode (7) — hyperCAD-S-only** | `electrode_pick_block_holder`, `electrode_set_orbit_strategy`, `electrode_set_description`, `electrode_generate`, `electrode_export_to_edm`, `electrode_clamping_setup`, `electrode_burn_sequence` |

The electrode group is **why we picked hyperCAD-S over Fusion 360** —
9 electrode types × 11 orbit strategies × 4 holder libraries (Erowa +
System-3R) × 9 standard Z heights × clamping codes, all driven from
PRISM-side TypeScript via `HyperCADSElectrodeEngine`.

## Install

### One-shot (recommended)

Copy the add-in into hyperCAD-S's user plugin directory:

```powershell
$src  = "H:\PRISM\resources\OPEN MIND\hyperCAD-S\prism_hypercads_addin.py"
$dest = "$env:APPDATA\OPENMIND\hyperCAD-S\31.0\Plugins\PRISM"
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item $src $dest -Force
Write-Host "Installed → $dest\prism_hypercads_addin.py"
```

### Dependency (one-time)

The add-in talks back to PRISM over WebSocket. Install the client lib
into the hyperCAD-S Python environment:

```powershell
& "H:\PRISM\resources\OPEN MIND\Shared\31.0\python\python.exe" -m pip install "websocket-client>=1.8"
```

(If `python.exe` isn't there, hyperCAD-S 31.0 ships its own Python under
`H:\PRISM\resources\OPEN MIND\Shared\31.0\python\` — use that interpreter
so the install lands in the right `site-packages`.)

### Verify

1. Start the PRISM Communication Hub: `ws://localhost:7421/inhost/hypercads`
2. Launch hyperCAD-S from the desktop launcher.
3. hyperCAD-S discovers the plugin at startup — a **PRISM** tab should appear.
4. In the PRISM-side terminal:

   ```bash
   cd H:/PRISM/mcp-server && npx vitest run HyperCADSElectrodeEngine
   ```

5. Drive a real op end-to-end from PRISM:

   ```ts
   import { hyperCADSElectrodeEngine } from "mcp-server/src/engines/HyperCADSElectrodeEngine.js";
   await hyperCADSElectrodeEngine.pickHolder({ library: "Erowa_s", zHeightMm: 60 });
   ```

   You should see a holder loaded in the live hyperCAD-S session.

## Architecture (end-to-end flow)

```
PRISM-side                                                          Host-side (inside hyperCAD-S)
──────────                                                          ─────────────────────────────
hyperCADSElectrodeEngine.pickHolder({...})
  └─→ buildElectrodeScript() emits Python snippet
       └─→ HyperCADSLiveBridgeEngine.executeRaw(code)
            └─→ HyperCADSCodeGeneratorEngine.executeScript()
                 └─→ HTTP POST loopback :18341 /execute
                      └─→ HyperMillACBridgeEngine receives, spawns Python
                           └─→ Python interpreter (hyperCAD-S resident)
                                └─→ import prism_hypercads_addin       ← THIS FILE
                                     └─→ addin.dispatch(state, envelope)
                                          └─→ handle_electrode_op()
                                               └─→ om.cad.electrode.pick_block_holder(**args)
                                                    └─→ ✓ holder loaded in hyperCAD-S
```

## Offline validation (no hyperCAD-S needed)

The pytest companion exercises catalog validators, dispatcher routing,
counter state, and adversarial inputs — none of which need `om.cad`:

```bash
cd "H:/PRISM/resources/OPEN MIND/hyperCAD-S"
python -m pytest test_prism_hypercads_addin.py -v
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "om.cad not available" at runtime | Add-in loaded outside hyperCAD-S | Install under `%APPDATA%\OPENMIND\hyperCAD-S\31.0\Plugins\PRISM\` |
| "websocket-client not installed" | Wrong Python interpreter used `pip` | Re-run `pip install` using `OPEN MIND\Shared\31.0\python\python.exe` |
| Hub connection refused | PRISM Communication Hub not running | Start `mcp-server` first (port 7421) |
| Unknown holder library | Spelling mismatch — Erowa**_s** with underscore | Use exact names from the catalog: `Erowa_r`, `Erowa_s`, `System-3R_r`, `System-3R_s` |
| Non-standard Z height rejected | Catalog enforces sizes 20/40/60/80/100/150/200/250/300mm | Use a standard size, or extend `HOLDER_Z_HEIGHTS_MM` in both `prism_hypercads_addin.py` AND `HyperCADSElectrodeEngine.ts` |
| Unknown orbit "Sink and sphere" | Vendor spells it `Sink and shpere` (typo preserved) | Use the exact vendor spelling |

## Cross-references

- PRISM-side bridge: `mcp-server/src/engines/HyperCADSLiveBridgeEngine.ts`
- PRISM-side electrode engine: `mcp-server/src/engines/HyperCADSElectrodeEngine.ts`
- PRISM-side codegen: `mcp-server/src/engines/HyperCADSCodeGeneratorEngine.ts`
- AC HTTP server: `mcp-server/src/engines/HyperMillACBridgeEngine.ts` (already services hyperCAD-S)
- Fusion 360 sibling: `resources/fusion360/prism-test-runner/index.js`
- hyperMILL sibling: `resources/HYPERMILL/prism_test_runner.py`
- Electrode catalogs: `H:/PRISM/resources/OPEN MIND/hyperCAD-S/31.0/hyperCAD-S/files/electrode/*.xml`
- Milestone: `CAD-FUSION-LIVE-MS0 / U-HCS-ADDIN` (branch `cad-fusion-live-ms0`)
