---
name: model-router
description: "Recommend optimal Claude model tier (haiku/sonnet/opus) for a given task based on historical success rates and cost efficiency."
model: haiku
effort: low
allowed-tools: Read, Bash
argument-hint: "<complexity 1-10> [file_count]"
---

# Model Router Skill

Quickly recommend the optimal Claude model tier for a task based on complexity and historical data.

## Usage

```
/model-router 3      # Low complexity task
/model-router 7 5    # Medium complexity, 5 files
/model-router 9 20   # High complexity, 20 files
```

## Instructions

1. Run the model router:
   ```bash
   python3 "C:/Users/Admin.DIGITALSTORM-PC/.claude/hooks/lib/adaptive_optimizer.py" model <complexity> [file_count]
   ```

2. Parse the JSON output and display:
   - Recommended model tier (haiku/sonnet/opus)
   - Confidence score
   - Reasoning

3. Also run cost analysis for comparison:
   ```bash
   python3 "C:/Users/Admin.DIGITALSTORM-PC/.claude/hooks/lib/adaptive_optimizer.py" cost
   ```

4. Show a brief comparison table of model tiers with success rates and cost efficiency.
