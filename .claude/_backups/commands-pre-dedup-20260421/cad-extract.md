# /cad-extract — Extract Features from CAD Model

Extract machining features, dimensions, and tolerances from CAD models for CAM programming.

## Usage
```
/cad-extract <model_path> [--features] [--dimensions] [--tolerances] [--all]
```

## Workflow

1. **Model Loading**
   - Parse CAD file (STEP, IGES, Parasolid, native)
   - Build feature tree
   - Extract PMI (Product Manufacturing Information)

2. **Feature Extraction**
   - Holes (through, blind, counterbore, countersink)
   - Pockets (rectangular, circular, freeform)
   - Slots and grooves
   - Bosses and pads
   - Chamfers and fillets
   - Threads (internal, external)

3. **Dimension Extraction**
   - Overall bounding box
   - Feature dimensions
   - Center-to-center distances
   - Depth and height values

4. **Tolerance Extraction**
   - GD&T callouts
   - Dimensional tolerances
   - Surface finish requirements
   - Datum references

5. **Output Generation**
   - JSON feature database
   - Feature-to-operation mapping
   - CAM-ready feature list

## Engines Used
- CadFeatureRecognitionEngine
- CadDimensionExtractorEngine
- CadToleranceExtractorEngine
- CadPMIParserEngine

## Example
```
/cad-extract H:/parts/bracket.step --all
```
