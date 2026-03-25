---
name: export-report-guide
description: 'Export and reporting guide. Use when the user needs to generate PDFs, setup sheets, G-code files, DXF exports, or formatted reports from PRISM data.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Export
---

# Export & Reporting Guide

## When to Use
- Generating setup sheets for shop floor operators
- Exporting G-code or post-processed NC files
- Creating PDF reports (quotes, FAI, quality, utilization)
- Exporting DXF/SVG for fixture drawings or tooling layouts

## How It Works
1. Gather data from relevant PRISM modules
2. Select template via `prism_export→template_select`
3. Render output via `prism_export→render_pdf` or `render_gcode`
4. Apply company branding and formatting
5. Deliver via download, email, or ERP integration

## Returns
- PDF documents (setup sheets, quotes, quality reports)
- G-code files with header comments and tool lists
- DXF/SVG vector exports for CAD integration
- CSV/JSON data exports for ERP/MES systems

## Example
**Input:** "Generate setup sheet for OP10 on VF-2, include tool list and WCS"
**Output:** PDF setup sheet: Part# BR-2024-047, OP10 Mill. WCS: G54 X0Y0 = part center, Z0 = top face. 8 tools listed with lengths, diameters, and RPM/feed. Fixture: 6" Kurt vise, jaw step +0.100", stop at Y-1.500". Runtime: 14.2 min. Notes: deburr edges after machining.
