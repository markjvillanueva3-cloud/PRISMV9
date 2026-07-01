# /shop-safety-check — Shop Floor Safety Validation

Comprehensive safety validation for operations, programs, and setups.

## Usage
```
/shop-safety-check [--program <file>] [--setup <id>] [--machine <id>] [--full-audit]
```

## Workflow

1. **Program Safety**
   - Spindle speed within machine limits
   - Feed rates within safe envelope
   - **Apply ContextualBoundaryEngine safety margins**
   - Rapid moves clear of stock
   - Tool change heights adequate

2. **Setup Safety**
   - Workholding force adequate for cutting forces
   - Fixture clearance verified
   - Tool lengths measured
   - Work offset verified
   - Door interlock functional

3. **Machine Safety**
   - Guard positions correct
   - E-stop functional
   - Coolant levels adequate
   - Chip conveyor clear
   - Fire suppression ready

4. **Variability Safety Margins**
   - **Query VariabilityEnvelopeEngine for uncertainty bounds**
   - Add safety factor for material batch variation
   - Account for tool wear progression
   - Consider thermal state

5. **Safety Score (S(x))**
   - Calculate overall safety score
   - **HARD BLOCK if S(x) < 0.70**
   - Report contributing factors
   - Recommend mitigations

## Engines Used
- SafetyValidatorEngine
- WorkholdingForceCalculator
- VariabilityEnvelopeEngine (Phase 0.25)
- ContextualBoundaryEngine (Phase 0.25)
- SafetyScoreEngine (S(x))

## Example
```
/shop-safety-check --program H:/nc/job123.nc --machine okuma-lb3000
```
