# Material Price — Market-Adjusted Material Cost Lookup

Look up current commodity-indexed material pricing with form, region, and quantity adjustments.

## Args
- Empty: interactive — ask for material
- `[material]`: quick lookup (e.g., `aluminum_6061`, `titanium_gr5`)
- `compare [mat1] [mat2] [mat3...]`: side-by-side price comparison
- `surcharge [material] [weight_kg]`: calculate raw material surcharge
- `list`: show all materials grouped by category

## Workflow

1. **Lookup**: call `prism_business` → `material_price_lookup` with material, form, region, weight_kg
2. **Display**: base price, index multiplier, form adjustment, regional factor, final price
3. **Compare mode**: call `material_price_compare` for ranked comparison
4. **Surcharge mode**: call `material_surcharge` for stainless/nickel/titanium surcharge calc

## Output Format
```
MATERIAL PRICE — [name] ([material])
════════════════════════════════════
Category:      [category]
Base Price:    $[X.XX]/kg (2024-Q4 baseline)
Index:         [index] @ [X.XX]× ([trend]) as of [date]
Form:          [form] (×[mult])
Region:        [region] (×[mult])
Qty Discount:  [X]%
─────────────────────────
Final Price:   $[X.XX]/kg
Lead Time:     [X] weeks
Min Order:     [X] kg
Surcharge:     [note]
```

## Compare Output
```
MATERIAL COMPARISON — [form] / [region]
 # | Material          | $/kg   | Index | Lead  | Surcharge
---|-------------------|--------|-------|-------|----------
 1 | [cheapest]        | $X.XX  | X.XX  | Xw    | [Y/N]
 2 | ...
```
