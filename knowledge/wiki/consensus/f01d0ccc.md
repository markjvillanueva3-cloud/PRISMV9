---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: f01d0cccb9cec5ac2737cc6d9d93b0b0b776b1c2b48d0022bc3545c5c14f0efd
sha8: f01d0ccc
ts: 2026-05-05T15:07:37.511Z
task_type: untagged
source_session: unknown
mode: compare
recommendation: accept
agreement_score: 1
success_count: 3
total_latency_ms: 10005
model_voters: ["gpt-5.5", "gemini-2.5-flash", "qwen2.5-coder:7b"]
mean_factuality: null
tags: [consensus, untagged, accept]
---

# Consensus Run `f01d0ccc`

**Recommendation:** `accept` · **Agreement:** `1` · **Voters:** `gpt-5.5, gemini-2.5-flash, qwen2.5-coder:7b`

## Prompt

```
What is the canonical Kienzle constant kc1.1 for ISO group P (steel) per PRISM constants? Reply with just the integer.
```

## Consensus answer

```
1800
```

## Per-model responses

### gpt-5.5 (openai) — ok

- latency: 6784ms · tokens: 42897

```
1800
```

### gemini-2.5-flash (google) — ok

- latency: 2409ms · tokens: 6542

```
1800
```

### qwen2.5-coder:7b (ollama) — ok

- latency: 9906ms · tokens: n/a

```
1800
```

## Backlinks

- task_type: [[task-type-untagged]]
- recommendation: [[consensus-accept]]
- voter: [[model-gpt-5-5]]
- voter: [[model-gemini-2-5-flash]]
- voter: [[model-qwen2-5-coder-7b]]
