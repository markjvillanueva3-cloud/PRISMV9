# PRISM ↔ Hurco WinMax Automation Bridge — Design (slot:echo, 2026-05-30)

**Operator ask:** build a system for echo to *drive WinMax*, the same way delta drives CAD/CAM software.

## How delta drives CAD/CAM (the pattern we mirror)
Delta ships a `<Software>AutomationBridge.ts` engine per app (`MastercamAutomationBridge`, `HyperMILLAutomationBridge`, `FreeCADAutomationBridge`, `Fusion360LiveBridgeEngine`). Each:
1. **Spawns the app with a documented hook + IPC** — e.g. `Mastercam.exe -runchook MastercamNetHook.dll` over a named pipe `\\.\pipe\prism-mcam-{pid}`; Esprit via VBScript COM.
2. **Dispatches JSON commands** over that channel; composes existing domain engines (no logic re-impl).
3. **Mock mode** (`PRISM_CAD_MOCK=1`) bypasses spawn/IPC → fixture data, so the bridge is **headless-testable**.
4. **Action templates** `cad-action-templates/<platform>.actions.json` map a PRISM atomic op → the app's automation fn + args.
5. **source → regen → compare** loop (`state/shared/cad-regen-output/`): drive the app, capture its output, diff vs source.

## The honest difference for WinMax (R12)
Mastercam has a NET-Hook DLL; Esprit has VBScript COM. **WinMax has NO documented public automation API.** So we mirror delta's *architecture* (AutomationBridge + actions.json + mock mode + AtomicValue + compose post engines) but the *transport* is different — discovered by `scripts/winmax-probe.mjs` (read-only; `SURFACE-PROBE.json`):

| Transport | Evidence | Feasibility |
|-----------|----------|-------------|
| **wcf** (primary) | `WcfDataService.exe` → **net.tcp ONLY** | live but .NET-binary — see LIVE PROBE below |
| **datablock-xml** | `WinMaxDataBlockXMLTools.dll` (453 KB) — program ↔ XML | needs a .NET host to invoke; good for data extraction |
| **ui-automation** | `WinMaxMill.exe` Qt GUI | UIA/pywinauto fallback; operator-supervised |
| **local** | none needed | our own `ncToDatablocks` interpretation — **always available, tested** |

### LIVE PROBE RESULT (2026-05-30, WinMax stack running) — CORRECTS the earlier "http:8080 primary" note (R12)
With `WcfDataService.exe` (PID 75456) running, `netstat` + HTTP fetches proved:
- **net.tcp:4502 (+4503-4505, +808) is LIVE + reachable** — endpoint `net.tcp://localhost:4502/DataServicetcp`, contract `WcfDataServices.IDataService` (`netTcpBinding`), mex at `…/DataServicetcp/mex`. Also `net.pipe://localhost/DataService/DataServicePipe`.
- **The HTTP SOAP + mex endpoints in `WcfDataService.exe.config` (`http://localhost:8080/DataService`, `http://localhost:80/`) are NOT hosted** — nothing listens on :80/:8080 (the desktop sim enables only net.tcp + net.pipe). So **there is NO HTTP WSDL to fetch** — a node-only SOAP client is not possible.
- net.tcp WCF = .NET binary protocol ([MC-NMF] framing + [MC-NBFS] binary SOAP). **No `dotnet`/`svcutil`/.NET SDK is installed on this machine** → can't generate a proxy or run a ChannelFactory client today.
- ⇒ Driving the live WCF requires EITHER (a) install .NET SDK → `dotnet-svcutil net.tcp://localhost:4502/DataServicetcp/mex` → a tiny C# shim (`ChannelFactory<IDataService>`) that bridges net.tcp ⇄ this node bridge (clean, real, mirrors how delta uses each app's native API), OR (b) implement [MC-NMF]+[MC-NBFS] in node (large, no contract without mex first), OR (c) pivot to UI-automation / a transfer-folder import (no .NET, but brittle / load-only).

