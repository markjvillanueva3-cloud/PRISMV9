---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: 5a8cca8f55b4e3203915992fd3334cbb052e180b8547445d1608036c532e127d
sha8: 5a8cca8f
ts: 2026-06-24T15:18:32.038Z
task_type: auto-critical-edit
source_session: unknown
mode: compare
recommendation: escalate
agreement_score: 0.119
success_count: 2
total_latency_ms: 18452
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-critical-edit, escalate]
---

# Consensus Run `5a8cca8f`

**Recommendation:** `escalate` · **Agreement:** `0.119` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
Critical-file edit review for H:\prism\mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts via Edit

OLD:
            const options: any = {};
            if (params.text || params.simulatedText) {
              options.simulatedText = params.text || params.simulatedText;
            }
            if (params.tables || params.simulatedTables) {
              options.simulatedTables = params.tables || params.simulatedTables;
            }
            result = engine.processDocument(filePath, options);
            break;

NEW:
            // extractDocument(path, { sections, tables, metadata }) -- the engine derives text from
            // section content, so wrap a raw text param as a paragraph section (prior simulatedText/
            // simulatedTables keys were silently dropped AND processDocument never existed).
            const officeOpts: any = {};
            const sections: any[] = [];
            const officeText = params.text || params.simulatedText;
            if (officeText) sections.push({ type: "paragraph", content: String(officeText) });
            if (Array.isArray(params.sections)) sections.push(...params.sections);
            if (sections.length) officeOpts.sections = sections;
            if (params.tables || params.simulatedTables) officeOpts.tables = params.tables || params.simulatedTa
```

## Consensus answer

```
The edit modifies the way `options` are prepared for `processDocument`, ensuring that `text` is correctly formatted as a paragraph section and that `sections` are properly handled. This change aligns with the comment indicating that `simulatedText/simulatedTables` keys were previously ignored, and it introduces a more structured approach to passing document sections to the engine.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 3428ms · tokens: n/a

```
The edit modifies the way `options` are prepared for `processDocument`, ensuring that `text` is correctly formatted as a paragraph section and that `sections` are properly handled. This change aligns with the comment indicating that `simulatedText/simulatedTables` keys were previously ignored, and it introduces a more structured approach to passing document sections to the engine.
```

### gpt-oss:20b (ollama) — ok

- latency: 11254ms · tokens: n/a

```
**Critical‑file review – `resourceExtractionDispatcher.ts`**

| Issue | Description | Suggested fix |
|-------|-------------|---------------|
| **Incomplete code block** | The new snippet ends abruptly (`officeOpts.tables = params.tables || params.simulatedTa`) and lacks the closing brace, a call to the extraction engine, and the `break;`. | Finish the block: add the missing `}`s, call the correct function (e.g., `engine.extractDocument(filePath, officeOpts)`), and re‑insert the `break;`. |
| **Missing function** | The comment says *“processDocument never existed”* but the old code called `engine.processDocument`. If the intended API is now `extractDocument`, that call must be added. | Replace or add: `result = engine.extractDocument(filePath, officeOpts);` (or whatever the correct method name is). |
| **Variable naming consistency** | Old code used `options`; new uses `officeOpts`. Ensure the rest of the file refers to the same variable when passing it to the engine. | Keep a single name (`options` or `officeOpts`) throughout the block. |
| **Section handling logic** | The new logic wraps raw text into a paragraph section, which is correct per comment, but it also pushes any existing `params.sections`. Ensure that `params.sections` are already in the expected format (type/content). | Validate `params.sections` before pushing or transform them if needed. |
| **Table handling** | The assignment uses `params.tables || params.simulatedTa`; this is a typo (`simulatedTa`). | Correct to `params.simulatedTables`. |
| **EOL consistency** | PRISM’s L8/built rule requires LF in repo files; the new snippet should be saved with LF line endings. | Verify that the file ends with LF only (no CRLF). |

**Bottom line:** The patch is syntactically incomplete and contains a typo. It also removes the actual call to the extraction engine, which
```

## Backlinks

- task_type: [[task-type-auto-critical-edit]]
- recommendation: [[consensus-escalate]]
- voter: [[model-qwen2-5-coder-32b]]
