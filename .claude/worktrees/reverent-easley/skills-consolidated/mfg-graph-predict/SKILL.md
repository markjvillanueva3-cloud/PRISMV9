---
name: mfg-graph-predict
description: Predict outcomes using knowledge graph reasoning
---

# Graph-Based Prediction

## When To Use
- Predicting tool life for untested material-tool combinations
- Forecasting quality outcomes before running a job
- Estimating machining performance from similar historical cases
- Predicting failure likelihood based on graph-connected risk factors

## How To Use
```
prism_intelligence action=graph_predict params={target: "tool_life", material: "Ti-6Al-4V", tool: "carbide_4flute", operation: "slotting"}
```

## What It Returns
- `prediction` — predicted value or outcome with units
- `confidence_interval` — upper and lower bounds of the prediction
- `basis` — graph paths and nodes used as prediction basis
- `similar_cases` — historical cases most similar to the query
- `risk_factors` — identified risks that could affect the prediction

## Examples
- `graph_predict params={target: "surface_finish", material: "316L", strategy: "hsm", Vc: 200}` — predict Ra from graph knowledge
- `graph_predict params={target: "failure_probability", tool_hours: 45, material: "Inconel"}` — predict failure risk from usage data
- `graph_predict params={target: "cycle_time", part_complexity: "high", material: "aluminum_7075"}` — estimate cycle time from similar parts
