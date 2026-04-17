---
name: dispatcher-profile
description: Profile dispatcher action performance — call counts, latency percentiles, error rates, token costs per action.
model: haiku
effort: low
allowed-tools: Read, Grep, Bash
---

# Dispatcher Profiling

Analyze coordination stats and telemetry data to profile dispatcher action performance.

## Steps

1. Read ~/.prism/telemetry/ JSONL files for dispatcher-related events.
2. Read ~/.prism/coordination-stats.json if it exists for timeout/latency data.
3. Aggregate metrics per dispatcher action:
   - **Call count**: Total invocations
   - **Latency**: p50, p95, p99 in ms
   - **Error rate**: failures / total calls
   - **Token cost**: average tokens consumed per call (if available)
4. Present three ranked tables:
   - **Top 10 Most Called** actions (by call count descending)
   - **Top 10 Slowest** actions (by p95 latency descending)
   - **Top 10 Most Error-Prone** actions (by error rate descending)
5. Flag any action with:
   - Error rate > 10%
   - p95 latency > 5000ms
   - More than 100 calls with no successful completions
