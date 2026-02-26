---
name: mfg-learn-query
description: Query the federated learning network for cross-shop manufacturing insights
---

# Cross-Shop Knowledge Query

## When To Use
- Searching for proven parameters when machining an unfamiliar material
- Getting collective recommendations backed by data from multiple shops
- Benchmarking your process performance against network averages
- Finding solutions to machining problems others have already solved

## How To Use
```
prism_intelligence action=learn_query params={query: "optimal roughing parameters for Inconel 718 with ceramic inserts", min_confidence: 0.7}
```

## What It Returns
- `results` — ranked list of knowledge entries matching the query
- `confidence` — confidence score based on number of contributing shops
- `consensus` — degree of agreement across contributors (high/medium/low)
- `parameter_range` — min/max/median values from contributing shops
- `shop_count` — number of anonymous shops that contributed data

## Examples
- Query cutting parameters: `learn_query params={query: "speed feed for 12mm carbide endmill in Ti-6Al-4V roughing"}`
- Benchmark tool life: `learn_query params={query: "expected tool life for face milling Inconel 718", compare_to: {my_life_min: 25}}`
- Find problem solutions: `learn_query params={query: "how to reduce chatter in thin wall aluminum machining"}`
