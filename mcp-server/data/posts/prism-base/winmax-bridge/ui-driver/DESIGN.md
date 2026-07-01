# PRISM → WinMax UI Driver (Windows UI Automation) — slot:echo, 2026-05-30

Drive the WinMax GUI directly, the `ui-automation` transport of the WinMax bridge. **No Hurco
Vendor ID needed** — unlike the WCF data service, the UI is the operator's own screen; automating
it is a sanctioned macro. Proven live against `WinMax.exe` (PID 62868) on 2026-05-30.

## How it works (mirrors delta / the WCF shim)
A net48 C# console app (`PrismWinMaxUI.exe`) attaches to the running WinMax window via **Windows
UI Automation** (`System.Windows.Automation`, the OS accessibility tree — present on every Windows
box, no NuGet). It reads/drives controls by stable identifiers + UIA patterns, exposed as a JSON
line protocol for the node bridge — exactly how `../wcf-client` bridges net.tcp.

```
build:  dotnet build PrismWinMaxUI.csproj -c Release -o bin
read:   bin\PrismWinMaxUI.exe --op probe          # full UIA tree → UI-TREE-PROBE.json
        bin\PrismWinMaxUI.exe --op window-info
        bin\PrismWinMaxUI.exe --op find "Tool"     # controls whose name/id contains "Tool"
        bin\PrismWinMaxUI.exe --op get-text <id>
drive:  bin\PrismWinMaxUI.exe --op invoke <id> --allow-actions      # press a softkey/button
        bin\PrismWinMaxUI.exe --op set-value <id> <text> --allow-actions   # type into a field
        bin\PrismWinMaxUI.exe --op sendkeys "{F1}" --allow-actions
serve:  bin\PrismWinMaxUI.exe --serve --allow-actions               # {op,args} JSON lines on stdin
```

## LIVE PROBE FINDINGS (2026-05-30) — how WinMax is actually driven
Window: **"WinMax Mill"**, class `WinMaxTDBClass`, 1734×1399. Tree = **128 nodes, 61 actionable**.

- **F1–F8 softkeys = the primary control surface.** `Button` AutomationIds **`301`–`308`** named `F1`..`F8`. WinMax (like all Hurco controls) is navigated by context-sensitive function-key softkeys — the F-key labels change per screen. **Driving WinMax = `Invoke` the right softkey on the right screen.** This is the spine of any macro (open program, tool setup, run).
- **14 `Edit` fields** — program text + data-entry (tool diameters, offsets, values). Drive with `set-value`.
- **Toolbar items** by id (`Item 329xx`), a program **editor** pane (Find/Replace/zoom/theme), one `MenuBar`/`MenuItem`, `TabItem`, `StatusBar`.
- Patterns available per control (Invoke / Value / ExpandCollapse / Selection) are captured in `UI-TREE-PROBE.json` → that's the selector map for building macros.

## Safety (load-bearing, R12)
- **Read-only by default.** `probe`/`window-info`/`find`/`get-text` never touch input.
- Input injection (`invoke`/`set-value`/`menu`/`sendkeys`) requires **`--allow-actions`** (operator-supervised).
- **Cycle-start / run-program is hard-denied.** Any target matching the motion denylist (cycle start, run program, feed hold, auto start) is REFUSED even with `--allow-actions`, unless `--allow-machine-motion` is passed — which must ONLY be used on the desktop simulator or with the operator watching the machine. UI automation on real hardware MOVES THE MACHINE.
- The driver **attaches** to a running WinMax; it never launches `WinMax.exe`/`CNC_RT.exe`.

## Status + next units (logical order)
- **DONE (proven live):** attach + full UIA tree probe + read ops + gated action primitives. The control model (F1–F8 softkeys + Edit fields) is mapped.
- **U-WINMAX-UI-MACRO** (needs a supervised live session): walk the screen flow — which softkey sequence reaches **Program Input / Import**, **Tool Setup**, and the **graphics sim** — and record them as named macros (`open-program <path>`, `set-tool <n> <dia>`, `run-sim`). Each screen's F-key labels change, so this is captured screen-by-screen (re-probe after each softkey).
- **U-WINMAX-UI-WIRE:** wire `winmax-bridge.mjs` `ui-automation` transport to spawn `PrismWinMaxUI.exe --serve` and map bridge actions → UI ops (mechanical, no live session needed).
- The `local` (ncToDatablocks) + this `ui-automation` transport together need NO credential; the `wcf` transport stays the data-rich path once a Vendor ID exists.

Sister: `../wcf-client/CONTRACT.md` (the credential-gated data path). Both mirror delta's AutomationBridge pattern.
