# Job Cost Estimator

Estimate complete job costs using PRISM's JobCostingEngine with shop-configured rates.

## When To Use
- Estimating cost for a new job before quoting
- Breaking down costs by category (material, setup, machining, programming, inspection, finishing)
- Comparing costs across different quantities or machine types
- Verifying cost calculations match shop floor reality

## How To Use
Run `/job-cost` with job parameters:

- `/job-cost` — interactive: walks through material, operations, quantity, etc.
- `/job-cost quick` — minimal estimate with just material, machine type, and quantity
- `/job-cost breakdown <job-spec>` — detailed breakdown of all cost categories

## Advisor Strategy (`advisor_20260301`)
- **Executor**: Sonnet 4.6 (drives JobCostingEngine, resolves shop rates)
- **Advisor**: Opus 4.6, `max_uses: 1`
- **When Sonnet should call advisor**: after cost breakdown generation — to sanity-check totals against shop floor reality and flag unrealistic estimates

## Steps
1. Gather job specification from user:
   - Material type and dimensions (mm)
   - Machine type (cnc_mill_3axis, cnc_mill_5axis, cnc_lathe, swiss_lathe, wire_edm, etc.)
   - Operations list with cycle times (or let engine estimate from MRR + volume)
   - Quantity
   - Complexity (simple/medium/complex/very_complex)
   - Finishing operations (anodize, plate, heat treat, etc.)
   - Inspection level (minimal/standard/detailed/full_cmm)
2. Call `prism_business` with action `estimate_job_cost` passing the job spec
3. Display the cost breakdown:
   - Material cost (stock dimensions, weight, scrap allowance)
   - Setup cost (per-operation setup times)
   - Machining cost (cycle times, tool changes, machine rate)
   - Programming cost (complexity-based)
   - Inspection cost (level-based, first article if needed)
   - Finishing cost (per-part operations)
   - Overhead and admin
   - Total and per-part cost
   - Percentage breakdown (material vs labor vs overhead)

## What It Returns
- Complete CostBreakdown with all 8 cost categories
- Per-part and total costs
- Percentage breakdown for quoting markup decisions

## Examples
```
> /job-cost quick
Material: aluminum_6061, 150x100x50mm
Machine: cnc_mill_3axis
Qty: 25
Complexity: medium

Result:
  Material:    $47.82  (12.3%)
  Setup:       $45.83  (11.8%)
  Machining:  $127.50  (32.8%)
  Programming: $56.25  (14.5%)
  Inspection:  $29.17   (7.5%)
  Finishing:    $0.00   (0.0%)
  Overhead:    $90.72  (23.4%)
  Admin:       $10.11   (2.6%)
  ─────────────────────
  TOTAL:     $388.50
  Per Part:   $15.54
```
