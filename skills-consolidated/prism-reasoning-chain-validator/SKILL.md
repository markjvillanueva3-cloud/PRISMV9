---
name: prism-reasoning-chain-validator
description: |
  Validates the reasoning chain itself, not just outputs. Catches logical fallacies,
  unsupported jumps, circular reasoning, and confirmation bias in manufacturing decisions.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "reasoning", "chain", "validator", "validates", "itself", "outputs", "catches", "logical"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-reasoning-chain-validator")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-reasoning-chain-validator") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What reasoning parameters for 316 stainless?"
→ Load skill: skill_content("prism-reasoning-chain-validator") → Extract relevant reasoning data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot chain issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Reasoning Chain Validator
## Validate HOW You Think, Not Just WHAT You Produce

## Why This Matters
Traditional validation checks outputs: "Is this number in range?"
Reasoning validation checks the chain: "Does this conclusion follow from these premises?"

In manufacturing: a plausible-looking cutting speed recommendation built on
flawed reasoning (wrong material assumption, incorrect formula application)
is MORE dangerous than an obviously wrong number — because it passes bounds checks.

## Validation Rules

### Rule 1: Every Claim Needs Evidence
```
VALID:   "Speed = 200 m/min (Taylor equation, n=0.25, C=300, T=15min)"
INVALID: "Speed should be around 200 m/min" (no justification)
```
**Check:** Does every numerical output trace back to a formula, table, or measurement?

### Rule 2: No Unsupported Jumps
```
VALID:   A → B → C → D (each step justified)
INVALID: A → D (skipped B, C — how did we get there?)
```
**Check:** Can each reasoning step be verified independently?

### Rule 3: No Circular Reasoning
```
INVALID: "Use HSM because it's faster" → "It's faster because we're using HSM"
VALID:   "Use HSM because MRR = 120 cm³/min vs. 80 cm³/min conventional (calculated)"
```
**Check:** Does the justification depend on the conclusion?

### Rule 4: Assumptions Made Explicit
```
VALID:   "Assuming dry machining, tool is sharp (new), machine is rigid"
INVALID: [proceeds with calculation without stating assumptions]
```
**Check:** Are all assumptions listed? Are they reasonable?

### Rule 5: Alternatives Genuinely Considered
```
VALID:   "Option A: 200 m/min (best tool life), Option B: 300 m/min (best MRR) → chose A because tool cost dominates"
INVALID: "200 m/min is the right answer" (no alternatives explored)
```
**Check:** Were at least 2 approaches evaluated with trade-offs?

### Rule 6: Uncertainty Propagated
```
VALID:   "Force = 800 ±120N (kc1.1 uncertainty ±10%, chip thickness ±5%)"
INVALID: "Force = 800N" (false precision)
```
**Check:** Do outputs include uncertainty ranges?

## Validation Protocol
```
For each reasoning chain:
1. Extract all claims (statements presented as fact)
2. For each claim: find supporting evidence (formula, data, reference)
3. For each step: verify logical connection to previous step
4. Check for: circular reasoning, confirmation bias, anchoring bias
5. Verify: assumptions explicit, alternatives considered, uncertainty stated
6. Score: reasoning_validity = valid_steps / total_steps
7. Gate: reasoning_validity ≥ 0.85 or flag for review
```

## Common Reasoning Failures in Manufacturing
| Failure | Example | Fix |
|---------|---------|-----|
| Anchoring | "Last time we used 200 m/min, so use 200" | Calculate from scratch |
| Confirmation bias | Only checking sources that agree | Seek disconfirming evidence |
| Authority bias | "The handbook says..." without checking conditions match | Verify applicability |
| Precision illusion | Reporting 6 decimal places from ±10% input | Propagate uncertainty |
| Survivorship bias | "This speed worked before" (ignoring times it didn't) | Consider full history |
