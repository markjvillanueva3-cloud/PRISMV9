# OPEN MIND ACServer Bridge Audit — 2026-05-20

> Slot=echo, claude-3db3fb3d. Followup to `CAD-PIPELINE-AUDIT-2026-05-20.md`
> after operator pushback: "for drawing machine parts in the setup assembly,
> isn't hyperCAD-S the right tool — and don't we already have the bridge?"
>
> This audit reads every existing HyperMillAC* / HyperCADS* engine on disk and
> reports which are working, scaffold, mock, or absent. Verdict drives whether
> Route A (hyperCAD-S setup-first) can be made the V2 spec's default path.
>
> Advisory. Read-only audit; no engine modifications.

## Headline verdict — the bridge is ~40-50% built

| Layer | What it does | Status | Verifier |
|---|---|---|---|
| TS script generator | Produces AC Python script strings (import/heal/analyze) | **REAL** — 475 LOC in HyperCADSAutomationEngine | Read mcp-server/src/engines/HyperCADSAutomationEngine.ts:329-466 |
| TS bridge composer | Chains validate→import→heal scripts | **REAL** — PrintToHyperCADSBridge.ts | Read mcp-server/src/engines/PrintToHyperCADSBridge.ts:1-80 |
| TS macro emitter | Plans + renders HyperCAD-S macro scaffold (dotted-uppercase) | **REAL but dry-run only** — operator pastes into HyperCAD-S Macro Editor manually | Read mcp-server/src/engines/HyperCADCADExecutionBridge.ts:1-80 (explicit: "No live MCP-style remote endpoint exists for HyperCAD-S") |
| TS TCP probe | Verifies AC host:port reachable (default 127.0.0.1:18365) | **REAL** — does TCP connect+disconnect, no AC handshake | Read mcp-server/src/engines/HyperMillACConnectionManager.ts:133-153 |
| TS Python spawner | `python -c <script>` with PRISM_AC_HOST/PORT env, timeout, captured stdout/stderr | **REAL** | Read mcp-server/src/engines/HyperMillACScriptExecutor.ts:75-130 |
| TS server config | Port (18365), bind (127.0.0.1), CORS, routes, validation | **CONFIG ONLY — no HTTP server impl** | Read mcp-server/src/engines/HyperMillACServerConfig.ts:1-215 (215 lines = 100% types + constants + validators, zero runtime) |
| Test fixtures | Deterministic mock responses for CI | **MOCK** by design, explicit | Read mcp-server/src/engines/HyperCADSMockLayer.ts:1-50 (explicit: "set HYPERMILL_MOCK=false for production") |
| **AC companion HTTP server** | The actual HTTP server that ACServerConfig configures | **MISSING** — file referenced as `HyperMillACBridge*.ts` (E1144) does not exist | `Glob H:/prism/mcp-server/src/engines/HyperMillACBridge*.ts` → 0 hits |
| **HyperMillAutomationBridge** | Referenced by HyperMillACConnectionManager docs as the consumer | **MISSING** | `Glob H:/prism/mcp-server/src/engines/HyperMillAutomationBridge*.ts` → 0 hits |
| **prism_ac Python module** | Host-side Python module the ACScriptExecutor invokes via `import prism_ac` | **NOT IN THIS REPO** — must be installed on the hyperMILL host machine | Read mcp-server/src/engines/HyperMillACScriptExecutor.ts:83-89 (env passes PRISM_AC_HOST/PORT — assumes a Python lib that reads them) |
| Real AC session handshake | Open authenticated session beyond TCP probe | **MISSING** — script comment: "Full AC session handshake is the responsibility of the script executor" but the executor doesn't do it either | Read mcp-server/src/engines/HyperMillACConnectionManager.ts:7-11 |

## What the architecture is supposed to be (from the existing TS code's docstrings)

```
PRISM (TS, this repo)
  ↓ HyperCADSAutomationEngine.generateImportScript() returns Python string
  ↓ HyperMillACScriptExecutor.execute(pythonString)
  ↓ spawns: python -c <pythonString>  (with PRISM_AC_HOST/PORT env)
  ↓
Python subprocess (host machine)
  ↓ import hm           — OPEN MIND hyperCAD-S/hyperMILL automation library (bundled with the app)
  ↓ import prism_ac     — PRISM's Python module — DOES NOT EXIST IN THIS REPO
  ↓ talks over local TCP to AC
  ↓
hyperMILL Automation Center (running on the host)
  ↓ drives hyperCAD-S / hyperMILL
```

**The TS layer is roughly complete. The Python layer + the AC companion HTTP
server are the missing halves.**

## What's NEEDED to ship a working setup-first bridge (Route A)

