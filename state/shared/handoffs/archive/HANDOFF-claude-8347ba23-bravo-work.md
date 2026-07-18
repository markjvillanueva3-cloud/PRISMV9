---
session: claude-8347ba23
topic: bravo-work
slot: bravo
written_at: 2026-06-11T15:33:07.303Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-8347ba23
status: active
---

# HANDOFF: claude-8347ba23
Updated: 2026-06-11T15:33:07.303Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-8347ba23

## STATE
Slot bravo. ctx 67% YELLOW -> R6 checkpoint. Keystone done; #4 design resolved (integrate-into-hook), deferred for fresh-ctx+scrutiny (high-risk fleet-live-hook). Agent reviews rate-limited all session. Awareness #2 5-of-5; units 5,6,7,8 closed. zulu dup superseded.

## RESUME
5h-quota KEYSTONE #1-3+coordinator-wire SHIPPED+E2E (slot/bravo: 6f6fe88c9f sum, 80c9bbed10 populate, fa35286f10 gate, 7eb4436c3c metered, c8ed3fe71e wiki; main a5b65b8711 wire). Both pct + denominator-free absolute paths fire on real transcripts. 105 tests. 2 Number(null)===0 bugs fixed. SUPERSEDES zulu uncommitted populate-5h-quota.mjs (no hardcoded-ceiling bug; meteredTokens cacheRead-excluded live raw=645M/weighted=102M/metered=33M). INERT by default (no budget/trigger -> no switch). NEXT = #4, DESIGN NOW RESOLVED: token-awareness-sidecar.mjs OVERWRITES token-budget-<slot>.json (writeFileSync full obj line157, fiveHourPct from null rate_limits) -> a separate populator/scheduled-task gets clobbered. SO #4 = INTEGRATE the 5h-sum INTO token-awareness-sidecar.mjs (single writer): when rate_limits.five_hour absent, call fiveHourTokenSum + write real quota.fiveHour {usedTokens,weightedTokens,meteredTokens,pct(if PRISM_5H_WEIGHTED_BUDGET set else null)}. HIGH-RISK fleet-live-hook (fires every UserPromptSubmit x25 chats) -> do on FRESH ctx WITH agent scrutiny available; test in isolation before wiring. Scheduled-task approach REJECTED. Operator still must set PRISM_5H_WEIGHTED_TOKEN_TRIGGER or PRISM_5H_WEIGHTED_BUDGET for switch to fire. Re-read ledger row 1 + reference_5h_keystone_2026_06_11. After #4: ledger units 3/4/9 (Hermes cron / mcp-obsidian bridge / capability research) need clean quota window + Hermes restart.

## CONTEXT

