# CAM Live-Test Playbook — 2026-05-28

> For the operator testing PRISM's CAM bridges against real hyperMILL / Mastercam X8 / Fusion 360 installs with valid licenses.
>
> **Methodology mirror:** delta's `HYPERCAD-TEST-PLAYBOOK-2026-05-20.md` (Tier 1 mock → Tier 2 live → Tier 3 MCP → Tier 4 orchestrator). Same shape, three platforms.
>
> **Status:** specification; Tier 1 mock-mode tests already pass for HyperMill (`HyperMillACBridgeEngine.test.ts`). Tier 2-4 are operator-action.

---

## Pre-flight checklist (one-time, per workstation)

- [ ] PowerShell 5.1+ available (default on Win 10/11)
- [ ] Node 22 reachable from `H:/.claude/bin/portable-node`
- [ ] Python 3.7+ on PATH for hyperMILL host module + .f3d batch extraction
- [ ] Workstation has the CAM software installed + license dongle inserted (per platform)
- [ ] PRISM repo present at `H:/prism-slot-kilo` (or sibling)

---

## Platform A — HyperMill / HyperCAD-S

### A1. Confirm `prism_ac` Python module reachable

```powershell
cd H:/prism-slot-kilo/mcp-server/python
pip install -e .
python -c "import prism_ac; import json; print(json.dumps(prism_ac.ping(), indent=2))"
```

**Expected (no hyperMILL running yet):**
```json
{ "ok": false, "error": "ac_unreachable", "detail": "127.0.0.1:18365 — ..." }
```

### A2. Enable Automation Center in hyperMILL

