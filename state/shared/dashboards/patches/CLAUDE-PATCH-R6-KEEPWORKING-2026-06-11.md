# PATCH-SIBLING: add R6 keep-working doctrine to root CLAUDE.md

> Surface: `H:/prism/CLAUDE.md` (PEER-LOCKED this session -- `M CLAUDE.md` dirty with peer WIP,
> so this is a patch-sibling per the PATCH-SIBLING convention, not a direct edit).
> Unit: AUTO-COMPACTION-MODEL-HANDOFF-MS0 / W4-#3 (slot:alpha, 2026-06-11).
> Apply when CLAUDE.md is free (integrator/golf, or the peer who holds it).

## Why
The root project CLAUDE.md has NO R6 keep-working doctrine (`grep -c "context growth is NOT a
stop signal" CLAUDE.md` = 0). Post-compact sessions see the PROJECT CLAUDE.md first; without R6
there, a fresh chat may pre-emptively /compact instead of working until autocompact. The global
(C:) CLAUDE.md has R6, and all 34 galaxy CLAUDE.md now carry the CRITIC-KEEPWORKING-STANZA
(commit 9be6cfc804) -- but the root project file is the gap.

## Exact edit
Insert the following block immediately AFTER the `## SESSION CONTINUITY STACK ...` header
(currently line 132), before its existing body:

```
**R6 DOCTRINE (operator-locked, fleet-wide):** context growth is NOT a stop signal -- keep
building until native autocompact fires at 95% (`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95`). At the
88%/94% thresholds the `precompact-auto-trigger` hook directs you to author your OWN optimal
handoff via `per-agent-handoff.mjs write --source live-chat` (NOT the stub helper); the
PreCompact hook then defers to it (anti-clobber). Never pre-empt work to run /precompact or
/compact manually -- a SPIRAL (repeating failure / degrading output) is the real stop signal,
context size is not. Shipped this session: AUTO-COMPACTION-MODEL-HANDOFF-MS0 (commits
1e25893b31 + c942846125 + 6a394d47ce). See global CLAUDE.md R6 + [[feedback_context_growth_not_a_stop_signal]].
```

## Verify after apply
`grep -c "context growth is NOT a stop signal" H:/prism/CLAUDE.md` -> >= 1.
