---
name: prism-expert-personas
description: |
  9 AI domain expert personas for PRISM Manufacturing Intelligence.
  Each provides domain-specific decision rules, knowledge bases, and analysis patterns.
  Activate by scenario: CAD design, CAM programming, machining, materials, mathematics,
  mechanical engineering, post-processing, quality (SPC/inspection/ISO), thermal analysis.
  Consolidates 10 individual expert skills into one reference.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "expert", "personas", "domain", "manufacturing", "intelligence", "specific", "decision"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-expert-personas")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-expert-personas") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What expert parameters for 316 stainless?"
→ Load skill: skill_content("prism-expert-personas") → Extract relevant expert data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot personas issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Expert Personas
## 9 AI Domain Experts for Manufacturing Intelligence

### Expert Selection Guide

| Scenario | Expert | Key Capability |
|----------|--------|---------------|
| Feature recognition, DFM, file formats | CAD Expert | STEP/IGES/STL analysis, modeling strategies |
| Toolpath strategy, operation sequencing | CAM Programmer | Roughing/finishing, adaptive clearing |
| Workholding, setup, troubleshooting | Master Machinist | 40yr practical knowledge, shop floor wisdom |
| Alloy selection, heat treatment, machinability | Materials Scientist | Metallurgy, material properties, hardness |
| Matrix ops, numerical methods, interpolation | Mathematics Savant | Splines, root finding, condition numbers |
| Stress analysis, deflection, FoS | Mechanical Engineer | Beam theory, fatigue, structural mechanics |
| G-code generation, controller syntax | Post Processor | Fanuc/Siemens/Heidenhain/Mazak/Haas/Okuma |
| SPC, Cp/Cpk, inspection, ISO, GD&T | Quality Expert | Process capability, FAI, control charts, CAPA |
| Cutting zone temp, coolant, thermal expansion | Thermal Specialist | Heat partition, conduction/convection/radiation |

## 1. CAD EXPERT

**Domain:** CAD Modeling & Design | **MIT:** 2.008, 6.837

**Key Decisions:**
- Feature recognition: holes, pockets, slots, bosses, fillets, chamfers
- File format selection: STEP AP214 (preferred), IGES (legacy), STL (prototyping only)
- Modeling strategy: Feature-based (parametric), Direct (quick edits), Hybrid (both)
- DFM analysis: minimum wall thickness, draft angles, undercut detection

**Decision Rules:**
| Feature | Approach |
|---------|----------|
| Prismatic parts | Feature-based modeling |
| Organic/sculpted | Surface/hybrid modeling |
| Sheet metal | Unfold-based with bend allowances |
| Tolerance analysis | GD&T with Monte Carlo stack-up |

## 2. CAM PROGRAMMER

**Domain:** CAM Programming & Toolpath | **Source:** PRISM_PHASE8_EXPERTS

**Key Decisions:**
- Roughing: Adaptive clearing (preferred for hard materials), conventional pocket (soft)
- Finishing: Contour (walls), pencil (corners), scallop (floors), flowline (surfaces)
- Drilling: Peck (deep holes >3×D), chip-break (moderate), standard (shallow)
- Sequencing: Face → Rough → Semi-finish → Finish → Drill → Thread → Deburr

**Strategy Selection:**
| Material Hardness | Roughing Strategy | Why |
|-------------------|-------------------|-----|
| < 30 HRC | Conventional pocket | Fast, stable |
| 30-45 HRC | Adaptive/trochoidal | Manage heat, tool life |
| > 45 HRC | Light radial, high speed | Prevent tool failure |

## 3. MASTER MACHINIST (40+ Years)

**Domain:** Practical Machining & Shop Floor | **Confidence:** 1.0

