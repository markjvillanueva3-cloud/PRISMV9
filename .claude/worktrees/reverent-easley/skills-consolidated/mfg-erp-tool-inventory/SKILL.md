---
name: mfg-erp-tool-inventory
description: Manage cutting tool inventory through ERP integration
---

# ERP Tool Inventory

## When To Use
- Checking current stock levels of cutting tools before planning a production run
- Updating tool inventory after consumption or receiving new stock
- Identifying tools that need reordering based on minimum stock levels
- Synchronizing tool crib data between PRISM and the ERP system

## How To Use
```
prism_intelligence action=erp_tool_inventory params={tool_type: "carbide endmill", diameter: 12}
prism_intelligence action=erp_tool_update params={tool_id: "T-EM12-CARBIDE", action: "consume", quantity: 2, wo_number: "WO-2026-001"}
```

## What It Returns
- `tool_id` — tool inventory identifier
- `description` — tool description and specifications
- `quantity_on_hand` — current stock quantity
- `reorder_point` — minimum stock level triggering reorder
- `location` — storage location (tool crib, machine magazine)
- `last_updated` — timestamp of last inventory update

## Examples
- Check endmill stock: `erp_tool_inventory params={tool_type: "carbide endmill", diameter_range: {min: 6, max: 20}}`
- Record tool consumption: `erp_tool_update params={tool_id: "T-EM12-CARBIDE", action: "consume", quantity: 1}`
- Receive new tools: `erp_tool_update params={tool_id: "T-EM12-CARBIDE", action: "receive", quantity: 10, po_number: "PO-5523"}`
