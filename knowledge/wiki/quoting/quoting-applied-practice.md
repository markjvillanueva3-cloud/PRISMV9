---
title: Quoting Applied Practice — estimation gotchas, failure modes, and technique decisions a world-class quoter has that theory does not teach
galaxy: quoting
owner_slot: charlie
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: "Each practitioner gotcha below was WebFetch-confirmed on 2026-06-10 against a reputable free/legal primary source (the free OpenStax CC-BY-NC-SA Managerial Accounting textbook chapter-8 variance sections, and reputable reference articles on cost overrun, planning fallacy, reference-class forecasting, scope creep, profit margin, and the experience curve). Failed fetches (OpenStax 8.4 mis-numbered URL, SCORE 403, Xometry 404, Protolabs page returned no quantity-pricing content) were dropped, not fabricated. This is the PRACTITIONER-KNOWLEDGE layer; it deliberately does NOT repeat the theory in quoting-foundations.md or the link directory in quoting-source-atlas.md. Every specific dollar rate, margin %, scrap %, and markup number remains owner-gated for charlie."
tags: [quoting, applied-practice, tribal-knowledge, estimation-gotchas, optimism-bias, scope-creep, NRE-amortization, quote-vs-actual, variance-analysis, margin-erosion, charlie]
---

# Quoting Applied Practice

The **practitioner-knowledge ("tribal") layer** for the quoting galaxy: the hard-won gotchas, failure modes, and technique decisions a world-class estimator carries that pure cost theory does not teach. Theory says *how* to roll up a job cost (`quoting-foundations.md`); the link directory says *where* to keep learning (`quoting-source-atlas.md`). This file says **how quotes go wrong in the field, why, and how an expert avoids it.**

Each note below = the gotcha + WHY it happens + the expert's avoidance, with an inline citation to a free/legal source. **No dollar rate, margin, scrap %, or markup number is asserted** — those stay owner-gated for charlie against JM Die actuals (see the Owner-gate section).

---

## Common failure modes (why quotes come in under)

