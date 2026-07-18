---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: be9c4aa17d7ce0e12530389389971bbae22c4b6e8d50c781df4cf4fa14ce8935
sha8: be9c4aa1
ts: 2026-06-10T08:44:41.585Z
task_type: auto-critical-edit
source_session: unknown
mode: compare
recommendation: escalate
agreement_score: 0.091
success_count: 2
total_latency_ms: 3410
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-critical-edit, escalate]
---

# Consensus Run `be9c4aa1`

**Recommendation:** `escalate` · **Agreement:** `0.091` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
Critical-file edit review for H:\prism\mcp-server\src\tools\dispatchers\businessDispatcher.ts via Edit

OLD:
          case "blueprint_to_quote": {
            const engine = await getEngine("blueprintQuoteBridge");
            result = engine.bridge(params.analysis ?? params, params.overrides);
            break;
          }

NEW:
          case "blueprint_to_quote": {
            const engine = await getEngine("blueprintQuoteBridge");
            // bridgeFromOCR normalizes the OCR-engine BlueprintAnalysis shape before bridging.
            // Direct engine.bridge(params.analysis) silently dropped all GD&T (gdt_frames vs gdt)
            // -- type-invisible here because params is z.record(z.any()).
            result = engine.bridgeFromOCR(params.analysis ?? params, params.overrides);
            break;
          }
```

## Consensus answer

```
**Answer:** The edit is critical as it fixes a data loss issue by introducing `bridgeFromOCR` for proper normalization and should be reviewed carefully.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 1567ms · tokens: n/a

```
**Answer:** The edit is critical as it fixes a data loss issue by introducing `bridgeFromOCR` for proper normalization and should be reviewed carefully.
```

### gpt-oss:20b (ollama) — ok

- latency: 1820ms · tokens: n/a

```
**Review**

- **Intent**: Switch from `engine.bridge` to `engine.bridgeFromOCR` so that OCR‑normalized `BlueprintAnalysis` is used, preserving GD&T data.
- **Correctness**:
  - The call signature matches the old one (`params.analysis ?? params`, `params.overrides`).  
  - Ensure that `bridgeFromOCR` exists on the engine returned by `getEngine("blueprintQuoteBridge")`. If it’s a new method, confirm its implementation handles the same parameters and returns the expected result type.
- **Type safety**:  
  - The comment notes that `params` is typed as `z.record(z.any())`, so the compiler won’t catch missing fields. Consider tightening the type for `params.analysis` if possible (e.g., a specific Zod schema) to avoid silent failures.
- **Side‑effects**:  
  - Verify that `bridgeFromOCR` does not alter any other state unintentionally and that it still respects `params.overrides`.
- **Documentation**:  
  - The added comment is helpful. If this change is critical, consider adding a brief note in the README or engine docs about why OCR normalization matters.

Overall, the patch looks correct provided `bridgeFromOCR` behaves as expected. No further changes needed.
```

## Backlinks

- task_type: [[task-type-auto-critical-edit]]
- recommendation: [[consensus-escalate]]
- voter: [[model-qwen2-5-coder-32b]]
