---
title: Business Foundations — OEE, job costing, quote margin, capacity planning, Theory of Constraints
galaxy: business
owner_slot: hotel
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09)"
verification_method: institutional/method facts WebFetch-confirmed against primary sources (Lean Production, TOC Institute, inFlow, Accounting For Management, NIST MEP); specific dollar figures + worked-example numbers that were NOT on the fetched page were left owner-gated in _staging
tags: [business, erp, oee, job-costing, overhead, quote-margin, capacity-planning, theory-of-constraints, nist-mep]
---

# Business Foundations

The domain-knowledge spine for the **business** galaxy: how PRISM should measure equipment effectiveness, cost a job, price a quote, plan capacity, and reason about bottlenecks. Promoted from the deep-domain research packet (`knowledge/wiki/business/_staging/deep-domain-research-2026-06-09.md`) after papa verified the institutional + method facts against primary sources via WebFetch.

**What is promoted here is WebFetch-CONFIRMED** — each claim below was confirmed by actually fetching the cited source page on 2026-06-09. **Specific dollar rates, control limits, and worked-example numbers that did NOT appear on the fetched page were left UNVERIFIED in `_staging/` for hotel** (see `## Owner-gate (NOT promoted)`).

## 1. Overall Equipment Effectiveness (OEE) — method

