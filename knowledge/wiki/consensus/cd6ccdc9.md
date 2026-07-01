---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: cd6ccdc963e02f8529e47469f41b206b0aecdba3ec27979ed08e219ff2ce4ada
sha8: cd6ccdc9
ts: 2026-06-24T20:09:36.328Z
task_type: auto-critical-edit
source_session: unknown
mode: compare
recommendation: escalate
agreement_score: 0.086
success_count: 2
total_latency_ms: 37084
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-critical-edit, escalate]
---

# Consensus Run `cd6ccdc9`

**Recommendation:** `escalate` · **Agreement:** `0.086` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
Critical-file edit review for H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts via Edit

OLD:
                retrieveTribal: async () => (Array.isArray(ps.tribal) ? ps.tribal : []) as Parameters<typeof blueprintExtractionRAGEngine.extract>[0]["io"]["retrieveTribal"] extends ((...a: never[]) => Promise<infer R>) ? R : never,

NEW:
                retrieveTribal: async () => {
                  // Caller-supplied tribal sources win (explicit override).
                  if (Array.isArray(ps.tribal) && ps.tribal.length > 0) {
                    return ps.tribal as Parameters<typeof blueprintExtractionRAGEngine.extract>[0]["io"]["retrieveTribal"] extends ((...a: never[]) => Promise<infer R>) ? R : never;
                  }
                  // U-BPA-RAG-TRIBAL-DEFAULT (slot:india): no caller tribal -> inject
                  // the blueprint-EXTRACTION tribal corpus BY DEFAULT (xray domain:
                  // verify-names / split-before-OCR / 0.70 floor), via the canonical
                  // .mjs loader. EXTRACTION corpus, NOT the CAD-draw GENERATION corpus.
                  // CWD-independent repo-root anchor 
```

## Consensus answer

```
**Answer:** The edit adds a conditional check for `ps.tribal` length and includes detailed comments, which is appropriate for a critical file. It ensures that caller-supplied data takes precedence and specifies a default behavior with explanations.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 22842ms · tokens: n/a

```
**Answer:** The edit adds a conditional check for `ps.tribal` length and includes detailed comments, which is appropriate for a critical file. It ensures that caller-supplied data takes precedence and specifies a default behavior with explanations.
```

### gpt-oss:20b (ollama) — ok

- latency: 10767ms · tokens: n/a

```
**Critical‑file review – `cadDispatcher.ts`**

| Issue | Details |
|-------|---------|
| **Missing return / incomplete block** | The new `retrieveTribal` function opens a `{}` but never returns a value for the “default” path. After the long comment there is no code that loads or constructs the default tribal corpus, and the closing `}` (and trailing comma) are missing in the snippet shown. This will cause a syntax error and break compilation. |
| **EOL consistency** | The PRISM context warns that Edit/Write tools emit CRLF while repo files use LF. Ensure that the edited lines use LF (`\n`) only; any accidental `\r\n` would trigger an EOL flip on commit. |
| **Type safety** | The cast used in the explicit‑override branch is correct, but a fallback return must also be typed consistently (e.g., `as Parameters<...>
```

## Backlinks

- task_type: [[task-type-auto-critical-edit]]
- recommendation: [[consensus-escalate]]
- voter: [[model-qwen2-5-coder-32b]]
