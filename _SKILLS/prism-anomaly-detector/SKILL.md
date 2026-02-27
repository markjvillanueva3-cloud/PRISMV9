# PRISM ANOMALY DETECTOR
## Cognitive Skill for Safety-Critical Anomaly Detection
### Level 1 Cognitive | Part of Cognitive Enhancement v7.0
### Version 1.0.0 | 2026-01-30

---

# OVERVIEW

## Purpose
Detect dangerous values, outliers, and errors BEFORE they reach output.
Manufacturing software generates speeds, feeds, forces, and temperatures
that can injure or kill if incorrect. This skill is the last line of defense.

## Level
**L1 Cognitive** - Loads for quality assessment, integrates with S(x) safety framework

## Triggers
- Any numerical output generation
- Speed/feed calculations
- Force predictions
- Temperature estimates
- Material property lookups
- Machine capability checks

## Output
**D(x)** - Anomaly Detection Score (0.0 to 1.0)
- 1.0 = No anomalies detected, all values within safe ranges
- 0.7-0.99 = Minor anomalies flagged, proceed with caution
- 0.3-0.69 = Significant anomalies, review required
- 0.0-0.29 = Critical anomalies, OUTPUT BLOCKED

## Integration
```
S(x) Safety Score incorporates D(x):
  If D(x) < 0.30 → S(x) = 0 → Ω(x) = 0 → HARD BLOCK
  If ANOM-002 fires with severity=CRITICAL → Immediate block
```

---

# HOOKS

## ANOM-001: Data Received Check
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

---

# ANOMALY TAXONOMY

## 7 Anomaly Types

| Type | Code | Description | Example |
|------|------|-------------|---------|
| **RANGE** | ANO-RNG | Value outside valid range | Speed = -500 RPM |
| **PHYSICAL** | ANO-PHY | Physically impossible | Force = 10^15 N |
| **STATISTICAL** | ANO-STA | Statistical outlier | Z-score > 4 |
| **COMBINATION** | ANO-CMB | Valid individually, wrong together | High speed + deep cut |
| **TEMPORAL** | ANO-TMP | Unexpected change over time | Tool life jumps 500% |
| **RELATIONAL** | ANO-REL | Breaks known relationship | Harder material, higher speed |
| **MISSING** | ANO-MIS | Required value absent | No coolant for titanium |

## Detection Priority
```
1. PHYSICAL (immediate block if impossible)
2. RANGE (block if outside absolute limits)
3. COMBINATION (high priority - hidden danger)
4. RELATIONAL (medium priority - expertise violation)
5. STATISTICAL (medium priority - unusual but possible)
6. TEMPORAL (low priority - may be valid change)
7. MISSING (depends on criticality of missing value)
```

---

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

---

# MANUFACTURING-SPECIFIC RULES

## 1. Speed/Feed Boundary Checking

```javascript
function checkSpeedFeed(speed, feed, material, tool, operation) {
  const limits = getSpeedFeedLimits(material, tool, operation);
  const anomalies = [];
  
  // Absolute limits (PHYSICAL)
  if (speed <= 0) {
    anomalies.push({type: 'ANO-PHY', field: 'speed', value: speed, 
                    message: 'Speed must be positive', severity: 'BLOCK'});
  }
  if (speed > 100000) { // No tool survives 100K RPM
    anomalies.push({type: 'ANO-PHY', field: 'speed', value: speed,
                    message: 'Speed exceeds physical limits', severity: 'BLOCK'});
  }
  
  // Material-based limits (RANGE)
  if (speed > limits.maxSpeed * 1.5) {
    anomalies.push({type: 'ANO-RNG', field: 'speed', value: speed,
                    message: `Speed ${speed} exceeds max ${limits.maxSpeed} by >50%`,
                    severity: 'CRITICAL'});
  } else if (speed > limits.maxSpeed) {
    anomalies.push({type: 'ANO-RNG', field: 'speed', value: speed,
                    message: `Speed ${speed} exceeds recommended max ${limits.maxSpeed}`,
                    severity: 'WARN'});
  }
  
  // Feed rate checks
  if (feed <= 0) {
    anomalies.push({type: 'ANO-PHY', field: 'feed', value: feed,
                    message: 'Feed must be positive', severity: 'BLOCK'});
  }
  if (feed > limits.maxFeed * 2) {
    anomalies.push({type: 'ANO-RNG', field: 'feed', value: feed,
                    message: `Feed ${feed} exceeds safe limits`, severity: 'CRITICAL'});
  }
  
  // Combination check (COMBINATION)
  const chipLoad = feed / (speed * tool.flutes);
  if (chipLoad > limits.maxChipLoad) {
    anomalies.push({type: 'ANO-CMB', field: 'chipLoad', value: chipLoad,
                    message: `Chip load ${chipLoad} too high for this combination`,
                    severity: 'CRITICAL'});
  }
  if (chipLoad < limits.minChipLoad && operation !== 'finishing') {
    anomalies.push({type: 'ANO-CMB', field: 'chipLoad', value: chipLoad,
                    message: `Chip load ${chipLoad} too low - tool rubbing`,
                    severity: 'WARN'});
  }
  
  return anomalies;
}
```

