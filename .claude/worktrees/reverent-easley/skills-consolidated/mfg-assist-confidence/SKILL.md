---
name: mfg-assist-confidence
description: Get confidence scores and uncertainty estimates for PRISM recommendations
---

# Recommendation Confidence Assessment

## When To Use
- Need to know how reliable a PRISM speed/feed or tooling recommendation is
- Evaluating whether to run a test cut or go straight to production
- Comparing multiple recommendation options by reliability
- Identifying what additional data would improve recommendation quality

## How To Use
```
prism_intelligence action=assist_confidence params={
  recommendation_id: "rec_123",
  context: { material: "Ti-6Al-4V", operation: "finishing" }
}
```

**Parameters:**
- `recommendation_id` (optional): ID from a prior PRISM recommendation to assess
- `context` (optional): Material, operation, and machine context for general confidence assessment

## What It Returns
- `confidence_score`: Overall confidence from 0.0 to 1.0 (below 0.6 suggests test cut)
- `data_quality`: How complete and relevant the underlying data is
- `model_quality`: How well the calculation model fits this scenario
- `limiting_factors`: Ranked list of what reduces confidence the most
- `improvement_suggestions`: Concrete steps to raise confidence (test cuts, material certs, tool data)
- `risk_assessment`: What happens if the recommendation is off — severity and likely failure mode

## Examples
- **High Confidence**: Speed/feed for 4140 steel roughing → 0.92 confidence, well-characterized material, extensive Kienzle data, suggest proceed directly
- **Medium Confidence**: Ti-6Al-4V finishing with new coating → 0.71 confidence, limited by coating performance data, suggest light test cut at 80% parameters
- **Low Confidence**: Exotic nickel alloy with unfamiliar insert → 0.45 confidence, sparse material data, unknown tool-material interaction, recommend conservative test matrix
- **Improving Score**: `limiting_factors: ["material_variant"]` → upload material test certificate to raise from 0.68 to estimated 0.82
