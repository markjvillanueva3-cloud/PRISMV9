---
name: prism-anomaly-detector
description: |
  7 anomaly types for D(x) score. Detects range violations, physics errors, and dangerous data patterns.
---

```
Trigger: data:received
Action: Check all numerical values against expected ranges
Fires: On every data input (materials, machines, calculations)

Process:
1. Extract all numerical values from input
2. Identify value types (speed, feed, force, temp, etc.)
3. Look up expected ranges for each type
4. Flag any values outside expected bounds
5. Compute initial anomaly score

Output: {
  values_checked: number,
  anomalies_found: number,
  severity: "NONE" | "INFO" | "WARN" | "CRITICAL",
  details: AnomalyDetail[]
}
```

## ANOM-002: Pattern Unusual Flag
```
Trigger: pattern:unusual
Action: Flag unusual patterns for human review
Fires: When statistical analysis detects outliers

Process:
1. Apply Z-score analysis (|z| > 3 = anomaly)
2. Apply IQR analysis (outside 1.5×IQR = anomaly)
3. Check historical patterns for deviation
4. Assess combination anomalies (individually OK, together wrong)
5. Generate severity rating

Output: {
  pattern_type: string,
  deviation_score: number,
  historical_comparison: string,
  severity: "INFO" | "WARN" | "CRITICAL" | "BLOCK",
  recommendation: string
}
```

## ANOM-003: Safety Check Validation
```
Trigger: safety:check
Action: Final validation against known safe ranges
Fires: Before ANY output is generated

Process:
1. Load safety limits for output type
2. Compare all values against absolute limits
3. Check for physically impossible values
4. Verify dimensional consistency
5. Apply domain-specific safety rules
6. Compute final D(x) score

Output: {
  safe: boolean,
  D_x: number,
  violations: SafetyViolation[],
  blocked: boolean,
  reason: string | null
}
```

# SEVERITY LEVELS

| Level | Code | D(x) Range | Action | Visual |
|-------|------|------------|--------|--------|
| **NONE** | SEV-0 | 1.00 | Proceed normally | ✅ |
| **INFO** | SEV-1 | 0.85-0.99 | Log, proceed | ℹ️ |
| **WARN** | SEV-2 | 0.50-0.84 | Alert user, proceed with caution | ⚠️ |
| **CRITICAL** | SEV-3 | 0.20-0.49 | Require user confirmation | 🔶 |
| **BLOCK** | SEV-4 | 0.00-0.19 | **OUTPUT BLOCKED** | 🛑 |

## Severity Escalation Rules
```
- Single RANGE anomaly → WARN
- Multiple RANGE anomalies → CRITICAL
- Any PHYSICAL anomaly → BLOCK
- COMBINATION anomaly in safety-critical domain → CRITICAL
- COMBINATION + any other anomaly → BLOCK
- MISSING critical value → BLOCK
```

# STATISTICAL OUTLIER DETECTION

## Z-Score Analysis

```javascript
function zScoreAnalysis(value, population) {
  const mean = population.reduce((a, b) => a + b, 0) / population.length;
  const variance = population.reduce((sum, v) => sum + (v - mean) ** 2, 0) / population.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return { zScore: 0, isAnomaly: false };
  
  const zScore = (value - mean) / stdDev;
  
  return {
    zScore: zScore,
    isAnomaly: Math.abs(zScore) > 3,
    severity: Math.abs(zScore) > 4 ? 'CRITICAL' : 
              Math.abs(zScore) > 3 ? 'WARN' : 'NONE',
    percentile: normalCDF(zScore)
  };
}

function normalCDF(z) {
  // Approximation of cumulative normal distribution
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  
  return 0.5 * (1.0 + sign * y);
}
```

## IQR Analysis (Interquartile Range)

```javascript
function iqrAnalysis(value, population) {
  const sorted = [...population].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const extremeLower = q1 - 3 * iqr;
  const extremeUpper = q3 + 3 * iqr;
  
  let isAnomaly = false;
  let severity = 'NONE';
  
  if (value < extremeLower || value > extremeUpper) {
    isAnomaly = true;
    severity = 'CRITICAL';
  } else if (value < lowerBound || value > upperBound) {
    isAnomaly = true;
    severity = 'WARN';
  }
  
  return {
    q1, q3, iqr,
    lowerBound, upperBound,
    extremeLower, extremeUpper,
    isAnomaly, severity
  };
}
```

