---
name: system-viz_synthesis
description: "[auto-synth · verify] Compounding synthesis of the system-viz domain — recurring patterns, decisions, open threads distilled from 5 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: system-viz
  synthesizedFrom: 5
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T02:43:55.697Z
  sourceHash: 1431c52ff26f
  advisoryOnly: true
  mustHumanVerify: true
---

# system-viz — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 5 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Slot‑centric configuration** – Both the task‑claim drift logic and the ghost‑wire validation reference a `slot` (e.g., *sierra*) and derive runtime parameters from slot metadata such as `VALID_SLOTS` sourced from `SLOT_NAME`【reference/reference_post_ship_system-viz-high-roi-ms0-u-slot-task-claim-drift】.  
- **Validation pipelines before visualization** – The ghost‑wire validator runs a dedicated feedback step that must succeed prior to any visual rendering in the system‑viz pipeline【reference/reference_post_ship_system-viz-high-roi-ms0-u-viz-ghost-wire-validate】.  
- **Distill mode as an explicit flag** – Converting domain corpora into LoRA training data is gated behind a `--distill` command‑line option, ensuring the transformation only occurs when explicitly requested【reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode】.  
- **Cross‑galaxy LoRA synthesis** – A unified dataset generator (`vault-to-lora-dataset.mjs`) now supports a `--source galaxy` mode that aggregates advisory‑tagged Alpaca pairs from all 34 galaxies, providing a single training signal for downstream LoRA models【reference/reference_lora_galaxy_synthesis_feeder_2026_06_10】.  
- **Full‑surface synergy** – The ZULU awareness module is built to ingest and harmonize *all* ten PRISM knowledge surfaces (wiki, tribal scripts, NN‑graph, etc.) via a pure‑library pipeline that currently passes 29/29 tests【reference/reference_zulu_awareness_ms0_2026_05_20】.

## Key decisions & rules
1. **Derive `VALID_SLOTS` from the canonical `SLOT_NAME` list** for any slot‑based task (e.g., U‑SLOT‑TASK‑CLAIM‑DRIFT)【reference/reference_post_ship_system-viz-high-roi-ms0-u-slot-task-claim-drift】.  
2. **Enforce ghost‑wire validation before any viz output**; failures must abort the pipeline and surface feedback to the operator【reference/reference_post_ship_system-viz-high-roi-ms0-u-viz-ghost-wire-validate】.  
3. **Require `--distill` flag when invoking domain‑corpus‑to‑LoRA conversion**, preventing accidental data leakage or unintended model updates【reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode】.  
4. **When generating LoRA datasets across galaxies, always use the `--source galaxy` mode** to guarantee inclusion of all 34 galaxy sources and the 512 advisory‑tagged Alpaca pairs【reference/reference_lora_galaxy_synthesis_feeder_2026_06_10】.  
5. **Zulu awareness must be run with full PRISM surface integration**, validated by the pure‑lib test suite (29 passing tests) before deployment【reference/reference_zulu_awareness_ms0_2026_05_20】.

## Open threads
- **Interaction between slot claim drift and ghost‑wire validation** – It is unclear whether the output of `VALID_SLOTS` influences the ghost‑wire feedback loop or if they operate independently.  
- **Scope of `--distill` across other system‑viz modules** – The current flag is defined for domain‑knowledge LoRA generation; extending it to slot‑task or viz‑ghost pipelines remains undecided.  
- **Scalability beyond 34 galaxies** – The galaxy synthesis feeder currently targets a fixed set of 34 galaxies; a strategy for dynamic addition of new galaxy sources has not been documented.  
- **Maintenance of the pure‑lib test matrix as slots evolve** – Adding new slots may affect Zulu’s surface synergy; a plan for automated test generation to cover such extensions is pending.  
- **CLI ergonomics for combined operations** – Users need guidance on chaining `--distill`, `--source galaxy`, and slot‑specific flags in a single command line; documentation is not yet provided.
