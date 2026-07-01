# /shop-quote — Quick Shop Floor Quote

Generate rapid quotes for shop floor requests with variability-aware time estimates.

## Usage
```
/shop-quote <part_desc> [--qty <N>] [--material <name>] [--tolerance <class>] [--rush]
```

## Workflow

1. **Part Analysis**
   - Parse description/print
   - Identify operations needed
   - Determine material and stock
   - Assess complexity class

2. **Time Estimation**
   - Setup time per operation
   - Cycle time with variability band
   - **Apply AdaptiveParameterSpaceEngine learned data**
   - Tool change and inspection time
   - First article time

3. **Variability-Aware Estimates**
   - **Query VariabilityEnvelopeEngine for time uncertainty**
   - P50 (median) estimate
   - P95 (conservative) estimate
   - P99 (worst case) estimate

4. **Cost Calculation**
   - Machine rate × time
   - Material cost
   - Tooling cost (consumables)
   - Overhead allocation
   - Rush multiplier if applicable

5. **Quote Output**
   - Time range with confidence
   - Price range with breakdown
   - Lead time estimate
   - Assumptions listed

## Engines Used
- QuoteEstimatorEngine
- CycleTimeEstimatorEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- AdaptiveParameterSpaceEngine (Phase 0.25)
- CostCalculatorEngine

## Example
```
/shop-quote "D2 punch, 2.5x2.5x4 inches, +/-0.0005 OD" --qty 25 --rush
```
