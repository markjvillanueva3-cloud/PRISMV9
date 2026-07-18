# CAD-COMPLETION/U-CAD-RECONCILE-SUBJECT-GREP — [MAIN-FORCE] [CAD-COMPLETION]/U-CAD-RECONCILE-SUBJECT-GREP (slot:delta): harden git detector to commit-SUBJECT match (3-of-3 reviewer-B catch)

**Commit:** `eed3c48d9790` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T08:11:57-05:00
**Tags:** cad-completion, u-cad-reconcile-subject-grep, auto-distilled

## Subject
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-RECONCILE-SUBJECT-GREP (slot:delta): harden git detector to commit-SUBJECT match (3-of-3 reviewer-B catch)

## Body
```
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-RECONCILE-SUBJECT-GREP (slot:delta): harden git detector to commit-SUBJECT match (3-of-3 reviewer-B catch)

3-of-3 scrutiny reviewer B caught a false-POSITIVE my first commit missed: the `git`-type detector ran
`git log --all --grep <unitId>` which matches commit MESSAGES (subject+body). A reconcile/status/roadmap
commit lists every unit id in its body (e.g. "next=U-CAD-NURBS-STEP-EMIT"), so it self-matched 9ed946a7b4
(the reconcile commit itself) -> U-CAD-NURBS-STEP-EMIT falsely SHIPPED. No real NURBS-emit deliverable exists.

Fix (root cause, not symptom): new pure exported filterSubjectMatches() requires the unit id in the commit
SUBJECT (PRISM commits are `[SCOPE]/U-ID: title`); `--grep` stays only as a cheap body-level prefilter.
Honest count 11/20 -> 10/20; critical-next U-CAD-REAL-TRAIN-RUN -> U-CAD-NURBS-STEP-EMIT (Phase A); also
corrected U-CAD-LEARN-LOOP-CLOSE evidence from the cad_mate body-mention 1c788cf7a2 -> real deliverable 19e9c0af6b.
+3 R9 regression tests (16/16). Roadmap sec0 stamp corrected to match. Same root-cause class as the
U-CAD-BOOLEAN false-negative in the prior commit (both: detector counted a NAME, not a deliverable).
```

## Files touched (6)
- scripts/cad-completion-reconcile.mjs                    |  26 +++++++++++++++++++++++++-
- scripts/cad-completion-reconcile.test.mjs               | Bin 6086 -> 8403 bytes
- state/shared/specs/CAD-COMPLETION-ROADMAP-2026-06-26.md |  28 ++++++++++++++++------------
- state/shared/specs/CAD-COMPLETION-STATUS.json           |  12 ++++++------
- state/shared/specs/CAD-COMPLETION-STATUS.md             |  10 +++++-----
- 5 files changed, 52 insertions(+), 24 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show eed3c48d9790`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._