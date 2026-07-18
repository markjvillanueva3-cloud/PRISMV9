---
name: reference_post_ship_system-bug-fix-ms0-u-sbf-5-unit-pack-claim-lookup
description: Auto-distilled learnings from shipping SYSTEM-BUG-FIX-MS0/U-SBF-5-UNIT-PACK-CLAIM-LOOKUP (commit 3962eae3f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.060Z
aliases: reference_post_ship_system-bug-fix-ms0-u-sbf-5-unit-pack-claim-lookup
---


# SYSTEM-BUG-FIX-MS0/U-SBF-5-UNIT-PACK-CLAIM-LOOKUP

[SYSTEM-BUG-FIX-MS0]/U-SBF-5-UNIT-PACK-CLAIM-LOOKUP (slot:sierra): unit-knowledge-pack-inject read claims by NATO slot-name key but slot-task-claim.mjs keys claims by unitId -- the UserPromptSubmit injector silently no-op'd in production (never injected a unit pack). Resolve by each row's .slot field (freshest-by-heartbeat); the test fixtures encoded the same wrong shape (green-but-blind) so corrected them to the real unitId-keyed shape + added a regression test pinning real-vs-bug shapes. 35/35 tests. +audit doc re-run section

**Shipped:** 2026-06-15T01:31:45-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[system-bug-fix-ms0-u-sbf-5-unit-pack-claim-lookup]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._