## 2. Force Calculation Sanity Checks

```javascript
function checkForceCalculation(Fc, Ff, Fp, material, params) {
  const anomalies = [];
  const totalForce = Math.sqrt(Fc**2 + Ff**2 + Fp**2);
  
  // Physical impossibility (PHYSICAL)
  if (Fc < 0 || Ff < 0 || Fp < 0) {
    anomalies.push({type: 'ANO-PHY', field: 'force',
                    message: 'Force components cannot be negative',
                    severity: 'BLOCK'});
  }
  
  // Unrealistic magnitude (PHYSICAL)
  if (totalForce > 1e9) { // 1 GN is absurd for machining
    anomalies.push({type: 'ANO-PHY', field: 'totalForce', value: totalForce,
                    message: 'Total force exceeds physical plausibility',
                    severity: 'BLOCK'});
  }
  
  // Expected range based on material (RANGE)
  const expectedRange = getExpectedForceRange(material, params);
  if (totalForce > expectedRange.max * 3) {
    anomalies.push({type: 'ANO-RNG', field: 'totalForce', value: totalForce,
                    message: `Force ${totalForce}N far exceeds expected ${expectedRange.max}N`,
                    severity: 'CRITICAL'});
  }
  
  // Force ratio check (RELATIONAL)
  const FcFfRatio = Fc / Ff;
  if (FcFfRatio < 0.5 || FcFfRatio > 10) {
    anomalies.push({type: 'ANO-REL', field: 'forceRatio', value: FcFfRatio,
                    message: `Unusual Fc/Ff ratio: ${FcFfRatio.toFixed(2)}`,
                    severity: 'WARN'});
  }
  
  return anomalies;
}
```

## 3. Temperature Limit Validation

```javascript
function checkTemperature(temp, material, tool, coolant) {
  const anomalies = [];
  
  // Absolute physical limits (PHYSICAL)
  if (temp < -273.15) {
    anomalies.push({type: 'ANO-PHY', field: 'temperature', value: temp,
                    message: 'Temperature below absolute zero',
                    severity: 'BLOCK'});
  }
  if (temp > 3000) { // Above this, we're in plasma territory
    anomalies.push({type: 'ANO-PHY', field: 'temperature', value: temp,
                    message: 'Temperature exceeds plausible machining range',
                    severity: 'BLOCK'});
  }
  
  // Tool material limits (RANGE)
  const toolLimits = getToolTempLimits(tool.material);
  if (temp > toolLimits.maxWorking) {
    anomalies.push({type: 'ANO-RNG', field: 'temperature', value: temp,
                    message: `Temperature ${temp}°C exceeds tool limit ${toolLimits.maxWorking}°C`,
                    severity: 'CRITICAL'});
  }
  
  // Material phase change check (RELATIONAL)
  if (temp > material.meltingPoint * 0.8) {
    anomalies.push({type: 'ANO-REL', field: 'temperature', value: temp,
                    message: `Temperature approaching melting point`,
                    severity: 'CRITICAL'});
  }
  
  // Coolant effectiveness check (COMBINATION)
  if (coolant === 'none' && temp > 400) {
    anomalies.push({type: 'ANO-CMB', field: 'cooling',
                    message: 'High temperature with no coolant - dangerous',
                    severity: 'CRITICAL'});
  }
  
  return anomalies;
}
```

## 4. Tool Life Estimation Bounds

