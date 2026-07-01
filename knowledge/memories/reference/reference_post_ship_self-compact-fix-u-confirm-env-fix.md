---
name: reference_post_ship_self-compact-fix-u-confirm-env-fix
description: Auto-distilled learnings from shipping SELF-COMPACT-FIX/U-CONFIRM-ENV-FIX (commit bb5a87c7c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.022Z
aliases: reference_post_ship_self-compact-fix-u-confirm-env-fix
---


# SELF-COMPACT-FIX/U-CONFIRM-ENV-FIX

[MAIN-FORCE] [SELF-COMPACT-FIX]/U-CONFIRM-ENV-FIX (slot:bravo): self-compact SendKeys never fired -- send-keys.mjs passed -Confirm:$true, which PowerShell -File mode cannot coerce from a string to the script's [bool]$Confirm (binding error, exits 1 BEFORE the script body -- verified -Confirm:$true/0/false all fail). Switched to the PS script's own PRISM_SENDKEYS_CONFIRM env path (send-keys-to-window.ps1 U-ZM2-01, the SAME execute seam zulu-orchestrator-sweep already uses; PS reads env natively, no string coercion). Dry-run forces env "0" so an inherited "1" (e.g. from a sweep parent) never silently turns a dry-run into a real send. LIVE before/after: self-compact.mjs --dry-run --slot bravo now resolves hwnd 854018 (UIA tab BRAVO) + binds ok (was sendError script-exit-1). The 2nd of 2 "not activating" bugs (1st was the missing YELLOW decision branch, U-YELLOW-BRANCH). 24/24 wrapper tests incl a new adversarial inherited-env safety test. Fleet-wide: every send-keys.mjs caller fixed at once; zulu env path untouched.

**Shipped:** 2026-06-17T20:21:53-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[self-compact-fix-u-confirm-env-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._