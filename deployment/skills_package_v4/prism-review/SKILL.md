---
name: prism-review
description: |
  Code and module review skill adapted from obra/superpowers for PRISM quality control.
  Use when: reviewing extracted modules, checking material databases, validating
  architecture decisions, or doing pre-merge checks. Provides structured review
  process for consistent quality. Triggers: module extraction complete, database
  ready for use, architecture review, pre-merge check, quality audit.
---

# PRISM REVIEW SKILL v1.0
## Structured Review for Manufacturing Intelligence
### Adapted from obra/superpowers for PRISM quality control

---

## CORE PRINCIPLE

**REVIEW CATCHES WHAT VERIFICATION MISSES.**

Verification checks for correctness. Review checks for quality:
- Is this the RIGHT solution?
- Is this MAINTAINABLE?
- Does this follow PRISM principles?
- Will this scale?
- Are there better alternatives?

---

## 📋 REVIEW PROTOCOL

### Review Types

| Type | Scope | When | Time |
|------|-------|------|------|
| Quick | Single item | After creation | 2-5 min |
| Standard | Module/file | After extraction | 10-20 min |
| Deep | Architecture | Major decisions | 30-60 min |
| Audit | Full system | Periodically | 1-2 hours |

---

## QUICK REVIEW CHECKLIST

For individual items (materials, functions, entries):

```markdown
## QUICK REVIEW: [ITEM]

☐ Correct? Does it work as intended?
☐ Complete? All required parts present?
☐ Consistent? Follows existing patterns?
☐ Clear? Understandable without explanation?
☐ Clean? No obvious improvements needed?

Result: APPROVE / REQUEST CHANGES
```

---

## STANDARD REVIEW CHECKLIST

For modules and files:

```markdown
## STANDARD REVIEW: [MODULE/FILE]

### Correctness
☐ Functions work as documented
☐ Data is accurate
☐ Edge cases handled
☐ Error handling present

### Completeness
☐ All functions extracted/implemented
☐ All data present
☐ Dependencies documented
☐ Consumers identified (min 6)

### Consistency
☐ Naming follows conventions
☐ Structure matches similar modules
☐ API consistent with peers

### Clarity
☐ Code is readable
☐ Comments explain "why"
☐ Complex logic documented

### 10 Commandments Alignment
☐ 1. Used everywhere? (consumers wired)
☐ 2. Fuses concepts? (cross-domain integration)
☐ 3. Verified? (validation present)
☐ 4. Learns? (feeds ML pipeline)
☐ 5. Uncertainty? (confidence intervals)
☐ 6. Explainable? (XAI ready)
☐ 7. Fails gracefully? (fallbacks present)
☐ 8. Protected? (validation, sanitization)
☐ 9. Performs? (<500ms calculations)
☐ 10. User-focused? (good defaults)

### Issues Found
| # | Severity | Description | Recommendation |
|---|----------|-------------|----------------|
|   |          |             |                |

Result: APPROVE / REQUEST CHANGES / MAJOR REWORK
```

---

## DEEP REVIEW CHECKLIST

For architectural decisions:

```markdown
## DEEP REVIEW: [DECISION/COMPONENT]

### Problem Understanding
☐ Problem clearly defined
☐ Requirements documented
☐ Constraints identified
☐ Success criteria measurable

### Solution Evaluation
☐ Multiple options considered
☐ Tradeoffs documented
☐ Best option selected with rationale
☐ Risks identified and mitigated

### Technical Quality
☐ Design is sound
☐ Implementation is feasible
☐ Scalability considered
☐ Maintainability considered
☐ Performance requirements met

### Integration
☐ Fits with existing architecture
☐ No breaking changes
☐ Migration path clear (if needed)
☐ Documentation complete

### Future Considerations
☐ Extensible for future needs
☐ Technical debt acceptable
☐ Learning curve reasonable
☐ Team can maintain

### 10 Commandments Deep Check
☐ Every component used to maximum?
☐ Cross-domain concepts fused?
☐ Validation at every level?
☐ Learning feedback loops?
☐ Uncertainty quantified?
☐ Decisions explainable?
☐ Graceful degradation?
☐ Security hardened?
☐ Performance optimized?
☐ User experience prioritized?

Result: APPROVE / CONDITIONAL / REJECT
```

