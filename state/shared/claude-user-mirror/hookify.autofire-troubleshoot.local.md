---
name: autofire-troubleshoot
enabled: true
event: prompt
pattern: (chatter\s+(during|in|on|problem|issue|vibrat)|surface\s+finish\s+(problem|issue|poor|bad|rough)|tool\s+(break|wear|chip|crater|flank|built.up)|dimensional\s+(accuracy|error|drift|out\s+of\s+tol)|chip\s+(evacuation|packing|bird|string|clog)|troubleshoot|diagnos(e|tic)\s+(machining|cutting|milling|turning|drilling))
action: warn
---

Use `/troubleshoot` for interactive manufacturing problem diagnosis. Examples: `/troubleshoot chatter during milling` (vibration issues), `/troubleshoot poor surface finish` (finish problems), `/troubleshoot tool breaking` (tool failure), `/troubleshoot dimensional` (accuracy issues), `/troubleshoot chip` (chip evacuation).
