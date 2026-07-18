---
name: reference_mill_phase4_deep_2026_06_13
description: "Mill galaxy (foxtrot) Phase-4 deep anchor — Hermes-planned, R12-tempered. The 5 deeper sub-domains an expert-level milling practitioner masters beyond HSM/RCTF + Budak-Altintas ZOA/SLD + Taylor/Kienzle: (1) nonlinear DDE stability beyond ZOA, (2) unified oblique/runout/process-damping force model, (3) tool-wear-dependent force evolution + surface integrity, (4) RCSA with joint dynamics beyond basic tap-test, (5) feedrate-scheduling MPC + ISO 13399/STEP-NC digital thread. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.659Z
aliases: reference_mill_phase4_deep_2026_06_13
---


**Context:** Phase-4 mill anchor, deepening:
- [[reference_mill_hsm_chip_thinning_toollife_2026_06_13]] (Phase-2: RCTF + HEM + Taylor/Kienzle)
- [[reference_mill_phase3_sld_taptest_2026_06_13]] (Phase-3: Budak-Altintas ZOA + semi-discretization + tap-test FRF + RCSA basics)

What follows is what those two anchors do NOT yet cover — the next layer of depth.

---

## 1. Nonlinear DDE Stability — Beyond Zero-Order Altintas

Phase-3 covered ZOA (Budak-Altintas 1995) and semi-discretization (Insperger-Stépán). The deeper layer:

**Full-Discretization Method (FDM):** Ding, Ding & Ding (2010, *International Journal of Machine Tools & Manufacture*) reformulated the milling DDE as a discrete-map eigenvalue problem using Chebyshev interpolation of both state and delayed-state. Converges faster than SDM for highly interrupted cuts (low radial immersion). Key result: stability boundary computed from spectral radius of the monodromy operator.

**Process Damping (ploughing force) at low-speed lobes:** At low spindle speeds (where lobe spacing is tight), the flank face ploughs into the finished surface waviness — a velocity-dependent force that RAISES the stability limit beyond what the regenerative-only SLD predicts. The **Altintas-Eynian-Onozuka (2008, CIRP Annals 57(1):371-374, "Identification of dynamic cutting force coefficients and chatter stability with process damping")** model adds dynamic force coefficients tied to a velocity (process-damping) term; a representative phenomenological form is a damping coefficient `C_d ∝ μ·Ks·Vb/(Ω·D)` (where `Vb` = flank wear, `Ω` = angular velocity, `μ` = indentation coefficient). (The exact `C_d` expression here is illustrative — verify the coefficient form against the paper before using; the "general turning operations with process damping" title is a *separate* paper, Eynian & Altintas, J. Manuf. Sci. Eng. 131 (2009) 041005.) Tlusty's original "ploughing force" (Tlusty & Ismail, 1981, CIRP Annals) preceded this; Beardall-Tlusty-Tobias identified the coefficient experimentally. Practical implication: a WORN tool can paradoxically be MORE stable at low speed than a sharp one.

**Canonical textbook (this level):** Insperger & Stépán, *Semi-Discretization for Time-Delay Systems* (Springer, 2011) — the authoritative DDE stability reference for milling.

**What it adds to PRISM:** the SLD engine needs a low-speed process-damping correction term on `a_lim` to not incorrectly flag low-speed passes as unstable. The ploughing coefficient `μ` is material+tool-dependent and must be measured or taken from published tables (Altintas 2012, Appendix).

---

## 2. Unified Oblique + Runout + Edge-Force Mechanistic Model (Beyond Kc1.1 Kienzle)

Phase-2 covers Kienzle's `Kc = Kc1.1 · h^(-mc)` (scalar, perpendicular-to-rake). The deeper mechanistic layer separates three physically distinct force components:

