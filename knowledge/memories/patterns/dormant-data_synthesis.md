---
name: dormant-data_synthesis
description: "[auto-synth · verify] Compounding synthesis of the dormant-data domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: dormant-data
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:47:40.328Z
  sourceHash: 14ec839b9126
  advisoryOnly: true
  mustHumanVerify: true
---

# dormant-data — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Auto‑distilled “U‑” units** are created after each major ship to capture learnings and then referenced by downstream projects (e.g., `U-HOLDER-SELECT`, `U-POCKET-HOLDER-FIX`, `U-SKILL-ARCHIVE…`)【9†reference_post_ship_catalog-app-wiring-ms0-u-holder-select】【14†reference_post_ship_echo-winmax-u-pocket-holder-fix】.  
- **Cold‑archive segregation**: legacy scripts, Python shims, and validation utilities are moved into dedicated “cold” directories under `INFRA‑DEVTOOLS` and treated as read‑only reference material【18†reference_post_ship_infra-devtools-u-cold-archive-6dirs】【19†reference_post_ship_infra-devtools-u-cold-archive-core-py】【20†reference_post_ship_infra-devtools-u-cold-archive-pattern-3】【21†reference_post_ship_infra-devtools-u-cold-archive-validation】.  
- **Canonical holder taxonomy** – a CAM‑agnostic axis that splits holders by *taper size* × *contact type* (single vs dual) and fixes the BCV data bug【6†reference_holder_taper_contact_categorization】; this schema is reused across wiring modules, DB expansion, and run‑out deduplication【9†reference_post_ship_catalog-app-wiring-ms0-u-holder-select】【12†reference_post_ship_db-expansion-u-holder-taper-contact-categorization-docs】【22†reference_post_ship_oscar-sfc-9axis-ms0-u-osc-holder-runout-dedup】.  
- **Baseline post‑processor set** – a single Hurco `.cps` baseline for all mills and Okuma LB3000 + Multus B250IIW baselines for turning are enforced across the fleet【1†reference_reference_post_processor_fleet_baselines_2026_05_25】.  
- **Data‑age gating** – any pre‑PRISM archive (e.g., 684 JS files from Feb 2026) is explicitly marked “do not import” to prevent stale knowledge leakage【4†project_archive_outdated】.  
- **Lock reclamation workflow** – a dedicated commit series (`U‑OBS‑BRAIN‑LOCK‑RECLAIM`) resolves dead‑locked brain pipelines caused by corrupted lock files【2†reference_brain_lock_reclaim_2026_06_09】.

## Key decisions & rules
| Decision / Rule | Source |
|-----------------|--------|
| **Never import** the `PRISM_ARCHIVE_2026-02-01` JS bundle; treat it as historical only. | 【4】 |
| **Use Hurco as the universal mill post‑processor baseline** and Okuma LB3000 + Multus B250IIW for turning. | 【1】 |
| **Populate Fusion tool‑holder & tooling DBs** according to the “holders‑by‑type‑brand / tooling‑by‑material‑type‑brand” plan; all new holders must be entered via this schema. | 【5】 |
| **Apply taper×contact categorization** for every holder definition; this resolves BCV data bugs and standardizes selection logic. | 【6】 |
| **Reclaim brain locks** by running the `U‑OBS‑BRAIN‑LOCK‑RECLAIM` commits whenever a 32‑byte NUL lock file appears. | 【2】 |
| **Archive legacy scripts** in the INFRA‑DEVTOOLS cold folders; they are read‑only and must not be edited or re‑used for new pipelines. | 【18‑21】 |
| **All post‑ship knowledge** must be captured in a `U‑` module and linked from the central wiki; duplicate effort is prohibited. | 【9‑14】【16】 |
| **Holder selection engines** (e.g., `HolderSelectionEngine`) must reference real holder records from the wiring modules, not inferred cutter types. | 【9†reference_post_ship_catalog-app-wiring-ms0-u-holder-select】【14†reference_post_ship_echo-winmax-u-pocket-holder-fix】 |

## Open threads
- **WEDM archive conversion** – The JM Die WIRE EDM archive is 98 % binary `.MCX` with only ~22 usable NC programs; a pipeline to extract/train LoRA data from these binaries is still missing【7†reference_mike_wedm_archive_composition_data_gap】.  
- **Fusion DB population status** – The plan for populating Fusion tool‑holder databases has been issued, but no follow‑up commit indicating completion exists. Tracking of progress and validation against the canonical taxonomy is needed【5†reference_fusion_holder_tooling_db_plan】.  
- **Integration of high‑ROI tribal tooling selection** with the canonical holder taxonomy (taper×contact) remains to be fully aligned; current wiki entries cover 61 canonical pages but mapping to the new schema is incomplete【3†reference_pivot_wiki_tribal】【16†reference_post_ship_high-roi-wiki-tribal-u-wiki-toolsel-holders】.  
- **Future post‑processor updates** – While a baseline exists, there is no defined process for versioning or propagating changes to the `.cps` fleet across new machine models.  
- **Monitoring for brain‑lock recurrence** – The lock reclamation fix addresses the known incident; ongoing health checks are required to detect similar corruption patterns early.
