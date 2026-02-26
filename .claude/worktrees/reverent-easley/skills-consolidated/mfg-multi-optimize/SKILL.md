---
name: mfg-multi-optimize
description: Multi-objective optimization returning Pareto frontier points — balance cost, MRR, and surface finish (MIT 6.251J)
---

## When To Use
- Need to balance competing objectives (cost vs. productivity vs. quality)
- Want to see the trade-off frontier between different manufacturing goals
- Evaluating how much one objective must be sacrificed to improve another
- Selecting operating points for different production scenarios (rush vs. economy)
- NOT for single-objective cost optimization (use mfg-cost-optimize)
- NOT for simple parameter calculation (use mfg-speed-feed)

## How To Use
### Multi-objective optimization
```
prism_calc action=multi_optimize params={
  material: "4140_steel",
  objectives: ["min_cost", "max_mrr", "min_surface_roughness"],
  constraints: {
    max_power_kW: 15
  }
}
```

### With weighted preferences
```
prism_calc action=multi_optimize params={
  material: "ti6al4v",
  objectives: ["min_cost", "max_mrr"],
  constraints: {
    max_power_kW: 20,
    max_surface_Ra_um: 1.6,
    max_tool_deflection_mm: 0.05
  },
  weights: {
    min_cost: 0.6,
    max_mrr: 0.4
  }
}
```

## What It Returns
```json
{
  "pareto_frontier": [
    {
      "point": 1,
      "label": "economy",
      "Vc_m_min": 180,
      "fz_mm": 0.25,
      "ap_mm": 2.5,
      "objectives": {
        "cost_per_part": 2.85,
        "MRR_cm3_min": 30.2,
        "surface_Ra_um": 2.8
      }
    },
    {
      "point": 2,
      "label": "balanced",
      "Vc_m_min": 240,
      "fz_mm": 0.20,
      "ap_mm": 3.0,
      "objectives": {
        "cost_per_part": 3.40,
        "MRR_cm3_min": 52.8,
        "surface_Ra_um": 1.8
      }
    },
    {
      "point": 3,
      "label": "productivity",
      "Vc_m_min": 320,
      "fz_mm": 0.15,
      "ap_mm": 3.5,
      "objectives": {
        "cost_per_part": 4.90,
        "MRR_cm3_min": 78.4,
        "surface_Ra_um": 1.2
      }
    }
  ],
  "weighted_optimum": {
    "Vc_m_min": 225,
    "fz_mm": 0.22,
    "ap_mm": 2.8,
    "cost_per_part": 3.15,
    "MRR_cm3_min": 45.6,
    "surface_Ra_um": 2.1
  },
  "trade_offs": {
    "cost_to_mrr": "Each $1 increase in cost buys ~24 cm3/min more MRR",
    "mrr_to_roughness": "Doubling MRR increases Ra by approximately 0.8 um"
  },
  "constraints_status": {
    "max_power_kW": {"limit": 15, "worst_case": 12.8, "status": "OK"}
  }
}
```

## Examples
### Three-objective Pareto optimization for steel milling
- Input: `prism_calc action=multi_optimize params={material: "4140_steel", objectives: ["min_cost", "max_mrr", "min_surface_roughness"], constraints: {max_power_kW: 15}}`
- Output: 3 Pareto points (economy at $2.85, balanced at $3.40, productivity at $4.90), trade-off analysis included
- Edge case: With 3+ objectives, the Pareto frontier becomes a surface; representative points are returned

### Weighted optimization for titanium with tight constraints
- Input: `prism_calc action=multi_optimize params={material: "ti6al4v", objectives: ["min_cost", "max_mrr"], constraints: {max_surface_Ra_um: 1.6}}`
- Output: Constrained Pareto frontier where all points satisfy Ra < 1.6 um, reducing available trade-off space
- Edge case: Tight constraints can make the Pareto frontier collapse to a single feasible point