## Architecture (built)
- **`scripts/winmax-bridge.mjs`** — the bridge: `WinMaxBridge.execute(action, params)` over a pluggable transport, `AtomicValue` returns (`{value, confidence, source, warning}`), **mock-by-default** (`PRISM_WINMAX_MOCK`, mirrors delta's mock). The delta source→interpret→compare loop is `ncToDatablocks(nc)` (our interpretation, tested) + `compareDatablocks(ours, winmax)` (diff). `probeWcfLive()` fetches the WCF WSDL when the stack is up.
- **`winmax.actions.json`** — the op→fn map (mirrors delta's `*.actions.json`), 7 ops, transport per op.
- **`scripts/winmax-probe.mjs`** — read-only surface discovery (never launches WinMax).
- **`scripts/winmax-bridge.test.mjs`** — 11 tests: ncToDatablocks on the real sample NC, compare, mock execute, live-fails-loud, adversarial.

## Safety boundary (load-bearing)
- The bridge **NEVER auto-launches** `WinMaxMill.exe` / `CNC_RT.exe` — launching the GUI + RT services on the operator's machine is an outward-facing action.
- A live transport (`wcf`/`ui-automation`) with no running stack returns an `AtomicValue` **warning** (`confidence 0`), **never a fabricated result**. Verified by test.
- The probe is strictly read-only.

## To go live (CORRECTED + PROVEN 2026-05-30 — chose option (a), built it to the credential gate)
0. **DECISION (operator):** chose **(a) install .NET SDK → C# shim** (recommended — clean + real). ✅ DONE.
1. **U-WINMAX-WCF-MAP** ✅ DONE — installed .NET 8 SDK (`C:\Users\wompu\.dotnet`) + `dotnet-svcutil net.tcp://localhost:4502/DataServicetcp/mex` → the REAL `IDataService` (23 ops) at `wcf-client/WinMaxDataService.cs`. **Earlier guessed op names (LoadProgram/GetProgramBlocks) DO NOT EXIST** — the real contract is a SID (System-ID) data-point bus. Full map: `wcf-client/CONTRACT.md`.
2. **U-WINMAX-WCF-CLIENT** ✅ BUILT (one gate from live) — `wcf-client/PrismWinMaxShim.exe` (**net48** — modern .NET WCF can't do `SecurityMode.Message`), JSON-over-stdio, read-only-by-default + motion-gated. **Proven against live WinMax through every binding layer** (message security ✅, server cert trust ✅, DNS identity `machine-connect.hurco.com` ✅). The ONLY remaining gate is a valid **Hurco Vendor ID** — the custom `VendorIdValidatorReadWrite` rejected dummy creds. That credential is an operator/Hurco licensing step, not a code gap. See `wcf-client/CONTRACT.md` §"the onion".
3. **U-WINMAX-XML** — host `WinMaxDataBlockXMLTools.dll` (.NET shim) for program↔XML extraction → WinMax's datablocks for the compare loop. (Likely superseded by `GetBulkByXML`/`GetCurrentGraphicsProgram` on the WCF shim once a Vendor ID is in hand.)
4. **U-WINMAX-UIA** — pywinauto/UIA fallback for actions not on WCF (file>open, run sim, save).
5. **U-WINMAX-WCF-WIRE** — wire `winmax-bridge.mjs` `wcf` transport to spawn `PrismWinMaxShim.exe --serve` (mechanical; no WinMax-live needed). Then enumerate the SID name dictionary and map reads → datablock compare.
6. Wire as a `WinMaxAutomationBridge.ts` engine (mirroring `MastercamAutomationBridge.ts`) → `prism_cam`/`pp` dispatcher, once the worktree build is healthy.

## Status
- **LIVE now (tested, headless):** `local` transport — `ncToDatablocks` + `compareDatablocks` + the mock executor. We can parse any emitted NC into the WinMax datablock model and diff two programs today.
- **BUILT, one credential from live:** the `wcf` transport — `wcf-client/PrismWinMaxShim.exe` speaks WinMax's exact net.tcp Message binding end-to-end; reaches the VendorId validator. Supply `--user <VENDOR_ID> --pass <SECRET>` (or env `WINMAX_VENDOR_ID`/`WINMAX_VENDOR_SECRET`) to go live.
- **Not yet wired:** `winmax-bridge.mjs` `wcf` transport still returns a LOUD warning (never fabricates) — spawning the shim is the next mechanical unit (step 5). `datablock-xml` / `ui-automation` remain future fallbacks.
