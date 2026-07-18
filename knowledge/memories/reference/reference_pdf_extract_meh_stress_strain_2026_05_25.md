---
name: reference-pdf-extract-meh-stress-strain-2026_05_25
description: india iter35 — 10 stress/strain/fatigue tips from Mech Eng Handbook Ch 3 (Marghitu). Feeds ToolDeflectionEngine + PartDeflectionEngine + BoringBarDeflectionEngine + FatigueLifeEngine + SafetyEngine.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.726Z
aliases: reference_pdf_extract_meh_stress_strain_2026_05_25
---


iter35 (slot:india, 2026-05-25) extracted 10 stress/strain/fatigue foundation tips from Chapter 3 of Mech Eng Handbook.

**Output**: `state/shared/extracted-pdfs/mech-eng-handbook-stress-strain-tips.jsonl` (10 tips). Roost auto-grows via iter28 generator.

**The 10 tips** — canonical engineering-mechanics formulas PRISM's deflection + fatigue engines build on:

- meh-201: Hooke's law σ=Eε, τ=Gγ (linear elastic range only)
- meh-202: Axial deformation δ = FL/(AE)
- meh-203: Poisson's ratio ν — lateral expansion under axial compression (over-clamping risk)
- meh-204: E = 2G(1+ν) — 3 constants, only 2 independent
- meh-205: Mohr's circle for principal stress + max shear
- meh-206: Bending stress σ = Mc/I (canonical flexure)
- meh-207: Torsion τ = Tr/J (drill/tap/spindle shanks)
- meh-208: Hertzian contact stress for dowel pins / ball bearings / shoulder bolts
- meh-209: Endurance limit for steel = ~0.5σ_ult (infinite life); non-ferrous NO endurance limit
- meh-210: Fluctuating stress + Goodman criterion (mean+alternating combo)

**Bridge engines fed** (high overlap with iter30 vibration tips + iter34 heat tips):
- engine.ToolDeflectionEngine (7), PartDeflectionEngine (5), BoringBarDeflectionEngine (4)
- engine.FormulaExtractorEngine (4 canonical formulas)
- engine.MaterialRegistryEngine (5), SafetyEngine (5)
- NEW: engine.FatigueLifeEngine (2 tips — meh-209, meh-210)

**Cumulative state across iter27-35**: 6 chapters extracted from 4 books, 63 page-cited tribal tips, 6 PSN legs synergized.

**Cross-refs**: [[reference_pdf_extract_meh_vibration_2026_05_25]] (iter30 Ch 6) · [[reference_pdf_extract_meh_heat_transfer_2026_05_25]] (iter34 Ch 7) · [[reference_pdf_extract_solidworks_tolerance_2026_05_25]] (iter33).
