---
name: mit-curriculum_synthesis
description: "[auto-synth · verify] Compounding synthesis of the mit-curriculum domain — recurring patterns, decisions, open threads distilled from 12 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: mit-curriculum
  synthesizedFrom: 12
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:06:17.743Z
  sourceHash: daab7253d041
  advisoryOnly: true
  mustHumanVerify: true
---

# mit-curriculum — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 12 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Harvest‑on‑demand extraction** for the MIT‑OCW corpus rather than a pre‑built dump; the expected path `H:/PRISM/extracted/mit-ocw/` is a placeholder, while the true storage slot is `data/extracted-knowledge/mit-courses/` and currently empty. [reference_lima_mit_ocw_harvest_on_demand]  
- **Galaxy‑based organization**: each thematic “galaxy” (e.g., knowledge‑conversion, corpus‑aggregation, tribal‑knowledge, etc.) maintains a `MEMORY.md` file with a canonical four‑section brain structure. [reference_galaxy_memory_fill_2026_06_08]  
- **Cross‑session synthesis via Ollama mining**: transcripts from multiple sessions are regularly mined to produce consolidated “galaxy” knowledge summaries. [references 3‑12]  
- **Semantic recall wiring**: per‑galaxy memories are linked into a unified embedding cache, with filters that exclude feedback/ref patterns. [reference_obsidian_galaxy_brain_recall_2026_06_09]  
- **LoRA training signal propagation**: a `--source galaxy` mode generates 512 advisory‑tagged Alpaca pairs per galaxy for LoRA fine‑tuning across all 34 galaxies. [reference_lora_galaxy_synthesis_feeder_2026_06_10]  
- **Operator directives on metadata hygiene**: reviewers flagged a 20× corpus inflation and a self‑defeating RED test, prompting stricter enforcement of file‑path, wiki, and memory completeness. [reference_galaxy_memory_fill_2026_06_08]

## Key decisions & rules
1. **Extraction workflow** – MIT course data must be harvested on demand and written to `data/extracted-knowledge/mit-courses/`; any reference to the obsolete `H:/PRISM/extracted/mit‑ocw/` path is invalid. [reference_lima_mit_ocw_harvest_on_demand]  
2. **Scope definition** – New extraction goals are limited to a “fresh‑session‑sized” slice of MIT courses, beginning with the full catalog (“starting with all”) and refined by formulas/engines/hooks/wiki/memories as outlined in the mid‑India handoff. [reference_mit_courses_goal_scope_handoff_2026_05_23]  
3. **Memory structure** – Every galaxy’s `MEMORY.md` must conform to the four‑section canonical brain layout; missing sections trigger reviewer flags. [reference_galaxy_memory_fill_2026_06_08]  
4. **Corpus inflation guard** – Automatic checks reject any corpus count that exceeds realistic bounds (e.g., 20× reported size) and abort RED tests until corrected. [reference_galaxy_memory_fill_2026_06_08]  
5. **LoRA data generation** – Use the extended `vault-to-lora-dataset.mjs` with `--source galaxy` to produce exactly 512 advisory‑tagged Alpaca pairs per galaxy for downstream model fine‑tuning. [reference_lora_galaxy_synthesis_feeder_2026_06_10]  
6. **Embedding cache filtering** – The flat‑memo filter must exclude any keys matching `^(feedback|ref)` to keep the semantic recall cache clean. [reference_obsidian_galaxy_brain_recall_2026_06_09]

## Open threads
- **Populate the MIT extraction slot**: `data/extracted-knowledge/mit-courses/` remains empty; a concrete plan for harvesting the first batch of courses is needed.  
- **Clarify “starting with all” scope**: Does this imply every MIT course ever offered, or only those released after a certain date? The exact boundary affects resource allocation.  
- **Integrate LoRA signals with existing galaxy brains**: While pair generation is defined, the pipeline for merging these fine‑tuned weights back into each galaxy’s knowledge base is not yet documented.  
- **Resolve corpus inflation detection**: Current reviewer alerts indicate over‑counting; a systematic audit method to reconcile reported vs. actual document counts is pending.  
- **Finalize RED test criteria**: The self‑defeating RED test flagged during memory fill needs revised success metrics before it can be re‑enabled.
