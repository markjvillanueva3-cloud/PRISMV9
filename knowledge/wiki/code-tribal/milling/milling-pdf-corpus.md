---
title: Milling PDF Corpus — source-attributed reference manifest
type: code-tribal
domain: milling
slot_origin: foxtrot
created: 2026-05-26
last_verified: 2026-05-26
related:
  - knowledge/wiki/os/commands/mill-studio.md
  - knowledge/memories/feedback/feedback_psn_definition.md
  - course-4-milling-operations
tags: [milling, tribal, pdf-corpus, source-attribution, foxtrot]
---

# Milling PDF Corpus — Source-Attributed Reference Manifest

The PRISM milling domain rests on a corpus of **24 PDFs** spanning Haas operator manuals, Hurco WinMax workbooks, Sandvik Coromant catalogs, Mastercam Dynamic Milling tutorials, SolidCAM/InventorCAM training, hyperMILL manuals, and CNCCookbook reference guides. This entry is the canonical index — every tribal tip, playbook rule, and academy lesson that draws from these PDFs **MUST cite the source** per foxtrot-soul rule (refuse-list: `dropping-source-attribution-on-ingest`).

## Why source attribution is non-negotiable

Lima is building PRISM Academy training material from PDF + video extraction. Without source attribution at ingest time, downstream tribal-tip conflicts cannot be R7-resolved (most-recent / most-tested wins) — they collapse into anonymous averages that are *neither* what Haas nor Mastercam nor Sandvik actually says. The corpus manifest at `state/shared/dashboards/milling-pdf-corpus.json` carries `vendor`, `evidenceLevel`, and `confidence` for every entry; consumers MUST preserve these fields end-to-end through `/pdf-learn`, the playbook ingest, and academy course rendering.

## Tier-A sources (operator-direct or vendor-authoritative)

| Source ID | Title | Vendor | Evidence |
|---|---|---|---|
| PDF-MILL-HAAS-MILL-OPS-2023 | Mill Operator's Manual (NGC, 2023) | Haas Automation | manufacturer_official |
| PDF-MILL-WINMAX-INTRO | WinMax Mill Intro Class Workbook | Hurco | manufacturer_training |
| PDF-MILL-WINMAX-CUTTER-COMP | WinMax Mill — Cutter Compensation | Hurco | manufacturer_official |
| PDF-MILL-WINMAX-RECOVERY | WinMax Mill — Recovery and Restart | Hurco | manufacturer_official |
| PDF-MILL-SANDVIK-GC-MILLING-G | Sandvik Coromant 2023-2024 — Milling (Global) | Sandvik Coromant | manufacturer_official |
| PDF-MILL-SANDVIK-GC-MILLING-US | Sandvik Coromant 2023-2024 — Milling (US) | Sandvik Coromant | manufacturer_official |
| PDF-MILL-SOLID-END-MILLS | Solid End Mills | Sandvik Coromant | manufacturer_official |
| PDF-MILL-HYPERMILL-MASTER-MANUAL | hyperMILL Manual v31.0 | Open Mind hyperMILL | manufacturer_official |
| PDF-MILL-DYNAMIC-MASTERCAM | Mastercam X8 — Dynamic Milling Tutorial | Mastercam | manufacturer_training |
| PDF-MILL-INVENTORCAM-2-5D | InventorCAM 2024 — 2.5D Milling Training | SolidCAM | manufacturer_training |
| PDF-MILL-INVENTORCAM-5X | InventorCAM 2024 — Sim 5X Milling User Guide | SolidCAM | manufacturer_training |
| PDF-MILL-INVENTORCAM-MULTIAX-DRILL | InventorCAM 2024 — Multiaxis Drilling | SolidCAM | manufacturer_training |
| PDF-MILL-COPE-5X-DRILL-G08 | Tool Vector Drill Cycle + G08 ASR Command | Cope (post docs) | post_processor_doc |

## Tier-B sources (industry reference, single-source)

