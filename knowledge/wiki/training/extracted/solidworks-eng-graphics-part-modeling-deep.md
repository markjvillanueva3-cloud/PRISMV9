---
type: extracted-book
source_book: "Engineering Graphics with SOLIDWORKS 2021"
author: "David C. Planchard"
publisher: "SDC Publications"
year: 2021
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter58"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf"
pdf_size_mb: 120.0
extraction_focus: "Chapter 5 — Introduction to SOLIDWORKS Part Modeling (Part Templates + System vs Document Properties + 4 unit systems + 3 sketch states + 7 core sketch tools + Fillet + Offset Entities + Extruded Boss/Cut)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/solidworks-eng-graphics-part-modeling-deep-tips.jsonl"
tip_count_this_pass: 8
chapter_progress: "8/11 Planchard chapters (Ch 3 + 5 + 6 + 7 + 8 + 9 + 11 + earlier)"
cumulative_iter27_58_tips: 105
audience_slots: ["delta", "kilo", "alpha", "hotel", "india"]
collision_note: "Peer iter shipped swg-101..107 earlier (different topic breakdown). This pass uses swg-901..908 to avoid ID collision; tips complement (not replace) the peer-shipped set with deeper enumerations + JM Die conventions."
---

# Engineering Graphics with SOLIDWORKS 2021 (Planchard) — Chapter 5 part-modeling extraction

> Eighth Planchard pass (iter58 — pivot back to Planchard after 4 consecutive Autodesk lessons). Chapter 5 is the **part-modeling foundations** — covers everything from Templates → Document Properties → 7 core sketch tools → 3 sketch states → Fillet + Offset Entities + Extruded Boss/Cut. Complements peer-shipped swg-101..107 which covered the same chapter with different topic breakdown (this pass uses swg-901..908 to avoid ID collision per the dedup-checked discovery in iter58).

## Why this chapter

Chapter 5 is the **gateway chapter** to SOLIDWORKS part modeling — without these fundamentals, nothing else in the Planchard book makes sense. The 8 tips formalize:

- **Templates** as the foundation (PART-IN-ANSI + PART-MM-ISO, the JM Die two-template convention)
- **System Options vs Document Properties** scope (registry-scoped vs document-scoped — the #1 source of "my settings are right but new docs come out wrong")
- **4 unit systems** with industry-convention mapping (IPS=US, MMGS=EU/Asia)
- **3 sketch states** (Under-defined BLUE / Fully-defined BLACK / Over-defined RED) with diagnostic procedure
- **7 core sketch tools** that cover 90% of part-modeling sketch work
- **Fillet feature** taxonomy (Manual vs FilletXpert; Constant vs Variable vs Face; Symmetric vs Asymmetric; Conic option)
- **Offset Entities** parametric extraction
- **Extruded Boss/Cut** 3-input recipe + Instant3D-vs-PropertyManager tradeoff

These tips power AgiCadGenerateEngine (AI CAD generation needs the recipe), CADFromBlueprintEngine (reverse path), and JM Die's per-customer-template convention (Hotel slot's domain).

## The 8 tips this pass (deliberately swg-901..908 to avoid peer ID collision)

| ID | Topic | Bridge engine wiring |
|---|---|---|
| swg-901 | Part Template foundation — drafting standard + units + decimal + JM Die two-template convention | CADGeometry + CADValidation + CADFromBlueprint + AgiCadGenerate + JMDieCustomer |
| swg-902 | System Options (registry, PC-scoped) vs Document Properties (in-file, travels) — scope confusion | CADGeometry + CADValidation + JMDieCustomer + AgiCadGenerate |
| swg-903 | 4 unit systems (MKS/CGS/MMGS/IPS) — industry convention + cross-unit round-trip drift warning | CADGeometry + CADValidation + GDT + JMDieCustomer + AgiCadGenerate |
| swg-904 | 3 sketch states (BLUE under / BLACK full / RED over) + diagnostic procedure for fixing | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate |
| swg-905 | 7 core sketch tools (Line/Centerline/Circle/Center-Rect/Smart-Dim/Offset/Mirror) — 90% coverage | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate + CADFromBlueprint |
| swg-906 | Fillet taxonomy (Manual/FilletXpert × Constant/Variable/Face × Symmetric/Asymmetric × Conic) | CADGeometry + CADFeatureRecognize + CADValidation + AgiCadGenerate + InjectionMoldQuote |
| swg-907 | Offset Entities — parametric edge/face extraction; bi-directional + cap-ends + construction-geo options | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate |
| swg-908 | Extruded Boss/Cut 3 inputs (plane + profile + end-condition); 7 end conditions; Instant3D-vs-PropertyManager | CADGeometry + CADValidation + CADFeatureRecognize + CADFromBlueprint + AgiCadGenerate |

