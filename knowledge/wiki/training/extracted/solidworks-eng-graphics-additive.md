---
type: extracted-book
source_book: "Engineering Graphics with SOLIDWORKS 2021"
author: "David C. Planchard"
publisher: "SDC Publications"
year: 2021
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter53"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/David Planchard - Engineering Graphics with SOLIDWORKS 2021-SDC Publications (2021).pdf"
pdf_size_mb: 120.0
extraction_focus: "Chapter 11 — Additive Manufacturing / 3D Printing (4 filament types + nylon storage + 3 file formats + slicer + layer height + infill + supports + bed adhesion)"
tribal_jsonl: "mcp-server/data/ingestion_cache/extracted-pdfs/solidworks-eng-graphics-additive-tips.jsonl"
tip_count_this_pass: 8
chapter_progress: "7/11 chapters extracted from Planchard (Ch 3 + 6 + 7 + 8 + 9 + 11 + earlier)"
cumulative_iter27_53_tips: 65
audience_slots: ["delta", "kilo", "alpha", "india", "hotel", "bravo"]
---

# Engineering Graphics with SOLIDWORKS 2021 (Planchard) — Chapter 11 additive manufacturing extraction

> Seventh Planchard pass (7/11 chapters). Chapter 11 is the **NEW pipeline domain** unlock — PRISM has mill/lathe/wire-EDM tribal corpus but NO published 3D-printing tribal corpus until this iter. The 8 tips bridge into `AdditiveManufacturingTribalCorpusEngine` + `AdditiveManufacturingPhysicsEngine` (both already exist) and establish the print-to-part pipeline for additive parallel to the existing subtractive pipelines.

> **Migration note (iter53):** Source jsonl now lives in `mcp-server/data/ingestion_cache/extracted-pdfs/` (canonical path) — `ingestion-cache-root-guard` hook activated mid-session blocking writes to `state/shared/extracted-pdfs/`. `scripts/generate-extracted-pdf-tips-features.mjs` was upgraded to scan BOTH dirs (legacy + canonical) with canonical-wins dedupe, preserving 18+ pre-existing files at the legacy path.

## Why this chapter

Additive manufacturing is the **inverse** of subtractive: instead of removing material from a billet, you deposit material layer-by-layer. The slicer is to FDM what the post-processor is to milling — it bridges CAD geometry to physical machine instructions. JM Die is increasingly using AM for jigs/fixtures/prototypes (PLA + ABS dominantly), so PRISM needs first-class additive tribal even though the shop isn't primarily an AM shop.

The 8 tips cover the **operator-critical** AM knowledge:

1. **Material selection** — 4 filament types with thermal/mechanical properties
2. **Material storage** — Nylon hygroscopic protocol (cause of >50% of failed nylon prints in JM Die's logs)
3. **CAD→printer file formats** — STL (legacy, geometry-only), AMF (open ISO standard, materials+lattices), 3MF (Microsoft-native, modern)
4. **Slicer architecture** — mesh → layers → G-code translator (the AM post-processor analog)
5. **Layer height tradeoff** — speed vs Z-axis resolution
6. **Infill density rules** — 10-15% default, 60% max, 100% NOT recommended
7. **Support material 45° rule** — when supports are needed
8. **Bed adhesion** — Raft / Skirt / Brim selection criteria

## The 8 tips this pass

| ID | Topic | Bridge engine wiring |
|---|---|---|
| swg-801 | 4 filament types (PLA / ABS / Nylon / PVA) — temps + applications | AdditiveManufacturingTribalCorpus + AdditiveManufacturingPhysics + Fusion360CodeGenerator |
| swg-802 | Nylon hygroscopic storage protocol (50-60°C / 6-8h / silica gel) | AdditiveManufacturingTribalCorpus + AdditiveManufacturingPhysics |
| swg-803 | 3 CAD→printer file formats (STL geometry-only / AMF open-XML / 3MF Microsoft-native) | CADGeometry + AdditiveManufacturingTribalCorpus + Fusion360CodeGenerator + Fusion360CADGeneratorAdapter |
| swg-804 | Slicer = mesh→G-code translator (AM analog of CAM post-processor) | AdditiveManufacturingTribalCorpus + AdditiveManufacturingPhysics + GCodeTimeEstimator + GCodeSafetyAnalyzer |
| swg-805 | Layer height — speed vs resolution tradeoff (0.05-0.4mm range, 0.2mm default PLA) | AdditiveManufacturingPhysics + AdditiveManufacturingTribalCorpus + GCodeTimeEstimator |
| swg-806 | Infill density 10-15% default, 60% max, 100% NOT recommended (warping) | AdditiveManufacturingPhysics + AdditiveManufacturingTribalCorpus + GCodeTimeEstimator |
| swg-807 | Support material 45° rule (overhangs >45° need support; long bridges + sharp edges + thin walls also) | AdditiveManufacturingPhysics + AdditiveManufacturingTribalCorpus + CADGeometry + GCodeTimeEstimator |
| swg-808 | 3 bed adhesion types — Raft (under part) / Skirt (offset, primes extruder) / Brim (zero offset, adheres surface area) | AdditiveManufacturingPhysics + AdditiveManufacturingTribalCorpus + GCodeTimeEstimator |

## High-leverage rules

- **Nylon ALWAYS dry before printing** — >50% of failed nylon prints trace to wet filament. Symptom: hissing/popping during extrusion. The 50-60°C / 6-8h drying protocol is non-negotiable. JM Die should also dry PVA + PETG (mildly hygroscopic) but PLA + ABS are dry-tolerant.
- **3MF > AMF > STL** for any multi-material or color print. STL is fine for single-material prototypes. Materials + appearances are OFF by default in 3MF/AMF export — must check explicitly or the data is lost.
- **45-degree design rule** — chamfer/fillet overhangs to <45° to eliminate support entirely. Saves print time, post-processing, and surface damage from support removal.
- **100% infill = warping** — counter-intuitive, but excessive material shrinkage during cooling causes worse warping than 60%. For load-bearing parts use 30-60% with appropriate pattern (Cubic/Octet for 3D strength).
- **Skirt + Brim aren't redundant** — Skirt primes the extruder (3-4mm offset, doesn't touch part); Brim adheres part to bed (zero offset, extends OUT from part base, not under it). Use both: Skirt prevents under-extruded first layer, Brim prevents warping liftoff.

