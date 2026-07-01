# /cmm-parse — CMM Report Analysis

Parse and analyze CMM measurement reports for quality insights.

## Usage
```
/cmm-parse <report_file> [--tolerance-check] [--trend] [--spc]
```

## Workflow

1. **Report Parsing**
   - Parse CMM output format (DMIS, CSV, native)
   - Extract measured values
   - Match to nominal dimensions
   - Identify out-of-spec features

2. **Tolerance Analysis**
   - Calculate deviations
   - Determine conformance status
   - Flag borderline measurements
   - Compute bonus tolerances

3. **Trend Analysis**
   - Compare to historical data
   - **Feed to VariabilitySourceTrackerEngine**
   - Identify drift patterns
   - Predict future deviations

4. **Variability Feedback**
   - **Update EdgeCaseCaptureEngine with boundary measurements**
   - **Expand VariabilityEnvelopeEngine with new data**
   - **Attribute variation to sources**
   - Track improvement over time

5. **Output**
   - Pass/fail summary
   - Feature-level analysis
   - Trend charts
   - SPC integration

## Engines Used
- CMMReportParserEngine
- ToleranceAnalysisEngine
- VariabilitySourceTrackerEngine (Phase 0.25)
- EdgeCaseCaptureEngine (Phase 0.25)
- SPCIntegrationEngine

## Example
```
/cmm-parse H:/quality/report_12345.csv --trend --spc
```
