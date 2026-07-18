---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: bdaba811d46b8b4f8b47f01e7bed4a8052b389b31cb59a6b7948839689efc3d9
sha8: bdaba811
ts: 2026-06-24T14:16:32.812Z
task_type: auto-critical-edit
source_session: unknown
mode: compare
recommendation: escalate
agreement_score: 0.118
success_count: 2
total_latency_ms: 17280
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-critical-edit, escalate]
---

# Consensus Run `bdaba811`

**Recommendation:** `escalate` · **Agreement:** `0.118` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
Critical-file edit review for H:\prism\mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts via Edit

OLD:
  "office_process",
  "office_search",
  "log_harvest",

NEW:
  "office_process",
  "office_search",
  // U-XRAY-DOCUMENT-EXTRACT-CONTRACT -- normalize an office/document extraction -> versioned DocumentExtractionContract
  "document_extract_contract",
  "log_harvest",
```

## Consensus answer

```
Final Answer: The change adds a comment and a new entry `"document_extract_contract"` to the list. This requires careful review to confirm it aligns with project goals and does not disrupt current operations.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 4739ms · tokens: n/a

```
Final Answer: The change adds a comment and a new entry `"document_extract_contract"` to the list. This requires careful review to confirm it aligns with project goals and does not disrupt current operations.
```

### gpt-oss:20b (ollama) — ok

- latency: 6499ms · tokens: n/a

```
The patch is syntactically valid – the comment can sit between two items in an array, and the trailing comma after `"log_harvest"` keeps the list consistent with the rest of the file.  
Just double‑check that:

1. **`document_extract_contract`** is registered/used elsewhere (e.g., in the dispatcher map).  
2. The comment doesn’t interfere with any code generation or linting rules that disallow comments inside array literals.

Other than that, the change looks correct.
```

## Backlinks

- task_type: [[task-type-auto-critical-edit]]
- recommendation: [[consensus-escalate]]
- voter: [[model-qwen2-5-coder-32b]]
