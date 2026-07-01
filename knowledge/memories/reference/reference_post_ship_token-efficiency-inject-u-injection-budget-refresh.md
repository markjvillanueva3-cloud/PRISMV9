---
name: reference_post_ship_token-efficiency-inject-u-injection-budget-refresh
description: Auto-distilled learnings from shipping TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-REFRESH (commit 190f36b74). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.074Z
aliases: reference_post_ship_token-efficiency-inject-u-injection-budget-refresh
---


# TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-REFRESH

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-INJECTION-BUDGET-REFRESH (slot:bravo): close the CAP-gate loop -- SessionStart opportunistic snapshot refresher (ledger unit 10). CAP gate fail-opens on a stale snapshot; this rewrites it >12h via a DETACHED probe spawn (never blocks; fleet 30m cooldown marker prevents probe-storm). WIRED SessionStart C:+H:. 16/16 tests + 3 live paths. Knobs PRISM_INJECTION_BUDGET_REFRESH_{DISABLE,INTERVAL_MS,COOLDOWN_MS}.

**Shipped:** 2026-06-10T22:21:24-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[token-efficiency-inject-u-injection-budget-refresh]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._