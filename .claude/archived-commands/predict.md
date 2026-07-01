# Predict — Machine-Learned Manufacturing Prediction

Get a prediction that uses everything PRISM has learned about YOUR specific machine. Unlike generic physics formulas, this accounts for machine bias, thermal growth, coolant age, tool wear state, and environmental factors — all learned from your historical measurements.

**Value**: After calibration, predictions are typically 2-5x more accurate than standard physics models because they account for YOUR machine's specific characteristics.

## Args: $ARGUMENTS
- `[machineId] [type] [params...]`: quick prediction (e.g., "HAAS-VF2 dimension speed=200 feed=0.15 material=steel")
- `force [machineId] [material] [params]`: predict cutting force
- `finish [machineId] [material] [feed] [nose-radius]`: predict surface finish
- `life [machineId] [material] [speed]`: predict tool life
- `dimension [machineId] [material] [operation]`: predict dimensional accuracy
- Empty: interactive — ask for prediction details

## Prediction Flow
1. Parse input for machineId, predictionType, and parameters
2. Call `prism_calc` action `learned_prediction`:
   ```
   { machineId, predictionType, material, operation, toolFamily, axis,
     parameters: { speed_mpm, feed_mmrev, depth_mm, noseRadius_mm },
     shopTemp_C, toolWearState, coolantAge_days, machineRuntime_hours,
     workpieceLength_mm }
   ```
3. Present results:
   ```
   PREDICTION — [machineId] — [type]
   Standard physics:    [baseline] [unit]
   Machine-learned:     [prediction] [unit]
   Confidence:          [HIGH/MEDIUM/LOW/BASELINE_ONLY]
   95% CI:              [lower] to [upper] [unit]
   Based on:            [N] historical measurements
   Improvement:         [X]% more accurate vs standard

   Adjustments applied:
     Stratified bias:   [+/-X] (machine×material×operation)
     Thermal correction:[+/-X] (shop temp [T]°C)
     Tool wear:         [+/-X] (wear state [W]%)
     Coolant age:       [factor] (age [D] days)
   ```

## If No Data Available
If confidence is "baseline_only", suggest:
1. "No learning data for this machine yet"
2. "Run `/measure [machineId] [type] [value] [unit]` after measuring parts"
3. "After 5+ measurements, predictions will start improving"
4. "After 20+ measurements, predictions reach HIGH confidence"
