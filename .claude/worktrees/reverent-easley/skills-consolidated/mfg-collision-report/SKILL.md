---
name: mfg-collision-report
description: Generate formatted collision analysis report from a previous collision check
---

## When To Use
- After running mfg-collision-check and needing a printable report
- For setup sheet documentation of collision analysis results
- When presenting safety analysis to a supervisor or quality team
- NOT for running the collision analysis itself (use mfg-collision-check first)

## How To Use
### Generate Collision Report
```
prism_safety action=generate_collision_report params={
  analysis_id: "analysis_001"
}
```

### Generate With Options
```
prism_safety action=generate_collision_report params={
  analysis_id: "analysis_001",
  format: "detailed",
  include_visualizations: true,
  include_recommendations: true
}
```

## What It Returns
```json
{
  "report": {
    "title": "Collision Analysis Report",
    "analysis_id": "analysis_001",
    "timestamp": "2026-02-23T14:30:00Z",
    "summary": {
      "total_segments": 245,
      "collisions_found": 3,
      "near_misses": 7,
      "severity_breakdown": {"critical": 1, "warning": 2, "caution": 7}
    },
    "collisions": [
      {
        "id": 1,
        "segment": 47,
        "type": "holder_to_fixture",
        "severity": "critical",
        "location": {"x": 12.5, "y": 88.3, "z": -15.0},
        "penetration_mm": 2.1,
        "recommendation": "Reduce Z depth or use longer tool"
      }
    ],
    "sign_off": {"programmer": "", "supervisor": "", "date": ""}
  },
  "format": "json"
}
```

## Examples
### Standard Report After Collision Check
- Input: `prism_safety action=generate_collision_report params={analysis_id: "analysis_001"}`
- Output: Formatted report with 3 collisions and 7 near-misses, severity breakdown, and sign-off fields
- Edge case: If analysis_id is expired or not found, returns error with suggestion to re-run collision check

### Detailed Report for Quality Documentation
- Input: `prism_safety action=generate_collision_report params={analysis_id: "analysis_001", format: "detailed", include_recommendations: true}`
- Output: Full report with per-segment analysis, risk heat map, and actionable fix suggestions for each issue
- Edge case: Very large toolpaths (100k+ segments) may produce reports that need pagination
