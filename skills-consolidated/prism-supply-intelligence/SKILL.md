---
name: prism-supply-intelligence
version: 1.0.0
description: |
  Supply chain intelligence skill for lead time prediction, material substitution,
  and supply risk assessment. Uses the PredictiveMaintenanceEngine's supply-side
  analytics for procurement optimization.

  Modules Covered:
  - PredictiveMaintenanceEngine (maint_predict, maint_schedule, maint_health, maint_spare)

  Gateway Routes: prism_intelligence → maint_*
  R10 Revolution: Rev 6 — Predictive Supply Chain
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "supply", "lead time", "substitute", "alternative material", "out of stock", "procurement"
- User needs material substitutions when preferred material is unavailable
- User wants to predict tool/consumable lead times and plan procurement

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-supply-intelligence")`
2. Identify the supply concern (material shortage, tool availability, spare parts)
3. Use maintenance/supply actions:
   - `prism_intelligence→maint_predict` — Predict when consumables/tools will need replacement
   - `prism_intelligence→maint_schedule` — Generate maintenance/procurement schedule
   - `prism_intelligence→maint_health` — Assess current supply health status
   - `prism_intelligence→maint_spare` — Recommend spare parts inventory levels

### What It Returns
- **Format**: Structured JSON with predictions, schedules, risk assessments, substitution recommendations
- **Success**: Procurement timeline with confidence intervals and alternative suppliers
- **Failure**: No data for material → check material registry coverage

### Examples
**Example 1**: "When should I reorder KC5010 inserts?"
→ `maint_predict(consumable: "KC5010", usage_rate: "current")` → Reorder in 12 days, lead time 5-7 days, safety stock: 20 inserts

**Example 2**: "4140 steel is backordered, what can I use instead?"
→ Cross-reference with `genome_match` for material substitution → 4340 (95% genome match, +5% Vc adjustment needed)

# SUPPLY INTELLIGENCE

## Prediction Models
- **Tool life forecasting**: Based on current wear rates and material hardness trends
- **Consumable burn rate**: Insert/coolant/filter usage patterns
- **Lead time estimation**: Historical supplier performance data
- **Risk scoring**: Supply chain vulnerability assessment

## Material Substitution Protocol
1. Identify original material properties (genome fingerprint)
2. Search for available alternatives with high genome similarity
3. Calculate parameter adjustments needed for each substitute
4. Rank by: availability, cost delta, parameter compatibility, qualification status
5. Flag any substitutions requiring re-qualification or customer approval

## Inventory Optimization
- Min/max stock levels based on usage patterns and lead times
- Just-in-time ordering triggers with safety buffers
- Seasonal demand adjustment factors
- Multi-supplier hedging recommendations