```javascript
function checkToolLife(estimatedLife, material, params, historical) {
  const anomalies = [];
  
  // Physical limits (PHYSICAL)
  if (estimatedLife <= 0) {
    anomalies.push({type: 'ANO-PHY', field: 'toolLife', value: estimatedLife,
                    message: 'Tool life must be positive',
                    severity: 'BLOCK'});
  }
  if (estimatedLife > 10000) { // No tool lasts 10K minutes realistically
    anomalies.push({type: 'ANO-PHY', field: 'toolLife', value: estimatedLife,
                    message: 'Tool life estimate unrealistically high',
                    severity: 'CRITICAL'});
  }
  
  // Historical comparison (TEMPORAL)
  if (historical && historical.avgLife) {
    const ratio = estimatedLife / historical.avgLife;
    if (ratio > 5) {
      anomalies.push({type: 'ANO-TMP', field: 'toolLife', value: estimatedLife,
                      message: `Estimate ${ratio.toFixed(1)}x higher than historical avg`,
                      severity: 'WARN'});
    }
    if (ratio < 0.1) {
      anomalies.push({type: 'ANO-TMP', field: 'toolLife', value: estimatedLife,
                      message: `Estimate ${ratio.toFixed(1)}x lower than historical avg`,
                      severity: 'WARN'});
    }
  }
  
  // Material-specific check (RELATIONAL)
  const expectedRange = getExpectedToolLife(material, params);
  if (estimatedLife > expectedRange.max * 2) {
    anomalies.push({type: 'ANO-REL', field: 'toolLife', value: estimatedLife,
                    message: 'Tool life higher than expected for this material',
                    severity: 'WARN'});
  }
  
  return anomalies;
}
```

## 5. Material Property Range Validation

```javascript
function checkMaterialProperties(material) {
  const anomalies = [];
  const props = material.properties;
  
  // PHYSICAL LIMITS - These are laws of physics
  const physicalLimits = {
    density: { min: 0.5, max: 25 },        // g/cm³ (H to Os)
    hardness_hrc: { min: 0, max: 72 },     // HRC scale
    hardness_hb: { min: 10, max: 750 },    // Brinell
    tensile_strength: { min: 1, max: 4000 }, // MPa
    yield_strength: { min: 1, max: 3500 },   // MPa
    elongation: { min: 0, max: 100 },        // %
    thermal_conductivity: { min: 0.01, max: 500 }, // W/m·K
    specific_heat: { min: 100, max: 5000 },  // J/kg·K
    melting_point: { min: -40, max: 4000 },  // °C
  };
  
  for (const [prop, limits] of Object.entries(physicalLimits)) {
    if (props[prop] !== undefined) {
      if (props[prop] < limits.min || props[prop] > limits.max) {
        anomalies.push({
          type: 'ANO-PHY',
          field: prop,
          value: props[prop],
          message: `${prop} = ${props[prop]} outside physical limits [${limits.min}, ${limits.max}]`,
          severity: 'BLOCK'
        });
      }
    }
  }
  
  // RELATIONAL checks
  if (props.yield_strength > props.tensile_strength) {
    anomalies.push({type: 'ANO-REL', field: 'strength',
                    message: 'Yield strength cannot exceed tensile strength',
                    severity: 'BLOCK'});
  }
  
  // Machinability sanity (RANGE)
  if (props.machinability_rating) {
    if (props.machinability_rating < 1 || props.machinability_rating > 300) {
      anomalies.push({type: 'ANO-RNG', field: 'machinability',
                      value: props.machinability_rating,
                      message: 'Machinability rating outside expected range',
                      severity: 'WARN'});
    }
  }
  
  return anomalies;
}
```

## 6. Machine Capability Limit Checks

```javascript
function checkMachineCapability(machine, operation) {
  const anomalies = [];
  
  // Spindle speed limits
  if (operation.speed > machine.spindle.maxRPM) {
    anomalies.push({type: 'ANO-RNG', field: 'speed',
                    value: operation.speed,
                    message: `Speed ${operation.speed} exceeds machine max ${machine.spindle.maxRPM}`,
                    severity: 'BLOCK'});
  }
  if (operation.speed < machine.spindle.minRPM && operation.speed > 0) {
    anomalies.push({type: 'ANO-RNG', field: 'speed',
                    value: operation.speed,
                    message: `Speed ${operation.speed} below machine min ${machine.spindle.minRPM}`,
                    severity: 'CRITICAL'});
  }
  
  // Feed rate limits
  if (operation.feedRate > machine.axes.maxFeedRate) {
    anomalies.push({type: 'ANO-RNG', field: 'feedRate',
                    value: operation.feedRate,
                    message: `Feed ${operation.feedRate} exceeds machine max ${machine.axes.maxFeedRate}`,
                    severity: 'BLOCK'});
  }
  
  // Power check
  const requiredPower = estimatePowerRequired(operation);
  if (requiredPower > machine.spindle.power * 0.9) {
    anomalies.push({type: 'ANO-CMB', field: 'power',
                    value: requiredPower,
                    message: `Required power ${requiredPower}kW near machine limit ${machine.spindle.power}kW`,
                    severity: 'WARN'});
  }
  if (requiredPower > machine.spindle.power) {
    anomalies.push({type: 'ANO-CMB', field: 'power',
                    value: requiredPower,
                    message: `Required power ${requiredPower}kW exceeds machine ${machine.spindle.power}kW`,
                    severity: 'CRITICAL'});
  }
  
  // Work envelope check
  if (!isWithinEnvelope(operation.toolpath, machine.workEnvelope)) {
    anomalies.push({type: 'ANO-RNG', field: 'envelope',
                    message: 'Toolpath exceeds machine work envelope',
                    severity: 'BLOCK'});
  }
  
  return anomalies;
}
```

