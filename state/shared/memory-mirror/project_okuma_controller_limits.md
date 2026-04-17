---
name: Okuma controller program size limits
description: Okuma OSP controllers have character/line count limits — cannot send large parametric macro programs. PRISM must calculate internally and output compact hardcoded G-code.
type: project
---

Okuma OSP controllers (P300L, P300LA) have program memory size and character count limits that prevent sending large parametric macro programs (60+ V-variables, IF/GOTO branching, 500+ lines).

**Why:** The shop tried full macro programs (like BASIC-CASING.MIN at 424 lines and MACRO EXAMPLE FOR CLAUDE.MIN at 520 lines) but they hit controller memory limits on the actual machines.

**How to apply:** BOX-MS2 (Parametric Macro Conversion) must NOT output macro .MIN files for the controller. Instead:
- PRISM does all parametric calculation internally (stock size, drill size, boring bar, insert radius → auto speed/feed)
- The Calculator page (BOX-MS7) is the user-facing "macro" interface — user adjusts parameters in the web UI
- PRISM outputs compact hardcoded programs with optimized S/F values baked in — no V-variables, no IF/GOTO, just clean G-code that fits controller memory
- The macro variable convention (V1=stock_dia, V45=OD_rough_SFM, etc.) is still used internally as the data model, just not in the output program

This is actually better — PRISM is smarter than the controller's macro interpreter.
