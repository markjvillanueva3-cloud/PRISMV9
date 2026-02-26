---
name: CMM Data Importer
description: Import and analyze CMM measurement data from coordinate measuring machines
---

## When To Use
- When importing CMM inspection results for analysis and reporting
- When comparing measured dimensions against nominal and tolerance
- When building measurement history for SPC (Statistical Process Control)
- When retrieving previously imported CMM data for review
- NOT for surface roughness data — use mfg-surface-measure instead

## How To Use
```
prism_intelligence action=measure_cmm_import params={
  source: "cmm_report_2024-02-15.csv",
  part: "bracket-001",
  job_id: "JOB-2024-0142",
  nominal_source: "drawing_rev_C"
}

prism_intelligence action=measure_cmm_get params={
  part: "bracket-001",
  feature: "bore_1",
  last_n: 50
}
```

## What It Returns
- Parsed measurement results with deviation from nominal
- Pass/fail status per feature against drawing tolerances
- Cp/Cpk capability indices for repeated measurements
- Out-of-tolerance features highlighted with severity
- Trend data when historical measurements exist

## Examples
- Input: `measure_cmm_import params={source: "report.csv", part: "housing-001"}`
- Output: 24 features imported, 22 pass, 2 out-of-tolerance (bore_3 at +0.008, slot_width at -0.006)

- Input: `measure_cmm_get params={part: "housing-001", feature: "bore_3", last_n: 30}`
- Output: Cpk=1.12, trending toward upper limit, mean shift +0.003 over last 30 parts
