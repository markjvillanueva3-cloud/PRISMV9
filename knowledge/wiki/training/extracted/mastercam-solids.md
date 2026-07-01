---
type: extracted-book
source_book: "Getting Started with Mastercam Solids (X8 Tutorial)"
author: "CNC Software, Inc."
year: 2014
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter63"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/Getting Started with Mastercam Solids.pdf"
extraction_focus: "Mastercam X8 Solids — history-based vs brick solids, history tree edit/move/delete/suppress, Extrude+Chaining, Model Prep Push-Pull, Draft+Fillet order, Boolean, Revolve+Sweep, Shell+Chamfer order"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/mastercam-solids-tips.jsonl"
tip_count_this_pass: 8
new_book_added: true
cumulative_iter27_63_tips: 145
audience_slots: ["delta", "kilo", "alpha", "hotel", "india", "bravo"]
---

# Getting Started with Mastercam Solids (CNC Software 2014) — extraction

> Fifteenth pass overall (iter63). Rounds out Mastercam coverage from CAM-only (iter60 Dynamic Milling) to CAD+CAM. Adds the **history-tree + brick-solids** paradigm that's specific to integrated CAM-CAD environments (vs SOLIDWORKS' history-only model in swg-904). Model Prep (Push-Pull on brick imports) is the productivity multiplier for job-shop work with customer STEP/IGES files.

## Why this book

Mastercam Solids fills the gap between "CAM only" (iter60) and "operator-side CAD" (Planchard chapters). The 8 tips cover:

- **History-based vs brick solid paradigm** — most customer parts are brick (imported); Model Prep enables direct edit without re-derive
- **Solids history tree** — analog of SOLIDWORKS FeatureManager (swg-904) with edit/move/delete/suppress semantics
- **Chaining-based Extrude** — Mastercam's signature pick-the-profile workflow
- **Model Prep Push-Pull** — direct-edit toolkit for brick solids (industry-changing productivity win for job shops)
- **Draft + Fillet order rule** — same swg-201 Shell-feature-order pattern, applied to Mastercam tutorial sequence
- **Boolean operations** — Add/Remove/Common (the set-operation primitives every solid modeler uses)
- **Revolve + Sweep** — paths to non-prismatic solids (Revolve bridges to lathe per swg-501)
- **Shell + Chamfer order** — extension of swg-201 Shell rule to chamfer placement timing

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| ms14-001 | History-based vs brick solids — Model Prep bridges the no-history gap | CADGeometry + CADValidation + CADFeatureRecognize + CADFromBlueprint + AgiCadGenerate |
| ms14-002 | Mastercam Extrude with Chaining workflow + Reverse All + Tab-to-preview | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate |
| ms14-003 | Solids history tree 4 ops (edit / move / delete / suppress) + dynamic preview | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate |
| ms14-004 | Model Prep Push-Pull / Move / Split Face / etc — direct-edit on brick imports | CADGeometry + CADValidation + CADFeatureRecognize + CADFromBlueprint + AgiCadGenerate + JMDieCustomer |
| ms14-005 | Draft + Fillet order rule (draft first → outside fillets → top fillets) | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate + InjectionMoldQuote |
| ms14-006 | Boolean Add / Remove / Common — when to use vs Hole Wizard or Extruded Cut | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate |
| ms14-007 | Revolve (axisymmetric, lathe bridge) + Sweep (path-driven, thread/spline) | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate + LatheCorePhysics + Thread |
| ms14-008 | Shell + Chamfer order (chamfer AFTER shell to preserve full thickness) | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate |

## High-leverage rules

- **Brick is common, history is rare for customer parts:** Most customer STEPs are brick. Master Model Prep tools = productivity multiplier.
- **Model Prep Push-Pull replaces customer-roundtrip:** "Customer model says 5.00mm but fit needs 5.05mm" → Push-Pull, no email back to customer.
- **Draft FIRST in feature order:** Per swg-201 + ms14-005 — fillets applied before draft get drafted away. Draft → outside fillet → top fillet → shell → chamfer.
- **Chaining > individual edge select:** For long profile chains Mastercam's chaining is significantly faster than per-edge picks.
- **Revolve = lathe bridge:** Per swg-501 — Mastercam Revolve preserves the 4-input recipe (plane + profile + axis + angle) that maps to lathe G-code geometry.

## Bridges into PRISM pipelines

- `engine.CADGeometryEngine` → all 8 tips
- `engine.CADValidationEngine` → all 8
- `engine.CADFeatureRecognizeEngine` → all 8 (feature identification works on both history + brick)
- `engine.CADFromBlueprintEngine` → ms14-001, 004 (brick-import path)
- `engine.AgiCadGenerateEngine` → all 8 (AI CAD generation works in both Mastercam + SOLIDWORKS paradigms)
- `engine.JMDieCustomerEngine` → ms14-004 (customer-STEP-to-job-shop workflow)
- `engine.InjectionMoldQuoteEngine` → ms14-005 (draft for mold parts)
- `engine.LatheCorePhysicsEngine` → ms14-007 (revolve → lathe geometry)
- `engine.ThreadEngine` → ms14-007 (sweep-along-helix = thread)

## Pipeline status after iter63

- Roost: 96 book pivots, **373 tribal tips** (was 365), 470 total nodes
- NEW BOOK: 101 → 102 books
- Cumulative iter27-63: **145 page-cited tips**

## See also

- [[mastercam-dynamic-milling]] — Mastercam CAM side (8 tips, dm14-001..008)
- [[solidworks-eng-graphics-part-modeling-deep]] — SOLIDWORKS Ch 5 (8 tips, swg-901..908 — same chapter-equivalent for SOLIDWORKS)
- [[solidworks-eng-graphics-revolved]] — SOLIDWORKS Ch 6 (7 tips, swg-501..507 — Revolve cross-ref)
- [[hypermill-2018]] — hyperMILL (8 tips, hm18-001..008)