| Source ID | Title | Vendor |
|---|---|---|
| PDF-MILL-FACE-SF | Face Mill Speeds and Feeds (45° / 90°) | CNCCookbook |
| PDF-MILL-HELICAL-INTERP | Helical Interpolation for Thread Milling | CNCCookbook |
| PDF-MILL-FIXTURES | Total Guide to CNC Jigs, Fixtures, Workholding | CNCCookbook |
| PDF-MILL-HOLDERS | Ultimate Guide to Milling Tool Holders | CNCCookbook |
| PDF-MILL-DEEP-HOLE-DRILLING | Deep Hole Drilling Easy Guide | CNCCookbook |
| PDF-MILL-USING-MILL-CAM-FOR-LATHE | Using Mill CAM for Lathe G-Code | CNCCookbook |

Tier-B is **draft-confidence** until ≥2-source corroboration arrives (per foxtrot-soul). Do NOT promote a Tier-B-only tip to playbook doctrine.

## Operation-topic → PDF lookup

The `operationTopicIndex` in `milling-pdf-corpus.json` answers "for milling operation X, which PDFs are authoritative?" — consumed by:

- `KnowledgeCurriculumBridgeEngine.lessonsForOperation(opType)` — surfaces academy lessons + cited PDFs for the operation the mill-studio wizard is about to plan
- `tribal-by-domain-inject` hook — top-3 tribal hits for foxtrot/milling work
- `prism_knowledge:tribal_search` — operator query surface

Indexed operations (each mapped to ≥1 source PDF): face_milling, pocket_milling, slotting, contour_milling, thread_milling, drilling_strategies, adaptive_hsm, five_axis, workholding, tool_holders, cutter_compensation, program_recovery, ngc_control.

## How this corpus reaches the mill-studio wizard

```
User: /mill-studio 4140 VTC-800
   │
   ▼
MillMasterOrchestratorFacadeEngine
   │
   ├─► (existing) AutoSpeedFeedEngine → Kienzle/Taylor physics
   ├─► (existing) ToolpathStrategyEngine → strategy selection
   ├─► (existing) TribalKnowledgeActivationEngine → tip injection
   │
   └─► (NEW PB-MS0/P3 follow-up — this commit)
        KnowledgeCurriculumBridgeEngine.lessonsForOperation(opType)
            │
            ├─► CurriculumEngine.course-4-milling-operations  (academy)
            ├─► milling-pdf-corpus.json operationTopicIndex   (PDFs)
            └─► tribal-by-domain milling                       (tips)
```

## Vendor-online resources (deep research, 2026-05-26)

Sibling manifest at `mcp-server/data/ingestion_cache/milling-vendor-online-resources.json` indexes **9 vendors** with **52 catalogued online resources** (PDFs, application guides, calculators, ISO-13399 portals). Vendors researched per user directive:

