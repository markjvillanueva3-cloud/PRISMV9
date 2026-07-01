---
title: Quoting Advanced Techniques — uncertainty-quantified estimating, constraint-based pricing, and design-driven cost reduction that separate a top estimator from a competent one
galaxy: quoting
owner_slot: charlie
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: "Each advanced technique below was WebFetch-confirmed on 2026-06-10 against a reputable free/legal primary source (AACE/PMI-adjacent reference articles on three-point/PERT estimation, Monte Carlo method, cost estimate classification + contingency, expected-value-of-including-uncertainty; Theory of Constraints + contribution margin for constraint-based pricing; target costing + value engineering for design-driven cost reduction; the Wright power-law learning curve). This is the WORLD-LEADER-DEPTH strategy layer; it deliberately does NOT repeat the intro theory in quoting-foundations.md nor the common-gotcha tribal layer in quoting-applied-practice.md (it advances PAST applied-practice's reference-class/experience-curve/variance-loop notes into their quantitative, decision-theoretic, and capacity-economics forms). Every specific dollar rate, margin %, contingency %, learning-rate %, and constraint-hour rate remains owner-gated for charlie against JM Die actuals. NO cutting/physics constant (kc1.1, Taylor C/n, SFM/RPM/IPR/feed/depth, coolant psi) is asserted anywhere; those live ONLY in mcp-server/src/physics/constants.ts."
tags: [quoting, advanced-techniques, should-cost, parametric-estimating, three-point-estimation, monte-carlo, theory-of-constraints, constraint-pricing, contribution-margin, target-costing, value-engineering, risk-contingency, learning-curve, charlie]
---

# Quoting Advanced Techniques

The **world-leader-depth strategy layer** for the quoting galaxy: the state-of-the-art methods a top estimator reaches for *beyond* the intro theory (`quoting-foundations.md`) and *beyond* the common practitioner gotchas (`quoting-applied-practice.md`). The foundations file says how to roll up a should-cost; the applied-practice file says how quotes go wrong in the field. **This file says how the best estimators in the field quantify the uncertainty in a number, price against the bottleneck rather than the part, and drive cost out at design time instead of discovering it at the spindle.**

It builds *on top of* applied-practice — that file introduced reference-class forecasting (TD-1), the qualitative experience curve (TD-2), and the variance loop (VL-1) as gotcha-avoidance. This file advances those same ideas into their **quantitative, decision-theoretic, and capacity-economics forms** that separate a top estimator from a competent one. No technique here is repeated from the siblings; each is the deeper move.

Each technique = the method + WHEN an expert reaches for it + the trade-off DIRECTION + an inline free-source citation + one line on how the PRISM quoting galaxy applies it. **No dollar rate, margin, contingency %, learning-rate %, or constraint-hour rate is asserted** — those stay owner-gated for charlie (see the Owner-gate section).

---

## Theme A — Estimate the *distribution*, not the point (uncertainty-quantified estimating)

A competent estimator returns a number. A top estimator returns a number *with a defensible uncertainty band*, because the band is what lets you choose contingency, set win-probability, and know when a low quote is luck vs skill.

