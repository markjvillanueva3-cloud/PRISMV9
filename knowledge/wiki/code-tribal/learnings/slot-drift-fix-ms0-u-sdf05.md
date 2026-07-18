# SLOT-DRIFT-FIX-MS0/U-SDF05 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SLOT-DRIFT-FIX-MS0]/U-SDF05 (slot:bravo): findTranscriptFile scans ALL H--prism* worktree dirs — fixes fleet-wide slot drift

**Commit:** `827bcd8ce7e2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-29T19:21:23-05:00
**Tags:** slot-drift-fix-ms0, u-sdf05, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SLOT-DRIFT-FIX-MS0]/U-SDF05 (slot:bravo): findTranscriptFile scans ALL H--prism* worktree dirs — fixes fleet-wide slot drift

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SLOT-DRIFT-FIX-MS0]/U-SDF05 (slot:bravo): findTranscriptFile scans ALL H--prism* worktree dirs — fixes fleet-wide slot drift

Root cause: the U-SDF03/04 transcript-liveness gate hardcoded the Claude project
dir to H--prism, but the slot-worktree migration moved every chat into
H:/prism-slot-<nato> (transcript dir H--prism-slot-<nato>). findTranscriptFile
returned null for EVERY worktree chat -> isWindowAlive=false -> slots fell through
to the no-PID tier-4 tw-wt gate -> UNPROTECTED -> any peer session-start-auto-pin
stole the slot. This is the operator-reported 'chats fall out of their slot'.

Fix: scan the shared project dir AND every sibling H--prism* worktree dir; return
the freshest matching transcript. PRISM_SLOT_TRANSCRIPT_BASE still pins one dir for
tests. Empirically verified on the live fleet (finds the real worktree transcript;
isWindowAlive=true for a worktree chat; negative control false). Tests: +3 U-SDF05
regression cases; 23/23 existing bindings still pass.
```

## Files touched (3)
- .claude/helpers/__tests__/chat-slots-transcript-sdf05.test.mjs | 70 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/chat-slots.mjs                                 | 77 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------------
- 2 files changed, 132 insertions(+), 15 deletions(-)

## Lessons surfaced in commit body
- till pins one dir for
- till pass.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 827bcd8ce7e2`
- Milestone envelope: `mcp-server/data/milestones/SLOT-DRIFT-FIX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._