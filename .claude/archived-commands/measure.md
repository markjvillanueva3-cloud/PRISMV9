# Measure — Record Physical Measurement & Learn

Feed a physical measurement back into PRISM so the system learns how your specific machine behaves. Every measurement makes future predictions more accurate.

**Value**: After 20-30 measurements per machine, PRISM's predictions account for YOUR machine's specific geometric errors, thermal behavior, spindle runout, and fixturing characteristics — things no textbook formula can predict.

## Args: $ARGUMENTS
- `[machineId] [type] [value] [unit]`: quick measurement (e.g., "HAAS-VF2 dimension 25.012 mm")
- `cmm [machineId] [csv-path]`: bulk import from CMM export file
- `compare [machineId] [predicted] [measured] [type]`: explicit predicted vs actual
- `report [machineId]`: show machine intelligence report
- `status`: system-wide learning status across all machines
- Empty: interactive — ask for measurement details

## Quick Measurement Flow
1. Parse input for machineId, measurementType, measured value, unit
2. Optionally ask for: material, operation, tool type, axis, shop temperature
3. Call `prism_calc` action `submit_measurement`:
   ```
   { machineId, measurementType, measured, unit, material, operation,
     toolFamily, axis, shopTemp_C, toolWearState, partId }
   ```
4. Report: residual, running bias, RMSE, calibration status, confidence level
5. If calibration was triggered, show coefficient changes

## CMM Bulk Import
1. Call `prism_calc` action `parse_cmm_export` with CSV content + machineId
2. Show: total features, out-of-tolerance count, worst deviation
3. Call `prism_calc` action `batch_import_measurements` with parsed data
4. Report: accepted/rejected counts, any anomalies flagged, calibration triggered

## Compare & Learn
1. Call `prism_calc` action `compare_and_learn`:
   ```
   { machineId, predicted, measured, measurementType, unit, material, operation }
   ```
2. Show: residual, bias shift, what next prediction would be
3. Present: "Before learning: PRISM predicted X. After learning: PRISM would predict Y"

## Machine Intelligence Report
1. Call `prism_calc` action `machine_intelligence` with machineId
2. Show:
   - Total measurements and types
   - Biases by context (machine × material × operation)
   - Accuracy by type and material
   - Environmental sensitivity (thermal, coolant, warm-up)
   - Tool wear bias model (if enough data)
   - Recommendations for improving predictions

## System Learning Status
1. Call `prism_calc` action `system_learning_status`
2. Show: total machines, measurements, calibrations, accuracy rankings
3. Identify systemic biases (same bias on ALL machines = model problem)
