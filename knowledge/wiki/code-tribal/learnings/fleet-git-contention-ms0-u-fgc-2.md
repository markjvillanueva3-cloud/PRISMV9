# FLEET-GIT-CONTENTION-MS0/U-FGC-2 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-GIT-CONTENTION-MS0]/U-FGC-2 (slot:golf): kill the chat-slots lock-orphan leak. git status 56,589 to 28,013 (-50.5 pct). Root cause: releaseLock renamed the lock to lockPath.released-timestamp instead of deleting it (the documented best-effort-delete intent), leaking one orphan per release -- 28,761 chat-slots.lock.released-* accumulated under state/shared = 57 pct of the repo entire git-status churn. Fix: unlinkSync primary, rename kept only as a Windows unlink-race fallback. Swept 28,761 existing orphans + .gitignore guards the fallback path + 2 regression tests (held-during/deleted-after/zero-orphan + 25-cycle accumulation). NOTE: >90 pct target NOT met yet -- residual 28,013 is dominated by ~16K generated-but-content knowledge/wiki/architecture pages (16,797 tracked vs 13,161 untracked) whose track-vs-ignore is a genuine cross-PC-divergence policy call, NOT blind noise; flagged for operator decision, not auto-untracked (R12).

**Commit:** `50f598afcf75` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T12:03:28-05:00
**Tags:** fleet-git-contention-ms0, u-fgc-2, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-GIT-CONTENTION-MS0]/U-FGC-2 (slot:golf): kill the chat-slots lock-orphan leak. git status 56,589 to 28,013 (-50.5 pct). Root cause: releaseLock renamed the lock to lockPath.released-timestamp instead of deleting it (the documented best-effort-delete intent), leaking one orphan per release -- 28,761 chat-slots.lock.released-* accumulated under state/shared = 57 pct of the repo entire git-status churn. Fix: unlinkSync primary, rename kept only as a Windows unlink-race fallback. Swept 28,761 existing orphans + .gitignore guards the fallback path + 2 regression tests (held-during/deleted-after/zero-orphan + 25-cycle accumulation). NOTE: >90 pct target NOT met yet -- residual 28,013 is dominated by ~16K generated-but-content knowledge/wiki/architecture pages (16,797 tracked vs 13,161 untracked) whose track-vs-ignore is a genuine cross-PC-divergence policy call, NOT blind noise; flagged for operator decision, not auto-untracked (R12).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-GIT-CONTENTION-MS0]/U-FGC-2 (slot:golf): kill the chat-slots lock-orphan leak. git status 56,589 to 28,013 (-50.5 pct). Root cause: releaseLock renamed the lock to lockPath.released-timestamp instead of deleting it (the documented best-effort-delete intent), leaking one orphan per release -- 28,761 chat-slots.lock.released-* accumulated under state/shared = 57 pct of the repo entire git-status churn. Fix: unlinkSync primary, rename kept only as a Windows unlink-race fallback. Swept 28,761 existing orphans + .gitignore guards the fallback path + 2 regression tests (held-during/deleted-after/zero-orphan + 25-cycle accumulation). NOTE: >90 pct target NOT met yet -- residual 28,013 is dominated by ~16K generated-but-content knowledge/wiki/architecture pages (16,797 tracked vs 13,161 untracked) whose track-vs-ignore is a genuine cross-PC-divergence policy call, NOT blind noise; flagged for operator decision, not auto-untracked (R12).
```

## Files touched (4)
- .claude/helpers/chat-slots-release-no-orphan.test.mjs | 65 +++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/chat-slots.mjs                        | 16 ++++++++--
- .gitignore                                            |  6 ++++
- 3 files changed, 84 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- NOTE: >90 pct target NOT met yet -- residual 28,013 is dominated by ~16K generated-but-content knowledge/wiki/architecture pages (16,797 tracked vs 13,161 untracked) whose track-vs-ignore is a genuine cross-PC-divergence policy call, NOT blind noise; flagged for operator decision, not auto-untracked (R12).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 50f598afcf75`
- Milestone envelope: `mcp-server/data/milestones/FLEET-GIT-CONTENTION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._