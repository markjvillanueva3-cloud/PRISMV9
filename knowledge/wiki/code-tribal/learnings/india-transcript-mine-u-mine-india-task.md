# INDIA-TRANSCRIPT-MINE/U-MINE-INDIA-TASK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-TRANSCRIPT-MINE]/U-MINE-INDIA-TASK (slot:india): reaper-immune scheduled-task installer to complete the full india mine unattended

**Commit:** `e4239958773e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T12:12:35-05:00
**Tags:** india-transcript-mine, u-mine-india-task, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-TRANSCRIPT-MINE]/U-MINE-INDIA-TASK (slot:india): reaper-immune scheduled-task installer to complete the full india mine unattended

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [INDIA-TRANSCRIPT-MINE]/U-MINE-INDIA-TASK (slot:india): reaper-immune scheduled-task installer to complete the full india mine unattended

The full 84-transcript mine cannot complete in a session: foreground + run_in_background
passes both get REAPED (exit 255) under fleet load (documented host behavior -- same reason
the OCR loop became a scheduled task). The miner is RESUMABLE so passes advance monotonically
(8->32->41->43/84 across this session's attempts), but a SYSTEM-principal scheduled task is
the reaper-immune mechanism that runs it to completion.

install-india-mine-task.ps1 clones the validated install-ocr-training-loop-task.ps1 pattern:
SYSTEM principal / highest / 6h limit / StartWhenAvailable; action runs node the miner directly
(no wrapper -- pure node+Ollama HTTP, no console step). -Daily keeps the india synthesis fresh as
new sessions land; -Once for a single completion run; -RunNow / -Uninstall.

VALIDATION: PS_PARSE_OK (PSParser tokenize, non-elevated); node.exe + miner path Test-Path pass.
REGISTRATION REQUIRES AN ELEVATED SHELL -- I cannot register/validate-run it from this non-admin
session (R12 honest). Operator: powershell -NoProfile -ExecutionPolicy Bypass -File
H:/prism/.claude/helpers/install-india-mine-task.ps1 -Once -RunNow  (then verify the vault file shows
coverage_sessions:84). Thin infra clone of a live helper -> scoped to parse+path validation; Stop 3-of-3
covers the session.
```

## Files touched (2)
- .claude/helpers/install-india-mine-task.ps1 | 68 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 68 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e4239958773e`
- Milestone envelope: `mcp-server/data/milestones/INDIA-TRANSCRIPT-MINE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._