---
name: corpus-aggregation_synthesis
description: "[auto-synth · verify] Compounding synthesis of the corpus-aggregation domain — recurring patterns, decisions, open threads distilled from 16 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: corpus-aggregation
  synthesizedFrom: 16
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:46:40.947Z
  sourceHash: 1856e699e629
  advisoryOnly: true
  mustHumanVerify: true
---

# corpus-aggregation — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 16 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Cross‑session Ollama mining** to synthesize transcripts across multiple “galaxy” sessions (e.g., corpus‑aggregation, knowledge‑conversion, database‑expansion) — [1], [4], [13], [15].  
- **Per‑galaxy MEMORY.md brains** built on a 4‑axis template and then indexed/embedded for hybrid recall — [7], [14], [10], [11].  
- **Compounding synthesis arm (B1)** that distills each galaxy’s memories into reusable patterns across the whole vault — [6].  
- **Authoritative free/legal external source index** used as the canonical data feed for all galaxies — [5], [12].  
- **A3‑enrichment**: re‑index only the domain body text (skip boilerplate) to lift buried knowledge into recall — [8], [10].  
- **LoRA training signal generation** from the aggregated galaxy syntheses, using a `--source galaxy` mode and advisory‑tagged Alpaca pairs — [9].  
- **Operator directives** that mandate checking all prior sessions before creating new assets or filling gaps — [2], [7].

## Key decisions & rules
- **Source hierarchy:** Pull fresh authoritative domain data exclusively from the free/legal external corpus index (315 pointers across 14 galaxies) when populating or enriching a galaxy — [5], [12].  
- **CONNECTED brain requirement:** A MEMORY.md is considered “connected” only if it contains all four axes defined in the Master‑Brain template (UP, etc.) — [14].  
- **A3 indexing rule:** Embed only the DOMAIN body text of each MEMORY.md; boilerplate headers are excluded to improve recall quality — [8], [10].  
- **Compounding output:** The B1 synthesis produces a single “compounding pattern” document per galaxy that other processes (LoRA generation, recall) consume — [6].  
- **LoRA dataset construction:** Use 512 advisory‑tagged Alpaca pairs drawn from knowledge/mem files; the `--source galaxy` flag ensures provenance is retained — [9].  
- **Memory completeness directive:** All 34 galaxies must have fully populated MEMORY.md files with accurate corpus counts; reviewers must flag inflation or self‑defeating RED tests — [7].

## Open threads
- **Hybrid recall cache filter details:** The flat‑memo filter regex (`^(feedback|ref…)`) used in the embedding‑cache builder needs final specification and testing — [11].  
- **Self‑defeating RED test resolution:** Clarify why the RED test failed during memory fill and define a mitigation strategy — [7].  
- **Dynamic updating of free‑source corpus index:** Establish processes for continuous ingestion of new authoritative external sources as they become available.  
- **Feedback loop from LoRA training to synthesis:** Determine how improvements from LoRA models will be fed back into the compounding arm and MEMORY.md updates.  
- **Scope of future cross‑session mining:** Agree on which additional galaxy domains should be included in the Ollama‑mined synthesis pipeline.
