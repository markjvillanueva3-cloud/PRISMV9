---
name: prism-review
description: |
  Review standards and checklists. Specification and quality reviews.
---

| Type | Scope | When | Time |
|------|-------|------|------|
| Quick | Single item | After creation | 2-5 min |
| Standard | Module/file | After extraction | 10-20 min |
| Deep | Architecture | Major decisions | 30-60 min |
| Audit | Full system | Periodically | 1-2 hours |

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

## INTEGRATION WITH PRISM SKILLS

- **prism-planning**: Review is planned activity
- **prism-tdd**: Tests inform review criteria
- **prism-verification**: Verification before review
- **prism-debugging**: Debug issues found in review
- **prism-auditor**: Audit is comprehensive review

---

**END OF PRISM REVIEW SKILL**
