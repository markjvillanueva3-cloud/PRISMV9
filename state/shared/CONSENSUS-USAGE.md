# Multi-Model Consensus — Usage Cheat-Sheet for Peer Chats

**Live on:** `work/intel-ollama-obsidian-ms0` branch (commits 9cef312b0 → 78cb47979)
**Worktree:** `H:/prism-iooms0`
**Latest commit:** 78cb47979 / DUAL-OLLAMA-4WAY
**Status:** OPERATIONAL — 274/274 tests green, end-to-end live-verified
**6-terminal safe:** atomic file lock + global rate limit (3 in-flight) + daily 500k token budget

This is a quick cheat-sheet for peer chats that want to use the multi-model consensus pipeline (e.g. for writing roadmaps that benefit from multiple-model review). Do not re-derive — use what's already wired.

## What's available

The consensus pipeline fans a prompt out to 3-4 independent reasoners in parallel:
- **Claude** (this session — when called from outside, via `claude -p` subprocess)
- **gpt-5.5** via Codex CLI (`codex exec`, ChatGPT auth)
- **Grok-4** via xAI API (only if `XAI_API_KEY` env var is set; auto-skipped otherwise)
- **Ollama deepseek-r1:14b** (chain-of-thought local model)
- **Ollama qwen2.5-coder:14b** (auto-added 4th voice when Grok is unavailable — keeps the pool at 4)

Returns: `{responses[], successCount, agreementScore 0..1, consensus{answer,voters,confidence}, recommendation: accept|review|escalate, totalLatencyMs}`.

## Quickest path: `prism_ai:consensus`

Direct dispatcher action. Pass any `MultiModelConsensusEngine.ConsensusInput`:

```jsonc
{
  "tool": "prism_ai",
  "action": "consensus",
  "params": {
    "prompt": "Plan the migration from json to jsonl format for the WEDM telemetry log",
    "context": "<optional surrounding context>",
    "includeClaude": false,    // omit if calling FROM claude
    "mode": "compare",         // or "vote" with voteOptions[]
    "timeoutMs": 90000
  }
}
```

For roadmap drafting use cases:
```jsonc
{
  "tool": "prism_ai",
  "action": "consensus",
  "params": {
    "prompt": "Draft a 3-phase roadmap for adding X to PRISM, with concrete units, dependencies, exit conditions",
    "includeClaude": false,
    "codexEffort": "medium"    // 'low' | 'medium' | 'high' | 'xhigh' — drop to 'low' for cheaper drafts
  }
}
```

## Auto-fire path: TaskInput.consensus + ModelRouter

For `prism_ai:reason`-style calls, set `consensus: true` in TaskInput. Or just route through a safety/physics domain and the router auto-fires tier 6:
```jsonc
{ "kind": "code", "domain": "physics" }   // → tier 6 (consensus) automatically
{ "kind": "code", "consensus": true }     // → tier 6 explicit
```

## Single-model entries (cheaper than full consensus)

```jsonc
{ "tool": "prism_ai", "action": "codex_exec", "params": { "prompt": "...", "reasoningEffort": "medium" }}
{ "tool": "prism_ai", "action": "grok_exec",  "params": { "prompt": "...", "reasoningEffort": "medium" }}  // needs XAI_API_KEY
{ "tool": "prism_ai", "action": "pre_review", "params": { "prompt": "..." }}  // deepseek-r1 draft, ~60% Claude token savings
```

## 6-terminal coordination (already wired)

`ConsensusCoordinatorEngine` enforces:
- **1 in-flight call per terminal** (prevents one chat from monopolizing)
- **3 in-flight calls globally** (prevents fleet thrash)
- **500,000 token daily budget** (Codex burns ~40k per call, so ~12 fan-outs/day across all terminals — bump via `PRISM_CONSENSUS_DAILY_BUDGET` env var)
- **1-hour result cache by sha256(prompt+taskType+context)** — peer terminals automatically pick up each other's results
- **Atomic cross-process lock** — checks/reservations/inflight/budget all under a single file lock

If you call `prism_ai:consensus` directly you bypass the coordinator. **For shared/peer use, prefer routing through the coordinator** by setting `TaskInput.consensus=true` and letting the router pick it up via `prism_ai:model_route` first.

## Cost per call (rough)

| Model | Cost / call | Latency |
|---|---|---|
| Codex gpt-5.5 reasoning=low | ~40k tokens (xhigh: 60k+) | 1-3 min |
| Grok-4 reasoning=medium | depends on xAI billing (~5k tok) | 5-30s |
| Ollama deepseek-r1:14b | $0 (local) | 5-90s |
| Ollama qwen2.5-coder:14b | $0 (local) | 1-10s |
| Claude (subprocess) | session tokens | 10-60s |

**For roadmap drafting** I'd recommend `codexEffort: "low"` or `"medium"` — saves a lot of tokens vs `xhigh` which the engine defaults to.

## Failure modes you'll see

- `recommendation: "escalate"` — models disagreed wildly OR all failed; do not auto-adopt the answer; escalate to human review
- `recommendation: "review"` — partial agreement (40-70% Jaccard); treat as a hypothesis
- `recommendation: "accept"` — ≥70% agreement; safe to refine and adopt
- `kind: "rate-limited"` from coordinator — peer terminal is consensusing; retry in 5-10s OR proceed without consensus
- `kind: "budget-exceeded"` — hit daily cap; degrade to claude-only

## When NOT to use consensus

- Trivial edits (typo fix, status checks, one-liners) — wastes tokens; coordinator's TaskClassifier auto-detects these and routes single-model
- Time-critical paths (cycle-time-sensitive shop-floor calls) — consensus adds 1-3min, may not be worth it
- Tasks where you already know the answer — token cost > value

## Adjacent assets shipped this session

| Path | What |
|---|---|
| `mcp-server/src/engines/MultiModelConsensusEngine.ts` | Core fan-out engine |
| `mcp-server/src/engines/ConsensusCoordinatorEngine.ts` | 6-terminal coordinator |
| `mcp-server/src/engines/TaskClassifierEngine.ts` | 11-type task classifier (auto-detects consensus-worthy prompts) |
| `mcp-server/src/engines/CodexClientEngine.ts` | gpt-5.5 wrapper |
| `mcp-server/src/engines/GrokClientEngine.ts` | Grok-4 wrapper |
| `mcp-server/src/engines/PreReviewOrchestratorEngine.ts` | DeepSeek-R1 drafts → Claude refines (~60% Claude token savings) |
| `mcp-server/src/engines/ModelRouterEngine.ts` | 6-tier router (embed→qwen-7b→qwen-14b→deepseek-r1→llama-vision→claude→consensus) |
| `mcp-server/src/engines/ModelTelemetryEngine.ts` | Per-call latency/cost tracking |
| `scripts/test-quad-consensus-live.mjs` | End-to-end smoke test |
| `scripts/bench-octopus-overhead.mjs` | Octopus hook overhead measurement |
| `scripts/adapt-router-thresholds.mjs` | Weekly adaptive routing tuner |
| `.claude/hooks/octopus-provider-probe.mjs` | SessionStart provider readiness banner |
| `.claude/hooks/pre-claude-review-inject.mjs` | UserPromptSubmit suggest-pre-review hook |
| `.claude/commands/pre-review.md` | Manual /pre-review skill |

## Quick smoke test

```
node H:/prism-iooms0/scripts/test-quad-consensus-live.mjs
```

Expected output: 3/3 voices agree on the answer (currently asks "What is 12+8?"). Confirms Codex auth + Ollama daemon + dual-Ollama path are healthy on this machine.
