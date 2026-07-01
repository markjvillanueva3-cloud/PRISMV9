---
title: Quoting Foundations — should-cost decomposition, cycle-time math, digital-manufacturing quoting, machinability cost drivers
galaxy: quoting
owner_slot: charlie
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); deepened by papa-workflow free-course/free-textbook pass (2026-06-09); second deepening pass — OTHER OpenStax chapters + 2nd MIT OCW course + NIST gov tool (2026-06-10)"
verification_method: institutional/standards/method facts WebFetch-confirmed against primary sources (NIST SP 1176 federal pub, Protolabs public design-tip/blog pages, KEYENCE machining-formula collection, American Micro cycle-time reference) and — in the 2026-06-09 deepening pass — the free OpenStax CC-BY-NC-SA *Managerial Accounting* textbook (§2.2, §4.1, §4.2, §4.4, §5.2, §6.3) + MIT OpenCourseWare 2.854 lecture notes; every dollar rate, percentage band, scrap/tooling constant, allocation-base choice, and paywalled-abstract figure left owner-gated in _staging for charlie
tags: [quoting, should-cost, cost-estimation, cycle-time, NRE-amortization, machinability, NIST, Protolabs, digital-manufacturing]
---

# Quoting Foundations

The domain-knowledge spine for the **quoting** galaxy: how PRISM should decompose a CNC should-cost, estimate machining time, and choose a quoting methodology (traditional NRE-amortized vs digital-manufacturing/no-setup-fee). Promoted from the deep-domain research packet (`knowledge/wiki/quoting/_staging/deep-domain-research-2026-06-09.md`) after papa WebFetch-confirmed the institutional / standards / method facts against primary sources. **Every dollar rate, percentage band, and numeric cost constant was left owner-gated** in `_staging/` for charlie to reconcile against JM Die's actual data before any pricing engine hardcodes it — see the Owner-gate section below.

## 1. Cost-decomposition method (NIST primary source)

**CONFIRMED** against NIST Special Publication 1176 (federal publication, [NIST.SP.1176.pdf](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1176.pdf)):

- Part-level manufacturing cost decomposes into **three dominant drivers — machine cost, labor cost, and material cost**. Verbatim: *"The analysis includes labor, material, and machine costs ... Costs can be broken into machine costs, labor costs, and material costs."*
- **Power consumption and space/facility rental were each found to contribute less than 1% of total cost and were therefore excluded** from the model. Verbatim: *"Other factors such as power consumption and space rental were considered but contributed less than one percent of the costs; therefore, they were not included in the results."*
- **Average part cost is computed by dividing total annual cost by total annual production volume** — per-part cost is a function of throughput, not just per-piece operations. Verbatim: *"The average part cost is calculated by dividing the total cost by the total number of parts manufactured in a year."*
- The **Hopkinson & Dickens (2003) machine-cost method** NIST cites: *"an annual machine cost per part where the machine completely depreciates after eight years; that is, it is the sum of depreciation cost per year (calculated as machine and ancillary equipment divided by 8) and machine maintenance cost per year divided by production volume,"* yielding a per-part machine cost constant over time.

**Design implication for quoting:** model the cost rollup on these three drivers; do NOT add power/rent as separate line items at the part level (they are sub-1% noise that NIST explicitly drops). Drive per-part cost off the order/annual volume, not off an isolated single-piece estimate.

## 2. Cycle-time / machining-time estimation (formula primaries)

