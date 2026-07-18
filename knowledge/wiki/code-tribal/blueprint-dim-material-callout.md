---
title: Blueprint pattern — material_callout
slug: blueprint-dim-material-callout
kind: code-tribal
status: shipped
date: 2026-05-21
milestone: PRINT-OCR-100PCT-MS0
unit: U4
generated: true
---

# Reading `material_callout` regions on blueprints

Observed in the corpus: **0 regions** across all customer families.

## Extraction guidance

Often a title-block field; can ALSO appear as a flag-note. Cross-reference `prism_data:material_get`.

## RAG hooks

When extracting a `material_callout` region, the RAG retrieval should pull from:

- `corpus` (similar prints by family + class)
- `tribal` (operator-confirmed historical reads)
- `similar_print` (nearest-neighbour by dimensional signature)

Hard rule from `BlueprintExtractionRAGEngine`: `sources.length > 0`
**OR** `confidenceFloor !== "normal"`. A `material_callout` extraction with
zero sources MUST drop to one of the `low_*` floors.

## Cross-references

- [[blueprint-extraction-rag]] — the engine
- [[print-reading-fastener-family]] — customer-family lesson
- [[cad_select_gdt]] — GD&T symbol catalog (for gdt_* dimTypes)

## See also

- `mcp-server/src/engines/BlueprintExtractionRAGEngine.ts` lines 38-50 — dim-type enum
- `mcp-server/data/state/print-reading-tribal-tips.jsonl` — auto-generated tips
