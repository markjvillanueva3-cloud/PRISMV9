---
name: prism-learn-path
description: View PRISM capability learning paths, track progress, get next step suggestions.
model: haiku
effort: high
context: 10%
allowed-tools: ["Read", "Bash"]
---

# /learn-path — Capability Learning Paths

## Usage
- `/learn-path` — Show all 4 paths with progress
- `/learn-path <path>` — Detail for a path (sf, pp, qt, qa)
- `/learn-path --next` — Suggest best next module to learn

## Implementation

1. Call `prism_dev` with action `capability_path_list` → show 4 paths
2. Call `prism_dev` with action `capability_path_progress` with `{ "completed": [] }` → progress per path
3. Call `prism_dev` with action `capability_path_suggest` → next module suggestion
4. Display:
```
Learning Paths
  Speed & Feed:    [N]/8 modules | [level] | Next: [module]
  Post Processor:  [N]/5 modules | [level] | Next: [module]
  Quoting:         [N]/4 modules | [level] | Next: [module]
  Quality:         [N]/3 modules | [level] | Next: [module]

Suggested Next: [module title] — unlocks: [capabilities]
```
