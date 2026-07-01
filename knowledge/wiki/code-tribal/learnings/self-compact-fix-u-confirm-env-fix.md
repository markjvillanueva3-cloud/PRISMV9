# SELF-COMPACT-FIX/U-CONFIRM-ENV-FIX — [MAIN-FORCE] [SELF-COMPACT-FIX]/U-CONFIRM-ENV-FIX (slot:bravo): self-compact SendKeys never fired -- send-keys.mjs passed -Confirm:$true, which PowerShell -File mode cannot coerce from a string to the script's [bool]$Confirm (binding error, exits 1 BEFORE the script body -- verified -Confirm:$true/0/false all fail). Switched to the PS script's own PRISM_SENDKEYS_CONFIRM env path (send-keys-to-window.ps1 U-ZM2-01, the SAME execute seam zulu-orchestrator-sweep already uses; PS reads env natively, no string coercion). Dry-run forces env "0" so an inherited "1" (e.g. from a sweep parent) never silently turns a dry-run into a real send. LIVE before/after: self-compact.mjs --dry-run --slot bravo now resolves hwnd 854018 (UIA tab BRAVO) + binds ok (was sendError script-exit-1). The 2nd of 2 "not activating" bugs (1st was the missing YELLOW decision branch, U-YELLOW-BRANCH). 24/24 wrapper tests incl a new adversarial inherited-env safety test. Fleet-wide: every send-keys.mjs caller fixed at once; zulu env path untouched.

**Commit:** `bb5a87c7c7f4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T20:21:53-05:00
**Tags:** self-compact-fix, u-confirm-env-fix, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-CONFIRM-ENV-FIX (slot:bravo): self-compact SendKeys never fired -- send-keys.mjs passed -Confirm:$true, which PowerShell -File mode cannot coerce from a string to the script's [bool]$Confirm (binding error, exits 1 BEFORE the script body -- verified -Confirm:$true/0/false all fail). Switched to the PS script's own PRISM_SENDKEYS_CONFIRM env path (send-keys-to-window.ps1 U-ZM2-01, the SAME execute seam zulu-orchestrator-sweep already uses; PS reads env natively, no string coercion). Dry-run forces env "0" so an inherited "1" (e.g. from a sweep parent) never silently turns a dry-run into a real send. LIVE before/after: self-compact.mjs --dry-run --slot bravo now resolves hwnd 854018 (UIA tab BRAVO) + binds ok (was sendError script-exit-1). The 2nd of 2 "not activating" bugs (1st was the missing YELLOW decision branch, U-YELLOW-BRANCH). 24/24 wrapper tests incl a new adversarial inherited-env safety test. Fleet-wide: every send-keys.mjs caller fixed at once; zulu env path untouched.

## Body
```
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-CONFIRM-ENV-FIX (slot:bravo): self-compact SendKeys never fired -- send-keys.mjs passed -Confirm:$true, which PowerShell -File mode cannot coerce from a string to the script's [bool]$Confirm (binding error, exits 1 BEFORE the script body -- verified -Confirm:$true/0/false all fail). Switched to the PS script's own PRISM_SENDKEYS_CONFIRM env path (send-keys-to-window.ps1 U-ZM2-01, the SAME execute seam zulu-orchestrator-sweep already uses; PS reads env natively, no string coercion). Dry-run forces env "0" so an inherited "1" (e.g. from a sweep parent) never silently turns a dry-run into a real send. LIVE before/after: self-compact.mjs --dry-run --slot bravo now resolves hwnd 854018 (UIA tab BRAVO) + binds ok (was sendError script-exit-1). The 2nd of 2 "not activating" bugs (1st was the missing YELLOW decision branch, U-YELLOW-BRANCH). 24/24 wrapper tests incl a new adversarial inherited-env safety test. Fleet-wide: every send-keys.mjs caller fixed at once; zulu env path untouched.
```

## Files touched (3)
- scripts/lib/send-keys.mjs      | 15 +++++++++++++--
- scripts/lib/send-keys.test.mjs | 38 ++++++++++++++++++++++++++++++++------
- 2 files changed, 45 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb5a87c7c7f4`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._