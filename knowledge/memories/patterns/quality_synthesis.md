---
name: quality_synthesis
description: "[auto-synth · verify] Compounding synthesis of the quality domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: quality
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:58:30.590Z
  sourceHash: b41d782ce515
  advisoryOnly: true
  mustHumanVerify: true
---

# quality — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Type‑only modules trigger false positives in unwired audits** – both the `IEngine.ts` export‑type re‑export and other TS type‑only imports are repeatedly flagged as “UNWIRED” despite having no runtime code, inflating orphan counts. ([reference/reference_audit_type_only_false_positive_2026_06_22], [reference/reference_post_ship_wiring-u-audit-type-only-import])  
- **Canonical vs monolith data sources cause audit drift** – audits that read the *tribal‑embed-index.json* monolith directly miss updates made to shard‑based canonical files, leading to stale results. ([reference/reference_wiki_tribal_audit_shard_aware_fix_2026_06_10])  
- **Unwired‑engine gap is a persistent, cross‑slot capability deficit** – audits consistently surface ~90 built engines as unwired; after successive sweeps the backlog shrinks but never disappears (60 → 21 remaining). ([reference/reference_unwired_engine_gap_audit_2026_06_08], [reference/reference_fleet_unwired_audit_2026_06_11], [reference/reference_tango_unwired_engine_audit_2026_06_16])  
- **Deduplication & stop‑gate patterns are re‑used across slots** – the `U-AUDIT-VIZ-DEDUP` dedup library and the “stop_on_unwired_” flag for type‑only exclusions are cloned into new audits (e.g., DEVTOOLS, WIRING). ([reference/reference_audit_viz_dedup_and_prune_ttl_asymmetry_2026_06_20], [reference/reference_post_ship_devtools-audit-u-audit-type-only-stopgate])  
- **Coverage metrics are frequently mis‑reported** – the tribal coverage banner shows 83.7 % while actual file‑level audit reports only ~17 % coverage after a recent index clobber. ([reference/reference_wiki_tribal_coverage_17pct_2026_06_09])  
- **Domain co‑ownership and master‑brain cloning** – Alpha retains permanent ownership of the token‑optimization brain; India holds permanent co‑ownership for the same domain, and all other slots clone the master brain template. ([feedback/feedback_india_alpha_domain_coownership], [project/project_alpha_owns_obsidian_brain_2026_05_28])  

## Key decisions & rules
- **Exclude type‑only modules from unwired detection** – enable `stop_on_unwired_type_only` (or equivalent) in every audit that scans engine wiring. ([reference/reference_post_ship_devtools-audit-u-audit-type-only-stopgate], [reference/reference_post_ship_wiring-u-audit-type-only-import])  
- **Always read canonical shard files for cross‑galaxy audits** – replace monolith reads with `readFileSync` on the shard index to guarantee up‑to‑date data. ([reference/reference_wiki_tribal_audit_shard_aware_fix_2026_06_10])  
- **Route unwired‑engine fixes to domain owners** – after each audit, generate an owner‑specific backlog (e.g., India for Alpha’s token‑optimization, Bravo for fleet agents). ([reference/reference_bravo_unwired_hooks_audit_2026_06_10], [reference/reference_tango_unwired_engine_audit_2026_06_16])  
- **Deduplication must be keyed on intent noun** – the shared `audit-viz-dedup` library enforces this to avoid double‑cost queries. ([reference/reference_audit_viz_dedup_and_prune_ttl_asymmetry_2026_06_20])  
- **Maintain a single source of truth for coverage banners** – generate banner percentages directly from the latest tribal‑coverage audit output rather than static snapshots. ([reference/reference_wiki_tribal_coverage_17pct_2026_06_09])  
- **Preserve Alpha’s master‑brain ownership and propagate clones** – any new quality‑related brain (e.g., token‑context, AI‑synergy) must be derived from the Alpha template. ([project/project_alpha_owns_obsidian_brain_2026_05_28])  

## Open threads
- **Resolve remaining false positives for type‑only modules** – verify that all slots have adopted the stop‑gate and confirm no runtime‑code loss.  
- **Close the unwired‑engine gap** – 21 engines still uninvokable (Tango audit, 2026‑06‑16); prioritize by impact and assign owners.  
- **Reconcile tribal coverage reporting** – update the banner generation pipeline to reflect the ~17 % actual coverage and investigate the index clobber that caused the discrepancy.  
- **Fix broken heuristic in `galaxy-verify.mjs`** – current heuristic yields false‑fails; needs a more robust reference check across all 34 galaxies. ([reference/reference_fleet_synergy_audit_2026_06_01])  
- **Address duplicate‑case dispatcher warnings** – ten silent shadowed actions remain; decide whether to consolidate handlers or enforce explicit ordering. ([reference/reference_dispatcher_duplicate_case_audit_2026_06_22])  
- **Integrate token‑context audit findings into build‑quality pipeline** – ensure the 12‑item punch list from the token‑savings audit is reflected in `BUILD-QUALITY-PAPA` triage. ([reference/reference_forge_audit_token_context_2026_05_26], [reference/reference_post_ship_build-quality-papa-u-tsc-triage-ownerbound])  
- **Expand dedup and stop‑gate patterns to remaining slots** – confirm that Bravo, India, and Sierra audits also import the shared libraries.
