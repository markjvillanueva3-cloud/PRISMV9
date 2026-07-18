---
schema: ideablock-v1
title: "Material removal economics — cost per part, MRR vs tool-life trade-off, break-even regimes"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Economics of Cutting Speeds + §Tool Cost Per Part
  - F. W. Taylor 1907 "On the Art of Cutting Metals" — original V × T^n = C
  - Gilbert 1950 minimum-cost cutting velocity formulation
  - Sandvik Coromant — cost-per-part calculator + application guide
  - Modern Machine Shop "machine rate" articles 2010-2024
  - 4245-tribal corpus economics subset
extracted_via: human-authored
extracted_at: 2026-05-21T08:20:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-MRR-ECONOMICS)
---

## Question

When does a faster cycle (higher MRR, shorter tool life) win, and when does preserving the tool win? What's the actual cost-per-part math?

## Answer (canonical — cost-per-part is the universal arbiter; the operator's "fast" intuition is often wrong)

### The cost-per-part formula

```
cost_per_part = (cycle_min × machine_rate_per_min)               (machine time)
              + (insert_cost / parts_per_edge)                    (tool consumable)
              + (tool_change_min × machine_rate_per_min / parts_per_edge)  (changeover labor + idle)
              + (material_cost_per_part)                          (constant in this analysis)
              + (overhead_per_part)                               (constant in this analysis)
```

The first three terms are the **operator-controllable** cost. Speed/feed/depth choices push them up or down in opposing directions:
- **Higher Vc** → shorter cycle (term 1 ↓) but shorter tool life (terms 2 + 3 ↑)
- **Lower Vc** → longer cycle (term 1 ↑) but longer tool life (terms 2 + 3 ↓)

### Taylor's `V × T^n = C` from the cost POV

Taylor's tool-life relation revisited as a cost driver:

```
V × T^n = C        →  T = (C / V)^(1/n)        →  parts_per_edge ≈ T / cycle_min
```

For 1045 steel with carbide insert, typical `n = 0.25`, `C = 250`:

| Vc (m/min) | T (min) | parts/edge (if cycle=2min) | cycle term @ $1/min | insert + changeover term @ $5+$3/2parts |
|---|---|---|---|---|
| 150 | 7.7 | 3.85 | $2.00 | $2.08 |
| 200 | 2.44 | 1.22 | $2.00 | $6.56 |
| 250 | 1.00 | 0.50 | $2.00 | $16.00 |
| 100 | 39.0 | 19.5 | $2.00 | $0.41 |

**The pattern:** doubling Vc from 100 → 200 m/min cuts cycle time in half BUT increases tool consumable + changeover cost by 16×. At low machine rates ($1-2/min), the slower speed wins. At high machine rates ($5-10/min), the faster speed wins because cycle savings dominate the consumable cost.

This is why "the same speed/feed table" gets different answers from different shops with the same tool + same material — their *machine_rate* differs.

### Gilbert's minimum-cost cutting velocity

The optimal Vc that minimizes cost-per-part (Gilbert 1950):

```
V_opt = C × [n / ((1-n) × (insert_cost + changeover_min × machine_rate) / (cycle_min_at_V_opt × machine_rate))]^n
```

Operator's mental model: V_opt is *not* the max sustainable Vc; it's the Vc where the **marginal cycle savings equal the marginal tool cost increase**. For most production work, V_opt falls in the bottom 60-80% of the tool's listed Vc range — manufacturers' published "max Vc" is for "fastest possible cycle," not minimum cost.

### Regime map — when each strategy wins

| Regime | Conditions | Optimal direction |
|---|---|---|
| **High machine rate** ($5+/min): 5-axis, multi-spindle, automated cell | Cycle time dominates. | Push Vc up. Buy tool life with insert dollars. |
| **Low machine rate** ($1-2/min): manual mill, small-shop CNC | Tool consumable + labor dominates. | Pull Vc down. Save inserts, accept longer cycle. |
| **Expensive material** (Ti / Inconel / hardened tool steel) | Scrap risk dominates. | Pull Vc down + light DOC. Reliability + finish first. |
| **Expensive tool** ($50+ inserts, $200+ endmills) | Insert cost dominates. | Pull Vc down. Marginal cycle savings can't justify tool replacement. |
| **Short lot, no setup amortization** | Setup time dominates per-part. | Push Vc up. Run aggressively, accept higher tool wear since few parts. |
| **Lights-out production** (24/7 unattended) | Tool reliability dominates (no operator to react). | Pull Vc down + sister-tool strategy. Conservative speed prevents night-shift crash. |
| **Aluminum at high MRR** | Vc envelope is so wide it doesn't matter — geometry & chip control dominate. | Vc choice is secondary; focus on engagement + flute count + coolant. |

### When the "faster is better" intuition fails

Operators frequently default to "push the speed/feed" because it's the visible/measurable lever. But:

1. **Cycle time you save** is bounded by the proportional MRR increase (real, but linear at best).
2. **Tool life you sacrifice** is bounded by Taylor exponent — for `n = 0.25` (typical carbide steel work), 25% Vc increase = 60% tool-life loss.
3. **Tool changes add** non-productive time (changeover) AND consumable cost (insert) AND risk (mis-installed tool = scrap or crash).

