---
description: "Generate a comprehensive manufacturing quote with physics-backed estimation, DfM feedback, secondary ops, and price breaks"
---

# Quote Job — Manufacturing Quote Generator

You are generating a manufacturing quote using the PRISM quoting system. Use the `prism_business` dispatcher with the new physics-backed quoting actions.

## Step 1: Gather Requirements
Ask the user for (or extract from context):
- Part name/number
- Material (e.g., aluminum_6061, steel_4140, titanium_gr5, stainless_304)
- Quantity
- Complexity (simple/medium/complex/very_complex)
- Machine type if known (cnc_mill_3axis, cnc_mill_5axis, cnc_lathe, etc.)

## Step 1B: Probabilistic Cost Analysis (NEW — uses GARCH + Bootstrap)
After gathering requirements, run probabilistic costing:
1. Call `prism_calc` action `probabilistic_costing` with cost components + material price history
   - Returns: expectedCost, 95% CI, riskScore, componentSensitivity
2. Call `prism_calc` action `capability_with_ci` if quality data exists
   - Bootstrap Cpk with confidence intervals
3. Present quote as: "$X per part (95% CI: $Y - $Z), risk score: W%"
4. If machine has learning data, use `prism_calc` action `learned_prediction` for cycle time
- Any CAM-derived cycle times
- Tightest tolerance and surface finish requirements
- Secondary operations needed (anodize, heat treat, plating, etc.)
- Rush requirement
- Customer name and tier (A/B/C/new)

## Step 2: Generate Estimate
Call `prism_business` with action `quote_estimate` passing all gathered params.

## Step 3: Secondary Ops (if needed)
Call `prism_business` with action `sec_ops_recommend` to suggest appropriate secondary operations for the material and application. Then `sec_ops_batch_quote` for pricing.

## Step 4: Material Comparison (optional)
If the user is flexible on material, call `quote_compare_materials` with 3-5 alternatives to show cost trade-offs.

## Step 5: What-If Analysis (optional)
Run `quote_what_if` with scenarios like different quantities, rush vs standard, material swaps.

## Step 6: Present Results
Format the quote as a professional summary:
- Quote ID, date, validity
- Part details and quantity
- Cost breakdown table (material, machining, setup, tooling, programming, inspection, secondary ops, overhead)
- Unit price and total price with margin
- All adjustments (rush, volume, tolerance, complexity premiums)
- Lead time (standard and rush)
- DfM warnings (highlight any issues)
- Price breaks table
- Confidence score and what would improve it
- Terms and notes

## Step 7: Record in Analytics
Call `analytics_record` to log the quote for future accuracy tracking.

$ARGUMENTS
