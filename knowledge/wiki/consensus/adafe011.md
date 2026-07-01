---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: adafe011b614730ee346aaa0a1df6b51f3616138f0703d0858f306029169ae63
sha8: adafe011
ts: 2026-06-25T12:32:00.731Z
task_type: auto-userprompt
source_session: 3f6cef82-7a59-487d-b662-cb7d9cdb0d1a
mode: compare
recommendation: review
agreement_score: 0.5
success_count: 1
total_latency_ms: 107569
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-userprompt, review]
---

# Consensus Run `adafe011`

**Recommendation:** `review` · **Agreement:** `0.5` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
please fix whatevr causes my windows to be blurry
```

## Consensus answer

```
Final Answer: Check your display settings for scaling and resolution. Update your graphics drivers to the latest version. If the problem persists, consider running a hardware diagnostics test on your monitor or GPU.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 14443ms · tokens: n/a

```
Final Answer: Check your display settings for scaling and resolution. Update your graphics drivers to the latest version. If the problem persists, consider running a hardware diagnostics test on your monitor or GPU.
```

### gpt-oss:20b (ollama) — error

- latency: 90005ms · tokens: n/a
- error: `timeout`

```
(no answer — timeout)
```

## Backlinks

- task_type: [[task-type-auto-userprompt]]
- recommendation: [[consensus-review]]
- voter: [[model-qwen2-5-coder-32b]]
