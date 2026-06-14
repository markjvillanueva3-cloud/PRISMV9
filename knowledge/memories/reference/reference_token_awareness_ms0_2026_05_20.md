---
name: reference-token-awareness-ms0-2026-05-20
description: TOKEN-AWARENESS-MS0 — 12-unit milestone that gives the model live context/quota awareness via sidecar + statusLine-piped rate_limits + UserPromptSubmit inject + Stop advisory + MCP engine + dispatcher
aliases: reference_token_awareness_ms0_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.972Z
---


# TOKEN-AWARENESS-MS0 (2026-05-20, 12 units)

**Closes:** the model-blind-to-its-own-budget loop. Before MS0, the model never SAW its own ctx/5h/7d/offload state — surfaces existed but rendered to humans only or fired too late.

**Source motivation:** Reddit r/ClaudeAI/comments/1t9ayg8 (InertiaUK proxy = ToS grey-area; ScottBull conductor = stream-json kills REPL; ryoppippi ccusage + nateherkai token-dashboard taught us message.id dedup). The ToS-safe path: Claude Code v1.2.80+ statusLine stdin → UserPromptSubmit hook → sidecar → inject + engine + Stop advisory.

**Units shipped (12):**
- **U-TA01** `scripts/lib/token-awareness-state.mjs` — pure lib (computeZone/decideAction/mergeFromSources/applyStaleness), 46 tests
- **U-TA02** `scripts/lib/transcript-token-counter.mjs` — JSONL tail-read + dedupByMessageId (last-write-wins, prevents stream-write-2-3× over-count), 27 tests
- **U-TA03** `.claude/hooks/token-awareness-sidecar.mjs` — UserPromptSubmit + PostToolUse atomic writer, 9 subprocess tests
- **U-TA04** `H:/prism/.claude/statusline.mjs` — reads sidecar for richer zone+5h-quota line 2 display
- **U-TA05** `.claude/hooks/token-awareness-inject.mjs` — UserPromptSubmit model-visible additionalContext (STATE not INSTRUCTION — mitigates Reddit "model anxiety" warning), 24 tests
- **U-TA06** `mcp-server/src/engines/TokenAwarenessEngine.ts` + 5 actions wired into prism_context: token_awareness_{state,zone,should_compact,recommend,history}; 20 vitest cases via `registerContextDispatcher` fixture
- **U-TA07** `/loop` keyword detection (isAutonomousLoopPrompt) + stronger advisory when RED+ AND autonomous-loop driver
- **U-TA08** `.claude/hooks/token-awareness-stop-advisory.mjs` — Stop hook AGENT_CHAT warning when exited RED+ without /compact, 30-min cooldown, 10 tests
- **U-TA09** settings.json wiring (UserPromptSubmit + PostToolUse + Stop chains, auto-mirrored to H:)
- **U-TA10** CLAUDE.md doctrine §TOKEN-AWARENESS-MS0 (via patch-sibling — CLAUDE.md edit is golf-only)
- **U-TA11** wiki [[token-awareness-ms0]] + this memory file
- **U-TA12** MEMORY.md index pointer

**Zone thresholds (worst-of ctx/5h/7d):** GREEN <60%, YELLOW 60-85%, RED 85-95%, CRITICAL ≥95%. Stale (>60s) bumps zone UP one step (never down — R12).

**R12 invariants tested:**
1. Missing 5h signal MUST NOT silently downgrade RED ctx.
2. Stale GREEN MUST NOT silently stay GREEN.
3. Triple-snapshot dedup MUST NOT triple-count.
4. COMPACT_MARKER string MUST match statusline + precompact gate.
5. All 5 token_awareness_* actions MUST appear in z.enum + cases + schemas.

**Knobs:** `PRISM_TOKEN_AWARE_{SIDECAR,INJECT,STOP}_DISABLE`, `PRISM_TOKEN_AWARE_INJECT_GREEN=1`, `PRISM_TOKEN_AWARE_STOP_COOLDOWN_MS=N`, `PRISM_TOKEN_AWARE_{YELLOW,RED,CRIT}_PCT=N`.

**Total tests:** 136 across 6 test files. All pass. R9-compliant (no toBeDefined stubs; real-value assertions throughout).

**Why:** see [[feedback_always_capture_lessons]] · [[reference_session_continuity_stack_2026_05_15]] · [[reference_ollama_pipeline_ms0_2026_05_15]]

**How to apply:** the chain is wired and live as of session 5852a0b9. No further work required to activate. To tune thresholds, set the PRISM_TOKEN_AWARE_*_PCT env vars in settings.json. To debug, set PRISM_TOKEN_AWARE_INJECT_GREEN=1 to see the inject block at every zone including GREEN.
