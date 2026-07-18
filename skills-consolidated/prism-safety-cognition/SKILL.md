---
name: prism-safety-cognition
description: |
  Safety-focused cognitive patterns: anomaly detection and causal reasoning
  for manufacturing intelligence. Catches dangerous values before output.
  Consolidates: anomaly-detector, causal-reasoning.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "safety", "cognition", "focused", "cognitive", "patterns", "anomaly", "detection"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-safety-cognition")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-safety-cognition") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What safety parameters for 316 stainless?"
→ Load skill: skill_content("prism-safety-cognition") → Extract relevant safety data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot cognition issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Safety Cognition
## Anomaly Detection + Causal Reasoning for Manufacturing Safety

## 1. ANOMALY DETECTION

### Physical Bounds (Hard Limits)
| Parameter | Min | Max | Unit | If Exceeded |
|-----------|-----|-----|------|-------------|
| Cutting speed | 1 | 2000 | m/min | BLOCK output |
| Feed rate | 0.001 | 10 | mm/rev | BLOCK output |
| Depth of cut | 0.01 | 50 | mm | BLOCK output |
| Cutting force | 1 | 100000 | N | BLOCK output |
| Temperature | 20 | 1500 | °C | BLOCK output |
| Surface finish | 0.01 | 100 | μm Ra | WARN |
| Power | 0.01 | 500 | kW | BLOCK output |
| Torque | 0.01 | 5000 | Nm | BLOCK output |
| MRR | 0.1 | 5000 | cm³/min | WARN |

### Statistical Anomaly Detection
- **Z-score:** |z| > 3.0 = anomaly (for normally distributed parameters)
- **IQR method:** value < Q1-1.5×IQR or > Q3+1.5×IQR = outlier
- **Trend detection:** 3+ consecutive values moving in same direction beyond 2σ

### Multi-Parameter Consistency
Cross-check related parameters:
- Power ≈ Fc × Vc / 60000 (±15% tolerance)
- Torque ≈ Power × 9549 / RPM (±10% tolerance)
- MRR ≈ ap × ae × Vf (±5% tolerance)
- If any cross-check fails: FLAG and recalculate from first principles

### Detection Protocol
```
1. Check hard bounds → BLOCK if violated
2. Check statistical bounds → WARN if outlier
3. Cross-check consistency → FLAG if inconsistent
4. Compare to historical → NOTE if unusual but valid
5. Log all anomalies to prism_guard→error_capture
```

## 2. CAUSAL REASONING

### Manufacturing Causal Chains

**Speed → Temperature → Tool Life:**
```
↑ Cutting speed (Vc)
  → ↑ Cutting temperature (Taylor/Merchant)
    → ↑ Tool wear rate (Arrhenius-type)
      → ↓ Tool life (Taylor equation: VT^n = C)
        → ↑ Tool change frequency
          → ↑ Cost per part + ↓ Productivity
```

**Feed → Force → Deflection:**
```
↑ Feed per tooth (fz)
  → ↑ Chip thickness (h = fz × sin(κ))
    → ↑ Cutting force (Kienzle: Fc = kc1.1 × b × h^(1-mc))
      → ↑ Tool deflection (δ = FL³/3EI)
        → ↓ Dimensional accuracy
          → ↑ Scrap rate
```

**Depth → Stability → Chatter:**
```
↑ Axial depth (ap)
  → ↑ Force in stability-critical direction
    → Approach stability lobe boundary
      → IF beyond limit: chatter onset
        → ↓ Surface finish (dramatically)
        → ↑ Tool damage risk
        → ↑ Noise (operator safety)
```

### Causal Reasoning Rules
1. **Never confuse correlation with causation.** Two parameters trending together ≠ one causes the other.
2. **Identify the mechanism.** Physics must explain the causal link.
3. **Check for confounders.** Temperature affects both speed and tool life — is it the mediator or a confounder?
4. **Direction matters.** ↑speed → ↑temp is causal. ↑temp → ↑speed is not (usually).
5. **Quantify the relationship.** Not just "more speed = less life" but "2× speed ≈ (1/2^(1/n))× life."

### Root Cause Analysis Framework
When a problem occurs:
```
1. OBSERVE: What symptom? (chatter, poor finish, tool breakage, dimensional error)
2. MEASURE: Quantify the deviation from expected
3. HYPOTHESIZE: List possible root causes (use causal chains above)
4. TEST: Which cause explains ALL symptoms? (not just one)
5. VERIFY: Does fixing the root cause eliminate the symptom?
6. PREVENT: What monitoring/limits prevent recurrence?
```

### Causal Inference in Parameter Optimization
When changing parameters:
- Change ONE variable at a time (controlled experiment)
- Hold all others constant
- Measure the specific output of interest
- Repeat 3+ times for statistical confidence
- THEN reason about multi-variable interactions

## Integration
- Anomaly hooks: `calc:postCalc`, `safety:preOutput`, `output:preBlock`
- Causal hooks: `calc:preCalc` (verify input causality), `debug:rootCause`
- Both feed into `prism_guard→error_capture` for pattern learning
