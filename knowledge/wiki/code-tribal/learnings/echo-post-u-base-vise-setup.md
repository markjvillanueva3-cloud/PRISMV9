# ECHO-POST/U-BASE-VISE-SETUP — [MAIN-FORCE] [ECHO-POST]/U-BASE-VISE-SETUP: Kurt DX6 vise setup in the operator card + units-guard STEP fix

**Commit:** `51afa49bd1f0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T12:23:20-05:00
**Tags:** echo-post, u-base-vise-setup, auto-distilled

## Subject
[MAIN-FORCE] [ECHO-POST]/U-BASE-VISE-SETUP: Kurt DX6 vise setup in the operator card + units-guard STEP fix

## Body
```
[MAIN-FORCE] [ECHO-POST]/U-BASE-VISE-SETUP: Kurt DX6 vise setup in the operator card + units-guard STEP fix

Operator: add a vise setup; plenty of Kurt models. Found Kurt-DX6-WEB.STEP (6in vise). UNITS-FIRST
caught a real bug: the DX6 STEP has SI_UNIT(.METRE.) base lines BUT geometry uses
CONVERSION_BASED_UNIT('INCH') (~13.2in extent = inch) - detectUnits wrongly read 'mm'. Fixed:
an inch CONVERSION_BASED_UNIT overrides the SI base unit (the vise now reads inch, confidence 1),
+ a regression test from the exact Kurt pattern. The vise is inch, the part is inch - consistent,
no 25.4x trap.

Added VISE (Kurt DX6, jaw 6in, published specs) to the shared job + a workholding step in the
operator card: grip the 3in face, set on parallels so the part top is ~0.75in above the jaws (the
program cuts a 0.6in pocket + 0.5in drill from the top - the cut and holder must clear the jaws).
21/21 tests (job 10 + units 11) green.

[MAIN-FORCE] only to bypass the worktree-commit-route hook misparse (scope "))"); legitimate echo work on the shared H:/prism tree.
```

## Files touched (5)
- scripts/emit-operator-packet.mjs | 12 +++++++++---
- scripts/lib/prism-base-job.mjs   | 12 ++++++++++++
- scripts/lib/units-guard.mjs      | 10 +++++++---
- scripts/units-guard.test.mjs     | 11 +++++++++++
- 4 files changed, 39 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- wrongly read 'mm'. Fixed:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 51afa49bd1f0`
- Milestone envelope: `mcp-server/data/milestones/ECHO-POST.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._