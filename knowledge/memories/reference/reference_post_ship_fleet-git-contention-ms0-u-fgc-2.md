---
name: reference_post_ship_fleet-git-contention-ms0-u-fgc-2
description: Auto-distilled learnings from shipping FLEET-GIT-CONTENTION-MS0/U-FGC-2 (commit 50f598afc). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.352Z
aliases: reference_post_ship_fleet-git-contention-ms0-u-fgc-2
---


# FLEET-GIT-CONTENTION-MS0/U-FGC-2

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-GIT-CONTENTION-MS0]/U-FGC-2 (slot:golf): kill the chat-slots lock-orphan leak. git status 56,589 to 28,013 (-50.5 pct). Root cause: releaseLock renamed the lock to lockPath.released-timestamp instead of deleting it (the documented best-effort-delete intent), leaking one orphan per release -- 28,761 chat-slots.lock.released-* accumulated under state/shared = 57 pct of the repo entire git-status churn. Fix: unlinkSync primary, rename kept only as a Windows unlink-race fallback. Swept 28,761 existing orphans + .gitignore guards the fallback path + 2 regression tests (held-during/deleted-after/zero-orphan + 25-cycle accumulation). NOTE: >90 pct target NOT met yet -- residual 28,013 is dominated by ~16K generated-but-content knowledge/wiki/architecture pages (16,797 tracked vs 13,161 untracked) whose track-vs-ignore is a genuine cross-PC-divergence policy call, NOT blind noise; flagged for operator decision, not auto-untracked (R12).

**Shipped:** 2026-06-04T12:03:28-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[fleet-git-contention-ms0-u-fgc-2]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._