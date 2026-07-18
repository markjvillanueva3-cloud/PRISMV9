# TOKEN-AWARENESS-MS0/U-TA01 — [MAIN] [TOKEN-AWARENESS-MS0]/U-TA01..12 (slot:bravo): close the model-blind-to-its-own-budget loop

**Commit:** `e6cbcc3d4821` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T01:39:37-05:00
**Tags:** token-awareness-ms0, u-ta01, auto-distilled

## Subject
[MAIN] [TOKEN-AWARENESS-MS0]/U-TA01..12 (slot:bravo): close the model-blind-to-its-own-budget loop

## Body
```
[MAIN] [TOKEN-AWARENESS-MS0]/U-TA01..12 (slot:bravo): close the model-blind-to-its-own-budget loop

12 units, 17 files, 3417 LOC, 136 tests, project tsc clean. Source: Reddit r/ClaudeAI/comments/1t9ayg8
— ToS-safe alternative to InertiaUK proxy (account-ban risk on 13-slot fleet) and ScottBull conductor
(kills interactive REPL). Uses Claude Code v1.2.80+ statusLine stdin JSON + UserPromptSubmit hook,
dedupes by message.id (token-dashboard's stream-write-2-3x bug insight).

U-TA01..12 layers: pure libs (76 tests), sidecar atomic writer, statusline reader, UserPromptSubmit
model-visible additionalContext (STATE not INSTRUCTION), Stop AGENT_CHAT advisory, MCP engine + 5
actions (state/zone/should_compact/recommend/history), /loop-aware advisory.

Zone state machine (worst-of ctx/5h/7d, missing-excluded): GREEN<60%, YELLOW 60-85%, RED 85-95%,
CRITICAL >=95%. Stale (>60s) bumps zone UP one step (never down — R12).

Knobs: PRISM_TOKEN_AWARE_{SIDECAR,INJECT,STOP}_DISABLE, PRISM_TOKEN_AWARE_INJECT_GREEN,
PRISM_TOKEN_AWARE_STOP_COOLDOWN_MS, *_PCT thresholds.
```

## Files touched (27)
- .../__tests__/token-awareness-inject.test.mjs      |  275 ++
- .../__tests__/token-awareness-sidecar.test.mjs     |  180 +
- .../token-awareness-stop-advisory.test.mjs         |   99 +
- .claude/hooks/token-awareness-inject.mjs           |  171 +
- .claude/hooks/token-awareness-sidecar.mjs          |  209 +
- .claude/hooks/token-awareness-stop-advisory.mjs    |  150 +
- .claude/statusline.mjs                             |  401 ++
- knowledge/wiki/architecture/token-awareness-ms0.md |  131 +
- .../data/training/inventorcam-milling-actions.json | 4092 ++++++++++++++++++
- .../data/training/inventorcam-milling-tips.json    | 4438 ++++++++++++++++++++
_(+17 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e6cbcc3d4821`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-AWARENESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._