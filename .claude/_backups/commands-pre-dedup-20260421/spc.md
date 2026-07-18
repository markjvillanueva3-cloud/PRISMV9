# /spc — Statistical Process Control

Real-time SPC monitoring with adaptive control limits and variability awareness.

## Usage
```
/spc <dimension> [--chart X-bar-R|X-bar-S|IMR|CUSUM|EWMA] [--limits <auto|custom>]
```

## Workflow

1. **Data Collection**
   - Real-time measurement feed
   - Historical data load
   - Subgroup formation
   - Data validation

2. **Control Chart Selection**
   - X-bar-R for subgroups n<10
   - X-bar-S for larger subgroups
   - IMR for individual measurements
   - CUSUM/EWMA for small shifts

3. **Adaptive Limits**
   - **Query VariabilityEnvelopeEngine for natural bounds**
   - Calculate control limits from process
   - **Adjust for ContextualBoundaryEngine conditions**
   - Account for known variability sources

4. **Pattern Detection**
   - Western Electric rules
   - Nelson rules
   - Trend detection
   - **Feed exceptions to ExceptionLearningEngine**

5. **Alerts and Actions**
   - Out-of-control signals
   - Assignable cause investigation
   - **Link to VariabilitySourceTrackerEngine**
   - Recommended corrective actions

## Engines Used
- SPCChartEngine
- WesternElectricRulesEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- ExceptionLearningEngine (Phase 0.25)
- VariabilitySourceTrackerEngine (Phase 0.25)

## Example
```
/spc shaft_diameter --chart X-bar-R --limits auto
```
