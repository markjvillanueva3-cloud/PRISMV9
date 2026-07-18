# FLEET-SAFETY-MS0/U-SLOT-WORKTREE-BOOTSTRAP — [MAIN] [FLEET-SAFETY-MS0]/U-SLOT-WORKTREE-BOOTSTRAP: closes the documented-active-but-factually-inactive enforcement gap

**Commit:** `ac9c85ed24e3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T08:10:48-05:00
**Tags:** fleet-safety-ms0, u-slot-worktree-bootstrap, auto-distilled

## Subject
[MAIN] [FLEET-SAFETY-MS0]/U-SLOT-WORKTREE-BOOTSTRAP: closes the documented-active-but-factually-inactive enforcement gap

## Body
```
[MAIN] [FLEET-SAFETY-MS0]/U-SLOT-WORKTREE-BOOTSTRAP: closes the documented-active-but-factually-inactive enforcement gap

Per wiki [[slot-worktree-enforcement-not-actually-active]] (2026-05-18 audit):
  3 enforcement hooks (worktree-commit-route + git-add-lane-guard + main-tree-write-block)
  were on-disk + wired in settings.json but never fired because their arming
  condition — chat-slots.<slot>.branch starts with slot/ — was false for every
  one of the 13 slots. The /checkin Step 2c migration was documented but
  unimplemented.

This helper is Path B (skill-side auto-bootstrap) from the wiki's three
recovery options. It's pure-core + injected deps (testable without git or fs
mutations) and ships with hard safety invariants:

  1. DRY-RUN by default (no --apply) — just reports what would change
  2. Refuses on dirty shared tree (uncommitted work would be lost on switch)
  3. Refuses on non-empty target dir without --force-clean (never deletes — only audits)
  4. Per-slot only (never mutates other slots' worktrees)
  5. Idempotent (re-running on already-bootstrapped is a noop)
  6. Branch-drift recovery (worktree exists but chat-slots branch is wrong → realigns)
  7. R12 fail-loud: every refusal returns a 'reason' naming exactly why

32/32 node:test cases including injected-fs + injected-runGit + atomic
round-trip + Windows-path edge case (POSIX-style dir + .git join, since
worktree paths are always 'H:/prism-slot-<nato>' with forward slashes).

Operator invocation:
  node H:/prism/.claude/helpers/slot-worktree-bootstrap.mjs --slot golf
    (dry-run report — what would change)
  node H:/prism/.claude/helpers/slot-worktree-bootstrap.mjs --slot golf --apply
    (create H:/prism-slot-golf + slot/golf branch + update chat-slots)

Future /checkin-<nato> skill bodies should call this after slot-claim with
--apply. NOT auto-fired from /loop iters (per wiki anti-pattern — would
mutate other slots' working state). This commit ships the capability; per-chat
migration is the operator's call.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .claude/helpers/slot-worktree-bootstrap.mjs      | 395 +++++++++++++++++++++
- .claude/helpers/slot-worktree-bootstrap.test.mjs | 428 +++++++++++++++++++++++
- 2 files changed, 823 insertions(+)

## Lessons surfaced in commit body
- wrong → realigns)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ac9c85ed24e3`
- Milestone envelope: `mcp-server/data/milestones/FLEET-SAFETY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._