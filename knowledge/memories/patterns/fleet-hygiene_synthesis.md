---
name: fleet-hygiene_synthesis
description: "[auto-synth · verify] Compounding synthesis of the fleet-hygiene domain — recurring patterns, decisions, open threads distilled from 7 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: fleet-hygiene
  synthesizedFrom: 7
  model: gpt-oss:120b
  synthesizedAt: 2026-06-10T20:23:34.140Z
  sourceHash: 8fbcd38f76b1
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
- **Orphan/temporary artifact cleanup** – multiple utilities target leftover runtime artifacts: the *U‑TMP‑JANITOR‑DOTFAMILY* sweeps `*.tmp.<pid>[.<rand>]` families [reference/reference_post_ship_fleet-hygiene-u-tmp-janitor-dotfamily]; the *U‑LLAMA‑ORPHAN‑REAPER* hunts leaked Ollama `llama-server` processes [reference/reference_post_ship_fleet-hygiene-u-llama-orphan-reaper].
- **Domain‑wide memory grounding** – sparse galaxy memories are explicitly seeded (≈20 grounded entries) to support context filling [reference/reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories]; the synthesis pipeline also forces per‑galaxy LoRA training signals across all 34 galaxies [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **Rule‑driven slot enforcement** – each hygiene unit is bound to a named slot (e.g., `golf`, `india`, `kilo`, `bravo`) and operates under standing directives that dictate when and how it runs [reference/reference_fleet-hygiene_transcript_synthesis]; the DISCOVER‑phase memory rule mandates continuous durable logging [feedback/feedback_domain_discovery_memories].

## Key decisions & rules
- **Slot‑specific hygiene actions**  
  - `golf` slot runs *U‑TMP‑JANITOR‑DOTFAMILY* to delete orphaned `.tmp.<pid>` files. [reference/reference_post_ship_fleet-hygiene-u-tmp-janitor-dotfamily]  
  - `india` slot hosts the new *U‑LLAMA‑ORPHAN‑REAPER* for leaked Ollama servers. [reference/reference_post_ship_fleet-hygiene-u-llama-orphan-reaper]  
  - `kilo` slot includes an environment‑variable guard in the *U‑SKILL‑LEDGER‑REVIVE‑FIX1* to enforce scrutiny arm‑C P0 behavior. [reference/reference_post_ship_high-roi-skill-synergy-u-skill-ledger-revive-fix1]  
  - `bravo` slot seeds 20 grounded domain memories for sparse galaxy contexts. [reference/reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories]

- **Standing rule for DISCOVER phases** – operators must write durable domain memories *as they occur* rather than only at phase close‑out. This applies fleet‑wide and is enforced from 2026‑05‑29 onward. [feedback/feedback_domain_discovery_memories]

- **Cross‑galaxy LoRA training mandate** – the synthesis feeder now emits a `--source galaxy` mode, generating 512 advisory‑tagged Alpaca pairs per galaxy to feed LoRA models across all 34 galaxies. [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10]

## Open threads
- **Integration of hygiene utilities with skill synergy fixes** – how the *U‑SKILL‑LEDGER‑REVIVE‑FIX1* env‑var interacts with ongoing orphan reaping and tmp‑janitor processes remains undocumented.  
- **Metrics & observability for orphan/reaper effectiveness** – no explicit success criteria or monitoring hooks are described for the `india` slot’s llama‑server reaper.  
- **Scaling LoRA synthesis to future galaxy additions** – the current pipeline covers 34 galaxies; a plan for onboarding new galaxies without manual tag curation is not yet defined.  
- **Policy alignment between DISCOVER‑phase memory rule and post‑deployment hygiene runs** – clarification needed on whether continuous memory logging should also capture outcomes of the `golf` and `india` slots.
