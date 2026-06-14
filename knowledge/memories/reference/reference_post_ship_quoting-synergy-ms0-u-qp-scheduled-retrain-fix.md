---
name: reference_post_ship_quoting-synergy-ms0-u-qp-scheduled-retrain-fix
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-SCHEDULED-RETRAIN-FIX (commit f3d33b083). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.731Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-scheduled-retrain-fix
---


# QUOTING-SYNERGY-MS0/U-QP-SCHEDULED-RETRAIN-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-SCHEDULED-RETRAIN-FIX (slot:charlie /goal-yolo iter5): Windows ESM fix on yolo-iter3 invoker. Smoke-test exposed ERR_UNSUPPORTED_ESM_URL_SCHEME — bare 'H:/...' rejected by Node's dynamic import. Fix: pathToFileURL() wrap on both dist + src paths. Plain node now loads compiled .js; tsx wrapper loads .ts source (operator-hinted fallback when dist missing). Smoke-test PASS end-to-end with 50 ledger-bootstrap records: bootstrap -> tsx invoke -> CoV verdict safe_to_activate=true -> dry-run skipped. Chain confirmed wired: orchestrator + invoker + bootstrap + Windows-ESM fix.

**Shipped:** 2026-05-25T23:18:44-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[quoting-synergy-ms0-u-qp-scheduled-retrain-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._