Launch hyperMILL with USB key inserted → `Tools → Automation Center → Enable Remote`. Confirm AC listens on `127.0.0.1:18365`.

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 18365 -InformationLevel Quiet
```

### A3. Tier 1 — Mock-mode smoke test (no machine needed)

```powershell
$env:PRISM_CAD_MOCK = "1"
cd H:/prism-slot-kilo/mcp-server
npm run build:fast
npx vitest run src/__tests__/HyperMillACBridgeEngine.test.ts
```

**Expected:** all happy-path + failure-mode + adversarial tests pass; `LIVE` describe block SKIPPED.

### A4. Tier 2 — Live single round-trip (closes delta MISC-305 analog)

```powershell
Remove-Item Env:PRISM_CAD_MOCK -ErrorAction SilentlyContinue
$env:PRISM_HYPERMILL_LIVE = "1"
npx vitest run src/__tests__/HyperMillACBridgeEngine.test.ts -t "LIVE"
```

**Expected:** `ping` round-trip returns `ok: true, ac_reachable: true, hm_available: true`.

### A5. Tier 3 — MCP-driven (operator from a Claude session)

```javascript
await prism_cam.cam_hypermill_ac_bridge_start({});
await prism_cam.cam_hypermill_drive({ op: "open", file_path: "<test.hmc>" });
await prism_cam.cam_hypermill_drive({ op: "geometry" });
await prism_cam.cam_hypermill_drive({ op: "operation_tree" });
await prism_cam.cam_hypermill_drive({ op: "export_step", output_path: "<step.stp>" });
await prism_cam.cam_hypermill_drive({ op: "close" });
await prism_cam.cam_hypermill_ac_bridge_stop({});
```

### A6. Tier 4 — Adaptive-pipeline orchestrator (when `U-ADAPTIVE-PIPELINE-ORCH` ships)

Drive ONE JM Die part end-to-end. Recommended candidates from `H:/PRISM/JM DIE/OKUMA/JM Die Company/`:
- `.hmc` flagship from VALLEY FASTENER or SFS subfolders.

Expected output: `{detections, sequence, machine_pick, stock_size, workholding, tools, post_emit, setup_sheet, outcome_ledger_id}`.

---

## Platform B — Mastercam X8

> **Status:** PRISM has zero platform-specific bridge engines for Mastercam today (per F2 of `CAM-PIPELINE-AUDIT-2026-05-28.md`). This playbook section is the **spec for `U-MASTERCAM-VBSCRIPT-DRIVE`**, not a live-runnable today.

### B1. Pre-flight — confirm Mastercam X8 install + VBScript surface

```powershell
Test-Path "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/vb/RunCommand.vbs"
# → True (confirmed 2026-05-27)
Test-Path "H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/chooks/"
# → True (C-Hook .EQN macros present)
```

### B2. Tier 1 — Mock-mode (planned, when `MastercamVBScriptBridgeEngine` ships)

```powershell
$env:PRISM_CAM_MOCK = "1"
npx vitest run src/__tests__/MastercamVBScriptBridgeEngine.test.ts
```

### B3. Tier 2 — Live single round-trip (requires Mastercam X8 launched with dongle)

Recommended ops for first wet-run:

1. **Open `.mcx-8`** — wrap `RunCommand.vbs` to invoke Mastercam's File-Open dialog programmatically OR use C-Hook `LoadFile()`.
2. **Pull geometry summary** — VBScript can query the active Mastercam document for entity counts + bbox.
3. **Export STEP for PRISM analysis** — Mastercam's built-in STEP exporter accessible via Workspace API.

### B4. Tier 3 — MCP-driven

```javascript
// AFTER U-MASTERCAM-VBSCRIPT-DRIVE ships:
await prism_cam.cam_mastercam_drive({ op: "open", file_path: "<test.mcx-8>" });
await prism_cam.cam_mastercam_drive({ op: "geometry" });
await prism_cam.cam_mastercam_drive({ op: "operation_tree" });
await prism_cam.cam_mastercam_drive({ op: "export_step", output_path: "<step.stp>" });
await prism_cam.cam_mastercam_drive({ op: "close" });
```

### B5. Tier 4 — Adaptive-pipeline (post-orchestrator-ship)

Drive ONE JM Die Mastercam part end-to-end. Recommended candidates: `H:/PRISM/JM DIE/CNC MILL HAAS/**/*.mcx-8` (ATF, TAPTITE, CONTINENTAL MIDLAN customer families).

---

## Platform C — Fusion 360

### C1. Pre-flight — confirm socket-bridge listener

```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 18360 -InformationLevel Quiet
```

If `False` — Fusion 360 isn't listening yet. Launch Fusion + load the PRISM add-in OR wait for `Fusion360LiveBridgeEngine` to start its socket server.

### C2. Tier 1 — Mock-mode

```powershell
$env:PRISM_CAD_MOCK = "1"
npx vitest run src/__tests__/Fusion360LiveBridgeEngine.test.ts
```

### C3. Tier 2 — Live single round-trip (resolves delta MISC-305)

```powershell
Remove-Item Env:PRISM_CAD_MOCK -ErrorAction SilentlyContinue
$env:PRISM_FUSION_LIVE = "1"
npx vitest run src/__tests__/Fusion360LiveBridgeEngine.test.ts -t "LIVE"
```

**Expected:** `ping` returns `ok: true, socket_reachable: true, fusion_version: "..."`.

### C4. Tier 2.5 — Offline .f3d feature-tree extract (NO Fusion launch required)

While the live socket is unverified, the **offline path is fully functional**:

```powershell
H:/Tools/python/python.exe H:/prism-slot-kilo/scripts/extract-f3d-feature-trees.py `
    "H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/JM/.25 SALVI WIRE STOP/.25 SALVI WIRE STOP OP1 v1.f3d" `
    --out-dir H:/prism-slot-kilo/state/shared/cad-rev-eng/
```

Or in batch (all 1640 .f3d files):

```powershell
H:/Tools/python/python.exe H:/prism-slot-kilo/scripts/extract-f3d-feature-trees.py `
    --batch "H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/" `
    --out-dir H:/prism-slot-kilo/state/shared/cad-rev-eng/