**CONFIRMED** against [Lean Production — OEE](https://www.leanproduction.com/oee/):
- OEE is the product of three factors: **`OEE = Availability x Performance x Quality`.**
- **Availability** accounts for Availability Loss — all events that stop planned production for an appreciable length of time.
- **Performance** accounts for Performance Loss — all factors that cause the asset to run slower than its maximum possible speed (including slow cycles and small stops).
- **Quality** accounts for Quality Loss — it factors out manufactured pieces that do not meet quality standards.
- The three factor-equations reduce algebraically to the basic form: `OEE = (Good Count x Ideal Cycle Time) / Planned Production Time`.

**Design implication for business:** any PRISM OEE engine must compute the three factors multiplicatively (not an average) and source each from its own loss class. The reduced `(Good Count x Ideal Cycle Time) / Planned Production Time` form is the single-input check.

## 2. Job costing & overhead allocation — method

**CONFIRMED** against [Accounting For Management — Predetermined Overhead Rate](https://www.accountingformanagement.org/predetermined-overhead-rate/):
- **Predetermined Overhead Rate = Estimated Manufacturing Overhead Cost / Estimated Total Units in the Allocation Base**, computed at the start of the period (before actual costs are known).
- Common allocation bases listed by the source: **direct labor hours, direct labor dollars, machine hours, and direct materials cost.**
- Source worked example (CONFIRMED on page): estimated overhead **$16,000 / 4,000 direct labor hours = $4.00 per direct labor hour.**

**Design implication for business:** a multi-machine job shop should pick its allocation base from the source's list (labor-hours/labor-dollars/machine-hours/materials-cost) to match its cost driver; the rate is computed once at period start, then applied per job.

## 3. Quote margin & pricing — method

**CONFIRMED** against [inFlow — Margin vs Markup](https://www.inflowinventory.com/blog/calculate-margin-vs-markup/):
- **Markup % = (Selling Price - Cost) / Cost.**
- **Margin % = (Selling Price - Cost) / Selling Price.**
- The two share the numerator (price - cost) but differ in denominator (cost vs price), so for the same transaction margin is always lower than markup. The source's confirmed example is Archon Optical sunglasses at cost $18 / price $36 = 100% markup.

**Design implication for business:** any PRISM quote engine must keep markup and margin distinct — applying a target *margin* percent as if it were a markup overprices/underprices the quote. (The exact "price for target margin = Cost / (1 - margin)" identity and the cost $100/price $125 example were NOT on this page — see owner-gate.)

## 4. Theory of Constraints (Goldratt) — method

**CONFIRMED** against [TOC Institute — Five Focusing Steps](https://www.tocinstitute.org/five-focusing-steps.html):
The Five Focusing Steps (POOGI — Process Of On-Going Improvement), in the source's exact wording:
1. **IDENTIFY the system's constraint.**
2. **EXPLOIT the constraint** (get the most out of it without new spend).
3. **SUBORDINATE everything else to the constraint.**
4. **ELEVATE the constraint** (invest to add capacity).
5. **PREVENT INERTIA from becoming the constraint** (return to Step 1 — continuous improvement).

**Design implication for business:** a PRISM scheduling/capacity engine should gate job release at the constraint, not the order book, and re-run the five steps when the constraint moves (step 5). The packet flags a real R7 *conflict* between Throughput Accounting and the predetermined-overhead full-absorption model in section 2 — surface it, do not blend; that conflict note stays owner-gated for hotel.

## 5. Government / institutional support (NIST MEP)

**CONFIRMED** against [NIST — Manufacturing Extension Partnership (MEP)](https://www.nist.gov/mep):
- MEP is a **public-private partnership** that helps **small and medium-sized manufacturers** grow, make operational improvements, and reduce risk.
- It is **administered by NIST** (U.S. Department of Commerce) and operates through **state-designated centers across all 50 states and Puerto Rico.**
- Stated scale on the page: **nearly 1,400 trusted manufacturing advisors/experts and more than 450 MEP service locations.**

**Design implication for business:** when a PRISM business engine must justify a capex (e.g. elevating a constraint per TOC step 4), NIST MEP + the NIST Applied Economics Office are the canonical free U.S. institutional resources to cite.

## Owner-gate (NOT promoted) — hotel verifies before any live engine/doctrine use

Left UNVERIFIED in `_staging/deep-domain-research-2026-06-09.md` because the specific number/figure did NOT appear on the page I fetched, or the claim is a numeric/benchmark/jurisdiction-specific value that needs a primary source hotel must confirm:

- **OEE "world class = 85%" benchmark + its 90% x 95% x 99% decomposition + the 60% cross-industry average + the 40-60% range** (packet facts 2-4). These are benchmark numbers from secondary blogs (LeanWorx/Tractian/Symestic), not confirmed against a primary TPM/Nakajima source. JM Die is a high-mix job shop; the 60-70% comparator note is advisory, not verified.
- **Six Big Losses exact mapping** (packet fact 5) — attributed to Nakajima's *Introduction to TPM* (1988) but not fetched; leave to hotel.
- **Predetermined-overhead worked example $1,140,000 / 38,000 DLH = $30/DLH** (packet fact 8) — NOT on the fetched page (the page used $16,000 / 4,000 = $4). The *formula* is confirmed; this specific number is not.
- **Overhead-rate survey "~34% plant-wide / ~44% departmental / remainder ABC"** (packet fact 10) — a cited survey statistic, not confirmed on page; gated.
- **Target-margin formula `Selling Price = Cost / (1 - target margin)`, the cost $100/price $125 = 25% markup/20% margin example, and the markup<->margin conversion identities** (packet facts 11-12) — NOT shown on the fetched inFlow page; the two core formulas (markup, margin) ARE confirmed, these specific derivations are not.
- **BLS ECEC labor-cost numbers** ($46.15/hr total comp, $32.36 wages / $13.79 benefits, 70.1%/29.9% split — packet fact 13). Quarterly-release dollar figures; hotel must confirm against the current BLS ECEC release before any quote engine burdens labor at these rates.
- **Capacity worked example** (4 machines x 2 shifts x 8h x 5d = 320 h/wk; 320 x 0.90 x 0.95 = 273.6 h/wk — packet fact 14) and the **RCCP horizon/method specifics** (packet fact 15) — not fetched; the capacity *formula shape* (Total scheduled machine-hours x Utilization x Efficiency) is plausible but the example numbers are owner-gated.
- **NIST MEP cumulative-impact figures** ($60.0B new sales, $26.2B cost savings, 77,409 manufacturers, the 3.4-16% Census productivity finding — packet fact 22). These were NOT on the `/mep` page I fetched (it pointed to a separate FY-impact infographic). The institutional *description* is confirmed; these dollar/manufacturer counts are gated to the separate impact source.
- **Any physics/cutting constant** — n/a for this galaxy: the business packet contains NO cutting/physics constants (kc1.1, Taylor, Johnson-Cook, etc.), so there were no safety constants to gate. All gated items are accounting/benchmark/jurisdiction numbers, not machine-safety constants.

## 6. Management as a discipline — what managers actually do (free textbook)

**CONFIRMED** against [OpenStax — Principles of Management, Ch. 1 Introduction](https://openstax.org/books/principles-management/pages/1-introduction) (OpenStax / Rice University):
- Traditional management textbooks describe managers as engaging in **"planning, organizing, staffing, directing, coordinating, reporting, and controlling."**
- The OpenStax chapter explicitly *challenges* that framing — it states these activities **"do not, in fact, describe what managers do,"** and characterizes the real managerial world as **"a messy and hectic stream of ongoing activity."**
- The chapter frames the value of management knowledge as applying **across all career levels, from individual contributors to senior managers.**

**Design implication for business:** a PRISM business/ERP layer should NOT model the shop owner's day as a clean POSDCORB checklist. The canonical academic source itself warns that prescriptive function-lists diverge from observed managerial behavior — so dispatcher actions that "plan/schedule/report" are decision-support, not a model of the manager.

## 7. Manufacturing cost structure — the three cost categories (free textbook)

**CONFIRMED** against [OpenStax — Principles of Managerial Accounting, §2.1 (Merchandising vs Manufacturing vs Service)](https://openstax.org/books/principles-managerial-accounting/pages/2-1-distinguish-between-merchandising-manufacturing-and-service-organizations):
- **Direct Materials** = *"components used in the production process whose costs can be identified on a per item-produced basis"* (source example: an engine in car manufacturing).
- **Direct Labor** = *"production labor costs that can be identified on a per item-produced basis"* (source example: workers installing engines).
- **Manufacturing Overhead** = *"those costs incurred in the production process that are not economically feasible to measure as direct material or direct labor costs"* (source examples: manager salaries, factory utilities, adhesives).
- Manufacturing firms require a **Cost of Goods Manufactured statement before cost of goods sold** — a step retailers do not need — and must track **work-in-process inventory** at multiple production stages.

**Design implication for business:** this is the canonical taxonomy a PRISM job-costing engine must follow — **DM + DL are per-unit traceable; everything else is overhead** applied via the predetermined rate from §2. The page also justifies WIP tracking: a job-shop costing model that only carries finished-goods cost is incomplete by this source's definition.

## 8. Operations management curriculum — the topic spine (free college course)

**CONFIRMED** against [MIT OCW — 15.760A Operations Management (Spring 2002, Sloan), lecture notes](https://ocw.mit.edu/courses/15-760a-operations-management-spring-2002/pages/lecture-notes/), Prof. Charles H. Fine. The graduate course's lecture sequence (titles quoted verbatim from the page) defines the canonical scope of an operations-management body of knowledge:
- **"Inventory Management"**, **"Process Analysis Process Flow Models"**, **"Process Analysis Queueing Systems"**
- **"Process Quality Quality Tools and Philosophies"**, **"TQM Process Capability"**, **"Toyota Production System"**
- **"Process Quality Management of Constraints"** (the academic home of the TOC material in §4)
- **"Supply Chain Design"**, **"Supply Chain Management Postponement"**, **"Supply Chain Management Vendor-managed Inventory"**

**Design implication for business:** the operations-management galaxy is not just OEE + costing — this MIT topic list shows the full surface a "world-leader" business engine should eventually cover: process-flow models, queueing, process capability, TPS, postponement, and VMI. Use it as the coverage checklist.

## 9. Inventory & supply-chain theory — multi-echelon and EOQ (free college courses)

**CONFIRMED** against two MIT OCW graduate courses:

[MIT OCW — ESD.273J Logistics and Supply Chain Management (Fall 2009)](https://ocw.mit.edu/courses/esd-273j-logistics-and-supply-chain-management-fall-2009/), Prof. David Simchi-Levi. Course description (verbatim): *"This course surveys operations research models and techniques developed for a variety of problems arising in logistical planning of multi-echelon systems. There is a focus on planning models for production/inventory/distribution strategies in general multi-echelon multi-item systems."* Topics include **vehicle routing, dynamic lot-sizing inventory models, stochastic and deterministic multi-echelon inventory systems, the bullwhip effect, and pricing models.**

[MIT OCW — ESD.260J Logistics Systems (Fall 2006)](https://ocw.mit.edu/courses/esd-260j-logistics-systems-fall-2006/pages/lecture-notes/), Caplice/Sheffi. The inventory sequence is built around the **Economic Order Quantity (EOQ)**: lecture titles (verbatim) include *"Inventory management I: Level demand, EOQ, sensitivity"*, *"Inventory management II: EOQ extensions, discounts, exchange curves"*, *"Inventory management IV: Probabilistic demand, safety stock"*, and *"Inventory management VII: MRP and DRP systems"*.

**Design implication for business:** a PRISM inventory/material-stock engine has a primary-source academic spine — **EOQ** (deterministic level demand) extended to **discounts, time-varying demand, probabilistic demand with safety stock, and MRP/DRP**. Multi-echelon and the bullwhip effect are the supply-chain-wide concepts. The actual EOQ formula constants and any worked-number examples (order-quantity sqrt formula coefficients, safety-stock z-values) live in the lecture PDFs and are owner-gated until hotel fetches the specific note.

## 10. Statistical process control — control-chart theory (gov statistics reference)

**CONFIRMED** against [NIST/SEMATECH e-Handbook of Statistical Methods, §6.3.1 (What are Control Charts?)](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm) — a free U.S. government engineering-statistics reference:
- A **control chart** is used to *"routinely monitor quality"* and plots a single quality characteristic (univariate) or a statistic summarizing more than one (multivariate).
- **Control limits** are set so that *"almost all of the data points will fall within these limits as long as the process remains in-control."*
- The handbook distinguishes **"chance causes"** (normal/random process variation) from **"assignable causes"** (special variation). A process is only truly in-control when points are **both inside the limits AND randomly patterned** — *"if the plot looks non-random... there is still something wrong"* even with all points inside the limits.

**Design implication for business:** when the quality galaxy feeds the business galaxy (Cpk gates → scrap cost → quote margin), the control-chart contract is this NIST definition: in-control ≠ "all points inside limits" — the randomness test matters too. **Actual numeric control limits (the ±3-sigma coefficients, specific Cpk thresholds) are owner-gated** — this section confirms the *method*, not any limit value.

## 11. GAAP recognition principles — the accounting contract a costing engine sits on (free textbook)

**CONFIRMED** against [OpenStax — Principles of Financial Accounting, §3.1 (Principles, Assumptions, and Concepts)](https://openstax.org/books/principles-financial-accounting/pages/3-1-describe-principles-assumptions-and-concepts-of-accounting-and-their-relationship-to-financial-statements) (OpenStax / Rice University). The page gives these definitions verbatim:
- **Revenue Recognition Principle** — *"recognize revenue in the period in which it is earned; revenue is not considered earned until a product or service has been provided."*
- **Expense Recognition (Matching) Principle** — *"match expenses with associated revenues in the period in which the revenues were earned."*
- **Cost Principle** — *"virtually everything the company owns or controls (assets) must be recorded at its value at the date of acquisition."*
- **Full Disclosure Principle** — *"a business must report any business activities that could affect what is reported on the financial statements."*
- **Separate Entity Concept** — *"a business may only report activities on financial statements that are specifically related to company operations, not those activities that affect the owner personally."*
- **Conservatism** — *"if there is uncertainty in a potential financial estimate, a company should err on the side of caution and report the most conservative amount."*
- Plus the **Monetary Measurement Concept**, the **Going Concern Assumption** (*"a business will continue to operate in the foreseeable future"*), and the **Time Period Assumption** (information presented in *"shorter time periods, such as years, quarters, or months"*).

**Design implication for business:** the *matching principle* is the rule a PRISM job-costing/quote engine implicitly relies on — a job's material/labor/overhead cost must be recognized in the same period as the revenue from shipping that job, not when cash moves. The *cost principle* (record assets at acquisition value) is why a machine's depreciable basis — and thus the machine-hour overhead rate from §2 — is anchored to purchase price, not market value. The *conservatism* concept is the doctrine basis for erring toward the higher cost / lower margin estimate when a quote input is uncertain.

## 12. Human resource management — the employee life cycle (free textbook)

**CONFIRMED** against [OpenStax — Principles of Management, §11.1 (An Introduction to Human Resource Management)](https://openstax.org/books/principles-management/pages/11-1-an-introduction-to-human-resource-management) (OpenStax / Rice University):
- HRM provides value *"via its management of the overall employee life cycle that employees follow — from hiring and onboarding, to performance management and talent development, all the way through to transitions such as job change and promotion, to retirement and exit."*
- The page enumerates five HR responsibility areas (verbatim): **"Human resources compliance," "Employee selection, hiring, and onboarding," "Performance management," "Compensation rewards and benefits,"** and **"Talent development and succession planning."**

**Design implication for business:** a PRISM business/ERP HR surface should be modeled as a *life-cycle* (a state machine from hire → develop → transition → exit), not a flat employee table — and its five canonical capability domains are the OpenStax list. This is the source-grounded scope for any HR/labor module that feeds burdened-labor cost into the costing engine of §7.

## 13. Scientific management — the public-domain root of process standardization (public-domain text)

**CONFIRMED** against [Frederick W. Taylor, *The Principles of Scientific Management* (1911), via Project Gutenberg](https://www.gutenberg.org/cache/epub/6435/pg6435.txt):
- Taylor's stated principal object: *"The principal object of management should be to secure the maximum prosperity for the employer, coupled with the maximum prosperity for each employee."*
- His four duties of management, verbatim:
  1. *"They develop a science for each element of a man's work, which replaces the old rule-of-thumb method."*
  2. *"They scientifically select and then train, teach, and develop the workman, whereas in the past he chose his own work and trained himself as best he could."*
  3. *"They heartily cooperate with the men so as to insure all of the work being done in accordance with the principles of the science which has been developed."*
  4. *"There is an almost equal division of the work and the responsibility between the management and the workmen."*

**Design implication for business:** Taylor's "develop a science for each element of work, replacing rule-of-thumb" is the 1911 ancestor of everything PRISM does — replacing the machinist's rule-of-thumb feed/speed with a physics-derived value is *literally* duty #1. It is also the doctrinal warning behind duty #4: PRISM should *divide* work between system (the science/optimization) and operator (judgment/execution), not pretend the system replaces the operator. Cite this as the historical foundation when justifying standardization of any shop process.

## 14. Optimization & simulation for manufacturing decisions (free college course)

**CONFIRMED** against [MIT OCW — 15.066J System Optimization and Analysis for Manufacturing (Summer 2003, Sloan)](https://ocw.mit.edu/courses/15-066j-system-optimization-and-analysis-for-manufacturing-summer-2003/pages/syllabus/). The course aims to *"introduce modeling, optimization and simulation, as it applies to the study and analysis of manufacturing systems for decision support."* Its topic spine (from the syllabus): **linear programming and sensitivity analysis, network flow problems, integer and non-linear programming, Lagrange multipliers, static (Monte Carlo) and discrete-event simulation,** and spreadsheet-based modeling — applied to manufacturing process design, system-performance evaluation, and operations decision support.

**Design implication for business:** capacity planning, job scheduling, and machine-mix decisions in the business galaxy are *optimization* problems with a named academic toolkit — LP (with sensitivity analysis to know which constraint binds), integer programming for discrete machine/shift assignment, and discrete-event simulation for queueing/throughput under variability. This is the methodology layer beneath the capacity-formula shapes in §9/owner-gate, and it pairs with the TOC constraint logic of §4 (LP sensitivity analysis is the quantitative form of "identify the constraint").

## 15. Workplace safety as a managed program (gov reference)

**CONFIRMED** against [OSHA — Safety and Health Programs / Recommended Practices](https://www.osha.gov/safety-management) (U.S. Dept. of Labor). OSHA frames safety as a *managed program* with **seven core elements** (verbatim): **"Management Leadership," "Worker Participation," "Hazard Identification and Assessment," "Hazard Prevention and Control," "Education and Training," "Program Evaluation and Improvement,"** and **"Communication and Coordination for Host Employers, Contractors, and Staffing Agencies."** The page presents these as *"a step-by-step approach to implementing a safety and health program."*

**Design implication for business:** when a PRISM business engine touches scheduling, overtime, or a new process, the EHS dimension is not ad-hoc — OSHA's seven-element framework is the canonical free-and-authoritative structure for a shop's safety program. "Hazard identification and assessment" + "hazard prevention and control" are the two elements that intersect directly with PRISM's machining-safety gates (S(x), tool/holder/fixture checks); "education and training" + "program evaluation" are the management-system wrappers around them. Cite OSHA, not a vendor, for the safety-program contract.

> **NOTE on NIST §6.1 (below):** the already-cited §6.3.1 covers control-chart *definition*; §6.1 is a distinct page covering the *chapter framing* — the six questions a process-control program must answer (incl. "What to do if In Control but Unacceptable?" and "What is Process Capability?"). This is the SPC-program scope, not a re-cite of the control-chart definition.

## Sources (WebFetch-confirmed 2026-06-09)

- [Lean Production — OEE (Overall Equipment Effectiveness)](https://www.leanproduction.com/oee/)
- [Accounting For Management — Predetermined Overhead Rate](https://www.accountingformanagement.org/predetermined-overhead-rate/)
- [inFlow — Margin vs Markup: How to Calculate](https://www.inflowinventory.com/blog/calculate-margin-vs-markup/)
- [Theory of Constraints Institute — Five Focusing Steps (POOGI)](https://www.tocinstitute.org/five-focusing-steps.html)
- [NIST — Manufacturing Extension Partnership (MEP)](https://www.nist.gov/mep)

### Added 2026-06-09 (DEEPEN pass — untapped categories: free college courses, free textbooks, gov references)

- [OpenStax — Principles of Management, Ch.1](https://openstax.org/books/principles-management/pages/1-introduction) *(free textbook)*
- [OpenStax — Principles of Managerial Accounting, §2.1](https://openstax.org/books/principles-managerial-accounting/pages/2-1-distinguish-between-merchandising-manufacturing-and-service-organizations) *(free textbook)*
- [MIT OCW — 15.760A Operations Management (Spring 2002)](https://ocw.mit.edu/courses/15-760a-operations-management-spring-2002/pages/lecture-notes/) *(free college course)*
- [MIT OCW — ESD.273J Logistics and Supply Chain Management (Fall 2009)](https://ocw.mit.edu/courses/esd-273j-logistics-and-supply-chain-management-fall-2009/) *(free college course)*
- [MIT OCW — ESD.260J Logistics Systems (Fall 2006)](https://ocw.mit.edu/courses/esd-260j-logistics-systems-fall-2006/pages/lecture-notes/) *(free college course)*
- [NIST/SEMATECH e-Handbook of Statistical Methods, §6.3.1](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm) *(free U.S. government statistics reference)*

### Added 2026-06-10 (DEEPEN pass 2 — untapped categories: free textbooks, free college courses, public-domain text, gov references)

- [OpenStax — Principles of Financial Accounting, §3.1 (Principles, Assumptions, Concepts)](https://openstax.org/books/principles-financial-accounting/pages/3-1-describe-principles-assumptions-and-concepts-of-accounting-and-their-relationship-to-financial-statements) *(free textbook)*
- [OpenStax — Principles of Management, §11.1 (Human Resource Management)](https://openstax.org/books/principles-management/pages/11-1-an-introduction-to-human-resource-management) *(free textbook)*
- [Frederick W. Taylor — The Principles of Scientific Management (1911), Project Gutenberg](https://www.gutenberg.org/cache/epub/6435/pg6435.txt) *(public-domain text)*
- [MIT OCW — 15.066J System Optimization and Analysis for Manufacturing (Summer 2003)](https://ocw.mit.edu/courses/15-066j-system-optimization-and-analysis-for-manufacturing-summer-2003/pages/syllabus/) *(free college course)*
- [OSHA — Safety and Health Programs / Recommended Practices (seven core elements)](https://www.osha.gov/safety-management) *(free U.S. government reference)*
- [NIST/SEMATECH e-Handbook of Statistical Methods, §6.1 (Introduction to Process/Product Monitoring & Control)](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc1.htm) *(free U.S. government statistics reference — distinct chapter-framing page, not a re-cite of §6.3.1)*

## Cross-refs

- Packet (owner-gated specifics retained): `knowledge/wiki/business/_staging/deep-domain-research-2026-06-09.md`
- Galaxy doctrine: `mcp-server/src/engines/business/CLAUDE.md`
- Free-source corpus: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (business section)
- Sister exemplar: `knowledge/wiki/academy/academy-pedagogy-foundations.md`
