# /post-generate — Generate NC Code from CAM

Generate production-ready NC code with adaptive parameter injection.

## Usage
```
/post-generate <cam_file> [--post <name>] [--machine <id>] [--optimize]
```

## Workflow

1. **CAM Data Load**
   - Parse toolpath data
   - Extract operations
   - Get tool information
   - Load work coordinate system

2. **Parameter Optimization**
   - **Query AdaptiveParameterSpaceEngine for optimal values**
   - **Apply ContextualBoundaryEngine limits**
   - Adjust for current tool condition
   - Consider material batch

3. **NC Generation**
   - Apply post-processor rules
   - Format for controller
   - Insert setup comments
   - Add program documentation

4. **Variability Injection**
   - **Embed adaptive feed rate zones**
   - Tool wear compensation points
   - Inspection pauses if needed
   - Edge case monitoring triggers

5. **Output**
   - NC program file
   - Setup sheet
   - Tool list
   - Estimated cycle time with uncertainty

## Engines Used
- NCGeneratorEngine
- PostProcessorEngine
- AdaptiveParameterSpaceEngine (Phase 0.25)
- ContextualBoundaryEngine (Phase 0.25)
- CycleTimeEstimatorEngine

## Example
```
/post-generate H:/cam/housing.mcx --post fanuc-30i --optimize
```