---

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

---

# D(x) COMPUTATION FORMULA

## Main Computation

```javascript
function computeDx(anomalyResults) {
  // Start with perfect score
  let Dx = 1.0;
  
  // Severity penalties
  const penalties = {
    'INFO': 0.02,
    'WARN': 0.10,
    'CRITICAL': 0.30,
    'BLOCK': 1.00  // Instant zero
  };
  
  // Type weights (some anomalies more dangerous)
  const typeWeights = {
    'ANO-PHY': 2.0,   // Physical impossibility is worst
    'ANO-RNG': 1.5,   // Range violations are serious
    'ANO-CMB': 1.3,   // Combinations are sneaky
    'ANO-REL': 1.2,   // Relational issues matter
    'ANO-STA': 1.0,   // Statistical outliers
    'ANO-TMP': 0.8,   // Temporal may be valid change
    'ANO-MIS': 1.4,   // Missing data is dangerous
  };
  
  for (const anomaly of anomalyResults) {
    const basePenalty = penalties[anomaly.severity] || 0;
    const weight = typeWeights[anomaly.type] || 1.0;
    const penalty = basePenalty * weight;
    
    Dx -= penalty;
    
    // Immediate block for BLOCK severity
    if (anomaly.severity === 'BLOCK') {
      return 0.0;
    }
  }
  
  // Ensure bounds
  return Math.max(0, Math.min(1, Dx));
}
```

## Integration with S(x)

```javascript
function integrateDxWithSafety(Dx, Sx_base) {
  // D(x) acts as a multiplier on safety score
  // If D(x) = 1.0 (no anomalies), S(x) unchanged
  // If D(x) < 0.30 (critical anomalies), S(x) = 0 (BLOCK)
  
  if (Dx < 0.30) {
    return 0.0; // HARD BLOCK
  }
  
  // Otherwise, D(x) reduces S(x) proportionally
  const Sx_adjusted = Sx_base * Dx;
  
  return Sx_adjusted;
}
```

## Full D(x) Pipeline

```javascript
async function runAnomalyDetection(input, context) {
  const allAnomalies = [];
  
  // ANOM-001: Check input data ranges
  if (input.speeds) allAnomalies.push(...checkSpeedFeed(input.speeds, input.feeds, context.material, context.tool, context.operation));
  if (input.forces) allAnomalies.push(...checkForceCalculation(input.forces.Fc, input.forces.Ff, input.forces.Fp, context.material, input.params));
  if (input.temperature) allAnomalies.push(...checkTemperature(input.temperature, context.material, context.tool, context.coolant));
  if (input.toolLife) allAnomalies.push(...checkToolLife(input.toolLife, context.material, input.params, context.historical));
  if (context.material) allAnomalies.push(...checkMaterialProperties(context.material));
  if (context.machine) allAnomalies.push(...checkMachineCapability(context.machine, input.operation));
  
  // ANOM-002: Statistical analysis
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'number' && context.historical?.[key]) {
      const zResult = zScoreAnalysis(value, context.historical[key]);
      if (zResult.isAnomaly) {
        allAnomalies.push({
          type: 'ANO-STA',
          field: key,
          value: value,
          message: `Statistical outlier: Z-score = ${zResult.zScore.toFixed(2)}`,
          severity: zResult.severity
        });
      }
    }
  }
  
  // ANOM-003: Final safety check
  const Dx = computeDx(allAnomalies);
  
  return {
    anomalies: allAnomalies,
    D_x: Dx,
    blocked: Dx < 0.30,
    summary: generateAnomalySummary(allAnomalies, Dx)
  };
}
```

---

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

---

# EXAMPLE SCENARIOS

## Scenario 1: Speed/Feed Anomaly Caught

