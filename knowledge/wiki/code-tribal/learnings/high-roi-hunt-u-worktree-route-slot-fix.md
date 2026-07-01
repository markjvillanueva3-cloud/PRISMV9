# HIGH-ROI-HUNT/U-WORKTREE-ROUTE-SLOT-FIX — [MAIN-FORCE] [HIGH-ROI-HUNT]/U-WORKTREE-ROUTE-SLOT-FIX (slot:alpha): fix fleet-wide worktree-route commit blocker

**Commit:** `7d1b0a799bd9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T14:11:21-05:00
**Tags:** high-roi-hunt, u-worktree-route-slot-fix, auto-distilled

## Subject
[MAIN-FORCE] [HIGH-ROI-HUNT]/U-WORKTREE-ROUTE-SLOT-FIX (slot:alpha): fix fleet-wide worktree-route commit blocker

## Body
```
[MAIN-FORCE] [HIGH-ROI-HUNT]/U-WORKTREE-ROUTE-SLOT-FIX (slot:alpha): fix fleet-wide worktree-route commit blocker

LIVE hook fix (cross-cutting fleet infra -> [MAIN-FORCE]). The
worktree-commit-route PreToolUse hook was denying EVERY slot commit fleet-wide
because a malformed peer worktree branch with a leading dash
(work/-system-viz-brain-ms0-u--41db1b) made the inline scopeMatchesBranch's
`branchHead.split("-")[0]` == "" and `scopeToken.includes("")` is always true.

 - scripts/lib/worktree-route-match.mjs (NEW) -- pure, tested (11/11) match logic:
   branchLeadToken (first NON-EMPTY hyphen segment), scopeMatchesBranch (>=2-char
   guard), isSlotBranch. The hook had ZERO tests, which is how the bug shipped.
 - .claude/hooks/worktree-commit-route.mjs -- imports the lib (removes the buggy
   inline copies) + adds a SLOT-WORKTREE ALLOW: a slot worktree (branch slot/<name>)
   is governed by slot-commit-enforce, not scope->branch matching, so the hook now
   exits 0 for slot worktrees instead of denying on a milestone-scoped commit.

VALIDATED: previously-blocked slot commit now passes (this fix's own slot/alpha
source commit 1feeabcd4f is the proof); main-tree wrong-scope commit STILL denies
(adversarial probe: DENY emitted); patcher subprocess self-test exit 0. Source +
patcher + tests on slot/alpha 1feeabcd4f. Memory: reference_worktree_route_empty_token_bug_2026_06_12.
```

## Files touched (3)
- .claude/hooks/worktree-commit-route.mjs | 25 ++++++++++++++-----------
- scripts/lib/worktree-route-match.mjs    | 57 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 71 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- wrong-scope commit STILL denies

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7d1b0a799bd9`
- Milestone envelope: `mcp-server/data/milestones/HIGH-ROI-HUNT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._