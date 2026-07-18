---
title: Business Advanced Techniques — TOC throughput scheduling, lean flow design, working-capital & S&OP strategy
galaxy: business
owner_slot: hotel
status: VERIFIED-PARTIAL
verified_by: "papa-advanced-techniques (2026-06-10)"
verification_method: each advanced technique below was confirmed by WebFetch against a reputable free/legal source (Wikipedia sourced articles, Lean Production vendor knowledge base) on 2026-06-10. Confirmed = the qualitative strategy/method/trade-off appeared verbatim or in substance on the fetched page. Only the qualitative STRATEGY/METHOD/trade-off DIRECTION is promoted; every specific number (days, ratios, percentages, dollar figures, capital-charge rates, buffer sizings) is described by SHAPE only and left owner-gated for hotel. Fetches that 404'd were retried then re-sourced; nothing was fabricated.
tags: [business, advanced-techniques, theory-of-constraints, drum-buffer-rope, throughput-accounting, lean, tps, muda, value-stream-mapping, takt-time, heijunka, smed, jidoka, cash-conversion-cycle, working-capital, sop, eva, economic-profit, world-leader-depth]
---

# Business Advanced Techniques

The **world-leader-depth** layer for the **business** galaxy: the state-of-the-art operations and finance STRATEGIES an expert manufacturing operator reaches for once the intro theory and the common gotchas are second nature. A controller who has mastered the OEE formula (foundations) and avoids the volume-cost distortion trap (applied-practice) still has to make the *hard strategic moves* — decide which jobs to run when the bottleneck is the binding constraint, design flow so waste cannot accumulate, free trapped cash from the balance sheet, and align sales, operations, and finance to one number. This file captures those advanced methods.

**Scope distinction (R8 — do not duplicate):**
- `business-foundations.md` = THEORY ("what is the correct method?"). It already covers OEE = A x P x Q, the predetermined-overhead rate, the TOC *five focusing steps*, GAAP recognition, EOQ, and the LP/simulation toolkit. This file does NOT re-explain those.
- `business-applied-practice.md` = practitioner GOTCHAS ("what goes wrong in the field?"). It already covers ABC-vs-volume distortion, FIFO/LIFO, cash-vs-profit, Goodhart KPI gaming, and the throughput-vs-absorption *conflict flag*. This file does NOT re-explain those.
- **This file** = ADVANCED STRATEGY ("the method that makes the difference at the top of the field"). Foundations names the five focusing steps; this file gives the *scheduling mechanism and the product-mix decision rule* that operationalize them. Applied-practice flags that absorption rewards building inventory; this file gives the *flow-design and working-capital strategies* that prevent it.

**Honesty boundary (R12 + SAFETY):** every technique below was WebFetch-confirmed on 2026-06-10. Only the qualitative strategy and trade-off DIRECTION is promoted. **No buffer size, no days-of-inventory target, no capital-charge rate, no batch-size threshold, no dollar figure is stated** — those are owner-gated for hotel and, for any machine/physics constant, live ONLY in `mcp-server/src/physics/constants.ts`. Where a source gave a number, the method is promoted and the number is gated.

---

## 1. Theory of Constraints — the operational layer beyond the five steps

Foundations gives the *five focusing steps* (identify / exploit / subordinate / elevate / prevent inertia). The advanced operator does not stop at the framing — they apply the two mechanisms that turn it into a daily schedule and a pricing decision.

