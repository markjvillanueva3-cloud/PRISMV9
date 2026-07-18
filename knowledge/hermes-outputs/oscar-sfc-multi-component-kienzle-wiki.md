# Multi-Component Kienzle Model (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Formula (Full)
```
Fc = kc1.1 · b · h^(1-mc) · f_rake(γ) · f_lead(κ) · f_size(h) · f_wear(VB) · f_coating
```

## Components
- Base Kienzle
- Rake angle correction
- Lead angle correction
- Size effect
- Wear land correction
- Coating factor

## PRISM Implementation
- Fully implemented in KienzleForceModelEngine
- All factors configurable per material/tool combination
- Monte Carlo UQ supported on all correction coefficients

## Edge Cases
- Negative rake + small h + worn tool = very high force
- Coating wear can increase kc by 10–20% over tool life

## JM Die Notes
- Full multi-component model required for accurate force prediction on hardened steel with small tools
- Rule: Use full model on any tool < Ø10mm in HRC 50+

**Last Updated:** 2026-06-12 (loop-enforced, critic-reviewed)