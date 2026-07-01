# WinMax autonomous-test macros (slot:echo, 2026-05-30)

Recorded softkey/field sequences the `winmax-autotest.mjs` harness replays to drive WinMax
hands-off. Each macro is a JSON `{ name, screen, steps[] }`. Run: `node scripts/winmax-autotest.mjs --macro <name>`.

## PROVEN mechanisms (verified live against WinMax.exe, 2026-05-30)
- **Window attach self-heals:** the driver restores WinMax if it's minimized (`ShowWindow(SW_RESTORE)` + foreground) and picks the largest on-screen window (filtering the cloaked `WinMaxTDBClass` helper at -32000). So the harness works even if the window was minimized.
- **Softkeys actuate via `sendkeys "{F2}"`** — a REAL keyboard keypress — **NOT** UIA Invoke on the button (Invoke returns ok but the screen does NOT change). The `softkey` step uses sendkeys. Proven: F2 from Part Setup → the header changed to TOOL SETUP.
- **Status line + softkey labels are GRAPHICAL** (not in the UIA tree). Autonomous PASS/FAIL reads a CHEAP cropped status screenshot (~1k tokens, crop `0,1320,1100,80`) with vision, then `classifyStatus()` flags FAIL_PATTERNS (not defined / error in block / alarm / fault / collision / …). Proven: read "ERROR IN BLOCK 21: TOOL 1 IS NOT DEFINED".
- **Data fields** (Part Zero X/Y/Z, tool table) are real UIA `Edit` controls → `set-value` by AutomationId, or `sendkeys` with `{TAB}`/`{ENTER}` navigation.

