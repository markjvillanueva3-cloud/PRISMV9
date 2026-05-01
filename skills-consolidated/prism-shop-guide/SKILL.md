---
name: prism-shop-guide
version: 1.0.0
description: |
  Shop Manager / Quoting product guide. Uses physics engines (SpeedFeed,
  MRR, TaylorToolLife, SafetyScore) to compose job planning, cost estimation,
  quote generation, scheduling, and sustainability reporting workflows.

  Modules Covered:
  - ProductEngine/Shop (shop_job, shop_cost, shop_quote, shop_schedule,
    shop_dashboard, shop_report, shop_compare, shop_materials, shop_history, shop_get)

  Gateway Routes: prism_intelligence -> shop_*
  R11 Product Packaging: MS2 — Shop Manager / Quoting
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "quote", "job cost", "shop", "schedule", "cycle time", "batch pricing", "sustainability"
- User wants to plan a machining job (features → operations → cycle times)
- User wants cost breakdown or quote for manufacturing a part
- User wants to compare costs across different machines
- User wants scheduling estimates or sustainability reports

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-shop-guide")`
2. Identify the user's material, features, and batch size
3. Use Shop actions:
   - `prism_intelligence->shop_job` — Plan operations from features with physics-based cycle times
   - `prism_intelligence->shop_cost` — Full cost breakdown (machine, tool, labor, setup, margin)
   - `prism_intelligence->shop_quote` — Professional quote with number, validity, pricing notes
   - `prism_intelligence->shop_schedule` — Production timeline with milestones and OEE
   - `prism_intelligence->shop_dashboard` — Machine utilization overview across shop
   - `prism_intelligence->shop_report` — Sustainability/energy report (CO2, recyclability, suggestions)
   - `prism_intelligence->shop_compare` — Compare costs across 2-7 machine types
   - `prism_intelligence->shop_materials` — List all 17 supported materials with machinability
   - `prism_intelligence->shop_history` — Session history of recent Shop operations
   - `prism_intelligence->shop_get` — Product metadata (version, counts, capabilities)

### What It Returns
- **Format**: Structured JSON with cost breakdowns, schedules, quotes, physics parameters
- **Success**: Actionable manufacturing data with traceability to physics calculations
- **Failure**: Missing required data → specifies which inputs are needed

### Examples
**Example 1**: "How much to machine 100 aluminum brackets?"
-> `shop_cost(material: "6061", features: ["pocket","drilling"], batch_size: 100)`
-> per_part_cost: $12.50, total: $1,250, cycle_time: 4.2 min

**Example 2**: "Compare 3-axis vs 5-axis for this titanium part"
-> `shop_compare(material: "Ti-6Al-4V", features: ["pocket"], machines: ["3axis_vertical","5axis_universal"])`
-> Side-by-side cost, cycle time, tool life comparison

**Example 3**: "Generate a quote for 50 steel housings"
-> `shop_quote(material: "4140", features: ["pocket","drilling","tapping"], batch_size: 50)`
-> Professional quote with number, line items, validity date

# SHOP MANAGER GUIDE

## Supported Materials (17)
| Group | Materials | Hardness Range |
|-------|-----------|---------------|
| Steel | 1045, 4140, 4340 | 200-300 HB |
| Stainless | 304, 316, 316L | 170-180 HB |
| Aluminum | 6061, 6061-T6, 7075, 7075-T6, A356 | 80-150 HB |
| Titanium | Ti-6Al-4V | 334 HB |
| Superalloy | Inconel 718 | 380 HB |
| Cast Iron | GG25, GGG50 | 190-220 HB |
| Copper/Brass | C360 | 80 HB |
| Plastic | PEEK | 100 HB |

## Machine Types (7)
| Machine | Rate/hr | Max RPM | Power |
|---------|---------|---------|-------|
| 3-Axis Vertical | $85 | 10,000 | 15 kW |
| 3-Axis Horizontal | $95 | 8,000 | 18 kW |
| 5-Axis Universal | $150 | 12,000 | 22 kW |
| Turn-Mill | $130 | 6,000 | 25 kW |
| Swiss Lathe | $110 | 10,000 | 11 kW |
| EDM Wire | $120 | — | 5 kW |
| EDM Sinker | $100 | — | 8 kW |

## Cost Composition Pipeline
```
Features → Job Plan (physics cycle times) → Cost Breakdown
  → Machine cost (rate × time)
  → Tool cost (wear × unit price)
  → Material cost (volume × $/kg)
  → Labor (setup + programming + inspection)
  → Margin (default 25%)
```

## Tier Gating
| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Job plan | Yes | Yes | Yes |
| Cost breakdown | Yes | Yes | Yes |
| Quote generation | No | Yes | Yes |
| Sustainability report | No | Yes | Yes |
| Dashboard | Yes | Yes | Yes |
| Compare machines | Yes | Yes | Yes |
