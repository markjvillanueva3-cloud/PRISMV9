# TOKEN-EFFICIENCY-INJECT/U-REWRITER-SKIP-DIRECTIVE-TIGHTEN — [MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-SKIP-DIRECTIVE-TIGHTEN (slot:alpha): drop redundant BUILD LOOP alt from LOOP_DIRECTIVE_RE -- close arm-C P2 false-positive

**Commit:** `631e273cd288` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T21:51:44-05:00
**Tags:** token-efficiency-inject, u-rewriter-skip-directive-tighten, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-SKIP-DIRECTIVE-TIGHTEN (slot:alpha): drop redundant BUILD LOOP alt from LOOP_DIRECTIVE_RE -- close arm-C P2 false-positive

## Body
```
[MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-SKIP-DIRECTIVE-TIGHTEN (slot:alpha): drop redundant BUILD LOOP alt from LOOP_DIRECTIVE_RE -- close arm-C P2 false-positive

3-of-3 scrutiny arm C flagged a harmless P2: an ordinary prompt LEADING with a bracket tag
that merely contains 'build loop' (e.g. [todo: build loop refactor] ...) was wrongly
directive-skipped. The bare 'BUILD LOOP' alternative was redundant -- every real fleet
directive shape carries 'AUTONOMOUS BUILD' or 'operator-armed' -- so dropping it removes the
false-positive surface with ZERO loss (all 4 live directive shapes still match). Strict-subset
narrowing. +1 regression test locking the [..build loop..]-without-signal -> not-skipped case.
Tests 9/9, throttle 4/4 (no regression).
```

## Files touched (3)
- .claude/hooks/__tests__/prompt-rewriter-system-directive.test.mjs | 16 +++++++++++++++-
- .claude/hooks/prompt-rewriter-ollama.mjs                          | 13 ++++++++-----
- 2 files changed, 23 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- wrongly
- till match). Strict-subset

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 631e273cd288`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._