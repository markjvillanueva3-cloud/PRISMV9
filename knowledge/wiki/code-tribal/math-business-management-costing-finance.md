---
schema: ideablock-v1
title: "Business management mathematics — cost accounting, NPV/IRR, EOQ, quoting, break-even, learning curves"
domain: "Business management mathematics"
category: business-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Manufacturing Economics
  - Horngren "Cost Accounting"
  - Brealey & Myers "Principles of Corporate Finance"
  - Wright (1936) — the learning-curve model
extracted_via: human-authored
extracted_at: 2026-05-21T16:45:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-BUSINESS)
---

## Question

The financial + cost mathematics for running a machine shop as a business — costing, capital investment, inventory, quoting, break-even, learning curves.

## Answer (canonical — cost it right, price it right, invest it right)

### 1. Cost accounting — the job cost

```
Job cost = direct_material + direct_labor + applied_overhead
Applied overhead = overhead_rate × allocation_base   (base: machine-hours, labor-hours, or ABC drivers)
Machine-hour rate = (depreciation + space + power + maintenance + tooling) / annual_machine_hours
Fully-burdened rate = machine_rate + labor_rate + overhead_allocation
```
**Activity-Based Costing (ABC)** allocates overhead by *activity drivers* (setups, inspections, material moves) instead of one blanket rate — it reveals that low-volume high-setup jobs are far costlier than a blanket rate shows. The blanket-rate distortion is why shops unknowingly lose money on small-lot work.

### 2. Time value of money

```
FV = PV·(1+i)ⁿ            PV = FV/(1+i)ⁿ          [i = discount rate, n = periods]
```
**NPV** — net present value of a cash-flow stream:
```
NPV = Σ CFₜ/(1+i)ᵗ − initial_investment
```
Invest if NPV > 0. **IRR** — the discount rate where NPV = 0; invest if IRR > hurdle rate. **Payback period** — years to recoup the investment (ignores time value — a screening tool, not a decision tool).

Worked example — a $200k machine saving $60k/yr for 5 yr at i=10%:
`NPV = 60·(P/A,10%,5) − 200 = 60·3.791 − 200 = 227.5 − 200 = +$27.5k` → invest.

### 3. Inventory — EOQ

The economic order quantity minimizes ordering + holding cost:
```
EOQ = √( 2·D·S / H )       [D annual demand, S cost per order, H holding cost per unit per year]
```
**Reorder point** `ROP = d·L + safety_stock` (demand-during-lead-time + buffer). **Safety stock** for a service level `z` (z=1.65 for 95 %): `SS = z·σ_DL` where `σ_DL` is the std-dev of demand over lead time. **ABC inventory** — the 80/20: ~20 % of SKUs (A items) = ~80 % of value; tight control on A, loose on C.

### 4. Quoting — price build-up

```
Quoted price = total_cost / (1 − margin_fraction)
```
Note: price = cost/(1−m), NOT cost·(1+m). A 30 % *margin* means price = cost/0.70 = cost×1.43 — a 43 % *markup*. Confusing margin with markup systematically under-prices. **Quantity break** pricing reflects setup amortization: `unit_price(q) = (setup_cost/q) + per_unit_cost`, then + margin.

### 5. Break-even

```
Break-even units = fixed_cost / (price − variable_cost_per_unit)
Contribution margin = price − variable_cost          (per unit)
```
Above break-even, every unit's contribution margin is profit. **Make-vs-buy**: make if `make_variable_cost < buy_price` AND the volume covers the make fixed cost — break-even between make and buy: `q* = make_fixed / (buy_price − make_variable)`.

### 6. Learning curve (Wright's model)

Unit cost falls by a constant fraction each time cumulative volume doubles:
```
Tₙ = T₁ · n^b              b = log(learning_rate)/log(2)
```
An 80 % learning curve (b = log0.8/log2 = −0.322): the 2nd unit takes 80 % of the 1st, the 4th 80 % of the 2nd, etc. Critical for quoting a multi-unit job — quoting all N units at the first-unit time massively overprices; quoting at the last-unit time loses money on the early units. Quote the *cumulative average*.

### 7. Depreciation

- **Straight-line**: `(cost − salvage)/life` per year.
- **Declining-balance / MACRS**: accelerated — larger deductions early. Affects after-tax cash flow + the NPV of an investment.

### 8. Cost of quality

```
CoQ = prevention + appraisal + internal_failure + external_failure
```
Prevention + appraisal (conformance cost) trade against failure costs (non-conformance). The optimum is NOT zero defects at any cost — it's where the marginal prevention dollar equals the marginal failure dollar saved. External failure (a defect reaching the customer) is the most expensive — often 10× an internal catch.

### Anti-patterns

- **"Markup = margin."** A 30 % margin is a 43 % markup (price = cost/0.70). Pricing at cost×1.30 when you meant 30 % margin under-prices every job.
- **"One blanket overhead rate."** It cross-subsidizes — high-setup low-volume jobs are undercosted, high-volume jobs overcosted. ABC reveals the true cost.
- **"Payback period decides the investment."** Payback ignores time value + cash flows after payback. Use NPV/IRR for the decision; payback only as a fast screen.
- **"Quote N units at the first-unit time."** Ignores the learning curve — overprices and loses the job. Quote the cumulative-average with Wright's model.
- **"Minimize cost of quality → zero defects."** The optimum is the marginal-cost balance, not zero. But note: external-failure cost is so high it usually justifies aggressive prevention.
- **"Cheapest quote wins."** Below-cost quoting buys revenue at a loss. Know your fully-burdened cost + break-even before discounting.

### Tie-ins

- [[machining-tactics-material-removal-economics]] — per-part machining cost (the direct-cost input)
- [[math-shop-floor-management-throughput-oee]] — throughput + scheduling (the capacity side)
- [[deep-integration-bridge-pattern]] — ERP bridge (#11): quote → order → cost-actuals → invoice
- [[quality-first-article-inspection-and-spc-cadence]] — cost of quality
- [[print-to-program-pipeline-canonical]] — pipeline stage 18 (cost + price + lead-time)

## Provenance

Distilled from Machinery's Handbook 31e §Manufacturing Economics + Horngren "Cost Accounting" + Brealey & Myers "Principles of Corporate Finance" + Wright (1936) learning-curve model. Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-BUSINESS — **54th canonical entry**, Phase-A mathematical expansion (business management domain). New `business-math` category.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `cost accounting`, `job cost`, `overhead rate`, `activity-based costing`, `ABC`, `NPV`, `IRR`, `payback`, `time value of money`, `EOQ`, `reorder point`, `safety stock`, `quoting`, `margin markup`, `break-even`, `contribution margin`, `make vs buy`, `learning curve`, `depreciation`, `cost of quality` keywords. Zero new wiring required.

## Cross-references

- [[machining-tactics-material-removal-economics]] — per-part machining cost
- [[math-shop-floor-management-throughput-oee]] — capacity + scheduling
- [[deep-integration-bridge-pattern]] — ERP bridge
- [[quality-first-article-inspection-and-spc-cadence]] — cost of quality
- [[print-to-program-pipeline-canonical]] — cost/price/lead-time stage
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
