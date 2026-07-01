---
name: reference_post_ship_quoting-synergy-ms0-u-qp-verify-discovery-fix
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-VERIFY-DISCOVERY-FIX (commit 211ab8e1f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.015Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-verify-discovery-fix
---


# QUOTING-SYNERGY-MS0/U-QP-VERIFY-DISCOVERY-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-VERIFY-DISCOVERY-FIX (slot:charlie /goal-yolo iter32): real silent bug caught by running iter23 verify against iter9-31 corpus. install-quoting-pipeline-cron.test.mjs (iter26) was being SILENTLY EXCLUDED from coverage because the discovery glob /^quoting-.+\.test\.mjs$/ doesn't match file names starting with 'install-'. Operator running pipeline-verify would have seen 263/263 PASS and assumed full coverage, but the 18 cron-install tests weren't running. Fix: extend regex to /^(quoting-|install-quoting-).+\.test\.mjs$/. Confirmed via re-run: 263/263 -> 281/281 across 16 -> 17 files. Also corrects my own running test-count claim across iter28-31 commits — actual was 263 not 281 (math error), now genuinely 281 after the discovery fix lands. Per R12 fail-loud: surfaced honestly rather than letting the addition error compound silently. iter23 anti-regression: verify-runner's own pure-function tests (parseTapSummary + aggregateSummaries) 19/19 still PASS — backward-compatible regex extension. The fix is exactly the kind of silent-failure-class bug iter9-31 chain is built to catch on subsequent cycles; this iter proves the chain catches itself.

**Shipped:** 2026-05-26T04:30:44-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[quoting-synergy-ms0-u-qp-verify-discovery-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._