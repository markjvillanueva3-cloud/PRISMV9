---
name: reference_quoting_phase4_deep_2026_06_13
description: "Quoting (charlie) Phase-4 deep anchor — Hermes-planned, R12-tempered. The 4 deeper sub-domains: (1) Parametric CERs + public cost-index calibration (BLS PPI PCU3335/332721, ISPA/ICEAA Handbook 4th Ed 2012, NASA CEH 2020); (2) Tolerance-cost tradeoff models (exponential Cost=A·e^(-B·T) and reciprocal Cost=A+B/T^C; Chase et al. 1990; ASME Y14.5-2018 link); (3) Multi-level Activity-Based Costing rigour (Kaplan & Cooper 1998; feature/batch/product/facility driver hierarchy; idle-capacity variance); (4) Target Costing / Design-to-Cost working backward from market price (Kato 1993; Tanaka 1989; Ansari et al. 1997; SAE J2081). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.142Z
aliases: reference_quoting_phase4_deep_2026_06_13
---


**Context:** Phase-4 anchor for the quoting galaxy (charlie). Deepens:
- [[reference_quoting_shouldcost_dfma_margin_2026_06_13]] (Phase-2: should-cost backbone, DFMA, Wright's law, cycle-time link)
- [[reference_quoting_phase3_probabilistic_margin_2026_06_13]] (Phase-3: Bayesian hierarchical cost regression, MC margin simulation P10/P50/P90, expected-profit-max bid, self-improving loop)

Planned by Hermes (xAI Grok, port :8645, responded ok), tempered per R12 (fabricated "databases" stripped; proprietary tool refs marked; uncertain source adaptations flagged).

---

## The deeper increments (4 sub-domains)

### 1. Parametric Cost Estimating Relationships (CERs) + Public Cost-Index Calibration

**What it adds:** Phase-2/3 use Boothroyd-Dewhurst tables and historical job actuals as cost inputs. This layer adds *systematic calibration of those inputs against public macro-economic cost indices*, and formalises the CER methodology so cost models are auditable, updateable, and explainable to customers (important for government/aerospace contracts).

**Named models and equations:**
- **Cost Estimating Relationship (CER):** `Cost = a · X1^b1 · X2^b2 · … · ε` where Xi are cost drivers (cycle time, material weight, tolerance complexity factor, lot size) and ε is a log-normal residual. Calibrate via OLS on log-transformed actuals; report SE and R² on the calibration set. Standard form from ISPA/ICEAA canon.
- **Complexity Factor (CF) overlay:** a multiplicative scalar (1.0 = baseline; >1 = harder than baseline) applied per part family, material, or tolerance band. CF is the bridge between the CER and Boothroyd-Dewhurst feature-time tables.
- **Escalation / de-escalation:** adjust historical cost observations to a common base year using `Cost_current = Cost_base × (Index_current / Index_base)`. The index to use for machine-shop labour + overhead is the **BLS Producer Price Index, PCU3335** (Machine Shops) or **PCU332721** (Precision Turned Product Mfg) — both are real, quarterly public series from BLS.gov.

**Canonical sources (real, named):**
- *ISPA Parametric Estimating Handbook*, 4th Ed., International Society of Parametric Analysts / ICEAA, 2012. The canonical text for CER development, regression, uncertainty quantification, and cross-validation of parametric models.
- *NASA Cost Estimating Handbook (CEH)*, Volume 2: Parametric Estimating, NASA HQ, 2020. Free public PDF; covers CER forms, normalization, analogy, and uncertainty treatment. Most relevant chapters: §4 (parametric), §6 (uncertainty).
- BLS.gov: PPI Industry Data → PCU3335 (Machine Shops), PCU332721 (Precision Turned Parts). Real quarterly public index.
- *MIL-HDBK-881C*, DoD Work Breakdown Structures for Defense Materiel Items (2011). The WBS decomposition that parametric models are built against in defence contracts — relevant when charlie quotes AS9100/ITAR parts.

**Web-verify target:** Confirm current PCU3335 base year (2012=100) and most-recent quarter value before inserting into any live escalation calc.

---

### 2. Tolerance-Cost Tradeoff Models (linking ASME Y14.5 specs to quoting)

**What it adds:** Phase-2 captures DFMA at the feature level; Phase-3 adds probabilistic cost distributions. This layer adds the *tolerance dimension*: tighter tolerances cost exponentially more, and the relationship is quantified. This feeds DFM feedback (delta galaxy: "relax this tolerance by 0.001″ → saves $X/part") and lets charlie quote a tolerance-sensitivity surface, not just a point price.

**Named equations (real, documented in tolerance engineering literature):**
- **Exponential tolerance-cost model:** `C(T) = A · e^(-B · T)` where T is the tolerance band (half-range, inches or mm), A is a scale factor (base machining cost), B is a process-sensitivity exponent. Tighter T → higher C nonlinearly. A and B are process-specific (turning vs milling vs grinding vs EDM).
- **Reciprocal-power model:** `C(T) = A + B / T^n` where n ≈ 1–2 for milling; n ≈ 2–3 for grinding; n → ∞ for lapping/superfinish. This is the more widely used form in aerospace CNC literature; it better captures the "floor cost" at loose tolerances (the A term).
- **Tolerance-cost sensitivity:** `dC/dT = -n · B / T^(n+1)` — the marginal cost of tightening by ΔT. Use this to rank GD&T callouts by cost impact and surface the highest-ROI relaxations to the designer (value-engineering feedback loop).
- **ASME Y14.5-2018 link:** tolerance type (size / form / position / runout / profile) maps to a different process tier and therefore a different (A, B, n) coefficient set. True position ±0.001″ on a bore → precision boring/honing tier; same feature at ±0.005″ → finish milling tier. The tier determines the machine-rate and the tolerance-cost curve branch.

**Canonical sources:**
- Chase, K.W. & Greenwood, W.H. (1988). "Design issues in mechanical tolerance analysis." *Manufacturing Review* 1(1). [Note: Hermes cited 1990; 1988 is the earlier publication — web-verify exact year before citation in deliverables.]
- Ngoi, B.K.A. & Ong, C.T. (1999). "Product and process cost estimation during design stage using tolerance charts." *International Journal of Advanced Manufacturing Technology*, 15(4), 281–286.
- Chase, K.W. (1999). *Tolerance Analysis of 2-D and 3-D Assemblies*. ADCATS Report 99-4, Brigham Young University. Free public PDF; contains the reciprocal-power coefficients by process.
- ASME Y14.5-2018. *Dimensioning and Tolerancing*. ASME standard (purchased). The tolerance specification standard that the cost-curve parameters must be keyed to.

**Application in PRISM:** delta (AFR engine) recognises tolerance callouts per feature → passes (feature_type, tolerance_value, surface_roughness) to charlie → charlie looks up the (A, B, n) coefficient for that process tier and computes C(T) → quote line-item includes tolerance surcharge. Also generates the `relax_tolerance_savings` DFM suggestion.

---

### 3. Multi-Level Activity-Based Costing (ABC) Rigour

**What it adds:** Phase-2 uses a simple burden rate ($/hr overhead allocation). This layer replaces burden-rate with *driver-based overhead allocation*, which reveals true profitability per job type, customer, and machine — critical for identifying which jobs to bid aggressively vs. which to price high (or decline).

**The four ABC cost driver levels for a machine shop (Kaplan & Cooper hierarchy):**
- **Unit level:** resources consumed per piece (cutting energy, coolant, insert wear). Driver: cycle time.
- **Batch level:** setup, inspection, first-article, NC program load. Driver: lot count (not piece count). A 1-pc prototype bears the full batch cost; a 1000-pc run amortises it. This is where NRE/qty-break curves in Phase-2 come from — but ABC makes the driver explicit and auditable.
- **Product/family level:** fixtures, dedicated tooling, engineering support per part number. Driver: active part numbers.
- **Facility level:** building, insurance, IT, management. Driver: machine-hour floor-space allocation.

**Named equation — ABC unit cost:**
`Unit_Cost = Σ_k (Resource_k / Driver_k) × Driver_consumption_k_per_unit`
where k indexes the four levels. This replaces the single burden rate with four separate rates, each driven by what actually causes that cost.

**Idle capacity variance:**
`Idle_Capacity_Cost = (Practical_Capacity - Actual_Volume) × Rate_per_unit_capacity`
This surfaces the cost of under-utilisation — critical for pricing decisions: when machines are idle, contribution-margin pricing (price > variable cost) is better than full-absorption pricing. ABC makes this visible; burden-rate hides it.

**Canonical sources:**
- Kaplan, R.S. & Cooper, R. (1998). *Cost & Effect: Using Integrated Cost Systems to Drive Profitability and Performance*. Harvard Business School Press. The canonical ABC text; Chapter 4 covers the four-level hierarchy; Chapter 8 covers idle-capacity variance.
- Turney, P.B.B. (1991). *Common Cents: The ABC Performance Breakthrough*. Cost Technology. The practitioner introduction to ABC; useful for operator-facing explanations.
- Johnson, H.T. & Kaplan, R.S. (1987). *Relevance Lost: The Rise and Fall of Management Accounting*. Harvard Business School Press. The critique of traditional burden-rate accounting that motivates ABC.
- AIAG MSA-4 (Measurement Systems Analysis, 4th Ed., 2010) — for cost-of-quality measurement (the "appraisal cost" and "internal failure cost" inputs to ABC at the batch level).

**Application in PRISM:** hotel galaxy owns ERP actuals; charlie's ABC layer reads hotel's job-cost actuals and fits the four-level rates. The idle-capacity rate feeds pricing strategy: when utilisation < 70%, charlie recommends contribution-margin floor pricing; when utilisation > 90%, it recommends premium (capacity-constrained) pricing.

---

### 4. Target Costing / Design-to-Cost (working backward from market price)

**What it adds:** Phases 1-3 are all *forward* cost models: estimate cost → add margin → arrive at price. Target costing inverts this: *market price is given* (competitive intelligence), the required margin is subtracted to yield the *allowable cost*, and engineering + quoting work backward to hit it. This is the missing loop for price-competitive markets.

**The target costing equation:**
`Allowable_Cost = Target_Selling_Price - Required_Profit_Margin`
`Cost_Gap = Current_Cost_Estimate - Allowable_Cost`

The cost gap drives value-engineering: which features/tolerances/materials/processes can be changed to close the gap? PRISM's DFM layer (delta) is the natural vehicle.

**Genka Kikaku (Japanese target costing discipline):**
- Developed at Toyota in the 1960s; formalized in academic literature by Tanaka (1989) and Kato (1993).
- Key distinction from Western "cost-plus": target cost is set *before* design is frozen, not after. The quote is a design constraint, not a post-hoc calculation.
- **Value Engineering (VE) matrix:** rows = functions the part must perform; columns = components/features; cells = cost × function contribution. High-cost, low-function cells are VE targets.

**Named standards and sources:**
- Tanaka, M. (1989). "Cost Planning and Control Systems in the Design Phase of a New Product." In Monden & Sakurai (Eds.), *Japanese Management Accounting*. Productivity Press. The canonical academic source for Genka Kikaku.
- Kato, Y. (1993). "Target costing support systems: lessons from leading Japanese companies." *Management Accounting Research*, 4(1), 33–47. The paper that introduced target costing to Western management accounting literature.
- Ansari, S., Bell, J., et al. (1997). *Target Costing: The Next Frontier in Strategic Cost Management*. Irwin/McGraw-Hill (CAM-I target costing consortium). The Western practitioner standard; includes the VE matrix method.
- SAE J2081 (Value Analysis and Engineering Methodology, automotive). The SAE standard for systematic value engineering — applies function/cost decomposition directly to machined components.
- **Design-to-Cost (DTC)** — the US DoD variant: MIL-HDBK-337 (Design to Cost, 1983, cancelled but widely cited) + DAU (Defense Acquisition University) DTC guidebook (public). DTC mandates cost as a design parameter alongside performance and schedule.

**Application in PRISM:** charlie receives a target price from the customer (or estimates competitive market price from BLS PPI + regional rate intelligence) → computes allowable cost → compares to Phase-2 should-cost estimate → outputs cost_gap → if gap > 0, triggers the DFM suggestion pipeline (delta: "relax tolerance on feature X", "switch material to Y", "combine operations Z1+Z2") → requotes → iterates until gap ≤ 0 or job is declined. This is the closed-loop target-costing controller.

---

## Wiring / consumers (R15)

- **GALAXY:** `mcp-server/src/engines/quoting/` (charlie). These sub-domains extend existing engines or add new ones:
  - CER calibration → new `QuoteCERCalibratorEngine` (reads hotel actuals, fits log-linear CER, outputs (a, b_i) coefficients + R²); wired to `prism_quoting:cer_calibrate` action.
  - Tolerance-cost curves → new `ToleranceCostEngine` (inputs: feature_type, tolerance_T, process_tier; outputs: C(T), dC/dT, relax_savings); wired to `prism_quoting:tolerance_cost` action; consumed by delta (AFR → DFM feedback) and by the main quote assembler.
  - ABC rates → new `ActivityBasedCostEngine` (reads hotel's four-level driver actuals, outputs per-level rates + idle-capacity rate); wired to `prism_quoting:abc_rates` action; replaces the flat burden rate in the should-cost backbone.
  - Target costing controller → new `TargetCostingEngine` (inputs: target_price, required_margin, current_estimate; outputs: cost_gap, VE_suggestions ranked by gap-close potential); wired to `prism_quoting:target_cost` action; consumed by delta (DFM) and the quote UI (frontend-app / quebec).
- **Cross-galaxy dependencies:**
  - hotel (ERP actuals) → CER calibration inputs + ABC driver actuals
  - delta (AFR feature recognition) → tolerance_T per feature → ToleranceCostEngine
  - oscar/kilo (cycle-time + toolpath) → unit-level ABC driver
  - frontend-app (quebec) → exposes cost_gap + VE suggestions in the quote UI
- **NEVER inline physics/material constants** — import from `mcp-server/src/physics/constants.ts`. Tolerance-cost (A, B, n) coefficients are empirical shop calibration data, not physics constants — store in `mcp-server/data/registries/tolerance-cost-coefficients.json` (keyed by process_tier + material_class).

---

## Next (Phase-5, honestly scoped)

1. **CER validation:** fit the log-linear CER on JM Die historical job actuals (from hotel); compute R², prediction intervals, and LOOCV error. Report calibration quality honestly — if R² < 0.7, the model needs more cost drivers or data segmentation.
2. **Tolerance-cost coefficient calibration:** collect (tolerance_achieved, cycle_time, process_tier) triplets from JM actuals → fit (A, B, n) per process tier. Flag: this requires enough jobs with known achieved tolerances to be statistically meaningful; if data is sparse, use literature values from Chase (1999) with explicit uncertainty.
3. **ABC rate fitting:** read hotel's four-level driver actuals and fit the four rates; compute idle-capacity variance for the JM VMC fleet. Validate: does ABC + idle-capacity pricing explain historical win/loss patterns better than burden-rate pricing?
4. **Target-costing pilot:** run the target-costing loop on 3-5 representative historical JM quotes where actual win/loss is known; validate that the VE suggestions would have closed the cost gap on the lost jobs.

---

## Sources

- *ISPA Parametric Estimating Handbook*, 4th Ed., ICEAA, 2012.
- *NASA Cost Estimating Handbook*, Vol. 2: Parametric Estimating, NASA HQ, 2020. [public PDF]
- BLS Producer Price Index, PCU3335 (Machine Shops) and PCU332721 (Precision Turned Products). BLS.gov.
- *MIL-HDBK-881C*, DoD Work Breakdown Structures, 2011.
- Chase, K.W. & Greenwood, W.H. (1988). "Design issues in mechanical tolerance analysis." *Manufacturing Review* 1(1). [Web-verify: Hermes cited 1990; verify exact year.]
- Chase, K.W. (1999). *Tolerance Analysis of 2-D and 3-D Assemblies*. ADCATS Report 99-4, BYU. [public PDF]
- Ngoi, B.K.A. & Ong, C.T. (1999). "Product and process cost estimation during design stage using tolerance charts." *Int. J. Adv. Manuf. Technol.* 15(4).
- ASME Y14.5-2018. *Dimensioning and Tolerancing*. ASME (purchased standard).
- Kaplan, R.S. & Cooper, R. (1998). *Cost & Effect*. Harvard Business School Press.
- Turney, P.B.B. (1991). *Common Cents: The ABC Performance Breakthrough*. Cost Technology.
- Johnson, H.T. & Kaplan, R.S. (1987). *Relevance Lost*. Harvard Business School Press.
- AIAG MSA-4, Measurement Systems Analysis, 4th Ed., 2010.
- Tanaka, M. (1989). "Cost Planning and Control Systems in the Design Phase." In Monden & Sakurai (Eds.), *Japanese Management Accounting*. Productivity Press.
- Kato, Y. (1993). "Target costing support systems: lessons from leading Japanese companies." *Management Accounting Research* 4(1), 33–47.
- Ansari, S., Bell, J., et al. (1997). *Target Costing: The Next Frontier in Strategic Cost Management*. CAM-I / Irwin.
- SAE J2081 (Value Analysis and Engineering Methodology).
- **Planner:** Hermes (xAI Grok, :8645, responded ok), tempered per R12 (stripped: "Machining.com pricing DB", "ThomasNet RFQ clearing prices" — not real public databases; SEER-MFG/PRICE-H noted as proprietary commercial tools, not open sources; ISO 15686-5 building adaptation to machined parts flagged as hypothesis not established practice; Chase year flagged for web-verify).
