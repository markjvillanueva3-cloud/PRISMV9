---
name: frontend-app_synthesis
description: "[auto-synth · verify] Compounding synthesis of the frontend-app domain — recurring patterns, decisions, open threads distilled from 16 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: frontend-app
  synthesizedFrom: 16
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T04:04:16.668Z
  sourceHash: 9574154e6691
  advisoryOnly: true
  mustHumanVerify: true
---

# frontend-app — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 16 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Auto‑distillation after each ship** – every time a frontend‑app feature is released a “post‑ship” distill step creates a compact knowledge artifact (e.g., GALAXY‑CONTEXT‑FILL/U‑GALAXY‑SPARSE‑MEMORIES [reference/reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories]; DOMAIN‑KNOWLEDGE/U‑PAPA‑LORA‑DISTILL‑MODE [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode]).
- **Per‑galaxy synthesis brains feeding LoRA pipelines** – each galaxy maintains a `<galaxy>_synthesis.md` that is compiled into the global LoRA training signal (LoRA‑galaxy‑synthesis‑feeder [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10]; B1 reflection synthesis [reference/reference_alpha_b1_galaxy_reflection_2026_05_29]).
- **Continuous memory capture during DISCOVER phases** – operators are instructed to write durable domain memories incrementally rather than only at phase close‑out (feedback/feedback_domain_discovery_memories [reference/feedback_domain_discovery_memories]).
- **Compounding stack layers** – the pipeline proceeds from RECALL (semantic vault recall) → AMP‑CONSUME (slot‑context bundles) → COMPUNDING (B1 reflection) → LoRA feed (see OBSIDIAN brain recall [reference/reference_obsidian_galaxy_brain_recall_2026_06_09] and AMP‑CONSUME [reference/reference_alpha_amp_consume_synthesis_line_2026_05_30]).
- **Context expansion & embedding cache filtering** – a flat‑memo filter (`^(feedback|ref)`) is applied when building the embedding cache to keep recall focused (obsidian brain recall [reference/reference_obsidian_galaxy_brain_recall_2026_06_09]).

## Key decisions & rules
- **DISCOVER‑phase memory rule** – “When a slot enters a DISCOVER phase, write durable domain memories as you go” (feedback/feedback_domain_discovery_memories [reference/feedback_domain_discovery_memories]).
- **Galaxy MEMORY.md canonicalization** – all galaxies must contain the 4‑section brain structure; missing files are to be filed immediately (galaxy_memory_fill_2026_06_08 [reference/reference_galaxy_memory_fill_2026_06_08]).
- **Brain refresh task registration** – the PRISM Brain Refresh scheduled task must be registered on each host; omission leads to silent rot (brain_refresh_task_unregistered_2026_06_09 [reference/reference_brain_refresh_task_unregistered_2026_06_09]).
- **Domain‑knowledge distill mode flag** – `--distill` added to `domain-corpus-to-lora-data` to enable automatic LoRA data generation (post_ship_domain-knowledge-u-papa-lora-distill-mode [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode]).
- **LoRA source‑galaxy mode** – the dataset builder now accepts a `--source galaxy` argument, pulling 512 advisory‑tagged Alpaca pairs per galaxy (lora_galaxy_synthesis_feeder_2026_06_10 [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10]).

## Open threads
- **Brain refresh registration gap** – the scheduled task is missing on the current host; need a rollout plan to ensure all frontend‑app nodes register it (brain_refresh_task_unregistered_2026_06_09).
- **Corpus inflation detection** – reviewers flagged a 20× inflation in the galaxy MEMORY.md corpus; verification steps for the frontend‑app slice are still pending (galaxy_memory_fill_2026_06_08).
- **Discovery‑phase memory completeness** – while the rule exists, it is unclear whether all frontend‑app slots have been consistently logging memories throughout recent DISCOVER cycles.
- **Integration of context‑expansion filters** – the flat‑memo filter (`^(feedback|ref)`) works for generic galaxies; confirmation needed that frontend‑app specific feedback streams are correctly captured. 
- **LoRA dataset balance across galaxies** – the `--source galaxy` mode pulls a fixed 512 pairs per galaxy; assessment required to ensure frontend‑app domains receive sufficient representation relative to their complexity.
