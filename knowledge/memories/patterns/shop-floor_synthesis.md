---
name: shop-floor_synthesis
description: "[auto-synth · verify] Compounding synthesis of the shop-floor domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: shop-floor
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:50:06.833Z
  sourceHash: 972b2f4b7db5
  advisoryOnly: true
  mustHumanVerify: true
---

# shop-floor — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Per‑galaxy synthesis & recall** – a unified pipeline that builds `*_synthesis.md` for each of the 34 galaxies, wires them into an Obsidian‑based brain, and expands context via BM25/semantic recall [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10] [reference/reference_obsidian_galaxy_brain_recall_2026_06_09] [reference/reference_brain_acceleration_map_2026_06_09].
- **Auto‑distilled post‑ship learnings** – every shipped feature (e.g., GALAXY‑CONTEXT‑FILL, BACKEND‑DEV‑LOOP, UI‑UX‑IMPROVEMENT) generates a distilled wiki entry that becomes part of the shop‑floor knowledge base [reference/reference_post_ship_galaxy-context-fill-u-galaxy-shopfloor-tribal] [reference/reference_post_ship_backend-dev-loop-u-prism-dev-wikis-high-roi] [reference/reference_post_ship_ui-ux-improvement-ms0-u-q-prism-resource-card].
- **Obsidian brain as persistent memory namespace** – `stop‑obsidian‑memory‑feed.mjs` continuously feeds files into `knowledge/memories/`, providing the “operating system” surface for PRISM [feedback/feedback_obsidian_brain] [reference/reference_brain_refresh_task_unregistered_2026_06_09].
- **Slot‑aware context surfaces** – each slot (e.g., KILO, LIMA) owns a custom CAM or PRISMPATHS core that injects domain context at session start [reference/reference_kilo_cam_awareness_surface_2026_05_28] [reference/reference_post_ship_per-slot-galaxy-buildout-u-echo-prismpaths-core].
- **High‑ROI wiki generation & tribal audit** – systematic mapping of tribal tips to ROI categories drives creation of high‑value wikis and guides future knowledge capture [reference/reference_tribal_coverage_audit_2026_05_18] [reference/reference_post_ship_high-value-wiki-u-prism-self-update-loop].
- **Cascade reasoning defaults tied to retired models** – the two‑pass cascade dispatcher still points at a deprecated Qwen2.5‑coder roster, requiring manual update on GPU nodes [reference/reference_cascade_defaults_retired_model_2026_06_09].

## Key decisions & rules
- **Write durable domain memories during DISCOVER phases** (not only at close‑out) to keep the galaxy‑wide asset map current [feedback/feedback_domain_discovery_memories].
- **Expose PRISM OS via `prism_operating_system` dispatcher** with 45+ actions, making the shop‑floor surface role‑aware and programmable [feedback/feedback_prism_os].
- **Register the PRISM Brain Refresh task on every host**; missing registration leads to silent decay of synthesis artifacts [reference/reference_brain_refresh_task_unregistered_2026_06_09] [reference/reference_brain_acceleration_map_2026_06_09].
- **Replace retired cascade models with current GPU‑compatible versions** to avoid fallback on CPU‑only paths and improve token economy [reference/reference_cascade_defaults_retired_model_2026_06_09].
- **Standardize galaxy MEMORY.md structure (4 sections)** and enforce full fill for all 34 galaxies; reviewers must verify corpus counts to prevent inflation [reference/reference_galaxy_memory_fill_2026_06_08].
- **Leverage LoRA training signal across all galaxies** via `--source galaxy` mode, ensuring consistent fine‑tuning data across the fleet [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].

## Open threads
- **Brain Refresh task registration gaps** – hosts still lack the elevated registration; need automation to detect and fix [reference/reference_brain_refresh_task_unregistered_2026_06_09].
- **Cascade model retirement impact** – performance degradation observed on Blackwell nodes; schedule migration to supported models [reference/reference_cascade_defaults_retired_model_2026_06_09].
- **Corpus inflation & RED test failures** in galaxy memory fills – 20× inflation flagged; requires re‑audit and tighter validation rules [reference/reference_galaxy_memory_fill_2026_06_08].
- **Integration of BM25 recall into `prism_memory:brain_recall`** – expose the Obsidian vault as a searchable API for downstream agents [reference/reference_post_ship_brain-synergy-ms0-u-brain-recall].
- **Completing tribal‑coverage audit for remaining ROI categories** – current mapping covers 4245 tips; gaps remain in two low‑frequency machining groups [reference/reference_tribal_coverage_audit_2026_05_18].
- **Ensuring LoRA data pipeline consistency across all slots** – verify that each slot’s `*_synthesis.md` is correctly consumed by the AMP‑CONSUME arm [reference/reference_alpha_amp_consume_synthesis_line_2026_05_30].
