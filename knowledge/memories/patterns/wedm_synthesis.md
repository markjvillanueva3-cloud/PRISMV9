---
name: wedm_synthesis
description: "[auto-synth · verify] Compounding synthesis of the wedm domain — recurring patterns, decisions, open threads distilled from 4 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: wedm
  synthesizedFrom: 4
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:50:08.626Z
  sourceHash: 238d81b96086
  advisoryOnly: true
  mustHumanVerify: true
---

# wedm — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 4 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Pair‑based modularization** – both the *ARCH‑WEDM‑HOOK* and *WEDM‑TACTICS* releases are organized as two‑entry pairs (bridge entries vs tactical leaves) that feed into a common “wiring back” step [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-arch-wedm-hook-pair] [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-wedm-tactics-pair].
- **Wire‑centric tactical primitives** – the tactics pair consistently bundles *wire*, *tension* and *flu* as the minimal actionable units for WEDM operations [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-wedm-tactics-pair].
- **LoRA‑driven knowledge transfer** – a reusable fine‑tune pipeline (uv+py3.12 on H:) produces LoRA adapters that compress WEDM expertise; the same pipeline is reused across galaxies [reference/reference_wedm_lora_finetune_complete_2026_05_31].
- **Cross‑galaxy synthesis feed** – an extended `vault-to-lora-dataset.mjs` script aggregates 512 advisory‑tagged Alpaca pairs from each galaxy, feeding a single LoRA training signal that spans all 34 galaxies [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].

## Key decisions & rules
- **Structure releases as paired modules** – always emit two bridge/tactical entries per release; treat the first as a “hook” (integration point) and the second as a “tactic leaf” that implements wire‑tension‑flu logic [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-arch-wedm-hook-pair] [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-wedm-tactics-pair].
- **Standardize the LoRA fine‑tune pipeline** – use Qwen2.5‑Coder‑7B with QLoRA, target loss reduction from ~3.0 to ≤1.5, and run on the prescribed environment (uv + Python 3.12 on drive H:) [reference/reference_wedm_lora_finetune_complete_2026_05_31].
- **Apply four blocker lessons** (from the LoRA adapter memory) when onboarding new galaxies:
  1. Verify UV toolchain version compatibility.
  2. Ensure dataset tags are consistent across source galaxies.
  3. Reserve sufficient GPU memory for QLoRA’s low‑rank updates.
  4. Lock down reproducible seed and checkpoint naming.
- **Dataset generation rule** – invoke `vault-to-lora-dataset.mjs` with `--source <galaxy>` to pull exactly 512 advisory‑tagged Alpaca pairs per galaxy; this uniform slice feeds the global LoRA model [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].

## Open threads
- **Unified orchestration of hook & tactics pairs** – how to automatically chain the two bridge entries into a single deployment pipeline without manual wiring back steps.
- **Scaling LoRA beyond 34 galaxies** – assessing whether the current dataset slice (512 pairs/galaxy) remains sufficient as more galaxies are added, and what impact on loss convergence is expected.
- **Blocker lesson formalization** – need concrete documentation or tooling that enforces the four blocker rules during pipeline setup.
- **Metric expansion** – loss reduction is tracked, but additional quality metrics (e.g., execution latency of wire‑tension‑flu actions) have not been defined.
