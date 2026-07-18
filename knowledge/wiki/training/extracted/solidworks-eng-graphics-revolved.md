---
type: extracted-book
source_book: "Engineering Graphics with SOLIDWORKS 2021"
author: "David C. Planchard"
publisher: "SDC Publications"
year: 2021
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter52"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf"
pdf_size_mb: 120.0
extraction_focus: "Chapter 6 — Revolved Boss/Base Features (4 required inputs, 5 revolved variants, axis-of-revolution sources, relations-before-dimensions rule, Check Sketch validation, Dome, Hole Wizard)"
tribal_jsonl: "state/shared/extracted-pdfs/solidworks-eng-graphics-revolved-tips.jsonl"
tip_count_this_pass: 7
chapter_progress: "6/11 chapters extracted from Planchard (Ch 3 + 6 + 7 + 8 + 9 + earlier)"
cumulative_iter27_52_tips: 57
audience_slots: ["delta", "kilo", "alpha", "bravo", "india"]
---

# Engineering Graphics with SOLIDWORKS 2021 (Planchard) — Chapter 6 revolved-features extraction

> Sixth Planchard pass (6/11 chapters). Chapter 6 is the **highest-leverage remaining chapter** because revolved features are dual-purpose: they're the natural CAD primitive for lathe parts (shafts, bushings, pins, screws — the entire JM Die lathe inventory) AND for many mill parts with cylindrical bosses/fillets. The 4-input Revolve recipe (sketch plane + profile + axis + angle) maps **isomorphically** to lathe G-code geometry (XZ profile + spindle axis + spindle direction).

## Why this chapter

Lathe-side fabrication is impossible without understanding revolved-feature semantics in CAD. A revolved-feature CAD model carries 4 pieces of information that lathe CAM (and `LatheCorePhysicsEngine`) needs verbatim:

1. **Sketch profile** = the lathe tool path's XZ envelope
2. **Axis of revolution** = the spindle axis (Z in standard lathe convention)
3. **Angle of revolution** = full 360° for round parts, partial for cam lobes / scoops
4. **Variant** (Base / Boss / Cut / Thin) = determines roughing vs finishing strategy + whether material is added or removed

The 5-variant set (Base / Boss / Boss Thin / Cut / Thin Cut) maps cleanly to CAM strategies — Revolved Cut → grooving tool, Revolved Thin Cut → narrow grooving, Revolved Boss Thin → thin-wall lathe cylinders that need tailstock support.

## The 7 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| swg-501 | Revolved Base — 4 required inputs (plane + profile + axis + angle) | CADGeometry + CADValidation + CADFromBlueprint + AgiCadGenerate + **LatheCorePhysics** |
| swg-502 | 5 revolved variants — Base / Boss / Boss Thin / Cut / Thin Cut | CADGeometry + CADFeatureRecognize + CADValidation + AgiCadGenerate |
| swg-503 | Axis-of-revolution sources — sketched centerline (PREFERRED) vs edge vs feature axis | CADGeometry + CADValidation + CADFromBlueprint + AgiCadGenerate |
| swg-504 | Relations BEFORE dimensions rule — captures design intent, prevents over-defined sketches | CADGeometry + CADValidation + CADFeatureRecognize + AgiCadGenerate |
| swg-505 | Check Sketch for Feature Usage — validate sketch BEFORE attempting feature | CADGeometry + CADValidation + CADFeatureRecognize + GDT |
| swg-506 | Dome feature — curved cap on a planar face (faster than Revolve/Loft for caps) | CADGeometry + CADFeatureRecognize + AgiCadGenerate |
| swg-507 | Hole Wizard — standardized holes (Counterbore / Countersink / Tap / Pipe Tap) with insertion-context-aware geometry | CADGeometry + Thread + GDT + CADFeatureRecognize + AgiCadGenerate |

## High-leverage rules

