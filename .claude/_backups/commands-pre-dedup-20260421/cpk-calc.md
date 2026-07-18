# /cpk-calc — Process Capability Calculation

Calculate Cp, Cpk, Pp, Ppk with variability-aware confidence intervals.

## Usage
```
/cpk-calc <data_source> [--spec-limits <LSL,USL>] [--confidence <N>] [--subgroups]
```

## Workflow

1. **Data Collection**
   - Load measurement data
   - Parse from CMM, gauge, or manual entry
   - Validate data quality
   - Check for normality

2. **Statistical Analysis**
   - Calculate mean and standard deviation
   - **Incorporate VariabilityEnvelopeEngine historical bounds**
   - Compute within-group variation (Cp)
   - Compute overall variation (Pp)

3. **Capability Indices**
   - Cp = (USL - LSL) / (6 * sigma_within)
   - Cpk = min((USL - mean), (mean - LSL)) / (3 * sigma)
   - Pp, Ppk for long-term
   - Confidence intervals

4. **Variability Attribution**
   - **Query VariabilitySourceTrackerEngine for causes**
   - Break down by source
   - Identify improvement opportunities
   - Rank by impact

5. **Report**
   - Capability indices with CI
   - Process performance rating
   - Trend vs target
   - Improvement recommendations

## Engines Used
- ProcessCapabilityEngine
- StatisticalAnalysisEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- VariabilitySourceTrackerEngine (Phase 0.25)

## Example
```
/cpk-calc H:/quality/shaft_od.csv --spec-limits 24.98,25.02 --confidence 95
```
