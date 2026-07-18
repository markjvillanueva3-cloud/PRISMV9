---
name: reference_post_ship_test-integrity-u-stopgate-r9
description: Auto-distilled learnings from shipping TEST-INTEGRITY/U-STOPGATE-R9 (commit ab2b3bc84). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.071Z
aliases: reference_post_ship_test-integrity-u-stopgate-r9
---


# TEST-INTEGRITY/U-STOPGATE-R9

[MAIN-FORCE] [TEST-INTEGRITY]/U-STOPGATE-R9 (slot:alpha): land stop_on_failing_tests stale-green freshness block (net-new vs HEAD) + extract pure pickStaleTestFromStatus + main-guard + first R9 test (17/17). Behavior verified preserved via live subprocess; 2-arm scrutiny PASS. KNOWN-OPEN: whole-tree git-status scan thrashes under concurrent fleet build (ref reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24); correct fix is caller-layer per-slot input scoping (golf/sierra/zulu infra lane) -- this R9 test is the regression net for that fix. Does NOT loosen the gate.

**Shipped:** 2026-06-24T10:10:49-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[test-integrity-u-stopgate-r9]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._