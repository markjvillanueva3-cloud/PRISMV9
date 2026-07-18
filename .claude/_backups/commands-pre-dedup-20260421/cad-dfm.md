# /cad-dfm — Design for Manufacturability Analysis

Comprehensive DFM analysis to optimize designs for manufacturing efficiency and cost.

## Usage
```
/cad-dfm <model_path> [--process mill|lathe|edm|all] [--cost] [--suggest-changes]
```

## Workflow

1. **Design Analysis**
   - Parse CAD geometry
   - Identify all features
   - Determine material and stock
   - Calculate feature complexity

2. **Manufacturability Assessment**
   - **Accessibility**: Tool reach, clearances
   - **Machinability**: Feature sizes vs tooling
   - **Fixturing**: Clamping surfaces, datums
   - **Material Removal**: Stock to part ratio
   - **Tolerance**: Process capability matching

3. **Issue Detection**
   - Internal corners too sharp
   - Deep pockets without relief
   - Thin walls at risk
   - Undercuts requiring special tooling
   - Tolerance beyond process capability

4. **Cost Impact Analysis**
   - Material waste percentage
   - Estimated machining time
   - Special tooling requirements
   - Secondary operations needed
   - Quality inspection difficulty

5. **Recommendations**
   - Design change suggestions
   - Alternative feature options
   - Process selection guidance
   - Cost reduction opportunities

## Engines Used
- DFMAnalysisEngine
- ManufacturabilityScoreEngine
- CostEstimationEngine
- DesignOptimizationAdvisorEngine

## Example
```
/cad-dfm H:/parts/housing.step --process mill --suggest-changes
```
