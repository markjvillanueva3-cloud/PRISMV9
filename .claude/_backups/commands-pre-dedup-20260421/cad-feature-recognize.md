# /cad-feature-recognize — Automatic Feature Recognition

Automatically recognize machining features from CAD geometry for CAM programming.

## Usage
```
/cad-feature-recognize <model_path> [--operations] [--sequence] [--json]
```

## Workflow

1. **Geometry Analysis**
   - Load and tessellate model
   - Identify face types (planar, cylindrical, conical, freeform)
   - Build face adjacency graph
   - Detect edge loops

2. **Feature Detection**
   - **Holes**: through, blind, stepped, tapered, threaded
   - **Pockets**: open, closed, islands, bosses
   - **Slots**: through, blind, T-slots, dovetails
   - **Profiles**: 2D contours, 3D surfaces
   - **Chamfers/Fillets**: edge features
   - **Threads**: internal, external, pipe

3. **Feature Classification**
   - Assign machining operation types
   - Determine approach directions
   - Identify feature groups
   - Detect feature interactions

4. **Operation Mapping**
   - Map features to operations (drill, mill, turn, EDM)
   - Suggest tool types and sizes
   - Generate operation sequence
   - Estimate cycle times

5. **Output**
   - Feature database JSON
   - Operation sequence plan
   - Tool requirements list
   - CAM import ready data

## Engines Used
- CadFeatureRecognitionEngine
- FeatureToOperationMapperEngine
- ToolSelectionAdvisorEngine
- SequencePlannerEngine

## Example
```
/cad-feature-recognize H:/parts/manifold.step --operations --sequence
```
