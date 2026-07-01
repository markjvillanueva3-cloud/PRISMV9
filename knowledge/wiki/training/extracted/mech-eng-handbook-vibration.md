---
type: extracted-book
source_book: "Mechanical Engineer's Handbook"
editor: "Dan B. Marghitu"
publisher: "Academic Press"
year: 2001
isbn: "0-12-471370-X"
extracted_at: "2026-05-25"
extracted_by: "claude-9f3a8e4f-india-iter30"
pdf_path: "H:/PRISM/resources/RESOURCE PDFS/MECHANICAL ENGINEERS HANDBOOK BY BAN B. MANRGHITU.pdf"
pdf_size_mb: 18.0
extraction_focus: "Chapter 6 — Theory of Vibration (intro + machine-tool vibrations + chatter feedback loop)"
tribal_jsonl: "state/shared/extracted-pdfs/mech-eng-handbook-vibration-tips.jsonl"
tip_count_this_pass: 10
audience_slots: ["alpha", "bravo", "delta", "kilo", "india"]
---

# Mechanical Engineer's Handbook (Marghitu ed., 2001) — Theory of Vibration extraction

> Third extraction pass — different book, different domain. Targets Chapter 6 (Theory of Vibration) which directly feeds PRISM's `ChatterStabilityLobeEngine`, `RegenerativeChatterEngine`, `DampingOptimizationEngine`, and `MachineDynamicsEngine`. Pure theory + engineering frameworks, no shop-floor procedure (that's the FoCNCM books' lane).

## Why this book + this chapter

Mech Eng Handbook is an Academic Press graduate reference. Chapter 6 is by Marghitu/Raju/Mazilu (Auburn ME dept) and is the canonical treatment of machine-tool vibration. PRISM's chatter engines are operational implementations of these models — the book gives the **theoretical bones** that justify the numerical methods.

## The 10 tips this pass (theory bones for chatter engines)

| ID | Topic | Engine wiring |
|---|---|---|
| meh-001 | Free vs forced vibration (superposition rule) | ChatterStabilityLobe + StochasticChatter |
| meh-002 | DOF counting rule (free particle 2/3, free rigid body 3/6) | All dynamics engines |
| meh-003 | ω = √(k/m), tooth-pass = ω/N stable-lobe condition | SLD + SpeedFeedOrchestrator |
| meh-004 | Resonance = exciting freq COINCIDES with natural freq | All chatter engines |
| meh-005 | Machine-tool 4-subsystem decomposition (ES + AS + FS + CPS) | MachineDynamics core |
| meh-006 | Regenerative chatter ES↔CPS feedback loop (root cause) | RegenerativeChatterEngine |
| meh-007 | Qualitative-before-quantitative analysis order | SafetyEngine (S(x) scoring) |
| meh-008 | Rayleigh method bounds (min Rayleigh > real > max Rayleigh) | MachineDynamics fast estimation |
| meh-009 | ζ damping ratio 3-regime classification + cutting target 0.05-0.2 | DampingOptimization |
| meh-010 | Critical speed of rotating shaft bounds usable RPM | UltimateSpeedFeed + BoringBarDeflection |

## High-leverage rules (the 3 that change PRISM behavior most)

### 1. Qualitative-before-quantitative (tip meh-007)
PRISM's `SafetyEngine` `S(x)` scoring **should** treat stability classification as a hard gate: if the qualitative analysis says "this RPM/depth combo is unstable", quantitative `S(x)` magnitude is irrelevant — the answer is FAIL. Currently `S(x)` is a single continuous score; this rule says it should be a tuple `(is_stable: bool, magnitude: float)` with `is_stable=false` → instant fail.

### 2. ES↔CPS feedback as the chatter root cause (tip meh-006)
`RegenerativeChatterEngine` should be modeled as a **closed-loop transfer function**, not a static stability check. The loop's gain margin + phase margin (in the Bode sense) determine whether a perturbation grows or decays. This is the formal justification for stability lobe diagrams.

### 3. Critical speed bounds RPM independently of cutting requirements (tip meh-010)
A boring bar rated for a 12000 RPM spindle has its OWN critical speed that's often much lower. `BoringBarDeflectionEngine` + `UltimateSpeedFeedEngine` should JOINTLY enforce `RPM_max = min(spindle_max, 0.85 × critical_speed)`. The 0.85 factor is the standard machinery-design margin for unbalanced rotating components.

## What's NOT extracted from this book (pending)

- Chapter 1 (Statics) — useful for fixture loading + workholding force calcs (foxtrot/india interest)
- Chapter 3 (Mechanics of Materials) — directly feeds `PartDeflectionEngine` + tolerance stack-up
- Chapter 7 (Heat Transfer) — feeds `CuttingTemperatureEngine` + `ThermalWearCouplingEngine`
- Chapter 9 (Control) — feeds the AI-tier closed-loop adjustment engines
- Sections 2.4-2.8 of Chapter 6 (forced damped vibration, mechanical impedance, vibration isolation, energetic aspect) — pending deeper pass

## Cross-references

- Sister books in this extraction series:
  - iter27: `fundamentals-cnc-machining.md` (NexGenCAM 2012 — shop-floor procedure)
  - iter29: `fundamentals-cnc-machining-2014-workholding.md` (Autodesk 2014 — workholding)
  - **iter30 (this)**: `mech-eng-handbook-vibration.md` (Marghitu 2001 — vibration theory)
- Companion PRISM artifacts:
  - `engine.ChatterStabilityLobeEngine` — implements lobe diagram from meh-003 + meh-004
  - `engine.RegenerativeChatterEngine` — implements ES↔CPS loop from meh-006
  - `engine.DampingOptimizationEngine` — should target ζ from meh-009

## Audit trail

- Extractor: `pdftotext` (full extraction → `/tmp/mech-full.txt`, ~56k lines)
- Section anchors: `grep` on "CHAPTER 6", "Theory of Vibration", "Machine-Tool", "natural frequency", "chatter"
- Manual content review pages 340-420 (chapter 6 intro + sections 1-4)
- Per `feedback_verify_actual_contract_not_proxy`: every tip cites chapter + section + page
