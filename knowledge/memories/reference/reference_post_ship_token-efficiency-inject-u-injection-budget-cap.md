---
name: reference_post_ship_token-efficiency-inject-u-injection-budget-cap
description: Auto-distilled learnings from shipping TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-CAP (commit cce466203). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.074Z
aliases: reference_post_ship_token-efficiency-inject-u-injection-budget-cap
---


# TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-CAP

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-INJECTION-BUDGET-CAP (slot:bravo): awareness ENFORCEMENT #3 -- PreToolUse(Write) per-prompt injection-budget CEILING gate. Sibling axis to injection-knob-enforce: BLOCKS a new SessionStart/UserPromptSubmit injector when the steady-state budget snapshot is at/over CAP (default 3072B), forcing a trim before the budget grows. Fail-OPEN on missing/stale snapshot (never enforce on stale data); reuses targetsRecurringInjection + STEADY_SNAPSHOT_PATH (measure+enforce share one definition). WIRED settings.json Write|MultiEdit (C:+H: mirrored). 19/19 tests + LIVE-validated all 4 paths (allow 244<3072 / block cap=100 -> 244/100 deny / advise bypass / non-injector allow). Knobs PRISM_INJECTION_BUDGET_CAP_{BYTES,TTL_MS,DISABLE}.

**Shipped:** 2026-06-10T22:09:47-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[token-efficiency-inject-u-injection-budget-cap]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._