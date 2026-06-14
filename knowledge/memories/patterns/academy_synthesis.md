---
name: academy_synthesis
description: "[auto-synth · verify] Compounding synthesis of the academy domain — recurring patterns, decisions, open threads distilled from 18 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: academy
  synthesizedFrom: 18
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:45:08.125Z
  sourceHash: 8e569d3fa2a4
  advisoryOnly: true
  mustHumanVerify: true
---

# academy — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 18 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Slot‑centric build & verification** – Most releases are tied to a named *slot* (e.g., `lima`, `india`, `bravo`, `papa`) and include a “BOOTSTRAP‑SLOT‑ENFORCE” step that pushes the domain into a live, verified wiki. [reference_post_ship_galaxy-enrich-u-ge-academy-verify] [reference_post_ship_academy-corpus-ms0-u-a2-mit-ai-textbooks-register] [reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-memory-parity-3-core-galaxies]
- **Auto‑distilled learning artifacts** – After each ship, an “auto‑distilled learnings” markdown is generated and stored in the wiki for traceability. [reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories] [reference_post_ship_galaxy-enrich-u-applied-practice-domain-complete] [reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-c1-pilot-classifier]
- **Cross‑galaxy synthesis & LoRA signal** – The academy’s knowledge base is expanded by feeding per‑galaxy MEMORY.md files into a unified “brain” (4‑section structure) and training LoRA adapters across all 34 galaxies. [reference_reference_lora_galaxy_synthesis_feeder_2026_06_10] [reference_obsidian_galaxy_brain_recall_2026_06_09] [reference_galaxy_memory_fill_2026_06_08]
- **Engine surface mapping** – A catalog of 18 academy‑domain engines (Curriculum, CourseBuilder, Instructor, MITCourse, etc.) is maintained and versioned per slot. [reference_lima_academy_engine_map] [reference_lima_academy_galaxy_2026_05_28]
- **Custom awareness surface** – `lima` injects a PRISM‑awareness hook that mediates domain‑specific queries and audits. [reference_lima_academy_awareness_surface_2026_05_29]
- **Sparse memory grounding** – Selected “sparse memories” (≈20 per slot) are explicitly grounded to avoid over‑inflation; reviewers flagged a 20× corpus inflation issue. [reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories] [reference_galaxy_memory_fill_2026_06_08]
- **Weekly synthesis populater** – A recurring weekly job aggregates new transcripts into the domain memory parity core. [reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-b3-weekly-synthesis-populater]

## Key decisions & rules
- **Never report a course count as fact**; rely on the CurriculumEngine for dynamic enumeration. [reference_lima_branch_drift_academy]
- **Enforce memory parity across core galaxies** (3‑core set) before any slot is promoted to VERIFIED status. [reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-memory-parity-3-core-galaxies]
- **Use the 4‑section brain schema** for every MEMORY.md file; deviations trigger a RED test failure. [reference_galaxy_memory_fill_2026_06_08] [reference_obsidian_galaxy_brain_recall_2026_06_09]
- **Bootstrap‑Slot‑Enforce pipeline** must run after each ship to lock the slot’s wiki content and generate a verification hash. [reference_post_ship_galaxy-enrich-u-ge-academy-verify] [reference_post_ship_academy-corpus-ms0-u-a2-mit-ai-textbooks-register]
- **LoRA training signal is global** – all 34 galaxies contribute advisory‑tagged Alpaca pairs; the feeder script must be invoked with `--source galaxy`. [reference_reference_lora_galaxy_synthesis_feeder_2026_06_10]
- **Sparse memory count limit (≈20 per slot)** to keep the domain tractable and prevent corpus inflation. [reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories] [reference_galaxy_memory_fill_2026_06_08]

## Open threads
- **Branch drift in the academy backend** – `lima`’s course‑35..60 expansion lags behind the integration tree (37 wired / 15 web blueprints). Alignment plan pending. [reference_lima_branch_drift_academy]
- **Incomplete sparse memories for some slots** – Slot `bravo` currently holds only 20 grounded memories; verification of remaining gaps is outstanding. [reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories]
- **Corpus inflation detection workflow** – Reviewers identified a 20× inflation in earlier builds; a systematic audit process has not yet been codified. [reference_galaxy_memory_fill_2026_06_08]
- **Consistency of the custom awareness surface** – The `lima` PRISM‑awareness hook is live, but cross‑slot interoperability tests are still pending. [reference_lima_academy_awareness_surface_2026_05_29]
- **Finalization of applied‑practice layers** – Slots `papa` (U‑APPLIED‑PRACTICE‑DOMAIN‑COMPLETE) and `papa` (U‑APPLIED‑PRACTICE‑10) have been shipped, yet integration with the practitioner‑tribal layer remains to be validated. [reference_post_ship_galaxy-enrich-u-applied-practice-domain-complete] [reference_post_ship_galaxy-enrich-u-applied-practice-10]
