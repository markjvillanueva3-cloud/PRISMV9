---
name: autofire-forge-types
enabled: true
event: prompt
pattern: (type\s+coverage|too\s+many\s+any|any\s+type(s)?\s+(count|usage|problem)|missing\s+(return\s+)?types?|weak(ly)?\s+typed?|strengthen\s+types?|type\s+safety|add\s+(proper\s+)?types?)
action: warn
---

Use `/forge-types` for TypeScript type coverage analysis. Invoke with `skill: "forge-types"`. This scans all source files for `any` types, missing return types, weak assertions, and produces a per-subsystem type coverage score.
