---
name: Measurement Bias Detector
description: Detect systematic measurement bias in inspection data
---

## When To Use
- When suspecting systematic measurement errors across parts or features
- When different operators or machines produce consistently different readings
- When validating measurement system before a critical production run
- When investigating why parts pass CMM but fail customer incoming inspection
- NOT for probe calibration tracking — use mfg-probe-drift instead

## How To Use
```
prism_intelligence action=measure_bias_detect params={
  part: "bracket-001",
  feature: "bore_1",
  measurements: [50.012, 50.015, 50.011, 50.014, 50.013],
  nominal: 50.000,
  tolerance: "±0.025",
  source: "CMM-1"
}
```

## What It Returns
- Detected bias magnitude and direction (positive/negative offset)
- Statistical significance test (p-value for mean shift from nominal)
- Comparison across measurement sources if multiple provided
- Potential root causes: thermal, probe wear, datum shift, fixturing
- Corrective action recommendations

## Examples
- Input: `measure_bias_detect params={feature: "bore_1", measurements: [50.012, 50.015, 50.011, 50.014, 50.013], nominal: 50.000}`
- Output: Systematic positive bias +0.013mm detected (p<0.001), likely thermal expansion — measure at controlled temp

- Input: `measure_bias_detect params={feature: "width", source_A: [25.002, 25.001, 25.003], source_B: [24.995, 24.994, 24.996], nominal: 25.000}`
- Output: Inter-instrument bias 0.007mm between CMM-A and CMM-B, recommend cross-calibration with master
