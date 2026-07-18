---
name: blueprint-vision_synthesis
description: "[auto-synth · verify] Compounding synthesis of the blueprint-vision domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: blueprint-vision
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:56:56.057Z
  sourceHash: 486cc4e1d8e7
  advisoryOnly: true
  mustHumanVerify: true
---

# blueprint-vision — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Iterative knowledge accretion** – Hermes‑driven “blueprint‑vision” iterations (1, 3–5, 8–18, 22, 25, 30) repeatedly ingest reputable sources (e.g., Lurie 2009) and produce next‑layer research drafts.  
- **Automated archival sync** – `scripts/h-drive-to-vault.mjs` regenerates H‑drive sub‑folder vaults for *archives*, *plans‑archive*, *skills‑archived* and the orphan MCP server archive on demand ([reference_hdrive_h-prism-subdirs‑archives]–[5]).  
- **Wire‑layer exposure of core libs** – After shipping, the `blueprintRedaction` library is made reachable via the wire stack to enable downstream consumption ([reference_post_ship_blueprint_vision_ocr_u_app_redact_wire]).  
- **Baseline post‑processor consolidation** – A single set of .cps processors (Hurco for mills; Okuma LB3000 + Multus B250IIW for turning) serves as the canonical baseline, wrapped by `PRISM‑Enhance` ([reference_post_processor_fleet_baselines_2026_05_25]).  
- **Critical lock reclamation** – A 32‑NUL‑byte corrupted `.brain-refresh.lock` caused deadlock across five pipelines; fixed via commits `U‑OBS‑BRAIN‑LOCK‑RECLAIM` and `‑P2` ([reference_brain_lock_reclaim_2026_06_09]).  
- **Wiki/tribal knowledge pivots** – High‑ROI canonical wiki entries (≈61) are harvested, versioned, and linked to operator directives and the F3 invention ([reference_pivot_wiki_tribal_2026_05_21]).

## Key decisions & rules
- **Do not import legacy JS archive** – The February 2026 PRISM archive contains outdated code; it must be excluded from builds. ([project_archive_outdated])
- **Expose `blueprintRedaction` via wire** – Post‑release, ensure the library is reachable through the wire layer for any consumer module. ([reference_post_ship_blueprint_vision_ocr_u_app_redact_wire])
- **Treat H‑drive vault outputs as source of truth** – Regenerate sub‑directory archives with `scripts/h-drive-to-vault.mjs` whenever file changes occur; do not edit vault files manually. ([reference_hdrive_h-prism-subdirs‑archives]–[5])
- **Adopt the defined post‑processor baseline** – All new .cps processors must extend the Hurco / Okuma LB3000 + Multus B250IIW baseline and be wrapped by `PRISM‑Enhance`. ([reference_post_processor_fleet_baselines_2026_05_25])
- **Enforce lock‑reclaim commit hygiene** – After any pipeline change, verify that no `.brain-refresh.lock` files contain null‑byte corruption; run the lock‑reclaim validation script. ([reference_brain_lock_reclaim_2026_06_09])
- **Iterative research workflow** – For each iteration:
  1. Run Hermes to draft next‑layer content.  
  2. Cite reputable sources (e.g., Lurie 2009).  
  3. Store output with a monotonic iteration tag (`iterX`).  
  4. Review against prior iterations before promotion. ([reference_blueprint-vision_iter1_deepsource_2026_06_14]–[30])
- **Maintain canonical wiki** – New tactical machining leaves and architectural notes must be added to the tribal wiki, preserving the 61‑entry structure and linking to operator directives. ([reference_pivot_wiki_tribal_2026_05_21])

## Open threads
- **Production rollout of later iterations** – How will `iter30` and beyond be integrated into the live blueprint‑vision pipeline? No deployment plan is documented.  
- **Orphan MCP server archive handling** – The 6000‑file `_ORPHAN-PRISM-MCP-SERVER-archived-20260421` set lacks a clear retention or migration strategy.  
- **F3 invention alignment** – The relationship between the F3 invention (mentioned in the wiki pivot) and existing blueprint‑vision components remains undefined.  
- **Post‑fix monitoring of brain pipelines** – Ongoing health checks for the five `brain-refresh` pipelines after lock reclamation have not been formalized.  
- **Future deprecation path for legacy OCR modules** – Beyond exposing `blueprintRedaction` via wire, a roadmap for retiring older OCR components is absent.
