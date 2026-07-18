---
status: VERIFIED-PARTIAL
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
owner_slot: hotel
staged_by: papa-deepdomain-research
date: 2026-06-09
galaxy: business
focus: manufacturing ERP / cost / OEE — job costing, OEE, quote margin, capacity planning, Theory of Constraints
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/business/business-foundations.md; numeric/safety specifics below stay owner-gated for hotel. -->**

This packet is DRAFT research for the PRISM `business` galaxy (ERP / cost / OEE / quoting / capacity). Every fact below carries an inline citation. The owner slot (hotel) must independently verify each cited claim against the named source before integrating any of it into the live galaxy CLAUDE.md / MEMORY.md or any engine. Nothing here is asserted as PRISM truth.

---

## Overall Equipment Effectiveness (OEE)

1. **OEE is the product of three factors: `OEE = Availability × Performance × Quality`.** Availability accounts for stop time, Performance accounts for slow cycles, and Quality accounts for defects/rework. (src: Lean Production, "OEE (Overall Equipment Effectiveness)", https://www.leanproduction.com/oee/)

2. **"World class" OEE for discrete manufacturing is 85% or above**, a benchmark rooted in Seiichi Nakajima's Total Productive Maintenance (TPM) work in the 1980s. The 85% target decomposes to roughly **90% Availability × 95% Performance × 99% Quality** (0.90 × 0.95 × 0.99 ≈ 0.846). (src: LeanWorx, "World Class OEE: What 85% Really Means", https://leanworx.ai/world-class-oee/ ; Tractian, "What Is World Class OEE?", https://tractian.com/en/blog/world-class-oee)

3. **The multiplicative structure makes the 85% bar demanding: scoring 90% on each of the three factors yields only 0.90³ = 73% OEE.** The cross-industry average OEE is around 60%, with most plants operating between 40% and 60%. (src: Tractian, "World Class OEE", https://tractian.com/en/blog/world-class-oee ; Lean Production, https://www.leanproduction.com/oee/)

4. **85% is a directional target, not a universal goal — context matters.** High-volume, low-variety lines can target 85%+, whereas complex multi-product job shops may operate effectively at 60–70%. The most useful benchmark is a plant's own historical trajectory (rising OEE = working improvement), not a global average. (NOTE for hotel: JM Die is a high-mix job shop, so a 60–70% expectation is the relevant comparator, not 85%.) (src: Symestic, "What Characterizes a Good OEE Score?", https://www.symestic.com/en-us/blog/what-characterizes-a-good-oee-score ; analyticure, "The World Class OEE Trap", https://analyticure.com/overall-equipment-effectiveness-oee-85-percent/)

5. **The Six Big Losses map directly onto the three OEE factors** (originated by Nakajima, formalized in *Introduction to TPM*, 1988): Availability losses = (1) Equipment Failure/Breakdowns and (2) Setup & Adjustments; Performance losses = (3) Idling & Minor Stops and (4) Reduced Speed; Quality losses = (5) Process Defects and (6) Reduced Yield / Startup Losses. (src: OEE.com, "Six Big Losses in Manufacturing", https://www.oee.com/oee-six-big-losses/ ; Dmaic.com, "Six Big Losses", https://www.dmaic.com/faq/six-big-losses/)

6. **Idling and minor stops are systematically underreported in manual measurement and often represent the single largest contributor to the OEE gap.** Separating Performance loss into Idling/Minor-Stops vs Reduced-Speed reliably requires an automated system that measures individual cycles. (NOTE for hotel: implies any PRISM OEE engine that relies on manual operator logs will undercount Performance loss — flag this as a data-quality caveat.) (src: Dmaic.com, "Six Big Losses", https://www.dmaic.com/faq/six-big-losses/)

## Job Costing & Overhead Allocation

7. **Total job cost = Direct Materials + Direct Labor + Applied Manufacturing Overhead.** Direct materials and direct labor are traced directly to each job on a job cost sheet; manufacturing overhead (indirect materials, indirect labor, utilities, equipment depreciation) cannot be traced and must be applied via an estimated rate. (src: Saylor/Managerial Accounting, "Assigning Manufacturing Overhead Costs to Jobs", https://saylordotorg.github.io/text_managerial-accounting/s06-03-assigning-manufacturing-overhe.html ; Business LibreTexts 4.5, https://biz.libretexts.org/Courses/Folsom_Lake_College/ACCT_311:_Managerial_Accounting_(Black)/04:_Job_Costing/4.05:_New_Page)

8. **Predetermined Overhead Rate = Estimated Manufacturing Overhead Cost ÷ Estimated Total Allocation Base**, computed at the start of the period. Common allocation bases are direct labor hours, direct labor cost, and machine hours; labor-intensive shops favor labor hours/cost while automated facilities favor machine hours. Worked example: $1,140,000 estimated overhead ÷ 38,000 estimated direct labor hours = $30/direct-labor-hour. (src: Accounting For Management, "Predetermined Overhead Rate", https://www.accountingformanagement.org/predetermined-overhead-rate/ ; Saylor, https://saylordotorg.github.io/text_managerial-accounting/s06-03-assigning-manufacturing-overhe.html)

9. **Because the rate is an estimate, applied overhead rarely equals actual overhead** → over-applied (allocated > actual, reduce COGS) or under-applied (actual > allocated, increase COGS). GAAP permits predetermined rates during the year but requires year-end reconciliation to actual overhead. (src: Accounting For Management, https://www.accountingformanagement.org/predetermined-overhead-rate/ ; Business LibreTexts 4.5, https://biz.libretexts.org/Courses/Folsom_Lake_College/ACCT_311:_Managerial_Accounting_(Black)/04:_Job_Costing/4.05:_New_Page)

10. **Per a cited survey, ~34% of manufacturers use a single plant-wide overhead rate, ~44% use multiple departmental rates, and the remainder use Activity-Based Costing (ABC).** Multiple/departmental rates are more accurate but more complex than a single plant-wide rate. (NOTE for hotel: a multi-machine job shop like JM Die with 21 machines is the textbook case for departmental/machine-level rates over one plant-wide rate.) (src: Accounting For Management, "Predetermined Overhead Rate", https://www.accountingformanagement.org/predetermined-overhead-rate/)

## Quote Margin & Pricing

11. **Markup and Margin are NOT interchangeable — they share the numerator (price − cost) but differ in denominator.** `Markup % = (Price − Cost) ÷ Cost`; `Margin % = (Price − Cost) ÷ Price`. For the same transaction, margin is always lower than markup. Example: cost $100, price $125 → 25% markup but 20% margin. (src: Consero, "Markup vs. Margin", https://conseroglobal.com/resources/markup-vs-margin-what-is-the-difference/ ; inFlow, "Margin vs Markup", https://www.inflowinventory.com/blog/calculate-margin-vs-markup/)

12. **To price for a TARGET MARGIN, work backward from the selling price: `Selling Price = Cost ÷ (1 − target margin)`** — do NOT apply the margin % as a markup. Example: a $7 cost at a 30% target margin must sell at $7 ÷ (1 − 0.30) = $10, not $9.10. Conversion identities: `Margin = Markup ÷ (1 + Markup)` and `Markup = Margin ÷ (1 − Margin)`; e.g. a 50% markup = 33.3% margin. (NOTE for hotel: this is the single most common quoting error — verify any PRISM quote engine applies the divide-by-(1−margin) form, not a naive cost × (1+margin).) (src: GrowthForce, "The Unseen Cost of Mixing Up Markup and Margin", https://www.growthforce.com/blog/markup-vs-margin-formul ; inFlow, https://www.inflowinventory.com/blog/calculate-margin-vs-markup/)

13. **Labor-cost basis for quoting: employer compensation cost is wages PLUS benefits, not wages alone.** Per BLS ECEC (December 2025), private-industry total compensation averaged $46.15/hour worked — wages/salaries $32.36 (70.1%) and benefits $13.79 (29.9%). (NOTE for hotel: a fully-burdened labor rate used in quotes must add the ~30% benefit load and the predetermined overhead rate on top of the bare wage; manufacturing-specific figures are in ECEC Table 4 of the same release — verify before using the all-industry ratio for JM Die.) (src: U.S. Bureau of Labor Statistics, "Employer Costs for Employee Compensation – 2025 Q04", https://www.bls.gov/news.release/ecec.nr0.htm)

## Capacity Planning

14. **Available capacity of a work center = Total scheduled machine-hours × Utilization × Efficiency.** Worked example: 4 machines × two 8-hour shifts × 5 days = 320 machine-hours/week; at 90% utilization and 95% efficiency, available capacity = 320 × 0.90 × 0.95 = 273.6 hours/week. Utilization factors absorb breaks, cleaning, changeovers; efficiency captures throughput vs. design. (src: RELEX Solutions, "Rough-cut capacity planning for manufacturers", https://www.relexsolutions.com/resources/rough-cut-capacity-planning/)

15. **Rough-Cut Capacity Planning (RCCP) is a fast, high-level feasibility check that validates the Master Production Schedule against the most critical resources BEFORE MRP runs** — typically over an 8-week to 18-month horizon at department/equipment-group level (not individual machines). Catching an infeasible MPS at RCCP avoids generating hundreds of unexecutable work orders downstream. Three methods: Routing-based, Rate-based, and Capacity Planning Using Overall Factors / Bill-of-Labor (BOLA recommended for multi-product shops). (src: RELEX Solutions, https://www.relexsolutions.com/resources/rough-cut-capacity-planning/ ; Manufacturing Pulse, "Rough-Cut Capacity Planning", https://manufacturing-pulse.com/rough-cut-capacity-planning/)

16. **Capacity utilization rate = the percentage of production capacity actually used; the higher the rate, the lower the cost per unit.** Persistent underutilization narrows gross margins and lowers return on assets. Two highest-leverage levers to raise utilization are faster changeovers (SMED-style, eliminating lost setup time) and preventive maintenance (eliminating unplanned downtime). (src: QAD, "What is Capacity Utilization?", https://www.qad.com/blog/2026/02/metrics-matter-capacity-utilization-throughput-ratio ; RELEX Solutions, https://www.relexsolutions.com/resources/rough-cut-capacity-planning/)

## Theory of Constraints (Goldratt)

17. **Theory of Constraints (TOC), from Eliyahu Goldratt's 1984 business novel *The Goal*, holds that every system's output is limited by a single constraint (the "bottleneck" / weakest link), and total throughput improves ONLY when the constraint is improved** — time spent optimizing non-constraints yields no system gain. The stated organizational goal is "to make money now and in the future." (src: Lean Production, "Theory of Constraints (TOC)", https://www.leanproduction.com/theory-of-constraints/ ; Theory of Constraints Institute, https://www.tocinstitute.org/theory-of-constraints.html)

18. **The Five Focusing Steps (POOGI — Process Of On-Going Improvement): (1) Identify the constraint; (2) Exploit it (maximize output from it with no new spend); (3) Subordinate everything else to it (don't release more material than it can process); (4) Elevate it (invest to add capacity); (5) Repeat — when the constraint moves, restart, and avoid inertia.** (src: Theory of Constraints Institute, "Five Focusing Steps", https://www.tocinstitute.org/five-focusing-steps.html ; Lean Production, https://www.leanproduction.com/theory-of-constraints/)

19. **TOC's execution method is Drum-Buffer-Rope (DBR), a PULL system: the constraint ("drum") sets the pace, a buffer protects it from starvation, and the "rope" chokes raw-material release to the constraint's rate** — producing faster than the constraint only piles up excess WIP inventory. (NOTE for hotel: directly relevant to a PRISM scheduling/capacity engine — the constraint machine, not the order book, should gate job release.) (src: Theory of Constraints – Wikipedia, https://en.wikipedia.org/wiki/Theory_of_constraints ; Lean Production, https://www.leanproduction.com/theory-of-constraints/)

20. **Throughput Accounting (TOC's alternative to traditional cost accounting) decides on three measures: Throughput (sales − truly variable cost), Operating Expense, and Investment/Inventory** — it argues traditional full-absorption cost accounting can drive suboptimal local-efficiency decisions that hurt system profit. (NOTE for hotel: this is in TENSION with the predetermined-overhead-rate job-costing model in facts 7–10 — surface the conflict per R7, do not blend; full-absorption costing answers "what did this job cost?" while throughput accounting answers "what should we accept/prioritize?") (src: Lean Production, "Theory of Constraints (TOC)", https://www.leanproduction.com/theory-of-constraints/ ; Theory of Constraints Institute, https://www.tocinstitute.org/theory-of-constraints.html)

## Small-Manufacturer Cost / Economic Support (gov)

21. **NIST's Applied Economics Office publishes free tools and guides for manufacturing investment-decision economics** (valuing output, measuring stakeholder costs/losses, estimating cost/benefit of technology adoption, investment-analysis methods) — relevant when a PRISM business engine must justify a capex (e.g., elevating a constraint per TOC step 4). (src: NIST, "Manufacturing economics", https://www.nist.gov/manufacturing-economics)

22. **NIST's Hollings Manufacturing Extension Partnership (MEP) is the U.S. public-private network supporting small/medium manufacturers; cited cumulative impact since 2000 = $60.0B new sales and $26.2B cost savings across 77,409 manufacturers.** An independent U.S. Census Bureau study found MEP clients grew labor productivity 3.4%–16% more than comparable non-clients over five years. (src: NIST, "MEP Economic Impacts Boost Business and Jobs", https://www.nist.gov/news-events/news/2025/03/mep-economic-impacts-boost-business-and-jobs ; NIST MEP, https://www.nist.gov/mep)

---

## Sources

- Lean Production — OEE (Overall Equipment Effectiveness): https://www.leanproduction.com/oee/
- Lean Production — Theory of Constraints (TOC): https://www.leanproduction.com/theory-of-constraints/
- LeanWorx — World Class OEE: What 85% Really Means: https://leanworx.ai/world-class-oee/
- Tractian — What Is World Class OEE? Benchmarks and Standards: https://tractian.com/en/blog/world-class-oee
- Symestic — What Characterizes a Good OEE Score?: https://www.symestic.com/en-us/blog/what-characterizes-a-good-oee-score
- analyticure — The "World Class" OEE Trap (85% benchmark): https://analyticure.com/overall-equipment-effectiveness-oee-85-percent/
- OEE.com — Six Big Losses in Manufacturing: https://www.oee.com/oee-six-big-losses/
- Dmaic.com — Six Big Losses in TPM and OEE: https://www.dmaic.com/faq/six-big-losses/
- Saylor (Managerial Accounting) — Assigning Manufacturing Overhead Costs to Jobs: https://saylordotorg.github.io/text_managerial-accounting/s06-03-assigning-manufacturing-overhe.html
- Business LibreTexts 4.5 — Compute a Predetermined Overhead Rate and Apply Overhead: https://biz.libretexts.org/Courses/Folsom_Lake_College/ACCT_311:_Managerial_Accounting_(Black)/04:_Job_Costing/4.05:_New_Page
- Accounting For Management — Predetermined Overhead Rate: https://www.accountingformanagement.org/predetermined-overhead-rate/
- Consero — Markup vs. Margin: What Is the Difference?: https://conseroglobal.com/resources/markup-vs-margin-what-is-the-difference/
- GrowthForce — The Unseen Cost of Mixing Up Markup and Margin: https://www.growthforce.com/blog/markup-vs-margin-formul
- inFlow — Margin vs Markup: How to Calculate: https://www.inflowinventory.com/blog/calculate-margin-vs-markup/
- U.S. Bureau of Labor Statistics — Employer Costs for Employee Compensation (2025 Q04): https://www.bls.gov/news.release/ecec.nr0.htm
- RELEX Solutions — Rough-cut capacity planning for manufacturers: https://www.relexsolutions.com/resources/rough-cut-capacity-planning/
- Manufacturing Pulse — Rough-Cut Capacity Planning: A Comprehensive Guide: https://manufacturing-pulse.com/rough-cut-capacity-planning/
- QAD — What is Capacity Utilization? Capacity Utilization vs Throughput Ratio: https://www.qad.com/blog/2026/02/metrics-matter-capacity-utilization-throughput-ratio
- Theory of Constraints Institute — Theory of Constraints (overview): https://www.tocinstitute.org/theory-of-constraints.html
- Theory of Constraints Institute — Five Focusing Steps (POOGI): https://www.tocinstitute.org/five-focusing-steps.html
- Theory of Constraints — Wikipedia (Drum-Buffer-Rope, Throughput Accounting): https://en.wikipedia.org/wiki/Theory_of_constraints
- NIST — Manufacturing economics (Applied Economics Office): https://www.nist.gov/manufacturing-economics
- NIST — MEP Economic Impacts Boost Business and Jobs: https://www.nist.gov/news-events/news/2025/03/mep-economic-impacts-boost-business-and-jobs
- NIST — Manufacturing Extension Partnership (MEP): https://www.nist.gov/mep