### Track 1: PRISM-side TS work (smaller — ~600-1000 LOC)
1. **`HyperMillACBridgeEngine.ts`** (referenced as E1144 by the config, does not exist) — actual HTTP server implementing `/status` `/execute` `/job-status` `/extract` `/optimize` routes per `HyperMillACServerConfig`. Loopback-only, CORS-restricted to hyperCAD-S panel origins. ~300 LOC.
2. **`HyperMillAutomationBridge.ts`** (referenced, does not exist) — the orchestrator that composes ConnectionManager + ScriptExecutor + AutomationEngine into a single async `drive()` API. ~200 LOC.
3. **Real AC session handshake** in `HyperMillACConnectionManager` — not just TCP probe; actually open an AC session, store the session token, propagate to script env. ~50 LOC patch.
4. **Round-trip E2E test** that exercises the full path in mock mode plus a SKIPPED integration test scaffolded to run when `PRISM_HYPERMILL_LIVE=1` is set. ~150 LOC.
5. **`prism_cam:hypermill_drive` dispatcher action** wiring the AutomationBridge into the dispatcher with Zod schema + action enum + lazy import. ~50 LOC across 3 files.

### Track 2: Host-side Python work (smaller, separate repo — ~150 LOC)
1. **`prism_ac` Python module** — installed on each hyperMILL host. Imports the OPEN MIND `hm` library, reads `PRISM_AC_HOST`/`PORT` env, exposes the operations the TS side expects (`open_project`, `export_step`, `import_step`, `heal_geometry`, `analyze`, `generate_cam`, `simulate`, `post_process`). Returns structured JSON to stdout.
2. **Installer / version-pin script** that the operator runs once per hyperMILL workstation to drop `prism_ac` into the right Python path.

### Track 3: Operator gates
1. **License check on first connect** — confirm the host has a hyperMILL license active before any operation runs.
2. **AC version compatibility matrix** — `prism_ac` vs hyperMILL version (the existing engines reference v33.0; need to formalize a compat matrix).

## What this means for the original CAD audit conclusion

The CAD-PIPELINE-AUDIT's F1 (Fusion 360 wins) was correct **given today's state**: Fusion 360's `:18360` live bridge is the only working socket-style PRISM↔CAD live bridge. HyperCAD-S has script-generator + dry-run macro emitter but NO live remote endpoint.

If Track 1 + Track 2 above ship, the comparison flips for the setup-first workflow:
- Fusion 360 lives on `:18360` with the Autodesk MCP connector
- hyperCAD-S would live on `:18365` (ACServer) with PRISM-owned plumbing
- For machining-first work where target CAM is hyperMILL, hyperCAD-S becomes the right default because the assembly IS the setup (no STEP round-trip, no GD&T propagation gap)

## Estimated work to make Route A the default

- Track 1 (TS): one focused session, ~600-1000 LOC across 5 new/modified files with per-file scrutiny gates per CLAUDE.md
- Track 2 (Python): separate small repo, ~150 LOC, one session
- Track 3 (operator gates): can ride along with Track 1

**Total to flip Route A from "dry-run only" to "production setup-first": ~2 sessions of focused work + one host-side Python install per workstation.**

## Verification commands (PowerShell-safe)

```powershell
# Confirm the TS-side scaffolding exists
node H:/prism/scripts/cad-pipeline-coverage-scorer.mjs --json | jq '.matrix.hypermill.CAM_TRANSFER'

# Confirm the named "live bridge" engines DON'T exist
node -e "console.log(require('fs').existsSync('H:/prism/mcp-server/src/engines/HyperMillACBridgeEngine.ts'))"
node -e "console.log(require('fs').existsSync('H:/prism/mcp-server/src/engines/HyperMillAutomationBridge.ts'))"
# both should print: false

# Confirm the script-generator engines DO exist
node -e "console.log(require('fs').existsSync('H:/prism/mcp-server/src/engines/HyperCADSAutomationEngine.ts'))"
node -e "console.log(require('fs').existsSync('H:/prism/mcp-server/src/engines/PrintToHyperCADSBridge.ts'))"
# both should print: true
```

## Honest caveats

- I read 7 of the ~10 ACServer/HyperCAD-S engines in detail. Three I read header-only or relied on file size (StandardToolDBEngine, CodeGeneratorEngine, StockModelEngine, FunctionIndexEngine). The "MISSING" verdicts are solid (Glob confirms no file); the "REAL" verdicts on the read-in-detail engines are solid; verdicts on the header-only engines should be re-verified before committing to a build plan.
- The `prism_ac` Python module's "missing" status is an inference from the TS code referencing `import prism_ac` in spawned subprocess scripts. It MAY exist in a sibling repo I haven't looked at; if it does, the gap is smaller. The operator should confirm before sizing Track 2.
- ACServer config defaults to port 18365 (loopback). The CAD-PIPELINE-AUDIT memo `reference_cad_software_pipeline_recommendation` lists Fusion 360's live bridge on `:18360` — these are different ports, no conflict.

## See also

- `state/shared/specs/CAD-PIPELINE-AUDIT-2026-05-20.md` — the parent audit (Fusion 360 vs others)
- `state/shared/specs/PRINT-TO-INSPECTION-PIPELINE-V2.md` — pipeline spec (about to be amended with Route A)
- `mcp-server/src/engines/HyperMillACConnectionManager.ts` — the TCP probe layer
- `mcp-server/src/engines/HyperMillACScriptExecutor.ts` — the Python subprocess layer
- `mcp-server/src/engines/HyperMillACServerConfig.ts` — the (config-only) HTTP server spec
- `mcp-server/src/engines/HyperCADSAutomationEngine.ts` — the AC Python script generator
- `mcp-server/src/engines/HyperCADCADExecutionBridge.ts` — the operator-paste-in macro emitter
