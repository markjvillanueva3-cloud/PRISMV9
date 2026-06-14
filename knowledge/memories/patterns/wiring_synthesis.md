---
name: wiring_synthesis
description: "[auto-synth · verify] Compounding synthesis of the wiring domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: wiring
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:50:16.243Z
  sourceHash: 779512651b7b
  advisoryOnly: true
  mustHumanVerify: true
---

# wiring — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Post‑ship auto‑distillation** – most shipments generate a “Auto‑distilled learnings” wiki entry (e.g., [reference/reference_post_ship_catalog-app-wiring-ms0-u-holder-select], [reference/reference_post_ship_bridge-wiring-u-bridge-wire-mill]).  
- **Slot enforcement & bootstrap** – new wiring modules are tied to a specific slot (`romeo`, `alpha`, etc.) and flagged with `[BOOTSTRAP‑SLOT‑ENFORCE]` (e.g., [reference/reference_post_ship_catalog-app-wiring-ms0-u-holder-wire-fusion], [reference/reference_post_ship_bridge-wiring-u-bridge-wire-tosum]).  
- **Exhaustive endpoint enumeration** – every build ends with a systematic search for *all* possible wiring consumers (see feedback [feedback/feedback_find_all_wiring_endpoints_and_combinations]).  
- **Cross‑domain wiring campaigns** – dedicated audits identify orphans and triage them into `WIRE`, `EXEMPT`, `CROSS‑DOMAIN`, or dedup steps (e.g., [reference/reference_kilo_cam_wiring_campaign_2026_05_29], [reference/reference_u_rag_4_synergy_wiring_2026_05_22]).  
- **Tool‑holder & tooling DB consolidation** – holder‑type/brand and material‑type/brand tables are built once and reused across multiple wiring modules (e.g., [reference/reference_catalog_app_wiring_tooldb_2026_06_09], [reference/reference_fusion_holder_tooling_db_plan_2026_06_09]).  
- **Verification layers** – semantic‑wiring of the entire H‑drive is validated with evidence logs (see [reference/reference_obsidian_wiring_verified_2026_06_08]).  
- **Baseline post‑processor selection** – a small set of machines (Hurco, Okuma LB3000, Multus B250IIW) serve as universal baselines for all milling/turning wiring (see [reference/reference_post_processor_fleet_baselines_2026_05_25]).  

## Key decisions & rules
- **Do not wire obsolete/speculative hooks** – “don’t wire just for the sake of wiring” rule enforced from [feedback/feedback_dont_wire_for_wiring_sake_2026_05_16].  
- **Always enumerate every wiring endpoint and combination** before marking a module complete (operator directive in [feedback/feedback_find_all_wiring_endpoints_and_combinations]).  
- **Slot‑specific bootstrap requirement** – new modules must declare their slot and pass the `[BOOTSTRAP‑SLOT‑ENFORCE]` check (e.g., [reference/reference_post_ship_catalog-app-wiring-ms0-u-holder-wire-hypermill]).  
- **Archive policy** – legacy archive `H:\PRISM_ARCHIVE_2026-02-01` is declared obsolete and must not be imported (see [project/project_archive_outdated]).  
- **Lock‑reclaim safety** – the 32‑NUL‑byte lock deadlock was fixed via commits `U-OBS-BRAIN-LOCK-RECLAIM` & `-P2`; future pipelines must monitor for similar lock corruption ([reference/reference_brain_lock_reclaim_2026_06_09]).  
- **Tool‑length floor‑clamp bug handling** – captured in the tooling DB entry and requires a conditional fix path when wiring hyperMILL holders ([reference/reference_catalog_app_wiring_tooldb_2026_06_09]).  

## Open threads
- **Remaining synergy‑wiring work** – only 2 of 4 synergy‑wiring components are shipped; edge‑ordering lib is partial, and per‑unit obsidian memories still need wiring ([reference/reference_u_rag_4_synergy_wiring_2026_05_22]).  
- **Ollama GPT‑OSS offload caveat** – noted in the tooling DB but no mitigation documented yet ([reference/reference_catalog_app_wiring_tooldb_2026_06_09]).  
- **HyperMILL floor‑clamp bug verification** – bug captured, but downstream validation across all holder types is pending.  
- **Tribal engine wiring completeness** – tribal engines wired in BRIDGE‑WIRING (see [reference/reference_post_ship_bridge-wiring-u-bridge-wire-tribal]) but cross‑domain dependencies may still be missing.  
- **Edge‑ordering lib performance** – initial implementation (`scripts/lib/edge-order.mjs`) works for rank‑sorted top‑K; scaling tests across full CAM corpus are outstanding.  
- **Lock‑reclaim monitoring** – after the fix, continuous health checks for `.brain-refresh.lock` corruption have not been formalized.
