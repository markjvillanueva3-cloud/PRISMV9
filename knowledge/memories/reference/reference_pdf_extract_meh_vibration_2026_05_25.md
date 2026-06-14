---
name: reference-pdf-extract-meh-vibration-2026_05_25
description: "india iter30 — 10 vibration-theory tips extracted from Mechanical Engineer's Handbook (Marghitu ed., 2001, Academic Press). Feeds ChatterStabilityLobeEngine + RegenerativeChatterEngine theoretical bones."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.266Z
aliases: reference_pdf_extract_meh_vibration_2026_05_25
---


iter30 (slot:india, 2026-05-25) extracted 10 vibration-theory tips from a totally different book class — academic graduate reference, not shop-floor manual.

**Source**: `H:/PRISM/resources/RESOURCE PDFS/MECHANICAL ENGINEERS HANDBOOK BY BAN B. MANRGHITU.pdf` (18 MB, ©2001 Academic Press, ISBN 0-12-471370-X, edited by Dan B. Marghitu / Auburn ME).

**Target**: Chapter 6 "Theory of Vibration" by Marghitu/Raju/Mazilu — the canonical academic treatment of machine-tool vibration that justifies PRISM's chatter engines numerically.

**Output**: `state/shared/extracted-pdfs/mech-eng-handbook-vibration-tips.jsonl` (10 tips) + `knowledge/wiki/training/extracted/mech-eng-handbook-vibration.md` (wiki with bridge-engine matrix).

**The 3 tips that should change PRISM behavior** (called out in wiki entry):

1. **meh-007 — Qualitative-before-quantitative**: `SafetyEngine` `S(x)` should be a tuple `(is_stable: bool, magnitude: float)` not a continuous scalar. Unstable mode → instant FAIL regardless of magnitude.

2. **meh-006 — ES↔CPS feedback as chatter root cause**: `RegenerativeChatterEngine` should be modeled as a closed-loop transfer function with gain margin + phase margin (Bode sense), not as a static stability check.

3. **meh-010 — Critical speed bounds RPM**: `BoringBarDeflectionEngine` + `UltimateSpeedFeedEngine` should JOINTLY enforce `RPM_max = min(spindle_max, 0.85 × critical_speed)`. The 0.85 factor is the standard margin for unbalanced rotating components.

**Bridge engines fed** (theory foundations for):
- `engine.ChatterStabilityLobeEngine` (8 tips)
- `engine.RegenerativeChatterEngine` (6 tips)
- `engine.MachineDynamicsEngine` (7 tips)
- `engine.DampingOptimizationEngine` (1 tip)
- `engine.BoringBarDeflectionEngine` (1 tip)
- `engine.SafetyEngine` (2 tips — including the qualitative-gate rule)

**Pending from same book**: Ch 1 Statics (fixture forces), Ch 3 Mechanics of Materials (PartDeflectionEngine), Ch 7 Heat Transfer (CuttingTemperatureEngine), Ch 9 Control (AI closed-loop adjustment).

**Cross-refs**: [[reference_pdf_extract_fundamentals_cnc_2026_05_25]] (iter27) · [[reference_pdf_extract_foc2014_workholding_2026_05_25]] (iter29) · [[feedback_verify_actual_contract_not_proxy]].

**Synergy note**: with iter31 (this commit's companion), the consumer pipeline `scripts/query-extracted-tips.mjs` proves engines can actually consume these tips by engine-name + audience filter — closes the "named bridge_engines but no operational validation" gap the Stop hook flagged.
