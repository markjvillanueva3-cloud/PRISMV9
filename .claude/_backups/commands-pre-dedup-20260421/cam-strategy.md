# /cam-strategy — Intelligent CAM Strategy Selection

Select optimal machining strategies based on geometry, material, and ADAPTIVE cutting conditions.

## Usage
```
/cam-strategy <model_path> [--material <name>] [--machine <id>] [--optimize time|cost|quality]
```

## Workflow

1. **Context Analysis**
   - Load part geometry and features
   - Query material properties
   - Check machine capabilities
   - **Load variability envelopes for current conditions**

2. **Strategy Selection**
   - **Roughing**: HSM, adaptive clearing, plunge, trochoidal
   - **Semi-finish**: Z-level, flowline, pencil
   - **Finishing**: parallel, scallop, morphed spiral
   - **Holes**: drilling sequences, boring, reaming

3. **Adaptive Parameter Adjustment**
   - Query ContextualBoundaryEngine for condition-specific limits
   - Apply VariabilityEnvelopeEngine bounds (p95, p99)
   - Adjust for tool wear state via VariabilitySourceTrackerEngine
   - React to thermal drift and material batch variation

4. **Optimization**
   - Time-optimal: aggressive but safe parameters
   - Cost-optimal: balance tool life and cycle time
   - Quality-optimal: conservative for tight tolerances

5. **Output**
   - Strategy recommendation with rationale
   - Parameter set within adaptive envelope
   - Tool selection
   - Estimated cycle time with confidence interval

## Engines Used
- CAMStrategySelectionEngine
- ContextualBoundaryEngine (Phase 0.25)
- VariabilityEnvelopeEngine (Phase 0.25)
- AdaptiveParameterSpaceEngine (Phase 0.25)
- ToolpathOptimizationEngine

## Example
```
/cam-strategy H:/parts/mold.step --material H13 --optimize quality
```
