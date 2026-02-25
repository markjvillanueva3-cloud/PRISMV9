---
name: mfg-campaign-validate
description: Validate campaign parameters and safety constraints before production
---

# Campaign Validation

## When To Use
- Validating a campaign setup before committing to production
- Checking that safety constraints are achievable with the specified parameters
- Verifying tool inventory covers the estimated tool changes for the batch
- Ensuring machine capacity aligns with the campaign production timeline

## How To Use
```
prism_calc action=campaign_validate params={campaign_id: "CAMP-2026-001"}
```

## What It Returns
- `valid` — overall validation result (true/false)
- `warnings` — list of non-blocking warnings to review
- `errors` — list of blocking errors that must be resolved
- `safety_check` — safety constraint validation results
- `resource_check` — tool inventory and machine availability verification
- `estimated_completion` — projected campaign completion date/time

## Examples
- Validate a new campaign: `campaign_validate params={campaign_id: "CAMP-2026-001"}`
- Validate with custom constraints: `campaign_validate params={campaign_id: "CAMP-2026-001", override_safety: {max_tool_wear_percent: 90}}`
- Validate and check tool stock: `campaign_validate params={campaign_id: "CAMP-2026-001", check_inventory: true}`
