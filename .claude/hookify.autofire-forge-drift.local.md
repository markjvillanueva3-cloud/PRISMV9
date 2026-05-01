---
name: autofire-forge-drift
enabled: true
event: prompt
pattern: (registry\s+(drift|mismatch|inconsisten)|drift\s+(detect|scan|check|report)|counts?\s+(don.t|do\s+not)\s+match|master.?index\s+(drift|stale|wrong)|documentation?\s+drift|docs?\s+(out\s+of\s+sync|stale|wrong\s+counts?))
action: warn
---

Use `/forge-drift` for registry and documentation drift detection. Invoke with `skill: "forge-drift"`. This cross-references registries, MASTER_INDEX, source code, and documentation to find count mismatches, phantom entries, and unregistered components.
