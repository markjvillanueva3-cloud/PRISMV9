---
name: system-viz_synthesis
description: "[auto-synth · verify] Compounding synthesis of the system-viz domain — recurring patterns, decisions, open threads distilled from 4 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: system-viz
  synthesizedFrom: 4
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:49:54.760Z
  sourceHash: cc88a148aa7d
  advisoryOnly: true
  mustHumanVerify: true
---

# system-viz — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 4 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Slot‑centric validation** – Both the claim‑drift and ghost‑wire modules pull a whitelist (`VALID_SLOTS`) directly from the slot’s name definition, ensuring that any downstream logic only operates on slots that are explicitly declared as valid. [reference/reference_post_ship_system-viz-high-roi-ms0-u-slot-task-claim-drift]  
- **Ghost‑wire sanity checks** – After a visualisation task finishes, a lightweight “ghost‑wire” validator runs to compare expected vs. actual data flow edges, flagging mismatches before they propagate. [reference/reference_post_ship_system-viz-high-roi-ms0-u-viz-ghost-wire-validate]  
- **Cross‑galaxy LoRA feeding** – The synthesis pipeline can ingest advisory‑tagged Alpaca pairs from any of the 34 galaxies via a `--source galaxy` mode, producing a unified LoRA model that is later applied to system‑viz components. [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10]  
- **Full‑stack awareness synergy** – The ZULU‑AWARENESS‑MS0 build aggregates all PRISM knowledge surfaces (wiki, NN‑graph, scripts, etc.) into a pure‑lib pipeline that passes 29/29 tests and is exposed through a CLI entry point. [reference/reference_zulu_awareness_ms0_2026_05_20]

## Key decisions & rules
- **Enforce `VALID_SLOTS` at module boundaries** – Any task (claim drift, ghost‑wire validation, etc.) must reject inputs whose slot identifier is not present in the pre‑computed whitelist.  
- **Run ghost‑wire validator immediately after visualisation generation** – The validator’s feedback loop is mandatory; failures abort the pipeline and trigger a retry or manual review.  
- **Use LoRA model as a shared feature extractor for all system‑viz ML components** – After training on multi‑galaxy data, the LoRA weights are frozen and injected into downstream models to improve generalisation across slots.  
- **Deploy ZULU awareness as the canonical entry point for PRISM‑wide queries** – All CLI interactions should route through the ZULU‑AWARENESS‑MS0 binary to guarantee that every knowledge surface is consulted.

## Open threads
- **Extending slot validation beyond `sierra`** – Current implementations only reference the `sierra` slot; a strategy for dynamically generating `VALID_SLOTS` for new slots (e.g., `alpha`, `beta`) remains undefined.  
- **Integrating LoRA updates into the ghost‑wire feedback loop** – It is unclear how improvements from cross‑galaxy LoRA training will be reflected in the ghost‑wire validator’s error detection thresholds.  
- **Automated propagation of ZULU awareness changes to system‑viz modules** – While ZULU aggregates all knowledge surfaces, a mechanism for notifying or hot‑reloading affected visualisation components has not been established.
