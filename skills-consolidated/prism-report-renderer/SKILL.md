# PRISM Report Renderer

## Purpose
Generates professional manufacturing documents from calculated data. Outputs formatted setup sheets, process plans, cost estimates, tool lists, inspection plans, alarm reports, and speed/feed cards.

## Report Types (via prism_calc → render_report)
- `setup_sheet` — Machine setup with tool list, work offsets, fixture notes
- `process_plan` — Step-by-step operation sequence with parameters
- `cost_estimate` — Per-part and batch cost breakdown (tool, machine, labor)
- `tool_list` — Complete tooling with holders, offsets, and expected life
- `inspection_plan` — Critical dimensions, tolerances, measurement methods
- `alarm_report` — Decoded alarm with fix procedures and history
- `speed_feed_card` — Quick-reference card for operator with all cutting parameters

## Usage
Provide report type and data object. Engine formats into structured output with sections, tables, and safety highlights. Compatible with PDF generation and print layouts.

## Key Parameters
- `type` — Report type from list above
- `data` — Type-specific data object (operations, tools, costs, etc.)
- `format` — "structured" | "markdown" | "json"
- `options` — { include_safety: boolean, include_notes: boolean, company_name: string }
