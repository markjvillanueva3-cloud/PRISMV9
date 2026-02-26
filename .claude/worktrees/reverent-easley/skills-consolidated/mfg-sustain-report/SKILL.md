---
name: mfg-sustain-report
description: Generate sustainability reports with compliance data
---

# Sustainability Report Generator

## When To Use
- Generating periodic sustainability reports for management or compliance
- Documenting environmental impact data for ISO 14001 or ESG reporting
- Comparing sustainability metrics across time periods or facilities
- Preparing data for environmental audits or green certification applications

## How To Use
```
prism_intelligence action=sustain_report params={scope: "shop", period: "2026-Q1", format: "summary"}
prism_calc action=sustainability_report params={material: "steel_4140", operation: "turning", Vc: 200, f: 0.25, ap: 3.0}
```

## What It Returns
- `report` — formatted sustainability report with executive summary
- `metrics` — key environmental metrics (energy, CO2, waste, water, coolant)
- `trends` — period-over-period comparison showing improvement or regression
- `compliance_status` — status against applicable environmental standards
- `recommendations` — prioritized action items for further sustainability gains

## Examples
- Generate quarterly report: `sustain_report params={scope: "shop", period: "2026-Q1"}` — returns report: 7,200 kWh energy (-8% QoQ), 4,680 kg CO2e (-12% QoQ), 1,200L coolant waste (-5% QoQ), ISO 14001 compliant
- Per-operation sustainability: `sustainability_report params={material: "steel_4140", operation: "turning", Vc: 200, f: 0.25, ap: 3.0}` — returns 0.42 kWh/part, 0.21 kg CO2e/part, buy-to-fly 2.8:1
- Annual facility comparison: `sustain_report params={scope: "facility", period: "2025", compare_period: "2024"}` — returns year-over-year: energy -14%, waste -22%, coolant -18%, carbon intensity -16%, on track for 2030 targets
