# HOOK-HYGIENE-MS0/U-HBO02 — [MAIN] [HOOK-HYGIENE-MS0]/U-HBO02: error-pattern-promote telemetry clarity

**Commit:** `2ada2faad38d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T10:46:49-05:00
**Tags:** hook-hygiene-ms0, u-hbo02, auto-distilled

## Subject
[MAIN] [HOOK-HYGIENE-MS0]/U-HBO02: error-pattern-promote telemetry clarity

## Body
```
[MAIN] [HOOK-HYGIENE-MS0]/U-HBO02: error-pattern-promote telemetry clarity

error-pattern-promote fires 5.96x/hr fleet-wide, reporting decision=
'noop_below_threshold' 99.8% of the time (2422/2426 fires). hook-fire-rank
flagged this as a high-frequency hook running mostly idle.

Investigation: hook was working CORRECTLY — 4 groups exceed the
THRESHOLD=3 occurrence floor (test-fail:68, git-lock-contention:45,
tsc:27, fork-storm:13) and ALL 4 have drafted lesson stubs at
knowledge/wiki/lessons/auto-*.md. The hook continues firing on each
UserPromptSubmit but draftStub() returns null on existsSync(), so
'promoted' array stays empty.

Bug: the telemetry verdict 'noop_below_threshold' conflated TWO states:
  (a) groups exist but none meet threshold — REAL pending signal
  (b) groups meet threshold but stubs already drafted — STEADY STATE
Fleet observers reading hook-fire-rank reasonably concluded the
error-learn loop wasn't catching anything, when reality is the
opposite (4 lessons captured).

Fix: split the noop branch. Track groupsAtThreshold + groupsAlreadyDrafted
separately; emit 'noop_all_drafted' when threshold-meeting groups exist
but all have stubs. Distinct from 'noop_below_threshold' in telemetry
so fleet readers see the healthy steady state instead of misreading
it as 'not catching errors'.

Live-verified: post-fix invocation emitted
  {decision:'noop_all_drafted',groupsAtThreshold:4,groupsAlreadyDrafted:4,recent:154}

This is exactly the class of finding the /forge-audit-v2 doctrine
targets — high-ROI hook whose decision label was misleading the fleet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .claude/hooks/error-pattern-promote.mjs | 17 ++++++++++++++++-
- 1 file changed, 16 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- lesson stubs at
- lessons/auto-*.md. The hook continues firing on each
- lessons captured).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2ada2faad38d`
- Milestone envelope: `mcp-server/data/milestones/HOOK-HYGIENE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._