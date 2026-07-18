---
name: wedm_synthesis
description: "[auto-synth · verify] Compounding synthesis of the wedm domain — recurring patterns, decisions, open threads distilled from 5 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: wedm
  synthesizedFrom: 5
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T02:44:09.608Z
  sourceHash: 114a5b0b3552
  advisoryOnly: true
  mustHumanVerify: true
---

# wedm — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 5 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Pair‑wise shipping**: Both the *hook* and *tactics* releases are delivered as two‑item pairs (bridge entries or tactical leaves) that directly reference WEDM wiring, tension, and fluid parameters [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-arch-wedm-hook-pair] & [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-wedm-tactics-pair].
- **LoRA‑centric knowledge transfer**: All recent WEDM work relies on a LoRA adapter trained in‑galaxy (Qwen2.5‑Coder‑7B QLoRA) using a reproducible pipeline (uv + Python 3.12 on drive H:) [reference/reference_wedm_lora_finetune_complete_2026_05_31].
- **Distillation mode for dataset creation**: The domain‑corpus‑to‑LoRA conversion now includes a `--distill` flag to produce compact training data from the broader corpus [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].
- **Cross‑galaxy synthesis feeding**: An extended `vault-to-lora-dataset.mjs` script can ingest advisory‑tagged Alpaca pairs from any of the 34 galaxies via a `--source galaxy` option, enabling multi‑galaxy signal aggregation [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].

## Key decisions & rules
1. **Ship WEDM components in fixed two‑item bundles** (bridge entries for wiring back; tactical leaves covering wire, tension, fluid) to keep integration predictable [1], [2].
2. **Standardize the fine‑tuning pipeline**: use the UV environment with Python 3.12 on drive H:, follow the four blocker‑lesson checklist from the LoRA training run [reference/reference_wedm_lora_finetune_complete_2026_05_31].
3. **Always invoke `--distill` when generating LoRA datasets** from domain corpora to ensure size‑efficient, high‑ROI data [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].
4. **When aggregating knowledge across galaxies**, run the dataset generator with `--source <galaxy>` and include the 512 advisory‑tagged Alpaca pairs as the base signal [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].
5. **Naming convention for slots**: use concise domain identifiers (e.g., `hotel`, `papa`, `india`) consistently across pair releases and synthesis scripts.

## Open threads
- **Scalability of the two‑item bundle model**: How to handle cases where more than two bridge entries or tactical leaves are required without breaking the current integration pattern?
- **Formalization of the “hard‑won blocker lessons”** from the LoRA fine‑tune run: a documented checklist is needed for future operators.
- **Cross‑galaxy weighting strategy**: Determining optimal contribution ratios of each galaxy’s advisory pairs when feeding into a single LoRA model.
- **Automation of `--distill` mode**: Can the distillation step be fully scripted to trigger on every domain‑corpus update, reducing manual oversight?
