---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_okuma_controller_limits.md
source_filename: project_okuma_controller_limits.md
content_hash: da5a6eea21c0a2d181b38e5ea4f2f9d94e650293bc87c79268de82c20292bbff
mirror_ts: 2026-05-05T13:00:09.511Z
mirror_engine: ObsidianMemorySyncEngine
---

Okuma OSP controllers (P300L, P300LA) have program memory size and character count limits that prevent sending large parametric macro programs (60+ V-variables, IF/GOTO branching, 500+ lines).

**Why:** The shop tried full macro programs (like BASIC-CASING.MIN at 424 lines and MACRO EXAMPLE FOR CLAUDE.MIN at 520 lines) but they hit controller memory limits on the actual machines.

**How to apply:** BOX-MS2 (Parametric Macro Conversion) must NOT output macro .MIN files for the controller. Instead:
- PRISM does all parametric calculation internally (stock size, drill size, boring bar, insert radius → auto speed/feed)
- The Calculator page (BOX-MS7) is the user-facing "macro" interface — user adjusts parameters in the web UI
- PRISM outputs compact hardcoded programs with optimized S/F values baked in — no V-variables, no IF/GOTO, just clean G-code that fits controller memory
- The macro variable convention (V1=stock_dia, V45=OD_rough_SFM, etc.) is still used internally as the data model, just not in the output program

This is actually better — PRISM is smarter than the controller's macro interpreter.
