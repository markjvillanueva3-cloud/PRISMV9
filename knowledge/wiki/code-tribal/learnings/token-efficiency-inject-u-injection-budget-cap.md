# TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-CAP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-INJECTION-BUDGET-CAP (slot:bravo): awareness ENFORCEMENT #3 -- PreToolUse(Write) per-prompt injection-budget CEILING gate. Sibling axis to injection-knob-enforce: BLOCKS a new SessionStart/UserPromptSubmit injector when the steady-state budget snapshot is at/over CAP (default 3072B), forcing a trim before the budget grows. Fail-OPEN on missing/stale snapshot (never enforce on stale data); reuses targetsRecurringInjection + STEADY_SNAPSHOT_PATH (measure+enforce share one definition). WIRED settings.json Write|MultiEdit (C:+H: mirrored). 19/19 tests + LIVE-validated all 4 paths (allow 244<3072 / block cap=100 -> 244/100 deny / advise bypass / non-injector allow). Knobs PRISM_INJECTION_BUDGET_CAP_{BYTES,TTL_MS,DISABLE}.

**Commit:** `cce466203046` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T22:09:47-05:00
**Tags:** token-efficiency-inject, u-injection-budget-cap, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-INJECTION-BUDGET-CAP (slot:bravo): awareness ENFORCEMENT #3 -- PreToolUse(Write) per-prompt injection-budget CEILING gate. Sibling axis to injection-knob-enforce: BLOCKS a new SessionStart/UserPromptSubmit injector when the steady-state budget snapshot is at/over CAP (default 3072B), forcing a trim before the budget grows. Fail-OPEN on missing/stale snapshot (never enforce on stale data); reuses targetsRecurringInjection + STEADY_SNAPSHOT_PATH (measure+enforce share one definition). WIRED settings.json Write|MultiEdit (C:+H: mirrored). 19/19 tests + LIVE-validated all 4 paths (allow 244<3072 / block cap=100 -> 244/100 deny / advise bypass / non-injector allow). Knobs PRISM_INJECTION_BUDGET_CAP_{BYTES,TTL_MS,DISABLE}.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-EFFICIENCY-INJECT]/U-INJECTION-BUDGET-CAP (slot:bravo): awareness ENFORCEMENT #3 -- PreToolUse(Write) per-prompt injection-budget CEILING gate. Sibling axis to injection-knob-enforce: BLOCKS a new SessionStart/UserPromptSubmit injector when the steady-state budget snapshot is at/over CAP (default 3072B), forcing a trim before the budget grows. Fail-OPEN on missing/stale snapshot (never enforce on stale data); reuses targetsRecurringInjection + STEADY_SNAPSHOT_PATH (measure+enforce share one definition). WIRED settings.json Write|MultiEdit (C:+H: mirrored). 19/19 tests + LIVE-validated all 4 paths (allow 244<3072 / block cap=100 -> 244/100 deny / advise bypass / non-injector allow). Knobs PRISM_INJECTION_BUDGET_CAP_{BYTES,TTL_MS,DISABLE}.
```

## Files touched (3)
- .claude/hooks/__tests__/injection-budget-cap-enforce.test.mjs | 129 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/injection-budget-cap-enforce.mjs                | 187 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 316 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cce466203046`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._