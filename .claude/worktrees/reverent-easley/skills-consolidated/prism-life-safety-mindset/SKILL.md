---
name: prism-life-safety-mindset
description: |
  Critical mindset skill enforcing maximum thoroughness in all PRISM work.
  Manufacturing intelligence directly controls machines that can injure or kill.
  Every incomplete task, placeholder, or shortcut is a potential failure point.
  This skill provides mandatory checkpoints ensuring work is done to mathematical
  and statistical fullness, not just "good enough."
---

# PRISM Life-Safety Mindset
## Every Task Can Save Lives or End Them

---

## THE REALITY

PRISM generates:
- **Speeds and feeds** → Wrong values = tool explosion, fire, operator injury
- **Toolpath parameters** → Incomplete data = machine crash, workpiece ejection
- **Material properties** → Missing thermal data = uncontrolled heat, fire
- **Force calculations** → Underestimated forces = fixture failure, flying debris
- **Tool life predictions** → Optimistic estimates = mid-cut failure, scrap, crash

**A machinist trusts this software with their safety.**

When you leave a placeholder, skip a validation, or take a shortcut:
- You're not cutting corners on code
- You're gambling with someone's hands, eyes, or life

---

## THE STANDARD

> **"What you're doing can either save people or kill them. The outcome is dependent on how thorough you complete a task. Any shortcut, incomplete, placeholder, and non-maximized task session can kill someone. Put in extra effort always to make sure the task is done to the mathematical/statistical fullest."**

This is not perfectionism. This is engineering ethics.

---

## MANDATORY CHECKPOINTS

### Before Starting Any Task

```
□ Do I fully understand what this data controls?
□ What physical outcome depends on this being correct?
□ What happens if this value is wrong by 10%? 50%? 10x?
□ Who will trust this output without questioning it?
```

### During Execution

```
□ Am I using ALL available data sources?
□ Am I cross-referencing against physics constraints?
□ Am I capturing uncertainty, not hiding it?
□ Would I bet my own safety on this output?
```

### Before Marking Complete

```
□ Is every field populated with real data (not placeholders)?
□ Have I validated against at least 2 independent sources?
□ Are edge cases handled, not ignored?
□ Does the output include appropriate warnings/limits?
□ Would a master machinist with 40 years experience approve this?
```

---

## FORBIDDEN PATTERNS

### Never Do These

| Pattern | Why It Kills |
|---------|--------------|
| `// TODO: add validation later` | Later never comes. Bad data ships. |
| `placeholder: true` | Placeholders get used in production |
| `return defaultValue` without warning | User thinks it's real data |
| Skip edge case handling | Edge cases happen in shops daily |
| "Close enough" rounding | Cumulative errors cause failures |
| Assume user will verify | Users trust the software |
| Leave empty optional fields | Missing data = missing safety margin |

### The Placeholder Death Spiral

```
Developer: "I'll add real data later"
    ↓
Code ships with placeholder
    ↓
Placeholder gets into production
    ↓
User trusts "manufacturer data"
    ↓
Machine runs with wrong parameters
    ↓
Tool failure at 15,000 RPM
    ↓
Carbide shrapnel
```

**Every placeholder is a loaded gun pointed at a machinist.**

---

## THOROUGHNESS METRICS

### Data Completeness Requirements

| Data Type | Minimum Completeness | Target |
|-----------|---------------------|--------|
| Material properties | 95% of 127 params | 100% |
| Tool specifications | 100% critical params | 100% |
| Machine capabilities | 100% safety limits | 100% |
| Force coefficients | All 6 Kienzle params | All + uncertainty |
| Thermal properties | All 4 minimum | All + temp ranges |

### Validation Requirements

| Output Type | Required Validations |
|-------------|---------------------|
| Speed/Feed | Physics check + historical comparison + limit check |
| Tool life | Taylor equation + empirical data + confidence interval |
| Force prediction | Kienzle + FEA correlation + safety factor |
| Thermal analysis | Energy balance + material limits + coolant effects |

---

## THE EXTRA EFFORT STANDARD

"Done" means:

1. **Mathematically Complete**
   - All formulas implemented with full derivation
   - No simplified approximations without documented error bounds
   - Uncertainty propagation through entire calculation chain

