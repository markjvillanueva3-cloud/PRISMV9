---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: 16e6aecae648746a448e2eb674dbd53cf5afc01975c66800ae133c4159879c5b
sha8: 16e6aeca
ts: 2026-06-23T15:21:10.399Z
task_type: auto-userprompt
source_session: 24fb195f-bd72-4a93-96b5-d080a0e8b4d3
mode: compare
recommendation: escalate
agreement_score: 0.157
success_count: 2
total_latency_ms: 23226
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-userprompt, escalate]
---

# Consensus Run `16e6aeca`

**Recommendation:** `escalate` · **Agreement:** `0.157` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
after compaction it switched back to 200k context instead of 1m. please fix the settings just for the claude code desktop app not the clie settings so it hits the full 1m context not the 800k cap
```

## Consensus answer

```
Final Answer: Adjust the configuration of the Claude code desktop app to set the context size to 1M by modifying its specific settings file, ensuring this change does not impact other client configurations.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 9654ms · tokens: n/a

```
Final Answer: Adjust the configuration of the Claude code desktop app to set the context size to 1M by modifying its specific settings file, ensuring this change does not impact other client configurations.
```

### gpt-oss:20b (ollama) — ok

- latency: 10191ms · tokens: n/a

```
**Fix for the Claude Code Desktop App (not the CLI)**  

1. **Locate the app’s config file**  
   - On Windows: `C:\Users\<user>\AppData\Roaming\ClaudeCodeDesktop\config.json`  
   - On macOS/Linux: `~/.config/claude-code-desktop/config.json`

2. **Edit the JSON**  
```json
{
  "max_context": 1000000,          // set to 1 M tokens
  "compaction_boundary_fix": true, // ensure compaction is applied
  "context_cap_override": false    // prevent fallback to 800 K cap
}
```

3. **Restart the Desktop App** – it will now use a full 1 M context window after compaction.

> **Note:**  
> - Do *not* modify any `clie`‑specific settings; only change the desktop app’s config.  
> - If you see an environment variable like `CLAUDE_MAX_CONTEXT`, set it to `1000000` as a fallback.
```

## Backlinks

- task_type: [[task-type-auto-userprompt]]
- recommendation: [[consensus-escalate]]
- voter: [[model-qwen2-5-coder-32b]]
