# /post-register — Register Post-Processor in System

Register and configure post-processors in PRISM for machine compatibility.

## Usage
```
/post-register <post_file> [--machine <id>] [--controller <type>] [--validate]
```

## Workflow

1. **Post Analysis**
   - Parse post-processor file
   - Identify controller type
   - Extract capabilities
   - Detect output format

2. **Machine Mapping**
   - Associate with machine(s)
   - Verify controller compatibility
   - Check axis configuration
   - Validate option codes

3. **Variability Configuration**
   - **Set up ContextualBoundaryEngine integration**
   - Configure adaptive parameter hooks
   - Define safety guard thresholds
   - Map variability source responses

4. **Registration**
   - Add to post registry
   - Generate test program
   - Create documentation
   - Set as default if specified

5. **Validation**
   - Run test suite
   - Compare output to reference
   - Verify all G-codes supported
   - Check M-code handling

## Engines Used
- PostProcessorRegistryEngine
- MachinePostMapperEngine
- ContextualBoundaryEngine (Phase 0.25)
- PostProcessorValidatorEngine

## Example
```
/post-register H:/posts/okuma-vtc-custom.cps --machine vtc-800 --validate
```