2. **Statistically Valid**
   - Sample sizes documented
   - Confidence intervals calculated
   - Outliers identified and handled appropriately

3. **Physically Constrained**
   - Outputs bounded by physics limits
   - Impossible values rejected with explanation
   - Warnings generated for unusual but possible values

4. **Cross-Referenced**
   - Multiple data sources consulted
   - Conflicts identified and resolved
   - Source hierarchy documented

5. **Failure-Aware**
   - What happens if input is wrong?
   - What happens if output is misapplied?
   - What warnings should accompany this data?

---

## PRACTICAL APPLICATION

### Example: Adding a New Material

**Insufficient (DANGEROUS):**
```javascript
{
  name: "Inconel 718",
  hardness: 40, // HRC, approximately
  // TODO: add thermal properties
  feedFactor: 0.5 // guess based on similar materials
}
```

**Thorough (SAFE):**
```javascript
{
  name: "Inconel 718",
  hardnessRange: { min: 36, max: 44, typical: 40, unit: "HRC" },
  hardnessCondition: "Solution treated and aged per AMS 5663",
  thermalConductivity: {
    value: 11.4,
    unit: "W/m·K",
    tempRange: { min: 20, max: 100, unit: "°C" },
    source: "ASM Metals Handbook Vol 2",
    uncertainty: "±5%"
  },
  machinabilityRating: {
    value: 12,
    reference: "AISI 1212 = 100",
    source: "Machining Data Handbook, 3rd Ed",
    notes: "Work hardening severe - avoid dwelling"
  },
  warnings: [
    "Extreme work hardening - maintain constant chip load",
    "High cutting forces - verify fixture rigidity",
    "Fire risk with fine chips - ensure coolant coverage"
  ],
  validatedBy: "Cross-referenced: ASM, Carpenter, Special Metals datasheets",
  lastVerified: "2026-01-24"
}
```

---

## INTEGRATION WITH PRISM WORKFLOW

### In Planning Phase
- Identify all safety-critical data touched by task
- List physical outcomes dependent on correctness
- Define validation criteria before starting

### In Execution Phase
- Validate continuously, not just at end
- Flag any uncertainty immediately
- Never suppress warnings for convenience

### In Review Phase
- Verify against life-safety checklist
- Confirm no placeholders escaped
- Document any remaining uncertainty with warnings

### In Handoff
- Explicitly list any incomplete safety-critical items
- Never mark safety-critical work as "done" if incomplete
- Transfer uncertainty documentation, not just data

---

## WHEN IN DOUBT

Ask these questions:

1. **"Would I run this on a machine I'm standing next to?"**
2. **"Would I let my family member operate with these parameters?"**
3. **"If this fails, can I explain why I thought it was safe?"**

If any answer is "no" or "I'm not sure":
- **STOP**
- **DOCUMENT** the uncertainty
- **ESCALATE** for review
- **DO NOT** mark as complete

---

## THE COMMITMENT

Every PRISM developer commits to:

> I will not ship data I wouldn't trust with my own safety.
> I will not leave placeholders in safety-critical paths.
> I will not skip validation because "it's probably fine."
> I will not prioritize speed over thoroughness.
> I will not assume someone else will catch my shortcuts.
>
> When I mark a task complete, I am certifying that I have done
> everything within my capability to ensure this data will not
> harm anyone who trusts it.

---

## SKILL INTEGRATION

This mindset applies to ALL other skills:

| Skill | Life-Safety Application |
|-------|------------------------|
| prism-extractor | Extract ALL data, not just convenient subset |
| prism-material-template | Populate ALL 127 params, flag gaps explicitly |
| prism-physics-formulas | Include full derivation + uncertainty |
| prism-validator | Validate against physics reality |
| prism-api-contracts | Return uncertainty with every calculation |
| prism-coding-patterns | No silent failures, no swallowed errors |
| prism-quality-gates | Safety-critical items have stricter gates |

---

## REMEMBER

- A 1% error in force calculation is a 1% chance of failure
- A placeholder is a 100% chance of wrong data
- "Good enough" is never good enough when safety is involved
- The extra hour you spend now saves someone's hands later

**Do the work. All of it. Every time.**

---

**Version 1.0 | Created 2026-01-24 | PRISM v9.0 Life-Safety Protocol**
