# /gdnt-check — GD&T Compliance Validation

Validate geometric dimensioning and tolerancing compliance per ASME Y14.5/ISO 1101.

## Usage
```
/gdnt-check <model_or_drawing> [--standard ASME|ISO] [--strict] [--report]
```

## Workflow

1. **Extract GD&T Callouts**
   - Parse drawing annotations
   - Extract feature control frames
   - Identify datum references
   - Locate basic dimensions

2. **Compliance Validation**
   - Rule #1 (envelope) verification
   - Material condition modifiers
   - Datum feature assignments
   - Composite tolerance validity

3. **Process Capability Matching**
   - Match tolerance to process Cp/Cpk
   - **Query AdaptiveParameterSpaceEngine for achievable precision**
   - Identify tolerances beyond capability
   - Suggest process upgrades

4. **Variability Assessment**
   - **Calculate required margins from VariabilityEnvelopeEngine**
   - Account for material batch variation
   - Consider thermal effects
   - Factor in tool wear progression

5. **Report**
   - Compliance status per callout
   - Process capability mapping
   - Risk assessment
   - Recommendations

## Engines Used
- GDTValidationEngine
- ProcessCapabilityEngine
- AdaptiveParameterSpaceEngine (Phase 0.25)
- VariabilityEnvelopeEngine (Phase 0.25)

## Example
```
/gdnt-check H:/drawings/housing.pdf --standard ASME --report
```
