---
name: discovery_synthesis
description: "[auto-synth · verify] Compounding synthesis of the discovery domain — recurring patterns, decisions, open threads distilled from 3 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: discovery
  synthesizedFrom: 3
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T17:59:03.070Z
  sourceHash: 389c47cf7d4c
  advisoryOnly: true
  mustHumanVerify: true
---

# discovery — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 3 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Iterative knowledge accretion** – each “iteration” pulls in a fresh layer of reputable sources (courses, standards, gov‑reports, etc.) to deepen the discovery galaxy’s expertise [reference_discovery_iter5_deepsource_2026_06_14].
- **Automated distillation pipeline** – a dedicated `--distill` flag converts domain corpora into LoRA training data, standardising the “domain‑corpus‑to‑LoRA” step across projects [reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].
- **Per‑galaxy synthesis feeding LoRA models** – a script (`vault-to-lora-dataset.mjs`) supports a `--source galaxy` mode that extracts advisory‑tagged Alpaca pairs from each galaxy’s knowledge vault, producing a uniform 512‑pair dataset per galaxy for cross‑galactic training [reference_lora_galaxy_synthesis_feeder_2026_06_10].

## Key decisions & rules
1. **Source credibility rule** – Only incorporate “reputable‑source research” (courses, textbooks, standards, gov‑reports, seminars, articles) when extending the discovery knowledge base [reference_discovery_iter5_deepsource_2026_06_14].
2. **Distill‑mode enforcement** – Every domain‑to‑LoRA conversion must be invoked with `--distill` to guarantee consistent auto‑distillation of learnings [reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].
3. **Galaxy‑source flag usage** – When generating LoRA datasets, always include `--source galaxy` to select the appropriate per‑galaxy vault and produce exactly 512 advisory‑tagged Alpaca pairs for that galaxy [reference_lora_galaxy_synthesis_feeder_2026_06_10].
4. **Documentation linkage** – All distillation configurations and outcomes are recorded in the central wiki (as done for U‑PAPA‑LORA‑DISTILL‑MODE) to maintain traceability across iterations.

## Open threads
- **Mastery target after iteration 5** – The excerpt ends with “must next master *”; the specific competency or domain focus remains undefined.
- **Scaling beyond 34 galaxies** – Current pipeline handles 34 galaxies; a strategy is needed for adding new galaxies without re‑engineering the `vault-to-lora-dataset.mjs` script.
- **Discovery‑specific advisory tags** – How to design and standardise tags that capture discovery‑domain nuances (e.g., hypothesis validation, experimental constraints) within the 512 Alpaca pairs per galaxy.
