---
title: Blueprint pattern — diameter
slug: blueprint-dim-diameter
kind: code-tribal
status: shipped
date: 2026-05-21
milestone: PRINT-OCR-100PCT-MS0
unit: U4
generated: true
---

# Reading `diameter` regions on blueprints

Observed in the corpus: **0 regions** across all customer families.

## Extraction guidance

`Ø` or `DIA` prefix. Limit-pair common. Cross-check with the section view to confirm cylinder direction.

## RAG hooks

When extracting a `diameter` region, the RAG retrieval should pull from:

- `corpus` (similar prints by family + class)
- `tribal` (operator-confirmed historical reads)
- `similar_print` (nearest-neighbour by dimensional signature)

Hard rule from `BlueprintExtractionRAGEngine`: `sources.length > 0`
**OR** `confidenceFloor !== "normal"`. A `diameter` extraction with
zero sources MUST drop to one of the `low_*` floors.

## Cross-references

- [[blueprint-extraction-rag]] — the engine
- [[print-reading-fastener-family]] — customer-family lesson
- [[cad_select_gdt]] — GD&T symbol catalog (for gdt_* dimTypes)

## See also

- `mcp-server/src/engines/BlueprintExtractionRAGEngine.ts` lines 38-50 — dim-type enum
- `mcp-server/data/state/print-reading-tribal-tips.jsonl` — auto-generated tips
