# hyperCAD-S Live-Test Playbook — 2026-05-20

> For the operator testing the ACServer bridge against a real hyperMILL /
> hyperCAD-S installation with a valid USB license dongle.
>
> Built this session: ACServer HTTP companion server + Python host module +
> dispatcher actions. Peer reviewer dispatched (agent a4553ad14430ed1b4) —
> address any P0/P1 findings before running on the real machine.

## Pre-flight (10 min) — on the hyperMILL workstation

### 1. Confirm Python is reachable

```powershell
python --version            # expect 3.7+
python -c "import sys; print(sys.path)"
```

### 2. Install the `prism_ac` Python module

```powershell
cd <prism-repo>\mcp-server\python
pip install -e .
```

`find_packages()` in `setup.py` auto-picks up `prism_ac/`. Verify install:

```powershell
python -c "import prism_ac; import json; print(json.dumps(prism_ac.ping(), indent=2))"
```

**Expected (no hyperMILL running yet — TCP probe will fail but module loads):**
```json
{ "ok": false, "error": "ac_unreachable", "detail": "127.0.0.1:18365 — ..." }
```

OR with the `hm` module not yet installed by the OPEN MIND setup:
```json
{ "ok": true, "protocol_version": 1, "mock": true, "hm_available": false, "hm_import_error": "ModuleNotFoundError: ..." }
```

If you see `ImportError: cannot import name 'prism_ac'` — install failed; re-check pip output.

### 3. Confirm hyperMILL Automation Center is reachable

Launch hyperMILL with your USB key inserted. In hyperMILL: `Tools → Automation Center → Enable Remote` (or equivalent — Open Mind docs name this differently across versions). Confirm AC listens on `127.0.0.1:18365` (the PRISM default — change via `PRISM_AC_PORT` env if Open Mind uses a different port on your install).

```powershell
# TCP-probe AC port — should succeed when AC is enabled
Test-NetConnection -ComputerName 127.0.0.1 -Port 18365 -InformationLevel Quiet
```

### 4. Verify the `hm` module is importable inside Python

OPEN MIND ships the `hm` automation library with hyperMILL. The install puts it
on the workstation's Python path. Verify:

```powershell
python -c "import hm; print(getattr(hm, '__version__', 'unknown'))"
```

If `ImportError: No module named 'hm'` — Open Mind's automation API isn't on
the path. Fix per Open Mind documentation (typically a `PYTHONPATH` env var
pointing at their install directory) BEFORE proceeding.

## Tier 1 — Mock-mode smoke test (no machine needed)

```powershell
$env:PRISM_CAD_MOCK = "1"
cd <prism-repo>\mcp-server
npm run build:fast
npx vitest run src/__tests__/HyperMillACBridgeEngine.test.ts
```

**Expected:** all happy-path + failure-mode + adversarial tests pass.
The `LIVE` describe block stays SKIPPED (gated on `PRISM_HYPERMILL_LIVE=1`).

## Tier 2 — Live-test single round-trip

Once Tier 1 passes AND your hyperMILL workstation has AC enabled:

```powershell
Remove-Item Env:PRISM_CAD_MOCK -ErrorAction SilentlyContinue
$env:PRISM_HYPERMILL_LIVE = "1"
npx vitest run src/__tests__/HyperMillACBridgeEngine.test.ts -t "LIVE"
```

**Expected:** the previously-skipped `LIVE` block runs and the `ping` round-trip
returns `ok: true, ac_reachable: true, hm_available: true`.

If it fails — read the captured `stderr` field from the job-status response;
common failures:
- `ac_unreachable` — AC isn't listening on 18365 (re-check step 3 above)
- `prism_ac module not installed on host` — pip install didn't take effect on the Python that PRISM is spawning (`python --version` vs `where.exe python`)
- `hm_open_failed` — license check failed; verify USB key is inserted + hyperMILL is running

## Tier 3 — Dispatch through the MCP layer (end-to-end)

The dispatcher actions wired this session:

```text
cam_hypermill_drive                — calls peer-shipped HyperMILLAutomationBridge (op-discriminated)
cam_hypermill_ac_bridge_start      — starts the loopback HTTP server (port 18365)
cam_hypermill_ac_bridge_stop       — stops it
cam_hypermill_ac_bridge_status     — reports running + job list
```

### 3a. Start the HTTP companion server

```javascript
// from any MCP client / Claude session
await prism_cam.cam_hypermill_ac_bridge_start({});
// → { ok: true, serverUrl: "http://127.0.0.1:18365", message: "started" }
```

### 3b. Drive: open a real .hmc file

```javascript
await prism_cam.cam_hypermill_drive({
  op: "open",
  file_path: "C:\\Users\\<you>\\hypermill_projects\\test_part.hmc"
});
// → { value: { filePath: "...", format: ".hmc", sessionId: "hm-..." }, confidence: 0.95, source: "hypermill-ac" }
```

### 3c. Drive: pull the geometry summary

