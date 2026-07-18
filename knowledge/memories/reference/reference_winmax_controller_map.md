---
name: reference_winmax_controller_map
description: "WinMax Mill controller layout for driving the sim (echo). 3 screens: ISNC Editor / Tool Setup (the tool table) / Graphics Verify (Play). Softkey labels are drawn graphically (NOT UIA-readable) → need screenshots to read them. Manuals on the install at C:/Program Files/Hurco/MT WinMax Desktop/hlp/English/WinMax Mill User Guide.pdf + copies in H:/prism/resources/winmax-docs/. WinMax HAS Part Fixturing."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.265Z
aliases: reference_winmax_controller_map
---


**Source:** 2 operator screenshots (Downloads/winmax.png, winmax2.png) + the installed WinMax Mill User Guide, 2026-05-30. For driving the WinMax sim via the UI driver ([[reference_echo_winmax_bridge]] ui-driver).

**The 3 screens (softkeys read from the screenshots — UIA reports them only as "F1".."F8"):**
1. **ISNC Program Editor** (winmax.png left) — the G-code editor. Our `SAMPLE-PRISM-Base-Hurco-RICH.nc` loads here; status bar confirms **INCH** (units match). Softkeys: EDIT FUNCTIONS · JUMP & SEARCH FUNCTIONS · TAGGED BLOCKS · START/END MARKERS · NUMBERING FUNCTIONS · EDITOR SETTINGS · **EXIT EDITOR**.
2. **Tool Setup** (winmax2.png left) — the tool table (TOOL #, diameter, length offset, etc.) where T1-T4 get DEFINED. Softkeys: WORK OFFSETS · TOOL SETUP · PROGRAM PARAMETERS · STORE/RECALL · EXIT. This is where you clear the "TOOL n NOT DEFINED" error.
3. **Graphics Verify / sim** (winmax.png right panel) — 3D solid verify showing the stock block + WCS triad; toolbar Zoom/Pan/Rotate, Part/Assembly/Tool tabs, Opaque/Transparent, XY/XZ/YZ, speed slider, **Play (▶)** + Draw/Clear + Capture/Hi-Res/Settings.

**THE BLOCKER to simulating (live, observed):** red `ERROR IN BLOCK 21: TOOL 1 IS NOT DEFINED`. WinMax won't run/sim ISNC until the called tools (T1-T4) exist in Tool Setup. Fix = enter T1-T4 on the Tool Setup screen (our `PRISM-Base-Tool-Setup.md` / `prism-base-tools.tools` has the exact values). Then set work offset G54 (Part/Work Offsets), then Play the verify.

**AUTONOMOUS DRIVING — PROVEN LIVE 2026-05-30 (U-WINMAX-AUTOTEST):** the full loop works hands-off.
- **`screenshot` op shipped** (PrismWinMaxUI, full + cropped via GDI CopyFromScreen — captures the GPU panel too). Claude reads the PNG with vision. A CROPPED status read (crop `0,1320,1100,80`) is ~1k tokens vs ~12k full-screen.
- **Window attach SELF-HEALS:** Win32 EnumWindows picks the largest on-screen window (filters the cloaked WinMaxTDBClass helper at -32000), and if WinMax is MINIMIZED the driver `ShowWindow(SW_RESTORE)`+foregrounds it first. So the harness works even if the operator minimized the window. (MainWindowHandle alone is flaky — don't rely on it.)
- **SOFTKEYS ACTUATE VIA `sendkeys "{F2}"`** (a real keyboard keypress), **NOT** UIA Invoke on the button — Invoke returns ok but the screen does NOT change. PROVEN: F2 from Part Setup → header changed to TOOL SETUP. The `winmax-autotest.mjs` `softkey` step uses sendkeys.
- **Status line + softkey labels are GRAPHICAL** (not in the UIA tree) → autonomous PASS/FAIL = cropped status screenshot + vision + `classifyStatus()` (FAIL_PATTERNS: not-defined / error-in-block / alarm / fault / collision / …). PROVEN: read "ERROR IN BLOCK 21: TOOL 1 IS NOT DEFINED".
- **Data fields** (Part Zero, tool table) ARE real UIA `Edit` controls → `set-value` by AutomationId or `sendkeys` with `{TAB}`/`{ENTER}`.
- **Harness:** `scripts/winmax-autotest.mjs` (macro engine, 10/10 unit tests over a mock driver; ensureUp attach-only never launches WinMax; JSONL ledger). Macros live in `ui-driver/macros/` ([[reference_echo_winmax_bridge]]). NEXT: record define-tools / set-wcs / run-verify macros (every primitive proven).

**WinMax HAS Part Fixturing** (per the User Guide TOC: "Part Fixturing and Tool Loading", "Work Offsets", "Stock Geometry") — answers whether a vise is "a thing": YES. The Kurt DX6 (inch) vise setup is in the operator card.

**Manuals (canonical, public — U-LEGAL-13 OK):** installed at `C:/Program Files/Hurco/MT WinMax Desktop/hlp/<lang>/` — `English/WinMax Mill User Guide.pdf` (21.5 MB, matches the running version) + Spanish/French/German/Italian/Portuguese. Copied to `H:/prism/resources/winmax-docs/` (User-Guide-INSTALLED.pdf + Getting-Started + Conversational EN + Conversational-ES for JM's Spanish operators per [[feedback_prism_for_inexperienced_machinists]]). On a real control: DISK OPERATIONS F7 → `D:\Hurco\Winmax Mill\hlp`. Read targeted sections (Tool Setup / Part Fixturing / Verify) on demand — do NOT read the 21.5 MB guide inline.

**ROOT-CAUSE FIX of the "type-into drives the wrong control" bug (U-WINMAX-UI-RESOLVE, commit bd5cb8ca01, 2026-05-30):** the prior "stale click coordinate / window-offset" diagnosis was WRONG. **WinMax REUSES one AutomationId across control kinds on the same screen** — on TOOL SETUP id `303` is BOTH the F3 softkey Button (x~1531) AND the DIAMETER Edit (x~192); softkeys are Buttons with ids `301..308` that collide with the data-field ids. A bare `FindFirst(AutomationId)` returned the softkey, so `type-into 303` clicked F3 and NAVIGATED. Fix in `ui-driver/Program.cs`: (1) Edit-preferred `Locate(id, ControlType.Edit)` for data ops; (2) refuse-guard — set-value/type-into REFUSE a non-Edit/ComboBox/Document element instead of clicking it; (3) validated live-rect click + focus gate (abort type-into if post-click focus is a different non-empty id). PROVEN live: `type-into 303 2.0` now clicks the real field (237,317) `focusVerified:true`. **Build:** user-local SDK `C:\Users\wompu\.dotnet\dotnet.exe build -c Release` (the Program Files dotnet is runtime-only), then copy `bin/Release/net48/PrismWinMaxUI.exe` → `bin/PrismWinMaxUI.exe` (the canonical runtime path).

**Tool definition flow (discovered live):** "TOOL n NOT DEFINED" is cleared in the **TOOL AND MATERIAL DATABASE** (TOOLS/MATERIALS tabs; cols TYPE|DIAMETER|LENGTH OF CUT|FLUTES|DESCRIPTION; softkeys F1 ADD TOOL / F2 EDIT / F3 DELETE / F8 EXIT), NOT the per-program TOOL SETUP form. `F1 ADD TOOL` → `TOOL TYPE SETUP` form whose softkeys ARE its tabs (F1 GEOMETRY / F2 FEED&SPEED / F3 NC SFQ / F4 SUPPLIER / F5 NOTES / F8 EXIT). **⛔ OPEN BLOCKER: the TOOL TYPE dropdown is non-UIA** (no Edit/ComboBox node); `{DOWN}` focuses it, `Alt+Down` did NOT open the list. Selecting a type is the one unsolved primitive — next: add a sim-gated `click-xy` raw-coordinate op to the driver, or crack the keyboard protocol. Full detail in `ui-driver/macros/README.md`.
