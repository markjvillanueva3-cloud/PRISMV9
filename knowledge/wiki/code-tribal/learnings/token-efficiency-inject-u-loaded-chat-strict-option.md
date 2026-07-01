# TOKEN-EFFICIENCY-INJECT/U-LOADED-CHAT-STRICT-OPTION — [MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-LOADED-CHAT-STRICT-OPTION (slot:alpha): strict-preference gate on pickLoadedChatModel for quality-sensitive loaded-first offload selection

**Commit:** `1c6abe2878e3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T23:03:07-05:00
**Tags:** token-efficiency-inject, u-loaded-chat-strict-option, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-LOADED-CHAT-STRICT-OPTION (slot:alpha): strict-preference gate on pickLoadedChatModel for quality-sensitive loaded-first offload selection

## Body
```
[MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-LOADED-CHAT-STRICT-OPTION (slot:alpha): strict-preference gate on pickLoadedChatModel for quality-sensitive loaded-first offload selection

Adds an opts.strict flag (default false = byte-identical for the existing
prompt-rewriter consumer). strict:true drops the any-loaded-chat-model
fallback so a quality-sensitive offload caller gets a loaded model ONLY when
it is in the caller preference list; otherwise null, so the caller cold-loads
its best-installed pick instead of running a heavy task on an arbitrary tiny
warm model. Same exclusion-first capability gate (a vision model is never
returned). Foundation for ask-ollama loaded-first selection.

Tests: 17/17 (5 new strict-path cases: preference-hit, non-preferred-refused,
strict-vs-non-strict contrast, vision-still-excluded, preference-ordering).
Rewriter consumer regression: 9/9 unchanged (2-arg default path byte-identical).
```

## Files touched (3)
- scripts/lib/ollama-loaded-chat-model.mjs      | 18 +++++++++++++++---
- scripts/lib/ollama-loaded-chat-model.test.mjs | 33 +++++++++++++++++++++++++++++++++
- 2 files changed, 48 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till-excluded, preference-ordering).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1c6abe2878e3`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._