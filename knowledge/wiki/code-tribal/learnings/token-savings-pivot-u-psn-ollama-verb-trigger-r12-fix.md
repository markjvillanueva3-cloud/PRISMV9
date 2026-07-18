# TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX (slot:alpha iter5): correct iter4 R12 — verb-routes pointed at fake prism_intelligence:ollama_* actions

**Commit:** `e4cbda64cea3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T13:47:04-05:00
**Tags:** token-savings-pivot, u-psn-ollama-verb-trigger-r12-fix, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX (slot:alpha iter5): correct iter4 R12 — verb-routes pointed at fake prism_intelligence:ollama_* actions

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX (slot:alpha iter5): correct iter4 R12 — verb-routes pointed at fake prism_intelligence:ollama_* actions

REGRESSION in shipped iter4 (commit ~previous): VERB_ROUTES surfaced
`prism_intelligence:ollama_summarize`, `prism_intelligence:ollama_explain`,
etc. — none of those MCP actions exist. Operator taking the nudge would
get an unknown-action error. Pure R12 (fail-loud) violation: I shipped
a "Suggested route" that doesn't route anywhere. The hint LOOKED concrete
but was a lie verifiable via 1 grep.

Verified real surface (devDispatcher.ts:8107-8131):
  `prism_dev:ollama_hook_query`  — calls OllamaHookBridgeEngine.query()
  `prism_dev:ollama_hook_status` — calls .status()
  hookType enum: grep_index | mcp_route | ai_feature | code_explain |
                 pattern_match | validation | general

Fix: rewrote all 7 VERB_ROUTES to reference `prism_dev:ollama_hook_query`
with the appropriate hookType, plus the real `/ollama-bridge` skill and
direct `OllamaHookBridgeEngine.getInstance().query()` engine call.

Build-time regression guard (NEW test file
`__tests__/ollama-pipeline-verb-routes-r12.test.mjs`):
  • Asserts no route references the 7 fake `prism_intelligence:*` actions
    iter4 surfaced (so the regression can't return silently)
  • Asserts every `prism_*:*` token in any route is in
    KNOWN_REAL_MCP_ACTIONS (which is grep-verified, not trust-from-memory)
  • Asserts every verb has at least one route mentioning a real action
    (no vague "use Ollama" fallback)
  • Asserts all 7 verb keys present + no empty/short routes
  • Asserts VERB_ROUTES is Object.frozen()

Total iter4+iter5 tests: 29/29 pass.

Doctrine: this corrects iter4 in the loop's "build all high roi token
savings psn synergy" arc. iter4 was net-positive — verb-triggers fire
correctly and the nudge text is right — but the action keys were wrong.
Now corrected, with a regression guard so the next iter can't drift.

Memory entry to follow: reference_psn_ollama_verb_r12_fix_2026_05_23
(via Obsidian Stop-feed). CLAUDE.md ## Recent regressions will auto-
register this as a fix-class commit.
```

## Files touched (3)
- .../ollama-pipeline-verb-routes-r12.test.mjs       | 131 +++++++++++++++++++++
- .claude/hooks/ollama-pipeline-injector.mjs         |  40 +++++--
- 2 files changed, 162 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- wrong.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e4cbda64cea3`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._