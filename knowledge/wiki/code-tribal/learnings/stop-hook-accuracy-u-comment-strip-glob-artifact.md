# STOP-HOOK-ACCURACY/U-COMMENT-STRIP-GLOB-ARTIFACT — [MAIN-FORCE] [STOP-HOOK-ACCURACY]/U-COMMENT-STRIP-GLOB-ARTIFACT (slot:golf): comment-strip no longer eats real cases after a glob/regex /* artifact

**Commit:** `0782605d7f80` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T08:18:09-05:00
**Tags:** stop-hook-accuracy, u-comment-strip-glob-artifact, auto-distilled

## Subject
[MAIN-FORCE] [STOP-HOOK-ACCURACY]/U-COMMENT-STRIP-GLOB-ARTIFACT (slot:golf): comment-strip no longer eats real cases after a glob/regex /* artifact

## Body
```
[MAIN-FORCE] [STOP-HOOK-ACCURACY]/U-COMMENT-STRIP-GLOB-ARTIFACT (slot:golf): comment-strip no longer eats real cases after a glob/regex /* artifact

findUnhandledActions' block-comment strip greedily paired a spurious /* inside a
string literal (e.g. the glob "**/*.MIN") with the next stray */ (e.g. a regex
/...\d*/), swallowing real case handlers in between -> those actions falsely
reported UNHANDLED -> the Stop gate could BLOCK any session editing such a
dispatcher. Live: ppDispatcher.ts L6279 "**/*.MIN" ate its pp_label_stats/
pp_label_export/pp_okuma_b250_lathe_program cases (L6289-6307).

Fix: negative lookbehind /(?<![*/])\/\*.../ -- a /* preceded by * or / (glob/
regex artifact) is not a comment open. Residual pathological edge (real comment
with /* adjacent to a preceding */) documented + accepted (0 live occurrences;
full fix needs a tokenizer, out of scope).

Validated: ghost-action audit candidates 1 -> 0 (fully closed; combined with the
equality-dispatch fix this session: 3 candidate dispatchers / 67 false actions ->
0). 24/24 array-dispatch tests (+3: glob-artifact + 2 real-comment-still-stripped
regressions) + 4/4 wiring. 2-arm scrutiny PASS (differential over all 119
dispatchers: only ppDispatcher changes, only to recover genuine handlers).
```

## Files touched (3)
- .../__tests__/stop_on_unwired_assets.array-dispatch.test.mjs     | 41 ++++++++++++++++++++++++++++++
- .claude/hooks/stop_on_unwired_assets.mjs                         | 19 +++++++++++++-
- 2 files changed, 59 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till-stripped

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0782605d7f80`
- Milestone envelope: `mcp-server/data/milestones/STOP-HOOK-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._