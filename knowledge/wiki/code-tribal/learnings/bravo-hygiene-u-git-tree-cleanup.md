# BRAVO-HYGIENE/U-GIT-TREE-CLEANUP — ignore ephemeral .tmp.<pid> + commit-graph-chain.lock sweep + corrupt-object recovery doc

**Commit:** `bd756ae04536` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T14:51:44-05:00
**Tags:** bravo-hygiene, u-git-tree-cleanup, auto-distilled

## Subject
[BRAVO-HYGIENE]/U-GIT-TREE-CLEANUP: ignore ephemeral .tmp.<pid> + commit-graph-chain.lock sweep + corrupt-object recovery doc

## Body
```
[BRAVO-HYGIENE]/U-GIT-TREE-CLEANUP: ignore ephemeral .tmp.<pid> + commit-graph-chain.lock sweep + corrupt-object recovery doc

Three small but real wins from a git-tree audit:

(1) .gitignore — kill the 75+ atomic-write crash artifacts (*.tmp.<pid>)
    + .dd-pillar*.patch + *-last.iso + *.stamp markers. Audited the
    9967 untracked: the patterns added here are 100% disk cruft. The
    other 9882 untracked are legitimate uncommitted work that needs
    per-owning-slot commits.

(2) git-lock-sweeper.mjs — extend TOP_LOCKS to catch the
    .git/objects/info/commit-graphs/commit-graph-chain.lock that a
    crashed git fetch leaves behind. Without this every subsequent
    fetch fails with "Unable to create commit-graph-chain.lock".
    Verified via touch -t + hook invocation: cleared 1 stale lock(s).

(3) CLAUDE.md — Recent regressions entries for both the lock-sweeper
    miss and the 4-of-7 corrupt-loose-object recovery (the empty
    stubs whose content lived in pack b1687ff6 — deleted, pack
    fallback restored cat-file).

Also deleted 78 .tmp.<pid> crash artifacts from disk + 1 path-mangled
stray. The remaining 3 truly-lost objects (875d6148, f41beba8,
e36809bb) are 404 on origin AND on the E:/prism 4/17 backup — no
recovery possible. Only blocks git gc; daily flow unaffected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .claude/hooks/git-lock-sweeper.mjs | 14 +++++++++++++-
- .gitignore                         | 28 ++++++++++++++++++++++++++++
- CLAUDE.md                          |  4 ++++
- 3 files changed, 45 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bd756ae04536`
- Milestone envelope: `mcp-server/data/milestones/BRAVO-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._