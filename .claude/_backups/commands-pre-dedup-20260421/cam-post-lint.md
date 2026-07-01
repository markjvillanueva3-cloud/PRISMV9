# /cam-post-lint — CAM to Post-Processor Lint Check

Validate CAM output for post-processor compatibility and catch issues before NC generation.

## Usage
```
/cam-post-lint <cam_file> [--post <post_name>] [--controller <type>] [--strict]
```

## Workflow

1. **CAM Output Analysis**
   - Parse toolpath data
   - Extract operations and tools
   - Identify coordinate systems
   - Check tool change sequences

2. **Post-Processor Compatibility**
   - Verify supported operation types
   - Check axis configurations
   - Validate coolant codes
   - Verify canned cycle support

3. **Parameter Validation**
   - Check speeds/feeds within machine limits
   - Verify tool numbers in magazine
   - Validate work offsets
   - **Check parameters against ContextualBoundaryEngine limits**

4. **Safety Checks**
   - Rapid moves in cutting zone
   - Missing tool retracts
   - Unsafe approach vectors
   - Tool length compensation issues

5. **Lint Report**
   - Errors (must fix)
   - Warnings (should review)
   - Info (best practices)
   - Auto-fix suggestions

## Engines Used
- CAMPostLintEngine
- PostProcessorCompatibilityEngine
- SafetyValidatorEngine
- ContextualBoundaryEngine (Phase 0.25)

## Example
```
/cam-post-lint H:/cam/housing.mcx --post fanuc-30i --strict
```
