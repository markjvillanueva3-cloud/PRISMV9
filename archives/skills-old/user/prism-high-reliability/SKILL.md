# PRISM High-Reliability Protocols Skill
## Λ(x) Formal Logic Proofs + Φ(x) Factual Claim Verification

---

## TRIGGER PATTERNS
Use this skill when:
- "verify this proof", "validate logic", "formal verification"
- "fact check", "verify claim", "source verification"
- Working with safety-critical calculations
- Reviewing factual statements from web search
- Need mathematical certainty about claims

---

## PROTOCOL OVERVIEW

### Λ(x) - Lambda Protocol (Formal Logic)
Validates logical proofs using inference rules.
- **Auto-fires on:** `calc_*` tools, `prism_cutting_force`, `prism_tool_life`, `prism_speed_feed`
- **Returns:** validity score 0-1, detected issues

### Φ(x) - Phi Protocol (Factual Claims)
Verifies factual claims using source tiers and Bayesian updating.
- **Auto-fires on:** `web_search`, `web_fetch` results with claim indicators
- **Returns:** confidence score, source quality, caveats

---

## TOOL REFERENCE

### proof_validate(proof_lines)
```python
# Validates a formal logic proof
proof = [
    {"statement": "P → Q", "rule": "Premise"},
    {"statement": "P", "rule": "Premise"},
    {"statement": "Q", "rule": "→E", "refs": [1, 2]}
]
result = proof_validate(proof)
# Returns: {is_valid: True, validity_score: 1.0, conclusion: "Q", issues: []}
```

### fact_verify(claim, sources, prior?)
```python
# Verifies a factual claim with sources
sources = [
    {"name": "Nature Journal", "tier": 1, "date": "2024-01"},
    {"name": "Wikipedia", "tier": 3}
]
result = fact_verify("Water boils at 100°C at sea level", sources, 0.7)
# Returns: {verdict: "VERIFIED", confidence: 0.83, phi_score: 0.84}
```

### get_inference_rules()
```python
# Returns all 20 valid inference rules
rules = get_inference_rules()
# {'∧I': 'Conjunction Introduction', '→E': 'Modus Ponens', ...}
```

### get_source_tiers()
```python
# Returns source tier definitions
tiers = get_source_tiers()
# {
#   "TIER_1": "Primary: peer-reviewed journals, official data",
#   "TIER_2": "Authoritative secondary: major reviews, encyclopedias",
#   "TIER_3": "General secondary: Wikipedia, aggregators",
#   "TIER_4": "Use with caution: blogs, social media"
# }
```

---

## INFERENCE RULES (20)

### Introduction Rules
| Rule | Name | Pattern |
|------|------|---------|
| ∧I | Conjunction Intro | P, Q ⊢ P ∧ Q |
| ∨I | Disjunction Intro | P ⊢ P ∨ Q |
| →I | Implication Intro | Assume P... derive Q ⊢ P → Q |
| ↔I | Biconditional Intro | P → Q, Q → P ⊢ P ↔ Q |
| ∀I | Universal Intro | P(a) for arbitrary a ⊢ ∀x P(x) |
| ∃I | Existential Intro | P(a) ⊢ ∃x P(x) |

### Elimination Rules
| Rule | Name | Pattern |
|------|------|---------|
| ∧E | Conjunction Elim | P ∧ Q ⊢ P (or Q) |
| ∨E | Disjunction Elim | P ∨ Q, P → R, Q → R ⊢ R |
| →E | Modus Ponens | P → Q, P ⊢ Q |
| ↔E | Biconditional Elim | P ↔ Q, P ⊢ Q |
| ∀E | Universal Elim | ∀x P(x) ⊢ P(a) |
| ∃E | Existential Elim | ∃x P(x), P(a) → Q ⊢ Q |
| ¬E | Double Negation | ¬¬P ⊢ P |

### Special Rules
| Rule | Name | Pattern |
|------|------|---------|
| MT | Modus Tollens | P → Q, ¬Q ⊢ ¬P |
| HS | Hypothetical Syllogism | P → Q, Q → R ⊢ P → R |
| DS | Disjunctive Syllogism | P ∨ Q, ¬P ⊢ Q |
| RAA | Reductio | Assume P... derive ⊥ ⊢ ¬P |
| Premise | Premise | Given |
| Assumption | Assumption | For subproof |
| Reit | Reiteration | P ⊢ P |

---

## SOURCE TIER HIERARCHY

| Tier | Category | Examples | Weight |
|------|----------|----------|--------|
| **1** | Primary | Peer-reviewed journals, official gov data, original documents | 1.0 |
| **2** | Authoritative | Major reviews, encyclopedias, established news | 0.75 |
| **3** | General | Wikipedia, aggregators, general reference | 0.5 |
| **4** | Caution | Blogs, social media, partisan sources | 0.25 |

---

## AUTO-FIRE BEHAVIOR

### Safety Calculations (Λ)
```python
# When any calc_* tool executes:
# 1. Build proof structure from inputs/outputs
# 2. Validate safety assertions
# 3. Log Λ(x) score
```

### Factual Claims (Φ)
```python
# When web_search/web_fetch returns:
# 1. Scan for claim indicators
#    - "studies show", "research indicates", "according to"
#    - "data shows", "evidence suggests", "proven that"
# 2. Extract up to 3 claims
# 3. Auto-verify each with available sources
```

---

## THRESHOLDS

| Metric | Threshold | Action |
|--------|-----------|--------|
| Λ(x) validity | ≥ 0.90 | VALID proof |
| Λ(x) validity | < 0.90 | Review issues |
| Φ(x) confidence | ≥ 0.85 | HIGH RELIABILITY |
| Φ(x) confidence | 0.60-0.84 | MODERATE - add caveats |
| Φ(x) confidence | < 0.60 | LOW - flag uncertainty |

---

## BEST PRACTICES

### 1. Always Cite Tier 1/2 Sources for Critical Claims
```python
# GOOD: "Studies in Nature show X" + verify
# BAD: "Someone said X online"
```

### 2. Use Formal Proofs for Safety Calculations
```python
# Build explicit proof chain:
# Premise: Inputs validated
# Premise: Formula F-KIENZLE-001 applied
# Conclusion: Force within safe limits
```

### 3. Add Caveats for Low-Confidence Claims
```python
if result["phi_score"] < 0.85:
    response += "\n(Note: Limited source verification available)"
```

---

## FILE LOCATIONS
```
Implementation: C:\PRISM\mcp-server\src\tools\intelligence\high_reliability.py (492 lines)
Auto-Fire:      C:\PRISM\mcp-server\src\tools\intelligence\auto_hooks.py
Integration:    C:\PRISM\mcp-server\src\tools\intelligence\__init__.py
```

---

**Version:** 1.0.0
**Tools:** 4
**Auto-Fire:** calc_*, web_search, web_fetch
**Category:** Quality Assurance