### AT-1 — Three-point (PERT) estimation: turn one guess into a mean and a spread
Instead of a single time/cost figure, capture three — optimistic (a), most-likely (m), pessimistic (b) — and combine them. Three-point estimation is *"used in management and information systems applications for the construction of an approximate probability distribution representing the outcome of future events, based on very limited information"* ([Wikipedia, Three-point estimation](https://en.wikipedia.org/wiki/Three-point_estimation)). Under the PERT distribution the expected value is the weighted mean `E = (a + 4m + b) / 6` and the standard deviation is `SD = (b - a) / 6`; *"E is a weighted average which takes into account both the most optimistic and most pessimistic estimates ... SD measures the variability or uncertainty in the estimate."*
**WHEN an expert uses it:** any line item where the most-likely value hides real downside — setup proving-out, first-article inspection, a marginal-machinability material, a feature the shop has not cut before.
**Trade-off DIRECTION:** the wider the (b - a) spread, the larger the SD, the more contingency the quote must carry (AT-4); a skewed-pessimistic part (b far above m) pulls the expected value *above* the most-likely guess — so quoting the most-likely figure systematically under-prices risky parts.
**PRISM applies it:** the quote engine should let each operation/feature standard carry an (a, m, b) triple, not a scalar, and roll the expected value with PERT weights — the structured input that feeds AT-3 and the contingency in AT-4. *(The specific a/m/b hour figures per operation are JM Die standards, owner-gated.)*

### AT-2 — Expected-value-of-including-uncertainty: why plugging in averages mis-prices a nonlinear quote (the flaw of averages)
The deeper reason point estimates fail is mathematical, not just psychological. *"Ignoring uncertainty can lead to very poor decisions, with estimations for result variables often misleading the decision maker"* ([Wikipedia, Expected value of including uncertainty](https://en.wikipedia.org/wiki/Expected_value_of_including_uncertainty)). The correct method supplies *"a probability distribution ... for each input variable, rather than a single best guess,"* whose variance *"reflects the degree of subjective uncertainty."* When the cost function is nonlinear (scrap risk that explodes past a tolerance threshold, a setup that occasionally doubles, a yield that collapses on hard material), the expected cost over the distribution is **not** the cost of the average inputs.
**WHEN an expert uses it:** whenever the cost relationship is nonlinear or has a tail — exactly the high-tolerance / hard-alloy / unproven-fixture jobs.
**Trade-off DIRECTION:** for a cost function that is convex in its uncertain input (the usual case — bad outcomes cost disproportionately more), the true expected cost lies *above* the average-input estimate, so naive averaging under-quotes; the steeper the nonlinearity, the larger the gap.
**PRISM applies it:** the quote engine must not collapse uncertain inputs to their means before computing cost on a nonlinear model — push the distribution through the model (AT-3), then take the mean of the *output*. This is the formal justification for AT-1/AT-3 over a single deterministic rollup.

### AT-3 — Monte Carlo simulation of the whole quote: a probability of profit, not a single price
Three-point estimates on individual lines compose into a *whole-job* distribution via simulation. Monte Carlo methods use *"repeated random sampling for obtaining numerical results"* — *"sample from a probability distribution for each variable to produce hundreds or thousands of possible outcomes,"* then *"aggregate estimates for worst-case, best-case, and most likely durations for each task to determine outcomes for the overall project"* ([Wikipedia, Monte Carlo method](https://en.wikipedia.org/wiki/Monte_Carlo_method)). The output is a full cost/time distribution, not a single figure.
**WHEN an expert uses it:** large or high-stakes quotes where many uncertain lines combine — and you want to state "this price covers the job with X% confidence" rather than hope.
**Trade-off DIRECTION:** more simulation runs tighten the estimated distribution (more compute for more confidence); a quote set at the distribution mean wins more bids but loses money on roughly half of *that* part's runs — pricing at a higher percentile of the distribution trades win-rate for protection.
**PRISM applies it:** the quote engine can simulate the assembled (a, m, b) line distributions to produce a cost CDF, letting charlie quote at a chosen confidence percentile instead of a bare expected value — the engine-side complement to AT-1. *(The chosen percentile / confidence policy is a charlie pricing decision, owner-gated.)*

### AT-4 — Estimate-class discipline + risk contingency as a *named, separate* allowance
A top estimator declares how mature the estimate is and carries risk explicitly rather than padding silently. Cost estimates are formally classified by scope-definition maturity (the AACE classification ladder from order-of-magnitude to definitive, with accuracy widening as definition shrinks), and **contingency** is a defined, separate allowance: *"an allowance for unknown costs which from experience are indicated as likely to occur, but are not identifiable"* — and, critically, it *"is not intended to compensate for poor estimate quality"* nor to fund out-of-scope changes ([Wikipedia, Cost estimate](https://en.wikipedia.org/wiki/Cost_estimate)).
**WHEN an expert uses it:** every quote — but the contingency *size* is driven by the estimate class (a rough RFQ off a napkin sketch carries more than a definitive quote off a fully-toleranced model) and by the AT-1/AT-3 spread.
**Trade-off DIRECTION:** contingency derived from the estimate's actual uncertainty (the AT-3 spread) is defensible and shrinks as definition improves; a flat hidden pad is non-defensible and either loses bids (too high) or loses money (too low). Contingency must never silently absorb scope creep — that is a change order (`quoting-applied-practice.md` FM-3), not contingency.
**PRISM applies it:** the quote schema should tag each quote with an estimate class and carry contingency as its **own line keyed to the AT-1/AT-3 uncertainty**, not folded invisibly into the rate — so the loop in `quoting-applied-practice.md` VL-1 can later ask whether contingency was right. *(The contingency % per class is owner-gated.)*

---

## Theme B — Price against the constraint, not the part (capacity/bottleneck economics)

A part's should-cost answers "what does it cost to make." It does **not** answer "what should we charge given that our 5-axis is the bottleneck and every hour on it is the scarcest thing we own." Top shops price the second question.

### AT-5 — Theory of Constraints: the bottleneck governs throughput, so price by its time
Theory of Constraints holds that *"any manageable system [is] limited in achieving more of its goals by a very small number of constraints,"* where *"a constraint is anything that prevents the system from achieving its goal"* and *"a chain is no stronger than its weakest link"* ([Wikipedia, Theory of constraints](https://en.wikipedia.org/wiki/Theory_of_constraints)). Its throughput-accounting view measures the system on *"throughput, operational expense, and inventory"* — throughput being *"the rate at which the system generates money through sales"* — and decides product mix by *"the impact ... on the throughput of the business"* rather than by absorbed unit cost.
**WHEN an expert uses it:** when one work-center (often the 5-axis cell, the wire-EDM, or the inspection bench) is chronically the gating resource and the shop is capacity-constrained, not demand-constrained.
**Trade-off DIRECTION:** a job that looks profitable on absorbed unit cost can be a *loss of throughput* if it hogs the constraint; the more constrained the shop, the more pricing should weight time-on-the-bottleneck over part-level cost. When the shop is *not* capacity-constrained, this weighting relaxes toward marginal cost.
**PRISM applies it:** the quote engine should know which work-center is the current constraint (capacity-aware quoting, foreshadowed in `quoting-foundations.md` §10/§14) and surface a job's bottleneck-hours so charlie can price scarce-resource time, not just part cost. *(The identity of the live constraint and its rate are JM Die shop-state, owner-gated.)*

### AT-6 — Contribution margin per constraint-hour: the correct ranking metric under capacity
The financial primitive that makes AT-5 operational is contribution margin *per unit of the limited resource*. Contribution margin is *"the selling price per unit minus the variable cost per unit"* (`C = P - V`), and it *"seeks to separate out variable costs from fixed costs on the basis of economic analysis"* — and it extends to a constrained resource, e.g. *"contribution margin (mean) per operating room hour"* ([Wikipedia, Contribution margin](https://en.wikipedia.org/wiki/Contribution_margin)). Dividing each job's contribution margin by the constraint-hours it consumes ranks jobs by how much money they make *per hour of the scarcest resource* — the correct mix/pricing order under capacity.
**WHEN an expert uses it:** comparing or prioritizing jobs (or accept/decline/price decisions) when bottleneck capacity is the binding limit.
**Trade-off DIRECTION:** maximize total contribution by favoring high-contribution-per-constraint-hour work; a high *absolute* margin job that ties up the constraint for a long time can rank *below* a thinner-margin job that clears the constraint fast — absorbed-cost ranking gets this backwards.
**PRISM applies it:** the quote engine can compute contribution-margin-per-constraint-hour for each quote (using the variable/fixed split it already needs for NRE amortization) to give charlie a capacity-aware acceptance/priority signal alongside the price. *(The actual contribution figures and the constraint-hour rate are owner-gated.)*

---

## Theme C — Drive cost out at design time, not discover it at the machine (proactive cost reduction)

The cheapest way to win a margin is to never incur the cost. The most advanced quoting organizations work *backward from the price the market allows* and *forward from the function the part must perform* — both at design time, before any chip is cut.

### AT-7 — Target costing: let the market price set the allowable cost (not cost-plus)
Target costing inverts cost-plus. It *"involves setting a target cost by subtracting a desired profit margin from a competitive market price"* and is *"a proactive cost planning, cost management, and cost reduction practice whereby costs are planned and managed out of a product ... early in the design and development cycle, rather than during the later stages"* — its *"cardinal rule ... is to never exceed the target cost"* ([Wikipedia, Target costing](https://en.wikipedia.org/wiki/Target_costing)).
**WHEN an expert uses it:** competitive/repeat/production work where the market price is known or capped and the question is "can we make it for less than that price minus our margin," not "what is our cost plus a markup."
**Trade-off DIRECTION:** target costing pushes cost-reduction pressure *upstream* onto design/process choices (it *"spreads the competitive pressure ... to product's designers and suppliers"*); the earlier in the design cycle you act, the cheaper the cost-out — discovering the overrun at the spindle is the most expensive place to find it.
**PRISM applies it:** PRISM can run a quote in *target-cost mode* — given a market price and target margin, compute the allowable cost and flag which features/operations (the cost drivers from `quoting-foundations.md` §3) push the design over it, so DFM feedback goes to the customer *before* the quote, not after the loss. *(The target margin and market price are charlie/customer data, owner-gated.)*

### AT-8 — Value engineering: improve the function-to-cost ratio without losing function
Value engineering is the systematic method behind the cost-out that target costing demands. It is *"a systematic analysis of the functions of various components and materials to lower the cost of goods, products and services with a tolerable loss of performance or functionality,"* built on the principle that *"value ... is the ratio of function to cost"* so *"value can ... be manipulated by either improving the function or reducing the cost"* — under the safeguard that *"basic functions be preserved and not be reduced"* ([Wikipedia, Value engineering](https://en.wikipedia.org/wiki/Value_engineering)).
**WHEN an expert uses it:** any quote where a feature, tolerance, finish, or material choice adds cost out of proportion to the function it delivers — the classic "this tolerance is tighter than the part needs" or "a cheaper stock form yields the same part."
**Trade-off DIRECTION:** lower cost while *holding function constant* improves value; cutting cost by quietly degrading a basic function is a false economy that returns as scrap, rework, or a quality cost (a "favorable" variance from cutting a corner, per `quoting-applied-practice.md` VL-2). Direction is always: reduce cost *subject to* preserved function.
**PRISM applies it:** the quote/DFM surface can flag features whose cost contribution (machinability class, tight-tolerance flag, deep-pocket/thin-wall driver) is high relative to their stated function, and propose function-preserving alternatives — a value-engineering pass folded into the quote rather than a separate study.

---

## Theme D — Make the estimating method itself match the job (method selection + quantitative learning)

A top estimator does not use one estimating method for every quote — they select the method to the available scope definition, and they quantify learning instead of hand-waving it.

### AT-9 — Choose the estimating method to the scope-definition maturity (analogy vs parametric vs bottom-up)
There is a named ladder of estimating methods, each fitting a different maturity: **analogous/factor** estimating is *"taking the known cost of a similar facility and factoring the cost for size, place, and time"*; **parametric/cost modeling** is where *"the estimator models the various parameters ... and applies costs to the derived scope"*; **bottom-up/definitive** means *"fully defining scope, quantifying line items, then applying costs to each itemized component"*; and **expert judgment** uses *"experience and judgment, historical values and charts, rules of thumb"* ([Wikipedia, Cost estimate](https://en.wikipedia.org/wiki/Cost_estimate); parametric estimating described as applying *"historical [cost] per unit of size"* in [Wikipedia, Cost estimation in software engineering](https://en.wikipedia.org/wiki/Cost_estimation_in_software_engineering)).
**WHEN an expert uses each:** analogy/parametric early when only a sketch or a few parameters are known (fast RFQ turnaround); bottom-up when a fully-toleranced model exists and accuracy matters (definitive quote); expert judgment as a sanity-check overlay on either.
**Trade-off DIRECTION:** parametric/analogy is fast but only as good as the calibration data and the analogy's closeness; bottom-up is accurate but slow and needs full definition — pushing for bottom-up on a vague RFQ wastes effort, while using analogy on a definitive job leaves accuracy on the table. Match the method to the AT-4 estimate class.
**PRISM applies it:** the quote engine can route a request to the right method by available scope — a parametric model keyed to part parameters (volume, feature counts, machinability class) for early/repeat quotes, bottom-up operation rollup when a full model/program exists — and label the resulting estimate class (AT-4). *(The parametric model's calibration coefficients are fit from JM Die history, owner-gated.)*

### AT-10 — Quantify the learning curve as a power law and fit it from your own data
`quoting-applied-practice.md` TD-2 introduced the *qualitative* fact that repeats cost less; the advanced move is the *quantitative* model. The Wright/log-linear learning curve is a power law `y = K x^n` where *"y = cost of the x-th unit, x = total cumulative units, K = cost of the first unit, n = exponent measuring learning strength,"* with the learning rate phi related by `n = log(phi)/log(2)` so *"the unit cost decreases by 1 - phi for every doubling of total units made"* ([Wikipedia, Learning curve](https://en.wikipedia.org/wiki/Learning_curve)). On log axes the curve is a straight line, so the exponent is **fit empirically** by regressing log-cost on log-cumulative-volume.
**WHEN an expert uses it:** quoting repeat-run and quantity-tier pricing, and any time the first-article and steady-state costs must be priced as *different* numbers along a curve rather than a flat rate.
**Trade-off DIRECTION:** a steeper learning curve (lower phi) means later units get much cheaper, so a flat first-article rate badly over-quotes large runs; assuming *more* learning than the data supports under-quotes them. The exponent is a fitted property of *this shop on this part-class*, not a universal constant.
**PRISM applies it:** PRISM can fit the per-part-class learning exponent from its own quote-vs-actual repeat-run history (the same empirical-fit discipline as `quoting-foundations.md` §11 high-low/regression) and price quantity tiers along the fitted power law instead of a flat per-part rate. *(The fitted phi/n per part-class is JM Die data, owner-gated — only the power-law SHAPE is asserted here, never a learning-rate %.)*

---

## How these compose (the advanced quoting stack)

The techniques are not independent tricks — they chain: **AT-9** picks the estimating method to scope; **AT-1/AT-2** turn each line into a distribution instead of a guess; **AT-3** composes those distributions into a whole-job cost CDF; **AT-4** sizes contingency and an estimate class from that spread; **AT-5/AT-6** re-rank and re-price the job by its draw on the bottleneck rather than its absorbed cost; **AT-7/AT-8** push cost-out upstream to design before the quote is even fixed; and **AT-10** prices the quantity dimension along an empirically-fitted learning curve. The output is a quote that carries a *known* confidence, a *defensible* contingency, a *capacity-aware* price, and a *design-informed* cost — which is what a world-class estimator delivers that a competent one does not. Every loop closes back through the quote-vs-actual variance feed (`quoting-applied-practice.md` VL-1), which re-calibrates the AT-1 spreads, the AT-9 parametric coefficients, and the AT-10 learning exponent from reality.

---

## Owner-gate (NOT promoted)

Per R12 + safety, this file promotes ONLY qualitative strategy/method/trade-off direction. Every shop-specific NUMBER and every physics constant is left for charlie / the physics galaxies — never asserted here:

- **Three-point (a, m, b) hour/cost figures** per operation and feature (AT-1) — JM Die standards, owner-gated.
- **Monte Carlo confidence percentile / pricing-at-percentile policy** (AT-3) — a charlie pricing decision.
- **Contingency percentages per estimate class** and the estimate-class accuracy bands as applied to JM Die (AT-4) — owner-gated; only the contingency *concept* and class *ladder* are promoted.
- **The live constraint identity and the constraint-hour rate** (AT-5/AT-6) — JM Die shop-state and burden data.
- **Contribution-margin dollar figures** (AT-6) — derived from JM Die's own variable/fixed split, owner-gated.
- **Target margin and market/competitive price** (AT-7) — charlie/customer pricing data.
- **Parametric model calibration coefficients** (AT-9) — fit from JM Die quote-vs-actual history, owner-gated.
- **Fitted learning-rate phi / exponent n per part-class** (AT-10) — JM Die repeat-run data; only the power-law SHAPE `y = K x^n` is promoted, never a learning-rate percentage as a constant.
- **All hourly machine/shop rates, target/markup/margin percentages, scrap/yield %, and variance-investigation thresholds** — already owner-gated in `quoting-foundations.md` and `quoting-applied-practice.md`; unchanged here.

**NO cutting/physics safety constant appears or is implied in this file.** kc1.1, Taylor C/n, SFM/RPM/IPR/chip-load/feed/depth values, and coolant pressures live ONLY in `mcp-server/src/physics/constants.ts`, owned by the physics galaxies — this quoting-strategy file states only the SHAPE of relationships (e.g. "more bottleneck-hours -> price scarce time higher", "convex cost -> average inputs under-quote"), never a number.

## Sources

All WebFetch-confirmed on 2026-06-10. Free/legal: reference articles freely readable; OpenStax cross-references are CC-BY-NC-SA. Distinct from the sibling files' source lists.

1. Wikipedia — *Three-point estimation* (a/m/b estimates; PERT mean E = (a+4m+b)/6 and SD = (b-a)/6; SD = uncertainty measure; confidence intervals from the spread) — https://en.wikipedia.org/wiki/Three-point_estimation
2. Wikipedia — *Expected value of including uncertainty* (ignoring uncertainty leads to poor decisions; distribution per input not a single guess; nonlinear functions of average inputs mislead — the flaw of averages) — https://en.wikipedia.org/wiki/Expected_value_of_including_uncertainty
3. Wikipedia — *Monte Carlo method* (repeated random sampling; sample each variable's distribution to produce thousands of outcomes; aggregate worst/best/most-likely into a project outcome distribution) — https://en.wikipedia.org/wiki/Monte_Carlo_method
4. Wikipedia — *Cost estimate* (named methods analogy/parametric/bottom-up/expert; AACE estimate-class ladder by scope-definition maturity; contingency = allowance for likely-but-unidentifiable costs, NOT a pad for poor estimate quality or scope change) — https://en.wikipedia.org/wiki/Cost_estimate
5. Wikipedia — *Cost estimation in software engineering* (parametric estimating = historical cost per unit of size; estimate size first then apply cost-per-unit — the parametric-model framing) — https://en.wikipedia.org/wiki/Cost_estimation_in_software_engineering
6. Wikipedia — *Theory of constraints* (constraint = weakest link limiting the system goal; five focusing steps; throughput accounting on throughput/operational-expense/inventory; product-mix by throughput impact not absorbed cost) — https://en.wikipedia.org/wiki/Theory_of_constraints
7. Wikipedia — *Contribution margin* (C = P - V; separates variable from fixed on economic analysis; extends to contribution per unit of a constrained resource, e.g. per operating-room hour — the per-constraint-hour ranking metric) — https://en.wikipedia.org/wiki/Contribution_margin
8. Wikipedia — *Target costing* (target cost = competitive market price minus desired profit margin; market-driven not cost-plus; proactive cost-out early in design; never exceed the target cost) — https://en.wikipedia.org/wiki/Target_costing
9. Wikipedia — *Value engineering* (systematic function analysis to lower cost with tolerable performance loss; value = function/cost ratio; manipulate value by improving function or reducing cost; preserve basic functions) — https://en.wikipedia.org/wiki/Value_engineering
10. Wikipedia — *Learning curve* (Wright power law y = K x^n; learning rate phi with n = log(phi)/log(2); unit cost falls 1-phi per cumulative-volume doubling; log-linear straight line so the exponent is fit empirically) — https://en.wikipedia.org/wiki/Learning_curve

## Cross-refs
- Domain theory spine (intro): `knowledge/wiki/quoting/quoting-foundations.md`
- Practitioner gotchas (common): `knowledge/wiki/quoting/quoting-applied-practice.md`
- Living free-source directory: `knowledge/wiki/quoting/quoting-source-atlas.md`
- Galaxy brain: `mcp-server/src/engines/quoting/MEMORY.md`
- Galaxy doctrine: `mcp-server/src/engines/quoting/CLAUDE.md`
