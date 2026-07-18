---
name: tribal-jm-die-019
category: code-tribal
subdomain: troubleshooting
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "wire-break", "risk-model", "thickness", "corner", "flushing", "carbide"]
confidence: 91
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-019.md
promoted_at: 2026-05-26T16:07:21.221Z
---

# JM Die wire break risk factors — thickness, material, corner radius, flushing

JM Die's wire break risk model (0-100 scale) considers 4 primary factors: (1) Thickness: <25mm=low, 25-75mm=medium, >75mm=high risk — add 15 points per category. (2) Material: tool steel=base, stainless=+10, carbide=+25. (3) Corner radius: >2mm=0, 1-2mm=+10, 0.5-1mm=+20, <0.5mm=+30. (4) Flushing: open=0, semi-closed=+10, fully enclosed (blind cavity)=+25. Total >50 requires enhanced parameters: reduced power, increased OFF time, zinc-coated wire. Total >75 requires manual supervision, reduced feed rate 20%, and operator review of start holes. The WEDMProgramNeuralAnalysisEngine.predictWireBreakRisk() implements this model.

**Category:** troubleshooting
**Confidence:** 91
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-kb-002|Wire breaks at corners: slow feed + increase OFF time]]
- [[wedm-knowledge-tips-wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]]
- [[wedm-knowledge-tips-wedm-kb-005|Coated wire reduces breaks in carbide and PCD]]
- [[wedm-knowledge-tips-wedm-kb-021|Submerged vs non-submerged: always submerge when possible]]
- [[wedm-knowledge-tips-wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]]
