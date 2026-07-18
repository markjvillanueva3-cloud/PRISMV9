---
name: reference_ollama_fanout_ratelimit_fix_2026_06_09
description: "Recurring 'Server is temporarily limiting requests' narrowed to Anthropic-org throttle from ultracode Workflow fan-out concurrency (NOT host/local). Fix shipped: scripts/lib/ollama-fanout.mjs (bounded local-Ollama fan-out, no Anthropic load) + effortLevel xhigh->high is the fleet lever."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.676Z
aliases: reference_ollama_fanout_ratelimit_fix_2026_06_09
---


# Rate-limit narrowed + fixed (slot:bravo, 2026-06-09)

## Narrowed down (3 documented classes, this one is #3)
Operator: "something keeps causing api error rate limited errors, narrow it down and fix." There are THREE documented classes; mine is #3:
1. **LOCAL ECONNREFUSED** at high host-commit (the `nim-llama32-3b` GPU container reserving ~88GB) -> [[reference_api_ratelimit_wsl_commit_2026_06_08]]. **NOT this** -- host commit was healthy at 39% (Docker down, NIM not running).
2. **Anthropic 429** from `effortLevel:xhigh` x Opus-4.8 x 1M-ctx fleet-wide -> [[reference_fleet_rate_limit_diagnosis_2026_05_29]]. Contributor.
3. **Anthropic "Server is temporarily limiting requests (not your usage limit)"** from unbounded Workflow fan-out (5-13 Claude subagents in concurrent bursts, x 8 peer slots) -> [[feedback_workflow_concurrency_and_local_routing_2026_06_08]]. **THIS.** Signature: the synthesis-after-burst agent dies, 2M subagent tokens burned for `null`. Happened TWICE this session (both my ultracode workflows lost their synthesis agent).

## How to tell them apart (R12)
- Error text "Server is temporarily limiting requests / not your usage limit / Rate limited" = Anthropic server throttle (#2/#3), NOT a local ECONNREFUSED (#1). #1 says "fetch failed"/ECONNREFUSED in watchdog.log.
- #3 specifically: failures cluster on the agent that fires RIGHT AFTER a parallel burst (the synthesis), while the burst agents partly succeed.

## Fix shipped (the documented ELIMINATION, not mitigation)
Route MECHANICAL fan-out work (grep/audit/summarize/classify/extract -- R5 "not judgment") to the local 96GB Blackwell instead of the Claude API: no Anthropic rate limit, $0, GPU was at ~1% util. The missing primitive is now built:
- **`scripts/lib/ollama-fanout.mjs`** (commit U-OLLAMA-FANOUT, cad-fusion-live-ms0): `ollamaFanout(tasks, {model, concurrency=3, timeoutMs, fetchImpl})` -> bounded-concurrency worker pool over local Ollama (`/api/generate`, 127.0.0.1 NOT localhost -- the IPv6 fix), fail-soft per-task (never rejects the batch), results in input order, `peakConcurrency` tracked. `callOllamaOnce` exported. 10/10 hermetic node:test (the load-bearing asserts: peak<=cap, fail-soft, 127-not-localhost). LIVE-smoked: 2-task fan-out, peak 2, real answers, 0 Claude load.
- USE IT: when authoring a Workflow/sweep, run the mechanical discovery/verify/audit stages via `ollamaFanout` (local), reserve Claude `agent()` subagents for the FINAL synthesis/adversarial-judgment only (few, not bursts). Bound any Claude fan-out to <=3-4.

## Fleet lever (operator's call -- NOT auto-applied)
`C:/Users/wompu/.claude/settings.json` still has `effortLevel:"xhigh"` + `ultracode:true` (line 1807-1808) -- golf's documented `xhigh->high` fix REVERTED (settings drift, [[feedback_settings_wiring_drift_2026_05_16]]). xhigh = always-on auto-fan-out fleet-wide = the aggregate multiplier. `effortLevel:high` keeps EXPLICIT ultracode (keyword) but drops the always-on default. Restart-gated (running chats keep their state). Left for the operator since `ultracode:true` is their deliberate setting -- the ollama-fanout route preserves ultracode WITHOUT the Anthropic load, so it may not even be needed.

## Why not auto-flip effortLevel
The operator deliberately set `ultracode:true` (uses it heavily). Stripping it fights their preference; the real fix (route grunt work local) keeps ultracode AND kills the rate limit. Surfaced the lever, applied the tool.
