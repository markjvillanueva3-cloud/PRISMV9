---
name: prism-token-economy
description: View token budgets, detect waste patterns, and get compression recommendations per task class.
model: haiku
effort: high
context: 10%
allowed-tools: ["Read", "Bash"]
---

# /token-economy — Token Budget & Waste Dashboard

## Usage
- `/token-economy` — Show budget for current task class + waste patterns
- `/token-economy <class>` — Budget for specific class (backend, web, speed_feed, etc.)
- `/token-economy --waste` — Detect waste patterns in this session

## Implementation

1. Call `prism_dev` with action `token_budget` and params `{ "task_class": "<class or general>" }`
2. Display budget breakdown:
```
Token Budget: [class]
  Context loading: [N] tokens
  Tool calls:      [N] tokens
  Reasoning:       [N] tokens
  Output:          [N] tokens
  Reserve:         [N] tokens
  TOTAL:           [N] tokens
```
3. Call `prism_dev` with action `token_detect_waste` with session metrics
4. Show waste patterns if detected
5. Show compression strategies from `prism_dev:token_economy_report`
