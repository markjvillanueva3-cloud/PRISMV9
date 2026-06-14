---
name: token-optimization_synthesis
description: "[auto-synth · verify] Compounding synthesis of the token-optimization domain — recurring patterns, decisions, open threads distilled from 21 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: token-optimization
  synthesizedFrom: 21
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:50:57.117Z
  sourceHash: a0a3590de8a3
  advisoryOnly: true
  mustHumanVerify: true
---

# token-optimization — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 21 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Local‑first routing** – Across multiple syntheses the system consistently routes tool calls, hook injections, and routine LLM work to locally hosted Ollama models instead of external Claude API tokens [feedback/feedback_ollama_token_routing] and [reference/reference_local_llm_routing].
- **Model roster lock‑step with hardware** – The Blackwell GPU (RTX PRO 6000, 96 GB VRAM) is paired with a fixed set of pulled models; live offload defaults automatically select these post‑upgrade [reference/reference_ollama_model_hardware_synergy].
- **Suppressed auto‑discovery** – Skill auto‑discovery is deliberately turned off to keep routing deterministic and token‑predictable [reference/reference_local_llm_routing].
- **ROI‑driven offload audits** – Galaxies are audited for “high‑ROI” Ollama offload potential; if none is found, no offload code is added (e.g., QUOTING galaxy) [reference/reference_quoting_ollama_offload_audit_2026_06_09].
- **Token‑savings measurement scripts** – New utility scripts (`measure-fleet-token-savings.mjs`) are introduced to quantify token reductions after each ship [reference/reference_post_ship_memory-wiki-optimization-ms0-u-mwo09].
- **Context‑fill sparsity handling** – Sparse memory slots are populated with grounded domain memories to reduce unnecessary context tokens [reference/reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories].

## Key decisions & rules
1. **Prefer Ollama models for all non‑essential Claude calls**  
   - Default model: `qwen2.5-coder:32b` (general tasks)  
   - Deep reasoning fallback: `gpt-oss:120b` [feedback/feedback_ollama_token_routing].
2. **Disable skill auto‑discovery** to keep routing static and token usage predictable [reference/reference_local_llm_routing].
3. **Only add Ollama offload code when audit reports high ROI**; otherwise leave scripts untouched [reference/reference_quoting_ollama_offload_audit_2026_06_09].
4. **Hardware‑model coupling rule:** All pulled models must be compatible with the Blackwell GPU configuration; any new model requires a hardware‑synergy verification step [reference/reference_ollama_model_hardware_synergy].
5. **Token‑savings must be logged** using the `measure-fleet-token-savings.mjs` suite after each deployment [reference/reference_post_ship_memory-wiki-optimization-ms0-u-mwo09].
6. **Sparse memory slots are to be filled with at most 20 grounded domain memories** per slot to keep context size minimal [reference/reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories].

## Open threads
- **ROI assessment for other galaxies** – Beyond QUOTING, the audit framework needs extension to evaluate offload potential in Knowledge‑Conversion, Database‑Expansion, and Business galaxies.  
- **Impact of auto‑discovery suppression** – Determine whether turning off skill auto‑discovery is causing capability gaps that might increase token usage elsewhere.  
- **Granularity of token‑savings metrics** – Current scripts measure fleet‑wide savings; finer per‑galaxy or per‑hook granularity is under discussion.  
- **Future model roster updates** – Decision pending on whether to incorporate newer Blackwell‑compatible models (e.g., 64b variants) and how that will affect token budgets.  
- **Integration with corpus‑aggregation and speed‑feed pipelines** – Align token‑optimization directives with ongoing work in those galaxies to avoid contradictory routing policies.
