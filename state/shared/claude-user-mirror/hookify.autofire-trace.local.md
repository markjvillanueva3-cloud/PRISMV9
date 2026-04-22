---
name: autofire-trace
enabled: true
event: prompt
pattern: (trace\s+(the\s+)?(wiring|chain|path|connection|flow)|how\s+(is|does)\s+\w+\s+(wired|connected|linked|routed)|follow\s+(the\s+)?(chain|wiring|path)|dispatcher.*engine\s+(connection|wiring|link)|wiring\s+(chain|path|diagram|map))
action: warn
---

Use `/trace` for wiring chain tracing. Invoke with `skill: "trace"`. This follows the full path from dispatcher action to engine to algorithm, showing the wiring chain and identifying broken links or missing registrations.
