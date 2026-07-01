# Ollama Graded-Stress Capability Frontier

> Generated: 2026-06-25T16:13:01.856Z -- merge of per-model stress JSONs (ollama-stress-expanded-run).
> The deterministic answer to 'the hardest task each LLM can do before diminishing returns.'

**Models measured (8, by cost):** qwen2.5-coder:1.5b(1.5b), qwen2.5-coder:7b(7b), deepseek-r1:14b(14b), qwen2.5-coder:14b(14b), gpt-oss:20b(20b), qwen3-coder:30b(30b), qwen2.5-coder:32b(32b), gpt-oss:120b(120b)

**EXCLUDED -- load-failed (all-0%, never generated; VRAM/load issue, NOT measured-incompetent):** deepseek-r1:32b

## Per-task frontier -- cheapest model @100%

### multi-step-reasoning
- `ordering-puzzle` -> qwen2.5-coder:1.5b (1.5b)
- `algebra-word-problem` -> qwen2.5-coder:7b (7b)
- `unit-rate` -> qwen2.5-coder:7b (7b)
- `logical-deduction` -> qwen2.5-coder:7b (7b)
- `sequence-reasoning` -> qwen2.5-coder:1.5b (1.5b)
- `comparative-counting` -> qwen2.5-coder:14b (14b)
- `multistep-arithmetic` -> gpt-oss:20b (20b)

### long-context
- `long-context-needle` -> qwen2.5-coder:7b (7b)

### json-structured-output
- `json-tool-spec` -> qwen2.5-coder:1.5b (1.5b)
- `json-cutting-params` -> qwen2.5-coder:7b (7b)
- `json-material-props` -> qwen2.5-coder:1.5b (1.5b)
- `json-operation-list` -> qwen2.5-coder:1.5b (1.5b)
- `json-nested-machine` -> qwen2.5-coder:1.5b (1.5b)
- `json-tolerance-stack` -> qwen2.5-coder:1.5b (1.5b)

### manufacturing-knowledge
- `gcode-mnemonics` -> qwen3-coder:30b (30b)
- `iso-insert-grade` -> **NONE-local -> Claude/RAG**
- `thread-tpi` -> qwen2.5-coder:14b (14b)
- `tap-drill-size` -> **NONE-local -> Claude/RAG**
- `material-hardness-facts` -> qwen3-coder:30b (30b)

### deterministic-transform
- `tolerance-limit-math` -> qwen2.5-coder:7b (7b)
- `spindle-rpm-formula` -> **NONE-local -> Claude/RAG**
- `surface-roughness-convert` -> qwen2.5-coder:7b (7b)

### instruction-following
- `exactly-three-words` -> qwen2.5-coder:32b (32b)
- `all-uppercase` -> qwen2.5-coder:7b (7b)
- `exactly-5-numbered-lines` -> qwen2.5-coder:1.5b (1.5b)
- `single-word-starts-m` -> qwen2.5-coder:32b (32b)
- `no-letter-e` -> qwen2.5-coder:32b (32b)
- `exactly-one-sentence` -> qwen2.5-coder:1.5b (1.5b)
- `word-count-echo` -> **NONE-local -> Claude/RAG**
- `yes-or-no-only` -> gpt-oss:20b (20b)

### code-generation
- `codegen-isPrime` -> qwen2.5-coder:1.5b (1.5b)
- `codegen-fibonacci` -> qwen2.5-coder:7b (7b)
- `codegen-reverseWords` -> qwen2.5-coder:1.5b (1.5b)
- `codegen-gcd` -> qwen2.5-coder:1.5b (1.5b)
- `codegen-flattenArray` -> qwen2.5-coder:1.5b (1.5b)
- `codegen-isPalindrome` -> qwen2.5-coder:1.5b (1.5b)

## Per-model capability ceiling (tasks cleared @100% / measured)

- **qwen2.5-coder:1.5b** (1.5b): 14/36
- **qwen2.5-coder:7b** (7b): 22/36
- **deepseek-r1:14b** (14b): 0/36
- **qwen2.5-coder:14b** (14b): 25/36
- **gpt-oss:20b** (20b): 18/36
- **qwen3-coder:30b** (30b): 27/36
- **qwen2.5-coder:32b** (32b): 26/36
- **gpt-oss:120b** (120b): 7/36
