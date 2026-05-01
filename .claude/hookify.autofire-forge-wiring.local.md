---
name: autofire-forge-wiring
enabled: true
event: prompt
pattern: (wiring\s+(check|valid|broken|integ)|orphan(ed)?\s+(engine|dispatch|algorithm|component)|dead\s+export|broken\s+import|import\s+graph|dispatch.*engine\s+chain|unwired|not\s+wired)
action: warn
---

Use `/forge-wiring` for architecture wiring validation. Invoke with `skill: "forge-wiring"`. This validates all dispatcher-to-engine-to-algorithm chains, finds orphaned components, dead exports, and broken imports across the 11-layer architecture.
