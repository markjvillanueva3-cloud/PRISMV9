---
name: mfg-tool-compare
description: Side-by-side comparison of two cutting tools — geometry, grade, applications, and price point head-to-head
---

## When To Use
- Deciding between two specific tools or insert grades for the same operation
- Comparing competitor products (Sandvik vs. Kennametal vs. Walter vs. Iscar)
- Evaluating trade-offs between tool life, cost per edge, and productivity
- Need a structured comparison to justify tool selection decisions
- NOT for searching tools by description (use mfg-tool-search)
- NOT for recommendations from scratch (use mfg-tool-recommend)

## How To Use
### Compare two tools head-to-head
```
prism_data action=tool_compare params={
  tools: ["CNMG120408-PM", "CNMG120408-MM"]
}
```

### Compare with application context
```
prism_data action=tool_compare params={
  tools: ["CNMG120408-PM GC4325", "CNMG120408-KP KC5010"],
  material: "4140_steel",
  operation: "turning_semi_finish"
}
```

## What It Returns
```json
{
  "comparison": {
    "tool_a": {
      "id": "CNMG120408-PM",
      "manufacturer": "Sandvik",
      "grade": "GC4325",
      "chipbreaker": "PM (medium machining)",
      "coating": "CVD Ti(C,N)+Al2O3+TiN",
      "application_range": "P15-P35",
      "Vc_range_m_min": [180, 400],
      "f_range_mm_rev": [0.15, 0.50],
      "strengths": ["Excellent wear resistance", "Wide application range", "Good chip control in steel"],
      "price_tier": "premium"
    },
    "tool_b": {
      "id": "CNMG120408-MM",
      "manufacturer": "Sandvik",
      "grade": "GC2025",
      "chipbreaker": "MM (medium machining)",
      "coating": "PVD TiAlN",
      "application_range": "M15-M30",
      "Vc_range_m_min": [120, 250],
      "f_range_mm_rev": [0.10, 0.40],
      "strengths": ["PVD coating for stainless", "Sharp edge for work hardening materials", "Good adhesion resistance"],
      "price_tier": "standard"
    },
    "head_to_head": {
      "wear_resistance": {"winner": "tool_a", "margin": "significant"},
      "toughness": {"winner": "tool_b", "margin": "moderate"},
      "speed_range": {"winner": "tool_a", "margin": "60%+ higher max Vc"},
      "cost_per_edge": {"winner": "tool_b", "margin": "15% lower"},
      "versatility": {"winner": "tool_a", "margin": "broader application range"}
    },
    "recommendation": "For 4140 steel semi-finishing: Tool A (GC4325) is preferred. Higher speed capability and wear resistance offset the premium price through longer tool life and faster cycle times."
  }
}
```

## Examples
### Compare two chipbreaker variants on the same insert
- Input: `prism_data action=tool_compare params={tools: ["CNMG120408-PM", "CNMG120408-MM"]}`
- Output: PM vs. MM comparison showing PM optimized for steel (P-group), MM optimized for stainless (M-group)
- Edge case: Same ISO designation with different chipbreaker suffixes are fundamentally different tools

### Compare cross-manufacturer equivalents
- Input: `prism_data action=tool_compare params={tools: ["CNMG120408-PM GC4325", "CNMG120408-KP KC5010"], material: "4140_steel"}`
- Output: Sandvik vs. Kennametal comparison with material-specific performance data and cost analysis
- Edge case: Cross-manufacturer comparisons rely on published data; real-world performance may vary by 10-15%