---

## PRISM-SPECIFIC REVIEW CRITERIA

### Material Database Review

```markdown
## MATERIAL DATABASE REVIEW

### Data Quality
☐ Sources cited (ASM, Machining Handbook)
☐ Values in realistic ranges
☐ No copy-paste errors
☐ Consistent units

### Parameter Coverage
☐ All 127 parameters defined
☐ Cutting parameters complete
☐ Thermal properties complete
☐ Statistical metadata present

### Usability
☐ Clear material categorization
☐ Searchable by multiple criteria
☐ Compatible with all consumers

### Extensibility
☐ Easy to add new materials
☐ Easy to update parameters
☐ Hierarchy layers supported
```

### Module Extraction Review

```markdown
## MODULE EXTRACTION REVIEW

### Extraction Quality
☐ All code captured
☐ No dependencies left behind
☐ Clean boundaries

### Functionality
☐ All functions work
☐ All data accessible
☐ API documented

### Integration
☐ Consumer list complete (min 6)
☐ Gateway routes defined
☐ Event bus integrated

### Migration Ready
☐ Can be imported to new architecture
☐ No circular dependencies
☐ Version documented
```

### Consumer Wiring Review

```markdown
## CONSUMER WIRING REVIEW

### Coverage
☐ Minimum 6 consumers per database
☐ All data fields used somewhere
☐ No orphan data

### Implementation
☐ Routes correctly defined
☐ Data transforms correct
☐ Error handling present

### Performance
☐ No N+1 query issues
☐ Caching appropriate
☐ Async where needed
```

---

## REVIEW COMMENTS BEST PRACTICES

### Good Comments

```
✓ "This kc1_1 value (2847) seems high for this material family. 
   Similar steels typically range 1800-2200. Source?"

✓ "Consider extracting this repeated pattern into a helper function."

✓ "The fallback here returns undefined. Should return a default value 
   per Commandment 7."
```

### Bad Comments

```
✗ "This is wrong." (No explanation)
✗ "Fix this." (No guidance)
✗ "I would do it differently." (Subjective, no criteria)
```

---

## REVIEW WORKFLOW

### Before Review

```
1. Understand what you're reviewing
2. Know the acceptance criteria
3. Have reference materials ready
4. Set aside adequate time
```

### During Review

```
1. First pass: Overall impression
2. Second pass: Detailed check against criteria
3. Third pass: Integration and implications
4. Document all findings
```

### After Review

```
1. Summarize findings
2. Categorize by severity
3. Provide recommendations
4. Follow up on addressed items
```

---

## REVIEW SEVERITY LEVELS

| Level | Description | Action |
|-------|-------------|--------|
| 🔴 Critical | Blocks release, causes failure | Must fix |
| 🟠 Major | Significant issue | Should fix |
| 🟡 Minor | Improvement opportunity | Nice to fix |
| 🟢 Note | Observation, future consideration | Optional |

---

## REVIEW REPORT TEMPLATE

```markdown
# REVIEW REPORT
## Subject: [What was reviewed]
## Reviewer: Claude
## Date: [DATE]
## Type: Quick / Standard / Deep

### Summary
[Overall assessment in 2-3 sentences]

### Result
☐ APPROVED - Ready for use
☐ CONDITIONAL - Approve with minor fixes
☐ REQUEST CHANGES - Major issues found
☐ REJECT - Fundamental problems

### Findings

#### Critical (Must Fix)
[List critical issues]

#### Major (Should Fix)
[List major issues]

#### Minor (Nice to Fix)
[List minor issues]

#### Notes
[List observations]

### Recommendations
[Specific actions to take]

### Follow-up
☐ Re-review needed after changes
☐ No re-review needed
```

---

## ANTI-PATTERNS (DON'T DO THIS)

❌ Rubber-stamp approvals without checking
❌ Review without criteria
❌ Personal preferences as requirements
❌ Blocking for trivial issues
❌ Not documenting review findings
❌ Reviewing your own work (except quick checks)
❌ Skipping review "to save time"

---

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Review is planned activity
- **prism-tdd**: Tests inform review criteria
- **prism-verification**: Verification before review
- **prism-debugging**: Debug issues found in review
- **prism-auditor**: Audit is comprehensive review

---

**END OF PRISM REVIEW SKILL**
