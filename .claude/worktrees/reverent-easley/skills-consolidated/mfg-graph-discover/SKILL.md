---
name: mfg-graph-discover
description: Discover hidden patterns and correlations in manufacturing data
---

# Pattern Discovery Engine

## When To Use
- Finding non-obvious correlations between machining parameters and outcomes
- Discovering clusters of similar manufacturing processes or failures
- Identifying emerging trends in tool wear, quality, or productivity data
- Mining historical job data for optimization opportunities

## How To Use
```
prism_intelligence action=graph_discover params={domain: "milling", pattern_type: "correlation", min_confidence: 0.7}
```

## What It Returns
- `patterns` — discovered patterns with descriptions and statistical support
- `correlations` — pairs of variables with correlation strength and direction
- `clusters` — groups of similar entities or processes found in the graph
- `anomalies` — outlier data points that deviate from discovered patterns
- `actionable_insights` — plain-language recommendations derived from patterns

## Examples
- `graph_discover params={domain: "turning", pattern_type: "failure"}` — discover common failure patterns in turning operations
- `graph_discover params={material: "aluminum", pattern_type: "optimization"}` — find optimization patterns for aluminum machining
- `graph_discover params={pattern_type: "correlation", variables: ["feed_rate", "surface_finish", "tool_life"]}` — discover multi-variable correlations
