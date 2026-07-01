---
name: reference-pdf-extract-meh-heat-transfer-2026_05_25
description: india iter34 — 10 heat-transfer-foundation tips from Mech Eng Handbook Ch 7 (Morega). Feeds CuttingTemperatureEngine + ThermalWearCouplingEngine + CryogenicCuttingEngine + ThermalExpansionEngine.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.726Z
aliases: reference_pdf_extract_meh_heat_transfer_2026_05_25
---


iter34 (slot:india, 2026-05-25) extracted 10 heat-transfer tips from Chapter 7 of Mechanical Engineer's Handbook (Marghitu ed., 2001) — author Alexandru Morega.

**Source**: same PDF as iter30 (`MECHANICAL ENGINEERS HANDBOOK BY BAN B. MANRGHITU.pdf` 18MB), different chapter.

**Output**: `state/shared/extracted-pdfs/mech-eng-handbook-heat-transfer-tips.jsonl` (10 tips). Wiki coverage: cross-references iter30's [[reference_pdf_extract_meh_vibration_2026_05_25]] sister entry; new chapter content appears in `ghost.extracted_pdf_tips.mechanical-engineers-handbook` pivot auto-extended by the iter28 generator.

**The 10 tips** — fundamentals of conduction / convection / radiation that PRISM's thermal engines should build on:

1. meh-101: 3 mechanisms (conduction/convection/radiation) — CNC cutting involves ALL three
2. meh-102: Fourier's law q'' = -k dT/dx (canonical conduction equation)
3. meh-103: Thermal resistance R = ΔT/Q with conduction/convection/radiation forms — electrical-circuit analog
4. meh-104: Contact thermal resistance at EVERY mechanical interface — microcavities dominate
5. meh-105: Temperature is a PROPERTY; heat + work + mass transfer are NOT properties (path-dependent)
6. meh-106: 1st law of thermodynamics dQ - dW = dE — most cutting energy → HEAT not chip-removal work
7. meh-107: k is T-dependent + P-dependent — use harmonic mean across hot/cold for steep gradients
8. meh-108: Radiation works in ANY medium (not just vacuum); T^4 dependence dominates at high temps
9. meh-109: Fins / extended surfaces — Biot number selects lumped vs distributed model
10. meh-110: Unsteady conduction timescale τ = ρ·c_p·Lc²/k; interrupted cuts NEVER reach steady state

**Bridge engines fed** (NEW surfaces vs iter30 vibration tips):
- `engine.CuttingTemperatureEngine` (10 tips — all 10 feed this)
- `engine.ThermalWearCouplingEngine` (8)
- `engine.ThermalExpansionEngine` (3 — new bridge)
- `engine.CryogenicCuttingEngine` (3 — new bridge)
- `engine.MaterialRegistryEngine` (1 — for the k(T) table doctrine)
- `engine.ThermalSensorEngine`, `engine.TelemetryEngine` (1 each — for the temperature-is-a-property rule)

**Cumulative state across iter27-34**: 5 chapters across 4 books, 53 page-cited tips, 6 PSN legs synergized, 2 consumer APIs (in-process engine method + subprocess CLI), `/system-viz` roost auto-grows on each extraction.

**Cross-refs**: [[reference_pdf_extract_meh_vibration_2026_05_25]] (iter30 sister chapter from same book) · [[reference_pdf_extract_solidworks_tolerance_2026_05_25]] (iter33).
