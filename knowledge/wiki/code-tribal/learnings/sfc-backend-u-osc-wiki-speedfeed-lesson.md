# SFC-BACKEND/U-OSC-WIKI-SPEEDFEED-LESSON — [MAIN-FORCE] [SFC-BACKEND]/U-OSC-WIKI-SPEEDFEED-LESSON (slot:oscar): wiki lesson -- material-aware delegation + stranded-slot-branch trap

**Commit:** `97339c214e47` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T21:39:01-05:00
**Tags:** sfc-backend, u-osc-wiki-speedfeed-lesson, auto-distilled

## Subject
[MAIN-FORCE] [SFC-BACKEND]/U-OSC-WIKI-SPEEDFEED-LESSON (slot:oscar): wiki lesson -- material-aware delegation + stranded-slot-branch trap

## Body
```
[MAIN-FORCE] [SFC-BACKEND]/U-OSC-WIKI-SPEEDFEED-LESSON (slot:oscar): wiki lesson -- material-aware delegation + stranded-slot-branch trap

Companion wiki entry for the 2 bug fixes shipped this session (986b36a2b1 material-aware speed_feed, e697a82840 dark-parity), per the bug-finding->wiki gate + unified mistake-loop step 5. Captures 4 reusable lessons: (1) re-route a material-blind dispatcher ACTION to the richer engine + remap the contract (spindle_rpm->spindle_speed; normalize legacy->canonical params in the dispatcher; fail-loud fallback; leave the 12-caller util untouched); (2) the SILENT test gap -- Vc is diameter-independent so a wrong-diameter bug hides behind passing material tests, always add a diameter-passthrough guard; (3) STRANDED SLOT-BRANCH fixes -- verify delivery with git merge-base --is-ancestor, a 'shipped' memory on an unmerged slot branch is NOT in production; (4) broad test sweeps are polluted by peer untracked WIP -- filter git-tracked before claiming regressions.
```

## Files touched (2)
- .../learnings/sfc-speedfeed-material-aware-and-stranded-slot-branch.md      | 69 +++++++++++++++++++++++++++++++++++++
- 1 file changed, 69 insertions(+)

## Lessons surfaced in commit body
- LESSON (slot:oscar): wiki lesson -- material-aware delegation + stranded-slot-branch trap
- lessons: (1) re-route a material-blind dispatcher ACTION to the richer engine + remap the contract (spindle_rpm->spindle_speed; normalize legacy->canonical params in the dispatcher; fail-loud fallback; leave the 12-caller util untouched); (2) the SILENT test gap -- Vc is diameter-independent so a wrong-diameter bug hides behind passing material tests, always add a diameter-passthrough guard; (3) STRANDE

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 97339c214e47`
- Milestone envelope: `mcp-server/data/milestones/SFC-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._