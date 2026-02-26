

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "high", "reliability"
- Safety validation required, collision risk assessment, or safe parameter verification needed.
- 

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-high-reliability")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_safety→[relevant_check] for safety validation
   - prism_skill_script→skill_content(id="prism-high-reliability") for safety reference
   - prism_validate→safety for S(x)≥0.70 gate

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Safety criteria, validation rules, and threshold values
- **Failure**: S(x)<0.70 → operation BLOCKED, must resolve before proceeding

### Examples
**Example 1**: Pre-operation safety check needed
→ Load skill → Run safety criteria against current parameters → Return S(x) score → BLOCK if <0.70

**Example 2**: User overriding recommended limits
→ Load skill → Flag risk factors → Require explicit acknowledgment → Log override decision

# PRISM High-Reliability Protocols
## Λ(x) Formal Logic + Φ(x) Factual Verification

### Overview
Safety-critical validation for manufacturing calculations and factual claims.
- **Λ(x)**: Lambda Protocol - Formal logic proof validation
- **Φ(x)**: Phi Protocol - Factual claim verification

### Lambda Protocol Λ(x)

#### Purpose
Validates safety-critical calculations using formal logic proofs.

#### Auto-Fire Triggers
- All `calc_*` tools
- All `prism_*_calc` tools
- Safety-critical operations

#### Validation Rules
```
INPUT RANGES:
- cutting_speed: [1-2000] m/min
- feed_per_tooth: [0.001-2] mm
- axial_depth: [0.01-100] mm
- tool_diameter: [0.1-500] mm

OUTPUT VALIDITY:
- cutting_force > 0 (physics constraint)
- power > 0 and < 100kW (machine limit)
- tool_life > 0 (logical constraint)
```

#### Λ Score Computation
```
Start: Λ = 1.0
Penalties:
  - Range violation: -0.3
  - Physics violation: -0.5
  - Limit warning: -0.1

Threshold: Λ ≥ 0.90 = VALID
```

### Phi Protocol Φ(x)

#### Purpose
Verifies factual claims from web searches and external sources.

#### Auto-Fire Triggers
- `web_search` results
- `web_fetch` content
- Any text with claim indicators

#### Claim Indicators
- "studies show", "research indicates"
- "according to", "data shows"
- "evidence suggests", "proven that"
- "experts agree", "established that"

#### Φ Score Computation
```
Base: Φ = 0.70 (web content)
Adjustments:
  - Multiple claims (>3): -0.10
  - Hedging language: -0.05
  - Single authoritative source: +0.15

Verdicts:
  Φ ≥ 0.85: VERIFIED
  Φ ≥ 0.60: LIKELY
  Φ ≥ 0.40: UNCERTAIN
  Φ < 0.40: UNVERIFIED
```

### Tools

| Tool | Purpose |
|------|---------|
| `proof_validate` | Run Λ(x) on calculation |
| `fact_verify` | Run Φ(x) on claims |
| `get_inference_rules` | List proof rules |
| `get_source_tiers` | List source quality tiers |

### Integration
- Location: `C:\PRISM\mcp-server\src\tools\intelligence\high_reliability.py`
- Auto-hooks: `autoHookWrapper.ts` fires Λ/Φ automatically
- Hard block: Λ < 0.5 attaches `_safety_warning` to result
