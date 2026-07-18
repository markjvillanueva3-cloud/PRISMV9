# /cad-review — CAD Model Quality Review

Review CAD model for manufacturability, quality issues, and design best practices.

## Usage
```
/cad-review <model_path> [--strict] [--export-report]
```

## Workflow

1. **Load Model**
   - Parse STEP/IGES/native CAD format
   - Extract geometry tree and features
   - Identify material assignments

2. **Geometry Analysis**
   - Check for watertight solids
   - Detect self-intersections
   - Verify face normals orientation
   - Check minimum feature sizes

3. **Manufacturability Check**
   - Identify undercuts and draft angles
   - Check internal radii vs tool reach
   - Verify wall thickness minimums
   - Flag thin features at risk

4. **Quality Issues**
   - Detect duplicate faces/edges
   - Find small gaps and overlaps
   - Identify degenerate geometry
   - Check tolerance consistency

5. **Report Generation**
   - Generate issue list with severity
   - Provide fix recommendations
   - Export to PDF/JSON if requested

## Engines Used
- CadGeometryAnalysisEngine
- CadManufacturabilityEngine
- CadQualityCheckEngine
- CadFeatureRecognitionEngine

## Example
```
/cad-review H:/parts/housing.step --strict
```