```javascript
await prism_cam.cam_hypermill_drive({ op: "geometry" });
// → { value: { curves: [...], surfaces: [...], solids: [...], totalEntities: N }, confidence: 0.95, source: "hypermill-ac" }
```

### 3d. Drive: pull the operation tree

```javascript
await prism_cam.cam_hypermill_drive({ op: "operation_tree" });
// → { value: { jobs: [...], totalOperations: N }, confidence: 0.95, source: "hypermill-ac" }
```

### 3e. Drive: export STEP for PRISM analysis

```javascript
await prism_cam.cam_hypermill_drive({
  op: "export_step",
  output_path: "C:\\temp\\test_part_prism_export.stp"
});
// → { value: { outputPath: "...", format: "STEP AP242" }, confidence: 0.95, ... }
```

### 3f. Drive: close

```javascript
await prism_cam.cam_hypermill_drive({ op: "close" });
// → { value: { closed: true, sessionClosed: true }, confidence: 1.0, ... }
```

### 3g. Stop the HTTP server

```javascript
await prism_cam.cam_hypermill_ac_bridge_stop({});
// → { ok: true, message: "stopped" }
```

## Tier 4 — Route A end-to-end (when V2 orchestrator ships)

Not yet built this session — see `PRINT-TO-INSPECTION-PIPELINE-V2.md` "V2
delta — NET-NEW ORCHESTRATION" section. The 7-item orchestrator is the next
session's work. Tier 3 above gives you raw drive() access in the meantime.

## Diagnostics — what to check if something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| `ac_unreachable` on Tier 2 | AC not enabled in hyperMILL | Tools → Automation Center → Enable Remote |
| `prism_ac module not installed` | pip installed against wrong Python | `where.exe python` + `where.exe pip` — confirm same prefix |
| `hm_open_failed` | License dongle removed or hyperMILL not running | Check USB key + relaunch hyperMILL |
| `payload_too_large` | NC content > 1 MB | Split program OR raise the BridgeEngine's 1MB cap (it's intentional — operator can override) |
| `503 max_concurrent` | More than 4 parallel script execs | Default cap is 4; sequence calls OR raise via HyperMillACServerConfig.maxConcurrent |
| TS dispatcher rejects unknown action | Build wasn't rerun after this session's enum-additions | `npm run build:fast` |
| HTTP bridge binds 0.0.0.0 | Someone overrode `host` in the engine config | The validator MUST reject this; if it didn't, that's a P0 — file a bug |

## What WASN'T built this session (deferred)

- **V2 orchestrator** (`PrintToInspectionOrchestratorEngine` or equivalent extension to `PrintToProgramPipelineEngine`) — Route A + Route B selector, the 7-item delta described in V2 spec.
- **Audit registry with 2-day lifecycle** — separately queued from earlier in the session.

Both are independent of the test-against-your-key path. The substrate this
session built supports the operator running the full chain via the
`cam_hypermill_drive` action without the V2 orchestrator.

## Verification commands (re-run after any change)

```powershell
# Confirm both new engine files exist
node -e "console.log(require('fs').existsSync('H:/prism/mcp-server/src/engines/HyperMillACBridgeEngine.ts'))"
# → true

node -e "console.log(require('fs').existsSync('H:/prism/mcp-server/python/prism_ac/__init__.py'))"
# → true

# Confirm dispatcher has the 4 new actions
node -e "const f=require('fs').readFileSync('H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts','utf8'); console.log(['cam_hypermill_drive','cam_hypermill_ac_bridge_start','cam_hypermill_ac_bridge_stop','cam_hypermill_ac_bridge_status'].every(a => f.includes('\"' + a + '\"')))"
# → true

# Confirm action has a case handler (not just enum entry)
node -e "const f=require('fs').readFileSync('H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts','utf8'); console.log(['case \"cam_hypermill_drive\"','case \"cam_hypermill_ac_bridge_start\"','case \"cam_hypermill_ac_bridge_stop\"','case \"cam_hypermill_ac_bridge_status\"'].every(c => f.includes(c)))"
# → true

# Build check (fast)
cd H:/prism/mcp-server; npm run build:fast
# → should compile clean

# Mock-mode test (no hyperMILL needed)
$env:PRISM_CAD_MOCK="1"; npx vitest run src/__tests__/HyperMillACBridgeEngine.test.ts
# → all non-LIVE tests pass
```

## See also

- `state/shared/specs/ACSERVER-BRIDGE-AUDIT-2026-05-20.md` — what was missing before this session + what's still pending
- `state/shared/specs/PRINT-TO-INSPECTION-PIPELINE-V2.md` — pipeline spec (Route A depends on what was just built)
- `mcp-server/src/engines/HyperMillACBridgeEngine.ts` — HTTP server (new)
- `mcp-server/src/engines/HyperMillAutomationBridge.ts` — peer-shipped orchestrator (used unchanged)
- `mcp-server/python/prism_ac/__init__.py` — host-side Python module (new)
- `mcp-server/src/tools/dispatchers/camDispatcher.ts` — 4 new action handlers (edit)
