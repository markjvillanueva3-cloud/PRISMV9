# Injection Mold Quote — Plastic Part Cost Estimator

Generate a complete injection molding quote: tooling (mold) cost + per-part pricing.

## Args
- Empty: interactive — ask for material, volume, projected area, quantity
- `[material] [volume_cm3] [area_cm2] [qty]`: direct quote (e.g., `abs 15 30 5000`)
- `dfm [material] [wall_mm]`: DfM analysis only
- `materials`: list all available injection mold materials

## Workflow

1. **Gather inputs**: material, part_volume_cm3, projected_area_cm2, quantity. Optional: wall_thickness, surface_finish, side_actions, hot_runner, insert/overmolding, tolerances
2. **Call** `prism_business` → `injection_mold_quote` with all params
3. **Display results**:
   - Mold: class, cost, lead time, life (shots), cavities
   - Per-part: material + machine + secondary ops + overhead = unit cost
   - Pricing: amortized tooling + unit cost + margin = price per part
   - DfM warnings (if any)
   - Price breaks table
4. **If DfM mode**: call `injection_mold_dfm` and display score + warnings + suggestions

## Output Format
```
INJECTION MOLD QUOTE — [material] × [qty] parts
═══════════════════════════════════════════════
TOOLING
  Mold Class:    [class] — [description]
  Mold Cost:     $[X,XXX]
  Lead Time:     [X] weeks
  Cavities:      [N]
  Mold Life:     [X] shots

PER-PART BREAKDOWN
  Material:      $[X.XX] ([weight]g [material])
  Machine:       $[X.XX] ([tonnage]T @ $[rate]/hr, [cycle]s cycle)
  Secondary Ops: $[X.XX]
  Overhead:      $[X.XX]
  Unit Cost:     $[X.XX]

PRICING ([margin]% margin)
  Amortized Tool: $[X.XX]/part
  Price/Part:     $[X.XX]
  Total Price:    $[X,XXX]

DfM: [warnings or "No issues detected"]

PRICE BREAKS
  Qty     | $/Part  | Tool/Part
  [table]
```