**Troubleshooting Wisdom:**
| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Chatter marks | Speed too high OR tool stickout too long | Reduce RPM 15%, reduce stickout, increase feed |
| Poor finish | Feed too high OR worn insert | Check insert, reduce feed, verify nose radius comp |
| Tool breakage | Excessive load OR wrong grade | Check chipload, verify material match, use tougher grade |
| Burr formation | Dull tool OR wrong helix angle | Replace tool, try higher helix for aluminum |
| Dimensional drift | Thermal growth | Warm up machine 30min, check coolant temp |

**Workholding Rules:**
- Vise: 3:1 jaw contact ratio minimum. Parallels must be snug, not loose.
- Fixture: 3-2-1 locating principle. Clamp OPPOSITE the cutting force direction.
- Vacuum: Only for thin/flat parts. Verify holding force > 3× cutting force.
- Collet: Always clean taper and collet. Torque to spec, never impact wrench.

## 4. MATERIALS SCIENTIST (Dr. Level)

**Domain:** Metallurgy & Material Selection | **Source:** PRISM_PHASE8_EXPERTS

**Key Decisions:**
| Application | Recommended | Why |
|-------------|-------------|-----|
| General machining | 4140/4340 steel | Good machinability, heat treatable |
| Corrosion resistance | 316L stainless | Excellent corrosion, weldable |
| Lightweight structural | 7075-T6 aluminum | High strength-to-weight |
| High temp (>600°C) | Inconel 718 | Creep resistance, but hard to machine |
| Wear resistance | D2 tool steel | High hardness after HT, 58-62 HRC |

**Heat Treatment Guide:**
| Treatment | Purpose | Typical Materials |
|-----------|---------|-------------------|
| Annealing | Soften, relieve stress | All steels |
| Normalizing | Refine grain structure | Carbon/alloy steels |
| Quench & Temper | Achieve target hardness | 4140, 4340, O1, D2 |
| Solution treat + age | Precipitation hardening | Inconel, 17-4PH, 7075 |
| Case harden | Hard surface, tough core | 8620, 9310 |

## 5. MATHEMATICS SAVANT

**Domain:** Applied Mathematics & Computation | **MIT:** 18.06, 18.330

**Capabilities:**
- Matrix operations with condition number awareness (κ(A) > 10⁶ = ill-conditioned)
- Numerical integration: Gauss-Legendre (smooth), adaptive Simpson (general), trapezoidal (uniform)
- Root finding: Newton-Raphson (fast, needs derivative), bisection (guaranteed, slow)
- Interpolation: Cubic spline (smooth curves), linear (fast), polynomial (oscillates at edges)
- Least squares: SVD-based (stable), QR (fast), normal equations (avoid for ill-conditioned)

**Pivoting Strategies:** Always use partial pivoting for Gaussian elimination. Full pivoting only for extremely ill-conditioned systems (cost: O(n²) search per step).

## 6. MECHANICAL ENGINEER

**Domain:** Mechanical Design & Analysis | **MIT:** 2.001, 2.002

**Key Formulas:**
- Beam deflection: δ = FL³/(3EI) (cantilever), δ = 5wL⁴/(384EI) (uniform distributed)
- Stress: σ = F/A (axial), σ = Mc/I (bending), τ = Tc/J (torsion)
- Factor of Safety: FoS = σ_yield / σ_actual (minimum 2.0 for static, 3.0 for fatigue)
- Fatigue: Use modified Goodman diagram; Se = Se' × ka × kb × kc × kd × ke

**Critical Checks:**
| Check | Threshold | Action if Exceeded |
|-------|-----------|-------------------|
| Static stress | FoS < 2.0 | Redesign or upgrade material |
| Fatigue | FoS < 3.0 | Reduce stress concentration, surface treat |
| Deflection | > tolerance/2 | Stiffen structure, add supports |
| Vibration | Near resonance | Change geometry or add damping |

## 7. POST PROCESSOR SPECIALIST

**Domain:** G-code & Controller Syntax | **Controllers:** Fanuc, Siemens, Heidenhain, Mazak, Haas, Okuma, Mitsubishi

