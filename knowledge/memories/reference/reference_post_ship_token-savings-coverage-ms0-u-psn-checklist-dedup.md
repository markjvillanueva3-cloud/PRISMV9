---
name: reference_post_ship_token-savings-coverage-ms0-u-psn-checklist-dedup
description: Auto-distilled learnings from shipping TOKEN-SAVINGS-COVERAGE-MS0/U-PSN-CHECKLIST-DEDUP (commit 0fc093d6e). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.075Z
aliases: reference_post_ship_token-savings-coverage-ms0-u-psn-checklist-dedup
---


# TOKEN-SAVINGS-COVERAGE-MS0/U-PSN-CHECKLIST-DEDUP

[BOOTSTRAP-SLOT-ENFORCE] [MAIN] [TOKEN-SAVINGS-COVERAGE-MS0]/U-PSN-CHECKLIST-DEDUP (slot:alpha via shared-tree, audited bootstrap): Cat-A 4/4 COMPLETE. Session-keyed content-hash dedup via injection-dedup-lib (24h TTL); dropped per-prompt 'Prompt length' line so body is byte-identical → dedup catches re-emits. Was 37 fires/10K tokens with ZERO dedup; now ~1/session. ~260K tokens/day fleet-wide. File only in shared tree (golf 2026-05-24); slot/alpha branch can't see it. 16/16 tests PASS. Cat-A summary: ~76K/chat/session × 26 fleet ≈ 1.9M tokens/day saved.

**Shipped:** 2026-05-25T01:00:32-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[token-savings-coverage-ms0-u-psn-checklist-dedup]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._