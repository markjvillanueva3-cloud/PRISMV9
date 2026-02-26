---
name: Measurement Summary
description: Consolidated measurement summary across all measurement types
---

## When To Use
- You need an overview of all measurement data for a part or production run
- Consolidating CMM, surface, and probe measurements into a single report
- Reviewing measurement trends across multiple inspection points
- Preparing quality documentation that spans multiple measurement methods

## How To Use
```
prism_intelligence action=measure_summary params={
  part_id: "PN-4420-REV-C",
  include_types: ["cmm", "surface", "probe"],
  time_range: "last_24h",
  format: "summary"
}
```

## What It Returns
- Aggregated measurement results across all specified types
- Pass/fail status for each measured feature
- Statistical summary (Cp, Cpk) where enough data points exist
- Trend indicators showing drift direction for repeated measurements
- Flagged features that are approaching tolerance limits

## Examples
- Input: `measure_summary params={ part_id: "SHAFT-001", include_types: ["cmm", "surface"] }`
- Output: 12 CMM features (11 pass, 1 marginal), surface Ra 0.6-1.2 um across 4 zones, Cpk 1.45 overall

- Input: `measure_summary params={ time_range: "last_shift", format: "exceptions_only" }`
- Output: 3 features flagged: bore ID trending +0.008mm over 20 parts, OD Cpk dropped to 1.1
