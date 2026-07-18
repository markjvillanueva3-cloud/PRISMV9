# /post-validate — Post-Processor Output Validation

Validate G-code output against machine capabilities and safety requirements.

## Usage
```
/post-validate <nc_file> [--machine <id>] [--controller <type>] [--strict]
```

## Workflow

1. **Syntax Validation**
   - G-code syntax correctness
   - M-code validity
   - Block numbering
   - Comment formatting

2. **Machine Compatibility**
   - Axis limits respected
   - Spindle speed within range
   - Feed rates within capability
   - **Check against ContextualBoundaryEngine machine limits**

3. **Safety Checks**
   - Tool length compensation active
   - Work offset specified
   - Safe retract heights
   - Coolant codes appropriate
   - **S(x) safety score calculation**

4. **Physics Validation**
   - Cutting forces within limits
   - Tool deflection acceptable
   - **Apply VariabilityEnvelopeEngine margins**
   - Power consumption within spindle rating

5. **Report Generation**
   - Validation pass/fail
   - Issue list with line numbers
   - Safety score
   - Recommendations

## Engines Used
- PostProcessorValidatorEngine
- GCodeParserEngine
- SafetyScoreEngine
- ContextualBoundaryEngine (Phase 0.25)
- VariabilityEnvelopeEngine (Phase 0.25)

## Example
```
/post-validate H:/nc/O1234.nc --machine okuma-vtc800 --strict
```