### Technique 1.1 — Product-mix by throughput per constraint-unit (not by gross margin)
**The technique:** when the bottleneck limits output, rank products NOT by their absolute margin or by revenue, but by **throughput contribution per unit of the constrained resource's time**. The product that earns the most throughput per bottleneck-minute is made first; the constraint's scarce capacity is the thing being rationed.
**When an expert uses it:** any time demand exceeds the capacity of one resource (the shop is constraint-limited, not market-limited) and they must choose which orders to accept or sequence. This is the quantitative form of "exploit the constraint" (step 2).
**Trade-off direction:** maximizing per-unit gross margin can DESTROY total profit when the high-margin part hogs the bottleneck — a lower-margin part that consumes far less constraint time can yield more total throughput. The direction is: prioritize the highest throughput-per-constraint-time job, accept that a "high-margin" job may be deprioritized, and subordinate non-constraint resources so they never starve the bottleneck. TOC measures performance by three figures — throughput ("the rate at which the system generates money through sales"), operational expense ("all the money the system spends in order to turn inventory into throughput"), and inventory/investment ("all the money that the system has invested in purchasing things which it intends to sell") — and a decision is good only if it improves the system, not a local metric. ([Wikipedia — Theory of constraints](https://en.wikipedia.org/wiki/Theory_of_constraints))
**PRISM business application:** a scheduling/quote-acceptance engine should rank the order book by throughput-per-bottleneck-time, not by quoted margin alone, and surface *which resource is the current constraint* so the ranking is recomputed when it moves. The throughput-per-constraint-unit *coefficient* for JM Die's machines is owner-gated.

### Technique 1.2 — Drum-Buffer-Rope scheduling + buffer management
**The technique:** schedule the entire shop off the constraint. The **drum** is the constraint — "the speed at which the constraint runs sets the 'beat' for the process and determines total throughput." The **buffer** is protective inventory/time placed *immediately upstream of the constraint* (a constraint buffer) and at the shipping end (a customer buffer) — "the level of inventory needed to maintain consistent production," so upstream hiccups never starve the bottleneck. The **rope** ties new-work release to constraint consumption: "a signal generated by the constraint indicating that some amount of inventory has been consumed... triggers an identically sized release of inventory into the process." Work is *pulled* in at the constraint's rate, not pushed in at the order rate.
**When an expert uses it:** to gate job release in a constraint-limited shop so WIP does not pile up everywhere while the bottleneck still sets throughput. Buffer management then monitors how deep into each buffer the work has penetrated to spot emerging starvation before it stalls the constraint.
**Trade-off direction:** releasing work at the order-book rate ("keep everyone busy") maximizes local utilization but inflates WIP and lead time without raising throughput — the constraint output is unchanged. The direction is: throttle release to the constraint's beat (less WIP, shorter lead time, same or higher throughput), and protect ONLY the constraint with buffer, not every station. ([Lean Production — Theory of Constraints / Drum-Buffer-Rope](https://www.leanproduction.com/theory-of-constraints/))
**PRISM business application:** a release/dispatch engine should size and watch a constraint buffer + customer buffer and gate WIP injection to the constraint's consumption signal — the pull-release form of "subordinate everything to the constraint." Buffer sizes in hours/units are owner-gated.

---

## 2. Lean / TPS — designing flow so waste cannot accumulate

Foundations lists "Toyota Production System" as a curriculum topic; applied-practice flags overproduction as a costing trap. The advanced operator uses the concrete TPS *design tools* that make waste visible and structurally impossible to hide.

### Technique 2.1 — Muda elimination by the eight waste categories (overproduction first)
**The technique:** systematically hunt the eight wastes (muda) Taiichi Ohno catalogued — **transport, inventory, motion, waiting, overproduction, overprocessing, defects**, and the later-added **unused skills/talent**. The discipline is to classify every activity as value-adding ("any activity that produces goods or provides a service for which a customer is willing to pay") versus muda, and further split muda into Type I (non-value-adding but currently necessary) and Type II (unnecessary, eliminate now).
**When an expert uses it:** as the lens for any process-improvement pass — naming the *category* of waste forces a specific countermeasure rather than vague "be more efficient."
**Trade-off direction:** overproduction is treated as the *worst* waste because it "cascades into other waste forms" — it manufactures the inventory, transport, and waiting wastes downstream. The direction is: attack overproduction first (it is the root that creates the others), and never confuse Type-I-necessary waste with value. ([Wikipedia — Muda (Japanese term)](https://en.wikipedia.org/wiki/Muda_(Japanese_term)))
**PRISM business application:** a process-analysis/shop-floor surface should tag observed activities by muda category and rank overproduction signals (parts built ahead of a committed sale) highest — the structural form of the absorption-vs-throughput conflict in applied-practice Gotcha 8.

### Technique 2.2 — Value-stream mapping (system-level waste, not workstation-level)
**The technique:** draw a **value-stream map** — "a visual tool that displays all critical steps in a specific process" tracking "the flow of both materials and information," with value-adding steps drawn along the centre and non-value-adding steps as perpendicular verticals so waste is visually obvious. Build a **current-state map** (observed reality) and a **future-state map** (the improved target), then close the gap.
**When an expert uses it:** when local optimizations have stopped paying off and the losses are *between* steps (queues, handoffs, information delays) rather than inside any one workstation.
**Trade-off direction:** optimizing individual workstations ("speed up each machine") can leave total lead time unchanged because the waste lives in the flow between them. The direction is: optimize the *stream* (the system across multiple processes), accepting that a locally "slower" step may be correct if it improves end-to-end flow. ([Wikipedia — Value-stream mapping](https://en.wikipedia.org/wiki/Value-stream_mapping))
**PRISM business application:** the operations/scheduling layer should model the order-to-ship flow as a value stream (material + information) and target the between-step waits, complementing the workstation-level OEE of foundations.

### Technique 2.3 — Takt time + heijunka (level-load to demand, not to capacity)
**The technique:** compute **takt time** — "the average time interval between the start of production of one unit and the start of production of the next unit," set by available production time divided by customer demand — and pace the line to it. Then **level the production schedule (heijunka)** so work does not "bulk in front of certain stations due to peaks in workload."
**When an expert uses it:** to set a sustainable production rhythm matched to actual demand and to expose bottlenecks (a station that cannot keep takt is the constraint, visible immediately).
**Trade-off direction:** running faster than takt produces overproduction; running slower causes shortage/late delivery. The direction is: match the production rate to the demand rate and level the mix — neither chase maximum machine speed nor batch to peaks. If a line cannot hold takt, the answer is demand leveling, added resources, or process re-engineering — not silently building ahead. ([Wikipedia — Takt time](https://en.wikipedia.org/wiki/Takt_time))
**PRISM business application:** a capacity/scheduling engine should express load against takt and level the daily mix; the specific takt value (it depends on JM Die's available-time and demand inputs) is owner-gated.

### Technique 2.4 — SMED (setup reduction unlocks small-batch economics)
**The technique:** apply **Single-Minute Exchange of Die (SMED)** — Shigeo Shingo's method to cut changeover time. The core move is to classify every setup step as **internal** ("can only be performed when the process is stopped") or **external** ("done while the last batch is being produced, or once the next batch has started"), then *convert internal setup to external* (e.g., pre-stage and pre-heat tooling off the machine) and streamline what internal setup remains.
**When an expert uses it:** whenever long changeovers are forcing large batches "to amortize that cost" — the precondition for just-in-time and inventory reduction.
**Trade-off direction:** when changeover is expensive, economic logic *demands* big batches (which create inventory and overproduction waste). The direction is: collapse changeover time so "the economic case for large batches evaporates," unlocking smaller lots, more flexibility, and lower inventory — accepting more frequent setups as the price of less inventory. ([Wikipedia — Single-minute exchange of die](https://en.wikipedia.org/wiki/Single-minute_exchange_of_die))
**PRISM business application:** a job-sequencing/lot-sizing engine should treat setup time as a *reducible lever*, not a fixed cost — the smaller the achievable changeover, the smaller the economic batch it should recommend. Any batch-size number is owner-gated (and any per-machine cutting parameters stay in `constants.ts`).

### Technique 2.5 — Jidoka / autonomation (build quality in at the source, stop-the-line)
**The technique:** **jidoka ("automation with a human touch")** — design machines and authorize operators so that "if an abnormal situation arises, the machine stops and the worker will stop the production line." The mechanism is a four-step loop: "detect the abnormality; stop; fix or correct the immediate condition; investigate the root cause and install a countermeasure," often hardened with poka-yoke (mistake-proofing). It also *separates human work from machine work* so an operator is "only engaged when there is a problem alerted by the machine."
**When an expert uses it:** to stop defects propagating downstream and to free operators from babysitting machines — the foundation of multi-machine manning.
**Trade-off direction:** the conventional instinct is to keep the line running and inspect/rework at the end. The direction is the opposite — "stop and fix problems as they occur rather than pushing them down the line" — accepting short-term line stoppages to prevent defect cascades and to force root-cause fixes (the differentiator Liker/Meier credit to Toyota). ([Wikipedia — Autonomation](https://en.wikipedia.org/wiki/Autonomation))
**PRISM business application:** the quality-to-business bridge (Cpk/SPC gates feeding scrap cost) should encode stop-the-line authority and root-cause capture as a process contract, not optional inspection — quality built in at the source, not sorted at the end.

---

## 3. Working-capital & cash strategy — freeing cash trapped in the balance sheet

Applied-practice warns that a profitable month can drain cash (the AR/inventory/AP timing gotcha). The advanced operator turns that warning into an active optimization target.

### Technique 3.1 — Cash conversion cycle optimization
**The technique:** manage the **cash conversion cycle (CCC = DIO + DSO − DPO)** — the days inventory is held, plus days to collect from customers, minus days taken to pay suppliers. It measures "how long a firm will be deprived of cash if it increases its investment in inventory in order to expand customer sales." A shorter CCC means cash returns faster; a *negative* CCC means the business collects from customers before it pays suppliers — operations are financed by the supply chain, not by the owner's cash.
**When an expert uses it:** to diagnose *where* cash is trapped (slow inventory, slow collections, or fast payments) and to compare cash-management quality across competitors — and as the lever a growing job shop pulls before borrowing.
**Trade-off direction:** the optimization direction is reduce DIO (turn inventory faster), reduce DSO (collect sooner), extend DPO (pay later) — BUT the source is explicit that "shortening the CCC creates its own risks": over-aggressive collection terms can lose customers and stretched payables can damage supplier relationships. The direction is shorten the cycle *up to the point where relationship/supply risk outweighs the cash benefit* — not minimize it blindly. ([Wikipedia — Cash conversion cycle](https://en.wikipedia.org/wiki/Cash_conversion_cycle))
**PRISM business application:** a working-capital surface should compute the CCC from the costing/inventory/AR/AP data and flag which component is the dominant cash trap — the proactive form of applied-practice Gotcha 4. Target day-counts for JM Die are owner-gated policy values.

### Technique 3.2 — Economic Value Added / economic profit (charge for ALL capital)
**The technique:** judge performance by **economic profit, not accounting profit**. EVA is "the net profit less the capital charge ($) for raising the firm's capital" — and crucially that capital charge "encompasses all capital sources — both debt and equity — not merely interest expenses." Value is created only "when the return on the firm's economic capital employed exceeds the cost of that capital."
**When an expert uses it:** for capex justification (e.g., elevating a constraint per TOC step 4 — should the shop buy the machine?) and for judging whether a product line or the whole shop is *actually* creating value, because it forces the cost of the owner's tied-up equity into the decision.
**Trade-off direction:** a business "can report positive accounting earnings while simultaneously destroying shareholder value" because the income statement charges interest on debt but never charges for equity. The direction is: subtract a charge for *all* capital employed (the equity cost is real even though it is invisible on the P&L) — a job that looks profitable on accounting margin can be value-destroying once the capital it ties up is charged. ([Wikipedia — Economic value added](https://en.wikipedia.org/wiki/Economic_value_added))
**PRISM business application:** a capex/ROI or product-line-keep engine should apply a capital charge to the assets a decision consumes, so "elevate the constraint" (buy capacity) is evaluated on economic profit, not just accounting payback. The cost-of-capital rate is owner-gated (it is a JM Die financial input, not a confirmed universal constant).

---

## 4. Cross-functional alignment — one plan across sales, operations, and finance

### Technique 4.1 — Sales & Operations Planning (S&OP)
**The technique:** run a monthly **S&OP** cycle — "a business management planning process that integrates demand forecasting with supply planning to create a plan that attempts to balance demand with available resources." It brings "sales operations, production capacity, inventory levels, and budgets so that different parts of the company work from the same assumptions," over a planning horizon that can extend out roughly a year-and-a-half, and forces *true integration* (not mere coordination) so all functions "commit to mutually negotiated, achievable plans."
**When an expert uses it:** to stop the recurring failure where "marketing pursues aggressive sales targets while operations struggles with unrealistic supply constraints" — the single-plan discipline that aligns the demand plan, the supply/capacity plan, and the financial plan.
**Trade-off direction:** letting each function keep its own forecast (sales optimistic, operations conservative, finance separate) feels autonomous but guarantees conflicting plans and either stockouts or excess inventory. The direction is: converge on ONE consensus plan that balances competing interests, accepting that each function gives up its private optimum for a globally feasible one. ([Wikipedia — Sales and operations planning](https://en.wikipedia.org/wiki/Sales_and_operations_planning))
**PRISM business application:** the business galaxy is the natural home for an S&OP surface that reconciles the demand forecast, the capacity plan (from the TOC/takt layers above), and the financial plan into one number the whole shop runs on — the integrating layer over the constraint-scheduling and working-capital techniques in §1-3.

---

## Owner-gate (NOT promoted) — hotel verifies before any live engine/doctrine use

Promoted above: the qualitative STRATEGY, METHOD, and trade-off DIRECTION only. Deliberately left for hotel to set against a primary source or live JM Die data:

- **Every DBR buffer size** (constraint-buffer and customer-buffer depth in hours/units) and the **buffer-management penetration thresholds** that trigger expediting (Technique 1.2) — sizing is shop-specific, not a confirmed universal value.
- **The throughput-per-constraint-time coefficient** for each JM Die machine, and the throughput / operating-expense / inventory dollar inputs that feed the product-mix ranking (Technique 1.1) — these are live financial/physics figures.
- **The takt-time value** for any JM Die line (depends on available-time and demand inputs) and any **heijunka mix ratios** (Technique 2.3).
- **The target economic batch size / SMED changeover-time targets** in minutes (Technique 2.4). The single-digit-minute "SMED" naming target on the source is a label, not a JM Die commitment.
- **The cash-conversion-cycle target day-counts** (DIO/DSO/DPO targets) and the day-count thresholds that should flag a cash trap (Technique 3.1) — policy values hotel sets.
- **The cost-of-capital / WACC rate and the capital-charge percentage** used in any EVA/economic-profit calculation (Technique 3.2) — a JM Die financial input, NOT a confirmed universal constant.
- **The S&OP planning-horizon length and cycle cadence** beyond the qualitative "monthly, ~18-month horizon" the source states (Technique 4.1) — confirm against the shop's actual cadence.
- **Any machine/physics cutting constant** — n/a for this galaxy. None of the advanced techniques above promotes a kc1.1, Taylor C/n, SFM/RPM/IPR, chip-load, feed/depth, or coolant-pressure value. All such numbers live ONLY in `mcp-server/src/physics/constants.ts` and are owner-gated for hotel; this file states only the SHAPE of relationships (e.g., "match production rate to demand rate," "shorten the cycle up to the relationship-risk point"), never a number.

## Sources (WebFetch-confirmed 2026-06-10)

- [Wikipedia — Theory of constraints (throughput / OE / inventory measures, product-mix subordination)](https://en.wikipedia.org/wiki/Theory_of_constraints) *(sourced encyclopedia article)*
- [Lean Production — Theory of Constraints / Drum-Buffer-Rope & buffer management](https://www.leanproduction.com/theory-of-constraints/) *(vendor knowledge base)*
- [Wikipedia — Muda (Japanese term): the eight wastes](https://en.wikipedia.org/wiki/Muda_(Japanese_term)) *(sourced encyclopedia article)*
- [Wikipedia — Value-stream mapping](https://en.wikipedia.org/wiki/Value-stream_mapping) *(sourced encyclopedia article)*
- [Wikipedia — Takt time (and heijunka / production leveling)](https://en.wikipedia.org/wiki/Takt_time) *(sourced encyclopedia article)*
- [Wikipedia — Single-minute exchange of die (SMED)](https://en.wikipedia.org/wiki/Single-minute_exchange_of_die) *(sourced encyclopedia article)*
- [Wikipedia — Autonomation (jidoka)](https://en.wikipedia.org/wiki/Autonomation) *(sourced encyclopedia article)*
- [Wikipedia — Cash conversion cycle](https://en.wikipedia.org/wiki/Cash_conversion_cycle) *(sourced encyclopedia article)*
- [Wikipedia — Economic value added (EVA / economic profit)](https://en.wikipedia.org/wiki/Economic_value_added) *(sourced encyclopedia article)*
- [Wikipedia — Sales and operations planning (S&OP)](https://en.wikipedia.org/wiki/Sales_and_operations_planning) *(sourced encyclopedia article)*

## Cross-refs

- Theory spine (do not duplicate): `knowledge/wiki/business/business-foundations.md`
- Practitioner gotchas (do not duplicate): `knowledge/wiki/business/business-applied-practice.md`
- Living source directory: `knowledge/wiki/business/business-source-atlas.md`
- Owner-gated numeric packet: `knowledge/wiki/business/_staging/deep-domain-research-2026-06-09.md`
- Galaxy doctrine: `mcp-server/src/engines/business/CLAUDE.md`