- **Revolve-to-lathe isomorphism:** The 4 Revolve inputs are exactly what `LatheCorePhysicsEngine` needs to plan a lathe operation. If a CAD model has a Revolved Base feature, the lathe CAM can extract the XZ profile + spindle axis directly — no manual geometry rebuild required. **This is the bridge between Planchard's CAD curriculum and PRISM's lathe pipeline.**
- **Axis stability ranking:** Sketched centerline > Edge > Feature axis. Edges break when adjacent faces get filleted; centerlines survive. Always prefer the most-stable source even if it costs an extra sketch line.
- **Design-intent rule (swg-504):** Always add geometric relations BEFORE dimensions. An Equal relation between two edges removes the need for two redundant dimensions. Sketches built dimension-first are the #1 source of "why does this break when I change one value?" failures.
- **Validate before feature:** Run Check Sketch for Feature Usage BEFORE clicking the Boss/Base/Cut. Reports closed-contour count, self-intersections, missing axis lines. Cheaper than the 30-sec rollback when the feature errors out.
- **Hole Wizard > sketched-circle-and-cut:** Always prefer Hole Wizard for any hole that takes a standard fastener. Reasons: drives the standard tap-drill chart automatically, generates thread cosmetic for drawings + GD&T, updates if the standard changes (1/4-20 → M6). Sketched-circle-and-Extruded-Cut is for non-standard / arbitrary holes only.

## Bridges into PRISM pipelines

- `engine.CADGeometryEngine` → tips swg-501..507 (all 7 — the CAD primitive layer)
- `engine.CADValidationEngine` → swg-501, swg-503, swg-504, swg-505 (sketch + feature validation)
- `engine.CADFeatureRecognizeEngine` → swg-502, swg-504..507 (recognizing which Revolve variant / Dome / Hole-Wizard feature was used)
- `engine.CADFromBlueprintEngine` → swg-501, swg-503 (reverse path — reading a Revolved feature from a blueprint)
- `engine.AgiCadGenerateEngine` → swg-501..507 (AI-driven CAD generation needs the Revolve recipe + design-intent rule)
- `engine.LatheCorePhysicsEngine` → swg-501 (the 4-input Revolve → lathe XZ profile + spindle axis bridge — **the iter52 unlock**)
- `engine.ThreadEngine` → swg-507 (Hole Wizard tap + pipe-tap features drive thread geometry)
- `engine.GDTValidationEngine` → swg-505, swg-507 (Check Sketch catches GD&T-blocking sketch errors; Hole Wizard generates thread cosmetic for GD&T frames)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `state/shared/extracted-pdfs/solidworks-eng-graphics-revolved-tips.jsonl` (gitignored — consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`).

## Pipeline status after iter52

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **285 tribal tips** (was 278), 378 total nodes
- Planchard progress: **6/11 chapters** (Ch 3 tolerance · Ch 6 revolved · Ch 7 shell/rib/draft · Ch 8 assembly · Ch 9 drawing · earlier)
- Remaining Planchard: Ch 1, Ch 2, Ch 4, Ch 5, Ch 10, Ch 11 (6 chapters — Ch 5 was completed earlier so this should re-check)
- Lathe-pipeline bridge unlocked: `LatheCorePhysicsEngine` now has tribal-tip routing via swg-501 (4-input Revolve → XZ profile + spindle axis isomorphism)

## See also

- [[solidworks-eng-graphics-tolerance]] — Ch 3 (10 tips, swg-001..010 GD&T + tolerance)
- [[solidworks-eng-graphics-drawing]] — Ch 9 (7 tips, swg-401..407 views + dimensions + BOM)
- `state/shared/extracted-pdfs/solidworks-eng-graphics-shell-rib-draft-tips.jsonl` — Ch 7 (7 tips, swg-201..207)
- `state/shared/extracted-pdfs/solidworks-eng-graphics-assembly-tips.jsonl` — Ch 8 (7 tips, swg-301..307)