## High-leverage rules

- **Templates baseline:** Always work from a PART-IN-ANSI / PART-MM-ISO template, never default. Operator-set settings drift across the shop; templates eliminate the drift class.
- **System vs Document scope:** System Options changes affect NEW docs; existing files keep their embedded Document Properties. Most "settings broken" tickets resolve as this confusion.
- **Unit-system round-trip:** Switching units converts DISPLAY not design intent. 25.4mm displayed in IPS = 1.0000in (rounded). Re-export drift = unscrewable parts.
- **Always ship FULLY-DEFINED:** Blue sketch = bug class. After dimensioning, scan for missing perpendicular / horizontal / vertical relations.
- **Offset Entities > re-sketch:** Parametric link survives parent changes. Re-sketching what you can offset is rebuild-fragile.
- **PropertyManager > Instant3D:** Instant3D auto-picks defaults that may not match design intent. PropertyManager forces explicit choices.

## Bridges into PRISM pipelines

- `engine.CADGeometryEngine` → all 8 tips (the CAD primitive layer)
- `engine.CADValidationEngine` → all 8 (template + property + sketch state validation)
- `engine.CADFeatureRecognizeEngine` → swg-904..908 (sketch state, sketch tools, fillet, offset, extrude recognition)
- `engine.CADFromBlueprintEngine` → swg-901, 903, 905, 908 (reverse path: blueprint → template + units + sketch + extrude recipe)
- `engine.AgiCadGenerateEngine` → all 8 (AI CAD generation needs template + sketch + feature recipes)
- `engine.GDTValidationEngine` → swg-903 (unit-system round-trip impact on GD&T values)
- `engine.JMDieCustomerEngine` → swg-901, 902, 903 (per-customer template + unit + drafting standard mapping — Hotel slot's primary surface)
- `engine.InjectionMoldQuoteEngine` → swg-906 (fillet draft + variable-size for mold parts)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/solidworks-eng-graphics-part-modeling-deep-tips.jsonl` (canonical path). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter58

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **333 tribal tips** (was 325), 426 total nodes
- Planchard progress: **8/11 chapters** (Ch 3 tolerance · Ch 5 part-modeling · Ch 6 revolved · Ch 7 shell/rib/draft · Ch 8 assembly · Ch 9 drawing · Ch 11 additive · earlier)
- Cumulative iter27-58: **105 page-cited tips**
- **DEDUP CHECK BENEFIT**: detected peer-shipped swg-101..107 collision via the regen showing 325→326 (instead of 325→333). Renamed to swg-901..908 to preserve both sets. The dual-dir-scan + canonical-wins dedupe semantics were correct but ID-collision discovery requires manual check (TODO: enhance the regen to emit a warning when a canonical file's IDs overlap with legacy).

## See also

- [[solidworks-eng-graphics-revolved]] — Ch 6 (7 tips, swg-501..507 — revolved features + lathe bridge)
- [[solidworks-eng-graphics-additive]] — Ch 11 (8 tips, swg-801..808 — additive manufacturing)
- [[solidworks-eng-graphics-drawing]] — Ch 9 (7 tips, swg-401..407 — drawing layout)
- [[solidworks-eng-graphics-tolerance]] — Ch 3 (10 tips, swg-001..010 — GD&T)
- Peer-shipped: `state/shared/extracted-pdfs/solidworks-eng-graphics-part-modeling-tips.jsonl` (swg-101..107 — different topic breakdown of same chapter, NOT replaced by iter58)
