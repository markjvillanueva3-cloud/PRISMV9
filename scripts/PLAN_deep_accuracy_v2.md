# Deep Accuracy Pass v2: Scientific Validation & Correction

## Reality Check

Published Johnson-Cook parameters for the SAME alloy vary 10-30% between studies (different SHPB setups, strain rate ranges, specimen prep). There is no single "correct" set. Kienzle kc1.1 values from VDI 3323 and Sandvik are proprietary and paywalled. What we CAN achieve:

1. **Verified physical properties** (density, k, Cp, E, melting range) from web-accessible databases (MatWeb, MakeItFrom, AZoM, theworldmaterial.com)
2. **Cross-validated J-C parameters** (A ≈ yield strength, A+B in UTS range, 0<n<1, 0<C<0.2, 0.5<m<2.0)
3. **Standard compositions** for all named AISI/SAE/UNS alloys from published specs
4. **Internally consistent parameter sets** (no material where thermal conductivity contradicts composition, or J-C A > UTS)
5. **Honest confidence tagging** (distinguish "published exact" vs "interpolated from series" vs "subcategory default")

## What We Cannot Get
- Paywalled VDI 3323 Kienzle tables (our subcategory profiles are based on published ranges)
- Full-text J-C papers behind ScienceDirect/Springer paywalls
- Proprietary Sandvik/Kennametal cutting data tables

## Script: `materials_deep_accuracy_v2.py`

### Phase 1: Physical Property Validation Database (~300 alloys)

Embed verified physical properties for the most common alloys, sourced from:
- AZoM, MakeItFrom, theworldmaterial.com (open access, publisher-quality)
- Engineers Edge mechanical properties tables (AISI alloy steels)
- Standard ASTM/SAE compositions

Table structure per alloy:
```python
VERIFIED_PROPERTIES = {
    "1045": {
        "density": 7.87, "thermal_conductivity": 51.9, "specific_heat": 470,
        "elastic_modulus": 200e3, "solidus": 1420, "liquidus": 1460,
        "yield_annealed": 310, "yield_normalized": 450, "yield_qt": 580,
        "uts_annealed": 585, "uts_normalized": 625, "hardness_bhn_annealed": 163,
        "composition": {"C": 0.45, "Mn": 0.75, "Si": 0.25, "P": 0.04, "S": 0.05},
        "source": "AZoM_MakeItFrom"
    }, ...
}
```

### Phase 2: J-C Cross-Validation Rules

For each material with J-C parameters:
1. **A vs yield**: A should be within 0.5×–1.5× of known yield strength
2. **A+B vs UTS**: (A + B×(0.2^n)) should approximate UTS (within 30%)
3. **Parameter bounds**: 0 < n < 1, 0 < C < 0.3, 0.3 < m < 3.0
4. **Physical consistency**: T_melt should match solidus temperature

Corrections:
- If A is > 2× yield: scale A down, adjust B to compensate
- If T_melt doesn't match physical solidus: correct it
- Flag but don't change values that are outside bounds but from published sources

### Phase 3: Composition Enrichment

For ~500 named AISI/SAE alloys, embed standard compositions:
- Carbon steels: 1006-1095 (complete C/Mn/P/S specs)
- Alloy steels: 41xx, 43xx, 51xx, 86xx, 92xx series
- Stainless: 301-347, 410-446, 2205/2507, 17-4PH/15-5PH
- Tool steels: A2, D2, H13, M2, O1, S7, W1, P20
- Aluminum: 1xxx-7xxx series standard compositions
- Titanium: CP grades 1-4, Ti-6Al-4V, Ti-6Al-2Sn-4Zr-2Mo

Use composition to recalculate:
- Thermal conductivity (k_iron model with verified alpha coefficients)
- Density (rule of mixtures)

### Phase 4: Kienzle Validation

Cross-validate kc1.1 values against the known relationship:
- kc1.1 should correlate with UTS: kc1.1 ≈ 2.5-4.0 × UTS for steels
- kc1.1 for austenitic SS should be > ferritic SS (work hardening)
- kc1.1 for aluminum should be 500-900 range

Our current subcategory profiles are based on published ranges from open-access papers. Validate them against the UTS-correlation model.

### Phase 5: Cutting Speed Validation

Cross-validate against the Sandvik general recommendation ranges:
- P steels: 150-400 m/min carbide turning
- M stainless: 100-250 m/min
- K cast iron: 150-350 m/min
- N aluminum: 300-1000+ m/min
- S superalloys: 20-60 m/min
- H hardened: 60-180 m/min

Flag any material outside these expected ranges.

### Phase 6: Honest Confidence Retagging

Replace current confidence levels with more granular categories:
- **VERIFIED**: Physical properties validated against web databases
- **PUBLISHED**: J-C from named paper, approximately correct
- **INTERPOLATED**: J-C estimated from neighboring alloys in same series
- **SUBCATEGORY_SPECIFIC**: Profile from distinct subcategory (not ISO group)
- **PARAMETRIC_MODEL**: Calculated from composition/hardness
- **GROUP_DEFAULT**: ISO group-level value (flag for future improvement)

## Expected Outcomes

After v2:
- Physical properties (density, k, Cp, E) verified for top 300 alloys
- Standard compositions populated for ~500 named alloys
- J-C parameters cross-validated (no A > 2×yield, no T_melt mismatches)
- Cutting speeds within published catalog ranges
- Transparent confidence tags showing actual data provenance
