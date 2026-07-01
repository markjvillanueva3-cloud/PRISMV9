---
name: shop-floor_synthesis
description: "[auto-synth · verify] Compounding synthesis of the shop-floor domain — recurring patterns, decisions, open threads distilled from 3 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: shop-floor
  synthesizedFrom: 3
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T02:43:38.618Z
  sourceHash: 55e1057d08ca
  advisoryOnly: true
  mustHumanVerify: true
---

# shop-floor — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 3 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Command‑line mode flags for data shaping** – Both the shipping distill pipeline and the galaxy synthesis pipeline introduce explicit modes (`--distill`, `--source galaxy`) that toggle how raw corpora are transformed into LoRA training sets [reference/reference_post_ship_domain_knowledge-u-papa-lora-distill-mode] [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **Automated knowledge distillation across domains** – The “auto‑distilled learnings” from the shipping domain are reused as a template for cross‑galactic LoRA generation, suggesting a reusable abstraction: *domain → distilled corpus → LoRA* [reference/reference_post_ship_domain_knowledge-u-papa-lora-distill-mode] [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **Mapping granular wiki leaves to high‑ROI categories** – The tribal coverage audit groups 4,245 wiki “leaves” into five machining ROI buckets, providing a systematic way to spot knowledge thin spots before feeding data into LoRA pipelines [reference/reference_tribal_coverage_audit_2026_05_18].

## Key decisions & rules
1. **Enable `--distill` when converting any shop‑floor domain corpus to LoRA data** – mirrors the shipping implementation and guarantees consistent preprocessing.  
2. **Introduce a `--source <subdomain>` flag (modelled on `--source galaxy`) for each shop‑floor sub‑area (e.g., CNC, SMT, QA)** so that multi‑source synthesis can be orchestrated with the same vault‑to‑LoRA script.  
3. **Prioritize generation of obsidian memories for knowledge gaps identified by the tribal audit** – only the thin‑spot categories receive immediate LoRA training focus.  
4. **Every wiki leaf must be classified into one of the five high‑ROI machining categories before inclusion in any LoRA dataset**; unclassified leaves are held back pending categorization.  

## Open threads
- **Adapting the galaxy‑source mode to shop‑floor subdomains:** What metadata schema is needed for `--source <subdomain>` to align with existing vault structures?  
- **Automating the audit‑to‑distill pipeline:** How can the tribal coverage results be programmatically fed into the `--distill` workflow without manual re‑tagging?  
- **Scaling beyond current granularity:** The galaxy pipeline handles 34 galaxies and 512 advisory‑tagged Alpaca pairs; what is the target volume for shop‑floor data, and does the current script handle that scale efficiently?
