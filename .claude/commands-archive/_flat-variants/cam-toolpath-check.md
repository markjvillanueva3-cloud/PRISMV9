---
policy:
  tier: 3
  triggers:
    - "cam-toolpath-check"
---
# /cam-toolpath-check — Toolpath Validation and Analysis

Comprehensive toolpath validation for collision, efficiency, and machining physics.

## Usage
```
/cam-toolpath-check <toolpath_file> [--collision] [--physics] [--optimize] [--variability]
```

## Workflow

1. **Geometry Validation**
   - Check toolpath continuity
   - Verify Z-level consistency
   - Validate arc/helix segments
   - Check for self-intersections

2. **Collision Detection**
   - Tool-to-part interference
   - Holder-to-part clearance
   - Fixture collision zones
   - Rapid move safety

3. **Physics Analysis**
   - Cutting force prediction (Kienzle)
   - Tool deflection estimation
   - Chatter stability (SLD)
   - Surface finish prediction

4. **Variability-Aware Validation**
   - Check engagement against AdaptiveParameterSpaceEngine regions
   - Validate feed rates within VariabilityEnvelopeEngine bounds
   - Flag edge cases for EdgeCaseCaptureEngine learning
   - Apply ContextualBoundaryEngine limits per operation

5. **Optimization Suggestions**
   - Link distance reduction
   - Smooth path transitions
   - Feed rate optimization zones
   - Tool engagement balancing

## Engines Used
- ToolpathValidationEngine
- CollisionDetectionEngine
- CuttingForceEngine
- ChatterPredictionEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- AdaptiveParameterSpaceEngine (Phase 0.25)

## Example
```
/cam-toolpath-check H:/cam/rough.nci --physics --variability
```
