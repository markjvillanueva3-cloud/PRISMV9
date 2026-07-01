---
name: reference_winmax_course_framework_2026_05_31
description: "WinMax \"course\" framework — vision-free GUI driving + the proven/genuine vision boundary for live post-test"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.265Z
aliases: reference_winmax_course_framework_2026_05_31
---


# WinMax course framework + vision-free boundary (slot:echo, 2026-05-31)

The autonomous WinMax (Hurco DS Desktop sim) live-test harness drives the GUI **vision-free** via a "course" layer over the FSM map.

**Assets** (all under `H:/prism/mcp-server/data/posts/prism-base/winmax-bridge/` + `H:/prism/scripts/`):
- `winmax-courses.json` — named, ordered step-sequences per production phase (verify-program, define-tool, load-program, set-work-offset) + proven facts.
- `scripts/winmax-course-run.mjs` — pure planner (`resolveParams`/`expandValue`/`normalizeStep`/`planCourse`/`valuesMatch`) + thin live executor (ops: nav/key/field/assert/read/fingerprint/draw-trigger). `--dry-run` plans + runs only read-only steps; fail-loud (R12) on unresolved `draw-trigger`. CLI: `node scripts/winmax-course-run.mjs <course> [--dry-run] [--set k=v] [--allow-actions]`.
- `scripts/winmax-course-run.test.mjs` — 26 hermetic vitest cases (`--config scripts/vitest.config.mjs`).
- `PrismWinMaxUI.exe` driver: read ops (get-text/probe/find/window-info/maximize) ungated; write ops (click/type-raw/sendkeys/field) need `--allow-actions`. probe/find now also emit `helpText` (tooltip).

**Vision-free vs genuine vision boundary (settled empirically):**
- ✅ Vision-free: FSM navigation (softkey sendkeys), all numeric/text **Edit** fields (read via `get-text <id>`, write via the proven recipe `click <id>` → `type-raw <digits>` → `type-raw {ENTER}`), screen fingerprint (`winmax-ui-map.mjs whereami`).
- ❌ GENUINE vision touch-points (NOT mapping gaps — these are not in the UIA accessibility tree): the DS **console-key toolbar buttons** incl. **Draw** (`find "draw"` → `[]`, no Name, no HelpText — verified after adding HelpText extraction), the **graphical status line** (`StatusBar.Pane0` UIA value always ""), and the **icon-font dropdowns** (TOOL TYPE/COOLANT — selectable as List/ListItem when expanded but item names are private-use glyphs, not text). Path for Draw: one-time coordinate calibration on the fixed maximized layout → `click-xy` forever, OR a keyboard accelerator if the manual documents one.

**Key manual facts** (WinMax Mill User Guide.pdf, `C:/Program Files (x86)/Hurco/DS WinMax Mill/hlp/English/`):
- p99: a tool used in the NC but **not defined in Tool Setup renders as unknown (dia 0) and does NOT block Draw/verify** — so a graphics-verify needs no tool-define prereq.
- p459-460: *"View the part using the Draw console key to verify that the part is programmed correctly."* Draw = the verify trigger.
- RICH NC (`SAMPLE-PRISM-Base-Hurco-RICH.nc`) is **G20 INCH**, uses `G43 H1..H4` length offsets (no G41/G42 cutter comp). T1=FACE MILL D2.0".

Builds on [[reference_winmax_controller_map]]. Extracted via lima pypdf per [[feedback_use_lima_pypdf_page_extractor]]. Units-first per [[feedback_check_units_first]].