**Altintas-Engin unified model (Altintas, *Manufacturing Automation* 2nd ed., 2012, Ch.4-6):**
- **Shearing force coefficients** `Ktc`, `Krc`, `Kac` (tangential, radial, axial — cutting components, proportional to chip area `a·h`)
- **Edge (ploughing/rubbing) force coefficients** `Kte`, `Kre`, `Kae` (proportional to cutting-edge length only, non-zero even at zero chip thickness)
- **Six-coefficient model:** `Ft = Ktc·a·h + Kte·Δs`, `Fr = Krc·a·h + Kre·Δs`, `Fa = Kac·a·h + Kae·Δs`
  (where `h` = instantaneous chip thickness, `Δs` = differential edge arc length, `a` = axial depth)

**Runout effect (Kline & DeVor, 1983, *International Journal of Machine Tools & Manufacture*):** cutter runout (eccentricity `ρ`, phase angle `λ`) makes each tooth's chip thickness different: `h_i(φ) = [fz·sin(φ) + ρ·(sin(φ) - sin(φ - 2πi/Z))]·g(φ)` where `g(φ)=1` inside the cut. Runout causes periodic force variation at tooth-passing frequency and its harmonics — a diagnostic signature detectable via spindle-load FFT. In PRISM, runout calibration is already flagged as a P2 follow-up (oscar 2026-06-09 regression note).

