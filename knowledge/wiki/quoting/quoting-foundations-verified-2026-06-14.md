---
name: quoting-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the quoting galaxy (cost estimation & quoting — should-cost/DFMA, AACE estimate classes, pricing theory). 6 fetched sources. FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: quoting
  tier: VERIFIED
  verifiedBy: WebFetch
---

# quoting galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. Cost-engineering/pricing domain — numerics are financial rates, not cutting constants.

## Synthesis
Four pillars. **AACE RP 18R-97 estimate classification** (Class 5 ROM → Class 1 definitive) is the procurement maturity ladder governing how RFQ responses tier by accuracy + project definition — PRISM quote-confidence scoring should map to these classes so customers get calibrated expectations, not a single point estimate. **Boothroyd-Dewhurst DFMA should-cost** operationalizes process-based estimation (per-operation bottom-up costing: material, cycle time, tooling amortization, scrap) for transparent cost-driver decomposition → maps to PRISM's feature-recognition → operation-sequence → per-op cost → roll-up → margin. **NIST Manufacturing Cost Guide** anchors parametric models in publicly-verifiable NAICS-segmented benchmarks (labor/materials/energy/overhead) — external reference data for should-cost defensibility. **MIT Sloan 15.818 pricing** closes cost→price: economic value estimation (willingness-to-pay vs next-best alternative), elasticity (win-probability of a margin change), and NRE bundling across volume.

## Verified sources
### [Should-Cost Analysis — Boothroyd Dewhurst (DFMA.com)](https://www.dfma.com/should-cost-analysis.asp) — practitioner methodology
> "Should cost analysis is a strategic approach to reducing the prices paid for parts... by estimating the true manufacturing cost—then using that estimate to set realistic targets and negotiate with a shared, data-driven fact base."

**Knowledge:** Buyer-side discipline of independently estimating a supplier's true cost before negotiation; DFMA process-based cost models (machining, injection molding, sheet metal, die casting). Drivers: material, cycle time, tooling amortization, scrap.

### [Manufacturing Cost Estimation — Boothroyd Dewhurst (DFMA.com)](https://www.dfma.com/resources/manufacturing-cost-estimation.asp) — practitioner methodology
> "Process-based estimation models the actual manufacturing operations—so you can see exactly what drives cost and change it."

**Knowledge:** Three techniques — analogical (vs prior parts), parametric (cost = f(design params)), process-based/analytical (bottom-up per-operation). Process-based is most accurate + yields cost-driver transparency for DFMA redesign + negotiation.

### [New NIST Tool for Estimating Manufacturing Industry Costs](https://www.nist.gov/news-events/news/2020/01/new-nist-tool-estimating-manufacturing-industry-costs-beta-version) — government report
> "The 'Manufacturing Cost Guide'... estimates various manufacturing costs at the industry level using a combination of public data, survey data, and modeling."

**Knowledge:** Publicly-verifiable NAICS-segmented industry cost benchmarks (fabricated metal 332, machinery 333) — labor (SOC), materials, energy, overhead. Parametric priors PRISM quoting can consume; anchors should-cost defensibility.

### [AACE International — The Authority for Total Cost Management](https://web.aacei.org/) — professional standards body
> "Cost Engineering is the application of scientific principles and techniques to problems of estimation; cost control; business planning... profitability analysis..."

**Knowledge:** Global cost-engineering standards body (1956). RPs govern RFQ maturity: RP 18R-97 (5-class estimate system), RP 10S-90 (terminology), the TCM Framework (estimation + control + earned value).

### [Cost Estimate Classification System (AACE RP 18R-97)](https://epcland.com/cost-estimate-classification-system-for-process-industries/) — standards explanation
> "classifies estimates into five categories (Class 5 to Class 1) based primarily on the level of project definition"

**Knowledge:** Class 5 (0-2% definition, -50/+100%) ROM → Class 1 (65-100%, -10/+15%) definitive. Manufacturing: Class 3-4 = RFQ budgetary, Class 1-2 = firm fixed-price. PRISM quote-confidence should map to these.

### [MIT OCW 15.818 Pricing (Spring 2010, Sloan)](https://ocw.mit.edu/courses/15-818-pricing-spring-2010/pages/syllabus/) — university course
> "This course is designed to teach students how to price goods and services."

**Knowledge:** Economic value estimation (EVE — willingness-to-pay vs next-best alternative), price elasticity (competitive response), price customization (segmentation/versioning/bundling). Grounds margin decisions + NRE amortization.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._
