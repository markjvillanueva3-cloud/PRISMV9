---
name: reference_blueprint-vision_phase4_deep_2026_06_13
description: "Blueprint-vision (xray) Phase-4 deep anchor — Hermes-planned, R12-tempered. The 4 deeper sub-domains: (1) ASME Y14.5.1-2019 mathematical GD&T + DRF 6-DOF constraint analysis; (2) automated tolerance stack-up (worst-case/RSS/Monte Carlo Latin Hypercube) from parsed GD&T graph; (3) metrology-linkage per ISO 14253-1/-2 + ISO 10360 uncertainty budgets; (4) legacy/pre-1995 drawing OCR (ANSI Y14.5M-1982, MIL-STD-8, diazo/vellum artifact repair). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.479Z
aliases: reference_blueprint-vision_phase4_deep_2026_06_13
---


**Context:** Phase-4 anchor for the blueprint-vision galaxy (xray). Deepens
[[reference_blueprint-vision_phase3_weighted_ensemble_fcf_2026_06_13]] (Phase-3, weighted-ensemble + FCF
structured schema) and [[reference_blueprint-vision_vlm_gdt_dimension_2026_06_13]] (Phase-2, VLM families +
Y14.5 FCF grammar + consensus). The 4 sub-domains below are NOT yet anchored in those files and represent the
layer between "parsing FCF boxes" and "deriving manufacturing decisions from them."

---

## The deeper increments (Phase-4)

### 1. ASME Y14.5.1-2019 — Mathematical GD&T + Datum Reference Frame (DRF) 6-DOF Analysis

