---
name: warn-quote-no-physics
enabled: true
event: output
action: warn
conditions:
  - field: content
    operator: regex_match
    pattern: confidence[_\s]*[:=]\s*(low|0\.[0-3])
---

**[warn-quote-no-physics]**
**Quote generated with low confidence - missing physics data.**

This quote was generated without CAM-derived or physics-calculated cycle times, which means it relies on parametric or complexity-based estimates. These can be off by 30-50%.

To improve confidence:

1. **Provide CAM cycle time** if available - this is the gold standard (confidence: high)
2. **Add cutting parameters** (Vc, fz, ap, ae) so the physics engine can calculate MRR-based cycle time
3. **Specify features** with tolerances - feature-based costing adds 15-20% accuracy over complexity-only
4. **Check similar jobs** - run `quote_find_similar` to find historical actuals for calibration
5. **Flag to customer** that the quote is an estimate pending detailed CAM programming
