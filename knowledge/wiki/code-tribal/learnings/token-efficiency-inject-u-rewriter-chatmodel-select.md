# TOKEN-EFFICIENCY-INJECT/U-REWRITER-CHATMODEL-SELECT — [MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-CHATMODEL-SELECT (slot:alpha): fix pickModel mis-selecting gpt-oss/deepseek + returning vision models

**Commit:** `778be5414ff8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T22:10:12-05:00
**Tags:** token-efficiency-inject, u-rewriter-chatmodel-select, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-CHATMODEL-SELECT (slot:alpha): fix pickModel mis-selecting gpt-oss/deepseek + returning vision models

## Body
```
[MAIN-FORCE] [TOKEN-EFFICIENCY-INJECT]/U-REWRITER-CHATMODEL-SELECT (slot:alpha): fix pickModel mis-selecting gpt-oss/deepseek + returning vision models

WHY: prompt-rewriter-ollama.mjs#pickModel classified loaded Ollama models with an inline regex
/chat|coder|llama|mistral|phi|gemma|qwen/i that (a) did NOT recognize the gpt-oss / deepseek text
families -- so a loaded gpt-oss:120b (the warm model on the Blackwell host) was rejected as
no-model and the rewriter silently died -- and (b) would WRONGLY return a vision-language model
(qwen2.5vl, qwen3-vl, llama3.2-vision all match /qwen|llama/) for an /api/chat call, yielding a
garbage rewrite. The /api/tags fallback had the same flaw via a blind data.models[0] pick.

WHAT: new pure, tested shared helper scripts/lib/ollama-loaded-chat-model.mjs --
isChatCapable(name) (recognizes the local text-gen families; excludes vl/vision/llava/moondream/
embed with EXCLUSION-FIRST precedence so a vision model whose family token also matches chat is
still excluded) + pickLoadedChatModel(loaded, preference) (preference-first, then first loaded
chat model, else null -- never cold-loads). pickModel now delegates to it for BOTH the /api/ps
loaded path and the /api/tags installed path; the buggy inline regex and the blind models[0]
fallback are removed.

LIVE VALIDATION (R15): with qwen2.5-coder:1.5b warmed, the real rewriter now logs
using model=qwen2.5-coder:1.5b; with only qwen3-vl+qwen2.5vl loaded it correctly returns null
(skip) -- the old code would have handed qwen2.5vl to /api/chat.

TESTS: 12 reference-value cases keyed to the REAL 17-model install set (happy: every text model;
failure: vision/embed excluded, empty/null; adversarial: vision-token leak, scan-past-vision-at-0,
codestral + precedence). Rewriter system-directive 9/9 + throttle 4/4 no regression. Per-file
2-arm scrutiny PASS; 2 dormant P2 (codestral now recognized; community-chat narrowing deliberate,
logged in the helper).

CAVEAT (R12): this fixes model SELECTION. Full rewriter revival also needs a chat model kept WARM
in /api/ps -- currently only vision models persist there, so the rewriter still skips most ticks
until the prewarm keeps a coder warm (infra follow-up, not this code).
```

## Files touched (4)
- .claude/hooks/prompt-rewriter-ollama.mjs      | 31 +++++++++++++------------------
- scripts/lib/ollama-loaded-chat-model.mjs      | 70 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-loaded-chat-model.test.mjs | 81 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 164 insertions(+), 18 deletions(-)

## Lessons surfaced in commit body
- WRONGLY return a vision-language model
- till excluded) + pickLoadedChatModel(loaded, preference) (preference-first, then first loaded
- till skips most ticks
- til the prewarm keeps a coder warm (infra follow-up, not this code).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 778be5414ff8`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-EFFICIENCY-INJECT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._