| Vendor | Entry Point | Key Resources |
|---|---|---|
| DAPRA | dapra.com | VOLUM3 45° face mill PDF, VAPOR HF platform, [Milling Formulas](https://www.dapra.com/resources/milling-formulas) (SFM/IPT/MRR + chip-thinning) |
| Sandvik Coromant | sandvik.coromant.com | [Knowledge hub](https://www.sandvik.coromant.com/en-us/knowledge), [Milling App Guide](https://www.sandvik.coromant.com/en-us/milling-appl-guide) (face-mill 60-70% rule), [face milling PDF](https://cdn2.sandvik.coromant.com/files/a53b485b-be0f-019d-8100-3f0d1619b9fa/357cffb0-b3c6-429d-9d58-cf1f5871a2f6/facemilling.pdf) |
| WIDIA / Kennametal | widia.com, kennametal.com | [Catalogs hub](https://www.kennametal.com/us/en/resources/catalogs-literature.html), NOVO app, [Conversion guide](https://www.widia.com/us/en/resources/conversion-guide.html) |
| Ingersoll Cutting Tools | ingersoll-imc.com | [TaeguTmill PDF](https://ssl.ingersoll-imc.com/resources/pdf/Ingersoll_CAT-007.pdf), [MAXline PDF](https://ssl.ingersoll-imc.com/resources/pdf/Ingersoll_CAT-008-1_MAXline.pdf) (radial chip-thinning factor), [Solid Carbide Milling PDF](http://www.ingersoll-imc.com/en/products/solidcarbide/cat-019-1_solid_carbide_milling.pdf) |
| Iscar (IMC) | iscar.com | [Milling Applications & Cutter Basics PDF](https://www.iscar.com/Catalogs/Publication/english_1/Milling_Applications_and_Cutter_Basics_Guide/Milling_Applications_and_Cutter_Basics_Guide.pdf), [Shoulder Milling Practical Guide](https://www.iscar.com/Catalogs/publication-2023/germany-7/ISCAR_Practical_Guide_Shoulder_Milling_EN/ISCAR_Practical_Guide_Shoulder_Milling_EN.pdf), [ITA calculators](https://www.iscar.com/ITC/Calculators.aspx?units=M) |
| Mitsubishi Materials | mmc-carbide.com | [Catalog download](https://www.mmc-carbide.com/us/download/catalog), [Face Milling technical](https://www.mmc-carbide.com/us/technical_information/tec_rotating_tools/face_mills) (WSX445/ASX445/AHX/VOX400/APX/AXD/AJX), [run-out setup 5-10μm](https://www.mmc-carbide.com/in/technical_information/tec_rotating_tools/face_mills/guide/tec_milling_setting_fixture), [ISO 13399 portal](https://www.mmc-carbide.com/us/technical_information/iso/platformer) |
| Seco Tools | secotools.com | [Catalog hub](https://www.secotools.com/catalog), [Machining Navigator Milling](https://www.secotools.com/article/machining_navigator___product_catalog_milling?language=en), [Milling Reference Guide](https://www.secotools.com/article/123183?language=en), [Milling 2021.2 PDF](https://www.secotools.com/article/119891) |
| Sumitomo Electric | sumitool.com | [N Technical Guidance PDF](https://www.sumitool.com/en/downloads/cutting-tools/general-catalog/assets/pdf/n2.pdf) (WGX WaveMill, DGC DualMill, ANX PCD) |
| PTSolutions (PTS-Tools) | pts-tools.com | Distributor portal — **no public PDF library surface-discoverable**; operator login required |

**Source-attribution rule** (foxtrot-soul): every URL records vendor + evidence_level; tips stay draft until ≥2-vendor corroboration. The `operationTopicCoverage` block in the JSON manifest answers "for this milling sub-domain, which vendors cover it?" — used by the wizard for cross-vendor consensus checks.

**Corroboration candidates already visible** (≥2-vendor agreement, eligible for playbook promotion after extraction):
- "Down-milling preferred for tool life" — Sandvik + Mitsubishi
- "Face mill diameter = 60-70% of width of cut" — Sandvik + DAPRA
- "Radial chip thinning required when ae < 50% D" — Ingersoll MAXline + DAPRA formulas
- "Run-out target ≤10μm general / ≤5μm finishing" — Mitsubishi (single source — stays draft until 2nd vendor cited)

## Next ingest actions (P1 follow-ups)

1. **`/pdf-learn` extraction pass** against each Tier-A PDF to produce structured tribal tips with page citations. Output: `mcp-server/src/data/tribal-tips/milling-<source-id>-extracted.ts`.
2. **Promote with corroboration**: any tip appearing in ≥2 Tier-A PDFs graduates from draft to playbook rule.
3. **Conflict surfacing**: if Haas + Hurco disagree on a procedure (e.g. cutter-comp lead-in length), surface the conflict; do NOT average.
4. **HTML companion**: render `milling-pdf-corpus.json` as a tabular dashboard at `state/shared/dashboards/milling-pdf-corpus.html` for operator review.

## Cross-references

- [[mill-studio~3]] — wizard skill that consumes this corpus
- [[feedback_psn_definition]] — PSN 11-leg taxonomy (Tribal = PSN leg #5)
- [[bridge-wiring-u-bridge-wire-tribal]] — sibling tribal wiring effort
- Course: `course-4-milling-operations` (12 modules, ~10hr — lima's academy track)

---
_Generated by slot=foxtrot, session=claude-ef40a9d1, /loop iter4 — 2026-05-26. Honors foxtrot-soul refuse-list: source attribution mandatory, no anonymous tips, no severity averaging._
