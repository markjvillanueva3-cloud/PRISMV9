---
name: mfg-erp-quality
description: Import quality data and track quality history via ERP integration
---

# ERP Quality Data

## When To Use
- Importing inspection results and quality records from ERP quality modules
- Tracking quality metrics (scrap rate, first-pass yield) across production runs
- Linking quality events to specific work orders or operations
- Feeding quality data back for statistical process control (SPC)

## How To Use
```
prism_intelligence action=erp_quality_import params={wo_number: "WO-2026-001", inspection: {result: "pass", dimensions_checked: 12, out_of_spec: 0}}
prism_intelligence action=erp_quality_history params={part_number: "PN-7742", metric: "first_pass_yield"}
```

## What It Returns
- `quality_record_id` — unique identifier for the quality record
- `result` — overall inspection result (pass/fail/conditional)
- `metrics` — quality metrics (yield, scrap rate, Cpk values)
- `history` — historical quality data for trend analysis
- `non_conformances` — list of any non-conformance events

## Examples
- Import inspection results: `erp_quality_import params={wo_number: "WO-2026-0145", inspection: {result: "pass", Cpk: 1.67}}`
- Get quality history: `erp_quality_history params={part_number: "PN-7742", last_n: 50}`
- Track scrap rate trend: `erp_quality_history params={part_number: "PN-7742", metric: "scrap_rate", date_range: {from: "2026-01-01", to: "2026-02-23"}}`
