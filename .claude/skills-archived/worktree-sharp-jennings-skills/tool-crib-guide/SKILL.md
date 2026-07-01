---
name: tool-crib-guide
description: 'Tool crib and inventory management guide. Use when the user needs cutting tool inventory tracking, reorder management, tool life monitoring, or standardization across machines.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: ToolCrib
---

# Tool Crib & Inventory Management Guide

## When to Use
- Tracking cutting tool inventory and locations
- Setting reorder points and managing tool purchases
- Monitoring tool life and usage across jobs
- Standardizing tool libraries across machines

## How It Works
1. Register tools via `prism_data→tool_search` (55,000+ tools)
2. Track inventory via tool crib database (location, quantity, condition)
3. Monitor life via `prism_intelligence→tool_wear_analysis`
4. Set reorder alerts via inventory-low-alert hook
5. Generate purchase orders and usage reports

## Returns
- Tool inventory with location, quantity, and condition status
- Usage rate and reorder recommendations
- Tool life data (actual vs. expected per material)
- Standardization report (duplicate tools, consolidation opportunities)

## Example
**Input:** "Audit 12mm 4-flute carbide endmill inventory, usage last 90 days"
**Output:** 3 brands in crib: Brand A (14 pcs, avg life 45min in steel), Brand B (8 pcs, avg life 62min), Brand C (3 pcs, avg life 38min). Usage: 22 tools/month. Recommendation: standardize on Brand B — 38% longer life offsets 15% higher price, saves $340/month. Reorder point: 10 pcs (2-week lead time buffer). Current stock: 25 pcs = 5 weeks supply.
