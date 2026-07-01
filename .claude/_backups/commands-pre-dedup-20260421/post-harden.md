# /post-harden — Harden Post-Processor for Machine

Customize and harden post-processor for specific machine characteristics.

## Usage
```
/post-harden <post_name> [--machine <id>] [--controller <version>] [--test]
```

## Workflow

1. **Machine Profile**
   - Load machine capabilities
   - Get controller version specifics
   - Identify optional features
   - **Load variability characteristics**

2. **Post Customization**
   - Axis naming conventions
   - Canned cycle formats
   - Tool change sequences
   - Coolant codes
   - Program structure

3. **Safety Hardening**
   - Enforce retract heights
   - Mandatory G-code checks
   - Speed/feed limit guards
   - **Integrate ContextualBoundaryEngine limits**

4. **Variability Guards**
   - **Embed VariabilityEnvelopeEngine bounds**
   - Adaptive feed rate limits
   - Tool wear compensation hooks
   - Thermal compensation triggers

5. **Testing**
   - Generate test programs
   - Verify against machine
   - Compare to reference output
   - Document changes

## Engines Used
- PostProcessorHardeningEngine
- MachineProfileEngine
- ContextualBoundaryEngine (Phase 0.25)
- VariabilityEnvelopeEngine (Phase 0.25)
- PostProcessorTestingEngine

## Example
```
/post-harden fanuc-30i --machine okuma-mu5000v --test
```
