---
session: claude-16769ed0
topic: loaded-first-offload
slot: alpha
written_at: 2026-06-20T04:05:00.093Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-16769ed0
status: active
---

# HANDOFF: claude-16769ed0
Updated: 2026-06-20T04:05:00.094Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-16769ed0

## STATE
Slot alpha, token-optimization. This session: closed the prompt-rewriter arc (prior compaction) then built loaded-first offload selection. Helper foundation COMMITTED clean. ask-ollama wiring entangled with zulu's live codegen -> not committed (R7/conflict-fork). Memory: reference_ask_ollama_loaded_first_and_zulu_codegen_collision_2026_06_20. Rails honored: by-pathspec commit, [MAIN-FORCE] format, no backticks in -m body, ASCII-only, R12 fail-loud on the collision.

## RESUME
U-LOADED-CHAT-STRICT-OPTION SHIPPED (1c6abe2878): strict-preference gate on pickLoadedChatModel, 17/17 + rewriter 9/9. The ask-ollama loaded-first WIRING (loadWarmModels probe + OFFLOAD_LOADED_PREFERENCE + runRequest selection, 33/33, LIVE-validated picks warm gpt-oss:120b) sits UNCOMMITTED in scripts/ask-ollama.{mjs,test.mjs} -- DO NOT commit it: slot:zulu is LIVE-editing those exact files building codegen mode ON my foundation (shared hunks, conflict-fork rule). NEXT: hunt a DIFFERENT high-ROI token-efficiency unit (do NOT re-touch ask-ollama). If zulu's codegen rots uncommitted, a coordinated co-commit (alpha loaded-first + zulu codegen + zulu's MISSING codegen tests) is the cleanup.

## CONTEXT