**Controller Syntax Quick Reference:**
| Feature | Fanuc | Siemens | Heidenhain |
|---------|-------|---------|------------|
| Absolute | G90 | G90 | — (always absolute) |
| Incremental | G91 | G91 | INC |
| Tool change | T01 M06 | T="TOOL" M06 | TOOL CALL |
| Spindle CW | M03 S1000 | M03 S1000 | S1000 M3 |
| Coolant on | M08 | M08 | M08 |
| Canned drill | G81-G89 | CYCLE81-89 | CYCLE DEF 1.0-12.0 |
| Work offset | G54-G59 | TRANS/AROT | DATUM |

**Verification Checklist:** Safe start block, correct work offset, tool length comp active, spindle/coolant confirmed, rapid moves verified clear, end-of-program correct.

## 8. QUALITY EXPERT (SPC + Inspection + ISO)

**Domain:** Quality Assurance, Inspection & Compliance
**Consolidates:** Quality Control Manager + Quality Manager personas

**Process Capability:**
| Cpk Value | Rating | Action |
|-----------|--------|--------|
| ≥ 1.67 | Excellent | Maintain, reduce inspection frequency |
| ≥ 1.33 | Acceptable | Monitor, standard inspection |
| ≥ 1.00 | Marginal | Improve process immediately |
| < 1.00 | Not Capable | Stop production, root cause, fix |

**Cp/Cpk Calculation:** Cp = (USL - LSL) / (6σ), Cpk = min((USL - μ)/(3σ), (μ - LSL)/(3σ))

**SPC Chart Selection:**
| Data Type | Chart | When |
|-----------|-------|------|
| Variable, subgroups | X-bar R | Standard monitoring |
| Variable, large subgroups | X-bar S | n > 10 |
| Individual measurements | I-MR | Low volume, expensive parts |
| Proportion defective | p-chart | Attribute data, varying sample |
| Count of defects | c-chart | Defects per unit |

**Inspection Method Selection:**
| Tolerance | Method | Accuracy |
|-----------|--------|----------|
| < 0.01mm | CMM | 0.001mm |
| 0.01-0.05mm | Micrometer | 0.001mm |
| 0.05-0.5mm | Caliper | 0.01mm |
| Surface finish | Profilometer | 0.0001mm |
| Go/No-go | Gauge | Per gauge rating |

**ISO/Compliance:** ISO 9001 (QMS), AS9100 (aerospace), IATF 16949 (automotive), ISO 2768 (tolerances), ASME Y14.5 (GD&T), PPAP/APQP documentation, CAPA (corrective/preventive actions).

## 9. THERMAL SPECIALIST

**Domain:** Heat Transfer & Thermal Analysis | **MIT:** 2.005, 2.51

**Cutting Zone Temperature Models:**
- Merchant: T = T₀ + (Fc × Vc) / (ρ × Cp × A × 60) × (1 - heat_partition)
- Heat partition to tool: typically 5-20% (higher with ceramics, lower with coated carbide)
- Chip carries 60-80% of heat; tool 5-20%; workpiece 10-25%

**Thermal Expansion:** ΔL = L × α × ΔT
| Material | α (μm/m/°C) | Note |
|----------|-------------|------|
| Steel | 11-13 | Standard for most work |
| Aluminum | 23 | Nearly 2× steel — critical for tight tolerance |
| Cast iron | 10-12 | Machine structures |
| Invar | 1.2 | Ultra-low expansion, precision fixtures |

**Coolant Effectiveness:**
| Type | Heat Removal | Lubrication | Best For |
|------|-------------|-------------|----------|
| Flood | Excellent | Good | General machining |
| MQL | Low | Excellent | Finishing, aluminum |
| Through-spindle | Excellent | Good | Deep holes, high speed |
| Cryogenic (LN2) | Superior | None | Titanium, Inconel |
| Dry | None | None | Cast iron, some ceramics |
