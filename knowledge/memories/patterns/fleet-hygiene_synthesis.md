---
name: fleet-hygiene_synthesis
description: "[auto-synth · verify] Compounding synthesis of the fleet-hygiene domain — recurring patterns, decisions, open threads distilled from 7 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: fleet-hygiene
  synthesizedFrom: 7
  model: gpt-oss:120b
  synthesizedAt: 2026-06-26T02:03:52.094Z
  sourceHash: 47d313fa4a2b
  advisoryOnly: true
  mustHumanVerify: true
---

# fleet-hygiene — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 7 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Auto‑distilled post‑ship learnings** are generated for each shipped unit (e.g., U‑TMP‑JANITOR‑DOTFAMILY, U‑LLAMA‑ORPHAN‑REAPER, U‑SKILL‑LEDGER‑REVIVE‑FIX1) and stored in the wiki as canonical references.  
- **Slot‑based naming convention** (`slot:golf`, `slot:india`, `slot:papa`, etc.) is used to namespace hygiene utilities across the fleet.  
- **Orphan / temporary resource cleanup** appears repeatedly: a janitor for `.tmp.<pid>` files [reference_post_ship_fleet-hygiene-u-tmp-janitor-dotfamily] and an “orphan reaper” for leaked Ollama servers [reference_post_ship_fleet-hygiene-u-llama-orphan-reaper].  
- **Distillation / LoRA integration** is a shared theme: domain‑corpus → LoRA data via `--distill` mode [reference_post_ship_domain-knowledge-u-papa-lora-distill-mode] and galaxy‑wide synthesis feeding LoRA training signals [reference_lora_galaxy_synthesis_feeder_2026_06_10].  
- **Cross‑galaxy context enrichment** is leveraged to ground sparse memories (20 per galaxy) for downstream tasks [reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories].  

## Key decisions & rules
1. **Enforce temporary file hygiene** – Deploy `U‑TMP‑JANITOR‑DOTFAMILY` in slot :golf to sweep orphaned `.tmp.<pid>[.<rand>]` families.  
2. **Reap leaked Ollama instances** – Activate `U‑LLAMA‑ORPHAN‑REAPER` (slot :india) as the canonical mechanism for terminating stray llama‑server processes.  
3. **Enable LoRA distillation mode** – Add a `--distill` flag to the `domain-corpus-to-lora-data` pipeline (slot :papa).  
4. **Feed per‑galaxy synthesis into LoRA training** – Use the extended `vault-to-lora-dataset.mjs` with `--source galaxy` to ingest 512 advisory‑tagged Alpaca pairs from each of the 34 galaxies (slot :india).  
5. **Apply skill‑ledger revive fix** – Set environment variable `arm-C P0` in `U‑SKILL‑LEDGER‑REVIVE‑FIX1` (slot :kilo) to restore ledger integrity.  
6. **Provide sparse galaxy memories** – Populate each galaxy with 20 grounded domain memories via `U‑GALAXY‑SPARSE‑MEMORIES` (slot :bravo).  

## Open threads
- **Coordination of hygiene utilities across slots** – How the janitor, orphan reaper, and future hygiene modules will share state or avoid overlap is not yet defined.  
- **Scaling LoRA distill mode beyond domain‑knowledge** – Whether `--distill` will be adopted by other fleet‑hygiene components (e.g., temporary file cleanup) remains undecided.  
- **Integration of sparse galaxy memories with skill‑ledger fixes** – The impact of enriched context on the high‑ROI skill synergy module has not been evaluated.  
- **Monitoring and enforcement mechanisms for orphan reaping** – Details on detection thresholds, alerting, or automated rollback for leaked Ollama servers are pending.
