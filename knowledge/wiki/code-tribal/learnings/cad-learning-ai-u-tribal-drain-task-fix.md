# CAD-LEARNING-AI/U-TRIBAL-DRAIN-TASK-FIX — [MAIN-FORCE] [CAD-LEARNING-AI]/U-TRIBAL-DRAIN-TASK-FIX (slot:india): rename $args->$taskArgs (PS automatic-var shadow) + fix MaxPdfs doc default

**Commit:** `454cf4127d3d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T13:09:02-05:00
**Tags:** cad-learning-ai, u-tribal-drain-task-fix, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-TRIBAL-DRAIN-TASK-FIX (slot:india): rename $args->$taskArgs (PS automatic-var shadow) + fix MaxPdfs doc default

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-TRIBAL-DRAIN-TASK-FIX (slot:india): rename $args->$taskArgs (PS automatic-var shadow) + fix MaxPdfs doc default

Per-file scrutiny P2s (both arms PASS, 0 blockers): (1) the installer assigned to $args -- a PowerShell AUTOMATIC variable (unbound-arg array) -- behavior-correct at script scope but a reserved-name shadow; renamed to $taskArgs (incl the cosmetic exec: echo line, which had silently blanked). (2) .PARAMETER MaxPdfs help said default 12, actual is 4 -- doc fixed. Re-registered: Arguments unchanged (--max-pdfs 4 --max-chunks-per-doc 30). NOTE: the prior commit's MODULE_NOT_FOUND root-cause narrative was a git-bash 'cmd //c' MSYS path-munging artifact of the TEST invocation, not a .cmd-branch defect (analyst reproduced the .cmd branch working via Start-Process); node.exe-direct preference is still correct + is the validated path that produced +33 tips.
```

## Files touched (2)
- scripts/install-resources-tribal-drain-task.ps1 | 10 +++++-----
- 1 file changed, 5 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- NOTE: the prior commit's MODULE_NOT_FOUND root-cause narrative was a git-bash 'cmd //c' MSYS path-munging artifact of the TEST invocation, not a .cmd-branch defect (analyst reproduced the .cmd branch working via Start-Process); node.exe-direct preference is still correct + is the validated path that produced +33 tips.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 454cf4127d3d`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._