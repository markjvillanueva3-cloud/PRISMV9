---
name: mill_synthesis
description: "[auto-synth · verify] Compounding synthesis of the mill domain — recurring patterns, decisions, open threads distilled from 12 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: mill
  synthesizedFrom: 12
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:58:08.416Z
  sourceHash: 3f2dc82ffe41
  advisoryOnly: true
  mustHumanVerify: true
---

# mill — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 12 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Auto‑distillation after each ship** – every major knowledge payload (domain, fleet, high‑ROI wiki) is automatically distilled into a slot‑specific module and persisted for downstream use [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode], [reference/reference_post_ship_fleet-knowledge-max-u-zkm-verify-w4], [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-machtact-climb-vs-conv].
- **“--distill” flag pipeline** – the `domain-corpus-to-lora-data` tool is always invoked with a `--distill` mode to generate LoRA‑ready datasets from raw corpora [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].
- **Galaxy‑wide LoRA synthesis** – per‑galaxy knowledge brains feed a central LoRA trainer; the trainer is extended with a `--source galaxy` switch to ingest 512 advisory‑tagged Alpaca pairs from each galaxy [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **RAG embedding loop** – newly authored mill wiki pages are first validated, then embedded into the local RAG store; this step is repeatedly flagged as missing and must be re‑run after any bulk authoring [reference/reference_bravo_mill_knowledge_not_yet_embedded_2026_06_12].
- **Inventory → audit → wiring** – a canonical inventory of `.ts` mill files drives an audit that marks “HIGH‑ROI unwired” and “undocumented” flags; wiring proceeds until the audit reports ≥ 89 % completeness [reference/reference_mill_data_inventory_2026_06_12], [reference/reference_mill_galaxy_complete_stale_audit_flags_2026_06_02].
- **Radial chip‑thinning (RCTF) compensation** – tool‑life calculations are adjusted by the RCTF factor and an effective feed rate `fz·RCT` in Phase‑2 research [reference/reference_mill_hsm_chip_thinning_toollife_2026_06_13].

## Key decisions & rules
1. **Always run with `--distill`.**  
   When converting any domain corpus to a LoRA dataset, the command must include `--distill` to trigger auto‑extraction and slot tagging [reference/reference_post_ship_domain-knowledge-u-papa-lora-distill-mode].

2. **Embed validated wiki pages immediately.**  
   After a batch of mill wiki pages passes validation, they are queued for RAG embedding; failure to embed stalls downstream self‑learning [reference/reference_bravo_mill_knowledge_not_yet_embedded_2026_06_12].

3. **Follow the audit flag hierarchy.**  
   - Resolve all “HIGH‑ROI unwired” items first (currently none, per latest audit).  
   - Then address the 15 “MED undocumented” flags; treat any stale flag as a bug and refresh the audit before wiring [reference/reference_mill_galaxy_complete_stale_audit_flags_2026_06_02].

4. **Apply RCTF in tool‑life models**  
   Use `RCTF = D/(2·sqrt(ae(D‑ae)))` for `ae < D/2`; update effective feed `fz_eff = fz * RCTF` whenever chip‑thinning is active [reference/reference_mill_hsm_chip_thinning_toollife_2026_06_13].

5. **Persist validated corpora and physics foundations**  
   Domain‑corpus validation (`U-PAPA-DOMAIN-CORPUS-VALIDATE`) and fleet physics verification (`U-ZKM-VERIFY-W4/W8`) must be stored in their respective slots to serve as immutable references for downstream galaxies [reference/reference_post_ship_domain-knowledge-u-papa-domain-corpus-validate], [reference/reference_post_ship_fleet-knowledge-max-u-zkm-verify-w8].

6. **Integrate high‑ROI tribal knowledge**  
   Climb vs conventional milling strategies and tooling‑selection heuristics are to be merged into the mill’s decision engine as canonical rules [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-machtact-climb-vs-conv], [reference/reference_post_ship_high-roi-wiki-tribal-u-wiki-toolsel-flute-helix].

## Open threads
- **Stale audit flags** – the 15 “MED undocumented” entries are marked as buggy; a fresh audit run is required to obtain accurate wiring targets [reference/reference_mill_galaxy_complete_stale_audit_flags_2026_06_02].
- **Unembedded wiki pages** – 16 newly authored mill pages remain outside the RAG store, blocking their contribution to self‑learning loops [reference/reference_bravo_mill_knowledge_not_yet_embedded_2026_06_12].
- **Remaining wiring gap** – current completeness is 89 %; identify and prioritize the missing ~11 % of `.ts` files for integration [reference/reference_mill_galaxy_complete_stale_audit_flags_2026_06_02].
- **Phase‑2 RCTF rollout** – confirm that the radial chip‑thinning formula and feed compensation are incorporated into production CNC controllers and that tool‑life predictions reflect the new model [reference/reference_mill_hsm_chip_thinning_toollife_2026_06_13].
- **Galaxy LoRA dataset freshness** – ensure the `--source galaxy` mode ingests the latest 512 advisory Alpaca pairs from all 34 galaxies before the next training cycle [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10].
