---
title: TOKEN-AWARENESS-MS0 — model-visible context/quota state
date: 2026-05-20
category: architecture
status: shipped
tags: [token-awareness, autonomous-loop, context-pressure, compact, sidecar, statusline]
---

# TOKEN-AWARENESS-MS0 — closing the model-blind-to-its-own-budget loop

## Why

PRISM's autonomous `/loop` would spend a full context window without the model ever seeing how close it was to the limit. The existing surfaces — `precompact-auto-trigger.mjs` (SOFT 880K / HARD 940K byte gates), `statusline.mjs` (HP bar to humans), `ollama-offload-stats.json` (advisory) — all rendered to the operator OR fired too late for graceful wrap-up. The model itself was blind. Recovery from a `/compact` that fires mid-tool-call corrupts handoff quality.

Source motivation: [Reddit r/ClaudeAI/comments/1t9ayg8](https://www.reddit.com/r/ClaudeAI/comments/1t9ayg8/i_made_claude_code_aware_of_its_own_usage_limits/) — `InertiaUK/claude-quota-proxy` (proxy approach, ToS grey-area / account-ban risk on a 13-slot fleet); `ScottBull/claude-conductor` (`--output-format stream-json --verbose` wrap, but kills interactive REPL); `ryoppippi/ccusage` + `nateherkai/token-dashboard` (JSONL post-hoc readers, taught us the `message.id` dedup).

The ToS-safe path: Claude Code v1.2.80+ statusLine stdin JSON carries `context_window.used_percentage` + `rate_limits.five_hour.{used_percentage,resets_at}` + `cost.total_cost_usd` — and the SAME payload reaches UserPromptSubmit hooks. We capture it, dedupe-by-message.id over the transcript JSONL (Claude stream-writes 2-3× per assistant message — naive sums over-count), and surface it to the model on every prompt.

## Architecture

```
                                    ┌─────────────────────────┐
                                    │  Claude Code v1.2.80+   │
                                    │  statusLine stdin JSON  │
                                    │  - session_id           │
                                    │  - transcript_path      │
                                    │  - context_window.*     │
                                    │  - rate_limits.*        │
                                    │  - cost.total_cost_usd  │
                                    └────────────┬────────────┘
                                                 │
                       ┌─────────────────────────┼─────────────────────────┐
                       ▼                         ▼                         ▼
            ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
            │  statusline.mjs  │      │ token-awareness- │      │ token-awareness- │
            │ (humans, line 2  │      │ sidecar.mjs      │      │ stop-advisory    │
            │  zone+5h%)       │      │ UserPromptSubmit │      │ .mjs (Stop hook) │
            │                  │      │ +PostToolUse     │      │ AGENT_CHAT       │
            └──────────────────┘      └────────┬─────────┘      │ warning at RED+  │
                       ▲                       │                └──────────────────┘
                       │                       ▼
                       │             ┌─────────────────────┐
                       │             │ state/shared/       │
                       └─────────────┤ token-budget-       │
                       reads          │ <slot>.json         │
                       ┌─────────────┤ schemaVersion 1.0.0 │
                       │             └─────────┬───────────┘
                       │                       │
                       │                       ▼
            ┌──────────────────┐      ┌──────────────────┐
            │ token-awareness- │      │ TokenAwareness   │
            │ inject.mjs       │      │ Engine + 5 MCP   │
            │ UserPromptSubmit │      │ actions in       │
            │ → model SEES it  │      │ prism_context    │
            └──────────────────┘      └──────────────────┘
```

## Data sources

1. **statusline ctx** — transcript byte-tail estimate with compact-boundary slicing (same algo as `statusline.mjs`). Always present.
2. **rate_limits** — Claude Code v1.2.80+ stdin field. Gracefully missing on older versions.
3. **transcript dedup-cumulative** — `dedupByMessageId` keeps last-write-wins per message.id, sums `{input, cache_read, cache_creation, output}`. Token-dashboard's bug-prevention insight: Claude writes the same assistant message.id 2-3× while streaming; naive sums over-count.
4. **ollama-offload** — `ollama-offload-stats.json` (`offloaded`/`keptOnClaude`/`ratio`). Target ≥30% per CLAUDE.md.

## Zone state machine

Worst-of any present signal (ctx / 5h / 7d). Missing signals excluded — never silently downgrade the worst-of.

| Zone | Threshold | Action | Model-visible advisory |
|------|-----------|--------|------------------------|
| GREEN | worst < 60% | proceed | none (saves tokens) |
| YELLOW | 60% ≤ worst < 85% | wrap-up | "prefer Ollama offload, batch tool calls, avoid exploratory subagents" |
| RED | 85% ≤ worst < 95% | compact | "voluntary /compact now preserves cleaner handoff than forced trip" |
| CRITICAL | worst ≥ 95% | stop-and-compact | "write handoff + /compact immediately to avoid forced truncation" |

**Stale handling** (R12 — fail loud): if sidecar `capturedAt > 60s` old, bump zone UP one step (GREEN→YELLOW, YELLOW→RED) and surface `⚠ sidecar stale`. RED stays RED. Never silently downgrade.

## /loop integration

The inject hook detects autonomous-loop keywords (`/loop`, `/autopilot-full`, `/checkin-<nato> /loop`, "until complete", "keep going", "continuous") and emits a STRONGER advisory when zone is RED+ AND the prompt is an autonomous-loop driver:

> /loop detected: next iteration will likely exceed budget — voluntarily /precompact then /compact NOW preserves the next 3-6 iterations cleanly. Forced trip mid-iteration corrupts handoff.

## Safety invariants

1. **R12 — Missing signal never downgrades worst-of.** Tested via `regression: missing 5h doesn't silently downgrade RED ctx`.
2. **R12 — Stale sidecar never silently looks fresh.** Tested via `regression: stale GREEN must never silently stay GREEN`.
3. **R12 — Triple-snapshot dedup MUST NOT triple-count.** Tested via `regression: triple-snapshot dedup MUST NOT triple-count` in transcript-token-counter.
4. **Compact-boundary marker MUST match statusline + precompact.** Tested via `regression: COMPACT_MARKER string MUST match statusline + precompact gate` — drift would silently break 3 surfaces.
5. **Dispatcher wiring anti-regression.** All 5 `token_awareness_*` actions must appear in z.enum + cases + schemas — 2 vitest tests pin this.

## MCP dispatcher actions (`prism_context`)

| Action | Signature | Returns |
|--------|-----------|---------|
| `token_awareness_state` | `{slot?, sessionId?}` | Full `TokenAwarenessState` or null |
| `token_awareness_zone` | `{slot?, sessionId?}` | `{zone, worstPct, worstSource, action, reasoning, stale}` |
| `token_awareness_should_compact` | `{slot?, sessionId?}` | `{shouldCompact, reason, zone, worstPct}` |
| `token_awareness_recommend` | `{slot?, sessionId?}` | `{action, reasoning, zone}` |
| `token_awareness_history` | `{}` | `{slots: [...], count}` — fleet view |

## Knobs

| Env | Effect |
|-----|--------|
| `PRISM_TOKEN_AWARE_SIDECAR_DISABLE=1` | Disable sidecar writer |
| `PRISM_TOKEN_AWARE_INJECT=0` | Disable model-visible inject |
| `PRISM_TOKEN_AWARE_INJECT_GREEN=1` | Also inject on GREEN (debug) |
| `PRISM_TOKEN_AWARE_STOP_DISABLE=1` | Disable Stop advisory |
| `PRISM_TOKEN_AWARE_STOP_COOLDOWN_MS=N` | Stop advisory cooldown (default 30 min) |
| `PRISM_TOKEN_AWARE_YELLOW_PCT=0.55` | Lower YELLOW threshold |
| `PRISM_TOKEN_AWARE_RED_PCT=0.80` | Lower RED threshold |
| `PRISM_TOKEN_AWARE_CRIT_PCT=0.92` | Lower CRITICAL threshold |

## Tests

- `scripts/lib/__tests__/token-awareness-state.test.mjs` — 46 cases (zones, worst-of, action, staleness, env, regression)
- `scripts/lib/__tests__/transcript-token-counter.test.mjs` — 27 cases (boundary, dedup, malformed, oversize, regression)
- `.claude/hooks/__tests__/token-awareness-sidecar.test.mjs` — 9 subprocess oracle cases
- `.claude/hooks/__tests__/token-awareness-inject.test.mjs` — 24 cases (renderInject + isAutonomousLoopPrompt + subprocess)
- `.claude/hooks/__tests__/token-awareness-stop-advisory.test.mjs` — 10 cases (advisory decisions + cooldown + regression)
- `mcp-server/src/__tests__/TokenAwarenessEngine.test.ts` — 20 vitest cases (engine direct + dispatcher round-trip via `registerContextDispatcher` fixture + anti-regression source grep)

**Total: 136 tests.** All pass. R9 compliant (no `toBeDefined` stubs; every test encodes intent with real values or algebraic invariants).

## Sister docs / dependencies

- [[session-continuity-stack]] — 2026-05-15 — complementary system that handles post-/compact resume. Token-awareness fires the /compact recommendation; session-continuity-stack handles the clean restart afterward.
- [[precompact-auto-trigger]] — HARD byte gates that catch hard failure. Token-awareness catches *graceful self-pacing* BEFORE the hard gate.
- [[ollama-pipeline-ms0]] — provides the offload-rate signal (4th data source).
- [[checkin-loop-fullstack]] — autonomous loop doctrine that this surfaces zone state into.