### FM-1 — Systematic optimism bias: estimates are wrong in a *consistent direction*, not randomly
The dominant quoting failure is not random scatter around the truth — it is a **systematic skew toward under-estimating** time and cost. This is the *planning fallacy*: *"a phenomenon in which predictions about how much time will be needed to complete a future task display an optimism bias and underestimate the time needed"* and, more broadly, *"the tendency to underestimate the time, costs, and risks of future actions and at the same time overestimate the benefits"* ([Wikipedia, Planning fallacy](https://en.wikipedia.org/wiki/Planning_fallacy)). The corrosive part: it persists *"regardless of the individual's knowledge that past tasks of a similar nature have taken longer than generally planned"* — *"people recognize that their past predictions have been over-optimistic, while insisting that their current predictions are realistic."*
**WHY:** the estimator takes an *inside view* — reasoning forward from the specific operations on this part — and that view is structurally blind to the setup losses, re-fixturing, scrap, and interruptions that always materialize.
**Avoidance:** an expert does not "try harder to be realistic" (the fallacy survives that). They take the **outside view** — anchor the new quote to the *actual* outcomes of similar past jobs (see TD-1), and treat any estimate that lands below the historical band for that part-class as a red flag to recheck, not a win.

### FM-2 — Cost overruns are the norm, and the cause is often structural, not technical
At the institutional level the same pattern is documented: cost estimates *"can mislead grossly and systematically,"* and overruns are widespread (e.g., for IT projects *"71 percent of projects came in over budget, exceeded time estimates, and had estimated too narrow a scope"*) ([Wikipedia, Cost overrun](https://en.wikipedia.org/wiki/Cost_overrun)). Two named causes matter for quoting: **optimism bias** (*"optimism bias with forecasters"*) and **strategic misrepresentation** (*"political-economic explanations see overrun as the result of strategic misrepresentation of scope or budgets"*).
**WHY:** optimism bias is cognitive (FM-1); strategic misrepresentation is incentive-driven — a quote can be shaded low to *win the job*, with the overrun absorbed later. Both produce the same artifact: a quote that the shop cannot actually deliver at.
**Avoidance:** separate the *estimate* (the honest should-cost) from the *bid* (the price you choose to offer). Shading the bid to win is a business decision; shading the *estimate* corrupts the data the whole learning loop (TD-1) depends on. Keep the estimate honest, gate the discount.

### FM-3 — Scope creep: the quote was right for the job as scoped, but the job grew
A quote priced correctly for a defined scope still loses money when the work silently expands. Scope creep is *"continuous or uncontrolled growth in a project's scope, generally experienced after the project begins,"* and it *"can more easily enter projects while presented as small, simple, and easy to implement changes. However, the volume or actual complexity of these changes can risk project failure"* ([Wikipedia, Scope creep](https://en.wikipedia.org/wiki/Scope_creep)). It *"goes on to affect other parts of the project, such as project timeframe and cost."*
**WHY:** in a shop, creep arrives as "while you're in there, can you also..." additions, a revised drawing, a tighter tolerance call-out discovered mid-run, or an undocumented finish requirement — each individually trivial, collectively margin-destroying.
**Avoidance:** the cited control is documentary and procedural — *"have documents that clearly define to both the client and project team what the project's scope is ... and the methods for changing the scope,"* and *"occasionally refusing customer requests is key ... since it can reduce the risk of scope creep."* The expert quote names the exact revision/print it priced and routes every change through a **change order** (re-quote), never a verbal "sure."

### FM-4 — Margin/markup confusion: applying a markup while believing you hit a margin
A subtle arithmetic trap quietly erodes profit. *Markup* is *"the percentage of cost price that one gets as profit on top of cost price"*; *margin* is *"the percentage of selling price that is turned into profit"* — and they are not equal. The cited worked example: an item bought for $40 and sold for $100 carries a **150% markup but only a 60% margin** ([Wikipedia, Profit margin](https://en.wikipedia.org/wiki/Profit_margin)). A given markup percentage always produces a *smaller* margin percentage.
**WHY:** an estimator who wants, say, a certain *margin* but applies that number as a *markup on cost* systematically under-prices — the realized margin is always less than the intended figure.
**Avoidance:** fix one convention in the quoting engine and label it explicitly (cost-plus-markup vs target-margin), and compute the other from it rather than treating the two percentages as interchangeable. *(The specific target numbers are owner-gated.)*

---

## Technique decisions (what the expert does differently)

### TD-1 — Anchor to history with reference-class forecasting, not to the part in front of you
The single most valuable corrective. Reference-class forecasting is *"a method of predicting the future by looking at similar past situations and their outcomes"* via three steps: *"Identify a reference class of past, similar projects. Establish a probability distribution for the selected reference class ... Compare the specific project with the reference class distribution"* ([Wikipedia, Reference class forecasting](https://en.wikipedia.org/wiki/Reference_class_forecasting)). It works because *"human judgment is generally optimistic due to overconfidence and insufficient consideration of distributional information,"* and *"disregard of distributional information, i.e. risk, is perhaps the major source of error in forecasting."* The fix is the **outside view**: *"using distributional information from previous ventures similar to the one being forecast."*
**Technique:** classify the part (material class, feature mix, machine, qty tier), pull the *distribution* of actual hours/cost from the shop's own history for that class, and quote against that distribution — not against a fresh-from-the-print inside-view estimate. This is the direct operational antidote to FM-1 and FM-2.

### TD-2 — Treat the first article and the repeat run as different costs (experience/learning curve)
Quoting a 1-off at the same per-part rate as a 500-piece run double-counts learning. The experience curve is empirical: *"the more times a task has been performed, the less time is required on each subsequent iteration,"* and *"each time cumulative volume doubles, value-added costs fall by a constant percentage"* — historically Wright's finding that *"every time total aircraft production doubled, the required labor time for a new aircraft fell by 20%,"* with industry estimates of a **10% to 25% cost reduction per doubling** ([Wikipedia, Experience curve effects](https://en.wikipedia.org/wiki/Experience_curve_effects)). First units cost more because of labor-learning, standardization, and equipment utilization that *"accumulate, making later production runs substantially cheaper than initial articles."*
**Technique:** the expert quotes the first article (proving-out the program, fixture, and tooling) and the steady-state per-part separately, and discounts repeat runs along a learning curve rather than at the flat first-article rate. This pairs with the NRE-amortization math in `quoting-foundations.md` §9 — but learning erosion is a *distinct* second effect on the variable cost itself, not just on the fixed NRE spread.

### TD-3 — Setup/program time is fixed-per-job; mis-amortizing it dominates small-batch error
Under-quoting is most violent on small batches because setup and programming are *fixed per job* and spread thin only at volume — the mixed-cost model `total = NRE + (per-part variable x qty)` from `quoting-foundations.md` §9. The labor side of getting this wrong shows up as a **labor efficiency (time) variance**: *"the direct labor time variance compares the actual labor hours used to the standard labor hours that were expected,"* and *"an unfavorable outcome means you used more hours than anticipated to make the actual number of production units"* ([OpenStax Managerial Accounting §8.3, Labor Variances](https://openstax.org/books/principles-managerial-accounting/pages/8-3-compute-and-evaluate-labor-variances)).
**WHY:** a real setup includes work-holding/fixturing, tool loading and offsets, first-article inspection, and program proving — the planning fallacy (FM-1) prunes exactly these from the inside-view estimate.
**Technique:** carry setup as its own line at an *attainable* (not ideal) hour count, divided by the actual batch quantity — and never let a small-qty quote inherit a per-part rate that silently assumes the setup was already amortized over a large run.

### TD-4 — Build the material line with an explicit yield/scrap allowance, then audit it as a quantity variance
Material under-quoting comes from costing the *net* part instead of the *gross* stock consumed (kerf, facing/cleanup stock, drops, expected scrap). The accounting hook that catches it is the **materials quantity variance**: *"the direct materials quantity variance compares the actual quantity of materials used to the standard materials that were expected to be used,"* where an *"unfavorable outcome means you used more materials than anticipated"* ([OpenStax Managerial Accounting §8.2, Materials Variances](https://openstax.org/books/principles-managerial-accounting/pages/8-2-compute-and-evaluate-materials-variances)). The *price* side is a separate **materials price variance** (*"compares the actual price per unit ... to the standard price per unit"*) — splitting the two lets management *"better analyze the two variances and enhance decision-making."*
**Technique:** quote material on a *standard quantity that already includes a yield/scrap allowance* (the gross stock), then reconcile actual-vs-standard *separately* for price and for quantity — so a blown material line tells you whether you mis-bought (price) or under-allowed for scrap (quantity), which are fixed by different actions. *(The specific scrap/yield % is owner-gated.)*

---

## Verification / the learning loop (what stops repeat misquotes)

### VL-1 — The quote-vs-actual variance loop is the mechanism that keeps standards honest
A quote built on standards is only as good as the loop that corrects those standards against reality. *"Requiring managers to determine what caused unfavorable variances forces them to identify potential problem areas or consider if the variance was a one-time occurrence,"* and *"management can use standard costs to prepare the budget for the upcoming period, using the past information to possibly make changes to production elements"* ([OpenStax Managerial Accounting §8.4, How Companies Use Variance Analysis](https://openstax.org/books/principles-managerial-accounting/pages/8-5-describe-how-companies-use-variance-analysis)).
**WHY it matters for quoting:** without this loop, the same optimistic standard (FM-1) re-prices every future job at the same wrong number — the misquote compounds. The variance loop is precisely the empirical feed that powers the reference-class distribution in TD-1.
**Technique:** after every job, post actual hours/material/cost against the quoted standard, classify the variance (price vs quantity, rate vs efficiency), and feed the corrected standard back. This is the operational form of "the learning that prevents repeat misquotes."

### VL-2 — Beware "managing to the variance" — the loop can be gamed
The feedback loop has a failure mode of its own: *"often, management will manage 'to the variances,' meaning they will make decisions that may not be advantageous to the company's best interests over the long run, in order to meet the variance report threshold limits"* ([OpenStax Managerial Accounting §8.4](https://openstax.org/books/principles-managerial-accounting/pages/8-5-describe-how-companies-use-variance-analysis)).
**WHY:** if hitting the standard becomes the goal, people optimize the *report* (rushing inspection, skipping deburr, padding the next estimate) rather than the *truth* — quietly re-introducing the optimism the loop was meant to remove.
**Avoidance:** treat variances as *diagnostic signal*, not a performance scorecard to satisfy. The point is a more accurate next quote, not a green variance report. An expert investigates *why* a standard was beaten as carefully as why it was missed — a "favorable" variance that came from cutting a corner is a future quality cost, not a saving.

---

## Owner-gate (NOT promoted)

Per R12, every shop-specific NUMBER is left for charlie to set from JM Die actuals — this file promotes the *technique/gotcha*, never the number:
- **Target margin / markup percentages** (FM-4) — set the convention and one canonical figure from JM Die's pricing policy; do not adopt any example percentage from a source.
- **Learning-curve slope** (TD-2) — the 10-25%/doubling band is the industry range; JM Die's actual slope per part-class must be fit from its own repeat-run history, not assumed.
- **Setup/program standard hours** (TD-3) — attainable hour counts per machine/operation are shop data.
- **Scrap / yield allowance %** (TD-4) — the allowance per material + stock form is owner data; only the *method* (gross-stock standard + split price/quantity variance) is promoted.
- **Variance investigation thresholds** (VL-1/VL-2) — the % or dollar threshold above which a variance is investigated is a management-policy number for charlie.
- **Reference-class definitions / distributions** (TD-1) — the part-class taxonomy and the historical hour/cost distributions are JM Die's own quote-vs-actual data, owned by charlie.

No cutting/physics safety constants (kc1.1, Taylor C/n, feed/speed limits) appear here — those live in `mcp-server/src/physics/constants.ts`, owned by the physics galaxies.

## Sources

All WebFetch-confirmed on 2026-06-10. Free/legal: OpenStax is CC-BY-NC-SA; the reference articles are freely readable.

1. Wikipedia — *Planning fallacy* (systematic underestimation of time/cost; persists despite knowing past tasks ran long; outside-view correction) — https://en.wikipedia.org/wiki/Planning_fallacy
2. Wikipedia — *Cost overrun* (overruns systemic; optimism bias + strategic misrepresentation as named causes; estimates mislead "grossly and systematically") — https://en.wikipedia.org/wiki/Cost_overrun
3. Wikipedia — *Reference class forecasting* (3-step outside-view method; distributional information; the major source of forecasting error is disregarding distribution/risk) — https://en.wikipedia.org/wiki/Reference_class_forecasting
4. Wikipedia — *Scope creep* (definition; small-change accumulation; documentary + change-control avoidance; "occasionally refusing requests") — https://en.wikipedia.org/wiki/Scope_creep
5. Wikipedia — *Profit margin* (markup vs margin definitions; $40/$100 → 150% markup but 60% margin; confusion under-prices) — https://en.wikipedia.org/wiki/Profit_margin
6. Wikipedia — *Experience curve effects* (cost falls a constant % per cumulative-volume doubling; Wright 20%; industry 10-25%; first articles cost more) — https://en.wikipedia.org/wiki/Experience_curve_effects
7. OpenStax — *Principles of Accounting, Vol. 2: Managerial Accounting* §8.2 *Compute and Evaluate Materials Variances* (price variance vs quantity variance; favorable/unfavorable; split aids decision-making) — https://openstax.org/books/principles-managerial-accounting/pages/8-2-compute-and-evaluate-materials-variances
8. OpenStax — *Managerial Accounting* §8.3 *Compute and Evaluate Labor Variances* (labor rate variance vs labor time/efficiency variance; unfavorable = more hours than anticipated — the setup-time gotcha) — https://openstax.org/books/principles-managerial-accounting/pages/8-3-compute-and-evaluate-labor-variances
9. OpenStax — *Managerial Accounting* §8.4 *Describe How Companies Use Variance Analysis* (investigate causes; feed past info into future standards/budget; "managing to the variance" gaming risk) — https://openstax.org/books/principles-managerial-accounting/pages/8-5-describe-how-companies-use-variance-analysis

## Cross-refs
- Domain theory spine: `knowledge/wiki/quoting/quoting-foundations.md`
- Living free-source directory: `knowledge/wiki/quoting/quoting-source-atlas.md`
- Galaxy brain: `mcp-server/src/engines/quoting/MEMORY.md`
- Galaxy doctrine: `mcp-server/src/engines/quoting/CLAUDE.md`
