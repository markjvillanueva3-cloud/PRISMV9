# /capacity-plan — Shop Capacity Planning

Plan shop capacity with variability-aware cycle time estimates.

## Usage
```
/capacity-plan [--horizon <weeks>] [--jobs <file>] [--machines <ids>] [--what-if]
```

## Workflow

1. **Load Current State**
   - Machine availability
   - Current job queue
   - Operator schedules
   - Planned maintenance

2. **Job Analysis**
   - Operations per job
   - Estimated cycle times
   - **Apply VariabilityEnvelopeEngine for time uncertainty**
   - Setup and changeover times

3. **Capacity Calculation**
   - Available hours per machine
   - Account for OEE factors
   - Include variability buffers
   - Calculate utilization %

4. **Constraint Analysis**
   - Bottleneck identification
   - Resource conflicts
   - **Use InfiniteConditionCombinatorEngine for job×machine combinations**
   - Lead time risks

5. **Planning Output**
   - Capacity vs demand chart
   - Bottleneck report
   - Risk assessment (P50, P95 completion)
   - What-if scenarios

## Engines Used
- CapacityPlanningEngine
- SchedulingEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- InfiniteConditionCombinatorEngine (Phase 0.25)
- OEECalculationEngine

## Example
```
/capacity-plan --horizon 4 --what-if
```
