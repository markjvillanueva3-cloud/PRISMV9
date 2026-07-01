---
name: warn-quote-low-margin
enabled: true
event: output
action: warn
conditions:
  - field: content
    operator: regex_match
    pattern: margin[_\s]*[:=]\s*([0-9]{1,2}(\.[0-9]+)?)\s*%
---

**[warn-quote-low-margin]**
**Low margin detected in quote output.**

Manufacturing quotes with margins below 20% carry significant risk. Before finalizing:

1. **Verify** the margin accounts for ALL costs: material, machining, setup, tooling, programming, inspection, secondary ops, overhead
2. **Check** if tolerance premiums, rush multipliers, or complexity adjustments are missing
3. **Consider** actual cost history — run `/quote-review` to check if similar jobs had margin erosion
4. **Confirm** with the user that the margin is intentional (e.g., strategic pricing for new customer)

Typical healthy margins: 25-35% standard, 20% minimum for repeat customers, 35-50% for rush/complex work.
