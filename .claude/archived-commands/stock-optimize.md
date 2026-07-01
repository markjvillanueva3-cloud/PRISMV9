# Stock Optimize — Raw Material Size Selection

Find the optimal bar, plate, or billet from standard catalog sizes for your part dimensions.

## Args
- Empty: interactive — ask for part dims, material, quantity
- `[L]x[W]x[H] [material] [qty]`: direct optimize (e.g., `80x40x20 aluminum_6061 10`)
- `catalog [material]`: show available stock sizes for a material
- `nesting [form] [dims] [length] [part_dims]`: manual nesting calculation

## Workflow

1. **Gather inputs**: part_dims_mm (L×W×H), material, quantity. Optional: is_turning, machining_allowance
2. **Call** `prism_business` → `stock_size_optimize`
3. **Display top recommendations** ranked by total material cost:
   - Stock form + dimensions + length
   - Parts per length, total lengths needed
   - Material utilization %, waste %
   - Weight and cost per part
4. **Show buy-to-fly ratio** and any warnings (high BTF, consider near-net-shape)

## Output Format
```
STOCK SIZE OPTIMIZER — [L]×[W]×[H]mm [material] × [qty] parts
════════════════════════════════════════════════════════════════
Part Volume: [X.XX] cm³ | Buy-to-Fly: [X.X]:1

 # | Form      | Stock Size        | Parts/Len | Lengths | Util% | $/Part  | Total $
---|-----------|-------------------|-----------|---------|-------|---------|--------
 1 | [form]    | [dims]×[len]mm    | [N]       | [N]     | [X]%  | $[X.XX] | $[XXX]
 2 | ...

[Warnings if any]
```

## Tips
- For turning: add `is_turning` flag to prefer round bar stock
- High BTF (>5:1): consider additive manufacturing or near-net forging
- Titanium BTF (>5:1): always flag — material cost dominates
