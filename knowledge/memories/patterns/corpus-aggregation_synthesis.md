---
name: corpus-aggregation_synthesis
description: "[auto-synth · verify] Compounding synthesis of the corpus-aggregation domain — recurring patterns, decisions, open threads distilled from 7 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: corpus-aggregation
  synthesizedFrom: 7
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T17:58:47.062Z
  sourceHash: 639e58e5c10d
  advisoryOnly: true
  mustHumanVerify: true
---

# corpus-aggregation — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 7 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Iterative knowledge accretion** – successive “iteration” drafts (13‑17) are produced by Hermes (xAI Grok) to layer reputable sources onto the corpus‑aggregation galaxy [reference/reference_corpus-aggregation_iter13_deepsource_2026_06_14] → [reference/reference_corpus-aggregation_iter17_deepsource_2026_06_14].
- **Auto‑distillation pipeline** – a `--distill` flag is added to the domain‑corpus‑to‑LoRA conversion step, enabling automatic extraction of learnings from the U‑PAPA LoRA distill mode [reference/reference_post_ship_domain_knowledge-u-papa-lora-distill-mode].
- **Cross‑galaxy synthesis feeding** – per‑galaxy “brain” outputs (34 galaxies) are harvested as advisory‑tagged Alpaca pairs and injected into the LoRA training source via a `--source galaxy` mode [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **Delta‑driven asset injection** – new high‑ROI CAD assets are generated only after a full audit of prior sessions, then wired into the corpus as “delta” updates [reference/reference_delta_cad_asset_generation_2026_05_29].

## Key decisions & rules
1. **Enable `--distill` on all domain‑corpus‑to‑LoRA jobs** to standardize auto‑extraction of actionable knowledge (applies to U‑PAPA and future domains).  
2. **Activate `--source galaxy` mode for LoRA training** when ingesting per‑galaxy synthesis data; limit input to 512 advisory‑tagged Alpaca pairs per galaxy to keep signal‑to‑noise high.  
3. **Iterative versioning policy:** each Hermes draft (iterations 13‑17) must be tagged with its iteration number and stored as a distinct layer; later layers may supersede but never delete earlier ones, preserving provenance.  
4. **Delta‑generation rule:** before any new CAD asset delta is committed, an automated checklist verifies that *all* prior session memories have been consulted and incorporated (per the operator directive).  
5. **Source hierarchy enforcement:** reputable sources (courses, textbooks, standards, gov‑reports, seminars) are weighted higher than informal inputs; weighting factors are baked into Hermes’ drafting algorithm.

## Open threads
- **Consolidation strategy** – how to merge iterations 13‑17 into a single canonical corpus version without losing layer provenance.  
- **Scalability of galaxy‑wide LoRA signals** – assessing compute and storage impact of feeding 34×512 advisory pairs into the distillation pipeline.  
- **Evaluation metrics** – defining quantitative measures (e.g., knowledge recall, downstream task performance) to validate the effectiveness of `--distill` and `--source galaxy` modes.  
- **CAD delta integration** – determining the optimal point in the iteration cycle to inject CAD‑generated assets so they influence subsequent Hermes drafts.  
- **Governance of source authority** – establishing a review process for new reputable sources that appear in later iterations (e.g., emerging standards).
