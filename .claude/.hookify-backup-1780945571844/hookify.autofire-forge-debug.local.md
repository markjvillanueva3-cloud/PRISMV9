---
name: autofire-forge-debug
enabled: true
event: prompt
pattern: (debug\s+(this|the|a)\s+(error|bug|issue|problem|failure|crash)|why\s+(is|does|did)\s+(this|it)\s+(fail|crash|error|break|not\s+work)|track\s+down\s+(this|the)\s+(bug|error|issue)|root\s+cause|investigate\s+(this|the)\s+(error|failure|bug)|can'?t\s+figure\s+out\s+why)
action: warn
---

Use `/forge-debug` for structured debugging. Invoke with `skill: "forge-debug"`. This runs a systematic pipeline: reproduce, isolate, hypothesize, fix, verify — preventing scattered debugging that wastes tokens on dead ends.
