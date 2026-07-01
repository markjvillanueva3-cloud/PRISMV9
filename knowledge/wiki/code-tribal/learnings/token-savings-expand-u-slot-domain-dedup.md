# TOKEN-SAVINGS-EXPAND/U-SLOT-DOMAIN-DEDUP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-SLOT-DOMAIN-DEDUP (slot:alpha): adopt injection-dedup in slot-domain-awareness-inject — fleet-wide per-prompt token saving

**Commit:** `8cd8d615e9a1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T22:06:11-05:00
**Tags:** token-savings-expand, u-slot-domain-dedup, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-SLOT-DOMAIN-DEDUP (slot:alpha): adopt injection-dedup in slot-domain-awareness-inject — fleet-wide per-prompt token saving

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-SLOT-DOMAIN-DEDUP (slot:alpha): adopt injection-dedup in slot-domain-awareness-inject — fleet-wide per-prompt token saving

The slot-domain table (~1400 chars / ~350 tokens, byte-identical across burst
prompts) re-injected on EVERY UserPromptSubmit across all 26 slots. Adopt the
proven injection-dedup lib (same pattern as slot-soul-inject): emit the full
table on first-emit / 5min-TTL-expiry / content-change, else a 122-char dedup
marker (~91% reduction on deduped prompts). Content-keyed (block hash), so a
domains-file edit or slot re-bind re-emits fresh. Fail-soft: sidecar error,
PRISM_INJECTION_DEDUP_DISABLE=1, or missing session_id → full block (zero
regression). Also tracks the hook for the first time (was running untracked).

Fleet-wide / all-galaxies (R15) — one wiring, every slot benefits.

Tests: 6/6 (.claude/hooks/__tests__/slot-domain-awareness-dedup.test.mjs) incl
the R9 content-change re-emit test (a naive once-per-session gate fails it).
Live smoke: fresh sid=1400ch full → repeat=122ch marker → disabled/no-sid=1400ch.
```

## Files touched (3)
- .claude/hooks/__tests__/slot-domain-awareness-dedup.test.mjs | 137 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/slot-domain-awareness-inject.mjs               | 181 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 318 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8cd8d615e9a1`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-EXPAND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._