- **Machining time = length of cut ÷ feed rate.** **CONFIRMED** against American Micro Inc. ([CNC Machining Cycle Time Calculation](https://www.americanmicroinc.com/resources/cnc-machining-cycle-time-calculation/)): *"Machining Time = Length of Cut (mm) / Feed (mm per revolution) x Revolutions Per Minute"* and *"The basic CNC machining formula is length or distance divided by speed or rate."*
- **Total cycle time decomposes into named components** — setup (secure workpiece + set up cutting tools), tool changes, machining/cutting (each tool movement + spindle rotation), rapid positioning, dwell time, and part handling (load/unload). **CONFIRMED** against the same American Micro page (the "Factors in Achieving CNC Cycle Time Reduction" list). A quote engine that costs only the cutting move understates the real cycle.
- **Spindle/cutting-speed math: vc = (π × D × N) / 1000** (vc in m/min, D in mm, N in rpm), and **table feed vf = fz × z × n** (fz = feed per tooth, z = number of teeth, n = spindle speed). **CONFIRMED** against KEYENCE Machining Formula Collection ([Milling](https://www.keyence.com/ss/products/measure-sys/machining/formula/milling.jsp)): the worked example DC=100 mm, n=400 min⁻¹ → vc ≈ 125.6 m/min matches vc = πDN/1000, and the page states *"vf = fz × z × n"* with the example fz=0.2, z=8, n=600 → 960 mm/min.

**Design implication for quoting:** these are the canonical feed/speed/time relationships PRISM's `CycleTimeEstimatorEngine` / `GCodeTimeEstimatorEngine` should reproduce. They are general machining identities, not shop-specific constants, so they are safe to assert. (Per-pass RPM recompute under constant-surface-speed turning stays owner-gated — see below.)

## 3. Machinability + feature cost drivers (Protolabs primary)

**CONFIRMED** against Protolabs "How to Reduce CNC Machining Costs" ([design-tips page](https://www.protolabs.com/resources/design-tips/how-to-reduce-cnc-machining-costs/)):

- **Material machinability directly affects cost.** Verbatim: *"17-4 PH stainless steel is difficult to cut"* while brass is *"a soft metal that's easy to mill."* A flat material line item that ignores machinability misprices hard alloys.
- **Named feature cost drivers:** very deep pockets (*"take a lot of machining time"*), thin walls (≤0.020 in. — breakage/flex/warp risk), engraved text (*"aesthetically pleasing but time-intensive"*), and sculptured surfaces / cavernous slots / super-deep holes / threads.
- **Tighter-than-needed tolerance/finish adds real cost** through small/ball end mills and *"slow and delicate work, driving up the cost of your project because of added milling time."*

**Design implication for quoting:** a quote engine should branch cost on material machinability class and on the presence of these named cost-driver features, not just on bounding-box volume.

## 4. Quoting methodology — digital-manufacturing / no-NRE model (Protolabs primary)

**CONFIRMED** against Protolabs "Understanding CNC Manufacturing Costs" ([blog page](https://www.protolabs.com/en-gb/resources/blog/understanding-cnc-manufacturing-costs/)):

- Price is derived by **digitally manufacturing the part**, not abstractly estimating it. Verbatim: *"We don't fabricate a cost, we fabricate your part (digitally) and factor this into the price."*
- Machining cost is built from **machining time (and associated tool wear) + fixture-making time + number of setups** (machining from multiple directions adds setups). Verbatim: *"machining time (and the associated tool wear) as well as time to make fixtures to securely hold the components, and setups – where machining takes place from multiple directions."*
- **No separate setup fee / no upfront NRE**, which keeps small batches and one-offs viable. Verbatim: *"you won't see a setup fee"* and *"we are really flexible at making complex parts, smaller batches and one-offs."*

**Design implication for quoting:** PRISM's quote surface should support TWO methodologies and branch by quantity tier — (a) the traditional NRE-amortized model (setup/programming amortized across batch), and (b) a digital-manufacturing / no-setup-fee model for low-quantity high-mix work. The decision to amortize NRE vs absorb it into automation is a first-class quoting design choice, confirmed as a real industry split.

## Owner-gate (NOT promoted — charlie verifies against JM Die actuals)

The following were left **UNVERIFIED in `_staging/`** because they are either numeric constants that must be reconciled against JM Die's real burden/cost data, single-case heuristics, or sourced from a non-primary / paywalled page. **No pricing engine, schema, or doctrine file should hardcode any of these until charlie confirms them.**

- **All hourly machine-rate dollar bands** (manual mill/lathe ~$35-75, 3-axis CNC ~$65-125/typical $85, turning ~$60-110, 5-axis ~$125-250/typical $175). Regional + 2026-dated + from a secondary commercial guide (CNC Optimization), not a standards body. **Reconcile against JM Die's actual burden rates** before use.
- **OEE / billable-hour percentages** (0.65-0.85 OEE on 2,000 annual hours → ~1,300-1,700 billable). Plausible but shop-specific; not a primary-source constant.
- **CAM-inflation multiplier** (real time ≈ 1.5-2× CAM time) and the **+20%/1.2× complexity multiplier** "within ~10% of actual Haas times" — a single-case heuristic. Treat as a tunable prior, never a constant.
- **Scrap/kerf factor (~1.05 / ~5%)** and **near-net-shape / material-removed cost reasoning** beyond the qualitative principle — the qualitative driver is fine; the specific 5% number is shop-specific.
- **Tooling cost-per-edge dollar figures** ($15 insert ÷ 200 parts = $0.075/part; $0.02-0.05/part holder amortization; titanium/Inconel ~$50/100 parts). The cost-per-edge METHOD is sound; the dollar values are owner-data.
- **Setup/NRE amortization dollar examples** (30-min setup → 3 min/part at qty 10; ~$85 on a 5-part run). The amortization PRINCIPLE (setup time ÷ batch quantity, small qty carries high per-part NRE) is method-confirmed and reflected above; the specific dollars stay gated.
- **Standard tolerance ±0.005 in.** — this is a Protolabs-specific shop standard (their page does state it verbatim), NOT a universal constant. Charlie should set PRISM's standard-tolerance default from JM Die convention, not adopt a vendor's number as canonical.
- **Constant-surface-speed (CSS) per-pass RPM recompute** (FIRGELLI source) — the principle is correct machining physics, but the cited source is a commercial calculator blog, not a primary standard; charlie/whiskey (lathe) own the turning-time model. Left gated pending a primary citation.
- **"~80% of cost locked in early in design"** (NIST ATP / FIPER) — the ScienceDirect body is paywalled; only the abstract is free. Cite the NIST ATP project qualitatively, do not hardcode the 80% figure from an unread paper.
- **"~8-15% estimation-error accuracy band"** for disciplined bottom-up should-cost — aspirational target from the secondary guide; validate against JM Die quote-vs-actual reconciliation, do not assert as achieved.

This galaxy carries **no cutting/physics safety constants** (kc1.1, Taylor C/n, feed/speed limits) in this packet — those live in `mcp-server/src/physics/constants.ts` and are owned by the physics galaxies, not promoted here.

---

# DEEPENING — free-textbook + free-college-course foundations (appended 2026-06-09)

> The sections above were built mostly from a federal pub (NIST SP 1176) + vendor/industry pages (Protolabs, KEYENCE, American Micro). The sections below reach into the **untapped categories the operator named** — a free open-license **textbook** (OpenStax *Principles of Accounting, Vol. 2: Managerial Accounting*) and a free **MIT OpenCourseWare** graduate course — to give the quoting galaxy a real cost-*accounting* and manufacturing-*systems* spine, not just a machining-time spine. Every claim below was WebFetch-confirmed against the cited primary page. These are general accounting/methodology facts — they carry **no dollar values**, so they are safe to assert; the only owner-gated piece is the choice of which allocation base + standard tolerance JM Die actually uses.

## 5. Job-order costing is the canonical costing system for a custom CNC shop (OpenStax primary)

**CONFIRMED** against OpenStax *Managerial Accounting* §4.1 ([Distinguish between Job Order Costing and Process Costing](https://openstax.org/books/principles-managerial-accounting/pages/4-1-distinguish-between-job-order-costing-and-process-costing)):

- **Job order costing definition.** Verbatim: *"Job order costing is an accounting system that traces the individual costs directly to a final job or service, instead of to the production department."*
- **When it is the right model.** Verbatim: *"It is used when goods are made to order or when individual costs are easy to trace to individual jobs."* This is exactly the JM Die / custom-CNC case — every quote IS a job, costed individually, not a continuous-process average.
- **Contrast with process costing.** Verbatim: *"process costing is used when the manufacturing process is continuous, so it is difficult to establish how much of each material is used."*
- **Industry examples confirmed to use job-order costing** include *"print service providers, advertising agencies, building contractors, accounting firms, consulting entities, and repair service providers"* — i.e. the made-to-order/service archetype a job shop belongs to.

**Design implication for quoting:** PRISM's quote engine is, in accounting terms, a **job-order costing** system. Each quote = one job cost sheet accumulating direct materials + direct labor + applied overhead. This is the textbook-correct framing for the traditional NRE-amortized methodology in §4 above, and it names *why* a custom shop cannot just average a plantwide unit cost the way a process-costing plant (soft drinks, cereal) does.

## 6. The three product-cost components + their textbook definitions (OpenStax primary)

**CONFIRMED** against OpenStax §4.2 ([Three Major Components of Product Costs under Job Order Costing](https://openstax.org/books/principles-managerial-accounting/pages/4-2-describe-and-identify-the-three-major-components-of-product-costs-under-job-order-costing)) and §5.2 ([Conversion Costs](https://openstax.org/books/principles-managerial-accounting/pages/5-2-explain-and-identify-conversion-costs)):

- **Direct materials** — verbatim: *"those materials that can be directly traced to the manufacturing of the product."*
- **Direct labor** — verbatim: *"the total cost of wages, payroll taxes, payroll benefits, and similar expenses for the individuals who work directly on manufacturing a particular product."* (Note: a labor-rate quote line must carry payroll taxes + benefits, not just base wage.)
- **Manufacturing overhead** — verbatim: *"Costs that support production but are not direct materials or direct labor."*
- **Conversion cost** — verbatim: *"Conversion costs are the total of direct labor and factory overhead costs"* — *"it is the labor and overhead together that convert the raw material into the finished product."*

**Design implication for quoting:** a defensible quote rolls up exactly these three buckets per job. The *conversion cost* concept (labor + overhead together) is the textbook name for the machine-shop "shop rate" — the burdened hourly figure that the machining-time model in §2 multiplies against. PRISM's quote schema should keep direct-materials separate from the conversion (labor+overhead) bucket, because they scale on different drivers (material on stock volume; conversion on cycle time).

## 7. Overhead is *applied via a predetermined rate*, and the allocation base is shifting from labor-hours to machine-hours (OpenStax primary)

**CONFIRMED** against OpenStax §4.4 ([Compute a Predetermined Overhead Rate and Apply Overhead](https://openstax.org/books/principles-managerial-accounting/pages/4-4-compute-a-predetermined-overhead-rate-and-apply-overhead-to-production)):

- **Predetermined overhead rate** — verbatim formula: *"Estimated (budgeted) Overhead Cost divided by Expected (budgeted) Level of Activity equals Predetermined Overhead Rate."* It is *"established prior to the beginning of the fiscal year and typically is not changed during the year."*
- **Why a predetermined (not actual) rate** — verbatim: *"the actual overhead information is available too late for management to make decisions"*; overhead costs *"are not uniform throughout the year"* and *"the cost per unit varies with production."* A quote can't wait for year-end actuals, so it MUST apply a budgeted rate.
- **Allocation base** — verbatim: *"Direct labor hours, direct labor dollars, or machine hours are often chosen as the allocation base."* Critically, verbatim: *"Traditionally, direct labor hours were used as the activity base, but technology continually decreases the amount of direct labor used in production, and machine hours or units produced have become more common activity bases."*

**Design implication for quoting:** in a CNC shop where one operator tends several near-autonomous machines, **labor-hours are the wrong overhead base** — the textbook itself flags that automation breaks labor-hour allocation, and **machine-hours** are the modern base. This is the accounting justification for PRISM costing overhead on *machine cycle time*, consistent with the machine-cost driver NIST SP 1176 identified in §1. *(Which specific rate JM Die uses, and its dollar value, stay owner-gated for charlie.)*

## 8. Activity-based costing (ABC) for accurate overhead on a high-mix job shop (OpenStax primary)

**CONFIRMED** against OpenStax §6.3 ([Calculate Activity-Based Product Costs](https://openstax.org/books/principles-managerial-accounting/pages/6-3-calculate-activity-based-product-costs)):

- **ABC definition** — verbatim: *"Activity-based costing (ABC) is the process that assigns overhead to products based on the various activities that drive overhead costs."*
- **Five-step ABC method** — verbatim list: *"Identify the activities performed in the organization"* → *"Determine activity cost pools"* → *"Calculate activity rates for each cost pool"* → *"Allocate activity rates to products (or services)"* → *"Calculate unit product costs."*
- **Cost pool / cost driver** — verbatim: a *"cost pool is a list of costs incurred when related activities are performed"* and the cost driver is *"the specific activity that drives the costs in the cost pools."*
- **Why ABC beats one plantwide rate** — ABC fits when *"expenses are not driven by a single cost driver"*; instead of one rate, *"several cost drivers are used … and each activity is allocated based on each group's cost driver,"* giving more accurate product cost.

**Design implication for quoting:** a high-mix shop (a deep-pocket 5-axis aerospace part next to a simple turned shaft) is the textbook case where a **single plantwide overhead rate misprices**. PRISM's quote engine can model overhead as ABC cost-pools keyed to the §3 feature cost-drivers (setups, fixturing, inspection, programming/NRE) rather than smearing one flat rate over every job — the accounting-rigorous form of the feature-branching already recommended in §3.

## 9. Cost behavior — why NRE/setup per-part falls with batch size, formally (OpenStax primary)

**CONFIRMED** against OpenStax §2.2 ([Identify and Apply Basic Cost Behavior Patterns](https://openstax.org/books/principles-managerial-accounting/pages/2-2-identify-and-apply-basic-cost-behavior-patterns)):

- **Fixed cost** — verbatim: *"A fixed cost is an unavoidable operating expense that does not change in total over the short term, even if a business experiences variation in its level of activity."* It is constant in total but **declines per-unit as volume rises** (the page's own example: the same rent is $5.00/unit at 200 units, $2.50/unit at 400 units).
- **Variable cost** — verbatim: *"A variable cost is one that varies in direct proportion to the level of activity within the business."* Constant per-unit, scales in total.
- **Mixed cost** — verbatim: *"Mixed costs are those that have both a fixed and a variable component,"* following Y = a + bx (a = fixed, b = variable per unit).

**Design implication for quoting:** this is the **formal cost-accounting basis for NRE/setup amortization** (the principle already asserted, dollar-free, in §4 and the owner-gate). Setup, programming, and fixture-build are *fixed costs per job*; cutting time + material are *variable costs per part*. A quote is therefore a **mixed cost** of the form `total = NRE + (per-part variable × qty)`, so per-part price falls hyperbolically with batch quantity — exactly why a 1-off and a 500-piece run of the same part carry very different unit prices. PRISM's quantity-tier quoting math is the Y = a + bx mixed-cost model.

## 10. Manufacturing-systems context — quoting sits on a stochastic production system (MIT OCW primary)

**CONFIRMED** against MIT OpenCourseWare **2.854 Introduction to Manufacturing Systems (Fall 2016)** ([lecture notes](https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/pages/lecture-notes/)):

- The graduate course's lecture spine spans, verbatim topics: *Manufacturing Systems Overview · Probability · Queueing Systems · Inventory · Optimization · Single-Part-Type Systems · Material Requirements Planning · Multi-Stage Control and Scheduling · Simulation · Toyota Production System · Quality / Quantity Interactions.*
- The presence of **Queueing Systems** and **Quality / Quantity Interactions** as first-class topics confirms (at an institutional/curriculum level) that throughput, wait time, and the rate↔quality↔cost trade-off are core manufacturing-systems variables — not afterthoughts.

**Design implication for quoting:** a quote's promised **lead time** and its **cost** are outputs of a *stochastic, queue-governed* production system, not deterministic constants. The MIT curriculum names queueing + scheduling + quality/quantity interaction as the governing theory. PRISM should therefore treat a quoted delivery date as a function of current shop WIP/queue state (capacity-aware quoting), and recognize that pushing rate up can trade against quality — a systems-level caveat the per-part machining-time model in §2 alone does not capture. *(Any specific queue/capacity numbers are JM Die shop-state, owner-gated.)*

---

# DEEPENING PASS 2 — cost-estimation method, budgeting, standard costing, and systems/supply-chain depth (appended 2026-06-10)

> Pass-1 reached a free textbook (OpenStax Managerial Accounting) and one MIT OCW course. This second pass goes to **OTHER OpenStax chapters not previously cited** (§2.3 high-low/regression, §7.2 operating budgets, §8.1 standard costing), a **second MIT OCW course** (15.763J Sloan Manufacturing System & Supply Chain Design), and a **NIST government cost-estimation tool page** — all WebFetch-confirmed against the cited primary page, none re-citing a pass-1 URL. These are general accounting/method/systems facts carrying **no dollar values**, so they are safe to assert; the only owner-gated piece remains which numeric standards/rates JM Die actually uses.

## 11. Separating mixed costs into fixed + variable — high-low vs least-squares regression (OpenStax §2.3 primary)

**CONFIRMED** against OpenStax *Managerial Accounting* §2.3 ([Estimate a Variable and Fixed Cost Equation and Predict Future Costs](https://openstax.org/books/principles-managerial-accounting/pages/2-3-estimate-a-variable-and-fixed-cost-equation-and-predict-future-costs)):

- **High-low method** — verbatim: *"a technique for separating the fixed and variable cost components of mixed costs."* Method steps confirmed: *"identify the periods with the highest and lowest levels of activity"* → *"Variable cost equals change in cost divided by change in activity"* → fixed cost found by *"taking the total costs at either the high or the low level of activity and subtracting this variable component."*
- **The cost equation** is *"Y equals a plus bx"* — Y = total mixed cost, a = fixed cost, b = variable cost per unit, x = activity level (the same Y = a + bx form §9 named for mixed cost, now with an estimation procedure attached).
- **Scatter graphs + least-squares regression** — verbatim: *"least-squares regression minimizes the errors of trying to fit a line between the data points and thus fits the line more closely to all the data points,"* offering greater accuracy than the high-low method's reliance on just two data points.

**Design implication for quoting:** PRISM does NOT have to hardcode a per-part NRE/setup constant — it can **estimate the shop's fixed-vs-variable cost split empirically** from its own quote-vs-actual history using the high-low method (two extreme jobs) or, better, least-squares regression over many jobs. This is the textbook-rigorous way to derive the `a` (NRE) and `b` (per-part variable) coefficients of the §9 mixed-cost quote model from real data, instead of guessing them. *(The fitted dollar coefficients are JM Die data, owner-gated.)*

## 12. Quoting consumes the same primitives a production budget produces, in a fixed build order (OpenStax §7.2 primary)

**CONFIRMED** against OpenStax *Managerial Accounting* §7.2 ([Prepare Operating Budgets](https://openstax.org/books/principles-managerial-accounting/pages/7-2-prepare-operating-budgets)):

- **Operating budgets** — verbatim: *"a primary component of the master budget and involve examining the expectations for the primary operations of the business."*
- **The build order is causal, not arbitrary** — verbatim: *"The budgeting process begins with the estimate of sales … they can determine how many units must be produced."* The confirmed sequence: **sales budget → production budget → direct materials budget → direct labor budget → overhead allocation.**
- **Production budget** — verbatim: management computes *"the number of units that need to be produced"* = projected sales + desired ending inventory − beginning inventory.
- **Direct materials budget** — *"how much material needs to be ordered and how much that material costs."* **Direct labor budget** — built from the same production figures: hours needed × hourly rate.

**Design implication for quoting:** a quote is a **single-job slice of the operating-budget chain run in reverse** — the customer supplies the "production" quantity, and PRISM must derive materials needed (→ direct-materials cost) and labor hours (→ direct-labor cost) in exactly this order before applying overhead. The dependency order (quantity → materials, quantity → labor-hours → labor-cost, then overhead) is the accounting-canonical ordering for the §6 three-bucket rollup, and confirms that the quoted quantity drives both material and labor lines independently.

## 13. Standard costing — the discipline that lets a quote be set *before* the job runs (OpenStax §8.1 primary)

**CONFIRMED** against OpenStax *Managerial Accounting* §8.1 ([Explain How and Why a Standard Cost Is Developed](https://openstax.org/books/principles-managerial-accounting/pages/8-1-explain-how-and-why-a-standard-cost-is-developed)):

- **Standard cost definition** — verbatim: *"A standard cost is an expected cost that a company usually establishes at the beginning of a fiscal year for prices paid and amounts used."*
- **Why develop standards** — verbatim: to *"prepare the budget; manage material, labor, and overhead costs; and create a reasonable sales price for a good,"* and to *"compare the standard costs against its actual results to measure its efficiency."* Standard cost is explicitly named as a basis for setting a sales price — the quoting use case.
- **Standard cost card** — direct-material standard = *"a standard price per unit of material and a standard amount of material per unit"*; direct-labor standard combines a labor rate and a standard time per unit.
- **Ideal vs attainable standard** — an *ideal standard* assumes *"machines do not break down, employees show up on time, there are no defects, there is no scrap"* (unattainable, demotivating); an **attainable standard** is *"one that employees can reach with reasonable effort"* — neither so high it discourages nor so low it removes incentive.

**Design implication for quoting:** PRISM's per-feature/per-operation time and cost figures are, formally, a **standard cost card**. The textbook makes two doctrines explicit: (1) a quote SHOULD be built from pre-established standards (you cannot wait for actuals — same logic as the predetermined overhead rate in §7), and (2) those standards must be **attainable, not ideal** — a quote built on zero-scrap, zero-breakdown, zero-setup-loss ideal times will systematically under-quote. PRISM should base its standard times on attainable (realistic) shop performance, and a quote-vs-actual reconciliation loop is the mechanism for keeping standards honest. *(The specific standard times/rates are JM Die data, owner-gated.)*

## 14. Quote cost + promised lead time are outputs of a queue-governed supply chain, not isolated numbers (MIT OCW 15.763J primary)

**CONFIRMED** against MIT OpenCourseWare **15.763J Manufacturing System and Supply Chain Design (Spring 2005, Sloan)** ([lecture notes](https://ocw.mit.edu/courses/15-763j-manufacturing-system-and-supply-chain-design-spring-2005/pages/lecture-notes/)):

- The Sloan course's confirmed lecture spine includes, verbatim topic titles: *"Manufacturing System Design," "Queuing for System Design," "Manufacturing System Design: High volume automated lines — choice of buffers and buffer sizing," "Supply Chain Design I/II," "Flexibility and Capacity Planning,"* and *"Design of a Supply Chain for a New Product."*
- **Queueing and buffer/capacity decisions are first-class system-design topics** — confirming, at institutional curriculum level, that throughput, work-in-process buffers, and capacity sizing govern a manufacturing system's behavior.

**Design implication for quoting:** this **independently corroborates** the §10 (MIT 2.854) conclusion from a second MIT course and a supply-chain angle: a quoted delivery date is a function of capacity, buffers, and queue state — and the *material* portion of a quote depends on **supply-chain design** (sourcing, lead time, buffer inventory), not just the cut part. PRISM's quoting should therefore (a) treat lead-time quoting as capacity/queue-aware, and (b) recognize that material-availability and supplier lead time feed the quote's promised ship date as much as in-house cycle time does. *(Specific capacity, buffer, and supplier-lead-time numbers are JM Die shop/supply-chain state, owner-gated.)*

## 15. Government cost-estimation methodology — public + survey + model fusion, standardized to NAICS/SOC (NIST primary)

**CONFIRMED** against NIST news/program page ([New NIST Tool for Estimating Manufacturing Industry Costs](https://www.nist.gov/news-events/news/2020/01/new-nist-tool-estimating-manufacturing-industry-costs-beta-version)):

- The NIST **Manufacturing Cost Guide** *"estimates various manufacturing costs at the industry level using a combination of public data, survey data, and modeling"* — a three-input fusion methodology (not a single source).
- **Cost categorization is standardized** — verbatim: *"Costs are grouped into various standardized categories such as the North American Industry Classification System (NAICS) and the Standard Occupational Classification (SOC) system."*
- It explicitly fills **data gaps** where public surveys exclude internal costs (e.g. *"Internal costs, such as those for a maintenance department, are excluded"* from existing surveys), spanning *"hundreds of cost categories in hundreds of manufacturing industries."*

**Design implication for quoting:** two governance lessons for PRISM cost data. (1) A defensible cost model **fuses multiple sources** (the shop's own actuals + published industry/labor data + a model) rather than trusting any single number — the same multi-source discipline NIST applies at industry scale. (2) Tagging cost categories to a **standard taxonomy (NAICS / SOC)** makes a shop's cost structure benchmarkable against public data; PRISM can map its labor categories to SOC and its operations to NAICS to sanity-check JM Die's internal rates against a government baseline. *(All specific external benchmark dollar figures stay owner-gated — they require pulling the actual NIST/BLS data tables, which were not WebFetch-readable in this pass.)*

> **NOTE (R12 honesty):** Several promising untapped sources were attempted but could NOT be confirmed and are therefore NOT cited: the NPTEL "Economics in Machining" lecture PDFs (machining-economics / minimum-cost cutting-speed / Taylor-driven cost optimization) — both NPTEL mirrors returned ECONNREFUSED / self-signed-cert errors after retry; the NIST tsapps "Cost and Process Information Modeling for Dry Machining" (Feng) PDF and the MIT 2.810 lecture-1 PDF — both returned unreadable binary; and BLS OEWS wage-methodology pages — HTTP 403 (BLS blocks automated fetch). The machining-cost-optimization theme (optimum cutting speed minimizing total cost-per-piece) thus remains a genuine gap in this wiki, to be filled when a fetch-readable primary source is found.

## Sources (WebFetch-confirmed)

1. NIST Special Publication 1176 — *Costs and Cost Effectiveness of Additive Manufacturing* (three-driver cost decomposition; power/space <1% exclusion; average-cost = total ÷ annual volume; Hopkinson-Dickens 8-year machine-cost method) — https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1176.pdf
2. American Micro Inc. — *CNC Machining Cycle Time Calculation* (machining time = length ÷ feed; cycle-time component decomposition) — https://www.americanmicroinc.com/resources/cnc-machining-cycle-time-calculation/
3. KEYENCE — *Machining Formula Collection: Milling* (vc = πDN/1000; vf = fz·z·n) — https://www.keyence.com/ss/products/measure-sys/machining/formula/milling.jsp
4. Protolabs — *How to Reduce CNC Machining Costs* (machinability cost effect; named feature cost drivers; tolerance/finish cost) — https://www.protolabs.com/resources/design-tips/how-to-reduce-cnc-machining-costs/
5. Protolabs — *Understanding CNC Manufacturing Costs* (digital-manufacturing quoting; machining-time + fixture + setups model; no separate setup fee / no upfront NRE) — https://www.protolabs.com/en-gb/resources/blog/understanding-cnc-manufacturing-costs/

### Added 2026-06-09 (free-textbook + free-college-course deepening — untapped categories)

6. OpenStax — *Principles of Accounting, Vol. 2: Managerial Accounting* §4.1 *Distinguish between Job Order Costing and Process Costing* (free CC-BY-NC-SA textbook; job-order-costing definition; made-to-order = job-order case; process-costing contrast; example service/job industries) — https://openstax.org/books/principles-managerial-accounting/pages/4-1-distinguish-between-job-order-costing-and-process-costing
7. OpenStax — *Managerial Accounting* §4.2 *Three Major Components of Product Costs under Job Order Costing* (free textbook; verbatim definitions of direct materials, direct labor incl. payroll taxes/benefits, manufacturing overhead) — https://openstax.org/books/principles-managerial-accounting/pages/4-2-describe-and-identify-the-three-major-components-of-product-costs-under-job-order-costing
8. OpenStax — *Managerial Accounting* §4.4 *Compute a Predetermined Overhead Rate and Apply Overhead to Production* (free textbook; predetermined-rate formula = budgeted overhead ÷ budgeted activity; why predetermined not actual; labor-hours → machine-hours base shift under automation) — https://openstax.org/books/principles-managerial-accounting/pages/4-4-compute-a-predetermined-overhead-rate-and-apply-overhead-to-production
9. OpenStax — *Managerial Accounting* §6.3 *Calculate Activity-Based Product Costs* (free textbook; ABC definition; five-step ABC method; cost-pool / cost-driver; ABC vs single plantwide rate) — https://openstax.org/books/principles-managerial-accounting/pages/6-3-calculate-activity-based-product-costs
10. OpenStax — *Managerial Accounting* §5.2 *Explain and Identify Conversion Costs* (free textbook; conversion cost = direct labor + factory overhead; labor+overhead together convert raw material to finished part) — https://openstax.org/books/principles-managerial-accounting/pages/5-2-explain-and-identify-conversion-costs
11. OpenStax — *Managerial Accounting* §2.2 *Identify and Apply Basic Cost Behavior Patterns* (free textbook; fixed/variable/mixed cost definitions; fixed cost per-unit declines with volume — the formal basis for NRE/setup amortization; mixed cost Y = a + bx) — https://openstax.org/books/principles-managerial-accounting/pages/2-2-identify-and-apply-basic-cost-behavior-patterns
12. MIT OpenCourseWare — *2.854 Introduction to Manufacturing Systems (Fall 2016)*, Lecture Notes (free graduate course; manufacturing-systems curriculum spine — queueing, inventory, scheduling, Toyota Production System, quality/quantity interactions; quoting as output of a stochastic queue-governed system) — https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/pages/lecture-notes/

### Added 2026-06-10 (second deepening pass — OTHER OpenStax chapters + second MIT OCW course + NIST gov tool)

13. OpenStax — *Managerial Accounting* §2.3 *Estimate a Variable and Fixed Cost Equation and Predict Future Costs* (free textbook; high-low method to split mixed costs; Y = a + bx cost equation; scatter graphs + least-squares regression as the more accurate estimator — the empirical basis for deriving NRE `a` + per-part variable `b` from quote-vs-actual data) — https://openstax.org/books/principles-managerial-accounting/pages/2-3-estimate-a-variable-and-fixed-cost-equation-and-predict-future-costs
14. OpenStax — *Managerial Accounting* §7.2 *Prepare Operating Budgets* (free textbook; operating-budget definition; causal build order sales → production → direct materials → direct labor → overhead; quote as a single-job reverse-slice of this chain) — https://openstax.org/books/principles-managerial-accounting/pages/7-2-prepare-operating-budgets
15. OpenStax — *Managerial Accounting* §8.1 *Explain How and Why a Standard Cost Is Developed* (free textbook; standard-cost definition; standard cost used to set a sales price; standard cost card for materials + labor; ideal vs attainable standards — quote must use attainable, not ideal, times) — https://openstax.org/books/principles-managerial-accounting/pages/8-1-explain-how-and-why-a-standard-cost-is-developed
16. MIT OpenCourseWare — *15.763J Manufacturing System and Supply Chain Design (Spring 2005, Sloan)*, Lecture Notes (free graduate course; queueing for system design, buffer sizing, flexibility & capacity planning, supply-chain design — corroborates lead-time/cost as queue- and supply-chain-governed outputs from a second MIT course) — https://ocw.mit.edu/courses/15-763j-manufacturing-system-and-supply-chain-design-spring-2005/pages/lecture-notes/
17. NIST — *New NIST Tool for Estimating Manufacturing Industry Costs (Beta version)* (U.S. government program page; Manufacturing Cost Guide fuses public + survey + model data; costs standardized to NAICS / SOC taxonomies; multi-source cost-estimation governance) — https://www.nist.gov/news-events/news/2020/01/new-nist-tool-estimating-manufacturing-industry-costs-beta-version

## Cross-refs
- Galaxy brain: `mcp-server/src/engines/quoting/MEMORY.md`
- Galaxy doctrine: `mcp-server/src/engines/quoting/CLAUDE.md`
- Staged packet (owner-gated remainder): `knowledge/wiki/quoting/_staging/deep-domain-research-2026-06-09.md`
- Free-source corpus index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md`
