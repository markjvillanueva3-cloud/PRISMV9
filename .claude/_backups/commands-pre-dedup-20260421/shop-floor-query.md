# /shop-floor-query — Real-Time Shop Floor Intelligence

Query live shop floor data with natural language and get actionable insights.

## Usage
```
/shop-floor-query "<question>" [--machine <id>] [--timeframe <period>]
```

## Query Types

1. **Machine Status**
   - "What machines are running?"
   - "Is the MU-5000V available?"
   - "Which machines had alarms today?"

2. **Job Status**
   - "What job is on LB3000 EX?"
   - "How many parts completed on VF-4?"
   - "What's the cycle time variance today?"

3. **Performance Queries**
   - "What's the OEE this week?"
   - "Which machine has the most downtime?"
   - "Show feed rate trends on VTC-800"

4. **Variability Queries**
   - **Query VariabilitySourceTrackerEngine for drift sources**
   - "What's causing dimensional variation on job 12345?"
   - "Is tool wear trending up on MU-5000V?"
   - "Show thermal drift pattern this shift"

5. **Predictive Queries**
   - "When will tool T12 need replacement?"
   - "Predict completion time for current batch"
   - "Which jobs at risk of missing due date?"

## Engines Used
- ShopFloorQueryEngine
- MachineStatusEngine
- OEECalculationEngine
- VariabilitySourceTrackerEngine (Phase 0.25)
- PredictiveMaintenanceEngine

## Example
```
/shop-floor-query "Why is surface finish worse on the second shift?"
```
