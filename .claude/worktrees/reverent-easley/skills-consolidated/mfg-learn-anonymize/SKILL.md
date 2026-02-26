---
name: mfg-learn-anonymize
description: Control data anonymization and opt-in/out for federated learning participation
---

# Privacy & Anonymization Control

## When To Use
- Configuring what data your shop shares with the federated network
- Setting anonymization levels to protect proprietary process knowledge
- Opting in or out of specific data sharing categories
- Reviewing what data has been shared and its anonymization status

## How To Use
```
prism_intelligence action=learn_anonymize params={data_id: "CONTRIB-2026-0142", level: "high"}
prism_intelligence action=learn_opt_control params={category: "cutting_params", opt_in: true, anonymization: "standard"}
```

## What It Returns
- `opt_status` — current opt-in/out status per data category
- `anonymization_level` — applied anonymization (none, standard, high, maximum)
- `shared_categories` — list of categories currently shared
- `blocked_fields` — specific data fields excluded from sharing
- `compliance` — privacy compliance status

## Examples
- Opt in to share tool life data: `learn_opt_control params={category: "tool_life", opt_in: true, anonymization: "standard"}`
- Opt out of sharing cost data: `learn_opt_control params={category: "cost_data", opt_in: false}`
- Set high anonymization on contribution: `learn_anonymize params={data_id: "CONTRIB-2026-0142", level: "maximum", remove_fields: ["machine_model", "tool_brand"]}`