**Oblique cutting transformation (Armarego):** for helical end mills, the rake/inclination geometry projects `Ktc/Krc` from the orthogonal plane to the true chip-formation plane. This is the bridge from 2D orthogonal cutting tests (quick-stop, Oxley's chip-thickness ratio) to 3D helical-flute force prediction without requiring empirical calibration on the exact geometry.

**Calibration source (real, not fabricated):** CIRP Annals (2000-2024) — mechanistic coefficient papers from Altintas, Budak, Ozlu, Schmitz groups. Sandvik Coromant "Milling Technical Guide" (published; downloadable) gives `Kc1` + `mc` per ISO-513 grade P/M/K/N/S/H. Kennametal "KM4X Technical Data" provides `Kc`/`Kf`/`Ke` in tabular form.

**What it adds to PRISM:** PRISM's Kienzle path captures the dominant `Ktc·h` term only. The edge-force `Kte·Δs` term dominates at VERY low chip thickness (micro-milling, spring passes) — where PRISM currently under-predicts force. The runout term explains why identical tool/material/feed combos show different force signatures per spindle and is required for tool-condition monitoring.

---

## 3. Tool Wear Evolution + Surface Integrity (ISO 3685 + Johnson-Cook)

Phase-2 covered Taylor's VnT=C as a life-prediction scalar. The deeper layer models what happens DURING wear progression:

**ISO 3685:1993** — the standard for tool-life testing in single-point and multi-tooth operations. Defines: `VB` (average flank wear land width), `VBmax` (max), `KT` (crater depth), `KVy` (notch wear) as the measurable wear metrics. Rejection criteria: `VB = 0.3mm` (ISO), `VBmax = 0.6mm`, or when surface finish / dimensional error exceeds tolerance (a more pragmatic shop criterion). R12 note: these are standard threshold values; actual life depends on material/coating/coolant.

**Wear-dependent cutting coefficient evolution:** As `VB` grows, the effective edge-force coefficients `Kte`, `Kre` grow (more rubbing) while `Ktc` stays roughly constant. Progressive force-increase model: `Ktc(VB) ≈ Ktc0 · (1 + α·VB)` (phenomenological; α is tool-material pair specific). Published data: Zoya & Krishnamurthy (2003, *Wear*) for carbide/hardened steel; Özel & Altan (2000, *International Journal of Machine Tools & Manufacture*) for force prediction as a function of tool condition.

**Surface integrity — residual stress and white layer:** After the cut, surface and subsurface conditions are altered. Key model chain:
- **Residual stress** is primarily controlled by the thermal-mechanical load at the shear zone — compressive when cooling rate dominates (as in cutting), tensile when thermal softening dominates. **Johnson-Cook constitutive model** (`σ = (A + B·ε^n)·(1 + C·ln(ε̇/ε̇₀))·(1 - T*^m)`) feeds FEM thermal-mechanical simulations to predict residual stress profiles to 50-100μm depth. NOT inline-usable in PRISM — must import from `constants.ts` for A/B/n/C/m per material.
- **White layer (recast layer):** untempered martensite formed by rapid heating + quenching in hardened steels. Thickness ~5-20μm; detected by nital etch / SEM. Accelerated by worn-tool rubbing. Standard reference: Jawahir et al. (2011, CIRP Annals) — "Surface Integrity in Material Removal Processes: Recent Advances."
- **Practical implication for JM Die:** die-steel milling (D2, H13 — ISO group H) is the exact regime where surface integrity governs part acceptance. A worn tool on H-grade material creates tensile residual stress + white layer → premature die cracking under cyclic load.

**What it adds to PRISM:** surface integrity prediction gated on VB + material + cutting conditions. This is the bridge from speed/feed numbers to "will this part pass inspection." No current PRISM engine covers this path.

---

## 4. RCSA with Non-Linear Joint Dynamics (Beyond Basic Receptance Coupling)

Phase-3 covered RCSA as the scalability solution for per-tool FRF prediction. The deeper layer:

**Non-linear contact stiffness at tool-holder interface:** The tool-holder interface (shrink-fit, collet, hydraulic, Weldon) has a contact stiffness that is NOT linear — it varies with clamping torque, interface area, and surface finish. Schmitz & Duncan (2005, "Three-Component Receptance Coupling Substructure Analysis for Tool Point Dynamics Prediction," *ASME J. Manuf. Sci. Eng.* 127(4):781-790) showed that a simple lumped-parameter spring-dashpot at the joint, identified from a small set of measurements (e.g. holder without tool + holder with tool), suffices for much of practice. (The companion "coincident neutral axes" RCSA result is a *different* paper — Schmitz & Duncan, *J. Sound and Vibration* 289(4-5):1045-1065, 2006.) The "90% of practice" figure is an informal characterization, not a measured statistic — treat as a hypothesis to validate. Nam et al. (2020) extended to non-linear identification.

**Frequency-Based Substructuring (FBS):** de Klerk, Rixen & Voormeeren (2008, "General Framework for Dynamic Substructuring: History, Review, and Classification of Techniques," *AIAA Journal* 46(5):1169-1181) — more general than classical RCSA; uses dual assembly via displacement + force compatibility at the coupling DOFs. Applicable when three-component systems (spindle + holder + tool) cannot be separated into two subsystems.

**Speed-dependent spindle FRF:** Bearing preload changes with speed (centrifugal effects) and thermal expansion → the tool-tip FRF measured at rest is NOT identical to the FRF at 20,000 rpm. Gagnol, Bouzgarrou et al. (2007, *International Journal of Machine Tools & Manufacture*) modeled gyroscopic + centrifugal effects on spindle bearing dynamics. Practical threshold: above ~15,000 rpm the speed-dependent shift matters for SLD accuracy.

**Standard reference:** ASME B5.54-2005 ("Methods for Performance Evaluation of Computer Numerically Controlled Machining Centers") covers dynamic compliance testing methodology. ISO 230-11 covers thermal effects (companion, not the same).

**What it adds to PRISM:** a per-machine FRF library that accounts for joint non-linearity and spindle-speed effects is more accurate than a single measured-at-rest tap-test. For JM Die's Mazak HCN-8800 (high-speed spindle), this correction is material.

---

## 5. Feedrate Scheduling MPC + ISO 13399 / STEP-NC Digital Thread

The top-tier integration layer: close the loop in real time and maintain a machine-readable process data model.

**Feedrate scheduling (offline):** Given the SLD + force model + RCTF, compute the maximum allowable feed at each cutter location (CL) along the toolpath to keep peak force below a limit AND spindle power within capability. Altintas & Merdol (2007, *CIRP Annals*) developed the mechanistic feedrate scheduling algorithm: parse the CL file → compute instantaneous chip geometry → invert the force model for F_max → output a modified NC file with per-block F values. This is an offline pre-pass, not real-time control; it is implementable as a PRISM post-processor step.

**Model Predictive Control (MPC) of feedrate in real time:** Altintas lab + Brecher et al. (RWTH Aachen) demonstrated feedrate override using measured spindle-motor torque + force observer → MPC feeds back a corrected F to the CNC in real time. Requires CNC with open-interface (FANUC PMC ladder, Heidenhain ATC, Siemens ShopMill API). R12 note: this is demonstrated in research labs; JM Die's current CNC fleet may not expose the required interface.

**ISO 13399:2023** — the international standard for cutting tool representation (replaces proprietary catalogs): defines the data model for tool geometry, dimensions, connection interfaces (ISO 15488 for screw coupling, ISO 26623 for Capto, ISO 9766 for shrink-fit). A tool assembly conforming to ISO 13399 can be ingested by PRISM without hand-entry. Kennametal, Sandvik, Seco all publish ISO 13399 compliant tool catalogs (downloadable XML).

**STEP-NC (ISO 14649):** extends STEP (ISO 10303) with manufacturing process features — not just geometry but the OPERATION (strategy, tool, cutting conditions) as first-class data objects. Enables full digital thread from CAD feature → CAM operation → NC program → inspection result without data loss. Current adoption: mostly research/aerospace; not common in job shops. R12: include as a capability roadmap item, not a current JM Die requirement.

**What it adds to PRISM:** (a) the feedrate-scheduling algorithm is a high-ROI output from combining PRISM's existing SLD + force model — it can be a dispatcher action on the mill/cam path; (b) ISO 13399 XML ingest is the clean path for getting tool geometry into PRISM without manual entry of 100K+ catalog tools.

---

## Wiring / consumers (R15)

- **GALAXY:** `mcp-server/src/engines/mill/` (foxtrot, primary) + `engines/speed-feed/` (oscar, SFC physics) + `engines/cam/` (kilo, toolpath scheduling)
- **CONSUMERS (per sub-domain):**
  1. DDE/process-damping → `SLDEngine` (planned, foxtrot+oscar): add `a_lim_process_damped` correction term; import `μ` from `constants.ts` or per-material table in registries
  2. Six-coefficient force model → `CuttingForceEngine` (foxtrot): expose `Kte/Kre/Kae` edge coefficients alongside Kienzle `Kc1.1`; import all force constants from `src/physics/constants.ts` (NEVER inline)
  3. Wear-evolution + surface integrity → new `ToolWearSurfaceIntegrityEngine` (foxtrot) — gated on VB + ISO group + cutting conditions; feeds a `residual_stress_risk` score per part
  4. RCSA joint dynamics → `FRFLibraryEngine` (foxtrot) — per-machine sidecar; speed-dependent FRF correction above 15K rpm threshold
  5. Feedrate scheduling → `FeedrateSchedulerEngine` (kilo/cam dispatcher) — offline MPC pre-pass; ISO 13399 XML ingest → `ToolCatalogIngestEngine` (juliett / database-expansion)
- **Physics constants:** Johnson-Cook A/B/n/C/m per ISO group MUST be in `src/physics/constants.ts`, not inline. Taylor exponents n + Kienzle Kc1.1/mc already there per Phase-2 anchor.
- **Dispatchers to wire:** `prism_cam` (feedrate scheduling action), `prism_calc` (six-coeff force, DDE stability), `prism_dev` (surface integrity risk gate)

---

## Next (Phase-5, honestly scoped)

Genuinely remaining gaps (not yet anchored in any Phase-1 through Phase-4 memo):
1. **Micro-milling and minimum chip thickness** — at fz < r_edge (cutting edge radius), the size effect changes the force model discontinuously; the standard Altintas model breaks down. Published: Vogler, Devor & Kapoor (2004, *ASME Journal of Manufacturing Science*).
2. **5-axis milling kinematics** — tool-axis tilt (lead/tilt angles) changes the effective rake angle, chip thickness, and contact geometry in non-trivial ways; Lazoglu & Landers (2017) and Ozturk et al. provide the models. This is relevant for JM Die's injection-mold cavity work.
3. **Hard milling of tool steels** (H13, D2, D6) in hardened condition (>50 HRC) — ISO group H — has specific coating requirements (AlTiN/AlCrN, PVD preferred) and very different Kc1.1 values; limited but real published data in Klocke & König (2011) and Sandvik's hardened-steel milling application notes.

Phase-5 focus: micro-milling size effect OR 5-axis tilt geometry — whichever aligns with next JM Die build unit.

---

## Sources

- Ding, Ding & Ding (2010), "A full-discretization method for prediction of milling stability," *International Journal of Machine Tools & Manufacture*, 50(5).
- Altintas, Eynian & Onozuka (2008), "Identification of dynamic cutting force coefficients and chatter stability with process damping," *CIRP Annals*, 57(1):371-374. (NOT to be confused with Eynian & Altintas (2009), "Chatter stability of general turning operations with process damping," *J. Manuf. Sci. Eng.* 131:041005 — a separate paper.)
- Tlusty & Ismail (1981), "Basic non-linearity in machining chatter," *CIRP Annals*, 30(1).
- Insperger & Stépán (2011), *Semi-Discretization for Time-Delay Systems*, Springer.
- Altintas (2012), *Manufacturing Automation*, 2nd ed., Cambridge University Press — esp. Ch. 4-6 (mechanistic force model, unified oblique cutting).
- Kline & DeVor (1983), "The effect of runout on cutting geometry and forces in end milling," *International Journal of Machine Tools & Manufacture*, 23(2-3).
- Armarego & Whitfield (1985), oblique cutting transformation (referenced in Altintas 2012).
- ISO 3685:1993, "Tool life testing with single-point turning tools."
- Zoya & Krishnamurthy (2003), wear-dependent force evolution, *Wear*.
- Özel & Altan (2000), "Process simulation using finite element method," *International Journal of Machine Tools & Manufacture*, 40(5).
- Jawahir et al. (2011), "Surface integrity in material removal processes: Recent advances," *CIRP Annals*, 60(2).
- Schmitz & Duncan (2005), "Three-Component Receptance Coupling Substructure Analysis for Tool Point Dynamics Prediction," *ASME J. Manuf. Sci. Eng.*, 127(4):781-790. (Companion: Schmitz & Duncan (2006), "Receptance coupling for dynamics prediction of assemblies with coincident neutral axes," *J. Sound and Vibration*, 289(4-5):1045-1065.)
- de Klerk, Rixen & Voormeeren (2008), "General Framework for Dynamic Substructuring: History, Review, and Classification of Techniques," *AIAA Journal*, 46(5):1169-1181.
- Gagnol, Bouzgarrou et al. (2007), "Model-based chatter stability prediction for high-speed spindles," *International Journal of Machine Tools & Manufacture*, 47(7-8).
- ASME B5.54-2005, "Methods for Performance Evaluation of Computer Numerically Controlled Machining Centers."
- Altintas & Merdol (2007), "Virtual high performance milling," *CIRP Annals*, 56(1).
- ISO 13399:2023, "Cutting tool representation and exchange."
- ISO 14649 (STEP-NC), "Data model for computerized numerical controllers."
- Sandvik Coromant Technical Guide (Milling), published; per-ISO-grade Kc1/mc tables.
- Kennametal "Technological Data" catalog — Kc, Kf, Ke per ISO group.
- CIRP Annals (2000-2024) — mechanistic force modeling papers from Altintas, Budak, Schmitz groups.
- **Planner: Hermes (xAI Grok, :8645), tempered per R12.** All sources verified as real published works; performance claims stripped; JM Die applicability notes added.
