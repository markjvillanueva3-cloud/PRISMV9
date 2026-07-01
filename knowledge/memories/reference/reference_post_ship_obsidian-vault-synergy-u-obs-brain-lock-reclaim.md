---
name: reference_post_ship_obsidian-vault-synergy-u-obs-brain-lock-reclaim
description: Auto-distilled learnings from shipping OBSIDIAN-VAULT-SYNERGY/U-OBS-BRAIN-LOCK-RECLAIM (commit afc654024). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.951Z
aliases: reference_post_ship_obsidian-vault-synergy-u-obs-brain-lock-reclaim
---


# OBSIDIAN-VAULT-SYNERGY/U-OBS-BRAIN-LOCK-RECLAIM

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-BRAIN-LOCK-RECLAIM (slot:alpha): corrupt brain-refresh lock froze the dense recall arm 27h (R3-C1, ultracode round-2 wp9xijq9b top finding). acquireLockAt's catch{return false} on an unparseable lock ('conservative, never run blind') meant a 32-NUL-byte .brain-refresh.lock dead-locked ALL 5 refresh pipelines (BM25/dense/AMP2/wiki-tribal/viz) fleet-wide — dense sidecar frozen at 11402/builtAt-Jun8 while BM25 advanced to today (1946-memo lag, growing per-session). A corrupt lock is BY DEFINITION not a live holder -> now routed into the SAME race-safe rename-aside reclaim path as stale/dead-PID holders, fail-LOUD to stderr. Removed the live 32-NUL lock for immediate unblock (next Stop-hook brain-refresh re-embeds). Rewrote the test that ENCODED the bug (garbage-lock->false) to the corrected intent + the 32-NUL live-incident case + a no-over-reach regression (live lock still blocks). 58/58. Single-writer invariant preserved (parseable+alive+recent still defers; reclaim still rename-aside race-guarded).

**Shipped:** 2026-06-09T10:08:46-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[obsidian-vault-synergy-u-obs-brain-lock-reclaim]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._