```

**Expected:** per-file JSON dumps of the embedded `model.sqlite` feature tree + CAM operation tree. Output aggregate at `state/shared/cad-rev-eng/f3d-coverage-report.json`.

**This is the answer to operator's "we're posting all programs but it's taking a while"** — the .f3d feature tree contains the CAM operations + parameters directly, no post-processing needed for kilo's training pipeline.

### C5. Tier 3 — MCP-driven via Autodesk MCP

PRISM's `AutodeskFusionMCPProxyEngine` is the JSON-RPC client for Autodesk's Claude connector (released 2026-04-28). Operator setup:

1. Install Autodesk Claude connector per Autodesk docs.
2. From a PRISM Claude session: `await prism_cam.fusion_mcp_proxy({ op: "list_documents" })` etc.

### C6. Tier 4 — Adaptive-pipeline

Drive ONE JM Die Fusion part end-to-end. Recommended candidates: `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/{ELECTRODES, JM, MANNY, OKUMA(1756902819851), ROKU ROKU}/**/*.f3d`.

---

## Diagnostics — what to check if something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| HyperMill `ac_unreachable` on Tier 2 | AC not enabled in hyperMILL | Tools → Automation Center → Enable Remote (then re-run A2 probe) |
| HyperMill `prism_ac not installed` | pip installed against wrong Python | `where.exe python` + `where.exe pip` — confirm same prefix |
| HyperMill `hm_open_failed` | License dongle removed or hyperMILL not running | Check USB key + relaunch hyperMILL |
| HyperMill `payload_too_large` | NC content > 1 MB | Split program OR raise BridgeEngine's 1MB cap |
| Mastercam Tier 2 doesn't exist | No `MastercamVBScriptBridgeEngine` yet | Ship `U-MASTERCAM-VBSCRIPT-DRIVE` first |
| Fusion 360 `socket_unreachable` | PRISM add-in not loaded OR :18360 listener not started | Load PRISM add-in in Fusion → verify with `Test-NetConnection 18360` |
| Fusion 360 .f3d extract fails | `model.sqlite` schema unrecognized | `extract-f3d-feature-trees.py` flags `unknown_schema` honestly — file is not parseable, NOT silently faked |
| Tier 4 orchestrator missing | `U-ADAPTIVE-PIPELINE-ORCH` not shipped yet | Ship that unit first |

---

## Verification commands (re-run after any bridge change)

```powershell
# HyperMill bridge engine + Python module exist
node -e "console.log(require('fs').existsSync('H:/prism-slot-kilo/mcp-server/src/engines/HyperMillACBridgeEngine.ts'))"
node -e "console.log(require('fs').existsSync('H:/prism-slot-kilo/mcp-server/python/prism_ac/__init__.py'))"

# Fusion 360 live bridge engine exists
node -e "console.log(require('fs').existsSync('H:/prism-slot-kilo/mcp-server/src/engines/Fusion360LiveBridgeEngine.ts'))"

# F3D extractor exists + finds .f3d corpus
H:/Tools/python/python.exe H:/prism-slot-kilo/scripts/extract-f3d-feature-trees.py --help
ls "H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/" -Recurse -Filter *.f3d | Measure-Object | Select-Object -ExpandProperty Count

# CAM coverage scorer baseline current
node H:/prism-slot-kilo/scripts/cam-pipeline-coverage-scorer.mjs
```

---

## What WASN'T built this audit cycle (deferred)

- **`U-MASTERCAM-VBSCRIPT-DRIVE`** — Mastercam X8 PRISM bridge (Platform B Tier 2-4 path). Single highest-leverage CAM bridge gap.
- **`U-INVENTOR-LIVE-DRIVE`** — Inventor HSM live socket bridge (analog of Fusion 360).
- **`U-ADAPTIVE-PIPELINE-ORCH`** — outer orchestrator. Tier 4 path for ALL three platforms.
- **`U-F3D-EXTRACT-BATCH-RUN`** — operator-actionable: run the existing `extract-f3d-feature-trees.py` over all 1640 .f3d files NOW. No PRISM build needed.

---

## See also

- `state/shared/specs/CAM-PIPELINE-AUDIT-2026-05-28.md` — this audit's audit doc.
- `state/shared/specs/cam-pipeline-coverage-LATEST.{json,md}` — baseline data.
- `state/shared/specs/CAD-TO-CAM-HANDOFF-CONTRACT-2026-05-28.md` — handoff contract.
- `state/shared/specs/HYPERCAD-TEST-PLAYBOOK-2026-05-20.md` — delta's CAD-side equivalent.
- `mcp-server/src/engines/HyperMillACBridgeEngine.ts` — Platform A bridge.
- `scripts/extract-f3d-feature-trees.py` — kilo-authored .f3d extractor (Platform C Tier 2.5).
