# /cad-tolerance-check — Validate CAD Model Tolerances

Analyze and validate geometric tolerances and dimensions in CAD models per GD&T standards.

## Usage
```
/cad-tolerance-check <model_path> [--standard ASME|ISO] [--report]
```

## Workflow

1. **Load Model and PMI**
   - Parse CAD geometry
   - Extract GD&T annotations
   - Identify datum reference frames

2. **Tolerance Validation**
   - Check tolerance stack-ups
   - Verify datum feature assignments
   - Validate feature control frames
   - Check material condition modifiers

3. **Manufacturing Feasibility**
   - Match tolerances to process capabilities
   - Identify critical dimensions
   - Flag tolerances requiring special processes
   - Estimate Cpk achievability

4. **Standard Compliance**
   - ASME Y14.5-2018 rules
   - ISO 1101 compliance
   - Rule #1 (envelope) verification
   - Bonus tolerance calculations

5. **Report Generation**
   - Tolerance summary table
   - Stack-up analysis results
   - Process capability mapping
   - Recommendations for relaxation

## Engines Used
- CadToleranceValidatorEngine
- ToleranceStackupEngine
- ProcessCapabilityMatcher
- GDTComplianceEngine

## Example
```
/cad-tolerance-check H:/parts/shaft.step --standard ASME --report
```
