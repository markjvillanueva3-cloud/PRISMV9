# Monte Carlo Uncertainty Quantification (OSCAR)

**Galaxy:** OSCAR (Speed & Feed Calculator)
**Status:** Advanced Topic - Master Level

## Description
Uncertainty propagation through the full SFC pipeline using Monte Carlo sampling and FOSM methods.

## PRISM Implementation
- SpeedFeedOrchestratorEngine UQ module
- Input distributions on kc1.1, exponents, modal parameters
- Output distributions on Fc, power, stability

## Key Metrics
- Mean, std, 5%/95% quantiles
- Sensitivity indices (Sobol)

## Tribal Notes
- Always run UQ on new materials or setups
- High uncertainty in kc1.1 dominates most results

**Last Updated:** 2026-06-12