## Screen → softkey map (from live screenshots)
- **PART SETUP**: F1 WORK OFFSETS · F2 TOOL SETUP · F3 PART PROGRAMMING · F4 PROGRAM PARAMETERS · F5 PART PROBING · F6 STORE MACHINE POSITION · F7 MORE→ · F8 EXIT
- **TOOL SETUP**: the tool table (TOOL #, diameter, length offset). Softkeys incl WORK OFFSETS / TOOL SETUP / PROGRAM PARAMETERS / STORE-RECALL / EXIT.
- **ISNC EDITOR**: EDIT FUNCTIONS · JUMP & SEARCH · TAGGED BLOCKS · START/END MARKERS · NUMBERING · EDITOR SETTINGS · EXIT EDITOR.
- **GRAPHICS VERIFY**: the 3D solid sim with Play (▶) — a pure simulation (no machine motion).

## Step ops
`softkey {key}` · `set-value {id,value}` · `sendkeys {keys}` · `screenshot {label,crop?}` · `wait {ms}` · `assert-status {expectClean}`

## ROOT CAUSE of the 2026-05-30 "type-into opened the Find box" bug — SOLVED (2026-05-30, 2nd live session)
The prior diagnosis ("stale click coordinate / needs window offset") was **WRONG**. The real bug:
**WinMax REUSES AutomationIds across control kinds on the same screen.** On TOOL SETUP, id `303` is
BOTH the **F3 softkey Button** (~x1531) AND the **DIAMETER Edit** (~x192). The old `Locate()` did a bare
`FindFirst(AutomationId=303)`, which returns whichever is first in tree order — the **softkey button**. So
`type-into 303` clicked the F3 softkey (NAVIGATING the UI) and `^a 2.0 {ENTER}` typed into whatever then
had focus. This also explains the old "mixed" behavior: id310 (CAL LENGTH) worked because it is unique;
id303 (DIAMETER) "failed" because it collided with F3. It was an **element-resolution** bug, never a
click-coordinate bug.

**The 3-part fix (Program.cs, compiled + deployed + PROVEN live):**
1. **Edit-preferred `Locate(win, id, preferType)`** — data ops pass `ControlType.Edit`, so `AndCondition(id, Edit)`
   binds the DIAMETER **Edit**, not the colliding softkey. PROVEN: `type-into 303 2.0` now clicks **(237,317)**
   (the real field) with **`focusVerified:true`**, vs the old **(1621,262)** softkey.
2. **Non-editable REFUSE guard** — if Edit-preferred Locate still falls through to a non-editable control
   (wrong screen / collision), `set-value`/`type-into` REFUSE rather than click it (a click on a softkey
   navigates). This stops a mis-targeted field write from driving the UI.
3. **Click = validated live rect center + focus gate** — `ClickElement` uses the live `BoundingRectangle`
   center (already absolute screen coords; GetClickablePoint dropped — unreliable for WinMax custom controls),
   validates against the virtual screen, and `type-into` verifies focus is on the target before typing
   (aborts on mismatch). The focus gate is what EXPOSED the resolution bug.

**Readback caveat:** `get-text <id>` immediately after a `type-into` (which ends in `{ENTER}`) may resolve to the
softkey because the ENTER refreshes/re-lays-out the tree for an instant. Ground-truth a write with a cropped
**screenshot**, not an immediate get-text.

## Field maps (live probes, 2026-05-30) — re-probe per screen, ids are screen-relative
- **Per-program TOOL SETUP form** (Input → PART SETUP `F1` → TOOL SETUP `F2`): TOOL NUMBER=`301` · DIAMETER=`303`
  · TOOL CAL LENGTH=`310` · SPEED=`322` · TOUCH-OFF=`347` (all `Edit`, Value pattern). TOOL TYPE + COOLANT are
  **non-UIA dropdowns** (do NOT appear as ComboBox in the probe).
- Softkeys are `Button`s with ids `301..308` (collide with the data-field ids above — hence the fix).

## TOOL DEFINITION FLOW (discovered live) — tools live in the TOOL & MATERIAL DATABASE
The "TOOL n NOT DEFINED" error is cleared by populating the **TOOL AND MATERIAL DATABASE** (tabs TOOLS / MATERIALS;
columns TYPE | DIAMETER | LENGTH OF CUT | FLUTES | DESCRIPTION), NOT the per-program TOOL SETUP form. Reached from
the per-program DIAMETER field on ENTER (exact path to re-confirm). Database softkeys: `F1 ADD TOOL` · `F2 EDIT TOOL`
· `F3 DELETE TOOL` · `F8 EXIT`.
- **`F1 ADD TOOL` → `TOOL TYPE SETUP` form.** Its softkeys ARE its tabs: `F1 GEOMETRY` · `F2 FEED & SPEED` ·
  `F3 NC SFQ` · `F4 SUPPLIER` · `F5 NOTES` · `F8 EXIT`. GEOMETRY's only initial field is a **TOOL TYPE dropdown**.

### ✅ TOOL TYPE dropdown SOLVED via `click-xy` (U-WINMAX-UI-CLICKXY, 2026-05-30)
The TOOL TYPE dropdown is non-UIA (no Edit/ComboBox node; `{DOWN}` focuses it, `Alt+Down` won't open it). The
new **`click-xy <winRelX,winRelY>` op** (raw window-relative coordinate click, validated inside the window,
`--allow-actions`-gated) drives it:
1. `click-xy` the dropdown ARROW (window-rel ~`598,179` on the GEOMETRY tab) → the list OPENS. PROVEN.
2. `click-xy` the desired item row → it selects + the GEOMETRY fields appear. PROVEN (FACE MILL @ ~`260,330`).
- **TOOL TYPE list order (top→down):** UNKNOWN, DRILL, TAP, BORING HEAD, END MILL, FACE MILL, BALL END MILL,
  BACK SPOTFACE MILL, PROBE, GUN DRILL, CENTER DRILL, CHAMFER MILL, BULL NOSE MILL, REAM, … (rows ~24px apart;
  the open list starts ~`130` window-rel y under the arrow). Job map: T1=FACE MILL, T2/T3/T5=END MILL, T4=DRILL.
- **⚠ WINDOW MOVED to x=1713** this session (2nd monitor). `click-xy` is WINDOW-RELATIVE + uses the live window
  origin, so it handled the move automatically — read the coord off a screenshot crop; never hardcode absolute.

### GEOMETRY field map (FACE MILL, live probe — re-probe per tool type, ids shift) + the FIELD-COMMIT rule
- CUTTING DIAMETER=`303` · OUTER DIAMETER CAL=`311` · LENGTH OF CUT CAL=`314` · TOOL LENGTH CAL=`315` ·
  ANGLE=`318` · CUTTING EDGES=`324` · RADIUS=`325`. (Use window-relative coords from the probe: subtract the
  Window node's x/y — the window is at 1713,0 now.)
- **⛔ FIELD INPUT — FULLY DIAGNOSED 2026-05-30 (the open blocker): WinMax data fields reject ALL synthesized
  input tried so far. Hardware-level key injection (`SendInput`/`keybd_event` scancodes) is the next thing to build.**
  Systematic results on the ADD-TOOL GEOMETRY form (CUTTING DIAMETER etc.):
  - `sendkeys "^a..."` → **`^a` is a WinMax FORM-EXIT ACCELERATOR** (NOT select-all) — it closes the form before
    the value types. The tool saves with the OLD value (typed dia 2.0 → saved 0.0000). NEVER send `^a` to a WinMax form.
  - `sendkeys "<digits>{TAB}"` (with the op's `win.SetFocus()`) → digits do NOT register; only `{TAB}` advances focus.
  - **`type-raw`** (new op: SendKeys with NO SetFocus, NO click, NO `^a`) → form STAYS open, `{TAB}` advances, but
    **digits STILL do not register** in the field. So WinMax custom numeric fields IGNORE SendKeys `WM_CHAR`.
  - `click-xy` the field then `type-raw` digits → digits still don't register (it's not a focus/edit-mode issue).
  - **UIA `set-value`** (ValuePattern.SetValue) → WRITES the field display (CUTTING DIAMETER showed 2.0!), but the
    value is **discarded on the next interaction** — only the LAST set-value lingers visually; `set-value`+`{TAB}`
    does NOT commit it (all reverted to 0). So UIA SetValue updates the edit control text but WinMax's internal
    model never reads it.
  - WHAT DOES work via SendKeys: softkeys `{F1}`..`{F8}` (accelerators) and `{TAB}` navigation.
  - **✅ SOLVED (2026-05-30, U-WINMAX-UI-FIELDS) — NO SendInput needed. The fields are an EDIT-MODE model:**
    a field only accepts digits once it is in EDIT MODE, which a **`click-xy` on the field** enters (the status
    line then prompts e.g. "Enter tool diameter."). Auto-focus (form-open / `{TAB}`) is NOT edit mode. The
    **PROVEN per-field recipe** is:
    1. `click-xy <field winRel x,y>`  → enters edit mode (clears the field for replacement)
    2. `type-raw "<digits>"`           → digits land (e.g. "2.0"); NO `^a`, NO SetFocus
    3. `type-raw "{ENTER}"`            → COMMITS the value + advances to the next field (ENTER commits in edit
       mode; it only "exited the form" before because the `^a` preceding it was the real exit accelerator)
    Then `{F8}` EXIT saves the whole tool to the DB. **PROVEN END-TO-END: a FACE MILL saved with DIAMETER 2.0000,
    LENGTH OF CUT 0.5000, TOOL LENGTH 2.0000, CUTTING EDGES 5** — verified persisted in the TOOL & MATERIAL DATABASE.
  - FACE MILL GEOMETRY field positions (window-relative, window at x=1713): CUTTING DIAMETER ~274,225 · OUTER
    DIAMETER CAL ~274,283 · LENGTH OF CUT CAL ~274,314 · TOOL LENGTH CAL ~274,344 · ANGLE ~285,373 · CUTTING
    EDGES ~295,434 · RADIUS ~274,463. (END MILL / DRILL forms differ — re-probe/re-screenshot per tool type.)
  - set-value/type-into/type-tap do NOT work for WinMax fields (set-value writes display-only; type-into's `^a`
    exits). Use the click-xy + type-raw + {ENTER} recipe above.
- EDIT/DELETE TOOL softkeys are GREYED until a list row is SELECTED — `click-xy` the row first, then `{F2}`/`{F3}`.

## Status: macros to RECORD next — dropdown SOLVED; remaining = field-commit-via-TAB + save + WCS + verify
There is currently ONE test-artifact FACE MILL tool (diameter 0.0000) in the DB from the proof run — EDIT it
(select row + `{F2}`) and fix with the TAB-commit rule, or DELETE it (select row + `{F3}`) and re-add cleanly.
- `define-tools.json` — for each of T1–T4 (specs in `scripts/lib/prism-base-job.mjs`): ADD TOOL → click-xy the
  TYPE dropdown + item → fill GEOMETRY with `{TAB}`-committed values (dia, LoC, tool length, cutting edges) →
  save → back to list. Clears "TOOL n NOT DEFINED".
- `set-wcs.json` — PART SETUP → WORK OFFSETS → G54 part-zero (STOCK top-front-left corner per the job).
- `run-verify.json` — Graphics Verify → Play → cropped status screenshot → `classifyStatus()` clean.
- `full-postcheck.json` — RELOAD clean NC (the loaded buffer is currently clobbered — see below) → define-tools →
  set-wcs → run-verify → PASS/FAIL. The end-to-end autonomous post regression test.

**⚠ Loaded buffer is clobbered:** last session's mis-resolved type-into did `^a` (select-all) + `2.0` + ENTER into
the EDITOR, replacing the 136-line program with "2.0" (now "Line 2 of 3"). The **disk file is INTACT** (verified:
136 lines, ends G90/M30, mtime = generation time — WinMax does NOT autosave). Recovery = re-open
`SAMPLE-PRISM-Base-Hurco-RICH.nc`; NEVER save the corrupt buffer. The focus-gate fix prevents this class of clobber.

Every other primitive (attach, softkey nav, Edit `type-into`/`set-value`, screenshot, status-classify) is built +
proven live; recording = capturing the exact step order + the (re-probed) field ids from a live drive.
