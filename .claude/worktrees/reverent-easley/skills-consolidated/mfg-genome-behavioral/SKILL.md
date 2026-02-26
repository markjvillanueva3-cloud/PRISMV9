---
name: mfg-genome-behavioral
description: Analyze behavioral patterns in manufacturing genome data
---

# Behavioral Pattern Analyzer

## When To Use
- Analyzing how a part genome behaves across different manufacturing conditions
- Detecting behavioral patterns like consistent tool wear, vibration signatures, or quality drift
- Understanding why certain genome types perform differently on different machines
- Identifying genome-linked production anomalies for root cause analysis

## How To Use
```
prism_intelligence action=genome_behavioral params={genome_id: "GEN-BRK-7075-001", analysis: "tool_wear_pattern"}
```

## What It Returns
- `patterns` — detected behavioral patterns with statistical significance
- `correlations` — genome gene correlations with production outcomes
- `anomalies` — behavioral anomalies that deviate from expected genome performance
- `machine_affinity` — how the genome performs differently across machine types
- `seasonal_effects` — time-based behavioral variations (temperature, humidity effects)

## Examples
- Analyze tool wear pattern: `genome_behavioral params={genome_id: "GEN-BRK-7075-001", analysis: "tool_wear_pattern"}` — returns consistent accelerated wear at feature #4 (deep pocket), tool life 30% below genome prediction, correlated with chip evacuation gene
- Machine affinity analysis: `genome_behavioral params={genome_id: "GEN-SHAFT-4340-012", analysis: "machine_affinity"}` — returns 12% better surface finish on MORI-NLX vs. HAAS-ST, correlated with spindle runout difference (0.002mm vs. 0.005mm)
- Quality drift detection: `genome_behavioral params={genome_id: "GEN-HSG-356-007", analysis: "quality_drift"}` — returns bore diameter trending +0.005mm over 50-part runs, correlated with thermal expansion gene, recommend mid-run offset adjustment
