# CC-EXT Operator Guide

## Submitting Feedback

Operator feedback is submitted as `OperatorFeedback` objects containing:
- **operator_id**: Your unique identifier
- **experience_level**: apprentice | journeyman | experienced | master | expert
- **operation_type**: milling | turning | drilling | grinding | etc.
- **material**: Material being machined (e.g., "4140_steel")
- **parameters_used**: Dict of parameter name -> value (e.g., `{"cutting_speed": 200.0}`)
- **outcome**: success | failure | modified
- **modifications_made**: Any parameter changes you made during the operation
- **notes**: Free-text observations

## Querying Recommendations

The knowledge graph produces recommendations via:

```python
graph.recommend(material="4140_steel", operation="milling")
```

Returns a list of `Recommendation` objects sorted by confidence:
- **parameter_name**: e.g., "cutting_speed"
- **value**: Recommended value
- **unit**: Unit of measurement
- **confidence**: 0.0-1.0 (higher = more sources agree)

Use `min_confidence=0.5` to filter out low-confidence recommendations.

## Understanding Confidence Scores

| Tier | Score | Meaning |
|------|-------|---------|
| High | >= 0.8 | Multi-source corroborated, physics-validated |
| Medium | 0.4 - 0.8 | Some corroboration, generally reliable |
| Low | < 0.4 | Single source, unvalidated — use with caution |

## Reviewing Conflicts

When sources disagree, the system resolves conflicts automatically:
1. Physics model arbitration (closest to physics wins)
2. Sensor data precedence over static PDF data
3. Multi-source consensus (majority rules)
4. Highest confidence source wins

Unresolvable conflicts are **quarantined** for human review. Check `ConflictReport.quarantine` for items needing attention.

## Interpreting Graph Analytics

- **Weak edges** (confidence < 0.4): Knowledge needs more corroboration
- **Knowledge gaps**: Material+operation pairs with no recommendations
- **Isolated nodes**: Entities with no relationships — potential data quality issues
