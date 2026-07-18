# PROMPT-ROUTE-HISTORY/U-SLASH-PLANS — [MAIN-FORCE] [PROMPT-ROUTE-HISTORY]/U-SLASH-PLANS (slot:alpha): route-class decision table for all 1266 slash commands, wired into live prompt-route-inject

**Commit:** `dff1fc8b6ebf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T14:48:13-05:00
**Tags:** prompt-route-history, u-slash-plans, auto-distilled

## Subject
[MAIN-FORCE] [PROMPT-ROUTE-HISTORY]/U-SLASH-PLANS (slot:alpha): route-class decision table for all 1266 slash commands, wired into live prompt-route-inject

## Body
```
[MAIN-FORCE] [PROMPT-ROUTE-HISTORY]/U-SLASH-PLANS (slot:alpha): route-class decision table for all 1266 slash commands, wired into live prompt-route-inject

Per-command half of the routing brain. build-slash-command-plans.mjs enumerates every command .md (1266; 860 distinct) -> classify via classifyRoutingClass (R8) -> byClass -> slash-command-plans.json + --query CLI. WIRE: prompt-route-inject appends class-specific commands (knob PRISM_SLASH_PLAN_INJECT, fail-soft, backward-compat). TEST 37 asserts. P1 frontmatter-truncation silent-corruption fixed (HEAD_BYTES 16K + truncation-safe parse + YAML-key guard) +3 P2; both scrutiny arms PASS.
```

## Files touched (6)
- .claude/hooks/prompt-route-inject.mjs      |   36 +-
- .claude/hooks/prompt-route-inject.test.mjs |   33 +-
- scripts/build-slash-command-plans.mjs      |  257 ++++
- scripts/build-slash-command-plans.test.mjs |  170 +++
- state/shared/slash-command-plans.json      | 9103 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 9595 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dff1fc8b6ebf`
- Milestone envelope: `mcp-server/data/milestones/PROMPT-ROUTE-HISTORY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._