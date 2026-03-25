---
name: prism-automotive-production
description: 'Automotive production machining guide. Use when the user needs PPAP, APQP, IATF 16949 compliance, or high-volume automotive production planning.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  tier: PASS2
  scrutiny_id: M105
  industry: automotive
---

# Automotive Production Machining

## When to Use
- PPAP submission preparation (Levels 1-5)
- APQP phase gate planning (concept through launch)
- IATF 16949 QMS compliance for machining operations
- High-volume production planning with Cpk ≥ 1.67 requirements

## How It Works
1. Map APQP phases to PRISM workflow
2. Generate control plan via `prism_quality→spc_setup` with automotive Cpk targets
3. Prepare PPAP package (18 elements) via `prism_export→render_pdf`
4. Run MSA (Gage R&R) via `prism_quality→capability_analysis`
5. Set up production monitoring with automotive-specific SPC rules

## Returns
- PPAP package (control plan, PFMEA, dimensional results, MSA, Cpk)
- Control plan with special characteristics (CC/SC flagged)
- Process capability study (Cpk ≥ 1.67 for special characteristics)
- Production monitoring dashboard with IATF 16949 rules

## Example
**Input:** "PPAP Level 3 for transmission housing, 50,000 pcs/year, 3 critical bores"
**Output:** PPAP elements: PFMEA (RPN threshold <100), Control Plan (32 characteristics, 3 CC bores with Cpk ≥ 1.67), Flow Diagram, Dimensional (30pc initial study). MSA: Gage R&R <10% for CC dimensions. Current Cpk: Bore 1 = 1.82, Bore 2 = 1.91, Bore 3 = 1.74 — all passing. Setup: 100% in-process bore gauging + SPC charting every 25th part. Annual re-validation included.
