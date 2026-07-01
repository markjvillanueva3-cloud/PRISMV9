---
name: reference_post_ship_quoting-synergy-ms0-u-qp-cron-cwd-fix
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-CRON-CWD-FIX (commit 199db23e7). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.006Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-cron-cwd-fix
---


# QUOTING-SYNERGY-MS0/U-QP-CRON-CWD-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-CRON-CWD-FIX (slot:charlie): pin the generated nightly-wrapper cwd to PrismRoot via Set-Location -- latent bug exposed completing T4: the scheduled task default cwd is System32 but Stage 0 (from-corpus) resolves state/shared/databases/*.jsonl + baseline-records.json cwd-relative, so without this the rewired Stage 0 fails to find its inputs. Validated via installer -DryRun (generated wrapper shows Set-Location 'H:\prism' + from-corpus Stage0). 19/19 tests, .ps1 PARSE-OK. SCOPE: Stage2 training reads a separate corpus (baseline-records-corpus-with-real.json); Stage0 feeds Stage1

**Shipped:** 2026-06-11T18:36:57-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[quoting-synergy-ms0-u-qp-cron-cwd-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._