```
INPUT:
- Material: Titanium Ti-6Al-4V
- Tool: Carbide end mill, 4 flute, 12mm
- Speed requested: 15,000 RPM
- Feed requested: 2000 mm/min

ANOM-001 FIRES:
- Checks speed against titanium limits (max ~2000 RPM for carbide)
- ANOMALY DETECTED: Speed 7.5x above safe limit

ANOM-002 FIRES:
- Historical average for this combo: 800-1500 RPM
- Z-score: 12.4 (extreme outlier)
- Severity: CRITICAL

ANOM-003 FIRES:
- Physical limit check: Speed technically possible but...
- Machine capability: Machine can do 15K but not with titanium
- Combined check: This will destroy tool and possibly injure operator

RESULT:
- D(x) = 0.05 (near zero due to ANO-RNG + ANO-CMB + ANO-REL)
- S(x) = 0 (HARD BLOCK triggered)
- OUTPUT BLOCKED
- Message: "Speed 15,000 RPM is dangerous for Titanium. 
           Maximum recommended: 2,000 RPM. 
           Potential consequences: Tool explosion, operator injury."
```

## Scenario 2: Subtle Combination Anomaly

```
INPUT:
- Material: Aluminum 6061-T6
- Operation: Deep pocket (depth 50mm, diameter 20mm)
- Speed: 8000 RPM (OK for aluminum)
- Feed: 1500 mm/min (OK for aluminum)
- Tool: 20mm end mill (OK)
- Depth of cut: 50mm (full depth in one pass)

ANOM-001 FIRES:
- Speed: OK ✓
- Feed: OK ✓
- Tool diameter: OK ✓

ANOM-002 FIRES:
- Combination check triggered
- 50mm depth with 20mm tool = 2.5x tool diameter engagement
- Historical patterns: Usually max 1x tool diameter per pass
- ANOMALY: ANO-CMB detected

ANOM-003 FIRES:
- Force calculation: Cutting force will be 3x normal
- Deflection check: Tool will deflect significantly
- Chatter risk: Very high
- Severity: CRITICAL

RESULT:
- D(x) = 0.42
- S(x) = 0.65 × 0.42 = 0.27 (below 0.70 threshold)
- OUTPUT BLOCKED
- Message: "Full depth pass (50mm) risks tool breakage and poor finish.
           Recommend: 3 passes at 17mm depth each."
```

## Scenario 3: Missing Critical Data

```
INPUT:
- Material: Custom alloy (user-defined)
- Missing: thermal_conductivity, specific_heat
- Operation: High-speed machining

ANOM-001 FIRES:
- Property check: thermal_conductivity = undefined
- Property check: specific_heat = undefined
- ANOMALY: ANO-MIS × 2

ANOM-003 FIRES:
- High-speed machining requires thermal properties
- Without them, cannot calculate safe speed
- Cannot estimate tool temperature
- Severity: CRITICAL for HSM operation

RESULT:
- D(x) = 0.35 (missing critical data)
- Message: "Cannot safely calculate HSM parameters without 
           thermal_conductivity and specific_heat.
           Please provide these values or use conservative parameters."
```

---

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

---

# ANTI-REGRESSION VERIFICATION

## MS-1 Checklist: All 20 Items Complete

- [x] 1. Create skill directory structure
- [x] 2. Write skill header (purpose, level, triggers)
- [x] 3. Define ANOM-001 hook (data:received → check ranges)
- [x] 4. Define ANOM-002 hook (pattern:unusual → flag for review)
- [x] 5. Define ANOM-003 hook (safety:check → validate against limits)
- [x] 6. Create anomaly taxonomy (7 types)
- [x] 7. Define severity levels (5 levels)
- [x] 8. Create manufacturing-specific anomaly rules
- [x] 9. Speed/feed boundary checking algorithm
- [x] 10. Force calculation sanity checks
- [x] 11. Temperature limit validation
- [x] 12. Tool life estimation bounds
- [x] 13. Material property range validation
- [x] 14. Machine capability limit checks
- [x] 15. Statistical outlier detection (Z-score, IQR)
- [x] 16. Historical pattern deviation detection
- [x] 17. D(x) computation formula
- [x] 18. Integration with S(x) safety framework
- [x] 19. Example anomaly detection scenarios (3 scenarios)
- [x] 20. Anti-regression verification

---

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**LIVES DEPEND ON CATCHING ANOMALIES BEFORE OUTPUT.**
**prism-anomaly-detector v1.0.0 | Cognitive Level 1 | D(x) Provider**
