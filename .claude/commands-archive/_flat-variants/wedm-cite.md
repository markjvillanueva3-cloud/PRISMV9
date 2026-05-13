---
name: wedm-cite
description: Verify WEDM parameter citations and replace synthetic values with catalog references
built_by: MS-P1-100PCT / U-P1-01
track: WEDM-CONSOLIDATED
---

# WEDM Citation Checker

Scans WEDM engines for uncited parameters and helps replace them with manufacturer catalog citations.

## Usage

```
/wedm-cite [engine-name]
```

## What It Does

1. Scans for `synthetic_placeholder` patterns in WEDM engines
2. Identifies parameters lacking citations (source, manufacturer, URL)
3. Suggests catalog sources:
   - **Wire specs**: Bedra, Berkenhoff, Shinko Kobelco
   - **Machine specs**: Mitsubishi, Sodick, Makino, AgieCharmilles, Fanuc
   - **Physics formulas**: Klocke 2013, DiBitonto 1989, Kunieda 2005, Sato 1988

## Citation Format

All WEDM parameters should use AtomicValue shape:
```typescript
{
  value: number,
  unit: string,
  uncertainty: number,
  source: string,      // e.g., "Bedra Zn-diffused 0.25mm spec sheet"
  url?: string,        // PDF URL when available
  confidence: number   // 0-1
}
```

## Exit Criteria

- 0 hits for `synthetic_placeholder`
- All wire types have manufacturer + part number + PDF source
- `.compute()` returns pass AtomicValue Zod parse

## Related

- `/wedm-audit` — full asset audit
- `wedm-synthetic-block` hook — blocks synthetic values in commits
