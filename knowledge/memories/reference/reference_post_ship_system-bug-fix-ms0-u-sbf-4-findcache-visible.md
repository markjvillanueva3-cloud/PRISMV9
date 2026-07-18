---
name: reference_post_ship_system-bug-fix-ms0-u-sbf-4-findcache-visible
description: Auto-distilled learnings from shipping SYSTEM-BUG-FIX-MS0/U-SBF-4-FINDCACHE-VISIBLE (commit 015751213). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.060Z
aliases: reference_post_ship_system-bug-fix-ms0-u-sbf-4-findcache-visible
---


# SYSTEM-BUG-FIX-MS0/U-SBF-4-FINDCACHE-VISIBLE

[SYSTEM-BUG-FIX-MS0]/U-SBF-4-FINDCACHE-VISIBLE (slot:sierra): regen-viz verifies the find-cache ARTIFACT is fresh (mtime>=graph) not just the spawn exit code, retries once on transient failure, surfaces persistent staleness as findCacheDegraded in the run summary -- closes the silent rot that left find-cache STALE while the graph went FRESH (audit P1-2 durable follow-up). syntax-clean + freshness predicate validated on live data. +audit doc Round 4

**Shipped:** 2026-06-15T01:20:38-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[system-bug-fix-ms0-u-sbf-4-findcache-visible]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._