Beyond parsing the FCF box, the next layer is to COMPUTE from it. ASME Y14.5.1-2019 ("Mathematical
Definition of Dimensioning and Tolerancing Principles") is the mathematical companion to Y14.5-2018 — it gives
the actual equations, not just the notation.

**Key equations / concepts:**
- **DRF transformation**: a Datum Reference Frame is a 6-DOF constraint system (3 translation + 3 rotation
  degrees of freedom constrained by primary/secondary/tertiary datums). The DRF establishes the coordinate frame
  relative to which all tolerances are measured. Screw theory (twist coordinates, wrench matrix) provides the
  formal underpinning.
- **Virtual Condition (VC)** and **Resultant Condition (RC)** per Y14.5-2018 §4.11 and §7.4:
  - VC (external feature) = MMC size + geometric tolerance at MMC
  - VC (internal feature) = LMC size − geometric tolerance at LMC
  - These bound the gauge / mating-part envelope — directly consumed by quoting (fit analysis) and CMM programming.
- **Bonus tolerance** (Maximum Material Condition modifier Ⓜ): the geometric tolerance increases by the amount
  the feature departs from MMC. Bonus = |actual mfg size − MMC size|; applies when Ⓜ is present in the FCF.
- **Datum shift**: when a datum feature is controlled with Ⓜ, the DRF itself can shift relative to the part,
  expanding the effective tolerance. Computable from the actual datum feature size.
- **Projected tolerance zone** (Y14.5-2018 Fig. 4-24 to 4-26): positional tolerance for a threaded/press-fit
  hole is projected above the part surface by the projection length; the VLM must detect the circle-P modifier
  + projection length annotation.

**What this adds for PRISM xray:** after the FCF recognizer (Phase-3) extracts the symbol + tol + Ⓜ/Ⓛ +
datums, a symbolic solver (SymPy + GD&T axiom layer) can compute VC/RC/bonus at each extracted size → feeds
quality (CMM program generation) and quoting (fit/clearance analysis). UNVERIFIED: the Qwen2.5-VL-72B +
"Chain-of-DRF" prompting approach Hermes named is not a published paper — treat as a design hypothesis.

**Sources:** ASME Y14.5.1-2019 (canonical mathematical standard); ASME Y14.5-2018 §4.11, §7.4, Fig. 4-24/26;
Madsen & Madsen, "Geometric Dimensioning and Tolerancing" 7th ed. (2021, Goodheart-Willcox) — web-verify for
current edition; Fischer, "Mechanical Tolerance Stackup and Analysis" 2nd ed. (CRC Press, 2011) — web-verify
title/edition before citing externally.

---

### 2. Automated Tolerance Stack-Up from the Parsed GD&T Graph

Once the VLM+FCF-recognizer emits a structured tolerance graph (features as nodes, datum references + tolerances
as edges), the next layer is to PROPAGATE those tolerances to compute assembly-level gaps and clearances.

**Three canonical methods (use all three; compare):**
- **Worst-case (WC):** gap_min = nominal − Σ|tᵢ|; gap_max = nominal + Σ|tᵢ|. Deterministic; pessimistic for
  many-part chains. Valid when: zero tolerance-chain failures are acceptable.
- **Root-Sum-Square (RSS):** gap_σ = √(Σtᵢ²); assumes independent normal distributions. Estimates 3σ
  yield. Optimistic when distributions are non-normal or correlations exist.
- **Monte Carlo (MC) with Latin Hypercube Sampling (LHS):** sample each tolerance as a distribution (normal,
  uniform, truncated-normal for 100% inspection); LHS stratifies the sample space → convergence with fewer
  samples than crude Monte Carlo. Use copulas (e.g., Gaussian or t-copula) when feature variations are
  correlated (same machining setup). 6σ Cpk/Ppk integration: Cpk = min(USL−μ, μ−LSL) / (3σ); the VLM-parsed
  process capability index directly informs whether the tolerance is manufacturable on a given machine.

**What this adds for PRISM xray:** the blueprint-vision pipeline terminates today at "extract dims + tolerances."
The stack-up engine would extend it to "is this assembly feasible?" and "which tolerance is the critical
contributor?" — high-value for quoting (manufacturability check) and quality (inspection priority ranking).
NOTE: this is a design direction, not yet shipped in PRISM. Build would require: (a) the FCF→graph emitter
(Phase-3 work), (b) a tolerance-chain resolver (feature graph → ordered chain), (c) the WC/RSS/MC calculator.

**Sources:** Fischer, "Mechanical Tolerance Stackup and Analysis" 2nd ed. (CRC Press, 2011) — the canonical
engineering reference; Drake, "Dimensioning and Tolerancing Handbook" (McGraw-Hill, 1999); ISO 2692:2021
(Maximum Material and Least Material Requirements — the standard governing bonus tolerance in stack calculations);
Latin Hypercube Sampling: McKay, Beckman, Conover, "A Comparison of Three Methods for Selecting Values of Input
Variables in the Analysis of Output from a Computer Code" (Technometrics, 1979).

---

### 3. Metrology-Linkage: ISO 14253 / ISO 10360 Uncertainty Budgets per Feature

A parsed tolerance is only actionable if it can be MEASURED. This layer bridges GD&T parsing to
measurement planning by determining which tolerances a given CMM/optical/CT system can resolve within its
own uncertainty budget.

**Key standards (real, published):**
- **ISO 14253-1:2017** "Decision rules for proving conformance or non-conformance with specifications" —
  defines the guard band: a part that measures within tolerance but within the measurement uncertainty of the
  limit is CONDITIONALLY conforming. The guard band = U (expanded uncertainty, k=2, 95% coverage). For a
  ±0.005" positional tolerance, if the CMM's expanded uncertainty U = 0.002", the acceptance zone shrinks
  to ±0.003". The VLM-extracted tolerance value + the CMM's known U → automated pass/fail decision logic.
- **ISO 14253-2:2011** "Guidance for the estimation of uncertainty in GPS measurement" — the procedure for
  computing U from systematic + random error sources (thermal, probing, software, datum referencing).
- **ISO 10360 series** (ISO 10360-2:2009, 10360-5, 10360-6, 10360-10) — CMM performance tests (volumetric
  error E, probing dispersion R); these are the numbers a shop's CMM spec sheet quotes. They directly bound
  the minimum measurable tolerance.
- **VDI/VDE 2617** — German metrology guideline for CMM verification; common in JM Die's supplier base
  (European machine tools).

**What this adds for PRISM xray:** every extracted tolerance feeds a "measurability gate" — is this tolerance
tighter than our CMM can verify? If extracted positional tolerance = 0.002" and CMM U = 0.0015", the feature
is at the measurement limit → flag for optical/CT or 100% inspection note. This closes the loop between
blueprint-vision (extraction) and quality (inspection planning). HONEST: this is a design direction for PRISM
xray Phase-4+; not yet implemented.

**Sources:** ISO 14253-1:2017; ISO 14253-2:2011; ISO 10360-2:2009; VDI/VDE 2617 (Verein Deutscher Ingenieure);
ASME B89.7.3.1-2001 (Guidelines for Decision Rules: Considering Measurement Uncertainty in Determining
Conformance to Specifications — the ASME parallel to ISO 14253).

---

### 4. Legacy / Pre-1995 Engineering Drawing OCR (ANSI Y14.5M-1982, MIL-STD-8, Diazo/Vellum Repair)

JM Die's archive (24,545+ files, 100+ customers) almost certainly contains drawings from before CAD was
standard. Legacy drawings introduce unique challenges that modern VLM fine-tuning must address separately.

**Distinct failure modes vs. modern CAD-plotted drawings:**
- **Diazo/blueprint reproduction artifacts**: faded lines, blue/purple-shifted backgrounds, non-uniform line
  weight, halos around lettering. Standard VLMs trained on PDF/CAD plots fail on these.
- **Hand-lettered text (Gothic engineering lettering)**: pre-1980s drawings used Leroy lettering templates or
  freehand Gothic; character spacing is irregular; "7" vs "1", "0" vs "Ø" are ambiguous.
- **ANSI Y14.5M-1982 + ANSI Y14.5M-1994 symbology differences**: the perpendicularity symbol changed; some
  legacy runout conventions differ from Y14.5-2018. The recognizer must handle multiple-generation symbol sets.
- **MIL-STD-8 / MIL-D-1000**: US military drawing standards (pre-ASME consolidation). Symbol sets + note
  conventions differ from commercial ASME practice. ASME Y14.2-2014 (Line Conventions and Lettering) is the
  modern standard; older drawings used ANSI Y14.2M-1992 and predecessors.
- **Microfilm digitization artifacts**: scanning from microfilm introduces noise, rotation, loss of thin lines.

**Artifact repair techniques (R12-tempered — these are real techniques, performance numbers are hypotheses):**
- **Adaptive thresholding** (Otsu, Niblack, Sauvola) over global thresholding — handles uneven illumination
  from diazo copies. Sauvola (1999) is the standard reference: Sauvola & Pietikäinen, "Adaptive document image
  binarization" (Pattern Recognition, 2000).
- **Line-weight normalization** via morphological operations (dilation/erosion with structure elements sized to
  the drawing's nominal line weight — ASME Y14.2 defines thin/wide/extra-wide line conventions).
- **GAN-based line recovery**: Pix2Pix (Isola et al., CVPR 2017) trained on degraded/clean pairs for line
  thickening and gap repair. Pix2PixHD (Wang et al., CVPR 2018) for higher resolution. HYPOTHESIS: performance
  on real diazo corpora is uncharacterized in published literature — treat as a design direction.
- **Data sources (web-verify targets):** NASA technical drawing archives (some public via NTRS), USAF Technical
  Order declassified collection, British Standards Institution BS 308 legacy. These were named by Hermes;
  actual public accessibility requires web verification before citing as training data.

**What this adds for PRISM xray:** the JM Die archive's oldest drawings are the highest-risk for OCR failure
and the most valuable for institutional knowledge recovery. A dedicated legacy-OCR preprocessing stage (before
the VLM ensemble) — adaptive binarization + line normalization — would improve coverage of the archive without
requiring a different VLM fine-tune for every era.

**Sources:** ANSI Y14.5M-1982 (superseded but needed for legacy interp.); ASME Y14.5-2018; ASME Y14.2-2014;
MIL-STD-8C (US military drawing standard); Sauvola & Pietikäinen, Pattern Recognition 2000 (adaptive
binarization); Isola et al., CVPR 2017 (Pix2Pix); Wang et al., CVPR 2018 (Pix2PixHD).

---

## Wiring / consumers (R15)

**GALAXY:** `mcp-server/src/engines/blueprint-vision/` (xray). All 4 sub-domains wire to:
- **delta** (CAD reconstruction): DRF analysis + VC/RC → feature constraints for STEP/solid reconstruction
- **quality** (`mcp-server/src/engines/quality/`): metrology guard-band (ISO 14253) + stack-up criticality →
  CMM inspection plan generation; tolerance feasibility gate
- **quoting** (`mcp-server/src/engines/quoting/`): stack-up WC/RSS → manufacturability check; VC/RC → fit
  analysis; legacy-drawing recovery → more quotes from archive prints
- **xray OCR training loop** (`scripts/blueprint-ocr-training-loop.mjs`): legacy preprocessing stage inserts
  before the VLM ensemble call; gold-label expansion from the JM archive's historical prints
- **physics constants**: NO cutting physics in this galaxy — import from `mcp-server/src/physics/constants.ts`
  only if a future metrology-uncertainty formula needs physical constants (e.g., thermal expansion α)

**Dispatcher consumers:** `prism_cad` (blueprint→CAD), `prism_cam` (blueprint→CAM setup), `prism_quality`
(tolerance→inspection plan). The tolerance stack-up engine would add a new action to `prism_quality` or a
dedicated `prism_blueprint` dispatcher (check `DISPATCHER_DIGEST.md` before creating).

---

## Next (Phase-5, honestly scoped)

Phase-4 established the MATHEMATICAL and METROLOGY layer above FCF parsing. Phase-5 candidates:
- **3D CAD reconstruction from 2D multi-view**: given the full orthographic view set + all extracted dims/GD&T,
  reconstruct the solid. This is a research-frontier problem (PolyGen, Point-E, CSG-Net approaches);
  PRISM-xray-specific: constrained by the JM Die part-family domain (die/punch/insert geometries).
- **View classification and correspondence**: automatically labeling which view is front/top/side/section/detail
  and correspondencing dimensions across views to the same 3D feature. ISO 128-30/34/44 (orthographic
  projection rules) provides the grammar.
- **BOM / balloon linkage to 3D assembly**: balloon numbers on the drawing → BOM item → sub-component; enables
  full assembly-level tolerance stack on the complete mechanical assembly.
- **Verification target**: run the NIST MBE (Model-Based Enterprise) PMI dataset against PRISM's FCF recognizer
  as a ground-truth benchmark (the dataset includes annotated 3D PMI that can be projected to 2D for OCR eval).

---

## Sources

- ASME Y14.5-2018 (GD&T standard)
- ASME Y14.5.1-2019 (Mathematical GD&T companion — the equations)
- ASME Y14.2-2014 (Line Conventions and Lettering)
- ASME B89.7.3.1-2001 (Decision Rules + Measurement Uncertainty)
- ISO 1101:2017 (GD&T, international)
- ISO 2692:2021 (MMR/LMR — bonus tolerance)
- ISO 5459:2011 (Datums and datum systems)
- ISO 14253-1:2017 (Conformance decision rules + guard band)
- ISO 14253-2:2011 (Measurement uncertainty estimation, GPS)
- ISO 10360-2:2009 (CMM volumetric performance)
- VDI/VDE 2617 (CMM verification, German metrology)
- ANSI Y14.5M-1982 (legacy GD&T symbology)
- MIL-STD-8C (US military drawing standard)
- Fischer, "Mechanical Tolerance Stackup and Analysis" 2nd ed. (CRC Press, 2011)
- Drake, "Dimensioning and Tolerancing Handbook" (McGraw-Hill, 1999)
- Madsen & Madsen, "Geometric Dimensioning and Tolerancing" 7th ed. (Goodheart-Willcox, 2021 — web-verify)
- McKay, Beckman, Conover, "A Comparison of Three Methods..." Technometrics (1979) — Latin Hypercube Sampling
- Sauvola & Pietikäinen, "Adaptive document image binarization" Pattern Recognition (2000)
- Isola et al., "Image-to-Image Translation with Conditional Adversarial Networks" CVPR (2017) — Pix2Pix
- Wang et al., "High-Resolution Image Synthesis and Semantic Manipulation with Conditional GANs" CVPR (2018) — Pix2PixHD
- NIST MBE (Model-Based Enterprise) PMI dataset — web-verify current release URL
- NASA NTRS technical drawing archive — web-verify public accessibility
- Planner: Hermes (xAI Grok, :8645), tempered per R12. "GD&T-SchemaNet 2024" (Hermes-named) NOT cited — not a verifiable published paper. Boeing/Sandvik corpora NOT cited — not publicly accessible.
