---
name: tribal-knowledge_synthesis
description: "[auto-synth · verify] Compounding synthesis of the tribal-knowledge domain — recurring patterns, decisions, open threads distilled from 4 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: tribal-knowledge
  synthesizedFrom: 4
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:49:59.907Z
  sourceHash: 061cc0fd33c7
  advisoryOnly: true
  mustHumanVerify: true
---

# tribal-knowledge — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 4 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Cross‑session synthesis as a core workflow** – multiple memories describe mining prior sessions to build unified tribal‑knowledge artifacts (e.g., “cross‑session synthesis of tribal‑knowledge‑galaxy transcripts” and the CAD asset generation operator that *“check all previous sessions”*).【reference/reference_tribal-knowledge_transcript_synthesis】【reference/reference_delta_cad_asset_generation_2026_05_29】
- **Galaxy‑scoped data pipelines** – each galaxy is treated as a distinct knowledge source, with a “--source galaxy mode” that pulls 512 advisory‑tagged Alpaca pairs per galaxy for LoRA training【reference/reference_lora_galaxy_synthesis_feeder_2026_06_10】.
- **Zero‑cost media ingestion** – the YouTube extraction pipeline replaces paid Whisper/Claude‑Vision services with a free stack (yt‑dlp → qwen2.5‑coder → TribalKnowledgeEngine) and feeds results directly into the tribal wiki【reference/reference_youtube_free_extraction_pipeline_2026_05_26】.
- **Iterative asset generation** – new CAD assets are produced by first mining all historic sessions, then applying generated rules to synthesize high‑ROI deliverables【reference/reference_delta_cad_asset_generation_2026_05_29】.

## Key decisions & rules
- **Ship “galaxy‑aware” capabilities first** – the system must expose per‑galaxy LoRA models before any cross‑galaxy aggregation is attempted【reference/reference_lora_galaxy_synthesis_feeder_2026_06_10】.
- **Mandatory session audit** – every generation task (CAD, LoRA, wiki updates) begins with a “check all previous sessions” directive to ensure no knowledge loss【reference/reference_delta_cad_asset_generation_2026_05_29】.
- **Zero‑cost pipeline adoption** – the $0 YouTube extraction stack is now the default ingestion path; paid Whisper/Claude‑Vision routes are deprecated for tribal‑knowledge capture【reference/reference_youtube_free_extraction_pipeline_2026_05_26】.
- **Advisory tagging requirement** – each Alpaca pair used for LoRA training must carry an advisory tag to preserve provenance and enable later audit trails【reference/reference_lora_galaxy_synthesis_feeder_2026_06_10】.
- **Standing directive: “build, ship, iterate”** – the overarching process is to build capabilities, ship them quickly, then iterate based on cross‑session synthesis feedback【reference/reference_tribal-knowledge_transcript_synthesis】.

## Open threads
- **Cross‑galaxy LoRA consolidation** – how and when to merge per‑galaxy LoRA models into a unified representation remains undecided.
- **Quality assurance for free YouTube transcripts** – while the $0 pipeline is live, criteria for acceptable transcription accuracy and downstream wiki integration are still being defined.
- **Scalability of CAD asset generation** – extending the “check all prior sessions” audit to >100 galaxies may introduce performance bottlenecks; mitigation strategies are pending.
