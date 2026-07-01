---
name: warn-large-output
enabled: true
event: all
action: warn
---
TOKEN SAVE: Large output detected. Consider using OutputBudgetEngine.enforce(data, preset("compact")) to trim results, or pipe through CompactFormatterEngine.compact() for 60-80% reduction.