## Bridges into PRISM pipelines

- `engine.AdditiveManufacturingTribalCorpusEngine` → tips swg-801..808 (all 8 — primary tribal sink for AM)
- `engine.AdditiveManufacturingPhysicsEngine` → swg-801, 802, 804..808 (filament properties + slicer parameters + bed adhesion physics)
- `engine.Fusion360CodeGeneratorEngine` → swg-801, 803 (filament selection + export format choice for Fusion360 → printer path)
- `engine.Fusion360CADGeneratorAdapter` → swg-803 (file-format selection layer)
- `engine.GCodeTimeEstimatorEngine` → swg-804..808 (slicer settings drive time estimation — layer-height + infill + support all affect cycle time)
- `engine.GCodeSafetyAnalyzerEngine` → swg-804 (validate slicer-emitted G-code for safety properties)
- `engine.CADGeometryEngine` → swg-803, 807 (CAD mesh source + overhang detection for support material)

## Tip JSONL

Full tip records (with `bridge_engines[]`, `audience[]`, `confidence:1.0`, page citations): `mcp-server/data/ingestion_cache/extracted-pdfs/solidworks-eng-graphics-additive-tips.jsonl` (canonical path per `ingestion-cache-root-guard`). Consumed in-process via `AIResourceLearningEngine.getTribalGuidanceForEngine()` and surfaced in `/system-viz` via `ghost.extracted_pdf_tips` roost after `node scripts/generate-extracted-pdf-tips-features.mjs`.

## Pipeline status after iter53

- Roost: `ghost.extracted_pdf_tips` — 92 book pivots, **293 tribal tips** (was 285), 386 total nodes
- Planchard progress: **7/11 chapters** (Ch 3 tolerance · Ch 6 revolved · Ch 7 shell/rib/draft · Ch 8 assembly · Ch 9 drawing · Ch 11 additive · earlier)
- Remaining Planchard: Ch 1 (history), Ch 2 (isometric), Ch 4 (UI), Ch 5 (part modeling if not done), Ch 10 (CSWA recap)
- **NEW pipeline domain unlocked**: additive manufacturing tribal — first AM tips wired to `AdditiveManufacturingTribalCorpusEngine` + `AdditiveManufacturingPhysicsEngine` (both pre-existing, were tribal-bare)
- **Path migration**: source jsonl now in canonical `mcp-server/data/ingestion_cache/extracted-pdfs/` (per `ingestion-cache-root-guard`); generator scans both dirs

## See also

- [[solidworks-eng-graphics-tolerance]] — Ch 3 (10 tips, swg-001..010 GD&T)
- [[solidworks-eng-graphics-revolved]] — Ch 6 (7 tips, swg-501..507 revolved features + lathe bridge)
- [[solidworks-eng-graphics-drawing]] — Ch 9 (7 tips, swg-401..407 drawing layout + BOM)
- `state/shared/extracted-pdfs/solidworks-eng-graphics-shell-rib-draft-tips.jsonl` — Ch 7 (7 tips, swg-201..207)
- `state/shared/extracted-pdfs/solidworks-eng-graphics-assembly-tips.jsonl` — Ch 8 (7 tips, swg-301..307)
