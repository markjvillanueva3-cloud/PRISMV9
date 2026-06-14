---
name: pdf-corpus_synthesis
description: "[auto-synth · verify] Compounding synthesis of the pdf-corpus domain — recurring patterns, decisions, open threads distilled from 20 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: pdf-corpus
  synthesizedFrom: 20
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:49:14.370Z
  sourceHash: 291941d852ec
  advisoryOnly: true
  mustHumanVerify: true
---

# pdf-corpus — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 20 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Page‑by‑page PDF ingestion dominates** – Lima’s `pypdf` extractor consistently yields ~76× more page‑level entries than the heading‑anchor method, becoming the de‑facto ingest pipeline for all tribal‑knowledge builds. [3][13]  
- **Four‑section “MEMORY.md” brain template** is repeatedly cloned and populated across every galaxy, providing a uniform connective structure (UP, DOWN, LEFT, RIGHT axes). [17][8][18]  
- **Auto‑distillation after each ship** – every high‑ROI wiki/tribal module (U‑WIKI‑OPORDER‑DATUMS, U‑WIKI‑MATH‑… etc.) is immediately distilled into a concise learning record for reuse. [9][11][12]  
- **External free‑source corpus indexing** supplies on‑demand authoritative data; each galaxy points to the same tiered source list rather than embedding static copies. [5]  
- **Recall enrichment (A3)** – brains index only substantive body text, skipping boilerplate headers, which lifts previously hidden knowledge during semantic recall. [20]  

## Key decisions & rules
| Decision / Rule | Source |
|-----------------|--------|
| Adopt Lima’s `pypdf` page‑by‑page extractor as the **canonical PDF→tribal‑knowledge pipeline**; discontinue `pdf-parse-extract.mjs`. | [3], [13] |
| Enforce the **four‑axis MASTER‑BRAIN template** for every galaxy’s `MEMORY.md`; a brain is “connected” only when all axes are present. | [17] |
| Populate **all 34 galaxies’ MEMORY.md** to the canonical four‑section structure; reviewers must verify no missing paths or inflated corpora. | [8], [18] |
| Apply **A3‑enrichment**: index domain body text (headings, heuristics, rules) rather than boilerplate headers for hybrid recall. | [20] |
| Use the **U‑TDP10 quintet patterns** as baseline accuracy checks for deterministic PDF print‑reader pipelines. | [7] |
| Feed per‑galaxy synthesis brains into a **LoRA training dataset** (512 Alpaca pairs) to improve cross‑galaxy knowledge transfer. | [14] |
| Pull fresh domain data from the **free/legal external corpus index** (315 pointers across 14 galaxies) on demand. | [5] |
| Harvest MIT‑OCW content **on‑demand**, not via pre‑extracted files; ensure the correct extraction path is used. | [19] |

## Open threads
- **Scaling Lima extraction**: How to efficiently process corpora far larger than the 80‑PDF benchmark while preserving the 76× page‑level gain?  
- **Sparse memory handling** in `GALAXY-CONTEXT-FILL` (U‑GALAXY‑SPARSE‑MEMORIES) – need clearer guidelines for slot allocation and integration. [2]  
- **Maintaining external source freshness**: Automated monitoring of the 315 free‑source pointers to detect dead links or updated licensing.  
- **Consistency checks for future galaxies**: As new galaxies are added, ensuring they inherit the four‑section template and A3 enrichment without manual oversight.  
- **Conflict resolution between U‑TDP10 patterns and newer pipelines** (e.g., LoRA‑enhanced recall) – determine precedence or merging strategy.