## Historical Pattern Deviation

```javascript
function historicalDeviation(current, history, windowSize = 10) {
  if (history.length < windowSize) {
    return { deviation: null, trend: 'INSUFFICIENT_DATA' };
  }
  
  const recent = history.slice(-windowSize);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const stdDev = Math.sqrt(
    recent.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recent.length
  );
  
  const deviation = (current - mean) / (stdDev || 1);
  
  // Trend analysis
  let trend = 'STABLE';
  const slope = linearRegression(recent).slope;
  if (slope > 0.1 * mean) trend = 'INCREASING';
  if (slope < -0.1 * mean) trend = 'DECREASING';
  
  // Is current value anomalous given trend?
  const expectedNext = mean + slope;
  const deviationFromTrend = Math.abs(current - expectedNext) / (stdDev || 1);
  
  return {
    deviation,
    trend,
    expectedNext,
    deviationFromTrend,
    isAnomaly: deviationFromTrend > 3,
    severity: deviationFromTrend > 4 ? 'CRITICAL' :
              deviationFromTrend > 3 ? 'WARN' : 'NONE'
  };
}

function linearRegression(data) {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}
```

# INTEGRATION POINTS

## With Safety Framework (prism-safety-framework)

```
ANOM-003 (safety:check) feeds directly into S(x) computation:
1. prism-safety-framework computes base S(x) from 7 failure modes
2. ANOM-003 runs its checks and computes D(x)
3. If D(x) < 0.30 → S(x) = 0 → Ω(x) = 0 → OUTPUT BLOCKED
4. Otherwise S(x)_final = S(x)_base × D(x)
```

## With Master Equation (prism-master-equation)

```
D(x) is a component in Ω(x):
Ω(x) = 0.20·R + 0.15·C + 0.10·P + 0.25·S + 0.05·L + 0.08·A + 0.05·M + 0.07·K + 0.05·D

Note: D(x) has 0.05 weight but also affects S(x) indirectly
Combined effect: D(x) < 0.30 blocks ALL output regardless of other scores
```

## With Debugging Protocol (prism-sp-debugging)

```
When debugging numerical issues:
1. Phase 1 (Evidence Collection) - Run ANOM-001 on all inputs
2. Phase 2 (Root Cause) - Use anomaly types to trace origin
3. Phase 3 (Hypothesis) - ANOM-002 validates test predictions
4. Phase 4 (Prevention) - Add rules to prevent anomaly recurrence
```

# CONFIGURATION

## Adjustable Thresholds

```javascript
const ANOMALY_CONFIG = {
  // Z-score thresholds
  zScore: {
    warn: 3.0,
    critical: 4.0,
    block: 5.0
  },
  
  // IQR multipliers
  iqr: {
    outlier: 1.5,
    extreme: 3.0
  },
  
  // D(x) thresholds
  Dx: {
    proceed: 0.70,
    warn: 0.50,
    critical: 0.30,
    block: 0.20
  },
  
  // Speed limits by material class (as multiplier of recommended)
  speedTolerance: {
    ISO_P: 1.3,  // Steels - some flexibility
    ISO_M: 1.1,  // Stainless - less flexibility
    ISO_K: 1.4,  // Cast iron - more flexible
    ISO_N: 1.5,  // Non-ferrous - most flexible
    ISO_S: 1.05, // Superalloys - very strict
    ISO_H: 1.1   // Hardened - strict
  }
};
```

## Enabling/Disabling Checks

```javascript
const CHECKS_ENABLED = {
  physical: true,      // Always on - cannot disable physics
  range: true,         // Recommended always on
  statistical: true,   // Can disable for unusual materials
  combination: true,   // Recommended always on
  temporal: true,      // Can disable for new processes
  relational: true,    // Recommended always on
  missing: true        // Recommended always on
};
```

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**LIVES DEPEND ON CATCHING ANOMALIES BEFORE OUTPUT.**
**prism-anomaly-detector v1.0.0 | Cognitive Level 1 | D(x) Provider**
