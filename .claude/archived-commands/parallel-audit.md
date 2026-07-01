---
description: Audit current session's tool-call parallelization and identify wasted round-trips
allowed-tools: mcp__prism__prism_dev
---

# Parallel Audit

Analyze tool-call parallelization for the current session. Identifies sequences of independent calls that should have been batched into a single message, reports estimated wasted round-trips and tokens.

Invokes the `tool_call_analyze` action on the prism_dev dispatcher.

## Usage
- `/parallel-audit` — full report
- Pass no args; the engine reads from per-session state at `state/tool-call-parallelization/parallelization-${CLAUDE_SESSION_ID}.json`

## What it reports
- Total calls, parallel vs sequential
- Parallelization rate (%)
- Specific opportunities (call IDs that could have been batched)
- Estimated tokens wasted, time saved possible

## Action
Call: `prism_dev` action `tool_call_analyze` with empty params.

## Output
- Parallelization rate
- Top 5 wasted opportunities with reasons
- Recommendations
