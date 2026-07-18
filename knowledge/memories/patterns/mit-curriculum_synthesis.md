---
name: mit-curriculum_synthesis
description: "[auto-synth · verify] Compounding synthesis of the mit-curriculum domain — recurring patterns, decisions, open threads distilled from 7 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: mit-curriculum
  synthesizedFrom: 7
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:58:13.284Z
  sourceHash: 4fcefae469b8
  advisoryOnly: true
  mustHumanVerify: true
---

# mit-curriculum — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 7 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Iterative deep‑source accretion** – successive “knowledge‑accretion” passes (iter 1, 2, 3, 8) repeatedly draft next‑layer reputable sources for the MIT‑curriculum galaxy using Hermes (xAI Grok) [reference_mit-curriculum_iter1_deepsource_2026_06_14]–[reference_mit-curriculum_iter8_deepsource_2026_06_14].
- **Auto‑distillation hooks** – a `--distill` flag is added to the domain‑corpus‑to‑LoRA pipeline, enabling automatic extraction of distilled learnings from shipped domains (U‑PAPA‑LORA‑DISTILL‑MODE) [reference_reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].
- **Cross‑galaxy LoRA synthesis** – a `--source galaxy` mode feeds 512 advisory‑tagged Alpaca pairs per galaxy into the LoRA trainer, creating a unified signal across all 34 galaxies [reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **Verification persistence** – verified foundations from fleet knowledge are persisted for the final two galaxies via a PDF corpus mill, ensuring stable baseline data [reference_post_ship_fleet-knowledge-max-u-zkm-verify-w8].

## Key decisions & rules
1. **Enable `--distill` on every domain‑to‑LoRA conversion** to capture distilled insights automatically (applies to MIT‑curriculum as well) [reference_reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].
2. **Use the `--source galaxy` flag for all curriculum data ingestion**, guaranteeing consistent LoRA signal across the 34‑galaxy MIT corpus [reference_lora_galaxy_synthesis_feeder_2026_06_10].
3. **Run Hermes (xAI Grok) drafting at each iteration** to incorporate newly vetted reputable sources (courses, textbooks, standards, gov‑reports, seminars, articles) before feeding into LoRA training [reference_mit-curriculum_iter1_deepsource_2026_06_14]–[reference_mit-curriculum_iter8_deepsource_2026_06_14].
4. **Persist verified foundations from fleet knowledge** for the terminal two galaxies to lock in high‑confidence content before final model fine‑tuning [reference_post_ship_fleet-knowledge-max-u-zkm-verify-w8].

## Open threads
- **Integration scope:** How to extend the `--distill` and `--source galaxy` mechanisms from shipping domains to the MIT‑curriculum pipeline without duplicating preprocessing steps?
- **Iteration scaling:** What criteria determine when to launch additional accretion iterations beyond iteration 8, and how should diminishing returns be measured?
- **Evaluation metrics:** Which quantitative benchmarks (e.g., curriculum coverage, alignment with accreditation standards) will validate that distilled LoRA models truly improve MIT‑curriculum knowledge representation?
