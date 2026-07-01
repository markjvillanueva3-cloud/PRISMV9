# CLAUDE.md PATCH — TOKEN-AWARENESS-MS0

**Surface:** `H:/prism/CLAUDE.md`
**Insertion point:** Immediately BEFORE the line `## NN-GRAPH-MS2 (2026-05-17, slot alpha) — autonomous NN lifecycle`
**Author slot:** task (not golf — written as patch-sibling per OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF doctrine)
**Date:** 2026-05-20
**Disposition:** insert as new top-level section, do not modify any other section
**Drain instruction:** golf-slot owner runs `git diff` against this file to validate, then copies the block below verbatim into CLAUDE.md and deletes this patch-sibling.

---

## TOKEN-AWARENESS-MS0 (2026-05-20) — close the model-blind-to-its-own-budget loop

PRISM's biggest autonomous-loop failure mode was that the model never SAW its own context/quota state — statusline rendered to humans only, precompact-auto-trigger fired at SOFT-880K / HARD-940K (too late for graceful wrap-up), and the model voluntarily compacted only when it remembered to. Source motivation: Reddit r/ClaudeAI/comments/1t9ayg8 (InertiaUK/claude-quota-proxy + ScottBull/claude-conductor + ryoppippi/ccusage + nateherkai/token-dashboard). The proxy approach is ToS grey-area / account-ban risk on a 13-slot fleet; the headless stream-json wrap kills the interactive REPL. The ToS-safe path: Claude Code's own **statusLine** stdin JSON carries `context_window.used_percentage` + `rate_limits.five_hour.{used_percentage,resets_at}` since v1.2.80 — and the same payload reaches **UserPromptSubmit hooks**. We capture it, dedup-by-`message.id` over the JSONL (token-dashboard's load-bearing logic against Claude's stream-write-2-3x bug), and surface the state to the model on every prompt.

**12 units shipped** (`U-TA01..U-TA12`):
- **Layer 1 — data capture** (pure libs + sidecar writer): `scripts/lib/token-awareness-state.mjs` (`computeZone`/`decideAction`/`mergeFromSources`/`applyStaleness`; 46 tests; R12 invariant: missing signal never downgrades worst-of), `scripts/lib/transcript-token-counter.mjs` (`dedupByMessageId` last-write-wins; 27 tests incl. fail-on-revert "triple-snapshot MUST NOT triple-count"), `.claude/hooks/token-awareness-sidecar.mjs` (atomic per-slot write to `state/shared/token-budget-<slot>.json`, accepts both 0..1 and 0..100 percentage forms, 9 subprocess tests).
- **Layer 2 — model-visible surfacing**: `H:/prism/.claude/statusline.mjs` reads the sidecar and renders a zone label + `5h=N%` on line 2 when `rateLimits` source present; `.claude/hooks/token-awareness-inject.mjs` emits a 3–5 line `additionalContext` block on UserPromptSubmit when zone ≥ YELLOW or stale (phrased as STATE, not INSTRUCTION — mitigates the Reddit thread's "model anxiety" concern); `.claude/hooks/token-awareness-stop-advisory.mjs` writes one-line `AGENT_CHAT.jsonl` warning when session exited at RED+ without `/compact`, with 30-min per-slot cooldown.
- **Layer 3 — engine + dispatcher**: `mcp-server/src/engines/TokenAwarenessEngine.ts` + 5 actions wired into `prism_context`: `token_awareness_{state,zone,should_compact,recommend,history}`. Round-trip vitest E2E via `registerContextDispatcher` fixture (real MCP code path, no `as any` shortcuts). 20 vitest cases.
- **Layer 4 — integration**: `/loop` keyword detection in inject hook (`isAutonomousLoopPrompt` matches `/loop`/`/autopilot-full`/`/checkin-<nato> /loop`/"until complete") emits a stronger advisory when RED+ AND prompt is an autonomous-loop driver; settings.json wires sidecar (UserPromptSubmit + PostToolUse) + inject (UserPromptSubmit, after master-index-precheck) + Stop advisory (after duplication-guard-stop).

**Zone state machine** (worst-of ctx/5h/7d signals):

| Zone | Threshold | Inject advisory | Action |
|------|-----------|-----------------|--------|
| GREEN | <60% | none (saves tokens) | proceed |
| YELLOW | 60–85% | "prefer Ollama offload, batch tool calls, avoid exploratory subagents" | wrap-up |
| RED | 85–95% | "voluntary /compact now preserves cleaner handoff than forced trip" | compact |
| CRITICAL | ≥95% | "write handoff + /compact immediately to avoid forced truncation" | stop-and-compact |

Stale sidecar (capturedAt > 60s) bumps zone UP one step (never down — R12) and adds `⚠ sidecar stale`. CRITICAL stays CRITICAL when stale; GREEN→YELLOW on stale.

**Knobs:** `PRISM_TOKEN_AWARE_SIDECAR_DISABLE=1` · `PRISM_TOKEN_AWARE_INJECT=0` · `PRISM_TOKEN_AWARE_INJECT_GREEN=1` (also inject on GREEN — debug) · `PRISM_TOKEN_AWARE_STOP_DISABLE=1` · `PRISM_TOKEN_AWARE_STOP_COOLDOWN_MS=N` · `PRISM_TOKEN_AWARE_{YELLOW,RED,CRIT}_PCT=N` (override 0.60/0.85/0.95 thresholds).

**Integration with existing surfaces:** complementary to `precompact-auto-trigger.mjs` (HARD/SOFT byte gates catch hard failure; this catches *graceful self-pacing*). Reuses `ollama-offload-stats.json` as 4th data source. 60s stale TTL aligns with statusline cache TTL. Compact-boundary slicing uses the same `'"isCompactSummary":true'` marker as statusline + precompact (drift would silently break 3 surfaces — anti-regression test pins it).

Wiki: [`knowledge/wiki/architecture/token-awareness-ms0.md`](knowledge/wiki/architecture/token-awareness-ms0.md). Memory: [[reference_token_awareness_ms0_2026_05_20]].