At a shop with $1/min machine rate, $5 inserts, 3-min tool change: pushing Vc from 150 → 200 (33% faster) cuts cycle from 2.6 → 2.0 min (23% faster) but increases tool cost from $1.30 → $4.10 per part. **Net cost goes UP** because the saved $0.60 of cycle time costs $2.80 of tools.

At a shop with $8/min machine rate (5-axis with operator + multi-pallet), the same push cuts cycle from $20.80 → $16.00 per part (saving $4.80) while raising tool cost from $1.30 → $4.10. **Net cost goes DOWN** by $2.00 per part. Same tool, same material, same Taylor exponent — opposite optimal answer.

### What to optimize FIRST (before Vc)

In order of impact for most jobs:

1. **Tool selection** — wrong substrate/geometry costs 2-10× more than Vc fine-tuning ever can. See [[tooling-selection-by-material-and-feature]].
2. **Toolpath strategy** — adaptive vs conventional roughing: 30-200% cycle-time delta. See [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]].
3. **Feed-per-tooth** — fz is the operator's primary lever for MRR within a stable cut. Vc is the secondary lever for tool life.
4. **Engagement (ae × ap)** — chip-thinning + heat partition couples here. Adaptive's wide-engagement-budget is why it wins.
5. **THEN** Vc fine-tuning, with cost-per-part math justifying every step.

### Anti-patterns from the floor

- **"Run it at the tool's rated max Vc, that's what it's for."** Rated max Vc is for the *fastest possible cycle*, not the *lowest cost per part*. The economic optimum is almost always in the bottom 60-80% of the rated range.

- **"My buddy at Shop X runs this at 250 SFM, we should too."** Shop X has a different machine rate, different overhead, different lot size. Their optimum is not yours. The right approach: borrow their *technique* (tool selection, toolpath strategy, coolant choice), but recalculate Vc against your own cost structure.

- **"Cycle time is the only thing that matters."** Cycle time × machine rate is one of three terms. For a $1/min knee mill, it's 30-50 % of cost-per-part. For a $10/min 5-axis automated cell, it's 80-95 % — and you should optimize Vc accordingly.

- **"Pushing Vc 10% won't hurt anything."** Pushing Vc 10% on `n = 0.25` steel work loses ~30 % of tool life. Whether that "hurts" depends on which cost term dominates — same 10 % is invisible at high machine rate, devastating at low machine rate.

- **"Set-and-forget V × T^n."** Taylor's `n` and `C` are calibrated for *clean cuts with stable conditions*. Tool runout, chip-recutting, coolant failure, temperature drift all push the effective `n` lower (life-loss penalty steeper). Real shop Taylor `n` is often 0.18-0.22 vs handbook 0.25 — and the difference matters for the Gilbert optimum.

- **"Just push it until the tool breaks."** Tool breakage is not a cost-per-part optimization, it's a tool-replacement-trigger discipline. See [[tooling-tool-life-and-wear-management]] §replacement strategies. Breaking tools costs the broken-edge inspection + potential scrap + crash recovery — well outside the Vc-vs-tool-life trade.

### Tie-ins

- [[tooling-tool-life-and-wear-management]] — Taylor's `V × T^n = C` calibration + replacement strategies
- [[tooling-selection-by-material-and-feature]] — tool selection is the largest cost lever (before Vc)
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — strategy choice dominates Vc fine-tuning
- [[machining-tactics-in-cut-adjustments]] — chip-thinning + engagement math couples with Vc
- [[machining-tactics-coolant-strategy-selection]] — coolant choice modulates effective Taylor exponent
- [[operation-ordering-rough-finish-sandwich]] — sandwich strategy decisions are economic ones
- [[synthesis-thermal-envelope]] — thermal partition determines effective `n`

## Provenance

Distilled from the economics subset of the 4245-tribal corpus + Machinery's Handbook 31e §Economics of Cutting Speeds §Tool Cost Per Part + F. W. Taylor 1907 "On the Art of Cutting Metals" + Gilbert 1950 minimum-cost cutting velocity + Sandvik Coromant cost-per-part calculator + Modern Machine Shop machine-rate archive. Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-MRR-ECONOMICS — **25th canonical entry** of the wiki+tribal high-ROI pivot. Tier-2 universally-applicable (every shop makes this cost decision per job); closes the operator-economics gap previously touched in tool-life-and-wear but never given a decision-focused leaf.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `material removal economics`, `cost per part`, `MRR vs tool life`, `Taylor V T n C`, `Gilbert optimum`, `machine rate`, `cycle time vs tool life`, `economic Vc`, `optimal cutting speed`, `tool cost`, `production economics` keywords. Zero wiring required.

## Cross-references

- [[tooling-tool-life-and-wear-management]] — Taylor calibration + replacement triggers
- [[tooling-selection-by-material-and-feature]] — selection is the largest lever
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — strategy > Vc
- [[machining-tactics-in-cut-adjustments]] — chip-thinning + engagement math
- [[machining-tactics-coolant-strategy-selection]] — coolant × effective n
- [[operation-ordering-rough-finish-sandwich]] — sandwich = economic decision
- [[synthesis-thermal-envelope]] — heat partition × effective n
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule honored
