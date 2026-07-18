# /cam-workholding — Workholding Force and Safety Analysis

Calculate and validate workholding requirements with adaptive force margins.

## Usage
```
/cam-workholding <part_model> [--fixture <type>] [--operations <file>] [--safety-factor <N>]
```

## Workflow

1. **Cutting Force Estimation**
   - Parse operations and parameters
   - Calculate forces using Kienzle model
   - **Apply VariabilityEnvelopeEngine uncertainty bounds**
   - Account for worst-case engagement

2. **Workholding Analysis**
   - Coefficient of friction for material/fixture
   - Contact area calculation
   - Moment arm analysis
   - Pull-out force consideration

3. **Adaptive Safety Margins**
   - Base safety factor (typically 2.5-3.0)
   - **Add margin from VariabilitySourceTrackerEngine**
   - Account for tool wear progression
   - Consider thermal expansion effects

4. **Validation**
   - Clamp force vs cutting force ratio
   - Part deformation under clamping
   - Vibration damping adequacy
   - Emergency stop scenario

5. **Recommendations**
   - Required clamp pressure/force
   - Optimal clamp locations
   - Warning thresholds for monitoring
   - Alternative workholding options

## Engines Used
- WorkholdingAnalysisEngine
- CuttingForceEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- VariabilitySourceTrackerEngine (Phase 0.25)
- PartDeformationEngine

## Example
```
/cam-workholding H:/parts/thin_plate.step --fixture vacuum --safety-factor 3.0
```
