---
name: frontend-app_synthesis
description: "[auto-synth · verify] Compounding synthesis of the frontend-app domain — recurring patterns, decisions, open threads distilled from 15 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: frontend-app
  synthesizedFrom: 15
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:48:26.688Z
  sourceHash: 790a5afb2ed7
  advisoryOnly: true
  mustHumanVerify: true
---

# frontend-app — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 15 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Slot‑based compounding & recall pipeline** – Each galaxy (including `frontend-app`) is processed through an *alpha* reflection synthesis (`B1`), a *bravo* context fill, and an *amp‑consume* consumer arm that surfaces slot‑specific patterns for downstream use.  ([reference_alpha_b1_galaxy_reflection_2026_05_29], [reference_alpha_amp_consume_synthesis_line_2026_05_30])  
- **Four‑section MEMORY.md canonicalization** – All galaxies are required to have a `MEMORY.md` file populated with the same four logical sections; this structure is auto‑filled during the *galaxy‑context‑fill* step and later used for semantic recall. ([reference_reference_post_ship_galaxy-context-fill-u-galaxy-mem-4section], [reference_reference_galaxy_memory_fill_2026_06_08])  
- **Continuous synthesis feeding LoRA training** – The per‑galaxy synthesis brains are exported as tagged Alpaca pairs and fed into a LoRA dataset builder, creating a shared training signal across the 34 galaxies. ([reference_lora_galaxy_synthesis_feeder_2026_06_10])  
- **Discovery‑phase durable memory writing** – During any DISCOVER phase, engineers must immediately persist domain memories rather than waiting for post‑mortem documentation. ([feedback/feedback_domain_discovery_memories])  
- **Cross‑galaxy transcript mining** – Ollama is used to mine transcripts from multiple “galaxies” (e.g., `frontend-app`, `backend-helper`, `database-expansion`) and synthesize consolidated knowledge artifacts. ([reference_frontend-app_transcript_synthesis], [reference_backend-helper_transcript_synthesis])  

## Key decisions & rules
- **Enforce DISCOVER‑phase memory durability** – Operators must write durable domain memories as soon as a slot enters DISCOVER.  (Rule, 2026‑05‑29) — [feedback/feedback_domain_discovery_memories]  
- **Standardize MEMORY.md to four sections** – Shipping of `U‑GALAXY‑MEM‑4SECTION` locked the canonical format; any deviation is considered a regression. — [reference_reference_post_ship_galaxy-context-fill-u-galaxy-mem-4section]  
- **Register PRISM Brain Refresh task on every host** – The scheduled refresh must be explicitly registered; omission leads to silent decay of synthesis artifacts. — [reference_brain_refresh_task_unregistered_2026_06_09]  
- **Use AMP‑CONSUME as the consumer arm for slot‑context bundles** – Guarantees that each slot’s patterns are surfaced and can be claimed by peer slots via patch‑sibling workflow. — [reference_alpha_amp_consume_synthesis_line_2026_05_30]  
- **Leverage LoRA dataset generation for cross‑galaxy model improvement** – The `--source galaxy` mode aggregates 512 advisory‑tagged pairs per galaxy to enrich the training corpus. — [reference_lora_galaxy_synthesis_feeder_2026_06_10]  

## Open threads
- **Brain refresh registration drift** – Current hosts lack the PRISM Brain Refresh task registration, causing synthesis artifacts to “rot”.  Need a rollout plan to ensure uniform registration across the fleet. — [reference_brain_refresh_task_unregistered_2026_06_09]  
- **Corpus inflation detection & mitigation** – Reviewers flagged a 20× corpus inflation in `MEMORY.md` builds; a systematic guardrail is required to prevent future self‑defeating RED tests. — [reference_reference_galaxy_memory_fill_2026_06_08]  
- **Sparse vs. dense memory handling** – The relationship between `U‑GALAXY‑SPARSE‑MEMORIES` (20 grounded memories) and the full 4‑section fill remains loosely defined; clarification is needed for when to use each path. — [reference/reference_post_ship_galaxy_context_fill-u-galaxy-sparse-memories]  
- **Integration of frontend‑app synthesis with other galaxies** – While transcript mining exists for `backend-helper`, `database-expansion`, etc., a unified strategy for cross‑galaxy dependency resolution has not been codified. — [reference_frontend-app_transcript_synthesis], [reference_backend-helper_transcript_synthesis]  
- **Patch‑sibling claim workflow robustness** – The current peer zebra→zulu claim mechanism in AMP‑CONSUME needs validation under high concurrency scenarios. — [reference_alpha_amp_consume_synthesis_line_2026_05_30]
